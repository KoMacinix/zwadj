// L'APPLICATION DONT LE JOURNAL EST CAPTURÉ — rang 44, L36-3a-1 (D341, R-7 (D341), SIG-1, MP-11). Une garde qui lit la SORTIE RÉELLE du journal des requêtes de l'application Nest démarrée
// (limite 12 du cadrage : la mesure de D340 avait été faite au niveau de `pino-http`, pas à travers l'application).
//
// ⛔ CE QUI EST RÉEL ET CE QUI EST SUBSTITUÉ, dit pour ne pas se lire comme plus que cela. RÉEL : l'`AppModule` complet, `LoggerModule` de `nestjs-pino`, le middleware `pino-http`, ses sérialiseurs, et la
// liste `redact` — LUE dans la déclaration de l'`AppModule` (`LoggerModule.forRoot({ pinoHttp: { … } })`), jamais recopiée ici : modifier la liste de l'application modifie ce que ce test mesure.
// SUBSTITUÉ, deux choses seulement et explicites : la DESTINATION (un flux en mémoire au lieu de la sortie standard) et le NIVEAU (`info`, celui de la production, au lieu de `silent` que les tests d'intégration
// posent). Le transport de développement (`pino-pretty`) est retiré : on lit le JSON brut, comme en production.
import type { DynamicModule } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { LoggerModule, PARAMS_PROVIDER_TOKEN, type Params } from "nestjs-pino";
import { AppModule } from "../../src/app.module";
import { configureApp } from "../../src/app.setup";
import { GOOGLE_TOKEN_VERIFIER, GoogleTokenInvalidError } from "../../src/auth/google.types";
import { EMAIL_SENDER, type SendEmailInput } from "../../src/common/email/email.types";
import { WHATSAPP_SENDER } from "../../src/common/whatsapp/whatsapp.types";
import { PrismaService } from "../../src/prisma/prisma.service";
import type { TestContext } from "./helpers";

/** Les paramètres de journalisation que l'`AppModule` DÉCLARE (lus dans ses métadonnées de module). Lève si la structure change : un échec bruyant, jamais une garde qui mesure autre chose. */
export function parametresDeJournalDeLApplication(): Params {
  const imports = Reflect.getMetadata("imports", AppModule) as unknown[];
  const dynamique = imports.find((m): m is DynamicModule => typeof m === "object" && m !== null && (m as DynamicModule).module === LoggerModule);
  if (dynamique === undefined) throw new Error("LoggerModule.forRoot(...) introuvable dans les imports de l'AppModule : la garde de journal ne sait plus quoi mesurer");
  const fournisseur = (dynamique.providers ?? []).find((p) => typeof p === "object" && p !== null && (p as { provide?: unknown }).provide === PARAMS_PROVIDER_TOKEN) as { useValue?: Params } | undefined;
  if (fournisseur?.useValue === undefined) throw new Error("les paramètres de pino de l'AppModule sont introuvables");
  return fournisseur.useValue;
}

export interface ContexteJournalise extends TestContext {
  /** Tout ce que pino a écrit depuis la création de l'application (ou depuis le dernier `vider`). */
  sortie: () => string;
  /** Les lignes JSON de la sortie, parsées. Une ligne qui n'est pas du JSON fait échouer l'appelant : le journal de production est du JSON, ligne par ligne. */
  lignes: () => Array<Record<string, unknown>>;
  vider: () => void;
  /** Attend que la ligne « request completed » d'une requête (par son chemin) soit écrite : pino-http l'écrit APRÈS l'envoi de la réponse. */
  attendreRequete: (methode: string, chemin: string) => Promise<Record<string, unknown>>;
}

export async function creerApplicationJournalisee(): Promise<ContexteJournalise> {
  const emails: SendEmailInput[] = [];
  let tampon = "";
  const flux = { write: (morceau: string) => { tampon += morceau; } };

  const reels = parametresDeJournalDeLApplication();
  const optionsReelles = (Array.isArray(reels.pinoHttp) ? reels.pinoHttp[0] : reels.pinoHttp) as Record<string, unknown> | undefined;
  if (optionsReelles === undefined || !Array.isArray(optionsReelles.redact)) throw new Error("l'AppModule ne déclare plus de liste `redact` : la garde n'a plus rien à mesurer");
  const optionsDeLaGarde = { ...optionsReelles, level: "info", transport: undefined };

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(EMAIL_SENDER)
    .useValue({ send: async (input: SendEmailInput) => { emails.push(input); } })
    .overrideProvider(WHATSAPP_SENDER)
    .useValue({ send: async () => undefined })
    .overrideProvider(GOOGLE_TOKEN_VERIFIER)
    .useValue({ verify: async () => { throw new GoogleTokenInvalidError(); } })
    .overrideProvider(PARAMS_PROVIDER_TOKEN)
    .useValue({ ...reels, pinoHttp: [optionsDeLaGarde, flux] })
    .compile();

  const app = moduleRef.createNestApplication({ logger: false });
  configureApp(app);
  await app.init();

  const lignes = (): Array<Record<string, unknown>> =>
    tampon
      .split("\n")
      .filter((l) => l.trim() !== "")
      .map((l) => JSON.parse(l) as Record<string, unknown>);

  return {
    app,
    prisma: app.get(PrismaService),
    emails,
    whatsapps: [],
    senders: { failEmail: false, failWhatsApp: false },
    googleTokens: new Map(),
    sortie: () => tampon,
    lignes,
    vider: () => { tampon = ""; },
    attendreRequete: async (methode, chemin) => {
      const limite = Date.now() + 5_000;
      for (;;) {
        const trouvee = lignes().find((l) => {
          const req = l.req as { method?: string; url?: string } | undefined;
          return req?.method === methode && req.url === chemin && typeof l.res === "object";
        });
        if (trouvee !== undefined) return trouvee;
        if (Date.now() > limite) throw new Error(`aucune ligne « request completed » pour ${methode} ${chemin} en 5 s ; sortie : ${tampon.slice(0, 400)}`);
        await new Promise((r) => setTimeout(r, 20));
      }
    }
  };
}
