// 404 RACINE — point B, second volet.
//
// ⚠ CE FICHIER N'EST PAS UN DOUBLON DE `[locale]/not-found.tsx`.
// Il ne sert qu'à UN cas, celui que l'autre ne peut structurellement pas
// couvrir : un chemin dont la LOCALE est invalide (`/xx/quoi`). Dans ce cas
// `[locale]/layout.tsx` appelle `notFound()` à sa toute première ligne, AVANT
// d'avoir monté `NextIntlClientProvider` — il n'y a donc ni traductions, ni
// `lang`, ni `dir`, ni en-tête, ni thème disponibles ici. Sans ce fichier, Next
// rendrait son 404 anglais par défaut, hors charte.
//
// ⚠ CONSÉQUENCE ASSUMÉE : cette page est BILINGUE EN DUR, et c'est la seule du
// dépôt. Elle ne peut pas lire `packages/i18n` — le fournisseur n'existe pas —
// et deviner une langue depuis l'URL reviendrait à réimplémenter la
// négociation de locale que le middleware fait déjà, en second exemplaire.
// Afficher les DEUX langues est la réponse honnête : le visiteur n'a pas choisi,
// on ne choisit pas pour lui.
//
// Le layout racine de ce dossier n'existe pas (le seul `<html>` est celui de
// `[locale]/layout.tsx`), donc cette page doit porter les siens.
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
              langue en choisissant sa sortie. */}
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
