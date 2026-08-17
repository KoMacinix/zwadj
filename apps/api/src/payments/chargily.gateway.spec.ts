// Adaptateur Chargily — Phase 7, lot E3b (Chargily).
//
// ⚠ AUCUNE VALEUR ATTENDUE N'EST ÉCRITE ICI À LA MAIN. Toutes se RELÈVENT des
// deux captures réelles du bac à sable versionnées dans `__fixtures__/` :
//   · `chargily-checkout-created.json`  — POST /checkouts, HTTP 200, mode test,
//     corps envoyé `{"amount":5000,"currency":"dzd","success_url":"…"}` ;
//   · `chargily-error-amount-below-minimum.json` — même route, `{"amount":1}`.
// C'est la règle 2 de D126. Un test qui recopie « 5000 » de mémoire prouve que
// le test et le code partagent la même croyance, pas qu'ils ont raison.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChargilyGateway, type ChargilyConfig } from "./chargily.gateway";
import type { CheckoutRequest } from "./payment.types";

const FIXTURES = join(__dirname, "__fixtures__");
const lire = (nom: string): Record<string, unknown> =>
  JSON.parse(readFileSync(join(FIXTURES, nom), "utf8")) as Record<string, unknown>;

const CHECKOUT_CREE = lire("chargily-checkout-created.json");
const ERREUR_MONTANT = lire("chargily-error-amount-below-minimum.json");

// ⚠ Le montant en DINARS attendu par Chargily se relève de la capture, et le
// montant en CENTIMES que notre système lui ferait correspondre s'en déduit —
// dans ce sens-là, jamais l'inverse.
const MONTANT_DINARS_CAPTURE = CHECKOUT_CREE.amount as number;
const MONTANT_CENTIMES = MONTANT_DINARS_CAPTURE * 100;
const DEVISE_CAPTURE = CHECKOUT_CREE.currency as string;

const CONFIG: ChargilyConfig = {
  baseUrl: "https://pay.chargily.net/test/api/v2",
  secretKey: "test_sk_JETON_DE_TEST_SANS_VALEUR",
  timeoutMs: 10_000
};

const DEMANDE: CheckoutRequest = {
  paymentId: "0199aa00-0000-7000-8000-000000000001",
  amountCents: MONTANT_CENTIMES,
  currency: "DZD",
  successUrl: "https://zwadj.dz/paiement/retour?issue=succes",
  failureUrl: "https://zwadj.dz/paiement/retour?issue=echec"
};

function reponse(corps: unknown, init: { ok: boolean; status: number }): Response {
  const texte = JSON.stringify(corps);
  return {
    ok: init.ok,
    status: init.status,
    json: async () => JSON.parse(texte) as unknown,
    text: async () => texte
  } as Response;
}

let fetchEspion: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchEspion = vi.fn();
  vi.stubGlobal("fetch", fetchEspion);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function corpsEnvoye(): Record<string, unknown> {
  const [, init] = fetchEspion.mock.calls[0] as [string, RequestInit];
  return JSON.parse(init.body as string) as Record<string, unknown>;
}

describe("Conversion du montant — centimes → dinars", () => {
  it("⚠ envoie des DINARS : le montant de la capture, pas nos centimes", async () => {
    fetchEspion.mockResolvedValue(reponse(CHECKOUT_CREE, { ok: true, status: 200 }));
    await new ChargilyGateway(CONFIG).createCheckout(DEMANDE);

    // La valeur attendue VIENT de la capture. Si Chargily comptait en centimes,
    // cette égalité serait fausse — et c'est exactement le défaut à 100× qui
    // partait sinon en production sans qu'aucune porte ne rougisse.
    expect(corpsEnvoye().amount).toBe(MONTANT_DINARS_CAPTURE);
    expect(corpsEnvoye().amount).not.toBe(DEMANDE.amountCents);
  });

  it("REFUSE un montant qui n'est pas un dinar entier — il ne l'arrondit pas", async () => {
    fetchEspion.mockResolvedValue(reponse(CHECKOUT_CREE, { ok: true, status: 200 }));
    const gateway = new ChargilyGateway(CONFIG);

    await expect(gateway.createCheckout({ ...DEMANDE, amountCents: MONTANT_CENTIMES + 1 })).rejects.toMatchObject({
      response: { code: "PAYMENT_AMOUNT_NOT_WHOLE_DINAR" }
    });
    // ⚠ ET SURTOUT : aucun appel n'est parti. Arrondir aurait ouvert une session
    // pour un montant que personne n'a décidé (D188).
    expect(fetchEspion).not.toHaveBeenCalled();
  });

  it("⚠ ne recopie PAS le minimum de 50 DA du fournisseur : il laisse Chargily refuser", async () => {
    // D55 — dupliquer une borne du fournisseur, c'est promettre de la maintenir.
    fetchEspion.mockResolvedValue(reponse(ERREUR_MONTANT, { ok: false, status: 422 }));
    await expect(new ChargilyGateway(CONFIG).createCheckout({ ...DEMANDE, amountCents: 100 })).rejects.toMatchObject(
      { response: { code: "PAYMENT_PROVIDER_REFUSED" } }
    );
    // L'appel EST parti : c'est le fournisseur qui tranche ses bornes, pas nous.
    expect(fetchEspion).toHaveBeenCalledTimes(1);
    expect(corpsEnvoye().amount).toBe(1);
  });
});

