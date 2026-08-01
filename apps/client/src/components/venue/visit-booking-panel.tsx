"use client";

// Prise de rendez-vous de visite (Lot C5) — le premier écran qui rend le flux C
// atteignable : l'API existe depuis C3, personne ne pouvait s'en servir.
//
// ── Ce qui gouverne ce composant ────────────────────────────────────────────
// 1. Les créneaux viennent de la route ANONYME `/visit-slots` : la liste
//    s'affiche sans compte, et c'est seulement la RÉSERVATION qui exige d'être
//    connecté. Exiger la session pour regarder ferait fuir avant de montrer.
// 2. Un créneau PRIS reste affiché, désactivé (D59) : voir qu'un horaire est
//    occupé aide à en choisir un autre, alors qu'une liste qui se contracte
//    donne l'impression que la salle ne fait pas de visites ce jour-là.
// 3. Après un 409, on RECHARGE les créneaux. Le cas est réel : deux visiteurs
//    sur le même horaire, l'un valide une seconde avant l'autre. Réafficher la
//    liste périmée inviterait à rejouer le même échec.
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { createVisitBookingsClient, type VisitBookingsClient } from "@zwadj/api-client";
import { formatSlotRange, VISIT_DURATION_MINUTES, type VisitSlotDTO } from "@zwadj/types";
import { getVisitSlots } from "../../lib/api";
import { useAuth } from "../../lib/auth/auth-context";
import { Link } from "../../i18n/navigation";

/** Fenêtre proposée. Trente jours : au-delà, un rendez-vous de visite se
 *  reprogramme plus souvent qu'il ne se tient. */
const WINDOW_DAYS = 30;

/** Date civile d'Alger (UTC+1 toute l'année, D48) — décaler puis lire en UTC
 *  donne le jour local sans dépendre du fuseau de la machine du visiteur. */
function civilDate(ms: number): string {
  return new Date(ms + 3_600_000).toISOString().slice(0, 10);
}

export function VisitBookingPanel({ slug, client }: { slug: string; client?: VisitBookingsClient }) {
  const t = useTranslations("venueDetail.visit");
  const { status, api } = useAuth();
  const bookings = useMemo(() => client ?? createVisitBookingsClient(api.authedRequest), [client, api]);

  const [slots, setSlots] = useState<VisitSlotDTO[] | null>(null);
  const [chosen, setChosen] = useState<VisitSlotDTO | null>(null);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const nowMs = Date.now();
    const res = await getVisitSlots(slug, civilDate(nowMs), civilDate(nowMs + WINDOW_DAYS * 86_400_000));
    setSlots(res?.slots ?? []);
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const byDate = useMemo(() => {
    const map = new Map<string, VisitSlotDTO[]>();
    for (const slot of slots ?? []) {
      const list = map.get(slot.date);
      if (list) list.push(slot);
      else map.set(slot.date, [slot]);
    }
    return [...map.entries()];
  }, [slots]);

  const submit = async () => {
    if (!chosen) return;
    setBusy(true);
    setError(null);
    try {
      await bookings.create(slug, {
        date: chosen.date,
        startMinutes: chosen.startMinutes,
        // Téléphone FACULTATIF (D61) : l'exiger ici coûterait des rendez-vous,
        // et le pro dispose toujours de l'e-mail.
        ...(phone.trim() === "" ? {} : { phone: phone.trim() })
      });
      setConfirmed(true);
    } catch (cause) {
      const code = (cause as { code?: string }).code;
      setError(code === undefined ? t("errorGeneric") : `venue.errors.${code}`);
      // Un créneau pris entre-temps : la liste affichée est périmée.
      await load();
      setChosen(null);
    } finally {
      setBusy(false);
    }
  };

  if (confirmed) {
    return (
      <section className="card">
        <h2>{t("title")}</h2>
        <p role="status">{t("confirmed")}</p>
        <Link href="/compte">{t("seeMine")}</Link>
      </section>
    );
  }

  return (
    <section className="card">
      <h2>{t("title")}</h2>
      <p className="field-hint">{t("intro", { minutes: VISIT_DURATION_MINUTES })}</p>

      {slots === null ? (
        <p className="field-hint">{t("loading")}</p>
      ) : byDate.length === 0 ? (
        // Le pro n'a déclaré aucune plage : le dire, plutôt que montrer un
        // sélecteur vide qui ressemble à une panne.
        <p className="field-hint">{t("none")}</p>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          {byDate.map(([date, daySlots]) => (
            <div key={date}>
              <h3 style={{ fontSize: 14, margin: "0 0 6px" }}>{date}</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {daySlots.map((slot) => {
                  const picked = chosen?.date === slot.date && chosen.startMinutes === slot.startMinutes;
                  return (
                    <button
                      key={slot.startMinutes}
                      type="button"
                      className={picked ? "btn btn-accent" : "btn"}
                      // `disabled` et non masqué : sort de l'ordre de tabulation
                      // ET dit ce qui est occupé.
                      disabled={slot.taken}
                      aria-pressed={picked}
                      onClick={() => setChosen(slot)}
                    >
                      {formatSlotRange(slot.startMinutes, slot.startMinutes + VISIT_DURATION_MINUTES)}
                      {slot.taken ? ` · ${t("taken")}` : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}

      {status === "authenticated" ? (
        <div style={{ marginBlockStart: 14, display: "grid", gap: 8, maxInlineSize: 320 }}>
          <label htmlFor="visit-phone">{t("phoneLabel")}</label>
          <input
            id="visit-phone"
            type="tel"
            inputMode="tel"
            placeholder="+213…"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <p className="field-hint">{t("phoneHint")}</p>
          <button type="button" className="btn btn-accent" disabled={chosen === null || busy} onClick={() => void submit()}>
            {t("submit")}
          </button>
        </div>
      ) : (
        // Pas connecté : on ne cache pas les créneaux, on demande la session au
        // moment où elle devient nécessaire.
        <p style={{ marginBlockStart: 14 }}>
          <Link href="/auth/connexion" className="btn btn-accent">
            {t("loginToBook")}
          </Link>
        </p>
      )}
    </section>
  );
}
