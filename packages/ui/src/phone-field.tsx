// Champ de TÉLÉPHONE PARTAGÉ — rang 32, D325.
//
// ── Pourquoi il existe ──────────────────────────────────────────────────────
// Neuf champs de saisie du produit étaient neuf `<input>` libres : des lettres y entraient, plus de neuf
// chiffres aussi, un `0` en tête passait, et chacun redisait « +213 » à sa façon — dans un `placeholder`, dans
// un message (« 8 à 9 chiffres », faux). La règle vit UNE fois, dans le contrat (`@zwadj/types`, `phone.ts`) ;
// ce composant en est la seule traduction visuelle, importée par les deux applications.
//
// ── Ce qu'il fait ───────────────────────────────────────────────────────────
//   • l'indicatif et le drapeau sont AFFICHÉS devant le champ, pré-remplis depuis le pays par défaut — ils ne se tapent
//     pas, et ne sont écrits NULLE PART dans un composant : ils viennent du modèle de pays ;
//   • seuls les chiffres passent ; au plus `nationalLength` ; un premier chiffre refusé s'affiche SEUL avec son message,
//     et la saisie suivante est bloquée (`applyPhoneInput`) ;
//   • la VALEUR du champ est la suite de chiffres NATIONAUX. L'appelant la convertit à l'envoi par `toE164`.
//
// ── Le drapeau et le modèle de pays ─────────────────────────────────────────
// `PHONE_COUNTRY_FLAGS` est un `Record<PhoneCountryId, …>` : ajouter un pays à `PHONE_COUNTRIES` sans lui donner son
// drapeau ne COMPILE PAS. Les drapeaux sont des SVG écrits ici — aucune photo, aucune dépendance pour un drapeau.
//
// ── Ce qu'il ne fait pas ────────────────────────────────────────────────────
// Aucune i18n : `@zwadj/ui` ne connaît ni `next-intl` ni le catalogue. Le nom du pays, le gabarit d'exemple et le message
// du premier chiffre arrivent en props, traduits par l'appelant. Aucun sélecteur de pays : il n'y en a qu'un.
import type { ComponentType } from "react";
import { DEFAULT_PHONE_COUNTRY, PHONE_COUNTRIES, applyPhoneInput, type PhoneCountryId } from "@zwadj/types";

export interface PhoneFlagProps {
  className?: string;
}

/**
 * Le drapeau de l'Algérie, d'après le drapeau officiel : **hauteur 2 pour largeur 3**, bande **verte à gauche**, bande **blanche à
 * droite**, **croissant et étoile rouges** au centre — le croissant ouvert vers la droite, l'étoile à cinq branches dans son ouverture,
 * une branche pointant à droite. Les coordonnées sont celles de la géométrie officielle du drapeau (viewBox 900 × 600) :
 * le croissant est la différence de deux cercles (rayons 150 et 120, décalés de 30 sur l'axe horizontal), l'étoile un pentagramme
 * dont la pointe de droite est à (585,68 ; 300). Couleurs : vert #063, rouge #d21034, blanc.
 *
 * Décoratif (`aria-hidden`) : le nom du pays est porté par le texte qui l'accompagne.
 */
export function DzFlag({ className }: PhoneFlagProps) {
  return (
    <svg className={className} viewBox="0 0 900 600" width="24" height="16" aria-hidden="true" focusable="false">
      <path fill="#fff" d="M0 0h900v600H0z" />
      <path fill="#063" d="M0 0h450v600H0z" />
      <path
        fill="#d21034"
        d="M579.903811 225a150 150 0 1 0 0 150 120 120 0 1 1 0-150M585.676275 300 450 255.916106 533.852549 371.329239v-142.658277L450 344.083894z"
      />
    </svg>
  );
}

/** Un drapeau par pays du modèle — le compilateur l'exige. Un futur pays apporte le sien ICI. */
export const PHONE_COUNTRY_FLAGS: Record<PhoneCountryId, ComponentType<PhoneFlagProps>> = {
  DZ: DzFlag
};

export interface PhoneFieldProps {
  /** `id` de l'`<input>` — le `<label htmlFor>` de l'appelant y pointe. */
  id: string;
  /** Les chiffres NATIONAUX saisis (sans indicatif ni zéro initial). */
  value: string;
  onChange: (digits: string) => void;
  country?: PhoneCountryId;
  /** Nom du pays, traduit (« Algérie ») : nom accessible du drapeau et de l'indicatif. */
  countryName: string;
  /** Gabarit d'exemple (« 5XX XX XX XX ») — jamais un vrai numéro. */
  placeholder: string;
  /** Message du premier chiffre refusé, traduit. */
  leadingDigitMessage: string;
  describedBy?: string;
  invalid?: boolean;
  required?: boolean;
  disabled?: boolean;
  name?: string;
  autoComplete?: string;
}

export function PhoneField({
  id,
  value,
  onChange,
  country = DEFAULT_PHONE_COUNTRY,
  countryName,
  placeholder,
  leadingDigitMessage,
  describedBy,
  invalid = false,
  required,
  disabled,
  name,
  autoComplete = "tel-national"
}: PhoneFieldProps) {
  const rule = PHONE_COUNTRIES[country];
  const Flag = PHONE_COUNTRY_FLAGS[country];
  const rejected = value !== "" && !rule.leadingDigits.includes(value.charAt(0));
  const messageId = `${id}-leading`;
  const described = [describedBy, rejected ? messageId : undefined].filter(Boolean).join(" ") || undefined;

  return (
    <>
      {/* `dir="ltr"` : un numéro se lit de gauche à droite, même dans une page arabe — le drapeau, l'indicatif et les chiffres
          gardent leur ordre. Le bloc reste aligné au début de la ligne de la page. */}
      <div className={rejected || invalid ? "input-affix phone-field is-invalid" : "input-affix phone-field"} dir="ltr">
        <span className="phone-field-country" role="img" aria-label={`${countryName}, ${rule.dialCode}`}>
          <Flag className="phone-field-flag" />
          <span className="phone-field-dial" aria-hidden="true">
            {rule.dialCode}
          </span>
        </span>
        <input
          id={id}
          name={name}
          type="tel"
          inputMode="numeric"
          autoComplete={autoComplete}
          value={value}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          aria-describedby={described}
          aria-invalid={rejected || invalid ? true : undefined}
          onChange={(event) => onChange(applyPhoneInput(country, value, event.target.value).digits)}
        />
      </div>
      {rejected ? (
        <p id={messageId} className="field-error" role="alert">
          {leadingDigitMessage}
        </p>
      ) : null}
    </>
  );
}
