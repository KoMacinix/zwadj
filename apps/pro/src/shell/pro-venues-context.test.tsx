// Provider des salles de la coquille — Lot UIP-A.
//
// ⚠ Ce provider est le composant le plus haut de la zone protégée. Ses défauts
// ne coûtent pas une section : ils coûtent l'application. Les quatre cas
// ci-dessous sont exactement les quatre façons dont il peut la faire tomber ou
// mentir, et chacun est mesuré par un ÉCART, jamais par un simple rendu.
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { VenueProDTO } from "@zwadj/types";
import { AppProviders } from "../App";
import { initI18n } from "../i18n";
import { makeAuthDouble, makeVenueClientDouble } from "../test-support/client-doubles";
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
