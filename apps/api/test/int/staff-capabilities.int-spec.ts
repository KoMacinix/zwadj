/**
 * LES CAPACITÉS DE L'EMPLOYÉ, DÉRIVÉES DU ROUTEUR — rang 56, L36-3a-2 (D354, R-2, R-3, S-104, S-107, MP-14, MP-21, MP-32). PostgreSQL RÉEL.
 *
 * ⚠ LA LISTE DES ROUTES EST DÉRIVÉE DU ROUTEUR, JAMAIS ÉCRITE À LA MAIN (D119) : une route Pro ajoutée demain est jouée ici le jour même avec une session d'EMPLOYÉ, sans toucher à ce fichier. Ce qu'on en
 * attend se DÉRIVE de l'AUTORITÉ — la table des capacités de `@zwadj/types` (jamais une liste recopiée ici), la capacité DÉCLARÉE lue sur la route là où le garde la lit, la méthode HTTP :
 *   · une route déclarée : `peut(EMPLOYEE, capacité, lire|écrire)` ;
 *   · une route sans déclaration (S-107) : les LECTURES passent, les écritures sont refusées ;
 *   · une route exemptée, ou celle du membre sur sa propre session : jamais refusée pour une capacité.
 * ⛔ Cette dérivation vérifie le CÂBLAGE (le garde lit bien la méthode, la déclaration, le rôle de la SESSION). Le contenu de la règle, lui, est tenu par le second oracle de ce fichier : les cas NOMMÉS, écrits
 * d'après la consigne (§ 1 c) — l'employé « peut l'agenda, les demandes, les devis, les clients et les réservations ; il LIT la salle, les prix et les prestations sans les changer ; il ne touche ni au personnel
 * ni au compte » — qui ne passent par aucune fonction du code.
 * ⚠ Ces requêtes atteignent de vraies routes avec des identifiants inventés (comme `rbac-all-routes.int-spec.ts`) : sur la base de test, jetable, leurs effets sont sans conséquence. Un refus de capacité se lit
 * sur le STATUT 403 ET le CODE `STAFF_CAPABILITY_DENIED` ; toute autre réponse (200, 400, 404, 409…) signifie « le garde a laissé passer ».
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { STAFF_CAPABILITIES, STAFF_ERROR_MESSAGE_KEYS, StaffCapability, StaffErrorCode, StaffRole, peut } from "@zwadj/types";
import { createTestApp, truncateAll, type TestContext } from "./helpers";
import { collectRoutes, routesDuPro, signature, withIds, type RouteEntry } from "./route-collector";
import { Jar, MOT_DE_PASSE_MEMBRE, appeler, codeDe, connecter, creerMembre, membreActif, proActive } from "./staff-helpers";

let ctx: TestContext;
let routesPro: RouteEntry[];
let salle: Awaited<ReturnType<typeof proActive>>;
let employe: { id: string; jar: Jar; password: string };
let aChanger: { jar: Jar; temporaire: string };

/** Le cas qui ne se rejoue pas tel quel : se déconnecter TERMINE la session, qui sert aux autres requêtes de la boucle. */
const TERMINE_LA_SESSION = new Set(["POST /api/v1/pro/staff/logout"]);

beforeAll(async () => {
  ctx = await createTestApp();
  routesPro = routesDuPro(collectRoutes(ctx.app));
  await truncateAll(ctx.prisma);
  salle = await proActive(ctx);
  employe = await membreActif(ctx, salle.pro, salle.jar, "Employe");
  const neuf = await creerMembre(ctx, salle.pro, salle.jar, "Nouveau");
  const jar = new Jar();
  expect((await connecter(ctx, salle.pro, jar, "Nouveau", neuf.temporaryPassword)).status).toBe(200);
  aChanger = { jar, temporaire: neuf.temporaryPassword };
});
afterAll(async () => {
  await ctx.app.close();
});

const refuseParCapacite = (res: { status: number; body: unknown }): boolean => res.status === 403 && (res.body as { message?: { code?: string } }).message?.code === StaffErrorCode.STAFF_CAPABILITY_DENIED;

async function toutesLesRoutes(jar: Jar, filtre: (r: RouteEntry) => boolean = () => true): Promise<Array<{ route: RouteEntry; res: Awaited<ReturnType<typeof appeler>> }>> {
  const sorties = [];
  for (const route of routesPro.filter(filtre)) sorties.push({ route, res: await appeler(ctx, salle.pro.token, jar, route.method, withIds(route.path)) });
  return sorties;
}

