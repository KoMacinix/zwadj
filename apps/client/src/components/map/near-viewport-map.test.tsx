// Carte — lot CA-3 (session « carte »). L'accueil : la carte se monte quand sa section APPROCHE de l'écran (R-9).
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import type { VenueMapOutcome } from "../../lib/api";
import { NEAR_VIEWPORT_MARGIN, NearViewportMap } from "./near-viewport-map";
import { TUILES, chargerFauxCanevas, message, point, rendre, reponse } from "./map-test-support";

vi.mock("../../i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}));

const OK: VenueMapOutcome = { kind: "ok", data: reponse([point(1), point(2)]) };

/** Un `IntersectionObserver` que le test commande : jsdom n'en a pas, et n'a aucune mise en page à observer. */
class FauxObservateur {
  static instances: FauxObservateur[] = [];
  observes: Element[] = [];
  debranche = false;
  constructor(
    private readonly rappel: (entries: { isIntersecting: boolean }[]) => void,
    readonly options?: { rootMargin?: string }
  ) {
    FauxObservateur.instances.push(this);
  }
  observe(element: Element) {
    this.observes.push(element);
  }
  disconnect() {
    this.debranche = true;
  }
  /** La section entre (ou non) dans la marge de l'écran. */
  signaler(isIntersecting: boolean) {
    act(() => this.rappel([{ isIntersecting }]));
  }
}

const poser = (props: Partial<Parameters<typeof NearViewportMap>[0]> = {}) => {
  const load = vi.fn(async () => OK);
  const vue = rendre(<NearViewportMap query="" ar={false} tiles={TUILES} load={load} loadCanvas={chargerFauxCanevas} {...props} />);
  return { load, ...vue };
};

afterEach(() => {
  FauxObservateur.instances = [];
  vi.unstubAllGlobals();
});

describe("NearViewportMap — avec un observateur", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", FauxObservateur);
  });

  it("⛔ au chargement de la page : RIEN n'est demandé — ni points, ni carte (R-9)", () => {
    const { load } = poser();
    expect(load.mock.calls).toHaveLength(0);
    expect(screen.queryAllByTestId("canevas")).toHaveLength(0);
    expect(document.querySelector(".map-panel-body")?.textContent).toBe(message("fr", "map.home.waiting"));
  });

  it("la section est observée, avec la marge déclarée", () => {
    poser();
    expect(FauxObservateur.instances).toHaveLength(1);
    const observateur = FauxObservateur.instances[0] as FauxObservateur;
    expect(observateur.observes).toHaveLength(1);
    expect(observateur.options?.rootMargin).toBe(NEAR_VIEWPORT_MARGIN);
  });

  it("un signal « hors de la marge » ne monte rien", () => {
    const { load } = poser();
    (FauxObservateur.instances[0] as FauxObservateur).signaler(false);
    expect(load.mock.calls).toHaveLength(0);
  });

  it("⛔ quand la section approche : les points de TOUTES les salles publiques sont demandés, la carte se monte, et l'observateur est débranché", async () => {
    const { load } = poser();
    const observateur = FauxObservateur.instances[0] as FauxObservateur;
    observateur.signaler(true);
    // Assertion NATIVE d'abord : si rien ne se monte, c'est elle qui échoue (et non une requête qui ne trouve rien).
    await waitFor(() => expect(load.mock.calls).toHaveLength(1));
    await screen.findByTestId("canevas");
    expect((load.mock.calls[0] as unknown as [URLSearchParams])[0].toString()).toBe("");
    expect(observateur.debranche).toBe(true);
  });

  it("le bouton « Afficher la carte » la monte sans attendre le défilement", async () => {
    const { load } = poser();
    fireEvent.click(screen.getByRole("button", { name: message("fr", "map.home.show") }));
    await waitFor(() => expect(load.mock.calls).toHaveLength(1));
    await screen.findByTestId("canevas");
  });
});

describe("NearViewportMap — sans observateur, sans fond de carte", () => {
  it("navigateur sans `IntersectionObserver` : rien n'est chargé seul, un BOUTON monte la carte", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { load } = poser();
    expect(load.mock.calls).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: message("fr", "map.home.show") }));
    await waitFor(() => expect(load.mock.calls).toHaveLength(1));
    await screen.findByTestId("canevas");
  });

  it("⛔ pas de fond de carte : « carte indisponible » tout de suite, rien n'est observé ni demandé", () => {
    vi.stubGlobal("IntersectionObserver", FauxObservateur);
    const { load } = poser({ tiles: null });
    expect(document.querySelector(".map-panel-title")?.textContent).toBe(message("fr", "map.unavailableTitle"));
    expect(FauxObservateur.instances).toHaveLength(0);
    expect(load.mock.calls).toHaveLength(0);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
