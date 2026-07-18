// Tests du client API auth (logique pure, fetch injecté). Le point critique :
// le SINGLE-FLIGHT du refresh — l'API traite un refresh concurrent du même
// token comme une réutilisation (D10), le front DOIT donc sérialiser.
import { describe, expect, it, vi } from "vitest";
import { ApiError, NetworkError, createAuthClient } from "./auth-client";

const BASE = "http://api.test";

type Route = (init: RequestInit | undefined, url: string) => { status: number; body: unknown } | Promise<{ status: number; body: unknown }>;

function makeFetch(routes: Record<string, Route>) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const impl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    const path = url.replace(`${BASE}/api/v1`, "");
    const route = routes[`${init?.method ?? "GET"} ${path}`];
    if (!route) throw new Error(`Route non simulée : ${init?.method ?? "GET"} ${path}`);
    const { status, body } = await route(init, url);
    return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  });
  return { impl: impl as unknown as typeof fetch, calls };
}

const USER = { id: "u1", email: "aya@example.dz", role: "CLIENT", locale: "fr", emailVerified: false, firstName: "Aya", lastName: null, proProfile: null };
const businessError = (code: string, key: string) => ({ statusCode: 401, message: { code, message: key }, path: "/x", timestamp: "t" });

describe("createAuthClient — enveloppe d'erreur", () => {
  it("erreur métier : ApiError { status, code, messageKey }", async () => {
    const { impl } = makeFetch({
      "POST /auth/login": () => ({ status: 401, body: businessError("INVALID_CREDENTIALS", "auth.errors.invalidCredentials") })
    });
    const client = createAuthClient(BASE, impl);

    const err = await client.login({ email: "a@b.dz", password: "x" }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(401);
    expect((err as ApiError).code).toBe("INVALID_CREDENTIALS");
    expect((err as ApiError).messageKey).toBe("auth.errors.invalidCredentials");
  });

  it("erreur de validation : issues [{path, message}] exposées", async () => {
    const { impl } = makeFetch({
      "POST /auth/register": () => ({
        status: 400,
        body: { statusCode: 400, message: { issues: [{ path: "email", message: "auth.validation.emailInvalid" }] } }
      })
    });
    const client = createAuthClient(BASE, impl);

    const err = (await client.register({ role: "CLIENT", email: "x", password: "y", locale: "fr" } as never).catch((e: unknown) => e)) as ApiError;
    expect(err.issues).toEqual([{ path: "email", message: "auth.validation.emailInvalid" }]);
  });

  it("429 sans code : normalisé en RATE_LIMITED ; API injoignable : NetworkError", async () => {
    const { impl } = makeFetch({ "POST /auth/login": () => ({ status: 429, body: { statusCode: 429, message: "Too many" } }) });
    const client = createAuthClient(BASE, impl);
    const err = (await client.login({ email: "a@b.dz", password: "x" }).catch((e: unknown) => e)) as ApiError;
    expect(err.code).toBe("RATE_LIMITED");

    const offline = createAuthClient(BASE, vi.fn().mockRejectedValue(new TypeError("fetch failed")) as unknown as typeof fetch);
    await expect(offline.login({ email: "a@b.dz", password: "x" })).rejects.toBeInstanceOf(NetworkError);
  });
});

describe("createAuthClient — session & refresh", () => {
  it("login stocke l'access token en mémoire ; /me part avec le Bearer et credentials include", async () => {
    const { impl, calls } = makeFetch({
      "POST /auth/login": () => ({ status: 200, body: { accessToken: "jwt-1", user: USER } }),
      "GET /auth/me": () => ({ status: 200, body: USER })
    });
    const client = createAuthClient(BASE, impl);
    await client.login({ email: "aya@example.dz", password: "Motdepasse1" });
    await client.me();

    const meCall = calls.find((c) => c.url.endsWith("/auth/me"))!;
    expect((meCall.init?.headers as Record<string, string>).Authorization).toBe("Bearer jwt-1");
    expect(meCall.init?.credentials).toBe("include");
    expect(client.getAccessToken()).toBe("jwt-1");
  });

  it("401 UNAUTHENTICATED sur /me : UN refresh puis UN rejeu — et pas de boucle si le refresh échoue", async () => {
    let meAttempts = 0;
    const { impl, calls } = makeFetch({
      "GET /auth/me": () => {
        meAttempts += 1;
        return meAttempts === 1
          ? { status: 401, body: businessError("UNAUTHENTICATED", "auth.errors.unauthenticated") }
          : { status: 200, body: USER };
      },
      "POST /auth/refresh": () => ({ status: 200, body: { accessToken: "jwt-2", user: USER } })
    });
    const client = createAuthClient(BASE, impl);
    const me = await client.me();

    expect(me.email).toBe("aya@example.dz");
    expect(meAttempts).toBe(2); // un seul rejeu
    expect(calls.filter((c) => c.url.endsWith("/auth/refresh"))).toHaveLength(1);
    expect(client.getAccessToken()).toBe("jwt-2");

    // Refresh KO → l'erreur d'origine remonte, pas de nouvelle tentative
    const failing = makeFetch({
      "GET /auth/me": () => ({ status: 401, body: businessError("UNAUTHENTICATED", "auth.errors.unauthenticated") }),
      "POST /auth/refresh": () => ({ status: 401, body: businessError("UNAUTHENTICATED", "auth.errors.unauthenticated") })
    });
    const anon = createAuthClient(BASE, failing.impl);
    await expect(anon.me()).rejects.toBeInstanceOf(ApiError);
    expect(failing.calls.filter((c) => c.url.endsWith("/auth/me"))).toHaveLength(1); // pas de rejeu sans nouveau token
  });

  it("SINGLE-FLIGHT : trois requêtes expirées en parallèle = UN SEUL POST /auth/refresh", async () => {
    const meAttemptsByToken: Record<string, number> = {};
    let refreshCount = 0;
    const { impl, calls } = makeFetch({
      "GET /auth/me": (init) => {
        const auth = (init?.headers as Record<string, string>).Authorization ?? "none";
        meAttemptsByToken[auth] = (meAttemptsByToken[auth] ?? 0) + 1;
        return auth === "Bearer jwt-neuf" ? { status: 200, body: USER } : { status: 401, body: businessError("UNAUTHENTICATED", "k") };
      },
      "POST /auth/refresh": async () => {
        refreshCount += 1;
        await new Promise((r) => setTimeout(r, 20)); // laisse les trois 401 arriver AVANT la résolution
        return { status: 200, body: { accessToken: "jwt-neuf", user: USER } };
      }
    });
    const client = createAuthClient(BASE, impl);

    const results = await Promise.all([client.me(), client.me(), client.me()]);
    expect(results).toHaveLength(3);
    expect(refreshCount).toBe(1); // le mutex a fusionné les trois refresh
    expect(calls.filter((c) => c.url.endsWith("/auth/refresh"))).toHaveLength(1);
  });

  it("bootstrap : cookie valide → user + token ; sinon null sans lever", async () => {
    const ok = makeFetch({ "POST /auth/refresh": () => ({ status: 200, body: { accessToken: "jwt-boot", user: USER } }) });
    const restored = await createAuthClient(BASE, ok.impl).bootstrap();
    expect(restored?.email).toBe("aya@example.dz");

    const ko = makeFetch({ "POST /auth/refresh": () => ({ status: 401, body: businessError("UNAUTHENTICATED", "k") }) });
    await expect(createAuthClient(BASE, ko.impl).bootstrap()).resolves.toBeNull();
  });

  it("logout : vide le token local MÊME si l'API est injoignable (état cohérent)", async () => {
    const { impl } = makeFetch({
      "POST /auth/login": () => ({ status: 200, body: { accessToken: "jwt-1", user: USER } }),
      "POST /auth/logout": () => {
        throw new Error("réseau coupé");
      }
    });
    const client = createAuthClient(BASE, impl);
    await client.login({ email: "aya@example.dz", password: "Motdepasse1" });

    await expect(client.logout()).resolves.toEqual({ status: "ok" });
    expect(client.getAccessToken()).toBeNull();
  });
});
