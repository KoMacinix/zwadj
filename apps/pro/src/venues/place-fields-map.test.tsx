// Carte — lot CA-5 (session « carte »). Le formulaire de la salle et la carte : la carte ÉCRIT les deux champs ensemble, et
// LIT sa position dans ces mêmes champs — elle n'a aucune position à elle.
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { messages } from "@zwadj/i18n";
import { venueCreateSchema } from "@zwadj/types";
import { initI18n } from "../i18n";
import { PlaceFields, emptyVenueForm, pinOfFields, type VenueFormValues } from "./venue-form";

initI18n();

// La carte est DOUBLÉE : ce fichier mesure ce que le FORMULAIRE lui passe et ce qu'il fait de la position qu'elle rend.
vi.mock("./venue-pin-map", () => ({
  VenuePinMap: ({ pin, onPick }: { pin: { lat: number; lng: number } | null; onPick: (p: { lat: number; lng: number }) => void }) => (
    <div data-testid="carte-du-point" data-pin={pin === null ? "aucun" : `${pin.lat},${pin.lng}`}>
      <button type="button" onClick={() => onPick({ lat: 36.753812, lng: 3.058765 })}>
        (test) poser le point
      </button>
    </div>
  )
}));

function Banc({ depart }: { depart?: Partial<VenueFormValues> }) {
  const [values, setValues] = useState<VenueFormValues>({ ...emptyVenueForm(), ...depart });
  return <PlaceFields values={values} onChange={(patch) => setValues((v) => ({ ...v, ...patch }))} errors={{}} />;
}
const champ = (libelle: string) => screen.getByLabelText(libelle) as HTMLInputElement;
/** La position que la carte (doublée) a reçue — lue dans le DOM, pour que l'assertion soit NATIVE : si la carte n'est pas
 *  posée du tout, la liste est vide et c'est l'égalité qui échoue (D316), pas une requête qui ne trouve rien. */
const positionsRecues = (): (string | null)[] =>
  Array.from(document.querySelectorAll('[data-testid="carte-du-point"]')).map((n) => n.getAttribute("data-pin"));

describe("pinOfFields — la position que portent les deux champs", () => {
  it("deux nombres plausibles : la position ; la virgule décimale est admise, comme à la saisie", () => {
    expect(pinOfFields("36.753812", "3.058765")).toEqual({ lat: 36.753812, lng: 3.058765 });
    expect(pinOfFields(" 36,5 ", "3,1")).toEqual({ lat: 36.5, lng: 3.1 });
  });

  it("⛔ UN SEUL champ rempli n'est pas une position (latitude seule, puis longitude seule)", () => {
    expect(pinOfFields("36.7", "")).toBeNull();
    expect(pinOfFields("", "3.05")).toBeNull();
    expect(pinOfFields("", "")).toBeNull();
  });

  it("une saisie illisible ou hors des bornes du contrat n'est pas une position", () => {
    expect(pinOfFields("abc", "3.05")).toBeNull();
    expect(pinOfFields("91", "3.05")).toBeNull();
    expect(pinOfFields("36.7", "-181")).toBeNull();
    expect(pinOfFields("90", "180")).toEqual({ lat: 90, lng: 180 });
  });
});

describe("PlaceFields — la carte et les deux champs", () => {
  it("les deux champs texte RESTENT (le chemin clavier), et la carte reçoit la position qu'ils portent", () => {
    render(<Banc depart={{ lat: "36.5", lng: "3.1" }} />);
    expect(champ(messages.fr.venue.ui.form.lat).value).toBe("36.5");
    expect(champ(messages.fr.venue.ui.form.lng).value).toBe("3.1");
    expect(positionsRecues()).toEqual(["36.5,3.1"]);
  });

  it("champs vides : la carte n'a aucun point", () => {
    render(<Banc />);
    expect(positionsRecues()).toEqual(["aucun"]);
  });

  it("⛔ poser le point écrit la latitude ET la longitude, ensemble — et la paire passe le contrat partagé", () => {
    render(<Banc />);
    fireEvent.click(screen.getByRole("button", { name: "(test) poser le point" }));
    const lat = champ(messages.fr.venue.ui.form.lat).value;
    const lng = champ(messages.fr.venue.ui.form.lng).value;
    expect([lat, lng]).toEqual(["36.753812", "3.058765"]);
    // La carte relit ce qu'elle vient d'écrire : elle n'a pas de position à elle.
    expect(positionsRecues()).toEqual(["36.753812,3.058765"]);
    // L'AUTORITÉ de « latitude et longitude ensemble » est le schéma partagé : la paire écrite n'y lève pas `coordsPair`.
    const verdict = venueCreateSchema.safeParse({ lat: Number(lat), lng: Number(lng) });
    const messagesDErreur = verdict.success ? [] : verdict.error.issues.map((i) => i.message);
    expect(messagesDErreur).not.toContain("venue.validation.coordsPair");
    expect(messagesDErreur).not.toContain("venue.validation.latRange");
    expect(messagesDErreur).not.toContain("venue.validation.lngRange");
  });

  it("saisir une nouvelle latitude au clavier déplace le point de la carte ; en vider un seul le retire", () => {
    render(<Banc depart={{ lat: "36.5", lng: "3.1" }} />);
    fireEvent.change(champ(messages.fr.venue.ui.form.lat), { target: { value: "36.9" } });
    expect(positionsRecues()).toEqual(["36.9,3.1"]);
    fireEvent.change(champ(messages.fr.venue.ui.form.lng), { target: { value: "" } });
    expect(positionsRecues()).toEqual(["aucun"]);
  });
});
