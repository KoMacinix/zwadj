import { expect, test } from "@playwright/test";
import { CLIENT } from "../playwright.config";
import { apiCall, createPublishedVenue, seedReferentials } from "../fixtures/harness";

/**
 * FC-10 (session `front-client`) — LA FICHE D'UNE SALLE PORTE SES DONNÉES STRUCTURÉES (schema.org `EventVenue`) DANS LE HTML
 * SERVI, sans JavaScript.
 *
 * ⚠ CE QUE LE TEST UNITAIRE NE VOIT PAS (D205) : la fonction pure `venueStructuredData` est mesurée seule ; ici, c'est la PAGE
 * — un composant serveur — qui l'insère, dans la réponse HTTP elle-même, celle que lit un robot qui n'exécute pas de script.
 * ⚠ Joué en FRANÇAIS ET EN ARABE : le nom vient du champ de la langue de la PAGE.
 * ⚠ Le corps est lu en TEXTE (`request.get`), pas dans un navigateur : c'est le document servi qu'on mesure.
 */
/** La salle telle que le SERVEUR la rend (`GET /venues/:slug`) — l'autorité des attendus, jamais une valeur recopiée. */
let salle: { slug: string; nameFr: string; nameAr: string; capacityMax: number } = { slug: "", nameFr: "", nameAr: "", capacityMax: 0 };

test.beforeAll(async () => {
  seedReferentials();
  const { slug } = await createPublishedVenue();
  const detail = await apiCall("GET", `/venues/${slug}`);
  if (detail.status !== 200) throw new Error(`GET /venues/${slug} : ${detail.status} ${detail.text}`);
  const dto = detail.json as { nameFr: string; nameAr: string; capacityMax: number };
  salle = { slug, nameFr: dto.nameFr, nameAr: dto.nameAr, capacityMax: dto.capacityMax };
});

/** Les objets JSON-LD d'un document HTML, relus par `JSON.parse` (un échappement faux lèverait ici). */
function jsonLd(html: string): Array<Record<string, unknown>> {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
    (m) => JSON.parse(m[1] ?? "null") as Record<string, unknown>
  );
}

for (const langue of ["fr", "ar"] as const) {
  test(`${langue} — le HTML servi de la fiche porte un EventVenue au nom de la salle, dans la langue de la page`, async ({ request }) => {
    const reponse = await request.get(`${CLIENT}/${langue}/salles/${salle.slug}`);
    expect(reponse.status()).toBe(200);
    const lieux = jsonLd(await reponse.text()).filter((o) => o["@type"] === "EventVenue");
    expect(lieux.length).toBe(1);
    const lieu = lieux[0]!;
    expect(lieu.name).toBe(langue === "ar" ? salle.nameAr : salle.nameFr);
    expect(lieu.maximumAttendeeCapacity).toBe(salle.capacityMax);
    expect(String(lieu.url).endsWith(`/${langue}/salles/${salle.slug}`)).toBe(true);
    expect(JSON.stringify(lieu).includes("price")).toBe(false);
  });
}
