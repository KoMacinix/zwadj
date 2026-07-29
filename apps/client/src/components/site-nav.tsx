"use client";

// Navigation principale du site client (Lot UI-N1).
//
// Elle manquait : l'en-tête ne portait que la marque et l'état de session, et
// il fallait taper `/fr/salles` à la main pour changer de page. Le commentaire
// de `site-chrome.tsx` renvoyait cette navigation à « la tranche Accueil » —
// c'est cette dette-là qui se solde ici.
//
// ── Les rubriques non construites ne sont PAS des liens ──────────────────────
// Le design prévoit six rubriques ; deux existent (Accueil, Salles), quatre
// n'existent pas encore. Les câbler quand même produirait quatre 404 — pire
// qu'une absence, parce que le visiteur croit à une panne plutôt qu'à un
// chantier. Elles sont donc rendues comme du TEXTE marqué « Bientôt » :
// annoncées, visiblement inactives, et hors de l'ordre de tabulation.
//
// ── Actif = la page où l'on est, pas le préfixe ──────────────────────────────
// `usePathname` de `../i18n/navigation` rend le chemin SANS le segment de
// locale : `/salles`, jamais `/fr/salles`. Comparer au chemin brut de Next
// casserait l'état actif en arabe, et personne ne s'en apercevrait côté FR.
import { useTranslations } from "next-intl";
import { Link, usePathname } from "../i18n/navigation";

interface NavEntry {
  key: string;
  /** `null` = rubrique annoncée mais pas encore construite. */
  href: string | null;
}

const ENTRIES: NavEntry[] = [
  { key: "home", href: "/" },
  { key: "venues", href: "/salles" },
  { key: "providers", href: null },
  { key: "inspirations", href: null },
  { key: "tools", href: null },
  { key: "community", href: null }
];

export function SiteNav() {
  const t = useTranslations("common.nav");
  const pathname = usePathname();

  /** L'accueil ne s'active que sur lui-même : un `startsWith("/")` allumerait
   *  « Accueil » sur toutes les pages du site. */
  const isActive = (href: string): boolean =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className="site-nav" aria-label={t("label")}>
      <ul className="site-nav-list">
        {ENTRIES.map((entry) => (
          <li key={entry.key}>
            {entry.href === null ? (
              // Ni <a>, ni <button> : rien à activer, donc rien à focaliser.
              // `title` porte l'explication pour la souris, le texte « Bientôt »
              // la porte pour tout le monde.
              <span className="site-nav-link is-soon" title={t("soonHint")}>
                {t(entry.key)}
                <span className="site-nav-soon">{t("soon")}</span>
              </span>
            ) : (
              <Link
                href={entry.href}
                className={isActive(entry.href) ? "site-nav-link is-active" : "site-nav-link"}
                // `aria-current` est ce qu'un lecteur d'écran annonce ; la
                // classe CSS ne lui apprend rien.
                aria-current={isActive(entry.href) ? "page" : undefined}
              >
                {t(entry.key)}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
