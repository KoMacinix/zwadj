// Le champ de téléphone PARTAGÉ (`@zwadj/ui`), vu depuis le Pro — rang 32, D325. Le même composant est rendu par le Client ; son test
// côté client (`apps/client/src/components/ui-phone-field.test.tsx`) est la moitié de la garde : un rouge d'un seul côté, sous neutralisation
// du paquet partagé, dirait que l'autre ne mesure rien.
//
// ⚠ AUCUNE RÈGLE RECOPIÉE : l'indicatif, la longueur, les premiers chiffres viennent du modèle de pays (`PHONE_COUNTRIES`). Les messages
// viennent du CATALOGUE (`messages`), jamais retapés.
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { messages } from "@zwadj/i18n";
import { DEFAULT_PHONE_COUNTRY, PHONE_COUNTRIES, PHONE_COUNTRY_IDS } from "@zwadj/types";
import { DzFlag, NoticeDialog, PHONE_COUNTRY_FLAGS, PhoneField } from "@zwadj/ui";

const FR = messages.fr.common.phone;
const pays = PHONE_COUNTRIES[DEFAULT_PHONE_COUNTRY];

function Champ({ depart = "" }: { depart?: string }) {
  const [digits, setDigits] = useState(depart);
  return (
    <>
      <label htmlFor="tel">Téléphone</label>
      <PhoneField
        id="tel"
        value={digits}
        onChange={setDigits}
        countryName={FR.country[DEFAULT_PHONE_COUNTRY]}
        placeholder={FR.placeholder[DEFAULT_PHONE_COUNTRY]}
        leadingDigitMessage={FR.leadingDigit[DEFAULT_PHONE_COUNTRY]}
      />
    </>
  );
}
const champ = () => screen.getByLabelText("Téléphone") as HTMLInputElement;
/** Une FRAPPE : la valeur d'après est la valeur d'avant plus le caractère. */
const taper = (texte: string) => {
  for (const c of texte) fireEvent.change(champ(), { target: { value: champ().value + c } });
};

describe("PhoneField — l'indicatif et le drapeau viennent du MODÈLE de pays", () => {
  it("l'indicatif affiché est celui du modèle — il n'est pas dans le champ, donc il ne se tape pas", () => {
    render(<Champ />);
    expect(screen.getByText(pays.dialCode)).toBeInTheDocument();
    expect(champ().value).toBe("");
  });

  it("le drapeau et l'indicatif portent le nom accessible du pays : « Algérie, +213 »", () => {
    render(<Champ />);
    // Verdict en assertion NATIVE (`toHaveLength`) : une requête qui ne trouve rien lève `TestingLibraryElementError`, pas une assertion (D304, D316).
    expect(screen.queryAllByRole("img", { name: `${FR.country[DEFAULT_PHONE_COUNTRY]}, ${pays.dialCode}` })).toHaveLength(1);
  });

  it("⚠ CHAQUE pays du modèle a son drapeau : le modèle et les drapeaux ne se désaccordent pas", () => {
    expect(Object.keys(PHONE_COUNTRY_FLAGS).sort()).toEqual([...PHONE_COUNTRY_IDS].sort());
    for (const id of PHONE_COUNTRY_IDS) {
      const Drapeau = PHONE_COUNTRY_FLAGS[id];
      const { container, unmount } = render(<Drapeau />);
      expect(container.querySelector("svg"), `drapeau ${id}`).not.toBeNull();
      unmount();
    }
  });

  it("⚠ le catalogue connaît CHAQUE pays du modèle : son nom, son gabarit et le message du premier chiffre, en français ET en arabe", () => {
    for (const langue of ["fr", "ar"] as const) {
      const phone = messages[langue].common.phone;
      for (const id of PHONE_COUNTRY_IDS) {
        expect(phone.country[id as keyof typeof phone.country], `${langue} nom ${id}`).toBeTruthy();
        expect(phone.placeholder[id as keyof typeof phone.placeholder], `${langue} gabarit ${id}`).toBeTruthy();
        expect(phone.leadingDigit[id as keyof typeof phone.leadingDigit], `${langue} premier chiffre ${id}`).toBeTruthy();
      }
    }
  });

  it("⚠ le message du premier chiffre dit EXACTEMENT les chiffres que le modèle admet — jamais une liste recopiée", () => {
    for (const langue of ["fr", "ar"] as const) {
      const dit = [...messages[langue].common.phone.leadingDigit[DEFAULT_PHONE_COUNTRY].replace(/[^0-9]/g, "")].sort().join("");
      expect(dit, langue).toBe([...pays.leadingDigits].sort().join(""));
    }
  });

  it("⚠ les textes d'aide disent la longueur du modèle : plus de « 8 à 9 » nulle part dans le catalogue", () => {
    for (const langue of ["fr", "ar"] as const) {
      const brut = JSON.stringify(messages[langue]);
      expect(brut, langue).not.toMatch(/8 (à|إلى) 9/);
      expect(messages[langue].venue.ui.walkin.phoneHint, langue).toContain(String(pays.nationalLength));
      expect(messages[langue].auth.ui.pro.phoneHint, langue).toContain(String(pays.nationalLength));
      expect(messages[langue].venue.ui.walkin.phoneHint, langue).toContain(pays.dialCode);
    }
  });
});

