// Le CONTRAT du personnel — rang 44, L36-3a-1 (D341) : les durées (UN levier, MP-43), les codes d'erreur et leurs messages FR = AR (MP-39), le message de R-3 (D341) mot pour mot,
// et les schémas des corps de K-14, K-15 et K-18.
//
// ⛔ CE QUI SE CONFRONTE À L'AUTORITÉ : chaque code d'erreur est cherché dans les DEUX catalogues (jamais dans une liste de clés recopiée ici), et chaque clé `staff.validation.*` est
// DÉRIVÉE des schémas en leur donnant des entrées fautives — une clé employée par un schéma et absente d'un catalogue fait rougir ce test, quel que soit le schéma qui l'emploie.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  STAFF_DEVICE_DEFAULT_LABEL,
  STAFF_ERROR_MESSAGE_KEYS,
  STAFF_LIMITS,
  StaffErrorCode,
  StaffRole,
  StaffSessionEndReason,
  StaffStatus,
  staffActivateSchema,
  staffLoginSchema,
  staffPasswordChangeSchema
} from "@zwadj/types";

const MESSAGES_DIR = join(process.cwd(), "..", "..", "packages", "i18n", "messages");
type Tree = { [key: string]: string | Tree };
const catalogue = (locale: "fr" | "ar"): Tree => JSON.parse(readFileSync(join(MESSAGES_DIR, `${locale}.json`), "utf8")) as Tree;
function lire(tree: Tree, chemin: string): string | undefined {
  let courant: string | Tree | undefined = tree;
  for (const segment of chemin.split(".")) {
    if (courant === undefined || typeof courant === "string") return undefined;
    courant = courant[segment];
  }
  return typeof courant === "string" ? courant : undefined;
}
const FR = catalogue("fr");
const AR = catalogue("ar");

describe("STAFF_LIMITS — UN levier pour toutes les durées (MP-43, DR5)", () => {
  it("DR5 : inactivité 10 minutes, plafond de session 12 h, pause de 15 minutes après 5 échecs, mot de passe 90 jours, PIN 90 jours", () => {
    expect(STAFF_LIMITS.IDLE_TIMEOUT_MINUTES).toBe(10);
    expect(STAFF_LIMITS.SESSION_MAX_HOURS).toBe(12);
    expect(STAFF_LIMITS.PASSWORD_PAUSE_MINUTES).toBe(15);
    expect(STAFF_LIMITS.PASSWORD_MAX_FAILURES).toBe(5);
    expect(STAFF_LIMITS.PASSWORD_VALIDITY_DAYS).toBe(90);
    expect(STAFF_LIMITS.PIN_VALIDITY_DAYS).toBe(90);
  });

  it("R-6 (D341) — l'échéance d'un appareil est la durée du PIN, « même paramètre » : il n'existe AUCUN second paramètre de durée d'appareil (elle ne pourrait que dériver)", () => {
    expect(Object.keys(STAFF_LIMITS).sort()).toEqual(
      ["DEVICE_COOKIES_MAX", "IDLE_TIMEOUT_MINUTES", "PASSWORD_MAX_FAILURES", "PASSWORD_PAUSE_MINUTES", "PASSWORD_VALIDITY_DAYS", "PIN_VALIDITY_DAYS", "SESSION_MAX_HOURS"].sort()
    );
  });

  it("la borne de lecture des cookies d'appareil est 8 (cadrage, § 2.2) ; l'objet est figé (aucun appelant ne le modifie)", () => {
    expect(STAFF_LIMITS.DEVICE_COOKIES_MAX).toBe(8);
    expect(Object.isFrozen(STAFF_LIMITS)).toBe(true);
  });

  it("le libellé d'un appareil est une constante (« Poste ») : aucun texte du navigateur n'est jamais reflété", () => {
    expect(STAFF_DEVICE_DEFAULT_LABEL).toBe("Poste");
  });
});

