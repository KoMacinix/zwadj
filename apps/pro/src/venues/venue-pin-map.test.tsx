// Carte — lot CA-5 (session « carte »). Poser le point de la salle : au GESTE, en mode « poser », et la position choisie
// remonte telle quelle.
//
// ⚠ Le canevas est DOUBLÉ (jsdom n'a pas de mise en page) : ce fichier mesure ce que le composant passe à la carte et ce
// qu'il fait de son rappel. Le vrai clic sur la vraie carte est mesuré dans un navigateur (`e2e/specs/ca6-carte.e2e.ts`).
import type { ComponentType } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { messages } from "@zwadj/i18n";
import type { LeafletCanvasProps, MapTiles } from "@zwadj/ui";
import { initI18n } from "../i18n";
import { VenuePinMap } from "./venue-pin-map";

initI18n();

const TUILES: MapTiles = { url: "https://tuiles.test/{z}/{x}/{y}.png", attribution: "© Fond de test", attributionUrl: null };
const POSEE = { lat: 36.753812, lng: 3.058765 };

function FauxCanevas(props: LeafletCanvasProps) {
  const pin = props.pin === undefined ? "lecture" : props.pin === null ? "aucun" : `${props.pin.lat},${props.pin.lng}`;
  return (
    <div data-testid="canevas" data-pin={pin} data-points={props.markers.length} aria-label={props.labels.region} data-nom-du-point={props.labels.pin}>
      <button type="button" onClick={() => props.onPinChange?.(POSEE)}>
        (test) poser le point
      </button>
    </div>
  );
}
const chargerFauxCanevas = (): Promise<{ default: ComponentType<LeafletCanvasProps> }> => Promise.resolve({ default: FauxCanevas });

const poser = (props: Partial<Parameters<typeof VenuePinMap>[0]> = {}) => {
  const charger = vi.fn(chargerFauxCanevas);
  const onPick = vi.fn();
  const vue = render(<VenuePinMap pin={null} onPick={onPick} tiles={TUILES} loadCanvas={charger} {...props} />);
  return { charger, onPick, ...vue };
};
const boutons = (racine: HTMLElement) => Array.from(racine.querySelectorAll(":scope > .venue-pin-map > button")).map((b) => b.textContent);

describe("VenuePinMap — poser le point de la salle", () => {
  it("⛔ tant que le pro n'a rien demandé : un bouton, AUCUNE carte chargée", () => {
    const { charger, container } = poser();
    expect(boutons(container)).toEqual([messages.fr.map.pin.show]);
    expect(container.querySelector(".venue-pin-map > button")?.getAttribute("aria-expanded")).toBe("false");
    expect(charger.mock.calls).toHaveLength(0);
    expect(screen.queryAllByTestId("canevas")).toHaveLength(0);
  });

  it("le geste ouvre la carte en mode « POSER » (aucun point de salle), avec la consigne ; sans position connue, aucun point", async () => {
    const { container } = poser({ pin: null });
    fireEvent.click(screen.getByRole("button", { name: messages.fr.map.pin.show }));
    const canevas = await screen.findByTestId("canevas");
    expect(canevas.getAttribute("data-pin")).toBe("aucun");
    expect(canevas.getAttribute("data-points")).toBe("0");
    expect(canevas.getAttribute("aria-label")).toBe(messages.fr.map.pin.region);
    expect(canevas.getAttribute("data-nom-du-point")).toBe(messages.fr.map.pin.label);
    expect(container.querySelector(".field-hint")?.textContent).toBe(messages.fr.map.pin.hint);
    expect(boutons(container)).toEqual([messages.fr.map.pin.hide]);
  });

  it("la position que portent les champs est celle du point montré", async () => {
    poser({ pin: { lat: 36.5, lng: 3.1 } });
    fireEvent.click(screen.getByRole("button", { name: messages.fr.map.pin.show }));
    expect((await screen.findByTestId("canevas")).getAttribute("data-pin")).toBe("36.5,3.1");
  });

  it("⛔ un point posé sur la carte remonte TEL QUEL à l'appelant (latitude et longitude ensemble)", async () => {
    const { onPick } = poser();
    fireEvent.click(screen.getByRole("button", { name: messages.fr.map.pin.show }));
    await screen.findByTestId("canevas");
    fireEvent.click(screen.getByRole("button", { name: "(test) poser le point" }));
    expect(onPick.mock.calls).toEqual([[POSEE]]);
  });

  it("« Masquer la carte » la retire", async () => {
    const { container } = poser();
    fireEvent.click(screen.getByRole("button", { name: messages.fr.map.pin.show }));
    await screen.findByTestId("canevas");
    fireEvent.click(screen.getByRole("button", { name: messages.fr.map.pin.hide }));
    expect(screen.queryAllByTestId("canevas")).toHaveLength(0);
    expect(boutons(container)).toEqual([messages.fr.map.pin.show]);
  });

  it("⛔ pas de fond de carte : c'est dit, et il n'y a pas de bouton — les deux champs restent le seul chemin", () => {
    const { charger, container } = poser({ tiles: null });
    expect(container.querySelector(".field-hint")?.textContent).toBe(messages.fr.map.unavailableTitle);
    expect(container.querySelectorAll("button")).toHaveLength(0);
    expect(charger.mock.calls).toHaveLength(0);
  });
});
