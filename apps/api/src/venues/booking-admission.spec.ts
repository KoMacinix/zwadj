// Recevabilité d'une demande de réservation — lot S11-a (D261).
//
// ⚠ CE QUE CETTE SPEC MESURE, ET POURQUOI ELLE EXISTE.
// Ces trois refus vivaient dans `BookingsService.create`, qui n'a AUCUNE spec
// unitaire : leur seule mesure était `bookings.int-spec.ts`, donc un PostgreSQL
// réel. Deux d'entre eux gardent une FRONTIÈRE DE DATE — la classe d'erreurs la
// plus chère du dépôt. Cette spec est le premier endroit d'où ils se
// neutralisent en millisecondes.
//
// ⚠ AUCUNE VALEUR N'EST ÉCRITE DE MÉMOIRE. L'horizon se dérive de
// `BOOKING_HORIZON_MONTHS` et d'`addMonthsCivil` — les MÊMES autorités que le
// code mesuré — jamais d'une date recopiée à la main. Un horizon écrit en dur
// deviendrait faux le jour où la constante bouge, et le test accuserait à tort.
//
// ⚠ D55 — AVANT D'ÉCRIRE UNE BORNE, ÉCRIRE LE CAS RÉEL QU'ELLE DOIT ACCEPTER.
// Chaque borne est donc mesurée des DEUX côtés : le dernier cas admis et le
// premier refusé. Une borne mesurée d'un seul côté est verte sur un refus
// universel.
import { BOOKING_HORIZON_MONTHS } from "@zwadj/types";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  addMonthsCivil,
  civilTodayAt,
  civilUtcMs,
  formatCivilDate,
  parseCivilDate,
  type CivilDate
} from "./availability-time";
import { decideBookingAdmission, type BookingAdmissionInput } from "./booking-admission";

const jour = (valeur: string) => parseCivilDate(valeur) as CivilDate;

/** Midi à Alger le 14/08/2026 — instant arbitraire mais FIXE : la spec ne doit
 *  pas changer de verdict selon l'heure à laquelle on la lance. */
const MIDI_ALGER = Date.UTC(2026, 7, 14, 11, 0, 0);
const AUJOURDHUI = civilTodayAt(MIDI_ALGER);

/** Créneau 18h→23h, avec un champ EN PLUS des bornes horaires : c'est lui qui
 *  prouve que le créneau traverse le verdict sans être rétréci. */
const CRENEAU = { startMinutes: 1080, endMinutes: 1380, nameFr: "Soirée" };

const DEMAIN = jour(formatCivilDate(decale(AUJOURDHUI, 1)));

function decale(date: CivilDate, jours: number): CivilDate {
  const probe = new Date(civilUtcMs(date) + jours * 86_400_000);
  return { year: probe.getUTCFullYear(), month: probe.getUTCMonth() + 1, day: probe.getUTCDate() };
}

/** ⚠ LE TYPE DU CRÉNEAU SE NOMME, IL NE SE DÉDUIT PAS DE LA FONCTION (D262).
 *  Première rédaction : `Partial<Parameters<typeof decideBookingAdmission>[0]>`.
 *  ⛔ `Parameters<>` SUR UNE FONCTION GÉNÉRIQUE EFFACE LE PARAMÈTRE DE TYPE et
 *  le remplace par sa CONTRAINTE. `S` devenait donc `SlotBounds`, cette aide
 *  rendait `BookingAdmission<SlotBounds>`, et l'assertion qui prouve que le
 *  créneau traverse le verdict ne compilait plus — `TS2339` sur `nameFr`.
 *  Le contrat d'entrée est EXPORTÉ par le module : on le nomme, on ne le
 *  reconstruit pas depuis la signature. */
type Creneau = typeof CRENEAU;

function demande(surcharges: Partial<BookingAdmissionInput<Creneau>> = {}) {
  return decideBookingAdmission<Creneau>({
    date: DEMAIN,
    today: AUJOURDHUI,
    slot: CRENEAU,
    wholeDay: false,
    capacityMax: 200,
    guests: 150,
    ...surcharges
  });
}

describe("Créneau introuvable — « il n'existe pas », jamais « il est pris »", () => {
  it("refuse en SLOT_UNAVAILABLE quand aucun créneau actif ne porte l'identifiant", () => {
    expect(demande({ slot: null }).outcome).toBe("SLOT_UNAVAILABLE");
  });

  it("le cas nominal, lui, est ADMIS — sans quoi tout ce qui suit serait vert par refus universel", () => {
    expect(demande().outcome).toBe("ADMITTED");
  });
});

describe("Capacité — la borne mesurée des DEUX côtés (D55)", () => {
  it("PILE la capacité passe : une salle de 200 accepte une table de 200", () => {
    expect(demande({ capacityMax: 200, guests: 200 }).outcome).toBe("ADMITTED");
  });

  it("un invité de plus tombe, et tombe en GUESTS_EXCEED_CAPACITY", () => {
    expect(demande({ capacityMax: 200, guests: 201 }).outcome).toBe("GUESTS_EXCEED_CAPACITY");
  });
});

