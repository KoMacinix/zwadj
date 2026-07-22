// Spec unitaire de buildViewer360Data (Lot A4, D34) — LA règle de scène
// d'ouverture, sa seule implémentation : tri (createdAt, id), tiebreak
// déterministe, null sans scène, URLs recalculées via le résolveur.
import { describe, expect, it } from "vitest";
import { buildViewer360Data } from "./viewer360";

const urlOf = (key: string): string => `/api/v1/media/${key}`;

const ID_1 = "018f0000-0000-7000-8000-000000000001";
const ID_2 = "018f0000-0000-7000-8000-000000000002";
const ID_3 = "018f0000-0000-7000-8000-000000000003";

function scene(id: string, createdAt: string, storageKey = `vs-${id}.webp`) {
  return { id, storageKey, createdAt: new Date(createdAt) };
}

describe("buildViewer360Data — scène d'ouverture (D34)", () => {
  it("aucune scène ⇒ null (pas de tour), même si des liaisons orphelines traînaient", () => {
    expect(buildViewer360Data([], [], urlOf)).toBeNull();
  });

  it("la plus ancienne par createdAt ouvre le tour, quel que soit l'ordre d'entrée", () => {
    const data = buildViewer360Data(
      [scene(ID_3, "2026-07-22T10:00:02.000Z"), scene(ID_1, "2026-07-22T10:00:00.000Z"), scene(ID_2, "2026-07-22T10:00:01.000Z")],
      [],
      urlOf
    );
    expect(data?.initialSceneId).toBe(ID_1);
    expect(data?.scenes.map((s) => s.id)).toEqual([ID_1, ID_2, ID_3]);
  });

  it("tiebreak DÉTERMINISTE : à createdAt STRICTEMENT égal, le plus petit id (uuidv7 ≈ plus ancien) gagne", () => {
    const t = "2026-07-22T10:00:00.000Z";
    const data = buildViewer360Data([scene(ID_2, t), scene(ID_1, t)], [], urlOf);
    expect(data?.initialSceneId).toBe(ID_1);
    expect(data?.scenes.map((s) => s.id)).toEqual([ID_1, ID_2]);
  });

  it("contrat lean 1:1 Pannellum : scènes {id, url} (URL recalculée, jamais de clé brute ni de vignette), liaisons copiées", () => {
    const link = { photoAId: ID_1, photoBId: ID_2, yawA: 12.5, pitchA: -3, yawB: -170, pitchB: 45 };
    const data = buildViewer360Data([scene(ID_1, "2026-07-22T10:00:00.000Z")], [link], urlOf);
    expect(data?.scenes).toEqual([{ id: ID_1, url: `/api/v1/media/vs-${ID_1}.webp` }]);
    expect(data?.links).toEqual([link]);
    // Pas de fuite de champs : exactement les trois clés du contrat.
    expect(Object.keys(data ?? {}).sort()).toEqual(["initialSceneId", "links", "scenes"]);
  });
});
