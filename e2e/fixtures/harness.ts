import { randomUUID } from "node:crypto";
import type { BrowserContext, Page, Request } from "@playwright/test";
import { Client } from "pg";
import { API, DATABASE_URL } from "../playwright.config";

/**
 * Harnais partagé des specs e2e.
 *
 * ⚠ PARTI PRIS D'ASSERTION : ces tests jugent le RÉSEAU et l'URL, presque
 * jamais le DOM. Ce n'est pas de la paresse — c'est ce que A1/A2/A5 mesurent
 * réellement (« un seul appel », « pas de boucle », « même comportement à
 * froid »). Un sélecteur CSS qui change au prochain lot rendrait la suite
 * rouge sans qu'aucun de ces invariants n'ait bougé, et une suite qui crie à
 * tort finit désactivée.
 */

export interface Account {
  email: string;
  password: string;
  role: "CLIENT" | "PRO";
}

const PASSWORD = "Motdepasse1";

/**
 * Crée un compte VÉRIFIÉ, prêt à se connecter.
 *
 * L'inscription passe par l'API réelle (le mot de passe est donc haché par le
 * vrai argon2, avec les vrais paramètres) ; seule la vérification d'email est
 * court-circuitée en base. Extraire le jeton du mail de dev marcherait aussi,
 * mais ferait dépendre chaque test d'un transport dont ce n'est pas le sujet.
 */
export async function createVerifiedAccount(role: "CLIENT" | "PRO"): Promise<Account> {
  const email = `e2e-${randomUUID()}@example.dz`;
  const payload =
    role === "PRO"
      ? { role, email, password: PASSWORD, businessName: "Salle e2e", phone: "+213550000001" }
      : { role, email, password: PASSWORD, firstName: "Aya", lastName: "Benali" };

  const res = await fetch(`${API}/api/v1/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (res.status !== 201) throw new Error(`register e2e a échoué (${res.status}) : ${await res.text()}`);

  const db = new Client({ connectionString: DATABASE_URL });
  await db.connect();
  try {
    await db.query(`UPDATE users SET email_verified_at = now() WHERE email = $1`, [email]);
  } finally {
    await db.end();
  }
  return { email, password: PASSWORD, role };
}

/**
 * Connecte le CONTEXTE (pas la page) : le cookie `zwadj_rt` httpOnly est posé
 * sur le contexte, donc partagé par tous les onglets qu'on ouvrira ensuite.
 * C'est exactement la situation « deux onglets, une session » de D116.
 */
export async function loginContext(context: BrowserContext, account: Account): Promise<void> {
  const res = await context.request.post(`${API}/api/v1/auth/login`, {
    data: { email: account.email, password: account.password, rememberMe: true }
  });
  if (!res.ok()) throw new Error(`login e2e a échoué (${res.status()}) : ${await res.text()}`);
}

/** Nombre de lignes refresh encore vivantes pour ce compte — la signature
 *  d'une révocation en masse (0) ou d'une fuite d'orphelins (> 1). */
export async function liveSessionCount(email: string): Promise<number> {
  const db = new Client({ connectionString: DATABASE_URL });
  await db.connect();
  try {
    const { rows } = await db.query<{ n: string }>(
      `SELECT count(*)::text AS n
         FROM refresh_tokens t JOIN users u ON u.id = t.user_id
        WHERE u.email = $1 AND t.revoked_at IS NULL`,
      [email]
    );
    return Number(rows[0]!.n);
  } finally {
    await db.end();
  }
}

/** Invalide le cookie refresh du contexte sans toucher au serveur : on simule
 *  un cookie périmé/forgé, pas une déconnexion. */
export async function corruptRefreshCookie(context: BrowserContext): Promise<void> {
  const cookies = await context.cookies();
  const rt = cookies.find((c) => c.name === "zwadj_rt");
  if (!rt) throw new Error("Aucun cookie zwadj_rt à corrompre — la connexion a-t-elle eu lieu ?");
  await context.clearCookies();
  await context.addCookies([{ ...rt, value: `${rt.value}-invalide` }]);
}

/**
 * Compteur de requêtes réseau. Le cœur de A1 et A2 : « un seul appel » n'est
 * pas une impression, c'est un entier.
 */
export class NetworkCounter {
  private readonly seen: string[] = [];

  private constructor(private readonly pages: Page[]) {}

  static watch(...pages: Page[]): NetworkCounter {
    const counter = new NetworkCounter(pages);
    const onRequest = (req: Request) => {
      // On ignore les préflights CORS : ils doublent chaque appel cross-origin
      // et n'ont rien à voir avec le nombre d'appels APPLICATIFS.
      if (req.method() !== "OPTIONS") counter.seen.push(`${req.method()} ${req.url()}`);
    };
    for (const p of pages) p.on("request", onRequest);
    return counter;
  }

  /** Combien d'appels dont l'URL contient ce fragment. */
  count(fragment: string, method?: string): number {
    return this.seen.filter((c) => c.includes(fragment) && (!method || c.startsWith(`${method} `))).length;
  }

  /** Les chemins d'API appelés, dédoublonnés et triés — l'empreinte d'un écran.
   *  Sert à comparer navigation SPA et rechargement à froid (A5). */
  apiFootprint(): string[] {
    return [
      ...new Set(
        this.seen
          .filter((c) => c.includes("/api/v1/"))
          .map((c) => {
            const [method, url] = c.split(" ");
            const path = new URL(url!).pathname;
            // Les identifiants varient d'un run à l'autre : on les normalise
            // pour comparer des FORMES de parcours, pas des URLs littérales.
            return `${method} ${path.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ":id")}`;
          })
      )
    ].sort();
  }

  reset(): void {
    this.seen.length = 0;
  }

  dump(): string {
    return this.seen.join("\n");
  }

  dispose(): void {
    for (const p of this.pages) p.removeAllListeners("request");
  }
}

/** Laisse retomber le réseau ET les effets React déclenchés en cascade.
 *  `networkidle` seul rate un second appel parti après un `setState`. */
export async function settle(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400);
}
