"use client";

// Demande de réservation de salle (Lot E1b) — l'écran qui rend le Flux E
// atteignable : l'API existe depuis E1a, personne ne pouvait s'en servir.
//
// ── Ce qui gouverne ce composant ────────────────────────────────────────────
// 1. Les dates et les prix viennent de la route ANONYME `/availability` : le
//    visiteur voit ce que ça coûte SANS compte. Exiger la session pour regarder
//    un prix ferait fuir avant de montrer.
// 2. L'ACOMPTE est annoncé avant l'envoi, calculé à partir de la politique de la
//    salle exposée sur le DTO public (D81). Le découvrir au dernier écran est la
//    meilleure façon de faire abandonner.
// 3. Un créneau PRIS reste affiché, désactivé : voir qu'une date est occupée
//    aide à en choisir une autre, alors qu'une liste qui se contracte donne
//    l'impression que la salle ne prend pas de réservations.
// 4. Après un 409 `BOOKING_PRICE_CHANGED`, on réaffiche le VRAI montant et on
//    recharge le calendrier. Le corps de l'erreur le porte exprès : faire
//    rejouer un envoi contre un prix périmé, c'est programmer le même échec.
//
// ⚠ Le total N'EST PAS recalculé ici. Il vient de `priceCents` de la journée,
// que le serveur a résolu avec le moteur B3. Refaire l'arithmétique dans le
// navigateur créerait une seconde vérité tarifaire — et c'est justement ce que
// D75 cherche à rendre impossible.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { createBookingsClient, type BookingsClient } from "@zwadj/api-client";
import { formatDZD } from "@zwadj/i18n";
import { ServicePricingType, type ServiceDTO, type VenueAvailabilityResponse } from "@zwadj/types";
import { getVenueAvailability } from "../../lib/api";
import { useAuth } from "../../lib/auth/auth-context";
import { Link } from "../../i18n/navigation";

/** Fenêtre proposée : six mois. Assez pour une saison de mariages, assez court
 *  pour que la liste reste lisible sur un téléphone. L'horizon serveur est de
 *  dix-huit mois (D49) — un visiteur qui vise plus loin passera par la salle. */
const WINDOW_DAYS = 182;

/** Codes que `POST /venues/:slug/bookings` peut rendre (E1a), et RIEN d'autre.
 *  Table EXPLICITE, jamais une dérivation mécanique du code vers la clé : le
 *  jour où l'API ajoute un code, on veut un message générique honnête plutôt
 *  qu'un `t()` qui lève sur une clé absente. Même doctrine que D72. */
const BOOKING_ERROR_KEYS: Record<string, string> = {
  BOOKING_SLOT_UNAVAILABLE: "slotUnavailable",
  BOOKING_SLOT_TAKEN: "slotTaken",
  BOOKING_PRICE_CHANGED: "priceChanged",
  BOOKING_GUESTS_EXCEED_CAPACITY: "guestsExceedCapacity",
  BOOKING_NOT_FOUND: "notFound"
};

/** Date civile d'Alger (UTC+1 toute l'année, D48) — décaler puis lire en UTC
 *  donne le jour local sans dépendre du fuseau de la machine du visiteur. */
function civilDate(ms: number): string {
  return new Date(ms + 3_600_000).toISOString().slice(0, 10);
}

/** Acompte affiché AVANT l'envoi.
 *
 *  ⚠ Miroir exact de `resolveDepositCents` côté serveur, écrêtage compris — un
 *  acompte fixe supérieur au total est ramené au total. Cette duplication est
 *  assumée et bornée : c'est un AFFICHAGE, le serveur recalcule et refuse en 409
 *  si les deux divergent (D75). C'est précisément pour ça que la garde existe. */
function previewDeposit(
  policy: { depositRateBps: number | null; depositAmountCents: number | null },
  totalCents: number
): number {
  const raw =
    policy.depositAmountCents !== null
      ? policy.depositAmountCents
      : Math.round((totalCents * (policy.depositRateBps ?? 0)) / 10000 / 100) * 100;
  return Math.min(raw, totalCents);
}

/** Choix d'une prestation. `quantity` n'existe QUE pour PER_UNIT ; `tierId` que
 *  pour TIERED. Un champ de trop fait échouer la requête — l'union est
 *  discriminée côté contrat, et c'est voulu. */
