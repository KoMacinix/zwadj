// Tests de la saisie d'heure 24 h (D57). Ce qui se prouve ici :
//  - AUCUN `<input type="time">` : c'est lui qui afficherait AM/PM selon la
//    locale du navigateur, et rien en HTML ne permet de l'en empêcher ;
//  - les 24 heures sont proposées, sur deux chiffres, sans AM/PM nulle part ;
//  - une valeur EXISTANTE hors pas reste sélectionnable — sinon ouvrir puis
//    enregistrer un créneau de 20:05 le déplacerait à 20:00 en silence ;
//  - changer l'heure ne perd pas les minutes, et réciproquement.
import { fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";
import { initI18n } from "../i18n";
import { TimeSelect } from "./time-select";

initI18n();

function renderTime(value: string, minuteStep?: number) {
  const onChange = vi.fn();
  render(<TimeSelect label="Heure de début" value={value} onChange={onChange} minuteStep={minuteStep} />);
  const group = screen.getByRole("group", { name: "Heure de début" });
  return {
    onChange,
    hours: within(group).getByLabelText("Heures") as HTMLSelectElement,
    minutes: within(group).getByLabelText("Minutes") as HTMLSelectElement,
    group
  };
}

describe("TimeSelect — 24 h garanti", () => {
  it("n'utilise AUCUN input natif de type time", () => {
    const { group } = renderTime("20:00");
    expect(group.querySelector('input[type="time"]')).toBeNull();
  });

  it("propose les 24 heures, sur deux chiffres", () => {
    const { hours } = renderTime("20:00");
    const options = Array.from(hours.options).map((o) => o.value);
    expect(options).toHaveLength(24);
    expect(options[0]).toBe("00");
    expect(options[23]).toBe("23");
  });

  it("aucun AM ni PM nulle part dans le contrôle", () => {
    const { group } = renderTime("20:00");
    expect(group.textContent).not.toMatch(/\b(AM|PM|am|pm)\b/);
  });

  it("20:00 s'affiche « 20 », jamais « 8 »", () => {
    const { hours } = renderTime("20:00");
    expect(hours.value).toBe("20");
  });
});

describe("TimeSelect — valeurs hors pas", () => {
  it("une minute existante hors pas reste sélectionnable et affichée", () => {
    const { minutes } = renderTime("20:05");
    expect(minutes.value).toBe("05");
    expect(Array.from(minutes.options).map((o) => o.value)).toContain("05");
  });

  it("le pas par défaut est le quart d'heure", () => {
    const { minutes } = renderTime("20:00");
    expect(Array.from(minutes.options).map((o) => o.value)).toEqual(["00", "15", "30", "45"]);
  });

  it("un pas personnalisé est respecté", () => {
    const { minutes } = renderTime("20:00", 30);
    expect(Array.from(minutes.options).map((o) => o.value)).toEqual(["00", "30"]);
  });
});

describe("TimeSelect — composition de la valeur", () => {
  it("changer l'heure conserve les minutes", () => {
    const { hours, onChange } = renderTime("20:30");
    fireEvent.change(hours, { target: { value: "08" } });
    expect(onChange).toHaveBeenCalledWith("08:30");
  });

  it("changer les minutes conserve l'heure", () => {
    const { minutes, onChange } = renderTime("20:30");
    fireEvent.change(minutes, { target: { value: "45" } });
    expect(onChange).toHaveBeenCalledWith("20:45");
  });

  it("la valeur émise est TOUJOURS sur deux chiffres", () => {
    const { hours, onChange } = renderTime("08:00");
    fireEvent.change(hours, { target: { value: "09" } });
    expect(onChange).toHaveBeenCalledWith("09:00");
  });

  it("une valeur d'entrée aberrante retombe sur minuit sans planter", () => {
    const { hours } = renderTime("n'importe quoi");
    expect(hours.value).toBe("00");
  });
});
