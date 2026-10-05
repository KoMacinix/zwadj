// Le champ de téléphone PARTAGÉ (`@zwadj/ui`), vu depuis le Client — rang 32, D325. C'est la seconde moitié de la garde : le même composant est
// rendu par le Pro (`apps/pro/src/ui-phone-field.test.tsx`) ; sous neutralisation du paquet partagé, les DEUX doivent rougir.
//
// ⚠ AUCUNE RÈGLE RECOPIÉE : l'indicatif, la longueur, les premiers chiffres viennent du modèle de pays ; les messages, du catalogue.
import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { messages } from "@zwadj/i18n";
import { DEFAULT_PHONE_COUNTRY, PHONE_COUNTRIES } from "@zwadj/types";
import { PhoneField } from "@zwadj/ui";

const pays = PHONE_COUNTRIES[DEFAULT_PHONE_COUNTRY];

function Champ() {
  const t = useTranslations("common.phone");
  const [digits, setDigits] = useState("");
  return (
    <>
      <label htmlFor="tel">Téléphone</label>
      <PhoneField
        id="tel"
        value={digits}
        onChange={setDigits}
        countryName={t(`country.${DEFAULT_PHONE_COUNTRY}`)}
        placeholder={t(`placeholder.${DEFAULT_PHONE_COUNTRY}`)}
        leadingDigitMessage={t(`leadingDigit.${DEFAULT_PHONE_COUNTRY}`)}
      />
    </>
  );
}

function poser(locale: "fr" | "ar") {
  render(
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      <Champ />
    </NextIntlClientProvider>
  );
}
const champ = () => screen.getByLabelText("Téléphone") as HTMLInputElement;
const taper = (texte: string) => {
  for (const c of texte) fireEvent.change(champ(), { target: { value: champ().value + c } });
};

describe("PhoneField côté Client — la même règle, les mêmes textes", () => {
  it("l'indicatif du modèle est affiché devant, nommé avec le pays, en français comme en arabe", () => {
    for (const locale of ["fr", "ar"] as const) {
      poser(locale);
      expect(screen.getByText(pays.dialCode)).toBeInTheDocument();
      // Verdict en assertion NATIVE : une requête qui ne trouve rien lève `TestingLibraryElementError`, pas une assertion (D304, D316).
      expect(screen.queryAllByRole("img", { name: `${messages[locale].common.phone.country[DEFAULT_PHONE_COUNTRY]}, ${pays.dialCode}` }), locale).toHaveLength(1);
      document.body.innerHTML = "";
    }
  });

  it("seuls les chiffres passent, au plus la longueur du modèle ; un collage complet devient les chiffres nationaux", () => {
    poser("fr");
    taper("5a5b5-5 5!5 5 5 5 5 5");
    expect(champ().value).toBe("5".repeat(pays.nationalLength));
    fireEvent.change(champ(), { target: { value: "" } });
    fireEvent.change(champ(), { target: { value: "+213 555 12 34 56" } });
    expect(champ().value).toBe("555123456");
  });

  it("⚠ un premier chiffre refusé : seul, avec son message dans la langue de la page ; la saisie suivante est bloquée", () => {
    const refuse = [..."0123456789"].find((c) => !pays.leadingDigits.includes(c)) as string;
    for (const locale of ["fr", "ar"] as const) {
      poser(locale);
      taper(refuse);
      taper("55");
      expect(champ().value, locale).toBe(refuse);
      expect(screen.queryAllByRole("alert").map((e) => e.textContent), locale).toEqual([messages[locale].common.phone.leadingDigit[DEFAULT_PHONE_COUNTRY]]);
      // Côté CLIENT aussi : sans cette ligne, neutraliser `aria-invalid` dans `@zwadj/ui` ne faisait rougir QUE le Pro (relevé par la campagne r32, cible P-4).
      expect(champ().getAttribute("aria-invalid"), locale).toBe("true");
      document.body.innerHTML = "";
    }
  });

  it("la boîte reste LTR en arabe : un numéro se lit de gauche à droite", () => {
    poser("ar");
    expect(document.querySelector(".phone-field")?.getAttribute("dir")).toBe("ltr");
  });
});
