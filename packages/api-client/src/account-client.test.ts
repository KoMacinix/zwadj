// Rang 25 (D316), défaut 3 — le client qui LIT « aucune demande ».
//
// ⚠ Ce fichier n'existait pas : `account-client.ts` n'avait aucun test (D315),
// et son commentaire affirmait normaliser un corps vide que le transport, en
// amont, refusait déjà. Le double sert ici la forme EXACTE du fil — celle que
// `apps/api/test/int/account.int-spec.ts` exige de l'API : 200,
// `application/json`, corps `null`. Transport RÉEL (`createAuthClient`), seul
// `fetch` est simulé.
import { describe, expect, it, vi } from "vitest";
import type { DeletionRequestDTO } from "@zwadj/types";
import { createAccountClient } from "./account-client";
import { createAuthClient } from "./auth-client";

const BASE = "http://api.test";

function clientServant(corps: string | null, entetes: Record<string, string> = { "Content-Type": "application/json" }) {
  const impl = vi.fn(async () => new Response(corps, { status: 200, headers: entetes }));
  return createAccountClient(createAuthClient(BASE, impl as unknown as typeof fetch).authedRequest);
}

const DEMANDE: DeletionRequestDTO = {
  id: "01a0dfbf-f15d-7521-8532-0ff772300511",
  status: "PENDING",
  reason: null,
  requestedAt: "2026-09-26T22:04:53.466Z",
  decidedAt: null,
  decisionNote: null
};

describe("getDeletionRequest — les deux états NORMAUX d'un compte", () => {
  it("aucune demande : le JSON `null` du fil se lit `null`", async () => {
    await expect(clientServant("null").getDeletionRequest()).resolves.toBeNull();
  });

  it("une demande : le DTO se lit tel quel", async () => {
    await expect(clientServant(JSON.stringify(DEMANDE)).getDeletionRequest()).resolves.toEqual(DEMANDE);
  });

  it("calibration, bras négatif : l'ANCIEN fil — 200 sans corps — fait lever le transport (le défaut de D315)", async () => {
    // Le transport refuse délibérément un corps vide hors 204 (`raw`,
    // `auth-client.ts`). C'est pourquoi le correctif est côté API, et pas ici.
    await expect(clientServant("", {}).getDeletionRequest()).rejects.toThrow();
  });
});
