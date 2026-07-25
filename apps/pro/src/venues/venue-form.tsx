// Corps de formulaire PARTAGÉ création/édition (Lot A5) + les briques que la
// liste réutilise (statut D33, badge de publication).
//
// Principe de saisie : TOUT est conservé en CHAÎNE BRUTE dans l'état. La
// conversion vers le contrat (`venueCreateSchema` / `venueUpdateSchema`) se
// fait au submit, et elle est FAILLIBLE — c'est là que vit le rejet décimal
// strict du prix. Garder la valeur brute évite l'altération silencieuse d'un
// `parseInt("150000.5") → 150000`.
import { useId, useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  BookingMode,
  VenueAvailabilityStatus,
  VenuePublicationStatus,
  venueCreateSchema,
  venueUpdateSchema,
  type AmenityDTO,
  type VenueCreateInput,
  type VenueProDTO,
  type VenueUpdateInput,
  type WilayaDTO
} from "@zwadj/types";
import { validate, type FieldErrors } from "@zwadj/api-client";
import { Field, useValidationMessage } from "../auth/auth-ui";
import { AmenityIcon } from "./amenity-icon";

/** Clé de l'erreur de prix — cf. `parseIntegerPrice`. */
const PRICE_ERROR_KEY = "venue.validation.basePriceInteger";

/** Separateur de milliers : espace INSECABLE (U+00A0). Un espace ordinaire
 *  laisserait le nombre se couper en fin de ligne. */
const GROUP_SEPARATOR = "\u00A0";

/** Regroupe par milliers — mais UNIQUEMENT si la saisie est entierement
 *  numerique. Sur « 150000.5 », on rend la frappe telle quelle : c'est la
 *  validation qui doit refuser, jamais le formateur qui masque l'erreur en
 *  avalant le point (invariant argent : rejet decimal strict). */
export function formatPriceForDisplay(raw: string): string {
  if (!/^\d*$/.test(raw)) return raw;
  return raw.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP_SEPARATOR);
}

/** Retire les separateurs pour revenir a la valeur STOCKEE (chiffres bruts).
 *  Tout ce qui n'est pas un espace survit — « 150 000.5 » redevient
 *  « 150000.5 » et part se faire refuser par Zod, comme avant. */
export function stripGroupSeparators(displayed: string): string {
  return displayed.replace(/[\s\u00A0\u202F]/g, "");
}

/** Index, dans une chaine formatee, juste apres le n-ieme chiffre. Sert a
 *  reposer le curseur au bon endroit quand l'insertion d'un separateur a
 *  decale le texte sous les doigts de l'utilisateur. */
export function caretAfterDigits(text: string, digitCount: number): number {
  if (digitCount <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text.charAt(i) >= "0" && text.charAt(i) <= "9") {
      seen += 1;
      if (seen === digitCount) return i + 1;
    }
  }
  return text.length;
}

function countDigits(text: string): number {
  let n = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text.charAt(i) >= "0" && text.charAt(i) <= "9") n += 1;
  }
  return n;
}

export interface VenueFormValues {
  cityId: string;
  nameFr: string;
  nameAr: string;
  taglineFr: string;
  taglineAr: string;
  descriptionFr: string;
  descriptionAr: string;
  districtFr: string;
  districtAr: string;
  address: string;
  lat: string;
  lng: string;
  capacityMax: string;
  /** DA ENTIERS saisis par le pro (jamais des centimes, jamais un float). */
  basePrice: string;
  bookingMode: BookingMode;
  status: VenueAvailabilityStatus;
  amenityIds: string[];
}

export function emptyVenueForm(): VenueFormValues {
  return {
    cityId: "",
    nameFr: "",
    nameAr: "",
    taglineFr: "",
    taglineAr: "",
    descriptionFr: "",
    descriptionAr: "",
    districtFr: "",
    districtAr: "",
    address: "",
    lat: "",
    lng: "",
    capacityMax: "",
    basePrice: "",
    bookingMode: BookingMode.SINGLE_SLOT,
    status: VenueAvailabilityStatus.ACTIVE,
    amenityIds: []
  };
}

