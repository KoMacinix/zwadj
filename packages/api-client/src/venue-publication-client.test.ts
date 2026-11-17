// Le client de LECTURE du refus, côté PRO — ADM-1 (D349, rang 51, R-3, D-5 p2). Un client à part : `VenueCrudClient` n'est PAS étendu (ses doubles vivent dans `apps/pro`, D-lesson A5).
// L'adresse est relevée dans la source par `contract-api-client.int-spec.ts` (D182) : le littéral vit DANS l'appel à `request(...)`.
import { describe, expect, it } from "vitest";
import { createVenuePublicationClient } from "./venue-publication-client";
import type { AuthedRequest } from "./venue-client";

function double(reponse: unknown): { request: AuthedRequest; appels: { path: string; init: unknown }[] } {
  const appels: { path: string; init: unknown }[] = [];
  const request = (async (path: string, init?: unknown) => {
    appels.push({ path, init });
    return reponse;
  }) as AuthedRequest;
  return { request, appels };
}

const ID = "11111111-1111-4111-8111-111111111111";

describe("getPublicationReview — le pro lit l'état de publication de SA salle et, le cas échéant, son refus", () => {
  it("LIT `/pro/venues/:id/publication` (GET, aucun corps) et rend la réponse telle quelle", async () => {
    const dto = { publicationStatus: "DRAFT", rejection: { reason: "Photos floues", rejectedAt: "2026-11-10T09:30:00.000Z" } };
    const { request, appels } = double(dto);
    await expect(createVenuePublicationClient(request).getPublicationReview(ID)).resolves.toEqual(dto);
    expect(appels).toEqual([{ path: `/pro/venues/${ID}/publication`, init: undefined }]);
  });

  it("encode l'identifiant : un `/` ne sort pas de son segment", async () => {
    const { request, appels } = double({ publicationStatus: "DRAFT", rejection: null });
    await createVenuePublicationClient(request).getPublicationReview("a/b");
    expect(appels[0]?.path).toBe("/pro/venues/a%2Fb/publication");
  });
});
