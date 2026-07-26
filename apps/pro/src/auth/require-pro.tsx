// Garde de la coquille protégée (D24) : tout ce qui n'est pas /auth exige une
// session au rôle PRO. L'API reste l'AUTORITÉ (JwtAuthGuard + RolesGuard) —
// cette garde est de l'UX, pas de la sécurité.
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router";
import { BrandLoader } from "@zwadj/ui";
import { useAuth } from "./auth-context";
import { LangToggle } from "./auth-ui";

export function RequireProSession({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { status, user, logout } = useAuth();

  // Boot silencieux en cours : ne rien flasher (ni login ni dashboard). Le
  // loader de marque (A12, D44) porte lui-même son anti-flash — il ne se révèle
  // qu'au bout de ~200 ms, un boot instantané reste donc silencieux.
  if (status === "loading") {
    return (
      <main className="auth-main" aria-busy="true">
        <BrandLoader label={t("common.loading")} />
      </main>
    );
  }

  if (status === "anonymous" || !user) {
    return <Navigate to="/auth/connexion" replace />;
  }

  // D23 : un compte CLIENT connecté ici est refusé EXPLICITEMENT (pas de
  // dashboard vide ni de 403 silencieux à chaque appel).
  if (user.role !== "PRO") {
    return (
      <main className="auth-main">
        <div className="auth-card" style={{ maxInlineSize: 520 }}>
          <section className="auth-formpane" style={{ inlineSize: "100%" }}>
            <div className="state-panel">
              <h1>{t("auth.ui.pro.wrongRoleTitle")}</h1>
              <p>{t("auth.ui.pro.wrongRoleBody")}</p>
              <button type="button" className="btn btn-accent" onClick={() => void logout()}>
                {t("auth.ui.header.logout")}
              </button>
              <LangToggle />
            </div>
          </section>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
