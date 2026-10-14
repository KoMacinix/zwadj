// La fenêtre de CHOIX partagée (`@zwadj/ui`), vue depuis le Pro — rang 38 (D332), décision S-1. Même mécanique que `ConfirmDialog` (`useDismissLayer` : Échap annule, Tab boucle, le focus
// va sur « Annuler » et revient au déclencheur), mêmes classes de fenêtre ; elle ne connaît ni i18next ni la remise d'un devis. Les verdicts sont NATIFS : `queryByRole` rend `null`
// quand la fenêtre est absente (un `getByRole` lèverait une erreur de requête, pas une assertion — D304).
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChoiceDialog } from "@zwadj/ui";

const OPTIONS = [
  { id: "fr", label: "Français", lang: "fr", dir: "ltr" },
  { id: "ar", label: "العربية", lang: "ar", dir: "rtl" }
] as const;

function ouvrir(over: Partial<Parameters<typeof ChoiceDialog<"fr" | "ar">>[0]> = {}) {
  const onChoose = vi.fn();
  const onCancel = vi.fn();
  render(<ChoiceDialog open title="Langue du document" description="Choisissez la langue." options={OPTIONS} cancelLabel="Annuler" onChoose={onChoose} onCancel={onCancel} {...over} />);
  return { onChoose, onCancel, boite: () => screen.queryByRole("dialog", { name: "Langue du document" }) };
}

describe("ChoiceDialog — rôle, nom, description, boutons", () => {
  it("fermée, elle ne rend rien", () => {
    ouvrir({ open: false });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("ouverte : une fenêtre modale nommée par son titre et décrite par sa description", () => {
    const { boite } = ouvrir();
    const d = boite() as HTMLElement;
    expect(d).not.toBeNull();
    expect(d.getAttribute("aria-modal")).toBe("true");
    expect(document.getElementById(d.getAttribute("aria-describedby") as string)?.textContent).toBe("Choisissez la langue.");
  });

  it("« Annuler » d'abord, puis les options dans l'ordre reçu", () => {
    const { boite } = ouvrir();
    const noms = Array.from((boite() as HTMLElement).querySelectorAll("button")).map((b) => b.textContent);
    expect(noms).toEqual(["Annuler", "Français", "العربية"]);
  });

  it("chaque option déclare sa langue et sa direction — un lecteur d'écran ne lit pas l'arabe en lettres non liées", () => {
    const { boite } = ouvrir();
    const d = boite() as HTMLElement;
    const fr = within(d).getByRole("button", { name: "Français" });
    const ar = within(d).getByRole("button", { name: "العربية" });
    expect([fr.getAttribute("lang"), fr.getAttribute("dir")]).toEqual(["fr", "ltr"]);
    expect([ar.getAttribute("lang"), ar.getAttribute("dir")]).toEqual(["ar", "rtl"]);
  });

  it("une option sans `lang` ni `dir` n'en pose pas (rien n'est deviné)", () => {
    const { boite } = ouvrir({ options: [{ id: "fr", label: "Un" }] });
    const bouton = within(boite() as HTMLElement).getByRole("button", { name: "Un" });
    expect(bouton.hasAttribute("lang")).toBe(false);
    expect(bouton.hasAttribute("dir")).toBe(false);
  });
});

describe("ChoiceDialog — choisir, annuler, focus", () => {
  it("choisir une option appelle `onChoose` avec son identifiant, UNE fois, et n'annule pas", () => {
    const { boite, onChoose, onCancel } = ouvrir();
    fireEvent.click(within(boite() as HTMLElement).getByRole("button", { name: "العربية" }));
    expect(onChoose).toHaveBeenCalledTimes(1);
    expect(onChoose).toHaveBeenCalledWith("ar");
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("annuler : le bouton, Échap, le clic sur le fond — chacun appelle `onCancel` et jamais `onChoose`", () => {
    for (const geste of ["bouton", "echap", "fond"] as const) {
      const { boite, onChoose, onCancel } = ouvrir();
      const d = boite() as HTMLElement;
      if (geste === "bouton") fireEvent.click(within(d).getByRole("button", { name: "Annuler" }));
      if (geste === "echap") fireEvent.keyDown(d, { key: "Escape" });
      if (geste === "fond") fireEvent.mouseDown(d.parentElement as HTMLElement);
      expect(onCancel, geste).toHaveBeenCalledTimes(1);
      expect(onChoose, geste).not.toHaveBeenCalled();
      cleanup();
    }
  });

  it("un clic DANS la fenêtre n'annule pas (une sélection de texte relâchée dehors non plus : seul `mousedown` sur le fond compte)", () => {
    const { boite, onCancel } = ouvrir();
    fireEvent.mouseDown(boite() as HTMLElement);
    fireEvent.mouseDown(screen.getByText("Choisissez la langue."));
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("le focus initial est « Annuler » — une frappe Entrée distraite ne choisit aucune option", () => {
    const { boite } = ouvrir();
    const annuler = within(boite() as HTMLElement).getByRole("button", { name: "Annuler" });
    expect(document.activeElement === annuler).toBe(true);
  });
});
