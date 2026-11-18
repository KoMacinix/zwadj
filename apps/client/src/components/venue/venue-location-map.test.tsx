// Carte — lot CA-4 (session « carte »). La position d'une salle sur sa fiche : au GESTE, un point, à SA position.
import { fireEvent, screen } from "@testing-library/react";
import { TUILES, chargerFauxCanevas, message, rendre } from "../map/map-test-support";
import { VenueLocationMap } from "./venue-location-map";

const poser = (props: Partial<Parameters<typeof VenueLocationMap>[0]> = {}, locale: "fr" | "ar" = "fr") => {
  const charger = vi.fn(chargerFauxCanevas);
  const vue = rendre(
    <VenueLocationMap lat={36.745312} lng={3.031987} name="Salle El Ryad" ar={locale === "ar"} tiles={TUILES} loadCanvas={charger} {...props} />,
    locale
  );
  return { charger, ...vue };
};

describe("VenueLocationMap — la carte de la fiche", () => {
  it("⛔ à l'ouverture de la fiche : un bouton et l'annonce du service externe — AUCUNE carte n'est chargée (R-9)", () => {
    const { charger, container } = poser();
    expect(charger.mock.calls).toHaveLength(0);
    expect(screen.queryAllByTestId("canevas")).toHaveLength(0);
    expect(Array.from(container.querySelectorAll("button")).map((b) => b.textContent)).toEqual([message("fr", "map.venue.show")]);
    expect(container.querySelector(".venue-location-note")?.textContent).toBe(message("fr", "map.venue.notice"));
  });

  it("⛔ le geste monte la carte : UN point, à la position de la salle, sous SON nom ; la carte est nommée d'après elle", async () => {
    const { container } = poser();
    fireEvent.click(screen.getByRole("button", { name: message("fr", "map.venue.show") }));
    const canevas = await screen.findByTestId("canevas");
    const points = Array.from(canevas.querySelectorAll("button[data-lat]"));
    expect(points.map((p) => [p.textContent, p.getAttribute("data-lat"), p.getAttribute("data-lng")])).toEqual([
      ["Salle El Ryad", "36.745312", "3.031987"]
    ]);
    expect(canevas.getAttribute("aria-label")).toBe(message("fr", "map.venue.region", { name: "Salle El Ryad" }));
    // Le bouton a cédé la place : on ne redemande pas une carte déjà là.
    expect(Array.from(container.querySelectorAll(".venue-location-ask"))).toHaveLength(0);
  });

  it("en arabe : le libellé du bouton, et la carte sait que la page se lit de droite à gauche", async () => {
    poser({ name: "قاعة الرياض" }, "ar");
    fireEvent.click(screen.getByRole("button", { name: message("ar", "map.venue.show") }));
    const canevas = await screen.findByTestId("canevas");
    expect(canevas.getAttribute("data-rtl")).toBe("true");
    expect(canevas.getAttribute("aria-label")).toBe(message("ar", "map.venue.region", { name: "قاعة الرياض" }));
  });

  it("⛔ pas de fond de carte : c'est dit en une ligne, et il n'y a PAS de bouton", () => {
    const { charger, container } = poser({ tiles: null });
    expect(container.querySelector(".venue-location-note")?.textContent).toBe(message("fr", "map.unavailableTitle"));
    expect(container.querySelectorAll("button")).toHaveLength(0);
    expect(charger.mock.calls).toHaveLength(0);
  });
});