describe("les énumérations du personnel suivent le schéma ratifié (tranche [L36-3], D186)", () => {
  it("StaffRole = MANAGER, EMPLOYEE ; StaffStatus = ACTIVE, DISABLED ; fins de session = IDLE, LOGOUT, DISABLED, PASSWORD_CHANGED, PIN_LOCKED", () => {
    expect(Object.values(StaffRole).sort()).toEqual(["EMPLOYEE", "MANAGER"]);
    expect(Object.values(StaffStatus).sort()).toEqual(["ACTIVE", "DISABLED"]);
    expect(Object.values(StaffSessionEndReason).sort()).toEqual(["DISABLED", "IDLE", "LOGOUT", "PASSWORD_CHANGED", "PIN_LOCKED"]);
  });
});

describe("les codes d'erreur du personnel — messages FR = AR (MP-39)", () => {
  it("l'ensemble des codes est celui du lot ; ⛔ R-3 (D341) : AUCUN code de pause (`STAFF_LOGIN_PAUSED` est la décision S-103, REFUSÉE)", () => {
    expect(Object.values(StaffErrorCode).sort()).toEqual(
      [
        "STAFF_ACCOUNT_NAME_TAKEN",
        "STAFF_ALREADY_ACTIVATED",
        "STAFF_CURRENT_PASSWORD_INVALID",
        "STAFF_EMAIL_NOT_VERIFIED",
        "STAFF_INVALID_CREDENTIALS",
        "STAFF_PASSWORD_COMMON",
        "STAFF_PASSWORD_REUSED",
        "STAFF_SESSION_REQUIRED"
      ].sort()
    );
    expect(Object.values(StaffErrorCode)).not.toContain("STAFF_LOGIN_PAUSED");
  });

  it("chaque code a une clé de message, et cette clé existe, non vide, dans le catalogue FRANÇAIS ET dans le catalogue ARABE", () => {
    for (const code of Object.values(StaffErrorCode)) {
      const cle = STAFF_ERROR_MESSAGE_KEYS[code];
      expect(cle, `clé du code ${code}`).toMatch(/^staff\.errors\.[a-zA-Z]+$/);
      expect(lire(FR, cle)?.trim(), `${cle} (fr)`).toBeTruthy();
      expect(lire(AR, cle)?.trim(), `${cle} (ar)`).toBeTruthy();
    }
  });

  it("deux codes n'ont jamais la même clé (un message partagé confondrait deux refus)", () => {
    const cles = Object.values(STAFF_ERROR_MESSAGE_KEYS);
    expect(new Set(cles).size).toBe(cles.length);
  });

  it("⛔ R-3 (D341) — le message UNIQUE de la connexion refusée dit les deux causes, mot pour mot en français, et porte la DURÉE DU LEVIER dans les deux langues", () => {
    const cle = STAFF_ERROR_MESSAGE_KEYS[StaffErrorCode.STAFF_INVALID_CREDENTIALS];
    expect(lire(FR, cle)).toBe("Nom de compte ou mot de passe incorrect. Après plusieurs échecs, la connexion est suspendue 15 minutes.");
    const minutes = String(STAFF_LIMITS.PASSWORD_PAUSE_MINUTES);
    expect(lire(FR, cle)).toContain(minutes);
    expect(lire(AR, cle), "la version arabe cite la même durée, en chiffres ASCII (un test peut la relire)").toContain(minutes);
  });

  it("aucune clé de pause n'existe dans les catalogues (S-103 refusée : la pause répond comme un mauvais mot de passe)", () => {
    expect(lire(FR, "staff.errors.loginPaused")).toBeUndefined();
    expect(lire(AR, "staff.errors.loginPaused")).toBeUndefined();
  });

  it("le message de la session requise ne dit ni « expirée » ni « révoquée » : il ne donne aucune raison (un 401 par cause serait un oracle)", () => {
    const cle = STAFF_ERROR_MESSAGE_KEYS[StaffErrorCode.STAFF_SESSION_REQUIRED];
    expect(lire(FR, cle)).not.toMatch(/expir|révoqu|désactiv/i);
  });
});

