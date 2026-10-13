// Provider des salles de la coquille — Lot UIP-A.
//
// ⚠ Ce provider est le composant le plus haut de la zone protégée. Ses défauts
// ne coûtent pas une section : ils coûtent l'application. Les quatre cas
// ci-dessous sont exactement les quatre façons dont il peut la faire tomber ou
// mentir, et chacun est mesuré par un ÉCART, jamais par un simple rendu.
import { StrictMode, useEffect } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { VenueProDTO } from "@zwadj/types";
import { AppProviders } from "../App";
import { initI18n } from "../i18n";
import { useAuth } from "../auth/auth-context";
import { PRO_USER, laisserPasser, makeAuthDouble, makeVenueClientDouble, makeVenueServerDouble } from "../test-support/client-doubles";
import { useProVenues } from "./pro-venues-context";

initI18n();

function venue(id: string, nameFr: string): VenueProDTO {
  return { id, nameFr, nameAr: nameFr } as VenueProDTO;
}

/** Sonde : rend l'état du provider en clair. Un composant de test plutôt qu'un
 *  `renderHook` — c'est bien sous `AppProviders` que le provider doit marcher,
 *  et c'est cet assemblage-là qui a cassé six tests d'authentification. */
function Probe() {
  const { state, current, count } = useProVenues();
  return (
    <ul>
      <li>état:{state.kind}</li>
      <li>compte:{count}</li>
      <li>courante:{current?.nameFr ?? "aucune"}</li>
    </ul>
  );
}

function renderProbe(client: ReturnType<typeof makeAuthDouble>, venues = makeVenueClientDouble()) {
  return render(
    <AppProviders client={client} venues={venues}>
      <Probe />
    </AppProviders>
  );
}

describe("Provider des salles — ce qu'il ne doit jamais faire", () => {
  it("⚠ n'appelle RIEN tant qu'aucun PRO n'est connecté — sinon 401 sur l'écran de connexion", async () => {
    const listMine = vi.fn().mockResolvedValue([]);
    // `bootstrap` rend null : c'est l'état d'un visiteur anonyme sur /auth/connexion.
    renderProbe(makeAuthDouble({ bootstrap: vi.fn().mockResolvedValue(null) }), makeVenueClientDouble(null, { listMine }));

    await screen.findByText("état:loading");
    // L'écart mesuré : ZÉRO appel. Sans la garde, il en part exactement un.
    expect(listMine).not.toHaveBeenCalled();
  });

  it("un PRO connecté déclenche UNE seule lecture, pas une par consommateur", async () => {
    const listMine = vi.fn().mockResolvedValue([venue("v1", "Salle El Ryad")]);
    render(
      <AppProviders client={makeAuthDouble()} venues={makeVenueClientDouble(null, { listMine })}>
        <Probe />
        <Probe />
        <Probe />
      </AppProviders>
    );

    await waitFor(() => expect(screen.getAllByText("compte:1")).toHaveLength(3));
    // Trois sondes, UN appel : c'est toute la raison d'être du provider.
    expect(listMine).toHaveBeenCalledTimes(1);
  });

  it("D120 — une réponse qui n'est pas un tableau donne une liste VIDE, jamais une chute", async () => {
    const listMine = vi.fn().mockResolvedValue({ message: "Bad Gateway" } as unknown as VenueProDTO[]);
    renderProbe(makeAuthDouble(), makeVenueClientDouble(null, { listMine }));

    // ⚠ On attend `état:ready`, PAS `compte:0`. « compte:0 » est déjà vrai
    // pendant le chargement — l'assertion serait satisfaite avant même la
    // réponse, et resterait verte sans la garde. Seul `ready` prouve que le
    // provider a SURVÉCU à la réponse : sans la garde, `venues.find` lève au
    // rendu qui suit la transition et l'état n'apparaît jamais.
    expect(await screen.findByText("état:ready")).toBeInTheDocument();
    expect(screen.getByText("compte:0")).toBeInTheDocument();
    expect(screen.getByText("courante:aucune")).toBeInTheDocument();
  });

  it("l'échec réseau est un ÉTAT, pas une liste vide — « aucune salle » et « on ne sait pas » diffèrent", async () => {
    const listMine = vi.fn().mockRejectedValue(new Error("réseau"));
    renderProbe(makeAuthDouble(), makeVenueClientDouble(null, { listMine }));

    // Confondre les deux ferait proposer « créez votre première salle » à un pro
    // qui en a trois : le pire message possible.
    expect(await screen.findByText("état:error")).toBeInTheDocument();
  });

  it("la salle courante est la PREMIÈRE par défaut, et le compte pilote le libellé adaptatif", async () => {
    const listMine = vi.fn().mockResolvedValue([venue("v1", "El Ryad"), venue("v2", "El Djazair")]);
    renderProbe(makeAuthDouble(), makeVenueClientDouble(null, { listMine }));

    expect(await screen.findByText("compte:2")).toBeInTheDocument();
    expect(screen.getByText("courante:El Ryad")).toBeInTheDocument();
  });
});

