"use client";

// Bascule FR / AR du client (Lot UI-D2).
//
// ⚠ Ce n'est PAS un bouton, c'est un LIEN. La locale vit dans l'URL côté client
// (`/fr/salles`, `/ar/salles`) : un lien se partage, s'ouvre dans un onglet,
// s'indexe, et la version arabe d'une page est une page à part entière. Un
// bouton qui pousserait la navigation en JS priverait la page de tout cela.
//
// ⚠ Les PARAMÈTRES DE RECHERCHE sont reportés. `usePathname` de next-intl rend
// le chemin sans préfixe de langue et sans query : passer en arabe depuis une
// recherche filtrée renverrait sur une liste vierge, et le visiteur croirait
// avoir perdu ses filtres. Ils sont donc recollés explicitement.
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "../i18n/navigation";

export function LocaleSwitch() {
  const t = useTranslations("common.locale");
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const other = locale === "ar" ? "fr" : "ar";
  const query = Object.fromEntries(searchParams.entries());

  return (
    <Link
      className="locale-switch"
      href={{ pathname, query }}
      locale={other}
      // `hrefLang` dit aux moteurs ce qu'est la page visée ; `aria-label` dit à
      // un lecteur d'écran ce que fait le lien. L'étiquette visible, elle, est
      // écrite DANS la langue de destination — « العربية » se lit en arabe, pas
      // « Arabe » en français : c'est ce que cherche un arabophone tombé sur une
      // page en français. `lang` est ce qui empêche une synthèse vocale
      // française de buter dessus.
      hrefLang={other}
      aria-label={t(other === "ar" ? "toArabic" : "toFrench")}
      lang={other}
    >
      {other === "ar" ? "العربية" : "Français"}
    </Link>
  );
}
