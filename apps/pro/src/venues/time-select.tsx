// Saisie d'heure en 24 h — D57.
//
// ── Pourquoi ne PAS utiliser `<input type="time">` ───────────────────────────
// Le widget natif est rendu par le NAVIGATEUR, dans SA locale : un navigateur
// configuré en anglais affiche un sélecteur AM/PM, et aucun attribut HTML ne
// permet de l'en empêcher — ni `lang`, ni `dir`, ni rien. La valeur transmise
// resterait `HH:mm`, mais le pro VERRAIT « 8 PM ». En Algérie l'heure
// officielle est exclusivement sur 24 h : ce n'est pas une préférence, c'est
// la façon dont les gens lisent une heure.
//
// Deux `<select>` que nous rendons nous-mêmes ne peuvent pas déraper : les
// options sont notre texte. On garde au passage le sélecteur natif du mobile
// (iOS et Android rendent `<select>` en molette), la navigation clavier et le
// support des lecteurs d'écran — ce qu'un composant maison en `<div>` aurait
// coûté.
//
// ── Le pas de minutes, et le piège qu'il cache ───────────────────────────────
// Les créneaux d'une salle des fêtes tombent sur des quarts d'heure. Mais une
// valeur EXISTANTE peut être hors pas (saisie par l'API, ou pas changé plus
// tard) : si la liste ne la contenait pas, le `<select>` afficherait autre
// chose que la valeur réelle et la sauvegarde la DÉPLACERAIT en silence. La
// valeur courante est donc toujours injectée dans les options.
import { useId } from "react";
import { useTranslation } from "react-i18next";

const HOURS = Array.from({ length: 24 }, (_, h) => (h < 10 ? `0${h}` : String(h)));

const pad2 = (n: number): string => (n < 10 ? `0${n}` : String(n));

export interface TimeSelectProps {
  /** `HH:mm` sur 24 h. */
  value: string;
  onChange: (next: string) => void;
  /** Nom du champ, annoncé aux lecteurs d'écran sur les deux listes. */
  label: string;
  minuteStep?: number;
  disabled?: boolean;
}

export function TimeSelect({ value, onChange, label, minuteStep = 15, disabled }: TimeSelectProps) {
  const { t } = useTranslation();
  const groupId = useId();

  const [rawHour = "00", rawMinute = "00"] = value.split(":");
  const hour = HOURS.includes(rawHour) ? rawHour : "00";
  const minuteValue = Number(rawMinute);

  const stepped = Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => i * minuteStep);
  // La valeur COURANTE entre dans la liste même hors pas : sans cela, ouvrir
  // puis enregistrer un créneau de 20:05 le déplacerait à 20:00 sans le dire.
  const minutes = Array.from(new Set([...stepped, Number.isFinite(minuteValue) ? minuteValue : 0])).sort(
    (a, b) => a - b
  );

  return (
    <span className="time-select" role="group" aria-labelledby={`${groupId}-label`}>
      <span id={`${groupId}-label`} className="sr-only">
        {label}
      </span>
      <select
        aria-label={t("common.time.hours")}
        value={hour}
        disabled={disabled}
        onChange={(e) => onChange(`${e.target.value}:${pad2(minuteValue)}`)}
      >
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span aria-hidden="true">:</span>
      <select
        aria-label={t("common.time.minutes")}
        value={pad2(minuteValue)}
        disabled={disabled}
        onChange={(e) => onChange(`${hour}:${e.target.value}`)}
      >
        {minutes.map((m) => (
          <option key={m} value={pad2(m)}>
            {pad2(m)}
          </option>
        ))}
      </select>
    </span>
  );
}
