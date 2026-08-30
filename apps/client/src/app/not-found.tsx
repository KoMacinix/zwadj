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

const ROOT_NOT_FOUND_CSS = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #fafafa; color: #18181b; font-family: system-ui, sans-serif; }
  .root-notfound-main { position: relative; isolation: isolate; min-height: 100dvh; display: grid; place-items: center; overflow: hidden; padding: 32px 20px; }
  /* Largeur accordee au vide reserve dans le nuage : les deux se deplacent ensemble. */
  .root-notfound-content { position: relative; z-index: 1; width: min(100%, 560px); text-align: center; }
  .root-notfound-title { display: grid; gap: 7px; margin: 0; font-size: clamp(26px, 4.4vw, 38px); font-weight: 600; line-height: 1.25; }
  .root-notfound-title [lang="ar"] { font-weight: 500; }
  .root-notfound-body { margin: 16px auto 0; max-width: 430px; color: #52525b; font-size: 15px; line-height: 1.65; }
  .root-notfound-ar { margin-top: 4px; }
  .root-notfound-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 28px; }
  .root-notfound-link { display: inline-flex; min-width: 124px; justify-content: center; padding: 11px 20px; border: 1px solid #e4e4e7; border-radius: 2px; color: #18181b; font-size: 14px; font-weight: 600; text-decoration: none; }
  .root-notfound-link--primary { border-color: #da3642; background: #da3642; color: #fff; }
  /* Une seule règle là où il y en avait cinq : plus de canevas, plus de tons. */
  .lost-word-cloud { position: absolute; z-index: -1; inset: 0; width: 100%; height: 100%; object-fit: cover; pointer-events: none; user-select: none; opacity: .7; }
  @media (prefers-color-scheme: dark) {
    :root { color-scheme: dark; }
    body { background: #111; color: #f0f0f0; }
    .root-notfound-body { color: #ababab; }
    .root-notfound-link { border-color: #333; color: #f0f0f0; }
    .root-notfound-link--primary { border-color: #e07a84; background: #e07a84; color: #111; }
    /* Les opacités sont GRAVÉES au niveau du sombre : ici on cesse d'atténuer. */
    .lost-word-cloud { opacity: 1; }
  }
`;

export default function RootNotFound() {
  return (
    <html lang="fr">
      <body>
        <style>{ROOT_NOT_FOUND_CSS}</style>
        <main className="root-notfound-main">
          {/* Même décor que la 404 localisée, même traitement : `alt=""`. */}
          <img className="lost-word-cloud" src="/404-nuage.svg" alt="" aria-hidden="true" />
          <section className="root-notfound-content">
            <h1 className="root-notfound-title">
              <span>Cette page n’existe pas.</span>
              <span lang="ar" dir="rtl">
                هذه الصفحة غير موجودة.
              </span>
            </h1>
            <p className="root-notfound-body">
              Choisissez votre langue pour retrouver votre chemin.
            </p>
            <p className="root-notfound-body root-notfound-ar" lang="ar" dir="rtl">
              اختاروا اللغة باش ترجعوا للطريق.
            </p>
            {/* Liens vers les DEUX racines localisées : le visiteur choisit sa
              langue en choisissant sa sortie.
              ⚠ `next/link`, pas le `Link` de `i18n/navigation` : ce dernier
              préfixerait la locale courante, et il n'y en a pas ici. */}
            <nav className="root-notfound-actions" aria-label="Choix de la langue / اختيار اللغة">
              <Link href="/fr" className="root-notfound-link root-notfound-link--primary">
                Français
              </Link>
              {/* ⚠ `dir="rtl"` MÊME SUR UN MOT SEUL. L'algorithme bidi s'en
                  sortirait ici, mais la garde de `not-found.test.tsx` exige
                  que TOUT élément `lang="ar"` de cette page déclare sa
                  direction : une règle universelle se vérifie, une règle
                  « sauf quand ça se voit pas » ne se vérifie pas. */}
              <Link href="/ar" lang="ar" dir="rtl" className="root-notfound-link">
                العربية
              </Link>
            </nav>
          </section>
        </main>
      </body>
    </html>
  );
}
