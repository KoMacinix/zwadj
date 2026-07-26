// App Pro : SPA react-router. Les slugs /auth/verification-email et
// /auth/reinitialisation sont des CONTRATS (liens d'email, Lot 0/4 — PRO_URL
// sans préfixe de locale) ; les autres slugs suivent la même convention que
// le site client. Providers et Routes sont exportés séparément pour les tests
// (MemoryRouter côté jsdom, BrowserRouter en prod).
//
// Lot A5 : `/` n'est plus le tableau de bord placeholder (D24, travail assumé
// comme jeté) mais la LISTE DES SALLES — l'accueil réel du pro. Pas d'écran
// intermédiaire. Les clients du domaine venue sont fournis une fois pour toute
// la zone protégée, et restent injectables pour les tests.
import { Navigate, Route, Routes, BrowserRouter } from "react-router";
import { AuthProvider } from "./auth/auth-context";
import type { AuthClient } from "./lib/auth-client";
import type { ReferentialsClient, VenueProClient } from "@zwadj/api-client";
import { LoginPage } from "./auth/login-page";
import { RegisterPage } from "./auth/register-page";
import { ForgotPage, ResetPage, VerifyEmailPage } from "./auth/recovery-pages";
import { RequireProSession } from "./auth/require-pro";
import { VenueProvider } from "./venues/venue-client-context";
import { AccountSettingsPage } from "./account/account-settings-page";
import { VenueListPage } from "./venues/venue-list-page";
import { CreateVenuePage } from "./venues/create-venue-page";
import { EditVenuePage } from "./venues/edit-venue-page";

export function AppProviders({
  children,
  client,
  venues,
  referentials
}: {
  children: React.ReactNode;
  client?: AuthClient;
  /** Injectables pour les tests (comme `client` pour l'auth). */
  venues?: VenueProClient;
  referentials?: ReferentialsClient;
}) {
  return (
    <AuthProvider client={client}>
      {/* Sous AuthProvider : le client venue se construit sur
          `api.authedRequest` et partage donc le mutex de refresh (§8). */}
      <VenueProvider venues={venues} referentials={referentials}>
        {children}
      </VenueProvider>
    </AuthProvider>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth/connexion" element={<LoginPage />} />
      <Route path="/auth/inscription" element={<RegisterPage />} />
      <Route path="/auth/mot-de-passe-oublie" element={<ForgotPage />} />
      <Route path="/auth/reinitialisation" element={<ResetPage />} />
      <Route path="/auth/verification-email" element={<VerifyEmailPage />} />
      <Route
        path="/"
        element={
          <RequireProSession>
            <VenueListPage />
          </RequireProSession>
        }
      />
      <Route
        path="/compte"
        element={
          <RequireProSession>
            <AccountSettingsPage />
          </RequireProSession>
        }
      />
      {/* STATIQUE AVANT PARAM : sans cet ordre, /salles/nouvelle serait capté
          par /salles/:id et partirait chercher une salle d'id « nouvelle ». */}
      <Route
        path="/salles/nouvelle"
        element={
          <RequireProSession>
            <CreateVenuePage />
          </RequireProSession>
        }
      />
      <Route
        path="/salles/:id"
        element={
          <RequireProSession>
            <EditVenuePage />
          </RequireProSession>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <AppRoutes />
      </AppProviders>
    </BrowserRouter>
  );
}
