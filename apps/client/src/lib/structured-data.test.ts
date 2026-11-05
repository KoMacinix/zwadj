// FC-10 (session `front-client`) — LES DONNÉES STRUCTURÉES D'UNE FICHE (schema.org `EventVenue`) : ce qu'elles disent, dans la
// langue de la page, et ce qu'elles ne peuvent PAS faire — fermer leur balise.
// ⚠ Les attendus viennent de la FIXTURE (le DTO du serveur), jamais d'une chaîne tapée qui ne la reprendrait pas.
// ⚠ Les fonctions sont lues PAR LEUR NOM : absentes (avant FC-10), le rouge se lit en ASSERTION (D304).
import type { VenuePublicDTO } from "@zwadj/types";
import * as module from "./seo";

type Fabrique = (v: VenuePublicDTO, locale: string, url: string, absolu: (c: string) => string) => Record<string, unknown>;
const venueStructuredData = (module as Record<string, unknown>).venueStructuredData as Fabrique | undefined;
const jsonLdScript = (module as Record<string, unknown>).jsonLdScript as ((d: unknown) => string) | undefined;

const SALLE = {
  id: "v1",
  slug: "salle-el-ryad",
  nameFr: "Salle El Ryad",
  nameAr: "قاعة الرياض",
  taglineFr: "Au bord de la mer",
  taglineAr: "على شاطئ البحر",
  descriptionFr: null,
  descriptionAr: null,
  districtFr: "Bab Ezzouar",
  districtAr: "باب الزوار",
  address: "12 rue des Oliviers",
  lat: 36.72,
  lng: 3.18,
  capacityMax: 450,
  basePriceCents: 25_000_000,
  city: { id: "c1", nameFr: "Alger", nameAr: "الجزائر" },
  photos: [{ id: "p1", url: "/media/p1.webp", thumbUrl: "/media/p1-t.webp", width: 1600, height: 900, altFr: null, altAr: null }]
} as unknown as VenuePublicDTO;

const URL_FICHE = "https://zwadj.dz/fr/salles/salle-el-ryad";
const absolu = (c: string) => `https://zwadj.dz${c}`;

describe("FC-10 — les fonctions existent", () => {
  it("`venueStructuredData` et `jsonLdScript`", () => {
    expect(typeof venueStructuredData).toBe("function");
    expect(typeof jsonLdScript).toBe("function");
  });
});

describe("FC-10 — une fiche se décrit en `EventVenue`, dans la langue de la page", () => {
  it("français : nom, accroche, adresse, capacité, photo absolue, position, URL canonique", () => {
    const d = venueStructuredData?.(SALLE, "fr", URL_FICHE, absolu);
    expect(d).toEqual({
      "@context": "https://schema.org",
      "@type": "EventVenue",
      name: SALLE.nameFr,
      url: URL_FICHE,
      description: SALLE.taglineFr,
      maximumAttendeeCapacity: SALLE.capacityMax,
      address: { "@type": "PostalAddress", streetAddress: `${SALLE.address}, ${SALLE.districtFr}`, addressLocality: SALLE.city.nameFr, addressCountry: "DZ" },
      image: [absolu(SALLE.photos[0]!.url)],
      geo: { "@type": "GeoCoordinates", latitude: SALLE.lat, longitude: SALLE.lng }
    });
  });

  it("arabe : les champs ARABES — jamais le français en repli silencieux", () => {
    const d = venueStructuredData?.(SALLE, "ar", URL_FICHE, absolu);
    expect(d?.name).toBe(SALLE.nameAr);
    expect(d?.description).toBe(SALLE.taglineAr);
    expect((d?.address as Record<string, unknown> | undefined)?.addressLocality).toBe(SALLE.city.nameAr);
    expect((d?.address as Record<string, unknown> | undefined)?.streetAddress).toBe(`${SALLE.address}, ${SALLE.districtAr}`);
  });

  it("⛔ AUCUN prix : le serveur rend des centimes, pas un prix tel quel", () => {
    const texte = JSON.stringify(venueStructuredData?.(SALLE, "fr", URL_FICHE, absolu) ?? {});
    expect(/price|offers/i.test(texte)).toBe(false);
    expect(texte.includes(String(SALLE.basePriceCents))).toBe(false);
  });

  it("un champ absent n'est pas inventé : ni accroche, ni rue, ni photo, ni position", () => {
    const nue = { ...SALLE, taglineFr: null, address: null, districtFr: null, lat: null, lng: null, photos: [] } as unknown as VenuePublicDTO;
    const d = venueStructuredData?.(nue, "fr", URL_FICHE, absolu);
    expect(d && "description" in d).toBe(false);
    expect(d && "image" in d).toBe(false);
    expect(d && "geo" in d).toBe(false);
    expect(d?.address).toEqual({ "@type": "PostalAddress", addressLocality: SALLE.city.nameFr, addressCountry: "DZ" });
  });
});

describe("FC-10 — ⛔ le JSON-LD ne peut pas fermer sa balise (les textes viennent du pro)", () => {
  it("un nom qui contient `</script>` sort échappé, et le JSON relu est IDENTIQUE", () => {
    const piege = { ...SALLE, nameFr: 'Salle</script><script>alert("x")</script> & co\u2028' } as unknown as VenuePublicDTO;
    const donnees = venueStructuredData?.(piege, "fr", URL_FICHE, absolu);
    const texte = jsonLdScript?.(donnees) ?? "";
    // Un texte VIDE se dit en assertion (sans quoi `JSON.parse("")` planterait plus bas, D304).
    expect(texte.length > 0).toBe(true);
    expect(texte.includes("<")).toBe(false);
    expect(texte.includes(">")).toBe(false);
    expect(texte.includes("&")).toBe(false);
    expect(texte.includes("\u2028")).toBe(false);
    expect(JSON.parse(texte)).toEqual(donnees);
  });
});
