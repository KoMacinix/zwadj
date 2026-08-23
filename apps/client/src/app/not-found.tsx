// 404 RACINE — point B, second volet. (D233)
//
// ⚠ LE NOM DU FICHIER EST LE FICHIER. Il s'est appelé `_not-found.tsx` dans le
// dépôt jusqu'au 23/08/2026. Le routeur d'application ne reconnaît qu'une liste
// FERMÉE de noms spéciaux — `page`, `layout`, `loading`, `not-found`, `error`…
// `_not-found` n'en fait pas partie : le fichier n'était pas une route en
// erreur, il n'était pas une route du tout. Mesuré avant renommage :
//     GET /wp-login.php → 404, corps VIDE (`<html id="__next_error__">`)
//     GET /foo.bar      → 404, corps VIDE
// Pas la page anglaise : rien. Un écran blanc.
//
// ⚠ CE FICHIER N'EST PAS UN DOUBLON DE `[locale]/not-found.tsx`.
//
// ── ⛔ CORRECTION DE D221 : la raison écrite était FAUSSE ────────────────────
// D221 justifiait ce fichier par « un chemin dont la LOCALE est invalide
// (`/xx/quoi`), où `layout.tsx` appelle `notFound()` avant le fournisseur
// i18n ». Ce cas N'ARRIVE PAS. Mesuré le 23/08/2026 :
//     GET /xx/quoi      → 307 vers /fr/xx/quoi
//     GET /nimportequoi → 307 vers /fr/nimportequoi
// L'intergiciel de next-intl ne voit pas `xx` comme une locale invalide : il ne
// la voit pas comme une locale du tout, préfixe la locale par défaut, et le
// `hasLocale(...)` du layout ne refuse donc jamais rien en production.
// ⚠ La DÉCISION (deux fichiers) est conservée ; c'est sa RAISON qui est
// remplacée — un motif invalidé se corrige, il ne s'efface pas.
//
// ── LA VRAIE RAISON : LES CHEMINS QUI CONTOURNENT L'INTERGICIEL ─────────────
// `middleware.ts` s'exclut lui-même des chemins contenant un point
// (`matcher: "/((?!api|_next|_vercel|.*\\..*).*)"`) — la règle qui laisse
// passer les fichiers statiques. Conséquence : `/wp-login.php`, `/foo.bar`,
// `/sitemap.xml` n'obtiennent JAMAIS de préfixe de locale, n'apparient aucune
// route, et atterrissent ici. Ce n'est pas un cas théorique : c'est ce qu'un
// robot d'exploration essaie en premier sur n'importe quel site.
//
// ⚠ CONSÉQUENCE ASSUMÉE : cette page est BILINGUE EN DUR, et c'est la seule du
// dépôt. Le raisonnement ne change pas, seul son point de départ change :
// l'intergiciel n'ayant pas tourné, AUCUNE langue n'a été négociée. Deviner ici
// reviendrait à réimplémenter la négociation de locale en second exemplaire.
// Afficher les DEUX langues est la réponse honnête : le visiteur n'a pas
// choisi, on ne choisit pas pour lui.
//
// Le dossier `app/` n'a pas de layout racine (le seul `<html>` du dépôt est
// celui de `[locale]/layout.tsx`), donc cette page doit porter les siens.
import Link from "next/link";

export default function RootNotFound() {
  return (
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: 24
        }}
      >
        <div>
          <p style={{ fontSize: 48, fontWeight: 700, margin: 0 }}>404</p>
          <p style={{ margin: "8px 0 0" }}>Cette page n’existe pas.</p>
          <p lang="ar" dir="rtl" style={{ margin: "4px 0 20px" }}>
            هذه الصفحة غير موجودة.
          </p>
          {/* Liens vers les DEUX racines localisées : le visiteur choisit sa
              langue en choisissant sa sortie.
              ⚠ `next/link`, pas le `Link` de `i18n/navigation` : ce dernier
              préfixerait la locale courante, et il n'y en a pas ici. */}
          <p style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Link href="/fr">Français</Link>
            <Link href="/ar" lang="ar">
              العربية
            </Link>
          </p>
        </div>
      </body>
    </html>
  );
}
