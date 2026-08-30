"use client";

// Fallback de Suspense de l'App Router (Lot A12, D44) — rendu À L'INTÉRIEUR du
// layout localisé, sous le `NextIntlClientProvider` : `useTranslations` y
// fonctionne.
//
// ⛔ SON EMPLACEMENT EST UNE DÉCISION, PAS UN RANGEMENT (D234). Ce fichier a
// vécu en `[locale]/loading.tsx` jusqu'au 23/08/2026. À cet endroit, il ouvrait
// une frontière Suspense AU-DESSUS DE TOUTES les pages du segment — donc
// au-dessus des deux seules qui peuvent lever `notFound()`. Next vide alors la
// coquille (ce fallback) AVANT que le refus ne remonte, et l'en-tête HTTP est
// déjà parti : le 404 sortait en **200**. Mesuré des deux côtés, à la ligne
// près :
//     fichier en `[locale]/`  → GET /fr/nimportequoi = 200
//     fichier retiré          → GET /fr/nimportequoi = 404
// ⚠ `salles/[slug]/page.tsx` PORTAIT DÉJÀ L'INVARIANT PAR ÉCRIT — « un 404
// HTTP, jamais une page introuvable servie en 200 » — et il n'a jamais été
// tenu. Un invariant écrit au présent et non tenu est pire qu'une ligne
// absente : il fait croire le travail fait.
//
// ── Pourquoi un GROUPE DE ROUTES, et pas simplement `salles/loading.tsx` ────
// `salles/loading.tsx` couvrirait aussi `salles/[slug]`, donc la salle
// dépubliée resterait en 200. Le groupe `(recherche)` — invisible dans l'URL —
// borne la frontière à la SEULE page de liste, celle qui ne peut pas refuser.
//
// ⚠ CE QUE CET EMPLACEMENT COÛTE, ET POURQUOI C'EST ACCEPTÉ. La fiche de salle
// n'a plus de squelette : elle attend son rendu complet. `getVenueBySlug` est
// en `revalidate: 300` (lib/api.ts) — la page la plus lue est servie de cache
// la plupart du temps. La recherche, elle, est en `no-store` : c'est là que le
// serveur attend vraiment, et c'est là que le squelette reste.
//
// ⛔ NE PAS REMONTER CE FICHIER D'UN NIVEAU « pour couvrir plus de pages ».
// La garde `src/app/[locale]/not-found.test.tsx` refuse toute `loading.tsx`
// située au-dessus d'une page qui appelle `notFound()`.
//
// Composant CLIENT à dessein : un fallback doit se rendre SYNCHRONEMENT. Un
// composant serveur asynchrone (`getTranslations`) suspendrait DANS le
// fallback — exactement ce qu'un fallback ne doit pas faire.
//
// `site-chrome.tsx` reste EN L'ÉTAT sur sa branche `loading` : le vide y est
// délibéré (pas de flash « Connexion » → « Mon compte » dans l'en-tête).
import { useTranslations } from "next-intl";
import { BrandLoader } from "@zwadj/ui";

export default function LocaleLoading() {
  const t = useTranslations("common");
  return (
    <main className="auth-main" aria-busy="true">
      <BrandLoader label={t("loading")} />
    </main>
  );
}
