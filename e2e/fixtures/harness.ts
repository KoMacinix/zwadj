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
 * ⚠ RENDRE `TypeError: fetch failed` LISIBLE — D265. CE N'EST PAS UN CORRECTIF.
 *
 * Le run du 28/08 a produit DOUZE échecs `TypeError: fetch failed` sur
 * `/auth/register`, et ce message ne dit RIEN : `fetch` de Node est une
 * enveloppe qui masque l'erreur réelle dans `.cause`. `ECONNREFUSED` (serveur
 * mort), `ECONNRESET` / `UND_ERR_SOCKET` (socket keep-alive fermée côté
 * serveur pendant que le client la réutilise) et `UND_ERR_HEADERS_TIMEOUT`
 * (réponse trop lente) portent le même texte et appellent trois corrections
 * différentes.
 *
 * ⛔ ON NE CORRIGE PAS UNE PANNE QU'ON N'A PAS NOMMÉE. Cette enveloppe-ci ne
 * change aucun comportement : elle déplie la chaîne des causes, mesure la durée
 * et pose une échéance explicite. Le prochain run dira LAQUELLE des trois.
 *
 * ⚠ AUCUNE NOUVELLE TENTATIVE ICI, délibérément. `playwright.config.ts` pose
 * `retries: 0` avec un motif écrit ; réessayer en douce dans le harnais
 * contournerait cette décision par la petite porte. Si l'instabilité est réelle,
 * elle doit rester visible.
 */
async function postJson(url: string, body: unknown): Promise<Response> {
  const debut = Date.now();
  try {
    return await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      // Sans échéance, `fetch` attend jusqu'au timeout du TEST : le message
      // parle alors de la spec et jamais de l'appel qui n'a pas fini.
      signal: AbortSignal.timeout(30_000)
    });
  } catch (erreur) {
    const causes: string[] = [];
    let courante: unknown = erreur;
    while (courante instanceof Error) {
      const code = (courante as NodeJS.ErrnoException).code;
      causes.push(`${courante.name}${code ? ` [${code}]` : ""}: ${courante.message}`);
      courante = courante.cause;
    }
    throw new Error(
      `POST ${url} a échoué après ${Date.now() - debut} ms.\n` +
        `Chaîne des causes (la DERNIÈRE est la vraie) :\n  ${causes.join("\n  ")}`,
      { cause: erreur }
    );
  }
}

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

  const res = await postJson(`${API}/api/v1/auth/register`, payload);
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

/**
 * ⚠ COMBIEN DE FOIS UN EFFET DE MONTAGE PART, EN DÉVELOPPEMENT.
 *
 * `React.StrictMode` monte DEUX fois — c'est la raison même pour laquelle cette
 * suite vise les serveurs de dev (voir `playwright.config.ts`). Un effet de
 * LECTURE part donc deux fois, et c'est correct : React vérifie ainsi qu'il
 * supporte d'être rejoué.
 *
 * ⚠ La première version exigeait 1 sur des lectures — c'est-à-dire exigeait que
 * StrictMode n'existe pas, dans l'environnement choisi précisément parce qu'il
 * existe. Exiger 2 n'est pas non plus « tester React » : ce qu'on verrouille,
 * c'est qu'il n'y en ait pas TROIS. Une cascade — un `setState` qui relance le
 * chargement — se voit immédiatement ici.
 *
 * ⚠ Les effets à EFFET DE BORD restent à 1 : deux montages ne doivent PAS
 * consommer deux jetons. Le premier vrai run l'a confirmé de la meilleure
 * façon possible — UN SEUL `POST /auth/refresh` pendant que TOUTES les lectures
 * partaient en double, dans les deux applications. C'est la preuve de bout en
 * bout que le mutex de D115 tient sous double montage réel.
 */
export const MONTAGES_PAR_RENDU = 2;

/**
 * Navigation INTERNE à la SPA, sans recharger le document.
 *
 * ⚠ POURQUOI PAS `page.goto()` : il recharge TOUJOURS le document. La première
 * version d'A5 s'en servait pour « naviguer » — elle comparait donc un
 * démarrage à froid… à un autre démarrage à froid. Les quatre tests passaient
 * sans rien mesurer.
 *
 * ⚠ POURQUOI PAS UN CLIC : il n'existe aucun lien stable entre les routes
 * protégées du Pro, et viser un libellé traduit rendrait la suite dépendante de
 * l'i18n. On pousse l'historique et on notifie le routeur, qui écoute
 * `popstate`.
 */
export async function spaNavigate(page: Page, path: string): Promise<void> {
  await page.evaluate((to) => {
    window.history.pushState({}, "", to);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, path);
}

/** Pose un témoin sur `window`. */
export async function markPage(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as Record<string, unknown>).__zwadjSpaTemoin = true;
  });
}

/**
 * Le témoin a-t-il survécu ? S'il a disparu, un document a été rechargé.
 *
 * ⚠ C'est ce qui empêche A5 de redevenir vide en silence : sans cette
 * vérification, remplacer `spaNavigate` par un `goto` rendrait les tests verts
 * ET sans objet, exactement comme avant.
 */
export async function pageStillAlive(page: Page): Promise<boolean> {
  return page.evaluate(() => (window as unknown as Record<string, unknown>).__zwadjSpaTemoin === true);
}