describe("PhoneField — la règle de saisie, vue au clavier", () => {
  it("seuls les chiffres passent, et au plus la longueur du modèle", () => {
    render(<Champ />);
    taper("5a5b5-5 5!5 5 5 5 5 5");
    expect(champ().value).toBe("5".repeat(pays.nationalLength));
  });

  it("un collage « 0555 12 34 56 » ou « +213 555 12 34 56 » devient les neuf chiffres nationaux", () => {
    render(<Champ />);
    fireEvent.change(champ(), { target: { value: "0555 12 34 56" } });
    expect(champ().value).toBe("555123456");
    fireEvent.change(champ(), { target: { value: "" } });
    fireEvent.change(champ(), { target: { value: "+213 555 12 34 56" } });
    expect(champ().value).toBe("555123456");
  });

  it("⚠ UN PREMIER CHIFFRE REFUSÉ : il reste, SEUL ; son message s'affiche ; le champ est invalide ; la saisie suivante est bloquée", () => {
    render(<Champ />);
    const refuse = [..."0123456789"].find((c) => !pays.leadingDigits.includes(c)) as string;
    expect(screen.queryByRole("alert")).toBeNull();
    taper(refuse);
    expect(champ().value).toBe(refuse);
    // Verdicts en assertions NATIVES : ni `getByRole` (qui lève une erreur de requête) ni un matcher jest-dom (qui lève `Error`, pas `AssertionError`).
    expect(screen.queryAllByRole("alert").map((e) => e.textContent)).toEqual([FR.leadingDigit[DEFAULT_PHONE_COUNTRY]]);
    expect(champ().getAttribute("aria-invalid")).toBe("true");
    taper("5");
    taper("5");
    expect(champ().value).toBe(refuse);
    // Effacer rend la main : le message disparaît, la saisie reprend.
    fireEvent.change(champ(), { target: { value: "" } });
    expect(screen.queryByRole("alert")).toBeNull();
    taper(pays.leadingDigits.charAt(0));
    expect(champ().value).toBe(pays.leadingDigits.charAt(0));
  });

  it("le message du premier chiffre est LIÉ au champ pour un lecteur d'écran (`aria-describedby`)", () => {
    render(<Champ />);
    taper([..."0123456789"].find((c) => !pays.leadingDigits.includes(c)) as string);
    const id = champ().getAttribute("aria-describedby") as string;
    expect(id).toBeTruthy();
    expect(document.getElementById(id)).toHaveTextContent(FR.leadingDigit[DEFAULT_PHONE_COUNTRY]);
  });

  it("le gabarit d'exemple n'est PAS un numéro : des « X » à la place des chiffres, jamais neuf chiffres", () => {
    render(<Champ />);
    const gabarit = champ().getAttribute("placeholder") as string;
    expect(gabarit).toMatch(/X/);
    expect(gabarit.replace(/\D/g, "").length).toBeLessThan(pays.nationalLength);
  });

  it("le champ est un `tel` à clavier NUMÉRIQUE, sans `maxLength` : un collage long ne doit pas être rogné par le navigateur AVANT la règle", () => {
    render(<Champ />);
    expect(champ()).toHaveAttribute("type", "tel");
    expect(champ()).toHaveAttribute("inputmode", "numeric");
    expect(champ()).not.toHaveAttribute("maxlength");
  });

  it("la boîte est LTR même dans une page arabe : un numéro se lit de gauche à droite", () => {
    const { container } = render(<Champ />);
    expect(container.querySelector(".phone-field")?.getAttribute("dir")).toBe("ltr");
  });
});

describe("DzFlag — le drapeau de l'Algérie", () => {
  it("2 pour 3, vert à gauche, blanc à droite, croissant et étoile rouges", () => {
    const { container } = render(<DzFlag />);
    const svg = container.querySelector("svg") as SVGSVGElement;
    const [largeur, hauteur] = (svg.getAttribute("viewBox") as string).split(" ").slice(2).map(Number) as [number, number];
    expect(hauteur / largeur).toBeCloseTo(2 / 3, 5);
    const formes = [...svg.querySelectorAll("path")];
    expect(formes.map((p) => p.getAttribute("fill"))).toEqual(["#fff", "#063", "#d21034"]);
    // La bande verte part de la gauche et couvre la MOITIÉ de la largeur ; le blanc couvre tout le reste.
    expect(formes[1]?.getAttribute("d")).toBe(`M0 0h${largeur / 2}v${hauteur}H0z`);
  });

  it("décoratif : il n'est pas lu — le nom du pays est porté par le texte qui l'accompagne", () => {
    const { container } = render(<DzFlag />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});

describe("NoticeDialog — la fenêtre d'information", () => {
  it("fermée : rien dans la page ; ouverte : un dialogue modal nommé, décrit, avec UN bouton", () => {
    const { rerender } = render(<NoticeDialog open={false} title="Titre" description="Phrase" closeLabel="Fermer" onClose={() => undefined} />);
    expect(screen.queryByRole("dialog")).toBeNull();
    rerender(<NoticeDialog open title="Titre" description="Phrase" closeLabel="Fermer" onClose={() => undefined} />);
    const dialogue = screen.getByRole("dialog", { name: "Titre" });
    expect(dialogue).toHaveAttribute("aria-modal", "true");
    expect(dialogue).toHaveAccessibleDescription("Phrase");
    expect(screen.getAllByRole("button")).toHaveLength(1);
  });

  it("le bouton ET la touche Échap ferment ; le focus part sur le bouton", () => {
    let fermetures = 0;
    render(<NoticeDialog open title="Titre" description="Phrase" closeLabel="Fermer" onClose={() => (fermetures += 1)} />);
    expect(screen.getByRole("button", { name: "Fermer" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Fermer" }));
    expect(fermetures).toBe(1);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(fermetures).toBe(2);
  });
});
