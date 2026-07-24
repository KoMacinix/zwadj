// En-tête de la coquille Pro — EXTRAIT de `dashboard.tsx` (Lot A5). Le
// placeholder D24 disparaît en tant qu'accueil (l'accueil réel est la liste des
// salles), mais son en-tête, lui, était bon : marque + nom d'établissement +
// bascule de langue + déconnexion. Il est donc promu ici et réutilisé au-dessus
// de la liste ET des formulaires, plutôt que dupliqué sur trois écrans.
import { useTranslation } from "react-i18next";
import { ZwadjLogo } from "@zwadj/ui";
import { useAuth } from "../auth/auth-context";
import { LangToggle } from "../auth/auth-ui";

export function ProHeader() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  return (
    <header className="site-header">
      <ZwadjLogo iconSize={22} suffix="PRO" />
      <div className="header-auth">
        <span className="header-user" title={user?.email}>
          {user?.proProfile?.businessName ?? user?.email}
        </span>
        <LangToggle />
        <button type="button" className="btn btn-ghost" onClick={() => void logout()}>
          {t("auth.ui.header.logout")}
        </button>
      </div>
    </header>
  );
}
