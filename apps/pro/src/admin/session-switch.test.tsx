// ADM-2 (D350, rang 52, R-7, MD-ADM-10) — un MÊME navigateur qui passe d'un compte PRO à un compte ADMIN (puis à un autre PRO) ne garde RIEN de l'autre.
//
// MD-ADM-10 : un seul `zwadj_rt` par navigateur — se connecter en ADMIN déconnecte le PRO, et inversement (l'API ; non rejoué ici). Ce que le Pro tient EN MÉMOIRE dans l'application, lui, ne dépend que
// d'elle : la liste des salles du pro connecté (`ProVenuesProvider`) et le brouillon du parcours « Nouvelle réservation » (`WalkinDraftProvider`, D345 : numéro, e-mail et nom d'un client, sur un poste
// qui peut être partagé). La consigne dit « le brouillon compris — mesure-le » : ce fichier est la mesure.
//
// Ce qui se lit : l'identité courante, ce que le fournisseur des salles tient, et si le brouillon d'une salle est lisible — à chaque étape du changement de compte, y compris l'INSTANT où le nouveau
// compte vient d'arriver et où sa propre lecture n'est pas revenue (c'est là qu'une liste périmée se voit).
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuthUserDTO, VenueProDTO } from "@zwadj/types";
import { AppProviders } from "../App";
import { useAuth } from "../auth/auth-context";
import { useWalkinDraft } from "../dashboard/walkin-draft-context";
import type { WalkinDraft } from "../dashboard/walkin-draft";
import { initI18n } from "../i18n";
import { useProVenues } from "../shell/pro-venues-context";
import { makeAuthDouble, makeReferentialsDouble, makeVenueClientDouble } from "../test-support/client-doubles";
import { makeAdminServerDouble } from "../test-support/admin-doubles";

initI18n();
afterEach(() => {
  cleanup();
  rendus.length = 0;
});

const compte = (id: string, role: AuthUserDTO["role"]): AuthUserDTO => ({
  id,
  email: `${id}@exemple.dz`,
  role,
  locale: "fr",
  emailVerified: true,
  firstName: null,
  lastName: null,
  phone: null,
  hasPassword: true,
  hasGoogle: false,
  proProfile: role === "PRO" ? { businessName: `Pro ${id}`, phone: "+213551234567", phone2: null, notifyByEmail: true, notifyBySms: false } : null
});
const PRO_A = compte("pro-a", "PRO");
const ADMIN = compte("admin-1", "ADMIN");
const PRO_B = compte("pro-b", "PRO");

const salle = (nom: string): VenueProDTO => ({ id: "v1", nameFr: nom, nameAr: nom, slotTemplates: [], publicationStatus: "DRAFT", status: "ACTIVE" }) as unknown as VenueProDTO;

/** Tout ce que la sonde a RENDU, dans l'ordre : « identité | liste ». Un `waitFor` ne voit que l'état final ; une liste périmée qui n'est rendue qu'UN instant, à l'arrivée du nouveau compte, se lit ici. */
const rendus: string[] = [];
/** Le magasin du brouillon, tel que la sonde l'a reçu : on le LIT à l'instant de l'assertion (jamais dans un texte rendu, qui peut dater d'avant l'effacement). */
let magasin: ReturnType<typeof useWalkinDraft> | null = null;

function Sonde() {
  const { user, login, logout } = useAuth();
  const { state } = useProVenues();
  const brouillon = useWalkinDraft();
  magasin = brouillon;
  rendus.push(`${user?.id ?? "anonyme"}|${state.kind === "ready" ? state.venues.map((v) => v.nameFr).join("+") || "vide" : state.kind}`);
  return (
    <>
      <output data-testid="qui">{user?.id ?? "anonyme"}</output>
      <output data-testid="salles">{state.kind === "ready" ? state.venues.map((v) => v.nameFr).join("|") || "vide" : state.kind}</output>
      <button type="button" onClick={() => void login({ email: "x@exemple.dz", password: "Motdepasse1" })}>
        connexion
      </button>
      <button type="button" onClick={() => void logout()}>
        déconnexion
      </button>
      <button type="button" onClick={() => brouillon.ecrire({ venueId: "v1", step: "date" } as unknown as WalkinDraft)}>
        écrire
      </button>
    </>
  );
}
const lu = (id: string) => screen.getByTestId(id).textContent;
const brouillonLisible = () => (magasin?.lire("v1") ? "présent" : "absent");

