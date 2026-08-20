// Page 404 localisée — point B.
//
// ── Ce qu'elle remplace ─────────────────────────────────────────────────────
// Le 404 par défaut de Next : un « 404 | This page could not be found » en
// ANGLAIS, sans en-tête, sans pied de page, sans thème. Sur un site bilingue
// français/arabe destiné à l'Algérie, c'est la seule page du parcours qui
// s'adressait au visiteur dans une langue qu'il n'a pas choisie.
//
// ── Où elle s'applique, et où elle NE s'applique PAS ────────────────────────
// Ce fichier vit sous `[locale]` : il est rendu DANS le layout localisé, donc
// avec l'en-tête, le pied de page, le thème, `lang`/`dir` — et
// `useTranslations` y fonctionne. Il couvre :
//   - un chemin inconnu sous une locale valide (`/fr/nimportequoi`) ;
//   - tout `notFound()` appelé depuis une page du segment, dont la fiche de
//     salle introuvable (`salles/[slug]`).
//
// ⚠ Il NE couvre PAS un chemin dont la LOCALE elle-même est invalide
// (`/xx/quoi`), parce que `layout.tsx` y appelle `notFound()` AVANT d'avoir pu
// établir le fournisseur de traductions : Next remonte alors au `not-found.tsx`
// RACINE. C'est pour ce cas — et lui seul — que `app/not-found.tsx` existe à
// côté, et il ne peut pas être traduit puisqu'aucune langue n'a été choisie.
//
// ── Composant CLIENT, pour la même raison que `loading.tsx` ─────────────────
// `useTranslations` (client) plutôt que `getTranslations` (serveur, async) :
// une page d'erreur doit se rendre SYNCHRONEMENT.
"use client";

import { useTranslations } from "next-intl";
import { Link } from "../../i18n/navigation";

export default function LocaleNotFound() {
  const t = useTranslations("notFound");
  return (
    <main className="auth-main">
      <div className="state-panel notfound-panel">
        {/* Le code est rendu VISIBLEMENT : un visiteur qui décrit son problème
            au support cite « 404 » bien plus facilement qu'une phrase. */}
        <p className="notfound-code" aria-hidden="true">
          404
        </p>
        <h1>{t("title")}</h1>
        <p>{t("body")}</p>
        {/* Deux sorties, pas une : « accueil » sert à qui s'est perdu, « voir
            les salles » sert à qui cherchait une salle et a suivi un lien mort
            — c'est le cas le plus fréquent, une fiche dépubliée. */}
        <p className="notfound-actions">
          <Link href="/salles" className="btn btn-accent">
            {t("venues")}
          </Link>
          <Link href="/" className="btn btn-ghost">
            {t("home")}
          </Link>
        </p>
      </div>
    </main>
  );
}
