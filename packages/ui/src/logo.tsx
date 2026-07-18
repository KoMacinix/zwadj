// Logo combiné Zwadj (Lot 7) : anneaux entrelacés + wordmark + sous-titre
// optionnel. Disposition reprise du design de référence ; couleurs et police
// suivent AGENTS.md : icône en var(--accent) (élément non-textuel — conforme
// AA), texte en encre, Readex Pro héritée. Aucune valeur hex ici.
export function ZwadjLogoIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      {/* Anneau gauche entier ; anneau droit scindé pour passer dessus/dessous */}
      <circle cx="12" cy="16" r="7" stroke="var(--accent)" strokeWidth="1.6" fill="none" />
      <path d="M 20 9 A 7 7 0 0 0 14.5 21.4" stroke="var(--accent)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M 14.5 10.6 A 7 7 0 1 1 20 23" stroke="var(--accent)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function ZwadjLogo({
  iconSize = 26,
  large = false,
  suffix,
  tagline
}: {
  iconSize?: number;
  /** Variante panneau décor (wordmark plus grand). */
  large?: boolean;
  /** Ex. « PRO » — affiché « ZWADJ · PRO ». */
  suffix?: string;
  /** Sous-titre sous le wordmark (décor / pied de page). */
  tagline?: string;
}) {
  return (
    <span className={large ? "brand-lockup brand-lockup--lg" : "brand-lockup"}>
      <ZwadjLogoIcon size={iconSize} />
      <span>
        <span className="brand-word">
          ZWADJ
          {suffix ? <span className="brand-suffix"> · {suffix}</span> : null}
        </span>
        {tagline ? <span className="brand-tagline">{tagline}</span> : null}
      </span>
    </span>
  );
}