/** Pré-remplissage à l'édition. Le prix redescend en DA entiers : l'invariant
 *  « centimes multiples de 100 » est garanti par ce même formulaire. */
export function venueToForm(venue: VenueProDTO): VenueFormValues {
  return {
    cityId: venue.cityId,
    nameFr: venue.nameFr,
    nameAr: venue.nameAr,
    taglineFr: venue.taglineFr ?? "",
    taglineAr: venue.taglineAr ?? "",
    descriptionFr: venue.descriptionFr ?? "",
    descriptionAr: venue.descriptionAr ?? "",
    districtFr: venue.districtFr ?? "",
    districtAr: venue.districtAr ?? "",
    address: venue.address ?? "",
    lat: venue.lat === null ? "" : String(venue.lat),
    lng: venue.lng === null ? "" : String(venue.lng),
    capacityMax: String(venue.capacityMax),
    basePrice: String(venue.basePriceCents / 100),
    bookingMode: venue.bookingMode,
    status: venue.status,
    amenityIds: [...venue.amenityIds]
  };
}

/**
 * REJET DÉCIMAL STRICT, sans troncature (invariant §4). `inputMode="numeric"`
 * n'est qu'un indice de clavier : seule cette garde fait foi. Un « 150000.5 »
 * accepté puis tronqué donnerait un prix FAUX et silencieux ; pire, un
 * `basePriceCents` flottant ferait THROW `formatDZD` à l'affichage.
 * Vide, `.`, `,` ou non-numérique ⇒ erreur, aucun appel API.
 */
export function parseIntegerPrice(raw: string): { ok: true; cents: number } | { ok: false } {
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) return { ok: false };
  return { ok: true, cents: Number(trimmed) * 100 };
}

/** Champ numérique : vide ⇒ absent (message « requis »), non-numérique ⇒ la
 *  chaîne est transmise telle quelle pour que Zod produise son propre message
 *  de type plutôt qu'un NaN silencieux. */
function numericField(raw: string): number | string | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : trimmed;
}

/** Coordonnées : la virgule décimale (habitude FR) est tolérée — ce n'est pas
 *  de l'argent, l'invariant « entiers » ne s'y applique pas. */
function coordField(raw: string): number | string | undefined {
  return numericField(raw.replace(",", "."));
}

/** Texte saisi ⇒ valeur nettoyée, ou `undefined` si le champ est vide.
 *  Vaut pour les optionnels ET les requis : un requis laissé vide doit être
 *  ABSENT du payload pour que Zod réponde « requis » (`required_error`) plutôt
 *  que « trop court » (min) ou « invalide » (uuid) — le message doit décrire ce
 *  que le pro a fait, pas la règle qui a cédé la première. */
function trimmedText(raw: string): string | undefined {
  const trimmed = raw.trim();
  return trimmed === "" ? undefined : trimmed;
}

/**
 * Payload de CRÉATION — champs de base UNIQUEMENT (§3.3) : pas d'`amenityIds`
 * (absent de `venueCreateSchema`), pas de `status`. Les équipements se règlent
 * après la redirection vers l'édition, jamais en enchaînant POST puis PATCH
 * (état d'échec partiel injustifié).
 */
