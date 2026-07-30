// Tableau de bord — PLACEHOLDER assumé (D24) : la coquille protégée et son
// en-tête sont livrés par la tranche auth ; le contenu (demandes, calendrier,
// salles) arrive avec les tranches suivantes du MVP.
import { useTranslation } from "react-i18next";
import { ThemeToggle, ZwadjLogo } from "@zwadj/ui";
import { useAuth } from "./auth/auth-context";
import { LangToggle } from "./auth/auth-ui";

export function Dashboard() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  return (
    <>
      <header className="site-header">
        <ZwadjLogo iconSize={22} suffix="PRO" />
        <div className="header-auth">
          <span className="header-user" title={user?.email}>
            {user?.proProfile?.businessName ?? user?.email}
          </span>
          <ThemeToggle label={t("auth.ui.pro.theme")} />
          <LangToggle />
          <button type="button" className="btn btn-ghost" onClick={() => void logout()}>
            {t("auth.ui.header.logout")}
          </button>
        </div>
      </header>
      <main style={{ padding: 24, maxInlineSize: 960, marginInline: "auto" }}>
        <h1 style={{ fontWeight: 500, fontSize: 24 }}>{t("auth.ui.pro.dashboardTitle")}</h1>
        <p style={{ color: "var(--ink-2)", maxInlineSize: 560 }}>{t("auth.ui.pro.dashboardSoon")}</p>
      </main>
    </>
  );
}
