// En-tête de la coquille Pro — EXTRAIT de `dashboard.tsx` (Lot A5). Le
// placeholder D24 disparaît en tant qu'accueil (l'accueil réel est la liste des
// salles), mais son en-tête, lui, était bon : marque + nom d'établissement +
// bascule de langue + déconnexion. Il est donc promu ici et réutilisé au-dessus
// de la liste ET des formulaires, plutôt que dupliqué sur trois écrans.
//
// Lot A11a : le nom affiché en clair et le bouton « Se déconnecter » cèdent la
// place à un ROND À INITIALES ouvrant un menu. « Ajouter une salle » y est
// DÉPLACÉ depuis la page liste — il n'existe plus qu'ici, sinon il y aurait
// deux chemins pour la même action.
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { AccountMenu, ZwadjLogo, type AccountMenuItem } from "@zwadj/ui";
import { useAuth } from "../auth/auth-context";
import { LangToggle } from "../auth/auth-ui";

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
    <header className="site-header">
      <ZwadjLogo iconSize={22} suffix="PRO" />
      <div className="header-auth">
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
  );
}