/** Ce que la TABLE, la déclaration et la méthode disent d'une route pour un EMPLOYÉ : « permise » ou non. Dérivé de l'autorité, jamais d'une liste. */
function permisePourUnEmploye(route: RouteEntry): boolean {
  if (route.staffExempt || route.staffAnyMember) return true;
  const acte = route.method === "get" ? "read" : "write";
  if (route.staffCapability === undefined) return acte === "read"; // S-107 : sans déclaration, les lectures à tous, les écritures au Manager seul
  return peut(StaffRole.EMPLOYEE, route.staffCapability as StaffCapability, acte);
}

describe("le collecteur — garde-fou du garde-fou", () => {
  it("l'extraction trouve la matrice attendue : au moins 60 routes atteignables par un PRO, dont les QUATRE routes du personnel de ce lot ; au moins 14 portent une capacité déclarée ; sans cela tout ce qui suit passerait sur une liste vide", () => {
    expect(routesPro.length).toBeGreaterThanOrEqual(60);
    const sigs = routesPro.map(signature);
    for (const attendue of [
      "GET /api/v1/pro/staff/members",
      "POST /api/v1/pro/staff/members",
      "POST /api/v1/pro/staff/members/:id/reset-password",
      "POST /api/v1/pro/staff/members/:id/disable"
    ]) {
      expect(sigs, attendue).toContain(attendue);
    }
    expect(routesPro.filter((r) => r.staffCapability !== undefined).length).toBeGreaterThanOrEqual(14);
  });

  it("toute capacité DÉCLARÉE par une route existe dans la table des capacités (une faute de frappe refuserait la route à tout le monde, y compris au MANAGER)", () => {
    const connues = new Set<string>(Object.keys(STAFF_CAPABILITIES));
    const inconnues = routesPro.filter((r) => r.staffCapability !== undefined && !connues.has(r.staffCapability)).map((r) => `${signature(r)} → ${r.staffCapability}`);
    expect(inconnues).toEqual([]);
  });

  it("⛔ la route du MEMBRE sur sa propre session est une liste FERMÉE dérivée du routeur : se déconnecter et changer son mot de passe — rien d'autre", () => {
    expect(routesPro.filter((r) => r.staffAnyMember).map(signature).sort()).toEqual(["POST /api/v1/pro/staff/logout", "POST /api/v1/pro/staff/password"]);
  });
});

describe("une session d'EMPLOYÉ sur TOUTES les routes atteignables par un PRO (MP-21, MP-32)", () => {
  it("⛔ pour chaque route : refusée par capacité SI ET SEULEMENT SI la table, la déclaration et la méthode le disent — une écriture non permise, un `GET` sur `personnel` ou `compte`", async () => {
    const reponses = await toutesLesRoutes(employe.jar, (r) => !TERMINE_LA_SESSION.has(signature(r)));
    const mal = reponses.filter((r) => refuseParCapacite(r.res) === permisePourUnEmploye(r.route)).map((r) => `${signature(r.route)} → ${r.res.status} ${codeDe(r.res) ?? ""} (permise : ${permisePourUnEmploye(r.route)}, déclarée : ${r.route.staffCapability ?? "aucune"})`);
    expect(mal, `routes mal gardées :\n${mal.join("\n")}`).toEqual([]);
    const refusees = reponses.filter((r) => refuseParCapacite(r.res)).length;
    expect(refusees, "le garde a réellement refusé des routes à l'employé").toBeGreaterThanOrEqual(15);
    expect(reponses.length - refusees, "le garde a réellement LAISSÉ PASSER des routes").toBeGreaterThanOrEqual(20);
  });

  it("⛔ AUCUN refus ne dit pourquoi : TOUS les refus de capacité de l'employé ont le MÊME corps (même code, même clé de message), quelle que soit la route", async () => {
    const reponses = await toutesLesRoutes(employe.jar, (r) => !TERMINE_LA_SESSION.has(signature(r)));
    const corps = new Set(reponses.filter((r) => refuseParCapacite(r.res)).map((r) => JSON.stringify({ s: r.res.status, m: (r.res.body as { message: unknown }).message })));
    expect([...corps]).toEqual([JSON.stringify({ s: 403, m: { code: StaffErrorCode.STAFF_CAPABILITY_DENIED, message: STAFF_ERROR_MESSAGE_KEYS.STAFF_CAPABILITY_DENIED } })]);
  });

  it("⛔ le MANAGER n'est refusé par capacité sur AUCUNE route (la déconnexion, qui termine sa session, est jouée à part)", async () => {
    const reponses = await toutesLesRoutes(salle.jar, (r) => !TERMINE_LA_SESSION.has(signature(r)));
    const refusees = reponses.filter((r) => refuseParCapacite(r.res)).map((r) => signature(r.route));
    expect(refusees, `routes refusées au Manager :\n${refusees.join("\n")}`).toEqual([]);
  });
});

