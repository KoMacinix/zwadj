// Test minimal (validation squelette) : App se rend sans erreur, la clé i18next
// est résolue, et le Button importé de @zwadj/ui est réellement dans le DOM
// (preuve cross-package TESTÉE, pas supposée).
import { render, screen } from "@testing-library/react";
import { initI18n } from "./i18n";
import { App } from "./App";

initI18n();

describe("App (Zwadj Pro)", () => {
  it("se rend sans erreur avec la clé traduite et le Button de @zwadj/ui", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Zwadj Pro" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Commencer" })).toBeInTheDocument();
  });
});
