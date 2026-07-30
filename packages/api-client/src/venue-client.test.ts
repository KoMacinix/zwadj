// Tests du client venue (Lot A5). Le point sensible de la tranche n'est pas le
// câblage des méthodes mais le PARTAGE du mutex de refresh : le domaine venue
// passe par `authedRequest`, donc il doit hériter du single-flight du client
// auth (l'API traite un refresh concurrent du même token comme une
// réutilisation — D10 — et révoque tout). Deux tests le prouvent : venue seul,
// puis venue ET auth mélangés.
import { describe, expect, it, vi } from "vitest";
import { ApiError, NetworkError, createAuthClient } from "./auth-client";
import { createReferentialsClient, createVenueProClient } from "./venue-client";

const BASE = "http://api.test";

type Reply = { status: number; body?: unknown };
type Route = (init: RequestInit | undefined, url: string) => Reply | Promise<Reply>;

function makeFetch(routes: Record<string, Route>) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const impl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    const path = url.replace(`${BASE}/api/v1`, "");
    const route = routes[`${init?.method ?? "GET"} ${path}`];
    if (!route) throw new Error(`Route non simulée : ${init?.method ?? "GET"} ${path}`);
    const { status, body } = await route(init, url);
    // 204 : un vrai corps VIDE (pas "undefined" sérialisé) — c'est exactement
    // ce que renvoie DELETE /venues/:id, et ce que le client doit tolérer.
    if (status === 204) return new Response(null, { status });
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  });
  return { impl: impl as unknown as typeof fetch, calls };
}

const USER = {
  id: "u1",
  email: "contact@salle.dz",
  role: "PRO",
  locale: "fr",
  emailVerified: true,
  firstName: null,
  lastName: null,
  // A10 : les 4 champs D42 du contrat AuthUserDTO.
  phone: null,
  hasPassword: true,
  hasGoogle: false,
  proProfile: { businessName: "Salle El Ryad", phone: "+213551234567", phone2: null }
};
const VENUE = { id: "v1", slug: "salle-el-ryad", nameFr: "Salle El Ryad" };
const unauthenticated = () => ({
  status: 401,
  body: { statusCode: 401, message: { code: "UNAUTHENTICATED", message: "auth.errors.unauthenticated" } }
});

/** Ouvre une session (token en mémoire) puis rend le couple auth + venue. */
async function connectedPair(routes: Record<string, Route>) {
  const { impl, calls } = makeFetch({
    "POST /auth/login": () => ({ status: 200, body: { accessToken: "jwt-vieux", user: USER } }),
    ...routes
  });
  const auth = createAuthClient(BASE, impl);
  await auth.login({ email: "contact@salle.dz", password: "Motdepasse1" });
  return { auth, venues: createVenueProClient(auth.authedRequest), calls };
}