type Pick_ = { serviceId: string; tierId?: string; quantity?: number };

/** Total d'une prestation choisie. ⚠ Miroir de `resolveServiceLine` côté
 *  serveur, et duplication ASSUMÉE au même titre que `previewDeposit` : c'est un
 *  AFFICHAGE. Le serveur recalcule et refuse en 409 si les deux divergent (D75).
 *
 *  La règle qui compte : en PER_GUEST la quantité est le nombre d'INVITÉS, pas
 *  une saisie. Afficher autre chose ici tromperait le client avant même que le
 *  serveur ne tranche. */
function lineTotal(service: ServiceDTO, choice: Pick_, guests: number): number {
  if (service.pricingType === ServicePricingType.TIERED) {
    return service.tiers.find((tier) => tier.id === choice.tierId)?.priceCents ?? 0;
  }
  if (service.pricingType === ServicePricingType.PER_GUEST) {
    return Math.round(((service.perGuestPriceCents ?? 0) * guests) / 100) * 100;
  }
  if (service.pricingType === ServicePricingType.PER_UNIT) {
    return Math.round(((service.perUnitPriceCents ?? 0) * (choice.quantity ?? 0)) / 100) * 100;
  }
  return service.fixedPriceCents ?? 0;
}

export interface BookingRequestPanelProps {
  slug: string;
  /** Politique d'acompte de la salle, telle que le DTO public la porte (D81). */
  depositRateBps: number | null;
  depositAmountCents: number | null;
  /** Catalogue ACTIF de la salle (E2d). Vide = la salle n'en propose pas. */
  services?: ServiceDTO[];
  /** Injectable pour les tests de composants. */
  client?: BookingsClient;
}

