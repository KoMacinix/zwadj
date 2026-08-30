// Bascule de langue (Lot UI-D2). Ce qui se joue :
//  - c'est un LIEN, pas un bouton : la locale vit dans l'URL, la version arabe
//    d'une page doit pouvoir se partager et s'indexer ;
//  - les FILTRES survivent au changement de langue. `usePathname` de next-intl
//    ne rend ni le préfixe de langue ni la query : sans report explicite, passer
//    en arabe depuis une recherche filtrée renvoie sur une liste vierge et le
//    visiteur croit avoir tout perdu ;
//  - l'étiquette est écrite DANS la langue de destination — « العربية », pas
//    « Arabe » : c'est ce que cherche un arabophone arrivé sur une page en
//    français.
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { vi } from "vitest";
import messages from "@zwadj/i18n/messages/fr.json";
import { LocaleSwitch } from "./locale-switch";

const mockPathname = vi.fn<() => string>();
const mockSearch = vi.fn<() => URLSearchParams>();

vi.mock("../i18n/navigation", () => ({
  usePathname: () => mockPathname(),
  // Le double du Link de next-intl : il expose ce que le composant lui passe,
  // sans quoi le test ne verrait pas la locale de destination.
  Link: ({
    href,
    locale,
    children,
    ...rest
  }: {
    href: { pathname: string; query: Record<string, string> };
    locale: string;
    children: React.ReactNode;
  }) => {
    const qs = new URLSearchParams(href.query).toString();
    return (
      <a href={`/${locale}${href.pathname}${qs === "" ? "" : `?${qs}`}`} {...rest}>
        {children}
      </a>
    );
  }
}));

vi.mock("next/navigation", () => ({ useSearchParams: () => mockSearch() }));

function renderSwitch(pathname: string, query = "") {
  mockPathname.mockReturnValue(pathname);
  mockSearch.mockReturnValue(new URLSearchParams(query));
  return render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <LocaleSwitch />
    </NextIntlClientProvider>
  );
}

describe("LocaleSwitch — UI-D2", () => {
  it("depuis le français, propose l'arabe, écrit en arabe", () => {
    renderSwitch("/salles");
    const link = screen.getByRole("link", { name: "Afficher cette page en arabe" });

    expect(link).toHaveTextContent("العربية");
    expect(link).toHaveAttribute("href", "/ar/salles");
    // `lang` et `hrefLang` : l'un pour les lecteurs d'écran, l'autre pour les
    // moteurs. Sans `lang`, une synthèse vocale française lit « العربية » en
    // français, c'est-à-dire ne le lit pas.
    expect(link).toHaveAttribute("lang", "ar");
    expect(link).toHaveAttribute("hrefLang", "ar");
  });

  it("reporte les FILTRES : changer de langue ne vide pas la recherche", () => {
    renderSwitch("/salles", "guests=200&styles=jardin&page=2");
    const link = screen.getByRole("link", { name: "Afficher cette page en arabe" });

    expect(link).toHaveAttribute("href", "/ar/salles?guests=200&styles=jardin&page=2");
  });

  it("c'est un lien, pas un bouton — il doit pouvoir s'ouvrir dans un onglet", () => {
    renderSwitch("/");
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("link")).toBeInTheDocument();
  });
});