describe("les clés `staff.validation.*` employées par les schémas existent dans les DEUX catalogues (dérivées des schémas, jamais recopiées)", () => {
  const entreesFautives: ReadonlyArray<readonly [string, { safeParse: (v: unknown) => { success: boolean; error?: { issues: { message: string }[] } } }, unknown]> = [
    ["activation, corps vide", staffActivateSchema, {}],
    ["activation, nom trop court", staffActivateSchema, { accountName: "a", password: "Motdepasse1" }],
    ["activation, nom trop long", staffActivateSchema, { accountName: "a".repeat(41), password: "Motdepasse1" }],
    ["activation, nom invalide", staffActivateSchema, { accountName: "<b>", password: "Motdepasse1" }],
    ["activation, clé inconnue", staffActivateSchema, { accountName: "Amine", password: "Motdepasse1", role: "MANAGER" }],
    ["connexion, corps vide", staffLoginSchema, {}],
    ["connexion, mot de passe vide", staffLoginSchema, { accountName: "Amine", password: "" }],
    ["connexion, clé inconnue", staffLoginSchema, { accountName: "Amine", password: "x", rememberMe: true }],
    ["changement, corps vide", staffPasswordChangeSchema, {}],
    ["changement, mot de passe actuel vide", staffPasswordChangeSchema, { currentPassword: "", newPassword: "Motdepasse1" }],
    ["changement, clé inconnue", staffPasswordChangeSchema, { currentPassword: "x", newPassword: "Motdepasse1", extra: 1 }]
  ];

  it("chaque entrée fautive est refusée ET chaque message est une clé présente en FR et en AR", () => {
    const cles = new Set<string>();
    for (const [nom, schema, entree] of entreesFautives) {
      const r = schema.safeParse(entree);
      expect(r.success, nom).toBe(false);
      for (const issue of r.error?.issues ?? []) cles.add(issue.message);
    }
    expect(cles.size, "les entrées fautives doivent produire des clés (sinon ce test ne mesure rien)").toBeGreaterThanOrEqual(6);
    for (const cle of cles) {
      expect(lire(FR, cle)?.trim(), `${cle} (fr)`).toBeTruthy();
      expect(lire(AR, cle)?.trim(), `${cle} (ar)`).toBeTruthy();
    }
  });

  it("TOUTES les clés `staff.*` des catalogues existent des deux côtés (parité propre au personnel, en plus de la parité globale)", () => {
    const aplatir = (t: Tree, prefixe: string, out: string[]): string[] => {
      for (const [k, v] of Object.entries(t)) {
        if (typeof v === "string") out.push(`${prefixe}${k}`);
        else aplatir(v, `${prefixe}${k}.`, out);
      }
      return out;
    };
    const fr = aplatir((FR.staff ?? {}) as Tree, "staff.", []).sort();
    const ar = aplatir((AR.staff ?? {}) as Tree, "staff.", []).sort();
    expect(fr.length, "le namespace `staff` existe").toBeGreaterThan(8);
    expect(ar).toEqual(fr);
  });
});

