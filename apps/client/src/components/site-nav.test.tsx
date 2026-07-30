// Tests de la NAVIGATION principale (Lot UI-N1). Les pièges :
//  - l'état actif se calcule sur le chemin SANS segment de locale : comparer
//    à `/fr/salles` casserait l'arabe sans que le français s'en aperçoive ;
//  - « Accueil » ne doit pas s'allumer partout : `startsWith("/")` est vrai
//    pour toutes les pages du site ;
//  - les rubriques non construites ne sont PAS des liens — quatre 404 seraient
//    pires qu'une absence, le visiteur croirait à une panne ;
//  - `aria-current` est ce qu'un lecteur d'écran annonce ; une classe CSS ne
//    lui apprend rien.
import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { vi } from "vitest";
import messages from "@zwadj/i18n/messages/fr.json";
import { SiteNav } from "./site-nav";

const mockPathname = vi.fn<() => string>();

vi.mock("../i18n/navigation", () => ({
  usePathname: () => mockPathname(),
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}));

function renderNav(pathname: string) {
  mockPathname.mockReturnValue(pathname);
  return render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <SiteNav />
    </NextIntlClientProvider>
  );
}

const nav = () => screen.getByRole("navigation", { name: "Navigation principale" });

describe("Navigation — rubriques", () => {
  it("les six rubriques du design sont annoncées", () => {
    renderNav("/");
    const text = nav().textContent ?? "";
    for (const label of ["Accueil", "Salles", "Prestataires", "Inspirations", "Mes outils", "Communauté"]) {
      expect(text).toContain(label);
    }
  });

  it("seules les rubriques CONSTRUITES sont des liens — pas de 404 déguisé", () => {
    renderNav("/");
    const links = within(nav()).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual(["/", "/salles"]);
  });

  it("les rubriques à venir sont marquées « Bientôt » et non focalisables", () => {
    renderNav("/");
    expect(within(nav()).getAllByText("Bientôt")).toHaveLength(4);
    expect(within(nav()).queryByRole("link", { name: /Prestataires/ })).toBeNull();
    expect(within(nav()).queryByRole("button", { name: /Prestataires/ })).toBeNull();
  });
});

describe("Navigation — état actif", () => {
  it("sur l'accueil, seul « Accueil » est courant", () => {
    renderNav("/");
    expect(within(nav()).getByRole("link", { name: "Accueil" })).toHaveAttribute("aria-current", "page");
    expect(within(nav()).getByRole("link", { name: "Salles" })).not.toHaveAttribute("aria-current");
  });

  it("sur /salles, « Accueil » ne s'allume PAS — startsWith(\"/\") serait vrai partout", () => {
    renderNav("/salles");
    expect(within(nav()).getByRole("link", { name: "Salles" })).toHaveAttribute("aria-current", "page");
    expect(within(nav()).getByRole("link", { name: "Accueil" })).not.toHaveAttribute("aria-current");
  });

  it("une fiche salle garde « Salles » courant : le préfixe compte pour les sous-pages", () => {
    renderNav("/salles/salle-el-ferdous");
    expect(within(nav()).getByRole("link", { name: "Salles" })).toHaveAttribute("aria-current", "page");
  });

  it("le chemin comparé est SANS segment de locale — /fr/salles ne doit pas être attendu", () => {
    // `usePathname` de next-intl rend déjà `/salles`. Ce test fige le contrat :
    // si quelqu'un remplace l'import par celui de `next/navigation`, il casse.
    renderNav("/salles");
    expect(within(nav()).getByRole("link", { name: "Salles" })).toHaveAttribute("href", "/salles");
  });

  it("une page sans entrée de nav n'allume rien", () => {
    renderNav("/compte");
    expect(within(nav()).queryByRole("link", { current: "page" })).toBeNull();
  });
});
