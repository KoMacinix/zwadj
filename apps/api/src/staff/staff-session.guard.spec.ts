// Le QUATRIÈME GARDE GLOBAL — rang 44, L36-3a-1 (D341, S-98, MP-7, MP-18, MP-20, MP-34, MP-35). Il COMPLÈTE le Bearer, il ne l'authentifie pas : toute route qui le franchit est déjà derrière
// `JwtAuthGuard`. Ce spec le joue avec des doubles du port (`satisfies`, jamais `as unknown as` : un double incomplet ne passerait pas) ; l'intégration (`staff-session-guard.int-spec.ts`) le
// rejoue sur PostgreSQL réel, dérivé du routeur.
//
// ⛔ CE QUE LE SPEC DOIT FAIRE ROUGIR : un garde qui lit le drapeau UNE fois et le garde ; qui lit autre chose que le drapeau quand la couche est éteinte ; qui fait confiance au cookie pour dire
// la salle ; qui répond par une raison (un oracle) ; qui laisse passer un ADMIN ou un CLIENT.
import { createHash } from "node:crypto";
import { ForbiddenException, UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";
import { Public } from "../auth/auth.decorators";
import { RequiresStaffCapability, StaffAnyMember, StaffExempt } from "./staff-decorators";
import { StaffSessionGuard } from "./staff-session.guard";
import type { StaffSessionView, StaffStore } from "./staff-store.types";

const jeton = "a".repeat(43);
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const SALLE = "018f0000-0000-7000-8000-0000000000b1";
const UTILISATEUR = "018f0000-0000-7000-8000-0000000000c1";

/** Une cible dont les méthodes portent les décorateurs RÉELS (le garde lit des métadonnées Nest, pas un drapeau inventé par le test). */
class Cible {
  ordinaire(): void {}
  @StaffExempt() exemptee(): void {}
  @Public() publique(): void {}
  // R-2 (D354) : une capacité DÉCLARÉE sur la route, et la route du MEMBRE sur sa propre session (se déconnecter, changer son mot de passe)
  @RequiresStaffCapability("salle") declareeSalle(): void {}
  @RequiresStaffCapability("agenda") declareeAgenda(): void {}
  @StaffAnyMember() duMembre(): void {}
}
const cible = new Cible();

function contexte(methode: keyof Cible, requete: Record<string, unknown>): ExecutionContext {
  return {
    getHandler: () => Cible.prototype[methode],
    getClass: () => Cible,
    switchToHttp: () => ({ getRequest: () => requete })
  } as unknown as ExecutionContext;
}

type MagasinDuGarde = Pick<StaffStore, "readLayer" | "touchSession">;

/** Une session vivante telle que le MAGASIN la rend : le membre, et ce dont `etatDuCompte` a besoin — l'échéance du mot de passe et l'HEURE DE LA BASE (S-101, S-241). */
const HEURE_BASE = new Date("2026-11-19T10:00:00.000Z");
const vue = (surcharge: Partial<StaffSessionView> = {}): StaffSessionView => ({
  sessionId: "s1",
  memberId: "m1",
  role: "MANAGER",
  accountName: "Amine",
  mustChangePassword: false,
  status: "ACTIVE",
  passwordExpiresAt: new Date("2027-01-01T00:00:00.000Z"),
  now: HEURE_BASE,
  ...surcharge
});
function magasin(surcharge: Partial<MagasinDuGarde> = {}) {
  const readLayer = vi.fn<MagasinDuGarde["readLayer"]>(async () => ({ proProfileId: SALLE, enabledAt: new Date("2026-11-01T10:00:00Z") }));
  const touchSession = vi.fn<MagasinDuGarde["touchSession"]>(async () => ({ ok: true, session: vue() }));
  const double = { readLayer, touchSession, ...surcharge } satisfies MagasinDuGarde;
  return { double, readLayer: double.readLayer as typeof readLayer, touchSession: double.touchSession as typeof touchSession };
}
const garde = (m: MagasinDuGarde) => new StaffSessionGuard(new Reflector(), m);
const pro = (extra: Record<string, unknown> = {}) => ({ user: { userId: UTILISATEUR, role: "PRO" }, cookies: { zwadj_ss: jeton }, ...extra });

async function refus(g: StaffSessionGuard, ctx: ExecutionContext): Promise<unknown> {
  try {
    await g.canActivate(ctx);
  } catch (e) {
    expect(e).toBeInstanceOf(UnauthorizedException);
    return (e as UnauthorizedException).getResponse();
  }
  // Un refus attendu qui n'arrive pas est un ÉCHEC D'ASSERTION (`expect.fail`), pas une `Error` quelconque (R1, D304/D305).
  return expect.fail("le garde devait refuser");
}

describe("StaffSessionGuard — ce qui PASSE sans toucher à la base", () => {
  it("une route `@Public()` passe, sans aucune lecture", async () => {
    const m = magasin();
    await expect(garde(m.double).canActivate(contexte("publique", { cookies: {} }))).resolves.toBe(true);
    expect(m.readLayer).not.toHaveBeenCalled();
    expect(m.touchSession).not.toHaveBeenCalled();
  });

  it("⛔ une route `@Public()` atteinte avec une identité PRO déjà posée passe aussi, SANS lecture : le garde ne doit pas dépendre du fait que `JwtAuthGuard` n'attache rien aux routes publiques AUJOURD'HUI (le jour où il le fera, la connexion d'un Pro muni d'un Bearer ne doit pas exiger une session)", async () => {
    const m = magasin();
    await expect(garde(m.double).canActivate(contexte("publique", pro()))).resolves.toBe(true);
    expect(m.readLayer).not.toHaveBeenCalled();
    expect(m.touchSession).not.toHaveBeenCalled();
  });

  it("une requête sans identité (`request.user` absent) passe : ce garde ne juge pas l'identité, `JwtAuthGuard` l'a déjà fait", async () => {
    const m = magasin();
    await expect(garde(m.double).canActivate(contexte("ordinaire", { cookies: {} }))).resolves.toBe(true);
    expect(m.readLayer).not.toHaveBeenCalled();
  });

  it("⛔ MP-34 — un CLIENT passe SANS lecture, même avec un cookie de session : le garde ne concerne que le PRO", async () => {
    const m = magasin();
    await expect(garde(m.double).canActivate(contexte("ordinaire", { user: { userId: "u", role: "CLIENT" }, cookies: { zwadj_ss: jeton } }))).resolves.toBe(true);
    expect(m.readLayer).not.toHaveBeenCalled();
    expect(m.touchSession).not.toHaveBeenCalled();
  });

  it("⛔ MP-34 — un ADMIN passe SANS lecture", async () => {
    const m = magasin();
    await expect(garde(m.double).canActivate(contexte("ordinaire", { user: { userId: "u", role: "ADMIN" }, cookies: {} }))).resolves.toBe(true);
    expect(m.readLayer).not.toHaveBeenCalled();
  });

  it("une route `@StaffExempt()` passe pour un PRO, SANS lecture (activer, se connecter et lire l'état de session ne dépendent pas d'une session)", async () => {
    const m = magasin();
    await expect(garde(m.double).canActivate(contexte("exemptee", pro({ cookies: {} })))).resolves.toBe(true);
    expect(m.readLayer).not.toHaveBeenCalled();
    expect(m.touchSession).not.toHaveBeenCalled();
  });
});

describe("StaffSessionGuard — la couche ÉTEINTE : l'app Pro marche comme aujourd'hui (MP-35)", () => {
  it("⛔ drapeau nul : passe, et LA SEULE lecture est celle du drapeau (aucune lecture de session)", async () => {
    const m = magasin({ readLayer: vi.fn(async () => ({ proProfileId: SALLE, enabledAt: null })) });
    const requete = pro();
    await expect(garde(m.double).canActivate(contexte("ordinaire", requete))).resolves.toBe(true);
    expect(m.double.readLayer).toHaveBeenCalledTimes(1);
    expect(m.double.readLayer).toHaveBeenCalledWith(UTILISATEUR);
    expect(m.touchSession).not.toHaveBeenCalled();
    expect((requete as { staff?: unknown }).staff, "aucun contexte de personnel n'est posé").toBeUndefined();
  });

  it("un PRO sans profil (donnée incohérente) passe comme couche éteinte : le garde n'invente pas un refus que le reste de l'API n'a jamais rendu", async () => {
    const m = magasin({ readLayer: vi.fn(async () => null) });
    await expect(garde(m.double).canActivate(contexte("ordinaire", pro()))).resolves.toBe(true);
    expect(m.touchSession).not.toHaveBeenCalled();
  });
});

describe("StaffSessionGuard — la couche ACTIVÉE : une session est exigée à CHAQUE requête Pro (MP-7)", () => {
  it("⛔ sans cookie : 401 `STAFF_SESSION_REQUIRED`, et aucune lecture de session", async () => {
    const m = magasin();
    const corps = await refus(garde(m.double), contexte("ordinaire", pro({ cookies: {} })));
    expect(corps).toEqual({ code: "STAFF_SESSION_REQUIRED", message: "staff.errors.sessionRequired" });
    expect(m.touchSession).not.toHaveBeenCalled();
  });

  it("un cookie qui n'a pas la forme d'un jeton : le MÊME 401, sans requête SQL pour un déchet", async () => {
    const m = magasin();
    const corps = await refus(garde(m.double), contexte("ordinaire", pro({ cookies: { zwadj_ss: "pas-un-jeton" } })));
    expect(corps).toEqual({ code: "STAFF_SESSION_REQUIRED", message: "staff.errors.sessionRequired" });
    expect(m.touchSession).not.toHaveBeenCalled();
  });

  it("⛔ MP-18 — la salle vient du PROFIL du Bearer (lu à l'instant), jamais du cookie : le magasin reçoit le hachage du cookie ET l'identifiant de la salle du JWT", async () => {
    const m = magasin();
    await garde(m.double).canActivate(contexte("ordinaire", pro()));
    expect(m.touchSession).toHaveBeenCalledTimes(1);
    expect(m.touchSession).toHaveBeenCalledWith({ tokenHash: sha256(jeton), proProfileId: SALLE });
  });

  it("le jeton n'est JAMAIS transmis en clair au magasin (seul son SHA-256 voyage : « seul le SHA-256 est en base »)", async () => {
    const m = magasin();
    await garde(m.double).canActivate(contexte("ordinaire", pro()));
    const appel = JSON.stringify(m.touchSession.mock.calls);
    expect(appel).not.toContain(jeton);
  });

  it("une session vivante : le garde passe et POSE le contexte du personnel sur la requête (le contrôleur et l'audit le lisent)", async () => {
    const m = magasin();
    const requete = pro();
    await expect(garde(m.double).canActivate(contexte("ordinaire", requete))).resolves.toBe(true);
    expect((requete as { staff?: unknown }).staff).toEqual({
      sessionId: "s1",
      memberId: "m1",
      role: "MANAGER",
      accountName: "Amine",
      mustChangePassword: false,
      proProfileId: SALLE
    });
  });

  it("⛔ session refusée par le magasin (inactive, plafond, autre salle, désactivée, terminée) : 401 `STAFF_SESSION_REQUIRED` — la MÊME réponse, aucune raison", async () => {
    const m = magasin({ touchSession: vi.fn(async () => ({ ok: false as const })) });
    const corps = await refus(garde(m.double), contexte("ordinaire", pro()));
    expect(corps).toEqual({ code: "STAFF_SESSION_REQUIRED", message: "staff.errors.sessionRequired" });
  });

  it("les trois refus (pas de cookie, cookie mal formé, session refusée) ont des corps IDENTIQUES à l'octet", async () => {
    const m1 = magasin();
    const m2 = magasin();
    const m3 = magasin({ touchSession: vi.fn(async () => ({ ok: false as const })) });
    const a = JSON.stringify(await refus(garde(m1.double), contexte("ordinaire", pro({ cookies: {} }))));
    const b = JSON.stringify(await refus(garde(m2.double), contexte("ordinaire", pro({ cookies: { zwadj_ss: "x" } }))));
    const c = JSON.stringify(await refus(garde(m3.double), contexte("ordinaire", pro())));
    expect(new Set([a, b, c]).size).toBe(1);
  });

  it("⛔ MP-7 — le drapeau est RELU à chaque requête, jamais gardé : deux requêtes, deux lectures (la couche activée pendant qu'un Pro est connecté prend effet à la requête suivante)", async () => {
    const lecture = vi.fn<MagasinDuGarde["readLayer"]>();
    lecture.mockResolvedValueOnce({ proProfileId: SALLE, enabledAt: null }).mockResolvedValueOnce({ proProfileId: SALLE, enabledAt: new Date("2026-11-01T10:00:00Z") });
    const m = magasin({ readLayer: lecture });
    const g = garde(m.double);
    await expect(g.canActivate(contexte("ordinaire", pro({ cookies: {} })))).resolves.toBe(true);
    await expect(g.canActivate(contexte("ordinaire", pro({ cookies: {} })))).rejects.toBeInstanceOf(UnauthorizedException);
    expect(lecture).toHaveBeenCalledTimes(2);
  });

  it("un refus du magasin n'est jamais avalé : une EXCEPTION du magasin remonte (une panne de base n'est pas « couche éteinte »)", async () => {
    const m = magasin({ touchSession: vi.fn(async () => { throw new Error("base indisponible"); }) });
    await expect(garde(m.double).canActivate(contexte("ordinaire", pro()))).rejects.toThrow("base indisponible");
  });

  it("une panne de LECTURE du drapeau remonte aussi : le garde ne tombe pas « ouvert » sur une erreur", async () => {
    const m = magasin({ readLayer: vi.fn(async () => { throw new Error("base indisponible"); }) });
    await expect(garde(m.double).canActivate(contexte("ordinaire", pro()))).rejects.toThrow("base indisponible");
  });
});

// ── LES CAPACITÉS (R-2, D354) ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const CAPACITE_REFUSEE = { code: "STAFF_CAPABILITY_DENIED", message: "staff.errors.capabilityDenied" };

async function refusCapacite(g: StaffSessionGuard, ctx: ExecutionContext): Promise<unknown> {
  try {
    await g.canActivate(ctx);
  } catch (e) {
    expect(e instanceof ForbiddenException, "le refus de capacité est un 403 (ForbiddenException)").toBe(true);
    return (e as ForbiddenException).getResponse();
  }
  return expect.fail("le garde devait refuser (403)");
}
const employe = () => magasin({ touchSession: vi.fn(async () => ({ ok: true as const, session: vue({ role: "EMPLOYEE" }) })) });
const methode = (m: string) => pro({ method: m });

describe("StaffSessionGuard — la CAPACITÉ de l'employé, lue sur la route et la méthode (R-2, S-107, consigne § 1 c)", () => {
  it("⛔ une route déclarée `salle` : l'employé LIT (GET) et le contexte est posé ; il ÉCRIT (POST, PATCH, DELETE) → 403 `STAFF_CAPABILITY_DENIED`", async () => {
    await expect(garde(employe().double).canActivate(contexte("declareeSalle", methode("GET")))).resolves.toBe(true);
    for (const m of ["POST", "PATCH", "DELETE"]) {
      expect(await refusCapacite(garde(employe().double), contexte("declareeSalle", methode(m))), m).toEqual(CAPACITE_REFUSEE);
    }
  });

  it("une route déclarée `agenda` : l'employé écrit (POST, DELETE) comme il lit", async () => {
    for (const m of ["GET", "POST", "DELETE"]) await expect(garde(employe().double).canActivate(contexte("declareeAgenda", methode(m))), m).resolves.toBe(true);
  });

  it("⛔ S-107 — une route SANS déclaration : l'employé LIT (GET) et n'ÉCRIT pas (POST → 403) ; le MANAGER écrit", async () => {
    await expect(garde(employe().double).canActivate(contexte("ordinaire", methode("GET")))).resolves.toBe(true);
    expect(await refusCapacite(garde(employe().double), contexte("ordinaire", methode("POST")))).toEqual(CAPACITE_REFUSEE);
    await expect(garde(magasin().double).canActivate(contexte("ordinaire", methode("POST")))).resolves.toBe(true);
  });

  it("⛔ le rôle est celui de la SESSION du membre (le magasin), jamais un champ de la requête : un `role: MANAGER` glissé dans la requête ne change rien pour un employé", async () => {
    const requete = pro({ method: "POST", role: "MANAGER", staff: { role: "MANAGER" }, body: { role: "MANAGER" } });
    expect(await refusCapacite(garde(employe().double), contexte("declareeSalle", requete))).toEqual(CAPACITE_REFUSEE);
  });

  it("la route du MEMBRE sur sa propre session (`@StaffAnyMember()`) passe pour un employé, en POST : se déconnecter, changer son mot de passe", async () => {
    await expect(garde(employe().double).canActivate(contexte("duMembre", methode("POST")))).resolves.toBe(true);
  });

  it("le garde ne lit RIEN de plus pour décider : une lecture du drapeau, une prolongation de session — pas une seconde requête pour le rôle ou la capacité", async () => {
    const m = employe();
    await garde(m.double).canActivate(contexte("declareeSalle", methode("GET")));
    expect(m.readLayer).toHaveBeenCalledTimes(1);
    expect(m.touchSession).toHaveBeenCalledTimes(1);
  });
});

describe("StaffSessionGuard — S-104 : le mot de passe À CHANGER n'ouvre que le changement de mot de passe (R-3), jugé à l'HEURE DE LA BASE", () => {
  const SESSION_A_CHANGER = vue({ mustChangePassword: true, passwordExpiresAt: new Date("2026-11-26T10:00:00.000Z") }); // un temporaire de 7 jours, intact
  const aChanger = (surcharge: Partial<StaffSessionView> = {}) => magasin({ touchSession: vi.fn(async () => ({ ok: true as const, session: { ...SESSION_A_CHANGER, ...surcharge } })) });

  it("⛔ un temporaire (must_change_password) : TOUTE route autre que celle du membre est refusée 403 — une lecture, une écriture, même au MANAGER, même sur une capacité déclarée", async () => {
    for (const nom of ["ordinaire", "declareeAgenda", "declareeSalle"] as const) {
      for (const m of ["GET", "POST"]) {
        expect(await refusCapacite(garde(aChanger().double), contexte(nom, methode(m))), `${nom} ${m}`).toEqual(CAPACITE_REFUSEE);
      }
    }
  });

  it("⛔ …et la route du membre (changer son mot de passe, se déconnecter) PASSE, avec un contexte qui dit `mustChangePassword: true`", async () => {
    const requete = methode("POST");
    await expect(garde(aChanger().double).canActivate(contexte("duMembre", requete))).resolves.toBe(true);
    expect((requete as { staff?: { mustChangePassword?: boolean } }).staff?.mustChangePassword).toBe(true);
  });

  it("⛔ un mot de passe ORDINAIRE de 90 jours EXPIRÉ (must_change_password FAUX) est dans le même état : la connexion est admise, mais TOUTE autre route est refusée", async () => {
    const expire = aChanger({ mustChangePassword: false, passwordExpiresAt: new Date("2026-11-19T09:59:59.999Z") });
    expect(await refusCapacite(garde(expire.double), contexte("ordinaire", methode("GET")))).toEqual(CAPACITE_REFUSEE);
    const requete = methode("POST");
    await expect(garde(expire.double).canActivate(contexte("duMembre", requete))).resolves.toBe(true);
    expect((requete as { staff?: { mustChangePassword?: boolean } }).staff?.mustChangePassword).toBe(true);
  });

  it("⛔ l'échéance INCLUSE : un mot de passe qui expire à l'instant exact de la base est déjà à changer ; une milliseconde de plus, il est actif", async () => {
    const alInstant = aChanger({ mustChangePassword: false, passwordExpiresAt: new Date(HEURE_BASE.getTime()) });
    expect(await refusCapacite(garde(alInstant.double), contexte("ordinaire", methode("GET")))).toEqual(CAPACITE_REFUSEE);
    const apres = aChanger({ mustChangePassword: false, passwordExpiresAt: new Date(HEURE_BASE.getTime() + 1) });
    await expect(garde(apres.double).canActivate(contexte("ordinaire", methode("GET")))).resolves.toBe(true);
  });

  it("⛔ MP-41 — l'heure est celle de la BASE, jamais celle de l'API : une échéance dans le futur de l'horloge réelle mais dans le passé de l'heure de la base est EXPIRÉE ; l'inverse est valable", async () => {
    const futurReel = new Date("2099-01-01T00:00:00.000Z");
    const baseApres = aChanger({ mustChangePassword: false, passwordExpiresAt: futurReel, now: new Date("2099-06-01T00:00:00.000Z") });
    expect(await refusCapacite(garde(baseApres.double), contexte("ordinaire", methode("GET")))).toEqual(CAPACITE_REFUSEE);
    const passeReel = new Date("2020-01-01T00:00:00.000Z");
    const baseAvant = aChanger({ mustChangePassword: false, passwordExpiresAt: passeReel, now: new Date("2019-06-01T00:00:00.000Z") });
    await expect(garde(baseAvant.double).canActivate(contexte("ordinaire", methode("GET")))).resolves.toBe(true);
  });

  it("⛔ un TEMPORAIRE EXPIRÉ n'a pas de session : 401 `STAFF_SESSION_REQUIRED` — le MÊME corps que tout autre refus de session, même sur la route du membre (« le Manager doit en refaire un »)", async () => {
    const mort = aChanger({ mustChangePassword: true, passwordExpiresAt: new Date(HEURE_BASE.getTime()) });
    const corps = await refus(garde(mort.double), contexte("duMembre", methode("POST")));
    expect(corps).toEqual({ code: "STAFF_SESSION_REQUIRED", message: "staff.errors.sessionRequired" });
    const sansCookie = await refus(garde(magasin().double), contexte("ordinaire", pro({ cookies: {} })));
    expect(JSON.stringify(corps)).toBe(JSON.stringify(sansCookie));
  });

  it("⛔ AUCUN refus ne dit pourquoi : le refus de capacité d'un EMPLOYÉ et celui du mot de passe à changer ont le MÊME corps à l'octet", async () => {
    const parRole = JSON.stringify(await refusCapacite(garde(employe().double), contexte("declareeSalle", methode("POST"))));
    const parEtat = JSON.stringify(await refusCapacite(garde(aChanger().double), contexte("ordinaire", methode("GET"))));
    expect(parRole).toBe(parEtat);
  });
});

describe("la cible du spec est sans effet de bord", () => {
  it("les décorateurs réels posent bien leurs métadonnées (sinon les cas ci-dessus mesureraient une cible muette)", () => {
    expect(new Reflector().get<boolean>("zwadj:isPublic", Cible.prototype.publique)).toBe(true);
    expect(new Reflector().get<boolean>("zwadj:staffExempt", Cible.prototype.exemptee)).toBe(true);
    expect(new Reflector().get<boolean>("zwadj:staffExempt", Cible.prototype.ordinaire)).toBeUndefined();
    expect(new Reflector().get<string>("zwadj:staffCapability", Cible.prototype.declareeSalle)).toBe("salle");
    expect(new Reflector().get<string>("zwadj:staffCapability", Cible.prototype.declareeAgenda)).toBe("agenda");
    expect(new Reflector().get<boolean>("zwadj:staffAnyMember", Cible.prototype.duMembre)).toBe(true);
    expect(new Reflector().get<string>("zwadj:staffCapability", Cible.prototype.ordinaire)).toBeUndefined();
    expect(cible).toBeInstanceOf(Cible);
  });
});
