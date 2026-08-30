// Bascule de thème (Lot UI-D1 — D64).
//
// Ce qui se joue : l'attribut posé sur <html>, la persistance, et le fait que
// le premier clic PART DE L'ÉTAT RÉEL. Un composant qui garderait son propre
// état initial (« je suppose clair ») demanderait deux clics pour éclaircir une
// page déjà sombre — c'est le bug que ces tests interdisent.
// `fireEvent` et non `user-event` : c'est la convention du dépôt (voir
// `login-form.test.tsx`), et ajouter une dépendance pour un clic serait payer
// cher un `click()`.
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { THEME_STORAGE_KEY, ThemeToggle } from "@zwadj/ui";

function mount() {
  return render(<ThemeToggle label="Changer de thème" />);
}

/** Simule la préférence SYSTÈME, que jsdom ne fournit pas. */
function systemPrefersDark(dark: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: dark && query.includes("dark"),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }))
  );
}

beforeEach(() => {
  delete document.documentElement.dataset.theme;
  window.localStorage.clear();
  systemPrefersDark(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ThemeToggle — D64", () => {
  it("aucun choix : le clic passe en sombre et le retient", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Changer de thème" }));

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  });

  it("un aller-retour revient au clair, et le clair est RETENU explicitement", () => {
    mount();
    const button = screen.getByRole("button", { name: "Changer de thème" });

    fireEvent.click(button);
    fireEvent.click(button);

    // « light » est stocké, pas effacé : sur un système sombre, revenir au clair
    // est un choix qui doit survivre au rechargement.
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
  });

  it("UI-D3 — système en SOMBRE : la page reste CLAIRE, le premier clic ASSOMBRIT", () => {
    systemPrefersDark(true);
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Changer de thème" }));

    // Zwadj s'ouvre en clair quoi qu'en dise le système : la bascule part donc
    // du clair, même ici. Consulter `matchMedia` pendant que le CSS ne le fait
    // plus demanderait deux clics pour un seul changement visible.
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("repart de l'attribut déjà posé par le script d'avant-peinture", () => {
    document.documentElement.dataset.theme = "dark";
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Changer de thème" }));

    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("les DEUX icônes sont dans le DOM — c'est le CSS qui en montre une", () => {
    const { container } = mount();
    expect(container.querySelector(".icon-moon")).not.toBeNull();
    expect(container.querySelector(".icon-sun")).not.toBeNull();
    // Décoratives : le nom accessible vient de aria-label, pas des SVG.
    expect(container.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(2);
  });

  it("stockage indisponible (navigation privée) : le thème s'applique quand même", () => {
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Changer de thème" }));

    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
