// App Pro (Lot 6) : SPA react-router. Les slugs /auth/verification-email et
// /auth/reinitialisation sont des CONTRATS (liens d'email, Lot 0/4 — PRO_URL
// sans préfixe de locale) ; les autres slugs suivent la même convention que
// le site client. Providers et Routes sont exportés séparément pour les tests
// (MemoryRouter côté jsdom, BrowserRouter en prod).
import { Navigate, Route, Routes, BrowserRouter } from "react-router";
import { AuthProvider } from "./auth/auth-context";
import type { AuthClient } from "./lib/auth-client";
import { LoginPage } from "./auth/login-page";
import { RegisterPage } from "./auth/register-page";
import { ForgotPage, ResetPage, VerifyEmailPage } from "./auth/recovery-pages";
import { RequireProSession } from "./auth/require-pro";
import { Dashboard } from "./dashboard";

export function AppProviders({ children, client }: { children: React.ReactNode; client?: AuthClient }) {
  return <AuthProvider client={client}>{children}</AuthProvider>;
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
            <Dashboard />
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