export function BookingRequestPanel({
  slug,
  depositRateBps,
  depositAmountCents,
  services = [],
  client
}: BookingRequestPanelProps) {
  const t = useTranslations("venueDetail.booking");
  const tError = useTranslations("booking.errors");
  const { status, api } = useAuth();
  const bookings = useMemo(() => client ?? createBookingsClient(api.authedRequest), [client, api]);

  /** Sous-ensemble RÉELLEMENT consommé de la réponse. Restreindre le type ici
   *  documente ce dont l'écran dépend, et rend la garde de forme ci-dessous
   *  suffisante — il n'y a rien d'autre à valider. */
  type Loaded = Pick<VenueAvailabilityResponse, "days" | "slots">;
  const [availability, setAvailability] = useState<Loaded | null>(null);
  const [chosen, setChosen] = useState<{ date: string; slotTemplateId: string; priceCents: number } | null>(null);
  const [guests, setGuests] = useState("");
  const [picks, setPicks] = useState<Pick_[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const nowMs = Date.now();
    const res = await getVenueAvailability(
      slug,
      civilDate(nowMs + 86_400_000),
      civilDate(nowMs + WINDOW_DAYS * 86_400_000)
    );
    // GARDE DE FORME, et elle n'est pas de la paranoïa : ce panneau est monté
    // sur la fiche salle. S'il lève parce qu'une réponse n'a pas la forme
    // attendue, il emporte la page ENTIÈRE avec lui — description, photos,
    // visite virtuelle. Une section doit échouer SEULE (leçon C5b).
    setAvailability(
      res === null || !Array.isArray(res.days) || !Array.isArray(res.slots) ? { days: [], slots: [] } : res
    );
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const slotNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const slot of availability?.slots ?? []) map.set(slot.id, slot.nameFr);
    return map;
  }, [availability]);

  const guestCount = Number(guests) || 0;
  const servicesTotal = picks.reduce((sum, pick) => {
    const service = services.find((row) => row.id === pick.serviceId);
    return service === undefined ? sum : sum + lineTotal(service, pick, guestCount);
  }, 0);
  const total = chosen === null ? null : chosen.priceCents + servicesTotal;
  const deposit = total === null ? null : previewDeposit({ depositRateBps, depositAmountCents }, total);

  const submit = async () => {
    if (chosen === null) return;
    setBusy(true);
    setError(null);
    try {
      await bookings.create(slug, {
        eventDate: chosen.date,
        slotTemplateId: chosen.slotTemplateId,
        guests: Number(guests),
        paymentMethod: "CASH",
        contactFirstName: firstName.trim(),
        contactLastName: lastName.trim(),
        contactPhone: phone.trim(),
        // Clé OMISE si vide : `.email()` refuse la chaîne vide, et il n'y a rien
        // à déclarer quand le client n'a pas d'adresse.
        ...(email.trim() === "" ? {} : { contactEmail: email.trim() }),
        ...(message.trim() === "" ? {} : { clientMessage: message.trim() }),
        ...(picks.length === 0 ? {} : { services: picks }),
        expectedTotalCents: total ?? chosen.priceCents,
        expectedDepositCents: deposit ?? 0
      });
      setSent(true);
    } catch (cause) {
      const code = (cause as { code?: string }).code;
      const key = code === undefined ? undefined : BOOKING_ERROR_KEYS[code];
      setError(key === undefined ? t("errorGeneric") : tError(key));
      // Le calendrier affiché n'est plus le vrai : une date vient d'être prise,
      // ou le tarif a bougé. On le recharge plutôt que d'inviter à rejouer.
      if (code === "BOOKING_SLOT_TAKEN" || code === "BOOKING_PRICE_CHANGED") {
        setChosen(null);
        await load();
      }
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <section className="card">
        <h2>{t("title")}</h2>
        <p role="status">{t("sent")}</p>
        {/* Ce que le client doit comprendre : ce n'est pas confirmé. La salle
            doit répondre, et il peut suivre l'état depuis son compte. */}
        <p className="muted">{t("sentHint")}</p>
        <Link href="/compte">{t("seeMine")}</Link>
      </section>
    );
  }

  // D135 — l'e-mail n'entre PAS dans la condition : `bookings.contact_email` est
  // nullable, et beaucoup de clients en Algérie n'en ont pas. Le téléphone reste
  // exigé, c'est le canal de rappel du pro et il est NOT NULL en base.
  const complete =
    chosen !== null &&
    guests.trim() !== "" &&
    firstName.trim() !== "" &&
    lastName.trim() !== "" &&
    phone.trim() !== "";

  return (
    <section className="card" aria-labelledby="booking-request-heading">
      <h2 id="booking-request-heading">{t("title")}</h2>
      <p className="muted">{t("intro")}</p>

      {availability === null ? (
        <p className="muted">{t("loading")}</p>
      ) : availability.days.length === 0 ? (
        <p className="muted">{t("none")}</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px", display: "grid", gap: 6 }}>
          {availability.days.map((day) =>
            day.slots.map((slot) => {
              const free = slot.status === "AVAILABLE";
              const picked =
                chosen !== null && chosen.date === day.date && chosen.slotTemplateId === slot.slotTemplateId;
              return (
                <li key={`${day.date}-${slot.slotTemplateId}`}>
                  <button
                    type="button"
                    className={picked ? "btn btn-accent" : "btn"}
                    // Un créneau pris RESTE affiché, désactivé : c'est une
                    // information utile pour choisir, pas un déchet à masquer.
                    disabled={!free}
                    aria-pressed={picked}
                    onClick={() =>
                      setChosen({ date: day.date, slotTemplateId: slot.slotTemplateId, priceCents: slot.priceCents })
                    }
                  >
                    {day.date} · {slotNames.get(slot.slotTemplateId) ?? ""} · {formatDZD(slot.priceCents)}
                    {free ? "" : ` · ${t("taken")}`}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}

      {/* ⚠ Le nombre d'invités vit ICI, HORS du bloc connecté, et ce n'est pas un
          détail de mise en page : il MULTIPLIE le prix des prestations par
          invité. Le laisser derrière la connexion afficherait « 0 DA » sur un
          traiteur à 2 000 DA le couvert — soit un prix faux montré à quelqu'un
          qui n'a pas encore de compte, donc au pire moment. */}
      <input
        value={guests}
        onChange={(e) => setGuests(e.target.value.replace(/[^0-9]/g, ""))}
        placeholder={t("guests")}
        aria-label={t("guests")}
        inputMode="numeric"
      />

      {/* E2d — les prestations. Affichées APRÈS les dates : on choisit d'abord
          quand, puis avec quoi. Une salle sans catalogue n'affiche rien du tout
          plutôt qu'un bloc vide qui suggère un manque. */}
      {services.length === 0 ? null : (
        <fieldset style={{ border: 0, padding: 0, margin: "0 0 12px" }}>
          <legend>{t("servicesTitle")}</legend>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 6 }}>
            {services.map((service) => {
              const pick = picks.find((row) => row.serviceId === service.id);
              const chosenNow = pick !== undefined;
              return (
                <li key={service.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={chosenNow}
                      onChange={() =>
                        setPicks((current) =>
                          chosenNow
                            ? current.filter((row) => row.serviceId !== service.id)
                            : [
                                ...current,
                                {
                                  serviceId: service.id,
                                  // Le premier palier par défaut : un TIERED sans
                                  // palier est refusé par le serveur, et laisser
                                  // le client cocher pour rien serait cruel.
                                  ...(service.pricingType === ServicePricingType.TIERED
                                    ? { tierId: service.tiers[0]?.id }
                                    : {}),
                                  ...(service.pricingType === ServicePricingType.PER_UNIT
                                    ? { quantity: service.minUnits ?? 1 }
                                    : {})
                                }
                              ]
                        )
                      }
                    />{" "}
                    {service.nameFr}{" "}
                    <span className="muted">
                      {service.pricingType === ServicePricingType.PER_GUEST
                        ? t("perGuest", { amount: formatDZD(service.perGuestPriceCents ?? 0) })
                        : service.pricingType === ServicePricingType.PER_UNIT
                          ? t("perUnit", { amount: formatDZD(service.perUnitPriceCents ?? 0), unit: service.unitNameFr ?? "" })
                          : service.pricingType === ServicePricingType.FIXED
                            ? formatDZD(service.fixedPriceCents ?? 0)
                            : ""}
                    </span>
                  </label>

                  {/* Le palier et la quantité n'apparaissent QUE si la prestation
                      est cochée : des champs pour une chose qu'on n'a pas prise
                      encombrent sans rien apprendre. */}
                  {chosenNow && service.pricingType === ServicePricingType.TIERED ? (
                    <select
                      aria-label={`${service.nameFr} — ${t("tier")}`}
                      value={pick?.tierId ?? ""}
                      onChange={(e) =>
                        setPicks((current) =>
                          current.map((row) => (row.serviceId === service.id ? { ...row, tierId: e.target.value } : row))
                        )
                      }
                    >
                      {service.tiers.map((tier) => (
                        <option key={tier.id} value={tier.id}>
                          {tier.labelFr} — {formatDZD(tier.priceCents)}
                        </option>
                      ))}
                    </select>
                  ) : null}

                  {chosenNow && service.pricingType === ServicePricingType.PER_UNIT ? (
                    <input
                      aria-label={`${service.nameFr} — ${t("quantity")}`}
                      inputMode="numeric"
                      value={String(pick?.quantity ?? "")}
                      onChange={(e) => {
                        const next = Number(e.target.value.replace(/[^0-9]/g, "")) || 0;
                        setPicks((current) =>
                          current.map((row) => (row.serviceId === service.id ? { ...row, quantity: next } : row))
                        );
                      }}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}

      {/* L'acompte s'affiche dès qu'une date est choisie, jamais après. */}
      {chosen !== null && deposit !== null ? (
        <p>
          {t("total", { amount: formatDZD(total ?? chosen.priceCents) })} —{" "}
          <strong>{t("deposit", { amount: formatDZD(deposit) })}</strong>
        </p>
      ) : null}

      {status === "authenticated" ? (
        <div style={{ display: "grid", gap: 8 }}>
          {/* Les quatre champs de contact sont OBLIGATOIRES : le profil ne les
              garantit pas (`firstName`, `lastName` et `phone` sont nullable). */}
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder={t("firstName")}
            aria-label={t("firstName")}
            autoComplete="given-name"
          />
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder={t("lastName")}
            aria-label={t("lastName")}
            autoComplete="family-name"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t("phone")}
            aria-label={t("phone")}
            inputMode="tel"
            autoComplete="tel"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("email")}
            aria-label={t("email")}
            inputMode="email"
            autoComplete="email"
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("message")}
            aria-label={t("message")}
            maxLength={1000}
            rows={3}
          />

          <button type="button" className="btn btn-accent" disabled={!complete || busy} onClick={submit}>
            {t("submit")}
          </button>
        </div>
      ) : (
        <Link className="btn" href="/connexion">
          {t("loginToBook")}
        </Link>
      )}

      {error === null ? null : (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </section>
  );
}