describe("staffActivateSchema — K-14 : le nom de compte et le mot de passe du Manager, rien d'autre", () => {
  it("accepte un corps valide et rend le nom rogné", () => {
    const r = staffActivateSchema.safeParse({ accountName: " Amine ", password: "Motdepasse1" });
    expect(r.success && r.data).toEqual({ accountName: "Amine", password: "Motdepasse1" });
  });

  it("applique la politique de mot de passe EXISTANTE (`passwordSchema`) : 8 à 128 caractères, une lettre, un chiffre — avec les clés `auth.validation.*`", () => {
    const refus = (password: string) => {
      const r = staffActivateSchema.safeParse({ accountName: "Amine", password });
      return r.success ? [] : r.error.issues.map((i) => i.message);
    };
    expect(refus("court1")).toContain("auth.validation.passwordTooShort");
    expect(refus("1234567890")).toContain("auth.validation.passwordNeedsLetter");
    expect(refus("Motdepassesansfin")).toContain("auth.validation.passwordNeedsDigit");
    expect(refus("a1".repeat(65))).toContain("auth.validation.passwordTooLong");
  });

  it("refuse un rôle : K-14 crée un MANAGER, jamais un autre (une clé inconnue est refusée, pas ignorée)", () => {
    expect(staffActivateSchema.safeParse({ accountName: "Amine", password: "Motdepasse1", role: "EMPLOYEE" }).success).toBe(false);
  });

  it("⛔ un nom fait UNIQUEMENT de marques (accents, voyelles brèves) passe la forme mais se normalise en chaîne VIDE : il est refusé (`accountNameInvalid`), sinon la clé de nom serait vide", () => {
    for (const nom of ["́́", "َُ"]) {
      const r = staffActivateSchema.safeParse({ accountName: nom, password: "Motdepasse1" });
      expect(r.success, JSON.stringify(nom)).toBe(false);
      expect(r.success ? [] : r.error.issues.map((i) => i.message), JSON.stringify(nom)).toContain("staff.validation.accountNameInvalid");
    }
  });
});

describe("staffLoginSchema — K-15 : NE révèle PAS la politique de mot de passe", () => {
  it("accepte n'importe quel mot de passe NON VIDE jusqu'à 128 caractères (un mot de passe trop court se refuse à la vérification, pas à la validation)", () => {
    expect(staffLoginSchema.safeParse({ accountName: "Amine", password: "x" }).success).toBe(true);
    expect(staffLoginSchema.safeParse({ accountName: "Amine", password: "x".repeat(128) }).success).toBe(true);
    expect(staffLoginSchema.safeParse({ accountName: "Amine", password: "x".repeat(129) }).success).toBe(false);
  });

  it("n'applique PAS les bornes du nom de compte de l'activation : un nom d'un caractère se rend en 401 identique, pas en 400 (aucun oracle sur ce qui existe)", () => {
    expect(staffLoginSchema.safeParse({ accountName: "a", password: "x" }).success).toBe(true);
    expect(staffLoginSchema.safeParse({ accountName: "<b>", password: "x" }).success).toBe(true);
  });

  it("⛔ le nom de compte de la connexion a UNE borne haute (100 caractères) : une chaîne démesurée ne part pas jusqu'à la normalisation et à la base", () => {
    expect(staffLoginSchema.safeParse({ accountName: "a".repeat(100), password: "x" }).success).toBe(true);
    const r = staffLoginSchema.safeParse({ accountName: "a".repeat(101), password: "x" });
    expect(r.success).toBe(false);
    expect(r.success ? [] : r.error.issues.map((i) => i.message)).toContain("staff.validation.accountNameTooLong");
  });
});

describe("staffPasswordChangeSchema — K-18 : l'actuel puis le nouveau, qui suit la politique", () => {
  it("accepte un corps valide", () => {
    expect(staffPasswordChangeSchema.safeParse({ currentPassword: "Ancien1motdepasse", newPassword: "Nouveau1motdepasse" }).success).toBe(true);
  });

  it("le nouveau mot de passe suit `passwordSchema` ; l'actuel n'est pas jugé par la politique (il peut dater d'avant elle)", () => {
    expect(staffPasswordChangeSchema.safeParse({ currentPassword: "x", newPassword: "court1" }).success).toBe(false);
    expect(staffPasswordChangeSchema.safeParse({ currentPassword: "x", newPassword: "Nouveau1motdepasse" }).success).toBe(true);
  });
});
