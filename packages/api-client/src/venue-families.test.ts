// ⛔ S9 — LES SIX FAMILLES DE `VenueProClient`, ET LEUR GARDE.
//
// ⚠ CE FICHIER EST LA SEULE CHOSE QUI EMPÊCHE LE FOURRE-TOUT DE REVENIR.
// Un découpage sans garde est une mise en ordre : la vingt-troisième méthode
// atterrira dans la première interface venue, personne ne le verra, et on aura
// refait `VenueProClient` en six mois — en six morceaux.
//
// Deux gardes, parce qu'elles n'attrapent pas la même faute :
//   · la garde de TYPE tombe si une INTERFACE gagne ou perd un membre sans que
//     sa famille soit mise à jour. Elle est portée par `tsc`, donc par la porte
//     `pnpm typecheck` — pas par ce fichier à l'exécution ;
//   · la garde d'EXÉCUTION tombe si L'IMPLÉMENTATION porte une clé qu'aucune
//     famille ne réclame. Un membre ajouté à l'objet sans interface passerait
//     la première sans broncher.
import { describe, expect, it } from "vitest";
import {
  createVenueProClient,
  type AuthedRequest,
  type VenueAvailabilityClient,
  type VenueCrudClient,
  type VenueMediaClient,
  type VenuePricingRuleClient,
  type VenueSlotTemplateClient,
  type VenueVisitClient
} from "./venue-client";

/** L'autorité des familles. ⚠ Écrite UNE fois, lue par les deux gardes : une
 *  seconde liste divergerait, et c'est précisément la faute qu'on répare. */
const FAMILLES = {
  crud: ["listMine", "getMine", "create", "update", "softDelete"],
  medias: ["updateVirtualTour", "addPhoto", "reorderPhotos", "updatePhotoAlt", "deletePhoto"],
  gabarits: ["createSlotTemplate", "updateSlotTemplate", "deleteSlotTemplate"],
  tarifs: ["createPricingRule", "updatePricingRule", "deletePricingRule"],
  disponibilite: ["listAvailabilityBlocks", "createAvailabilityBlock", "deleteAvailabilityBlock", "availability"],
  visites: ["listVisitBookings", "cancelVisitBooking"]
} as const;

/** `A` et `B` désignent-ils EXACTEMENT les mêmes clés ? Le double `[]` évite la
 *  distribution des unions, sans quoi la comparaison serait vraie membre à
 *  membre et fausse dans l'ensemble. */
type Exactement<A extends string, B extends string> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;

// ── GARDE DE TYPE. Ces six lignes ne s'exécutent pas : elles COMPILENT, ou la
//    porte `pnpm typecheck` devient rouge. Déplacer `addPhoto` de
//    `VenueMediaClient` vers `VenueCrudClient` les fait tomber toutes deux.
const _crud: Exactement<keyof VenueCrudClient & string, (typeof FAMILLES.crud)[number]> = true;
const _medias: Exactement<keyof VenueMediaClient & string, (typeof FAMILLES.medias)[number]> = true;
const _gabarits: Exactement<keyof VenueSlotTemplateClient & string, (typeof FAMILLES.gabarits)[number]> = true;
const _tarifs: Exactement<keyof VenuePricingRuleClient & string, (typeof FAMILLES.tarifs)[number]> = true;
const _dispo: Exactement<keyof VenueAvailabilityClient & string, (typeof FAMILLES.disponibilite)[number]> = true;
const _visites: Exactement<keyof VenueVisitClient & string, (typeof FAMILLES.visites)[number]> = true;

describe("⛔ S9 — les six familles, et rien de plus", () => {
  it("chaque famille garde EXACTEMENT sa taille", () => {
    // ⚠ Les tailles sont écrites en toutes lettres. C'est le seul endroit du
    // lot où un nombre est tapé à la main, et c'est voulu : une taille dérivée
    // de la liste qu'elle mesure ne mesurerait rien.
    expect(FAMILLES.crud).toHaveLength(5);
    expect(FAMILLES.medias).toHaveLength(5);
    expect(FAMILLES.gabarits).toHaveLength(3);
    expect(FAMILLES.tarifs).toHaveLength(3);
    expect(FAMILLES.disponibilite).toHaveLength(4);
    expect(FAMILLES.visites).toHaveLength(2);
    // ⚠ Les six lignes de TYPE ci-dessus sont référencées ici, sinon le lint
    // les tient pour du code mort et les supprime — emportant la garde avec.
    expect([_crud, _medias, _gabarits, _tarifs, _dispo, _visites]).toEqual([true, true, true, true, true, true]);
  });

  it("⛔ L'IMPLÉMENTATION ne porte AUCUNE clé hors famille", () => {
    // La requête ne part jamais : on n'appelle aucune méthode, on regarde les
    // CLÉS de l'objet construit.
    const requete: AuthedRequest = () => Promise.reject(new Error("aucun appel attendu"));
    const client = createVenueProClient(requete);

    const attendues = Object.values(FAMILLES).flatMap((f) => [...f]).sort();
    expect(Object.keys(client).sort()).toEqual(attendues);
    expect(attendues).toHaveLength(22);
  });
});
