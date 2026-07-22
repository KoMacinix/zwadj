// Lot A4 — construction PURE du Viewer360Data (D34), sans Nest ni Prisma :
// LA règle de scène d'ouverture vit ici et nulle part ailleurs — le pro (A6b)
// et le public (A8) consomment le même objet, aucun front ne la réimplémente.
import type { Viewer360Data } from "@zwadj/types";

export interface Viewer360SceneRow {
  id: string;
  storageKey: string;
  createdAt: Date;
}

export interface Viewer360LinkRow {
  photoAId: string;
  photoBId: string;
  yawA: number;
  pitchA: number;
  yawB: number;
  pitchB: number;
}

/**
 * D34 — scène d'ouverture = la plus ancienne par (createdAt, id). Le tiebreak
 * id est OBLIGATOIRE : deux scènes insérées dans la même milliseconde (insert
 * groupé) feraient sinon basculer l'ouverture d'une requête à l'autre — même
 * discipline que le tiebreak id de la pagination A3 (et l'id uuidv7 suit
 * l'ordre de création, le tiebreak reste donc fidèle à « la plus ancienne »).
 * Aucune scène ⇒ null (la salle n'a pas de tour, pas un tour vide).
 */
export function buildViewer360Data(
  scenes: Viewer360SceneRow[],
  links: Viewer360LinkRow[],
  urlOf: (key: string) => string
): Viewer360Data | null {
  if (scenes.length === 0) return null;
  const ordered = [...scenes].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  );
  const first = ordered[0];
  if (!first) return null; // inatteignable (length > 0) — satisfait noUncheckedIndexedAccess
  return {
    initialSceneId: first.id,
    scenes: ordered.map((s) => ({ id: s.id, url: urlOf(s.storageKey) })),
    links: links.map((l) => ({
      photoAId: l.photoAId,
      photoBId: l.photoBId,
      yawA: l.yawA,
      pitchA: l.pitchA,
      yawB: l.yawB,
      pitchB: l.pitchB
    }))
  };
}
