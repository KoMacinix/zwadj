// ADM-2 (D350, rang 52, R-5) — la coquille des écrans `/admin` : le titre, la navigation entre les deux listes, la déconnexion. En FRANÇAIS, dans le sens de lecture de gauche à droite (D-2) : `lang="fr"` et
// `dir="ltr"` sont posés sur la coquille, quelle que soit la langue choisie ailleurs dans l'application Pro. Elle pose `noindex` tant qu'elle est montée (MD-ADM-9).
import "./admin.css";
import { NavLink } from "react-router";
import { useAuth } from "../auth/auth-context";
import { ADMIN_DELETIONS_PATH, ADMIN_PATH } from "../routes";
import { ADMIN_TEXTS } from "./admin-texts";
import { useNoIndex } from "./use-no-index";

export function AdminShell({ children }: { children: React.ReactNode }) {
  useNoIndex();
  const { logout } = useAuth();
  return (
    <div className="admin-shell" lang="fr" dir="ltr">
      <header className="admin-header">
        <p className="admin-brand">{ADMIN_TEXTS.shell.brand}</p>
        <nav aria-label={ADMIN_TEXTS.shell.navLabel} className="admin-nav">
          {/* `end` : « /admin » ne reste pas actif sous « /admin/suppressions ». */}
          <NavLink to={ADMIN_PATH} end>
            {ADMIN_TEXTS.shell.venues}
          </NavLink>
          <NavLink to={ADMIN_DELETIONS_PATH}>{ADMIN_TEXTS.shell.deletions}</NavLink>
        </nav>
        <button type="button" className="btn btn-ghost" onClick={() => void logout()}>
          {ADMIN_TEXTS.shell.logout}
        </button>
      </header>
      <main className="admin-main">{children}</main>
    </div>
  );
}