// ── Rang 37 (D331) : la RELECTURE D'ENTRÉE (`revalidate`) et ce qui la sépare de la relecture voulue (`reload`) ─────────────────────────────────────────────────────────────────────
// ⚠ Le fournisseur est le composant le plus haut de la zone protégée : une relecture qui se trompe coûte la liste, le libellé et la salle courante de TOUS les écrans. Les cas ci-dessous
// sont les modes de défaillance F-5 à F-13 et F-17 du cadrage (`docs/preuves/D331/table-ouverture.md`), chacun mesuré par un ÉCART. Le faux serveur est HONNÊTE (`makeVenueServerDouble`) :
// `listMine` fige l'état à l'APPEL, une réponse retenue puis relâchée porte donc un état ANCIEN — ce qui est exactement ce que fait une réponse lente.

/** Pilote : on commande le fournisseur comme le font les écrans — relecture voulue, relecture d'entrée, déconnexion, connexion. */
function Pilote() {
  const { state, current, count, reload, revalidate } = useProVenues();
  const { logout, login } = useAuth();
  return (
    <>
      <ul>
        <li>état:{state.kind}</li>
        <li>compte:{count}</li>
        <li>courante:{current?.nameFr ?? "aucune"}</li>
      </ul>
      <button type="button" onClick={reload}>
        relire
      </button>
      <button type="button" onClick={revalidate}>
        revalider
      </button>
      <button type="button" onClick={() => void logout()}>
        sortir
      </button>
      <button type="button" onClick={() => void login({ email: "contact@salle.dz", password: "x" } as Parameters<typeof login>[0])}>
        entrer
      </button>
    </>
  );
}

/** Ce que fait une page qui s'ouvre sur « Ma salle » : demander la relecture d'entrée à son montage. */
function Entrant() {
  const { revalidate } = useProVenues();
  useEffect(() => {
    revalidate();
  }, [revalidate]);
  return null;
}

function Quand({ pret, children }: { pret: boolean; children: React.ReactNode }) {
  const { state } = useProVenues();
  return pret && state.kind === "ready" ? <>{children}</> : null;
}

const attendre = laisserPasser;
/** Un TEXTE est-il à l'écran ? Verdict NATIF (`toBe`) : une requête qui lève n'est pas une assertion (D304, D316). */
const present = (texte: string) => screen.queryByText(texte) !== null;
const appels = (serveur: ReturnType<typeof makeVenueServerDouble>) => vi.mocked(serveur.client.listMine).mock.calls.length;
const rendre = (serveur: ReturnType<typeof makeVenueServerDouble>, client = makeAuthDouble(), enfants: React.ReactNode = <Pilote />, strict = false) => {
  const arbre = (
    <AppProviders client={client} venues={serveur.client}>
      {enfants}
    </AppProviders>
  );
  return render(strict ? <StrictMode>{arbre}</StrictMode> : arbre);
};