describe("les CAS NOMMÉS de la consigne (§ 1 c) — second oracle, qui ne passe par aucune fonction du code", () => {
  const V = "00000000-0000-7000-8000-00000000000a";
  const ECRITURES_REFUSEES: Array<[string, "post" | "patch" | "delete", string]> = [
    ["la salle : modifier", "patch", `/api/v1/venues/${V}`],
    ["la salle : supprimer", "delete", `/api/v1/venues/${V}`],
    ["la salle : créer", "post", "/api/v1/venues"],
    ["les photos de la salle", "post", `/api/v1/venues/${V}/photos`],
    ["les créneaux de la salle", "post", `/api/v1/venues/${V}/slot-templates`],
    ["les PLAGES DE VISITE (du côté « salle », consigne § 1 c)", "post", `/api/v1/venues/${V}/visit-availabilities`],
    ["les prix", "post", `/api/v1/venues/${V}/slot-templates/${V}/pricing-rules`],
    ["les prestations : créer", "post", `/api/v1/venues/${V}/services`],
    ["les prestations : modifier", "patch", `/api/v1/services/${V}`],
    ["le personnel : créer un membre", "post", "/api/v1/pro/staff/members"],
    ["le personnel : réinitialiser", "post", `/api/v1/pro/staff/members/${V}/reset-password`],
    ["le personnel : désactiver", "post", `/api/v1/pro/staff/members/${V}/disable`],
    ["le compte commun : le profil", "patch", "/api/v1/me/profile"],
    ["le compte commun : l'adresse e-mail", "post", "/api/v1/me/change-email"],
    ["le compte commun : demander la suppression du compte", "post", "/api/v1/me/deletion-request"]
  ];
  const LECTURES_REFUSEES: Array<[string, string]> = [
    ["le personnel : LIRE la liste (« ni l'un ni l'autre »)", "/api/v1/pro/staff/members"],
    ["le compte commun : LIRE la demande de suppression", "/api/v1/me/deletion-request"]
  ];
  const PERMISES: Array<[string, "get" | "post" | "delete", string]> = [
    ["la salle : LIRE ses salles", "get", "/api/v1/pro/venues"],
    ["la salle : LIRE une salle", "get", `/api/v1/pro/venues/${V}`],
    ["la salle : LIRE l'état de publication (D349, une lecture)", "get", `/api/v1/pro/venues/${V}/publication`],
    ["les prestations : LIRE", "get", `/api/v1/pro/venues/${V}/services`],
    ["les plages de visite : LIRE", "get", `/api/v1/pro/venues/${V}/visit-availabilities`],
    ["l'agenda : LIRE", "get", `/api/v1/pro/venues/${V}/availability`],
    ["l'agenda : bloquer une date", "post", `/api/v1/venues/${V}/availability-blocks`],
    ["l'agenda : débloquer une date", "delete", `/api/v1/venues/${V}/availability-blocks/${V}`],
    ["les demandes : LIRE", "get", `/api/v1/pro/venues/${V}/bookings`],
    ["les demandes : accepter", "post", `/api/v1/pro/bookings/${V}/accept`],
    ["les demandes : refuser", "post", `/api/v1/pro/bookings/${V}/decline`],
    ["les rendez-vous de visite : LIRE", "get", `/api/v1/pro/venues/${V}/visit-bookings`],
    ["les rendez-vous de visite : annuler", "delete", `/api/v1/pro/venues/${V}/visit-bookings/${V}`],
    ["les devis : LIRE", "get", `/api/v1/pro/venues/${V}/quotes`],
    ["les devis : créer", "post", `/api/v1/venues/${V}/quotes`],
    ["les devis : convertir en réservation", "post", `/api/v1/quotes/${V}/convert`],
    ["les devis : le document PDF", "get", `/api/v1/quotes/${V}/document`],
    ["les clients : chercher une fiche", "post", "/api/v1/pro/clients/lookup"],
    ["les clients : créer une fiche", "post", "/api/v1/pro/clients"]
  ];

  it.each(ECRITURES_REFUSEES)("⛔ l'employé ne peut PAS — %s : 403 `STAFF_CAPABILITY_DENIED`", async (_nom, methode, chemin) => {
    const res = await appeler(ctx, salle.pro.token, employe.jar, methode, chemin);
    expect([res.status, codeDe(res)]).toEqual([403, StaffErrorCode.STAFF_CAPABILITY_DENIED]);
  });

  it.each(LECTURES_REFUSEES)("⛔ l'employé ne LIT même pas — %s : 403 `STAFF_CAPABILITY_DENIED`", async (_nom, chemin) => {
    const res = await appeler(ctx, salle.pro.token, employe.jar, "get", chemin);
    expect([res.status, codeDe(res)]).toEqual([403, StaffErrorCode.STAFF_CAPABILITY_DENIED]);
  });

  it.each(PERMISES)("l'employé PEUT — %s : le garde laisse passer (jamais `STAFF_CAPABILITY_DENIED`)", async (_nom, methode, chemin) => {
    const res = await appeler(ctx, salle.pro.token, employe.jar, methode, chemin);
    expect(refuseParCapacite(res), `${methode.toUpperCase()} ${chemin} → ${res.status} ${codeDe(res) ?? ""}`).toBe(false);
  });

  it("le MANAGER, lui, passe partout où l'employé est refusé (la capacité est une affaire de RÔLE, pas de route)", async () => {
    for (const [nom, methode, chemin] of ECRITURES_REFUSEES) {
      const res = await appeler(ctx, salle.pro.token, salle.jar, methode, chemin);
      expect(refuseParCapacite(res), nom).toBe(false);
    }
    for (const [nom, chemin] of LECTURES_REFUSEES) expect(refuseParCapacite(await appeler(ctx, salle.pro.token, salle.jar, "get", chemin)), nom).toBe(false);
  });

  it("une lecture RÉELLE aboutit pour l'employé : `GET /pro/venues` rend 200 et une liste (la salle d'un PRO neuf est vide), comme pour le Manager", async () => {
    const res = await appeler(ctx, salle.pro.token, employe.jar, "get", "/api/v1/pro/venues");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe("S-104 — l'état « mot de passe à changer » n'ouvre que le changement de mot de passe, sur TOUTES les routes (MP-14)", () => {
  it("⛔ une session « à changer » (le temporaire d'un membre neuf) : TOUTE route atteignable par un PRO est refusée 403 `STAFF_CAPABILITY_DENIED`, SAUF les routes exemptées et celles du membre (se déconnecter, changer son mot de passe) — dérivé du routeur", async () => {
    const reponses = await toutesLesRoutes(aChanger.jar, (r) => !TERMINE_LA_SESSION.has(signature(r)));
    const mal = reponses
      .filter((r) => refuseParCapacite(r.res) === (r.route.staffExempt || r.route.staffAnyMember))
      .map((r) => `${signature(r.route)} → ${r.res.status} ${codeDe(r.res) ?? ""}`);
    expect(mal, `routes mal gardées en état « à changer » :\n${mal.join("\n")}`).toEqual([]);
    expect(reponses.filter((r) => refuseParCapacite(r.res)).length, "le garde a réellement refusé des routes").toBeGreaterThanOrEqual(50);
  });

  it("l'état de session dit `mustChangePassword: true` (c'est ce que l'écran lira pour afficher le seul changement de mot de passe) ; le compte commun reste lisible (`GET /auth/me` est exemptée)", async () => {
    const etat = await appeler(ctx, salle.pro.token, aChanger.jar, "get", "/api/v1/pro/staff/session");
    expect(etat.status).toBe(200);
    expect((etat.body as { member: { mustChangePassword: boolean } }).member.mustChangePassword).toBe(true);
    expect((await appeler(ctx, salle.pro.token, aChanger.jar, "get", "/api/v1/auth/me")).status).toBe(200);
  });

  it("⛔ le MÊME corps de refus que le refus de capacité d'un employé (aucun refus ne dit pourquoi) ; et changer son mot de passe suffit à rouvrir les routes permises", async () => {
    const parEtat = await appeler(ctx, salle.pro.token, aChanger.jar, "get", "/api/v1/pro/venues");
    const parRole = await appeler(ctx, salle.pro.token, employe.jar, "post", "/api/v1/venues");
    expect(JSON.stringify((parEtat.body as { message: unknown }).message)).toBe(JSON.stringify((parRole.body as { message: unknown }).message));
    const change = await appeler(ctx, salle.pro.token, aChanger.jar, "post", "/api/v1/pro/staff/password", { currentPassword: aChanger.temporaire, newPassword: MOT_DE_PASSE_MEMBRE });
    expect(change.status).toBe(200);
    expect((await appeler(ctx, salle.pro.token, aChanger.jar, "get", "/api/v1/pro/venues")).status).toBe(200);
  });
});