export function buildCreateInput(
  values: VenueFormValues
): { data: VenueCreateInput; errors: null } | { data: null; errors: FieldErrors } {
  const price = parseIntegerPrice(values.basePrice);
  const raw: Record<string, unknown> = {};
  /** Une clé n'est POSÉE que si elle porte une valeur. Deux conséquences
   *  voulues : un requis vide est absent (⇒ message « requis »), et un
   *  optionnel vide ne voyage pas du tout — pas même en clé à `undefined`,
   *  qui polluerait le payload sans jamais rien signifier. */
  const put = (key: string, value: unknown) => {
    if (value !== undefined) raw[key] = value;
  };

  put("cityId", trimmedText(values.cityId));
  put("nameFr", trimmedText(values.nameFr));
  put("nameAr", trimmedText(values.nameAr));
  put("taglineFr", trimmedText(values.taglineFr));
  put("taglineAr", trimmedText(values.taglineAr));
  put("descriptionFr", trimmedText(values.descriptionFr));
  put("descriptionAr", trimmedText(values.descriptionAr));
  put("districtFr", trimmedText(values.districtFr));
  put("districtAr", trimmedText(values.districtAr));
  put("address", trimmedText(values.address));
  put("capacityMax", numericField(values.capacityMax));
  put("bookingMode", values.bookingMode);

  // Paire lat/lng : fournies ou omises ENSEMBLE. Si une seule est saisie,
  // l'autre reste absente et c'est `coordsPair` qui parle (schéma partagé).
  if (values.lat.trim() !== "" || values.lng.trim() !== "") {
    put("lat", coordField(values.lat));
    put("lng", coordField(values.lng));
  }
  if (price.ok) put("basePriceCents", price.cents);

  const checked = validate(venueCreateSchema, raw);
  if (!price.ok) {
    // Le rejet décimal PRIME : il porte le vrai motif du refus.
    return { data: null, errors: { ...(checked.errors ?? {}), basePriceCents: PRICE_ERROR_KEY } };
  }
  return checked;
}

export type VenueUpdateDiff =
  | { kind: "errors"; errors: FieldErrors }
  /** Rien n'a bougé : aucun appel API (le corps vide est un 400 côté schéma). */
  | { kind: "empty" }
  | { kind: "changes"; data: VenueUpdateInput };

/**
 * PATCH PAR DIFF (§9) : on n'envoie QUE les champs réellement modifiés.
 * `null` = effacement explicite sur les champs nullables. Le serveur peut
 * toujours refuser un corps partiel valide en local (référentiel inconnu) —
 * `venueFieldErrors` ramène alors le 400 sur le bon champ.
 */
export function buildUpdateDiff(values: VenueFormValues, venue: VenueProDTO): VenueUpdateDiff {
  const price = parseIntegerPrice(values.basePrice);
  const diff: Record<string, unknown> = {};

  if (values.cityId !== venue.cityId) diff.cityId = values.cityId;
  if (values.nameFr.trim() !== venue.nameFr) diff.nameFr = values.nameFr.trim();
  if (values.nameAr.trim() !== venue.nameAr) diff.nameAr = values.nameAr.trim();

  const nullableTexts = [
    ["taglineFr", values.taglineFr, venue.taglineFr],
    ["taglineAr", values.taglineAr, venue.taglineAr],
    ["descriptionFr", values.descriptionFr, venue.descriptionFr],
    ["descriptionAr", values.descriptionAr, venue.descriptionAr],
    ["districtFr", values.districtFr, venue.districtFr],
    ["districtAr", values.districtAr, venue.districtAr],
    ["address", values.address, venue.address]
  ] as const;
  for (const [key, next, current] of nullableTexts) {
    const value = next.trim() === "" ? null : next.trim();
    if (value !== current) diff[key] = value;
  }

  const latEmpty = values.lat.trim() === "";
  const lngEmpty = values.lng.trim() === "";
  if (latEmpty && lngEmpty) {
    // Effacement de la paire (uniquement si elle existait).
    if (venue.lat !== null || venue.lng !== null) {
      diff.lat = null;
      diff.lng = null;
    }
  } else {
    const lat = coordField(values.lat);
    const lng = coordField(values.lng);
    if (lat !== venue.lat || lng !== venue.lng) {
      // Les DEUX clés sont posées, même si l'une est `undefined` : c'est ce qui
      // déclenche `coordsPair` en local plutôt qu'un envoi mutilé.
      diff.lat = lat;
      diff.lng = lng;
    }
  }

  const capacityMax = numericField(values.capacityMax);
  if (capacityMax !== venue.capacityMax) diff.capacityMax = capacityMax;

  if (!price.ok || price.cents !== venue.basePriceCents) diff.basePriceCents = price.ok ? price.cents : undefined;
  if (values.bookingMode !== venue.bookingMode) diff.bookingMode = values.bookingMode;
  if (values.status !== venue.status) diff.status = values.status;

  // A3-① : remplacement d'ENSEMBLE — l'ensemble coché entier, jamais un delta.
  const nextAmenities = [...values.amenityIds].sort();
  const currentAmenities = [...venue.amenityIds].sort();
  const amenitiesChanged =
    nextAmenities.length !== currentAmenities.length || nextAmenities.some((id, i) => id !== currentAmenities[i]);
  if (amenitiesChanged) diff.amenityIds = nextAmenities;

  if (!price.ok) {
    const checked = validate(venueUpdateSchema, diff);
    return { kind: "errors", errors: { ...(checked.errors ?? {}), basePriceCents: PRICE_ERROR_KEY } };
  }
  if (Object.keys(diff).length === 0) return { kind: "empty" };

  const checked = validate(venueUpdateSchema, diff);
  if (checked.errors) return { kind: "errors", errors: checked.errors };
  return { kind: "changes", data: checked.data };
}

