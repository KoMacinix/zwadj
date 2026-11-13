// Carte — lot CA-2 (session « carte »). Les POINTS, ce qui est DIT autour, et la petite carte de la salle choisie.
import { fireEvent, screen, within } from "@testing-library/react";
import { formatDZD } from "@zwadj/i18n";
import { venuePath } from "../../lib/routes";
import { VenuePointsMap } from "./venue-points-map";
import { TUILES, chargerFauxCanevas, message, point, rendre, reponse } from "./map-test-support";

vi.mock("../../i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}));

/** Le texte d'un nœud, espaces insécables ramenés à des espaces : `formatDZD` en pose, le DOM les garde. */
const texte = (noeud: Element | null): string => (noeud?.textContent ?? "").replace(/[  ]/g, " ");
const net = (s: string): string => s.replace(/[  ]/g, " ");

const carte = (props: Partial<Parameters<typeof VenuePointsMap>[0]> = {}, locale: "fr" | "ar" = "fr") =>
  rendre(
    <VenuePointsMap
      response={reponse([point(1), point(2)])}
      tiles={TUILES}
      ar={locale === "ar"}
      loadCanvas={chargerFauxCanevas}
      {...props}
    />,
    locale
  );

describe("VenuePointsMap — ce que la carte reçoit", () => {
  it("UN point par salle de la réponse, à SA position et sous SON nom", async () => {
    const points = [point(1), point(2), point(3)];
    carte({ response: reponse(points) });
    const canevas = await screen.findByTestId("canevas");
    const boutons = within(canevas).getAllByRole("button", { pressed: false });
    expect(boutons.map((b) => b.textContent)).toEqual(points.map((p) => p.nameFr));
    expect(boutons.map((b) => Number(b.getAttribute("data-lat")))).toEqual(points.map((p) => p.lat));
    expect(boutons.map((b) => Number(b.getAttribute("data-lng")))).toEqual(points.map((p) => p.lng));
  });

  it("le fond de carte reçu est celui qu'on lui passe, et sa mention est AFFICHÉE, avec son lien", async () => {
    carte();
    expect((await screen.findByTestId("canevas")).getAttribute("data-tuiles")).toBe(TUILES.url);
    const lien = screen.getByRole("link", { name: TUILES.attribution });
    expect(lien.getAttribute("href")).toBe(TUILES.attributionUrl);
  });

  it("en arabe : les points portent le nom ARABE, et la carte sait que la page se lit de droite à gauche", async () => {
    const points = [point(1), point(2)];
    carte({ response: reponse(points) }, "ar");
    const canevas = await screen.findByTestId("canevas");
    expect(within(canevas).getAllByRole("button", { pressed: false }).map((b) => b.textContent)).toEqual(points.map((p) => p.nameAr));
    expect(canevas.getAttribute("data-rtl")).toBe("true");
  });
});

describe("VenuePointsMap — ce qui est DIT, pas seulement montré", () => {
  it("le nombre de salles sur la carte est celui des points", async () => {
    const { container } = carte({ response: reponse([point(1), point(2), point(3)]) });
    await screen.findByTestId("canevas");
    expect(container.querySelector(".map-view-count")?.textContent).toBe(message("fr", "map.count", { count: 3 }));
  });

  it("⛔ les salles SANS position sont comptées et dites ; à zéro, la phrase n'existe pas", async () => {
    const avec = carte({ response: reponse([point(1)], { total: 5, withoutCoordinates: 4 }) });
    await screen.findByTestId("canevas");
    expect(avec.container.textContent).toContain(message("fr", "map.withoutCoordinates", { count: 4 }));
    avec.unmount();

    const sans = carte({ response: reponse([point(1)], { withoutCoordinates: 0 }) });
    await screen.findByTestId("canevas");
    expect(sans.container.querySelectorAll(".map-view-note")).toHaveLength(0);
  });

  it("⛔ une carte TRONQUÉE le dit, avec le plafond ; non tronquée, elle ne dit rien", async () => {
    const tronquee = carte({ response: reponse([point(1)], { truncated: true, limit: 500 }) });
    await screen.findByTestId("canevas");
    expect(tronquee.container.textContent).toContain(message("fr", "map.truncated", { limit: 500 }));
    tronquee.unmount();

    const entiere = carte({ response: reponse([point(1)], { truncated: false }) });
    await screen.findByTestId("canevas");
    expect(entiere.container.textContent).not.toContain(message("fr", "map.truncated", { limit: 500 }));
  });

  it("⛔ AUCUN point : c'est dit, et la carte n'est PAS chargée (aucun fond de carte demandé pour ne rien montrer)", () => {
    const charger = vi.fn(chargerFauxCanevas);
    const { container } = carte({ response: reponse([], { total: 2, withoutCoordinates: 2 }), loadCanvas: charger });
    expect(container.querySelector(".map-view-empty")?.textContent).toBe(message("fr", "map.empty"));
    expect(container.textContent).toContain(message("fr", "map.withoutCoordinates", { count: 2 }));
    expect(charger.mock.calls).toHaveLength(0);
    expect(screen.queryByTestId("canevas")).toBeNull();
  });

  it("une réponse dont `points` n'est pas un tableau ne fait pas tomber l'écran (D120)", () => {
    const abimee = { ...reponse([]), points: null } as unknown as ReturnType<typeof reponse>;
    const { container } = carte({ response: abimee });
    expect(container.querySelector(".map-view-empty")?.textContent).toBe(message("fr", "map.empty"));
  });
});

describe("VenuePointsMap — la salle choisie", () => {
  it("aucune carte de salle tant qu'aucun point n'est choisi", async () => {
    const { container } = carte();
    await screen.findByTestId("canevas");
    expect(container.querySelectorAll(".map-venue-card")).toHaveLength(0);
  });

  it("⛔ choisir un point ouvre SA carte : nom, capacité, prix DU SERVEUR mis en forme, lien vers SA fiche", async () => {
    const points = [point(1), point(2)];
    const { container } = carte({ response: reponse(points) });
    const canevas = await screen.findByTestId("canevas");
    const choisie = points[1] as (typeof points)[number];
    fireEvent.click(within(canevas).getByRole("button", { name: choisie.nameFr }));

    const fiche = container.querySelector(".map-venue-card");
    expect(fiche?.querySelector(".map-venue-card-name")?.textContent).toBe(choisie.nameFr);
    expect(texte(fiche?.querySelector(".map-venue-card-meta") ?? null)).toBe(
      net(message("fr", "search.card.capacity", { max: choisie.capacityMax }))
    );
    // ⚠ L'attendu vient du FORMATEUR partagé appliqué aux centimes du serveur — aucun montant tapé, aucun calcul.
    expect(texte(fiche?.querySelector(".map-venue-card-price") ?? null)).toBe(
      net(`${message("fr", "search.card.from")}${formatDZD(choisie.basePriceCents, "fr")}`)
    );
    expect(fiche?.querySelector("a")?.getAttribute("href")).toBe(venuePath(choisie.slug));
    // Le point choisi est marqué sur la carte, et lui seul.
    expect(within(canevas).getAllByRole("button", { pressed: true }).map((b) => b.textContent)).toEqual([choisie.nameFr]);
  });

  it("choisir un AUTRE point remplace la carte (une seule à la fois), et le prix suit le point", async () => {
    const points = [point(1), point(2)];
    const { container } = carte({ response: reponse(points) });
    const canevas = await screen.findByTestId("canevas");
    fireEvent.click(within(canevas).getByRole("button", { name: "Salle 1" }));
    fireEvent.click(within(canevas).getByRole("button", { name: "Salle 2" }));
    expect(container.querySelectorAll(".map-venue-card")).toHaveLength(1);
    expect(texte(container.querySelector(".map-venue-card-price"))).toContain(net(formatDZD((points[1] as (typeof points)[number]).basePriceCents, "fr")));
    expect(texte(container.querySelector(".map-venue-card-price"))).not.toContain(net(formatDZD((points[0] as (typeof points)[number]).basePriceCents, "fr")));
  });

  it("« Fermer » retire la carte de salle et démarque le point", async () => {
    const { container } = carte();
    const canevas = await screen.findByTestId("canevas");
    fireEvent.click(within(canevas).getByRole("button", { name: "Salle 1" }));
    fireEvent.click(screen.getByRole("button", { name: message("fr", "map.card.close") }));
    expect(container.querySelectorAll(".map-venue-card")).toHaveLength(0);
    expect(within(canevas).queryAllByRole("button", { pressed: true })).toHaveLength(0);
  });

  it("en arabe : nom arabe, prix mis en forme pour l'arabe, même fiche", async () => {
    const points = [point(1)];
    const { container } = carte({ response: reponse(points) }, "ar");
    const canevas = await screen.findByTestId("canevas");
    const p = points[0] as (typeof points)[number];
    fireEvent.click(within(canevas).getByRole("button", { name: p.nameAr }));
    const fiche = container.querySelector(".map-venue-card");
    expect(fiche?.querySelector(".map-venue-card-name")?.textContent).toBe(p.nameAr);
    expect(texte(fiche?.querySelector(".map-venue-card-price") ?? null)).toContain(net(formatDZD(p.basePriceCents, "ar")));
    expect(fiche?.querySelector("a")?.getAttribute("href")).toBe(venuePath(p.slug));
  });

  it("une salle sans photo : la mention « photo à venir », pas une image cassée", async () => {
    const { container } = carte({ response: reponse([point(1, { coverThumbUrl: null })]) });
    const canevas = await screen.findByTestId("canevas");
    fireEvent.click(within(canevas).getByRole("button", { name: "Salle 1" }));
    expect(container.querySelectorAll(".map-venue-card img")).toHaveLength(0);
    expect(container.querySelector(".map-venue-card .venue-card-nophoto")?.textContent).toBe(message("fr", "search.card.noPhoto"));
  });
});

describe("VenuePointsMap — le fond de carte en panne", () => {
  it("⛔ une tuile en échec : un MESSAGE, et la carte comme ses points restent là", async () => {
    const { container } = carte();
    const canevas = await screen.findByTestId("canevas");
    expect(container.textContent).not.toContain(message("fr", "map.tilesError"));
    fireEvent.click(within(canevas).getByRole("button", { name: "(test) une tuile échoue" }));
    expect(screen.getByRole("alert").textContent).toBe(message("fr", "map.tilesError"));
    expect(within(canevas).getAllByRole("button", { pressed: false })).toHaveLength(2);
  });

  it("⛔ la bibliothèque de carte ne se charge pas : un message, pas un écran vide", async () => {
    carte({ loadCanvas: () => Promise.reject(new Error("réseau coupé")) });
    expect((await screen.findByRole("alert")).textContent).toBe(message("fr", "map.loadError"));
  });
});