describe("Provider des salles — la relecture d'ENTRÉE (`revalidate`) est silencieuse et ne s'ajoute à rien", () => {
  it("F-7 : relire une liste CONNUE ne la masque pas — l'état reste « ready » et le compte ne bouge pas tant que la réponse n'est pas là ; la liste neuve la remplace ensuite", async () => {
    const serveur = makeVenueServerDouble([venue("v1", "El Ryad")]);
    rendre(serveur);
    await screen.findByText("compte:1");
    serveur.actElsewhere((v) => [...v, venue("v2", "El Djazair")]);
    const retenue = serveur.hold("listMine");
    fireEvent.click(screen.getByRole("button", { name: "revalider" }));
    await waitFor(() => expect(appels(serveur)).toBe(2));
    expect(present("état:ready")).toBe(true);
    expect(present("compte:1")).toBe(true);
    retenue.release();
    await waitFor(() => expect(screen.queryByText("compte:2")).not.toBeNull());
    expect(present("état:ready")).toBe(true);
  });

  it("F-6 : pendant le CHARGEMENT de démarrage, relire à l'entrée ne fait RIEN — une seconde requête serait une cascade (l'e2e A2 exige UNE lecture à froid)", async () => {
    const serveur = makeVenueServerDouble([venue("v1", "El Ryad")]);
    const retenue = serveur.hold("listMine");
    rendre(serveur);
    await waitFor(() => expect(appels(serveur)).toBe(1));
    fireEvent.click(screen.getByRole("button", { name: "revalider" }));
    await attendre();
    expect(appels(serveur)).toBe(1);
    expect(present("état:loading")).toBe(true);
    retenue.release();
    await screen.findByText("compte:1");
    expect(appels(serveur)).toBe(1);
  });

  it("F-6 : sur l'état « error », relire à l'entrée ne fait RIEN — le bouton « Réessayer » reste la voie", async () => {
    const serveur = makeVenueServerDouble([], { overrides: { listMine: vi.fn().mockRejectedValue(new Error("réseau")) } });
    rendre(serveur);
    await screen.findByText("état:error");
    fireEvent.click(screen.getByRole("button", { name: "revalider" }));
    await attendre();
    expect(appels(serveur)).toBe(1);
    expect(present("état:error")).toBe(true);
  });

  it("F-5 : sous `StrictMode`, une page qui demande la relecture à son montage (exécuté deux fois en développement) produit UNE seule requête", async () => {
    const serveur = makeVenueServerDouble([venue("v1", "El Ryad")]);
    rendre(
      serveur,
      makeAuthDouble(),
      <>
        <Pilote />
        <Quand pret>
          <Entrant />
        </Quand>
      </>,
      true
    );
    await screen.findByText("compte:1");
    await attendre();
    expect(appels(serveur)).toBe(2);
  });

  it("F-9 : un ÉCHEC de la relecture d'entrée LAISSE la liste connue (pas d'état « error », pas de liste vide) — et la relecture suivante est de nouveau possible", async () => {
    const serveur = makeVenueServerDouble([venue("v1", "El Ryad")]);
    rendre(serveur);
    await screen.findByText("compte:1");
    vi.mocked(serveur.client.listMine).mockRejectedValueOnce(new Error("réseau"));
    fireEvent.click(screen.getByRole("button", { name: "revalider" }));
    await waitFor(() => expect(appels(serveur)).toBe(2));
    await attendre();
    expect(present("état:ready")).toBe(true);
    expect(present("compte:1")).toBe(true);
    expect(present("courante:El Ryad")).toBe(true);
    // Le drapeau n'est pas resté coincé : une nouvelle entrée relit.
    fireEvent.click(screen.getByRole("button", { name: "revalider" }));
    await waitFor(() => expect(appels(serveur)).toBe(3));
  });

  it("F-9 : une réponse qui n'est PAS un tableau (proxy en 502) à la relecture d'entrée LAISSE la liste connue — un compte faux n'est pas présenté comme un fait (D133, D142)", async () => {
    const serveur = makeVenueServerDouble([venue("v1", "El Ryad"), venue("v2", "El Djazair")]);
    rendre(serveur);
    await screen.findByText("compte:2");
    vi.mocked(serveur.client.listMine).mockResolvedValueOnce({ message: "Bad Gateway" } as unknown as VenueProDTO[]);
    fireEvent.click(screen.getByRole("button", { name: "revalider" }));
    await waitFor(() => expect(appels(serveur)).toBe(2));
    await attendre();
    expect(present("compte:2")).toBe(true);
    expect(present("courante:El Ryad")).toBe(true);
  });

  it("F-10 : l'échec d'une relecture VOULUE (celle qui suit une écriture, ou « Réessayer ») est un ÉTAT « error » — l'écran ne dit pas « à jour » ce qu'il ne sait pas", async () => {
    const serveur = makeVenueServerDouble([venue("v1", "El Ryad")]);
    rendre(serveur);
    await screen.findByText("compte:1");
    vi.mocked(serveur.client.listMine).mockRejectedValueOnce(new Error("réseau"));
    fireEvent.click(screen.getByRole("button", { name: "relire" }));
    // Verdict en assertion NATIVE (D304, D316) : `findByText` lèverait une erreur de REQUÊTE, pas une assertion.
    await waitFor(() => expect(present("état:error")).toBe(true));
  });

  it("F-17 : pendant une relecture VOULUE le compte garde le dernier compte connu (le libellé ne clignote pas) ; au PREMIER chargement il vaut toujours 0", async () => {
    const serveur = makeVenueServerDouble([venue("v1", "El Ryad"), venue("v2", "El Djazair")]);
    const premiere = serveur.hold("listMine");
    rendre(serveur);
    await screen.findByText("état:loading");
    expect(present("compte:0")).toBe(true);
    premiere.release();
    await screen.findByText("compte:2");
    const seconde = serveur.hold("listMine");
    fireEvent.click(screen.getByRole("button", { name: "relire" }));
    await screen.findByText("état:loading");
    expect(present("compte:2")).toBe(true);
    seconde.release();
    await screen.findByText("état:ready");
    expect(present("compte:2")).toBe(true);
  });

  it("F-8 : une réponse TARDIVE de la relecture d'entrée n'écrase jamais le résultat plus frais d'une relecture demandée après elle — la dernière lecture demandée gagne", async () => {
    const serveur = makeVenueServerDouble([venue("v1", "El Ryad")]);
    rendre(serveur);
    await screen.findByText("compte:1");
    const tardive = serveur.hold("listMine");
    fireEvent.click(screen.getByRole("button", { name: "revalider" })); // l'appel n° 2 : il portera l'état ANCIEN (une salle), retenu
    await waitFor(() => expect(appels(serveur)).toBe(2));
    serveur.actElsewhere((v) => [...v, venue("v2", "El Djazair")]);
    fireEvent.click(screen.getByRole("button", { name: "relire" })); // l'appel n° 3 : état frais (deux salles), non retenu
    await screen.findByText("compte:2");
    tardive.release();
    await attendre();
    expect(present("compte:2")).toBe(true);
  });

  it("F-12/F-13 : un drapeau armé AVANT une déconnexion ne rend pas SILENCIEUSE la première lecture de la session suivante ; et sans PRO connecté, relire à l'entrée n'envoie aucune requête", async () => {
    const serveur = makeVenueServerDouble([venue("v1", "El Ryad")]);
    const client = makeAuthDouble({ logout: vi.fn().mockResolvedValue(undefined), login: vi.fn().mockResolvedValue({ user: PRO_USER }) });
    rendre(serveur, client);
    await screen.findByText("compte:1");
    fireEvent.click(screen.getByRole("button", { name: "sortir" }));
    await waitFor(() => expect(vi.mocked(client.logout)).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "revalider" })); // armé alors qu'AUCUN pro n'est connecté
    await attendre();
    expect(appels(serveur)).toBe(1); // F-13 : aucune requête
    const retenue = serveur.hold("listMine");
    fireEvent.click(screen.getByRole("button", { name: "entrer" }));
    // La première lecture de la nouvelle session est VISIBLE : la liste de l'ancien compte n'est pas laissée à l'écran jusqu'à la réponse.
    await waitFor(() => expect(screen.queryByText("état:loading")).not.toBeNull());
    retenue.release();
    await screen.findByText("état:ready");
  });
});