describe("createVenueProClient — câblage des routes (topologie A2)", () => {
  it("écritures sur /venues, lectures pro sur /pro/venues, avec le Bearer en mémoire", async () => {
    const { venues, calls } = await connectedPair({
      "GET /pro/venues": () => ({ status: 200, body: [VENUE] }),
      "GET /pro/venues/v1": () => ({ status: 200, body: VENUE }),
      "POST /venues": () => ({ status: 201, body: VENUE }),
      "PATCH /venues/v1": () => ({ status: 200, body: { ...VENUE, status: "HIDDEN" } })
    });

    await venues.listMine();
    await venues.getMine("v1");
    await venues.create({ cityId: "c1", nameFr: "Salle El Ryad", nameAr: "قاعة الرياض", capacityMax: 400, basePriceCents: 15_000_000 });
    await venues.update("v1", { status: "HIDDEN" });

    const paths = calls.map((c) => `${c.init?.method ?? "GET"} ${c.url.replace(`${BASE}/api/v1`, "")}`);
    expect(paths).toEqual([
      "POST /auth/login",
      "GET /pro/venues",
      "GET /pro/venues/v1",
      "POST /venues",
      "PATCH /venues/v1"
    ]);
    // Le token mémoire du client auth voyage bien sur les appels venue.
    const list = calls.find((c) => c.url.endsWith("/pro/venues"));
    expect((list?.init?.headers as Record<string, string>).Authorization).toBe("Bearer jwt-vieux");

    // PATCH partiel réel : le corps ne porte QUE le champ modifié.
    const patch = calls.find((c) => c.init?.method === "PATCH");
    expect(JSON.parse(String(patch?.init?.body))).toEqual({ status: "HIDDEN" });
  });

  it("DELETE : 204 sans corps résolu sans erreur de parsing JSON", async () => {
    const { venues } = await connectedPair({ "DELETE /venues/v1": () => ({ status: 204 }) });
    await expect(venues.softDelete("v1")).resolves.toBeUndefined();
  });

  // D45 (A6a) : endpoint SÉPARÉ, corps = la saisie BRUTE du pro. Test à part et
  // non greffé sur le test de câblage : celui-ci cherche « le premier PATCH »,
  // un second PATCH y rendrait son assertion muette.
  it("PATCH /venues/:id/virtual-tour : la saisie brute part telle quelle, la réponse est l'ID canonique", async () => {
    const { venues, calls } = await connectedPair({
      "PATCH /venues/v1/virtual-tour": () => ({ status: 200, body: { matterportModelId: "SxQL3iGyoDo" } })
    });

    await expect(
      venues.updateVirtualTour("v1", { matterportInput: "https://my.matterport.com/show/?m=SxQL3iGyoDo" })
    ).resolves.toEqual({ matterportModelId: "SxQL3iGyoDo" });

    const call = calls.find((c) => c.url.endsWith("/virtual-tour"));
    expect(JSON.parse(String(call?.init?.body))).toEqual({
      matterportInput: "https://my.matterport.com/show/?m=SxQL3iGyoDo"
    });
  });

  it("404 indistinct : ApiError { code VENUE_NOT_FOUND } remontée telle quelle", async () => {
    const { venues } = await connectedPair({
      "GET /pro/venues/inconnue": () => ({
        status: 404,
        body: { statusCode: 404, message: { code: "VENUE_NOT_FOUND", message: "venue.errors.notFound" } }
      })
    });
    const err = (await venues.getMine("inconnue").catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("VENUE_NOT_FOUND");
    expect(err.messageKey).toBe("venue.errors.notFound");
  });
});

describe("createVenueProClient — mutex de refresh PARTAGÉ avec l'auth (§8)", () => {
  it("trois appels venue expirés en parallèle : UN refresh, UN rejeu chacun, pas de boucle", async () => {
    let refreshCount = 0;
    const byToken: Record<string, number> = {};
    const { impl, calls } = makeFetch({
      "POST /auth/login": () => ({ status: 200, body: { accessToken: "jwt-vieux", user: USER } }),
      "GET /pro/venues": (init) => {
        const auth = (init?.headers as Record<string, string>).Authorization ?? "none";
        byToken[auth] = (byToken[auth] ?? 0) + 1;
        return auth === "Bearer jwt-neuf" ? { status: 200, body: [VENUE] } : unauthenticated();
      },
      "POST /auth/refresh": async () => {
        refreshCount += 1;
        await new Promise((r) => setTimeout(r, 20)); // laisse les trois 401 arriver AVANT la résolution
        return { status: 200, body: { accessToken: "jwt-neuf", user: USER } };
      }
    });
    const auth = createAuthClient(BASE, impl);
    await auth.login({ email: "contact@salle.dz", password: "Motdepasse1" });
    const venues = createVenueProClient(auth.authedRequest);

    const results = await Promise.all([venues.listMine(), venues.listMine(), venues.listMine()]);

    expect(results).toHaveLength(3);
    expect(refreshCount).toBe(1); // le mutex a fusionné les trois refresh
    expect(calls.filter((c) => c.url.endsWith("/auth/refresh"))).toHaveLength(1);
    expect(byToken["Bearer jwt-vieux"]).toBe(3); // 3 échecs…
    expect(byToken["Bearer jwt-neuf"]).toBe(3); // …et exactement 3 rejeux
  });

  it("PREUVE DU PARTAGE : un appel AUTH et un appel VENUE expirés ensemble ⇒ UN SEUL refresh", async () => {
    let refreshCount = 0;
    const { impl, calls } = makeFetch({
      "POST /auth/login": () => ({ status: 200, body: { accessToken: "jwt-vieux", user: USER } }),
      "GET /auth/me": (init) =>
        (init?.headers as Record<string, string>).Authorization === "Bearer jwt-neuf"
          ? { status: 200, body: USER }
          : unauthenticated(),
      "GET /pro/venues": (init) =>
        (init?.headers as Record<string, string>).Authorization === "Bearer jwt-neuf"
          ? { status: 200, body: [VENUE] }
          : unauthenticated(),
      "POST /auth/refresh": async () => {
        refreshCount += 1;
        await new Promise((r) => setTimeout(r, 20));
        return { status: 200, body: { accessToken: "jwt-neuf", user: USER } };
      }
    });
    const auth = createAuthClient(BASE, impl);
    await auth.login({ email: "contact@salle.dz", password: "Motdepasse1" });
    const venues = createVenueProClient(auth.authedRequest);

    // Les deux domaines partent EN MÊME TEMPS avec le même token périmé : si le
    // client venue avait sa propre closure (3ᵉ voie), on verrait DEUX refresh —
    // et l'API révoquerait la session pour réutilisation (D10).
    const [me, mine] = await Promise.all([auth.me(), venues.listMine()]);

    expect(me.email).toBe("contact@salle.dz");
    expect(mine).toHaveLength(1);
    expect(refreshCount).toBe(1);
    expect(calls.filter((c) => c.url.endsWith("/auth/refresh"))).toHaveLength(1);
    expect(auth.getAccessToken()).toBe("jwt-neuf"); // un seul token mémoire, partagé
  });

  it("refresh KO : l'erreur d'origine remonte, AUCUN rejeu (pas de boucle)", async () => {
    let venueAttempts = 0;
    const { impl } = makeFetch({
      "POST /auth/login": () => ({ status: 200, body: { accessToken: "jwt-vieux", user: USER } }),
      "GET /pro/venues": () => {
        venueAttempts += 1;
        return unauthenticated();
      },
      "POST /auth/refresh": () => unauthenticated()
    });
    const auth = createAuthClient(BASE, impl);
    await auth.login({ email: "contact@salle.dz", password: "Motdepasse1" });
    const venues = createVenueProClient(auth.authedRequest);

    await expect(venues.listMine()).rejects.toBeInstanceOf(ApiError);
    expect(venueAttempts).toBe(1);
  });
});

describe("createReferentialsClient — endpoints PUBLICS", () => {
  it("GET /wilayas et /amenities SANS en-tête Authorization", async () => {
    const { impl, calls } = makeFetch({
      "GET /wilayas": () => ({ status: 200, body: [{ id: "w16", code: 16, nameFr: "Alger", nameAr: "الجزائر", cities: [] }] }),
      "GET /amenities": () => ({ status: 200, body: [{ id: "a1", key: "wifi", nameFr: "Wifi", nameAr: "واي فاي", icon: "wifi" }] })
    });
    const referentials = createReferentialsClient(BASE, impl);

    await referentials.listWilayas();
    await referentials.listAmenities();

    expect(calls.map((c) => c.url)).toEqual([`${BASE}/api/v1/wilayas`, `${BASE}/api/v1/amenities`]);
    for (const call of calls) {
      expect((call.init?.headers as Record<string, string> | undefined)?.Authorization).toBeUndefined();
    }
  });

  it("réutilise la doctrine d'erreur : ApiError sur échec métier, NetworkError hors ligne", async () => {
    const { impl } = makeFetch({
      "GET /wilayas": () => ({ status: 500, body: { statusCode: 500, message: { code: "INTERNAL" } } })
    });
    await expect(createReferentialsClient(BASE, impl).listWilayas()).rejects.toBeInstanceOf(ApiError);

    const offline = createReferentialsClient(BASE, vi.fn().mockRejectedValue(new TypeError("fetch failed")) as unknown as typeof fetch);
    await expect(offline.listAmenities()).rejects.toBeInstanceOf(NetworkError);
  });
});

describe("createVenueProClient — photos (A6a-P) : multipart en PASSE-PLAT", () => {
  const PHOTO = {
    id: "p1",
    url: "https://cdn.test/p1.webp",
    thumbUrl: "https://cdn.test/p1-thumb.webp",
    width: 1920,
    height: 1080,
    sortOrder: 0,
    altFr: null,
    altAr: null,
    createdAt: "2026-01-05T10:00:00.000Z"
  };

  it("addPhoto : le body passé à fetch est L'INSTANCE FormData, et AUCUN Content-Type n'est posé", async () => {
    const { venues, calls } = await connectedPair({
      "POST /venues/v1/photos": () => ({ status: 201, body: PHOTO })
    });

    const file = new File(["binaire"], "salle.jpg", { type: "image/jpeg" });
    await expect(venues.addPhoto("v1", file)).resolves.toEqual(PHOTO);

    const call = calls.find((c) => c.url.endsWith("/photos"));
    expect(call?.init?.body).toBeInstanceOf(FormData);
    // Le champ DOIT s'appeler « file » : c'est le contrat du FileInterceptor.
    expect((call?.init?.body as FormData).get("file")).toBe(file);
    // La boundary est posée par le navigateur ; la fixer à la main casse le
    // multipart. On vérifie donc l'ABSENCE de l'en-tête, pas sa valeur.
    const headers = call?.init?.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBeUndefined();
    expect(headers.Authorization).toBe("Bearer jwt-vieux");
  });

  it("ASSERTION INVERSE — un corps objet reste du JSON.stringify + Content-Type (chemin de TOUS les autres appels)", async () => {
    const { venues, calls } = await connectedPair({
      "PATCH /venues/v1/photos/order": () => ({ status: 200, body: [PHOTO] }),
      "PATCH /venues/v1/photos/p1": () => ({ status: 200, body: { ...PHOTO, altFr: "Vue de la salle" } })
    });

    await expect(venues.reorderPhotos("v1", { photoIds: ["p1"] })).resolves.toEqual([PHOTO]);
    await venues.updatePhotoAlt("v1", "p1", { altFr: "Vue de la salle", altAr: null });

    for (const call of calls.filter((c) => c.init?.method === "PATCH")) {
      const headers = call.init?.headers as Record<string, string>;
      expect(headers["Content-Type"]).toBe("application/json");
      expect(typeof call.init?.body).toBe("string");
    }
    const order = calls.find((c) => c.url.endsWith("/photos/order"));
    expect(JSON.parse(String(order?.init?.body))).toEqual({ photoIds: ["p1"] });
    const alt = calls.find((c) => c.url.endsWith("/photos/p1"));
    // Les DEUX champs partent toujours, `null` = effacement explicite.
    expect(JSON.parse(String(alt?.init?.body))).toEqual({ altFr: "Vue de la salle", altAr: null });
  });

  it("deletePhoto : 204 sans corps, résolu sans erreur de parsing", async () => {
    const { venues } = await connectedPair({ "DELETE /venues/v1/photos/p1": () => ({ status: 204 }) });
    await expect(venues.deletePhoto("v1", "p1")).resolves.toBeUndefined();
  });

  it("rejeu après 401 : le MÊME FormData est ré-émis (un multipart n'est pas consommé par fetch)", async () => {
    let first = true;
    const { venues, calls } = await connectedPair({
      "POST /venues/v1/photos": () => {
        if (first) {
          first = false;
          return unauthenticated();
        }
        return { status: 201, body: PHOTO };
      },
      "POST /auth/refresh": () => ({ status: 200, body: { accessToken: "jwt-neuf", user: USER } })
    });

    await expect(venues.addPhoto("v1", new File(["b"], "a.jpg", { type: "image/jpeg" }))).resolves.toEqual(PHOTO);

    const uploads = calls.filter((c) => c.url.endsWith("/photos"));
    expect(uploads).toHaveLength(2);
    expect(uploads[0]?.init?.body).toBe(uploads[1]?.init?.body);
    expect((uploads[1]?.init?.headers as Record<string, string>).Authorization).toBe("Bearer jwt-neuf");
  });
});


// ── Lot B4a — créneaux (B1), règles de prix (B2), blocages (B3/D51) ──────────
// Ces neuf méthodes n'existaient pas : B1, B2 et B3 avaient livré leurs
// endpoints sans aucune contrepartie côté client. Ce qui se prouve ici est le
// CÂBLAGE (chemins imbriqués, encodage) et, pour les blocages, le fait que le
// client NE CONVERTIT RIEN — D51 confie le fuseau à l'API seule.
describe("createVenueProClient — créneaux et règles de prix (B1/B2)", () => {
  it("les six routes sont imbriquées sous /venues/:id, jamais sous /pro (ce sont des ÉCRITURES)", async () => {
    const SLOT = { id: "s1", nameFr: "Soirée", nameAr: "سهرة", startMinutes: 1200, endMinutes: 1560 };
    const RULE = { id: "r1", slotTemplateId: "s1", ruleType: "SEASON", priceCents: 30_000_000 };
    const { venues, calls } = await connectedPair({
      "POST /venues/v1/slot-templates": () => ({ status: 201, body: SLOT }),
      "PATCH /venues/v1/slot-templates/s1": () => ({ status: 200, body: SLOT }),
      "DELETE /venues/v1/slot-templates/s1": () => ({ status: 204 }),
      "POST /venues/v1/slot-templates/s1/pricing-rules": () => ({ status: 201, body: RULE }),
      "PATCH /venues/v1/slot-templates/s1/pricing-rules/r1": () => ({ status: 200, body: RULE }),
      "DELETE /venues/v1/slot-templates/s1/pricing-rules/r1": () => ({ status: 204 })
    });

    await venues.createSlotTemplate("v1", {
      nameFr: "Soirée",
      nameAr: "سهرة",
      startMinutes: 1200,
      endMinutes: 1560,
      basePriceCents: 20_000_000
    });
    await venues.updateSlotTemplate("v1", "s1", { isActive: false });
    await venues.deleteSlotTemplate("v1", "s1");
    // Tous les champs sont REQUIS (nullables, pas optionnels) : une règle muette
    // se saisirait sans erreur puis ne s'appliquerait jamais — B2 l'interdit.
    await venues.createPricingRule("v1", "s1", {
      ruleType: "SEASON",
      label: "Haute saison",
      priceCents: 30_000_000,
      startMonth: 6,
      endMonth: 9,
      daysOfWeek: [],
      priority: 10
    });
    await venues.updatePricingRule("v1", "s1", "r1", { priceCents: 31_000_000 });
    await venues.deletePricingRule("v1", "s1", "r1");

    expect(calls.slice(1).map((c) => `${c.init?.method} ${c.url.replace(`${BASE}/api/v1`, "")}`)).toEqual([
      "POST /venues/v1/slot-templates",
      "PATCH /venues/v1/slot-templates/s1",
      "DELETE /venues/v1/slot-templates/s1",
      "POST /venues/v1/slot-templates/s1/pricing-rules",
      "PATCH /venues/v1/slot-templates/s1/pricing-rules/r1",
      "DELETE /venues/v1/slot-templates/s1/pricing-rules/r1"
    ]);
  });

  it("le RETRAIT d'un créneau est un PATCH isActive:false, pas un DELETE", async () => {
    const { venues, calls } = await connectedPair({
      "PATCH /venues/v1/slot-templates/s1": () => ({ status: 200, body: { id: "s1", isActive: false } })
    });
    await venues.updateSlotTemplate("v1", "s1", { isActive: false });
    const patch = calls.find((c) => c.init?.method === "PATCH");
    expect(JSON.parse(String(patch?.init?.body))).toEqual({ isActive: false });
  });

  it("409 SLOT_TEMPLATE_IN_USE remonte en ApiError, code intact", async () => {
    const { venues } = await connectedPair({
      "DELETE /venues/v1/slot-templates/s1": () => ({
        status: 409,
        body: { message: { code: "SLOT_TEMPLATE_IN_USE", message: "venue.errors.slotInUse" } }
      })
    });
    await expect(venues.deleteSlotTemplate("v1", "s1")).rejects.toBeInstanceOf(ApiError);
  });
});

describe("createVenueProClient — blocages de disponibilité (B3, D51)", () => {
  const BLOCK = {
    id: "b1",
    startsAt: "2027-08-14T08:00",
    endsAt: "2027-08-14T18:00",
    reason: "Travaux",
    createdAt: "2026-07-28T10:00:00.000Z"
  };

  it("la LECTURE porte le préfixe /pro, les ÉCRITURES sont nues — topologie A2", async () => {
    const { venues, calls } = await connectedPair({
      "GET /pro/venues/v1/availability-blocks?from=2027-08-01&to=2027-08-31": () => ({ status: 200, body: [BLOCK] }),
      "POST /venues/v1/availability-blocks": () => ({ status: 201, body: BLOCK }),
      "DELETE /venues/v1/availability-blocks/b1": () => ({ status: 204 })
    });

    await venues.listAvailabilityBlocks("v1", { from: "2027-08-01", to: "2027-08-31" });
    await venues.createAvailabilityBlock("v1", { startsAt: "2027-08-14T08:00", endsAt: "2027-08-14T18:00" });
    await venues.deleteAvailabilityBlock("v1", "b1");

    expect(calls.slice(1).map((c) => `${c.init?.method ?? "GET"} ${c.url.replace(`${BASE}/api/v1`, "")}`)).toEqual([
      "GET /pro/venues/v1/availability-blocks?from=2027-08-01&to=2027-08-31",
      "POST /venues/v1/availability-blocks",
      "DELETE /venues/v1/availability-blocks/b1"
    ]);
  });

  it("D51 — le client NE CONVERTIT RIEN : la date-heure civile part telle quelle, sans offset", async () => {
    const { venues, calls } = await connectedPair({
      "POST /venues/v1/availability-blocks": () => ({ status: 201, body: BLOCK })
    });
    await venues.createAvailabilityBlock("v1", {
      startsAt: "2027-08-14T08:00",
      endsAt: "2027-08-14T18:00",
      reason: "Travaux"
    });
    const post = calls.find((c) => c.url.endsWith("/availability-blocks"));
    const body = JSON.parse(String(post?.init?.body));
    // Ni "Z", ni "+01:00", ni millisecondes : le fuseau appartient à l'API.
    expect(body.startsAt).toBe("2027-08-14T08:00");
    expect(body.endsAt).toBe("2027-08-14T18:00");
    expect(JSON.stringify(body)).not.toMatch(/[Zz]"|\+01:00/);
  });

  it("D51 — le DTO relu garde le MÊME repère civil, le client ne le retouche pas", async () => {
    const { venues } = await connectedPair({
      "POST /venues/v1/availability-blocks": () => ({ status: 201, body: BLOCK })
    });
    const dto = await venues.createAvailabilityBlock("v1", {
      startsAt: "2027-08-14T08:00",
      endsAt: "2027-08-14T18:00"
    });
    expect(dto.startsAt).toBe("2027-08-14T08:00");
    expect(dto.endsAt).toBe("2027-08-14T18:00");
  });

  it("409 AVAILABILITY_BLOCK_CONFLICT remonte en ApiError", async () => {
    const { venues } = await connectedPair({
      "POST /venues/v1/availability-blocks": () => ({
        status: 409,
        body: { message: { code: "AVAILABILITY_BLOCK_CONFLICT", message: "venue.errors.blockConflict" } }
      })
    });
    await expect(
      venues.createAvailabilityBlock("v1", { startsAt: "2027-08-14T08:00", endsAt: "2027-08-14T18:00" })
    ).rejects.toBeInstanceOf(ApiError);
  });

  it("DELETE : 204 sans corps résolu sans erreur de parsing", async () => {
    const { venues } = await connectedPair({ "DELETE /venues/v1/availability-blocks/b1": () => ({ status: 204 }) });
    await expect(venues.deleteAvailabilityBlock("v1", "b1")).resolves.toBeUndefined();
  });
});
