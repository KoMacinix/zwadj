// Page 404 localisée — point B.
//
// ── Ce qu'elle remplace ─────────────────────────────────────────────────────
// Le 404 par défaut de Next : un « 404 | This page could not be found » en
// ANGLAIS, sans en-tête, sans pied de page, sans thème. Sur un site bilingue
// français/arabe destiné à l'Algérie, c'est la seule page du parcours qui
// s'adressait au visiteur dans une langue qu'il n'a pas choisie.
//
// ── Où elle s'applique, et par quoi elle Y EST AMENÉE ───────────────────────
// Ce fichier vit sous `[locale]` : il est rendu DANS le layout localisé, donc
// avec l'en-tête, le pied de page, le thème, `lang`/`dir` — et
// `useTranslations` y fonctionne. Il couvre :
//   - tout `notFound()` appelé depuis une page du segment, dont la fiche de
//     salle introuvable (`salles/[slug]`) ;
//   - un chemin inconnu sous une locale valide (`/fr/nimportequoi`), MAIS
//     seulement grâce à `[locale]/[...rest]/page.tsx` — voir ci-dessous.
//
// ⚠⚠ DÉPENDANCE À UN AUTRE FICHIER, corrigée le 23/08/2026 (D233). Une
// frontière IMBRIQUÉE ne s'applique qu'à un segment DÉJÀ apparié. Une URL qui
// n'apparie aucune route n'apparie pas non plus `[locale]` : Next remonte au
// 404 RACINE. Mesuré avant correction : `/fr/nimportequoi` rendait le 404
// ANGLAIS par défaut de Next, jamais cette page. C'est l'attrape-tout
// `[locale]/[...rest]/page.tsx` qui fait apparier `[locale]`, et lui seul.
// ⛔ SUPPRIMER CET ATTRAPE-TOUT REMET LE DÉFAUT, sans qu'aucun test de rendu
// ne bouge : celui de ce fichier resterait vert.
//
// ⚠ Il NE couvre PAS les chemins qui contournent l'intergiciel — ceux qui
// contiennent un point (`/wp-login.php`), exclus par le `matcher` de
// `middleware.ts`. Ceux-là n'obtiennent aucun préfixe de locale et atterrissent
// sur `app/not-found.tsx`, bilingue en dur faute de langue négociée.
// ⚠ La raison écrite en D221 (« locale invalide `/xx/quoi` ») était FAUSSE :
// l'intergiciel redirige `/xx/quoi` vers `/fr/xx/quoi` (307), donc le
// `hasLocale(...)` du layout ne refuse jamais rien en production.
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
    <main className="notfound-main">
      {/* DÉCOR, et rien d'autre. `alt=""` est le traitement exact pour une
          image sans valeur d'information : elle sort de l'arbre
          d'accessibilité au lieu d'y ajouter du bruit.
          ⚠ IMAGE STATIQUE depuis le 24/08/2026. Elle remplace un composant qui
          calculait la disposition à chaque rendu — collisions, largeurs
          imposées, deux canevas selon l'écran. Le raisonnement qui justifiait
          du texte vivant (indexation, lecture d'écran) ne tenait pas : cette
          page est en `noindex` (D216), et un décor ne se lit pas à voix haute.
          ⚠ TRACÉS, PAS DU TEXTE, dans le fichier : une image en `<img>` est un
          document isolé, sans accès aux polices de la page. Du texte y
          retomberait sur une police système, et l'arabe s'y afficherait en
          lettres NON LIÉES. */}
      <img className="lost-word-cloud" src="/404-nuage.svg" alt="" aria-hidden="true" />
      {/* ⚠ AUCUN « 404 » À L'ÉCRAN, et c'est délibéré (23/08/2026). Le code
          est déjà porté par le STATUT HTTP, où les machines le lisent ; à
          l'écran il ne disait rien à personne que la phrase ne dise mieux.
          Le nuage de mots occupe la place, et la garde
          `not-found.test.tsx` vérifie qu'il ne revient pas. */}
      <section className="notfound-content">
        <h1>{t("title")}</h1>
        <p className="notfound-body">{t("body")}</p>
        {/* Deux sorties, pas une : « accueil » sert à qui s'est perdu, « voir
            les salles » sert à qui cherchait une salle et a suivi un lien mort
            — c'est le cas le plus fréquent, une fiche dépubliée. */}
        <div className="notfound-actions">
          <Link href="/salles" className="btn btn-accent">
            {t("venues")}
          </Link>
          <Link href="/" className="btn btn-ghost">
            {t("home")}
          </Link>
        </div>
      </section>
    </main>
  );
}