/** Une session par connexion : les comptes arrivent dans l'ordre donné ; la lecture des salles du N-ième PRO peut être RETENUE. */
function monter(comptes: AuthUserDTO[], lectures: Array<VenueProDTO[] | "retenue">) {
  const queue = [...comptes];
  let liberer: ((v: VenueProDTO[]) => void) | null = null;
  const lectureSuivante = [...lectures];
  const venues = makeVenueClientDouble(null, {
    listMine: vi.fn(() => {
      const prochaine = lectureSuivante.shift() ?? [];
      if (prochaine === "retenue") return new Promise<VenueProDTO[]>((resolve) => (liberer = resolve));
      return Promise.resolve(prochaine);
    })
  });
  const client = makeAuthDouble({
    bootstrap: vi.fn().mockResolvedValue(null),
    login: vi.fn(async () => ({ user: queue.shift() as AuthUserDTO, accessToken: "jwt" })),
    logout: vi.fn().mockResolvedValue(undefined)
  });
  render(
    <MemoryRouter>
      <AppProviders client={client} venues={venues} referentials={makeReferentialsDouble()} adminClient={makeAdminServerDouble().client}>
        <Sonde />
      </AppProviders>
    </MemoryRouter>
  );
  return { liberer: (v: VenueProDTO[]) => liberer?.(v) };
}
const connexion = async (attendu: string) => {
  fireEvent.click(screen.getByRole("button", { name: "connexion" }));
  await waitFor(() => expect(lu("qui")).toBe(attendu));
};
const deconnexion = async () => {
  fireEvent.click(screen.getByRole("button", { name: "déconnexion" }));
  await waitFor(() => expect(lu("qui")).toBe("anonyme"));
};

describe("MD-ADM-10 — PRO → ADMIN → PRO dans un même navigateur : rien ne reste de l'autre compte", () => {
  it("le PRO A lit ses salles et garde un brouillon ; il se déconnecte : ni la liste ni le brouillon ne restent lisibles", async () => {
    monter([PRO_A], [[salle("Salle de A")]]);
    await screen.findByText("anonyme");
    await connexion(PRO_A.id);
    await waitFor(() => expect(lu("salles")).toBe("Salle de A"));
    fireEvent.click(screen.getByRole("button", { name: "écrire" }));
    await act(async () => undefined);
    // `lire` n'est relu qu'au rendu suivant : on passe par la déconnexion, qui re-rend.
    await deconnexion();
    expect(brouillonLisible()).toBe("absent");
    expect(lu("salles"), "la liste de A ne survit pas à sa déconnexion").not.toContain("Salle de A");
  });

  it("un ADMIN qui se connecte après un PRO ne voit pas la liste des salles du PRO, ni son brouillon", async () => {
    monter([PRO_A, ADMIN], [[salle("Salle de A")]]);
    await screen.findByText("anonyme");
    await connexion(PRO_A.id);
    await waitFor(() => expect(lu("salles")).toBe("Salle de A"));
    fireEvent.click(screen.getByRole("button", { name: "écrire" }));
    await deconnexion();
    await connexion(ADMIN.id);
    expect(lu("salles"), "la liste du PRO est encore tenue sous un ADMIN").not.toContain("Salle de A");
    expect(brouillonLisible()).toBe("absent");
  });

  it("PRO A → ADMIN → PRO B : à l'INSTANT où B arrive (sa lecture n'est pas revenue), la liste de A n'est pas rendue ; B lit ensuite les siennes ; le brouillon de A n'est pas le sien", async () => {
    const m = monter([PRO_A, ADMIN, PRO_B], [[salle("Salle de A")], "retenue"]);
    await screen.findByText("anonyme");
    await connexion(PRO_A.id);
    await waitFor(() => expect(lu("salles")).toBe("Salle de A"));
    fireEvent.click(screen.getByRole("button", { name: "écrire" }));
    await deconnexion();
    await connexion(ADMIN.id);
    await deconnexion();
    await connexion(PRO_B.id);

    // La lecture de B est RETENUE : ce qui est rendu maintenant ne peut venir que de ce que le fournisseur a gardé de A.
    expect(lu("salles"), "la liste de A est rendue à B pendant que la sienne charge").not.toContain("Salle de A");
    // Et à AUCUN rendu depuis l'arrivée de B — pas même l'instant avant que sa propre lecture ne démarre.
    expect(rendus.filter((r) => r.startsWith(`${PRO_B.id}|`) && r.includes("Salle de A")), "un rendu de B a montré la liste de A").toEqual([]);
    expect(brouillonLisible()).toBe("absent");

    await act(async () => m.liberer([salle("Salle de B")]));
    await waitFor(() => expect(lu("salles")).toBe("Salle de B"));
  });
});