// ─────────────────────────────────────────────────────────────────────────────
// Briques d'UI
// ─────────────────────────────────────────────────────────────────────────────

/** Badge LECTURE SEULE : la publication est un acte admin, il n'existe aucune
 *  action « soumettre » au MVP (§4). Le pro constate, il ne déclenche pas. */
export function PublicationBadge({ status }: { status: VenuePublicationStatus }) {
  const { t } = useTranslation();
  const labels: Record<VenuePublicationStatus, string> = {
    [VenuePublicationStatus.DRAFT]: t("venue.ui.publication.draft"),
    // Défensif : PENDING est inatteignable au MVP (pas d'étape de soumission).
    [VenuePublicationStatus.PENDING]: t("venue.ui.publication.pending"),
    [VenuePublicationStatus.PUBLISHED]: t("venue.ui.publication.published")
  };
  const published = status === VenuePublicationStatus.PUBLISHED;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 11.5,
        lineHeight: 1.4,
        paddingBlock: 4,
        paddingInline: 8,
        borderRadius: "var(--radius)",
        border: "1px solid var(--line)",
        background: published ? "var(--success-soft)" : "var(--bg-2)",
        color: published ? "var(--success)" : "var(--ink-2)"
      }}
    >
      <span style={{ textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink-mute)" }}>
        {t("venue.ui.publication.label")}
      </span>
      {labels[status]}
    </span>
  );
}

/**
 * D33 — visibilité libre-service. TROIS états, donc un `<select>` natif et
 * jamais un toggle : un cycle au clic sur une carte serait un piège au doigt
 * sur mobile. Réversible sans re-modération ⇒ AUCUNE confirmation.
 */
/** Champ prix : affiche « 1 000 000 DA » pendant la frappe tout en STOCKANT
 *  les chiffres bruts. Le curseur est repositionne apres le meme chiffre
 *  qu'avant reformatage, sinon il saute en fin de champ des qu'un separateur
 *  s'insere.
 *
 *  D43 — l'unite est COLLEE au chiffre par ALIGNEMENT, jamais par mesure :
 *  une seule boite (le conteneur porte la bordure), l'input pousse ses
 *  chiffres vers l'unite via `text-align: end`. Rien a re-mesurer a la
 *  frappe, au chargement differe de Readex Pro, au zoom ni en RTL. */
