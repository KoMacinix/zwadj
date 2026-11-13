// Carte — lot CA-2 (session « carte »). Le CHARGEUR : quatre issues, quatre phrases — et aucune requête quand il n'y a pas
// de fond de carte.
import { fireEvent, screen, waitFor } from "@testing-library/react";
import type { VenueMapOutcome } from "../../lib/api";
import { VenueMapLoader } from "./venue-map-loader";
import { TUILES, chargerFauxCanevas, enveloppe, message, point, rendre, reponse } from "./map-test-support";

vi.mock("../../i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}));

const OK: VenueMapOutcome = { kind: "ok", data: reponse([point(1), point(2)]) };
const PANNE: VenueMapOutcome = { kind: "unreachable" };

/** Une promesse dont le test tient la résolution : l'ordre d'arrivée des réponses est alors CHOISI, pas subi. */
function differee<T>() {
  let resoudre!: (valeur: T) => void;
  const promesse = new Promise<T>((r) => {
    resoudre = r;
  });
  return { promesse, resoudre };
}

describe("VenueMapLoader — pas de fond de carte", () => {
  it("⛔ production sans fond de carte : « carte indisponible », et AUCUNE requête de points n'est lancée", () => {
    const load = vi.fn(async () => OK);
    const { container } = rendre(<VenueMapLoader query="" ar={false} tiles={null} load={load} loadCanvas={chargerFauxCanevas} />);
    expect(container.querySelector(".map-panel-title")?.textContent).toBe(message("fr", "map.unavailableTitle"));
    expect(container.querySelector(".map-panel-body")?.textContent).toBe(message("fr", "map.unavailableBody"));
    expect(load.mock.calls).toHaveLength(0);
    expect(screen.queryByTestId("canevas")).toBeNull();
  });
});

describe("VenueMapLoader — le chargement des points", () => {
  it("demande les points de LA requête reçue, puis rend la carte", async () => {
    const load = vi.fn(async () => OK);
    rendre(<VenueMapLoader query="cityId=abc&guests=120" ar={false} tiles={TUILES} load={load} loadCanvas={chargerFauxCanevas} />);
    expect(screen.getByRole("status").textContent).toBe(message("fr", "map.loading"));
    await screen.findByTestId("canevas");
    expect(load.mock.calls).toHaveLength(1);
    expect((load.mock.calls[0] as unknown as [URLSearchParams])[0].toString()).toBe("cityId=abc&guests=120");
  });

  it("⛔ la route de points ne répond pas : un message et « Réessayer » — ni page blanche, ni « aucune salle »", async () => {
    const load = vi.fn<() => Promise<VenueMapOutcome>>().mockResolvedValueOnce(PANNE).mockResolvedValueOnce(OK);
    const { container } = rendre(<VenueMapLoader query="" ar={false} tiles={TUILES} load={load} loadCanvas={chargerFauxCanevas} />);
    const alerte = await screen.findByRole("alert");
    expect(alerte.querySelector("h2")?.textContent).toBe(message("fr", "map.pointsErrorTitle"));
    expect(container.textContent).not.toContain(message("fr", "map.empty"));
    expect(screen.queryByTestId("canevas")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: message("fr", "map.retry") }));
    await screen.findByTestId("canevas");
    expect(load.mock.calls).toHaveLength(2);
  });

  it("quand la requête change (l'assistant a poussé une adresse), les points sont REDEMANDÉS pour la nouvelle", async () => {
    const load = vi.fn(async () => OK);
    const vue = rendre(<VenueMapLoader query="guests=100" ar={false} tiles={TUILES} load={load} loadCanvas={chargerFauxCanevas} />);
    await screen.findByTestId("canevas");
    vue.rerender(
      // Même enveloppe : `rendre` a posé le fournisseur de messages, `rerender` doit le reposer.
      enveloppe(<VenueMapLoader query="guests=300" ar={false} tiles={TUILES} load={load} loadCanvas={chargerFauxCanevas} />)
    );
    await waitFor(() => expect(load.mock.calls).toHaveLength(2));
    expect((load.mock.calls[1] as unknown as [URLSearchParams])[0].toString()).toBe("guests=300");
  });

  it("⛔ une réponse ANCIENNE arrivée après la nouvelle ne l'écrase pas", async () => {
    const ancienne = differee<VenueMapOutcome>();
    const nouvelle = differee<VenueMapOutcome>();
    const load = vi
      .fn<() => Promise<VenueMapOutcome>>()
      .mockReturnValueOnce(ancienne.promesse)
      .mockReturnValueOnce(nouvelle.promesse);
    const vue = rendre(<VenueMapLoader query="guests=100" ar={false} tiles={TUILES} load={load} loadCanvas={chargerFauxCanevas} />);
    vue.rerender(enveloppe(<VenueMapLoader query="guests=300" ar={false} tiles={TUILES} load={load} loadCanvas={chargerFauxCanevas} />));
    nouvelle.resoudre({ kind: "ok", data: reponse([point(7)]) });
    await screen.findByRole("button", { name: "Salle 7" });
    ancienne.resoudre({ kind: "ok", data: reponse([point(1), point(2)]) });
    // On laisse à l'ancienne réponse le temps d'être (à tort) appliquée, puis on regarde ce qui est à l'écran.
    await Promise.resolve();
    await Promise.resolve();
    expect(screen.queryByRole("button", { name: "Salle 1" })).toBeNull();
    expect(screen.getByRole("button", { name: "Salle 7" }).textContent).toBe("Salle 7");
  });
});
