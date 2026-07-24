// Tests du ConfirmDialog (Lot A5, §7). Le composant vit dans @zwadj/ui — on le
// teste ICI pour réutiliser le harnais jsdom existant de l'app Pro, sans
// ajouter de configuration vitest au paquet (décision §5).
//
// Ce qui est prouvé : piège de focus, Escape → onCancel, RESTITUTION du focus
// au déclencheur, et les attributs ARIA du dialogue modal.
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { ConfirmDialog } from "@zwadj/ui";

const LABELS = {
  title: "Supprimer cette salle ?",
  description: "Cette action est définitive.",
  confirmLabel: "Supprimer",
  cancelLabel: "Annuler"
};

/** Harnais réaliste : un vrai déclencheur, pour observer la restitution. */
function Harness({ onConfirm = vi.fn(), onCancel }: { onConfirm?: () => void; onCancel?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Ouvrir
      </button>
      <ConfirmDialog
        {...LABELS}
        destructive
        open={open}
        onConfirm={onConfirm}
        onCancel={() => {
          onCancel?.();
          setOpen(false);
        }}
      />
    </>
  );
}

describe("ConfirmDialog — accessibilité et clavier", () => {
  it("fermé : ne rend RIEN (pas de dialogue caché dans l'arbre)", () => {
    render(<ConfirmDialog {...LABELS} open={false} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("ouvert : role=dialog + aria-modal + titre/description liés, dans un portail sur <body>", () => {
    render(<ConfirmDialog {...LABELS} open onConfirm={vi.fn()} onCancel={vi.fn()} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    // Le nom accessible vient d'aria-labelledby, la description d'aria-describedby.
    expect(dialog).toHaveAccessibleName(LABELS.title);
    expect(dialog).toHaveAccessibleDescription(LABELS.description);
    // Portail : le panneau est monté sur <body>, pas dans le conteneur React.
    expect(dialog.closest("body")).toBe(document.body);
    // Verrou de scroll pendant l'ouverture.
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("à l'ouverture, le focus va sur ANNULER (une frappe Entrée ne confirme pas une action destructive)", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Ouvrir" }));
    expect(screen.getByRole("button", { name: "Annuler" })).toHaveFocus();
  });

  it("Escape déclenche onCancel", () => {
    const onCancel = vi.fn();
    render(<Harness onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "Ouvrir" }));

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("PIÈGE DE FOCUS : Tab depuis le dernier focusable revient au premier, Shift+Tab fait l'inverse", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Ouvrir" }));

    const cancel = screen.getByRole("button", { name: "Annuler" });
    const confirm = screen.getByRole("button", { name: "Supprimer" });

    // Depuis le DERNIER (Supprimer), Tab boucle sur le PREMIER (Annuler).
    confirm.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(cancel).toHaveFocus();

    // Depuis le PREMIER, Shift+Tab boucle sur le DERNIER.
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(confirm).toHaveFocus();
  });

  it("RESTITUTION : à la fermeture, le focus revient au déclencheur, et le scroll est rendu", () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Ouvrir" });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getByRole("button", { name: "Annuler" })).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });

  it("clic sur l'overlay (hors panneau) = annuler ; clic DANS le panneau ne ferme pas", () => {
    const onCancel = vi.fn();
    render(<Harness onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "Ouvrir" }));

    fireEvent.mouseDown(screen.getByRole("dialog"));
    expect(onCancel).not.toHaveBeenCalled();

    const overlay = screen.getByRole("dialog").parentElement as HTMLElement;
    fireEvent.mouseDown(overlay);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("destructive : le bouton de confirmation porte .btn-danger (correctif A)", () => {
    render(<ConfirmDialog {...LABELS} open destructive onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Supprimer" })).toHaveClass("btn-danger");
  });

  it("confirmation : onConfirm appelé une fois", () => {
    const onConfirm = vi.fn();
    render(<Harness onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole("button", { name: "Ouvrir" }));
    fireEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