describe("Corps de la requête", () => {
  beforeEach(() => {
    fetchEspion.mockResolvedValue(reponse(CHECKOUT_CREE, { ok: true, status: 200 }));
  });

  it("met la devise en MINUSCULE, comme la capture", async () => {
    await new ChargilyGateway(CONFIG).createCheckout(DEMANDE);
    expect(corpsEnvoye().currency).toBe(DEVISE_CAPTURE);
    expect(DEMANDE.currency).not.toBe(DEVISE_CAPTURE); // la conversion existe bien
  });

  it("envoie les DEUX URL de retour (§5.2 du cadrage)", async () => {
    await new ChargilyGateway(CONFIG).createCheckout(DEMANDE);
    expect(corpsEnvoye()).toMatchObject({
      success_url: DEMANDE.successUrl,
      failure_url: DEMANDE.failureUrl
    });
  });

  it("porte la clé en Bearer et un signal d'abandon — sans délai, une panne se propage", async () => {
    await new ChargilyGateway(CONFIG).createCheckout(DEMANDE);
    const [url, init] = fetchEspion.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${CONFIG.baseUrl}/checkouts`);
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${CONFIG.secretKey}`);
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("⚠ ne transmet PAS notre paymentId : `metadata` n'a jamais été vu revenir", async () => {
    await new ChargilyGateway(CONFIG).createCheckout(DEMANDE);
    expect(JSON.stringify(corpsEnvoye())).not.toContain(DEMANDE.paymentId);
  });
});

describe("Lecture de la réponse", () => {
  it("rend l'identifiant et l'URL DE LA CAPTURE, sans les toucher", async () => {
    fetchEspion.mockResolvedValue(reponse(CHECKOUT_CREE, { ok: true, status: 200 }));
    const session = await new ChargilyGateway(CONFIG).createCheckout(DEMANDE);

    expect(session).toEqual({
      providerCheckoutId: CHECKOUT_CREE.id,
      redirectUrl: CHECKOUT_CREE.checkout_url
    });
  });

  it("⚠ NE RÉÉCRIT PAS l'URL en https, alors que la capture est en clair", async () => {
    fetchEspion.mockResolvedValue(reponse(CHECKOUT_CREE, { ok: true, status: 200 }));
    const session = await new ChargilyGateway(CONFIG).createCheckout(DEMANDE);

    // Ce test fige une DÉCISION, pas une préférence : réécrire, c'est décider à
    // la place du fournisseur. Le jour où l'URL passera en https côté Chargily,
    // ce test rougira — et ce sera la bonne conversation à avoir.
    expect(String(CHECKOUT_CREE.checkout_url).startsWith("http://")).toBe(true);
    expect(session.redirectUrl).toBe(CHECKOUT_CREE.checkout_url);
  });

  it("refuse un 200 dont l'identifiant manque — plutôt que de persister `undefined`", async () => {
    // ⚠ On RETIRE le champ de la capture réelle plutôt que d'écrire une réponse
    // minimale à la main : ce qui est testé est bien « la vraie forme, moins ce
    // champ », pas un objet de mon invention qui n'aurait jamais existé.
    const sansId = { ...CHECKOUT_CREE };
    delete sansId.id;
    fetchEspion.mockResolvedValue(reponse(sansId, { ok: true, status: 200 }));

    await expect(new ChargilyGateway(CONFIG).createCheckout(DEMANDE)).rejects.toMatchObject({
      response: { code: "PAYMENT_PROVIDER_MALFORMED" }
    });
  });

  it("refuse un 200 dont l'URL de règlement manque", async () => {
    const sansUrl = { ...CHECKOUT_CREE };
    delete sansUrl.checkout_url;
    fetchEspion.mockResolvedValue(reponse(sansUrl, { ok: true, status: 200 }));

    await expect(new ChargilyGateway(CONFIG).createCheckout(DEMANDE)).rejects.toMatchObject({
      response: { code: "PAYMENT_PROVIDER_MALFORMED" }
    });
  });
});

describe("Modes de défaillance de l'appel sortant (E3a, rouverte)", () => {
  it("réseau injoignable ⇒ 503, et AUCUNE seconde tentative", async () => {
    fetchEspion.mockRejectedValue(new TypeError("fetch failed"));

    await expect(new ChargilyGateway(CONFIG).createCheckout(DEMANDE)).rejects.toMatchObject({
      response: { code: "PAYMENT_PROVIDER_UNREACHABLE" }
    });
    // ⚠ LA MESURE ANTI-DOUBLE-CHECKOUT. Un délai expire APRÈS l'envoi : la
    // session existe peut-être. Réessayer en aveugle en créerait une seconde.
    expect(fetchEspion).toHaveBeenCalledTimes(1);
  });

  it("délai dépassé ⇒ 503, une seule tentative elle aussi", async () => {
    const abandon = new Error("The operation was aborted due to timeout");
    abandon.name = "TimeoutError";
    fetchEspion.mockRejectedValue(abandon);

    await expect(new ChargilyGateway(CONFIG).createCheckout(DEMANDE)).rejects.toMatchObject({
      response: { code: "PAYMENT_PROVIDER_UNREACHABLE" }
    });
    expect(fetchEspion).toHaveBeenCalledTimes(1);
  });

  it("refus du fournisseur ⇒ 502, distinct de l'injoignable", async () => {
    fetchEspion.mockResolvedValue(reponse(ERREUR_MONTANT, { ok: false, status: 422 }));

    await expect(new ChargilyGateway(CONFIG).createCheckout(DEMANDE)).rejects.toMatchObject({
      response: { code: "PAYMENT_PROVIDER_REFUSED" }
    });
  });

  it("⚠ le message anglais du fournisseur ne remonte PAS au client", async () => {
    fetchEspion.mockResolvedValue(reponse(ERREUR_MONTANT, { ok: false, status: 422 }));
    const messageFournisseur = ERREUR_MONTANT.message as string;

    await new ChargilyGateway(CONFIG).createCheckout(DEMANDE).then(
      () => expect.unreachable("aurait dû refuser"),
      (erreur: { response: unknown }) => {
        // Il est journalisé pour le diagnostic, jamais renvoyé : il est en
        // anglais, non traduit, et décrit NOTRE requête.
        expect(JSON.stringify(erreur.response)).not.toContain(messageFournisseur);
        expect(erreur.response).toMatchObject({ message: "payment.errors.providerRefused" });
      }
    );
  });

  it("⚠ la clé secrète n'apparaît dans AUCUNE erreur levée", async () => {
    fetchEspion.mockRejectedValue(new TypeError("fetch failed"));

    await new ChargilyGateway(CONFIG).createCheckout(DEMANDE).then(
      () => expect.unreachable("aurait dû refuser"),
      (erreur: unknown) => {
        expect(JSON.stringify(erreur)).not.toContain(CONFIG.secretKey);
      }
    );
  });

  it("corps d'erreur illisible ⇒ refus quand même, jamais une session inventée", async () => {
    fetchEspion.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "<html>502 Bad Gateway</html>",
      json: async () => {
        throw new Error("pas du JSON");
      }
    } as unknown as Response);

    await expect(new ChargilyGateway(CONFIG).createCheckout(DEMANDE)).rejects.toMatchObject({
      response: { code: "PAYMENT_PROVIDER_REFUSED" }
    });
  });
});
