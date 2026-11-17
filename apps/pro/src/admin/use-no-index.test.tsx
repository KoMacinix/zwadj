// ADM-2 (D350, rang 52, R-7, MD-ADM-9) — les écrans `/admin` ne sont NI indexables NI annoncés.
//
// ⚠ CE QUE L'APP PRO FAISAIT AVANT CE LOT (mesuré à `b8e5511`, `docs/preuves/D350/etat-des-lieux/releve-sortie.txt`) : RIEN — aucune balise `robots`, aucun `noindex`, pas de `robots.txt`. C'est une SPA : un seul
// `index.html` pour toutes les adresses, donc la balise se pose quand l'écran de l'administration est MONTÉ et se retire quand il est quitté, au lieu de marquer tout le Pro.
// Ce qu'on mesure : la balise existe PENDANT l'écran, avec `noindex, nofollow`, UNE seule (le double montage de `StrictMode` n'en laisse pas deux), et ne SURVIT pas au démontage ; elle n'est pas posée
// hors de `/admin` ; et la coquille de l'administration l'appelle bel et bien (une garde qui vit dans un composant qu'aucun test ne rend est invisible, D205).
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuthUserDTO } from "@zwadj/types";
import { AppProviders, AppRoutes } from "../App";
import { initI18n } from "../i18n";
import { ADMIN_PATH, ADMIN_DELETIONS_PATH, VENUES_PATH } from "../routes";
import { ADMIN_TEXTS } from "./admin-texts";
import { useNoIndex } from "./use-no-index";
import { makeAdminServerDouble } from "../test-support/admin-doubles";
import { makeAuthDouble, makeReferentialsDouble, makeVenueClientDouble } from "../test-support/client-doubles";

initI18n();
afterEach(cleanup);

const robots = () => Array.from(document.head.querySelectorAll('meta[name="robots"]'));

function Sonde() {
  useNoIndex();
  return <p>écran</p>;
}

describe("useNoIndex — la balise suit la vie de l'écran", () => {
  it("posée au montage : `noindex, nofollow`, UNE seule", () => {
    render(<Sonde />);
    expect(robots()).toHaveLength(1);
    expect(robots()[0]?.getAttribute("content")).toBe("noindex, nofollow");
  });

  it("retirée au démontage : elle ne survit pas à l'écran qui l'a posée", () => {
    const { unmount } = render(<Sonde />);
    expect(robots()).toHaveLength(1);
    unmount();
    expect(robots()).toHaveLength(0);
  });

  it("StrictMode (double montage en développement) : une seule balise, et plus aucune après le démontage", () => {
    const { unmount } = render(
      <StrictMode>
        <Sonde />
      </StrictMode>
    );
    expect(robots()).toHaveLength(1);
    unmount();
    expect(robots()).toHaveLength(0);
  });

  it("deux écrans montés ensemble : une seule balise, et elle reste tant qu'il en reste un", () => {
    const a = render(<Sonde />);
    const b = render(<Sonde />);
    expect(robots()).toHaveLength(1);
    a.unmount();
    expect(robots()).toHaveLength(1);
    b.unmount();
    expect(robots()).toHaveLength(0);
  });

  it("ne touche pas une balise `robots` posée par ailleurs (il retire la SIENNE, jamais celle d'un autre)", () => {
    const autre = document.createElement("meta");
    autre.setAttribute("name", "robots");
    autre.setAttribute("content", "index, follow");
    document.head.appendChild(autre);
    const { unmount } = render(<Sonde />);
    unmount();
    expect(robots()).toHaveLength(1);
    expect(robots()[0]?.getAttribute("content")).toBe("index, follow");
    autre.remove();
  });
});

describe("la coquille de l'administration appelle la garde — mesuré sous la table de routes RÉELLE", () => {
  const ADMIN: AuthUserDTO = {
    id: "u-admin",
    email: "admin@exemple.dz",
    role: "ADMIN",
    locale: "fr",
    emailVerified: true,
    firstName: null,
    lastName: null,
    phone: null,
    hasPassword: true,
    hasGoogle: false,
    proProfile: null
  };

  function renderAt(path: string, user: AuthUserDTO) {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <AppProviders
          client={makeAuthDouble({ bootstrap: vi.fn().mockResolvedValue(user) })}
          adminClient={makeAdminServerDouble().client}
          venues={makeVenueClientDouble(null)}
          referentials={makeReferentialsDouble()}
        >
          <AppRoutes />
        </AppProviders>
      </MemoryRouter>
    );
  }

  it("sur `/admin` et sur `/admin/suppressions` : la balise est là ; elle disparaît quand on quitte l'administration", async () => {
    for (const adresse of [ADMIN_PATH, ADMIN_DELETIONS_PATH]) {
      const { unmount } = renderAt(adresse, ADMIN);
      await screen.findByRole("heading", { level: 1 });
      await waitFor(() => expect(robots(), adresse).toHaveLength(1));
      expect(robots()[0]?.getAttribute("content"), adresse).toBe("noindex, nofollow");
      unmount();
      expect(robots(), adresse).toHaveLength(0);
    }
  });

  it("le refus d'un PRO sous `/admin` n'est pas une page de l'administration : pas de balise (il ne contient aucune donnée admin) — et une page du PRO n'en a jamais", async () => {
    const PRO: AuthUserDTO = { ...ADMIN, id: "u-pro", role: "PRO", proProfile: { businessName: "S", phone: "+213551234567", phone2: null, notifyByEmail: true, notifyBySms: false } };
    const refus = renderAt(ADMIN_PATH, PRO);
    await screen.findByRole("heading", { name: ADMIN_TEXTS.forbidden.title });
    refus.unmount();
    const liste = renderAt(VENUES_PATH, PRO);
    await screen.findByRole("heading", { name: "Aucune salle pour le moment" });
    expect(robots()).toHaveLength(0);
    liste.unmount();
  });
});
