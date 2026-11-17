// ADM-2 (D350, rang 52, R-4, D-1) — la garde de rôle ADMIN pour `/admin`, à côté de `RequireProSession`. D-1 (arbitrage de Ko, D321) : « D23 devient : l'app Pro accepte un PRO hors de `/admin`, et un ADMIN
// sous `/admin` seulement. »
//
//  · anonyme ⇒ la connexion ; ADMIN ⇒ l'écran ;
//  · un PRO ou un CLIENT sous `/admin` voit un REFUS EXPLICITE (pas un écran vide, pas un 403 silencieux à chaque appel) — et la garde ne laisse PARTIR aucun appel à l'API admin ;
//  · pendant le démarrage de la session, rien de l'administration n'est montré (ni l'écran ni le refus) : le loader de marque porte son anti-flash (A12, D44).
// ⚠ L'API reste l'AUTORITÉ (MD-ADM-1 : `RolesGuard`) : cette garde est de l'UX, pas de la sécurité — un ADMIN rétrogradé garde ses droits jusqu'à l'expiration de son jeton (D-9, borné par `JWT_ACCESS_TTL`).
// Le refus est un écran `/admin` : il est en français seul (D-2), il ne lit pas le catalogue.
import { Link, Navigate } from "react-router";
import { BrandLoader } from "@zwadj/ui";
import { ADMIN_TEXTS } from "../admin/admin-texts";
import { DASHBOARD_PATH, LOGIN_PATH } from "../routes";
import { useAuth } from "./auth-context";

export function RequireAdminSession({ children }: { children: React.ReactNode }) {
  const { status, user, logout } = useAuth();

  if (status === "loading") {
    return (
      <main className="auth-main" aria-busy="true">
        <BrandLoader label={ADMIN_TEXTS.common.loading} />
      </main>
    );
  }

  if (status === "anonymous" || !user) {
    return <Navigate to={LOGIN_PATH} replace />;
  }

  if (user.role !== "ADMIN") {
    return (
      <main className="auth-main" lang="fr" dir="ltr">
        <div className="auth-card" style={{ maxInlineSize: 520 }}>
          <section className="auth-formpane" style={{ inlineSize: "100%" }}>
            <div className="state-panel">
              <h1>{ADMIN_TEXTS.forbidden.title}</h1>
              <p>{ADMIN_TEXTS.forbidden.body}</p>
              {/* Un PRO a un espace à retrouver ; un CLIENT n'en a pas ici (l'app Pro n'est pas la sienne). */}
              {user.role === "PRO" ? (
                <Link to={DASHBOARD_PATH} className="btn btn-ghost">
                  {ADMIN_TEXTS.forbidden.backToPro}
                </Link>
              ) : null}
              <button type="button" className="btn btn-accent" onClick={() => void logout()}>
                {ADMIN_TEXTS.forbidden.logout}
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
