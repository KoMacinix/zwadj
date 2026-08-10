// App Pro : SPA react-router. Les slugs /auth/verification-email et
// /auth/reinitialisation sont des CONTRATS (liens d'email, Lot 0/4 — PRO_URL
// sans préfixe de locale) ; les autres slugs suivent la même convention que
// le site client. Providers et Routes sont exportés séparément pour les tests
// (MemoryRouter côté jsdom, BrowserRouter en prod).
//
// Lot A5 : `/` n'était plus le tableau de bord placeholder (D24) mais la liste
// des salles. Lot UIP-A le REPREND : le top panel annonce cinq entrées, dont
// « Tableau de bord » en premier et « Ma salle / Mes salles » en second — la
// table de routes suit donc la navigation, `/` redevient le tableau de bord et
// la liste passe à `/salles`.
//
// ⚠ DETTE FERMÉE : `/salles` n'était PAS une route déclarée. Elle tombait sur
// le `<Route path="*">` et redirigeait silencieusement vers `/`. La spec e2e A5
// la listait pourtant déjà (« mes salles », `/salles`) : elle mesurait un
// rechargement qui n'atteignait jamais l'écran nommé.
//
// ⚠ `/salles/:id/calendrier` DISPARAÎT. Son calendrier devient l'entrée
// « Calendrier », ses demandes et ses visites l'entrée « Demandes », ses devis
// le corps du tableau de bord. Aucune de ces trois surfaces n'était atteignable
// autrement qu'en ouvrant une salle.
//
// Les clients du domaine venue sont fournis une fois pour toute la zone
// protégée, et restent injectables pour les tests.
import { Navigate, Route, Routes, BrowserRouter } from "react-router";
import { AuthProvider } from "./auth/auth-context";
import type { AuthClient } from "./lib/auth-client";
import type { BookingsProClient, ReferentialsClient, QuotesClient, ServicesClient, VenueProClient } from "@zwadj/api-client";
import { LoginPage } from "./auth/login-page";
import { RegisterPage } from "./auth/register-page";
import { ForgotPage, ResetPage, VerifyEmailPage } from "./auth/recovery-pages";
import { RedirectIfSession, RequireProSession } from "./auth/require-pro";
import { VenueProvider } from "./venues/venue-client-context";
import { ProVenuesProvider } from "./shell/pro-venues-context";
import { AccountSettingsPage } from "./account/account-settings-page";
import { VenueListPage } from "./venues/venue-list-page";
import { CreateVenuePage } from "./venues/create-venue-page";
import { EditVenuePage } from "./venues/edit-venue-page";
import { DashboardPage } from "./dashboard/dashboard-page";
import { RequestsPage } from "./venues/requests-page";
import { CalendarPage } from "./venues/calendar-page";
import { BookingsPage } from "./venues/bookings-page";

export function AppProviders({
  children,
  client,
  venues,
  referentials,
  bookingsPro,
  servicesClient,
  quotesClient
}: {
  children: React.ReactNode;
  client?: AuthClient;
  /** Injectables pour les tests (comme `client` pour l'auth). */
  venues?: VenueProClient;
  referentials?: ReferentialsClient;
  bookingsPro?: BookingsProClient;
  servicesClient?: ServicesClient;
  quotesClient?: QuotesClient;
}) {
  return (
    <AuthProvider client={client}>
      {/* Sous AuthProvider : le client venue se construit sur
          `api.authedRequest` et partage donc le mutex de refresh (§8). */}
      <VenueProvider venues={venues} referentials={referentials} bookingsPro={bookingsPro} servicesClient={servicesClient} quotesClient={quotesClient}>
        {/* UIP-A — la liste des salles est lue UNE FOIS pour toute la coquille :
            libellé adaptatif de la nav, sélecteur de portée et panneau gauche
            posent la même question. Trois `listMine()` au montage d'une page
            seraient trois allers-retours pour une seule réponse. */}
        <ProVenuesProvider>{children}</ProVenuesProvider>
      </VenueProvider>
    </AuthProvider>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      {/* ⚠ Les trois POINTS D'ENTRÉE sont fermés à une session ouverte : un pro
          connecté qui tapait `/auth/connexion` voyait le formulaire et pouvait se
          reconnecter par-dessus lui-même. */}
      <Route
        path="/auth/connexion"
        element={
          <RedirectIfSession>
            <LoginPage />
          </RedirectIfSession>
        }
      />
      <Route
        path="/auth/inscription"
        element={
          <RedirectIfSession>
            <RegisterPage />
          </RedirectIfSession>
        }
      />
      <Route
        path="/auth/mot-de-passe-oublie"
        element={
          <RedirectIfSession>
            <ForgotPage />
          </RedirectIfSession>
        }
      />
      {/* ⚠ Ces DEUX-LÀ restent ouvertes, et ce n'est pas un oubli : elles
          consomment un jeton reçu par e-mail. La vérification d'adresse est même
          atteinte APRÈS un changement d'e-mail, donc en étant connecté — la
          fermer casserait le parcours qu'elle sert. */}
      <Route path="/auth/reinitialisation" element={<ResetPage />} />
      <Route path="/auth/verification-email" element={<VerifyEmailPage />} />
      <Route
        path="/"
        element={
          <RequireProSession>
            <DashboardPage />
          </RequireProSession>
        }
      />
      <Route
        path="/demandes"
        element={
          <RequireProSession>
            <RequestsPage />
          </RequireProSession>
        }
      />
      <Route
        path="/calendrier"
        element={
          <RequireProSession>
            <CalendarPage />
          </RequireProSession>
        }
      />
      <Route
        path="/reservations"
        element={
          <RequireProSession>
            <BookingsPage />
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
      {/* UIP-A — la liste, désormais DÉCLARÉE. */}
      <Route
        path="/salles"
        element={
          <RequireProSession>
            <VenueListPage />
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