describe("Fenêtre de dates — futur STRICT, horizon INCLUSIF", () => {
  it("AUJOURD'HUI est refusé : la salle n'aurait pas le temps de répondre", () => {
    expect(demande({ date: AUJOURDHUI }).outcome).toBe("SLOT_UNAVAILABLE");
  });

  it("HIER est refusé lui aussi", () => {
    expect(demande({ date: decale(AUJOURDHUI, -1) }).outcome).toBe("SLOT_UNAVAILABLE");
  });

  it("DEMAIN passe — le premier jour admis", () => {
    expect(demande({ date: DEMAIN }).outcome).toBe("ADMITTED");
  });

  it("l'horizon EXACT passe, le lendemain de l'horizon tombe", () => {
    // Dérivé des mêmes autorités que le code mesuré, jamais d'une date écrite
    // à la main : la garde survit à un changement de BOOKING_HORIZON_MONTHS.
    const horizon = addMonthsCivil(AUJOURDHUI, BOOKING_HORIZON_MONTHS);
    expect(BOOKING_HORIZON_MONTHS, "un horizon nul rendrait ces deux cas vides").toBeGreaterThan(0);
    expect(demande({ date: horizon }).outcome).toBe("ADMITTED");
    expect(demande({ date: decale(horizon, 1) }).outcome).toBe("SLOT_UNAVAILABLE");
  });
});

describe("⛔ L'ORDRE DES REFUS — la règle que rien ne mesurait avant S11-a", () => {
  // Relevé sur `bookings.service.ts` AVANT déplacement : créneau l. 178,
  // capacité l. 180, date l. 196. Le service traduit la capacité en 400 et les
  // deux autres en 409 : intervertir ferait répondre « ce créneau n'est pas
  // disponible » à une demande dont le seul tort est de compter trop
  // d'invités, et le client changerait de DATE au lieu de réduire sa table.
  it("capacité dépassée ET date hors horizon ⇒ c'est la CAPACITÉ qui sort", () => {
    const verdict = demande({
      capacityMax: 200,
      guests: 201,
      date: decale(addMonthsCivil(AUJOURDHUI, BOOKING_HORIZON_MONTHS), 1)
    });
    expect(verdict.outcome).toBe("GUESTS_EXCEED_CAPACITY");
  });

  it("capacité dépassée ET date dans le PASSÉ ⇒ c'est encore la CAPACITÉ", () => {
    expect(demande({ guests: 999, date: decale(AUJOURDHUI, -30) }).outcome).toBe(
      "GUESTS_EXCEED_CAPACITY"
    );
  });

  it("créneau absent ET capacité dépassée ⇒ c'est le CRÉNEAU qui sort en premier", () => {
    expect(demande({ slot: null, guests: 999 }).outcome).toBe("SLOT_UNAVAILABLE");
  });
});

describe("Plage bloquante — le mode de la salle choisit, pas le créneau", () => {
  // ⚠ Mesuré en DURÉE, pas en recalculant `computeBookingWindow` : comparer le
  // résultat à l'appel qu'on veut prouver serait une garde tautologique (D223).
  // La durée, elle, dit lequel des deux arguments a été choisi.
  it("SINGLE_SLOT (wholeDay) bloque VINGT-QUATRE HEURES, pas les heures du créneau", () => {
    const verdict = demande({ wholeDay: true });
    if (verdict.outcome !== "ADMITTED") throw new Error(`attendu ADMITTED, reçu ${verdict.outcome}`);
    expect(verdict.window.endsAt.getTime() - verdict.window.startsAt.getTime()).toBe(86_400_000);
  });

  it("MULTI_SLOT bloque les CINQ HEURES du créneau 18h→23h", () => {
    const verdict = demande({ wholeDay: false });
    if (verdict.outcome !== "ADMITTED") throw new Error(`attendu ADMITTED, reçu ${verdict.outcome}`);
    const minutes = (CRENEAU.endMinutes - CRENEAU.startMinutes) * 60_000;
    expect(verdict.window.endsAt.getTime() - verdict.window.startsAt.getTime()).toBe(minutes);
  });
});

describe("Le créneau TRAVERSE le verdict, entier", () => {
  it("rend l'objet reçu, champs hors bornes horaires compris", () => {
    const verdict = demande();
    if (verdict.outcome !== "ADMITTED") throw new Error(`attendu ADMITTED, reçu ${verdict.outcome}`);
    // ⚠ CE QUE CETTE ASSERTION PROTÈGE : sans le report du créneau dans le
    // verdict, `create` devrait le relire dans `venue` et y réécrire la garde
    // de nullité — un `if` dont plus aucune branche ne se déclenche.
    const libelle: string = verdict.slot.nameFr;
    expect(libelle).toBe("Soirée");
    expect(verdict.slot).toBe(CRENEAU);
  });
});

describe("Garde de SOURCE — la décision ne revient pas dans le service", () => {
  it("`bookings.service.ts` ne nomme plus l'horizon : il ne le décide plus", () => {
    // Vitest s'exécute depuis `apps/api` ; `import.meta` tombe en TS1343 côté
    // API (tsconfig CommonJS). On passe par `process.cwd()` ET ON VÉRIFIE le
    // chemin — un fichier introuvable rendrait la garde verte et muette.
    const chemin = join(process.cwd(), "src", "venues", "bookings.service.ts");
    const source = readFileSync(chemin, "utf8");
    expect(source.length, `source illisible : ${chemin}`).toBeGreaterThan(1000);
    expect(source).not.toContain("BOOKING_HORIZON_MONTHS");
    expect(source).toContain("decideBookingAdmission");
  });
});
