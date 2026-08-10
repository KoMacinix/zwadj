// En-tête de la coquille Pro — EXTRAIT de `dashboard.tsx` (Lot A5). Le
// placeholder D24 disparaît en tant qu'accueil (l'accueil réel est la liste des
// salles), mais son en-tête, lui, était bon : marque + nom d'établissement +
// bascule de langue + déconnexion. Il est donc promu ici et réutilisé au-dessus
// de la liste ET des formulaires, plutôt que dupliqué sur trois écrans.
//
// Lot UIP-A : l'en-tête porte désormais le TOP PANEL. Il est monté ici et non
// dans chaque page pour une raison mécanique : c'est le seul composant que les
// six écrans pro rendaient déjà tous. L'accrocher ailleurs aurait demandé de
// toucher six fichiers pour obtenir la même chose, avec six occasions d'en
// oublier un — et un écran sans navigation est un cul-de-sac.
//
// Lot A11a : le nom affiché en clair et le bouton « Se déconnecter » cèdent la
// place à un ROND À INITIALES ouvrant un menu. « Ajouter une salle » y est
// DÉPLACÉ depuis la page liste — il n'existe plus qu'ici, sinon il y aurait
// deux chemins pour la même action.
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { AccountMenu, ThemeToggle, ZwadjLogo, type AccountMenuItem } from "@zwadj/ui";
import { useAuth } from "../auth/auth-context";
import { LangToggle } from "../auth/auth-ui";
import { ProNav } from "./pro-nav";

export function ProHeader() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const items: AccountMenuItem[] = [
    { key: "add-venue", label: t("venue.ui.list.new"), onSelect: () => navigate("/salles/nouvelle") },
    { key: "settings", label: t("account.ui.menu.settings"), onSelect: () => navigate("/compte") },
    { key: "logout", label: t("auth.ui.header.logout"), onSelect: () => void logout(), destructive: true }
  ];

  return (
    <>
      <header className="site-header">
      <ZwadjLogo iconSize={22} suffix="PRO" />
      <div className="header-auth">
        {/* UI-D4 — thème ET langue sur TOUTES les pages pro. Elles ne vivaient
            que dans la coquille d'authentification et dans `dashboard.tsx`, qui
            n'est plus routé : une fois connecté, le pro n'avait plus aucun des
            deux. */}
        <ThemeToggle label={t("auth.ui.pro.theme")} />
        <LangToggle />
        {/* Le menu n'a de sens qu'authentifié — l'en-tête est déjà sous
            RequireProSession, mais la garde évite un rond « ? » si le contexte
            n'est pas encore hydraté. */}
        {user ? (
          <AccountMenu
            displayName={user.proProfile?.businessName ?? null}
            email={user.email}
            items={items}
            triggerLabel={t("account.ui.menu.trigger")}
          />
        ) : null}
      </div>
      </header>
      <ProNav />
    </>
  );
}
