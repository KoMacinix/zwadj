// Route /{locale}/compte — Lot A11b.
//
// Composant SERVEUR minimal : il ne fait que monter la vue client. La page ne
// peut pas être rendue côté serveur avec des données de session — l'access
// token vit en mémoire JS (D2), le serveur ne le voit jamais. Toute la logique
// est donc dans `AccountSettingsView`, marquée "use client".
import type { Metadata } from "next";
import { AccountSettingsView } from "../../../components/account/account-settings-view";

// `noindex` : une page de compte n'a rien à faire dans un index de recherche.
// ⚠ SEULE PAGE DU DÉPÔT QUI PORTAIT DÉJÀ UN `robots` avant le lot SEO — et la
// seule où `follow: false` se justifie : derrière elle il n'y a que des écrans
// privés, il n'y a donc aucun chemin d'exploration à préserver. Partout
// ailleurs le `noindex` va avec `follow: true`. Pas de `canonical` : en
// désigner une reviendrait à donner une adresse de référence à une page qu'on
// demande justement d'ignorer.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AccountPage() {
  return <AccountSettingsView />;
}