function PriceInput({
  value,
  onValueChange,
  id,
  describedBy,
  invalid,
  required,
  currency,
  unitHint
}: {
  value: string;
  onValueChange: (next: string) => void;
  id: string;
  describedBy: string | undefined;
  invalid: boolean;
  required: boolean;
  currency: string;
  /** D43 — description MASQUEE visuellement : depuis que « (DA) » a quitte le
   *  libelle, c'est la SEULE mention de l'unite percue par un lecteur
   *  d'ecran. Elle re-heberge aussi la contrainte « nombre entier ». */
  unitHint: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const pendingDigits = useRef<number | null>(null);
  const reactId = useId();
  const hintId = `${reactId}-unit`;

  useLayoutEffect(() => {
    const el = ref.current;
    const target = pendingDigits.current;
    if (!el || target === null) return;
    pendingDigits.current = null;
    const pos = caretAfterDigits(el.value, target);
    el.setSelectionRange(pos, pos);
  });

  return (
    <>
      {/* L'etat invalide est porte par la BOITE : l'input n'a plus de bordure
          a colorer, et un `:has()` serait une dependance inutile sur la cible
          Android bas de gamme (24.6). */}
      <div className={invalid ? "input-affix is-invalid" : "input-affix"}>
        <input
          id={id}
          ref={ref}
          // `text` + inputMode : un `type="number"` accepterait « 150000.5 »
          // et laisserait le navigateur normaliser la valeur dans notre dos.
          type="text"
          inputMode="numeric"
          value={formatPriceForDisplay(value)}
          onChange={(e) => {
            const displayed = e.target.value;
            const caret = e.target.selectionStart ?? displayed.length;
            pendingDigits.current = countDigits(displayed.slice(0, caret));
            onValueChange(stripGroupSeparators(displayed));
          }}
          // L'erreur D'ABORD, l'unite ensuite : un lecteur d'ecran annonce la
          // cause du refus avant le format attendu.
          aria-describedby={describedBy === undefined ? hintId : `${describedBy} ${hintId}`}
          aria-invalid={invalid || undefined}
          required={required}
          // D43 — PAS de `dir="ltr"` ici : l'alignement des chiffres doit
          // suivre la direction du champ. Force en LTR, `text-align: end`
          // collerait les chiffres au bord DROIT en RTL, c'est-a-dire a
          // l'OPPOSE de l'unite. Chiffres et espace insecable (U+00A0, classe
          // bidi CS) forment un seul run LTR : « 150 000 » se lit correctement
          // dans les deux langues.
        />
        {/* Unite purement decorative : elle est deja annoncee par `unitHint`,
            la relire serait du bruit. */}
        <span className="input-affix-unit" aria-hidden="true">
          {currency}
        </span>
      </div>
      <span id={hintId} className="sr-only">
        {unitHint}
      </span>
    </>
  );
}

export function StatusSelect({
  value,
  onChange,
  id,
  disabled = false,
  describedBy,
  label
}: {
  value: VenueAvailabilityStatus;
  onChange: (next: VenueAvailabilityStatus) => void;
  id?: string;
  disabled?: boolean;
  describedBy?: string;
  /** Nom accessible quand le `<select>` n'est pas rendu dans un `<Field>`. */
  label?: string;
}) {
  const { t } = useTranslation();
  return (
    <select
      id={id}
      value={value}
      aria-label={label}
      aria-describedby={describedBy}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as VenueAvailabilityStatus)}
    >
      <option value={VenueAvailabilityStatus.ACTIVE}>{t("venue.ui.status.active")}</option>
      <option value={VenueAvailabilityStatus.HIDDEN}>{t("venue.ui.status.hidden")}</option>
      <option value={VenueAvailabilityStatus.TEMPORARILY_UNAVAILABLE}>
        {t("venue.ui.status.temporarilyUnavailable")}
      </option>
    </select>
  );
}

/** Sélecteur de commune : `<optgroup>` par wilaya, et UNIQUEMENT les wilayas
 *  qui ont au moins une ville (sinon 57 groupes vides — aujourd'hui « Alger »
 *  est donc le seul groupe rendu). Le formulaire envoie `cityId`. */
function CitySelect({
  wilayas,
  value,
  onChange,
  error,
  loading
}: {
  wilayas: WilayaDTO[];
  value: string;
  onChange: (cityId: string) => void;
  error?: string;
  loading: boolean;
}) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const populated = wilayas.filter((wilaya) => wilaya.cities.length > 0);

  return (
    <Field label={t("venue.ui.form.city")} required error={error}>
      {({ id, describedBy, invalid, required }) => (
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          required={required}
          disabled={loading}
        >
          {loading ? (
            <option value="">{t("venue.ui.form.referentialsLoading")}</option>
          ) : (
            <>
              <option value="">{t("venue.ui.form.cityPlaceholder")}</option>
              {populated.map((wilaya) => (
                <optgroup key={wilaya.id} label={isAr ? wilaya.nameAr : wilaya.nameFr}>
                  {wilaya.cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {isAr ? city.nameAr : city.nameFr}
                    </option>
                  ))}
                </optgroup>
              ))}
            </>
          )}
        </select>
      )}
    </Field>
  );
}

