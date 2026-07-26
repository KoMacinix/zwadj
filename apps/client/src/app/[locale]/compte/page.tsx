// Route /{locale}/compte — Lot A11b.
//
// Composant SERVEUR minimal : il ne fait que monter la vue client. La page ne
// peut pas être rendue côté serveur avec des données de session — l'access
// token vit en mémoire JS (D2), le serveur ne le voit jamais. Toute la logique
// est donc dans `AccountSettingsView`, marquée "use client".
import type { Metadata } from "next";
import { AccountSettingsView } from "../../../components/account/account-settings-view";

// `noindex` : une page de compte n'a rien à faire dans un index de recherche.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AccountPage() {
  return <AccountSettingsView />;
}
