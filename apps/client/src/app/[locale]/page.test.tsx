// Test minimal (validation squelette) : la vue de la page d'accueil se rend
// sans erreur en FR sous le provider next-intl, avec les messages partagés
// de @zwadj/i18n et le formatter DZD (imports cross-package testés).
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { messages } from "@zwadj/i18n";
import { HomeView } from "../../components/home-view";

describe("Page d'accueil [locale] (fr)", () => {
  it("se rend sans erreur avec les traductions fr", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages.fr}>
        <HomeView apiStatus="ok (db: up)" />
      </NextIntlClientProvider>
    );
    expect(screen.getByRole("heading", { name: "Zwadj" })).toBeInTheDocument();
    expect(screen.getByText(/réservez votre salle de mariage/i)).toBeInTheDocument();
    expect(screen.getByText(/État de l'API : ok/)).toBeInTheDocument();
    expect(screen.getByTestId("sample-price")).toHaveTextContent(/850/);
  });
});