/** Grille de cases à cocher — remplacement d'ENSEMBLE au submit. Libellés
 *  issus de la DATA (`nameFr`/`nameAr`), jamais de l'i18n applicative. */
export function AmenitiesPicker({
  amenities,
  selected,
  onToggle,
  error,
  loading
}: {
  amenities: AmenityDTO[];
  selected: string[];
  onToggle: (id: string, checked: boolean) => void;
  error?: string;
  loading: boolean;
}) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const chosen = new Set(selected);

  return (
    <fieldset style={{ border: "none", margin: 0, padding: 0 }}>
      <legend style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-2)" }}>
        {t("venue.ui.form.sectionAmenities")}
      </legend>
      <p className="field-hint" style={{ marginBlock: "4px 10px" }}>
        {loading ? t("venue.ui.form.referentialsLoading") : t("venue.ui.form.amenitiesHint")}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 8 }}>
        {amenities.map((amenity) => (
          <label key={amenity.id} className="checkline">
            <input
              type="checkbox"
              checked={chosen.has(amenity.id)}
              onChange={(e) => onToggle(amenity.id, e.target.checked)}
            />
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <AmenityIcon icon={amenity.icon} />
              {isAr ? amenity.nameAr : amenity.nameFr}
            </span>
          </label>
        ))}
      </div>
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--ink-mute)",
        margin: "10px 0 0"
      }}
    >
      {children}
    </h2>
  );
}

/**
 * Champs de base, communs aux deux écrans. Les extras propres à l'édition
 * (slug, badge, statut, équipements) sont composés PAR la page d'édition —
 * ce composant reste le tronc commun, pas un couteau suisse à drapeaux.
 */
