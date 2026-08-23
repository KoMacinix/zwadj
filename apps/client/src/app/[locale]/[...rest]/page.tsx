// ATTRAPE-TOUT SOUS LOCALE — le chaînon MANQUANT du point B (D233).
//
// ⚠ CE FICHIER N'EST PAS DÉCORATIF. Sans lui, `[locale]/not-found.tsx` ne se
// rend JAMAIS pour une URL inconnue : il ne couvre que les `notFound()` levés
// depuis une page du segment (fiche de salle dépubliée, par exemple).
//
// ── Le défaut qu'il corrige, MESURÉ sur serveur réel ────────────────────────
// Un `not-found.tsx` IMBRIQUÉ n'est une frontière que pour un segment DÉJÀ
// apparié. Une URL qui n'apparie aucune route n'apparie pas non plus
// `[locale]` : Next remonte alors au 404 RACINE, pas à celui-ci. Relevé le
// 23/08/2026 sur `next dev`, avant ce fichier :
//     GET /fr/nimportequoi  → 404 « This page could not be found » (ANGLAIS)
//     GET /ar/nimportequoi  → la même page anglaise
// Les traductions, la charte et les deux sorties livrées le 19/08 existaient
// toutes. Rien ne les atteignait.
//
// ── Pourquoi une PAGE, et pas un réglage ────────────────────────────────────
// Le travail de ce fichier n'est PAS d'appeler `notFound()` — c'est de faire
// apparier `[locale]`. Le layout localisé se monte alors, donc `lang`/`dir`,
// l'en-tête, le pied de page, le thème et le fournisseur i18n sont en place
// AVANT que `notFound()` ne remonte à la frontière voisine. D'où une page, et
// d'où sa position : sous `[locale]`, jamais à la racine.
//
// ⚠ Une route plus spécifique gagne toujours : `[...rest]` ne peut intercepter
// ni `/fr/salles`, ni `/fr/salles/<slug>`, ni aucune route déclarée. Il ne voit
// que ce que personne d'autre ne réclame. Ajouter une page NE demande donc
// aucune précaution ici.
//
// ⚠ COUPLAGE À ÉCRIRE, PAS À DEVINER : supprimer ce fichier ne casse aucun
// test de rendu — `[locale]/not-found.tsx` continuerait de se rendre en test,
// et le site retomberait en silence sur le 404 anglais. C'est exactement le
// défaut qu'on vient de corriger. Le test de convention
// (`not-found.test.tsx`) est là pour ça : il mesure l'EXISTENCE de ce fichier,
// pas son contenu.
import { notFound } from "next/navigation";

export default function LocaleCatchAll(): never {
  notFound();
}
