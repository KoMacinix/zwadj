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

/** Le garde SYMÉTRIQUE : une session ouverte n'a rien à faire sur un formulaire
 *  d'entrée.
 *
 *  ⚠ LE DÉFAUT QU'IL CORRIGE. `RequireProSession` empêchait d'ENTRER sans
 *  session ; rien n'empêchait d'en SORTIR vers `/auth/connexion` avec une session
 *  valide. Un pro déjà connecté qui tapait cette adresse voyait le formulaire, et
 *  pouvait donc se reconnecter par-dessus sa propre session — voire avec un AUTRE
 *  compte, en échangeant le jeton sous une application déjà montée, dans un état
 *  que rien ne teste. La session était saine : c'est la porte qui restait ouverte
 *  dans le mauvais sens.
 *
 *  ⚠ ET IL NE S'APPLIQUE PAS À TOUTES LES ROUTES `/auth/*`. Deux d'entre elles
 *  CONSOMMENT un jeton reçu par e-mail :
 *    - `/auth/reinitialisation` — un utilisateur connecté peut très bien cliquer
 *      le lien de réinitialisation qu'il vient de demander ;
 *    - `/auth/verification-email` — c'est même le cas NOMINAL : on y arrive après
 *      un changement d'adresse, donc forcément connecté.
 *  Les rediriger casserait ces deux parcours. Le garde ne couvre que les points
 *  d'ENTRÉE : connexion, inscription, mot de passe oublié.
 *
 *  Pendant le boot, on ne montre NI le formulaire NI le tableau de bord : le même
 *  loader de marque que le garde d'entrée, avec son anti-flash (A12, D44). Sans
 *  cela, le formulaire apparaîtrait une fraction de seconde avant de disparaître,
 *  ce qui se lit comme un bug de déconnexion. */
export function RedirectIfSession({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { status, user } = useAuth();

  if (status === "loading") {
    return (
      <main className="auth-main" aria-busy="true">
        <BrandLoader label={t("common.loading")} />
      </main>
    );
  }

  // ⚠ Tout rôle, pas seulement PRO. Un CLIENT connecté renvoyé sur « / » y trouve
  // la carte « mauvais rôle » de `RequireProSession`, avec son bouton de
  // déconnexion — un message explicite, là où le formulaire de connexion lui
  // laissait croire qu'il n'était pas connecté du tout.
  if (status === "authenticated" && user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