export function VenueFormFields({
  values,
  onChange,
  errors,
  wilayas,
  referentialsLoading
}: {
  values: VenueFormValues;
  onChange: (patch: Partial<VenueFormValues>) => void;
  errors: FieldErrors;
  wilayas: WilayaDTO[];
  referentialsLoading: boolean;
}) {
  const { t } = useTranslation();
  const tval = useValidationMessage();

  return (
    <>
      <SectionTitle>{t("venue.ui.form.sectionInfo")}</SectionTitle>

      <Field label={t("venue.ui.form.nameFr")} required error={tval(errors.nameFr)}>
        {({ id, describedBy, invalid, required }) => (
          <input
            id={id}
            type="text"
            value={values.nameFr}
            onChange={(e) => onChange({ nameFr: e.target.value })}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            required={required}
            dir="ltr"
          />
        )}
      </Field>

      <Field label={t("venue.ui.form.nameAr")} required error={tval(errors.nameAr)}>
        {({ id, describedBy, invalid, required }) => (
          <input
            id={id}
            type="text"
            value={values.nameAr}
            onChange={(e) => onChange({ nameAr: e.target.value })}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            required={required}
            dir="rtl"
          />
        )}
      </Field>

      <div className="field-row">
        <Field label={t("venue.ui.form.taglineFr")} error={tval(errors.taglineFr)}>
          {({ id, describedBy, invalid }) => (
            <input
              id={id}
              type="text"
              value={values.taglineFr}
              onChange={(e) => onChange({ taglineFr: e.target.value })}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              dir="ltr"
            />
          )}
        </Field>
        <Field label={t("venue.ui.form.taglineAr")} error={tval(errors.taglineAr)}>
          {({ id, describedBy, invalid }) => (
            <input
              id={id}
              type="text"
              value={values.taglineAr}
              onChange={(e) => onChange({ taglineAr: e.target.value })}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              dir="rtl"
            />
          )}
        </Field>
      </div>

      <Field label={t("venue.ui.form.descriptionFr")} error={tval(errors.descriptionFr)}>
        {({ id, describedBy, invalid }) => (
          <textarea
            id={id}
            rows={4}
            value={values.descriptionFr}
            onChange={(e) => onChange({ descriptionFr: e.target.value })}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            dir="ltr"
          />
        )}
      </Field>

      <Field label={t("venue.ui.form.descriptionAr")} error={tval(errors.descriptionAr)}>
        {({ id, describedBy, invalid }) => (
          <textarea
            id={id}
            rows={4}
            value={values.descriptionAr}
            onChange={(e) => onChange({ descriptionAr: e.target.value })}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            dir="rtl"
          />
        )}
      </Field>

      <SectionTitle>{t("venue.ui.form.sectionLocation")}</SectionTitle>

      <CitySelect
        wilayas={wilayas}
        value={values.cityId}
        onChange={(cityId) => onChange({ cityId })}
        error={tval(errors.cityId)}
        loading={referentialsLoading}
      />

      <div className="field-row">
        <Field label={t("venue.ui.form.districtFr")} error={tval(errors.districtFr)}>
          {({ id, describedBy, invalid }) => (
            <input
              id={id}
              type="text"
              value={values.districtFr}
              onChange={(e) => onChange({ districtFr: e.target.value })}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              dir="ltr"
            />
          )}
        </Field>
        <Field label={t("venue.ui.form.districtAr")} error={tval(errors.districtAr)}>
          {({ id, describedBy, invalid }) => (
            <input
              id={id}
              type="text"
              value={values.districtAr}
              onChange={(e) => onChange({ districtAr: e.target.value })}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              dir="rtl"
            />
          )}
        </Field>
      </div>

      <Field label={t("venue.ui.form.address")} error={tval(errors.address)}>
        {({ id, describedBy, invalid }) => (
          <input
            id={id}
            type="text"
            value={values.address}
            onChange={(e) => onChange({ address: e.target.value })}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
          />
        )}
      </Field>

      <div className="field-row">
        <Field label={t("venue.ui.form.lat")} error={tval(errors.lat)} hint={t("venue.ui.form.coordsHint")}>
          {({ id, describedBy, invalid }) => (
            <input
              id={id}
              type="text"
              inputMode="decimal"
              value={values.lat}
              onChange={(e) => onChange({ lat: e.target.value })}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              dir="ltr"
            />
          )}
        </Field>
        <Field label={t("venue.ui.form.lng")} error={tval(errors.lng)}>
          {({ id, describedBy, invalid }) => (
            <input
              id={id}
              type="text"
              inputMode="decimal"
              value={values.lng}
              onChange={(e) => onChange({ lng: e.target.value })}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              dir="ltr"
            />
          )}
        </Field>
      </div>

      <SectionTitle>{t("venue.ui.form.sectionCapacityPrice")}</SectionTitle>

      <div className="field-row">
        <Field label={t("venue.ui.form.capacityMax")} required error={tval(errors.capacityMax)}>
          {({ id, describedBy, invalid, required }) => (
            <input
              id={id}
              type="text"
              inputMode="numeric"
              value={values.capacityMax}
              onChange={(e) => onChange({ capacityMax: e.target.value })}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              required={required}
              dir="ltr"
            />
          )}
        </Field>
        {/* D36 : capacite min supprimee — le prix remonte dans la rangee,
            sinon la capacite resterait seule sur une grille a 2 colonnes. */}
        <Field label={t("venue.ui.form.basePrice")} required error={tval(errors.basePriceCents)}>
          {({ id, describedBy, invalid, required }) => (
            <PriceInput
              id={id}
              value={values.basePrice}
              onValueChange={(next) => onChange({ basePrice: next })}
              describedBy={describedBy}
              invalid={invalid}
              required={required}
              currency={t("venue.ui.form.priceCurrency")}
              unitHint={t("venue.ui.form.priceUnitHint")}
            />
          )}
        </Field>
      </div>

      <Field label={t("venue.ui.form.bookingMode")} error={tval(errors.bookingMode)}>
        {({ id, describedBy, invalid }) => (
          <select
            id={id}
            value={values.bookingMode}
            onChange={(e) => onChange({ bookingMode: e.target.value as BookingMode })}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
          >
            <option value={BookingMode.SINGLE_SLOT}>{t("venue.ui.form.bookingModeSingle")}</option>
            <option value={BookingMode.MULTI_SLOT}>{t("venue.ui.form.bookingModeMulti")}</option>
          </select>
        )}
      </Field>
    </>
  );
}
