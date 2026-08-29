// Charge utile de notification d'une réservation — lot S11-a (D261).
//
// ⚠ CE QUE CETTE SPEC MESURE, ET POURQUOI ELLE EXISTE.
// Cette construction vivait en méthode privée de `BookingsService`, service
// sans aucune spec unitaire : sa seule mesure était `bookings.int-spec.ts`,
// donc un PostgreSQL réel. Elle porte pourtant DEUX MONTANTS et DEUX
// TÉLÉPHONES — quatre valeurs interchangeables deux à deux, dont aucune
// interversion ne casse le typage. C'est exactement le genre de faute qu'une
// porte verte ne regarde pas.
//
// ⚠ LA FIXTURE EST CASTÉE, ET C'EST CONFORME. `satisfies` est la règle des
// DOUBLES DE PORT (D258/S10a) ; une ligne Prisma, elle, se caste — précédent
// `venues.service.spec.ts` l. 99 et `quotes.service.spec.ts` l. 45. Ce qui
// remplace le contrôle de type, c'est la première garde ci-dessous : le jeu de
// clés de la fixture est confronté à `BOOKING_SELECT`, l'autorité. Une colonne
// ajoutée au select fera tomber cette spec au lieu de laisser la fixture
// décrire une ligne que la base ne produit plus.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BOOKING_SELECT, type BookingRow } from "./booking-locks.types";
import {
  buildBookingNotification,
  type ClientForNotification,
  type VenueForNotification
} from "./booking-notification-input";

/** ⚠ FUSEAU ÉPINGLÉ À L'OUEST DE GREENWICH, et c'est la raison d'être de la
 *  garde de date. `Booking.eventDate` est une colonne `@db.Date` : Prisma la
 *  rend à MINUIT UTC. Lue avec `getFullYear()` au lieu de `getUTCFullYear()`,
 *  elle recule d'un jour sur toute machine à l'ouest — et sur un serveur en
 *  UTC, comme l'intégration, la faute reste INVISIBLE. Sans ce fuseau, la
 *  garde serait verte des deux côtés : muette par construction. */
const FUSEAU_TEST = "America/Toronto";
let fuseauInitial: string | undefined;

beforeAll(() => {
  fuseauInitial = process.env.TZ;
  process.env.TZ = FUSEAU_TEST;
});

afterAll(() => {
  // Restauré : `process.env.TZ` vaut pour tout le worker, et une spec qui
  // déplace le fuseau sans le rendre contaminerait ses voisines.
  if (fuseauInitial === undefined) delete process.env.TZ;
  else process.env.TZ = fuseauInitial;
});

/** Ligne relevée sur `BOOKING_SELECT`, colonne par colonne, avec les
 *  nullabilités de `schema.prisma` (`clientId`, `slotName*`, `*Reason`,
 *  `contactEmail`, `expiresAt`, `paymentDueAt` sont nullables). */
const LIGNE = {
  id: "b0000000-0000-4000-8000-000000000001",
  venueId: "v0000000-0000-4000-8000-000000000002",
  clientId: "c0000000-0000-4000-8000-000000000003",
  status: "PENDING",
  paymentMethod: "ONLINE",
  // Minuit UTC : le repère exact d'une colonne `@db.Date`.
  eventDate: new Date(Date.UTC(2026, 7, 14)),
  startsAt: new Date("2026-08-14T17:00:00.000Z"),
  endsAt: new Date("2026-08-14T22:00:00.000Z"),
  slotNameFr: "Soirée",
  slotNameAr: "سهرة",
  guests: 150,
  basePriceCents: 40_000_000,
  servicesTotalCents: 5_000_000,
  // ⚠ DEUX MONTANTS VOLONTAIREMENT DISTINCTS ET NON PROPORTIONNELS. Une
  // fixture où l'acompte vaudrait pile 30 % du total laisserait passer un
  // recalcul côté gabarit — la leçon des fixtures d'acompte de la maquette.
  totalCents: 45_000_000,
  depositCents: 13_000_000,
  clientMessage: "Nous serons 150.",
  services: [],
  declineReason: null,
  cancellationReason: null,
  contactFirstName: "  Yasmine  ",
  contactLastName: "Belkacem  ",
  // ⚠ DEUX TÉLÉPHONES DIFFÉRENTS dans cette spec : celui-ci est snapshoté sur
  // la réservation, celui du pro vit dans `SALLE`. Les croiser enverrait au pro
  // son propre numéro en guise de contact client.
  contactPhone: "+213555000111",
  contactEmail: null,
  expiresAt: new Date("2026-08-21T11:00:00.000Z"),
  paymentDueAt: null,
  createdAt: new Date("2026-08-14T11:00:00.000Z"),
  venue: { slug: "dar-el-farah", nameFr: "Dar El Farah", nameAr: "دار الفرح" }
};

const ligne = (surcharges: Record<string, unknown> = {}) =>
  ({ ...LIGNE, ...surcharges }) as unknown as BookingRow;

const SALLE: VenueForNotification = {
  id: "v0000000-0000-4000-8000-000000000002",
  nameFr: "Dar El Farah",
  nameAr: "دار الفرح",
  owner: {
    phone: "+213661999888",
    notifyByEmail: true,
    notifyBySms: false,
    user: { id: "p0000000-0000-4000-8000-000000000004", email: "pro@zwadj.dz", locale: "FR" }
  }
};

const salle = (owner: Partial<VenueForNotification["owner"]> = {}): VenueForNotification => ({
  ...SALLE,
  owner: { ...SALLE.owner, ...owner }
});

const CLIENT: ClientForNotification = {
  id: "c0000000-0000-4000-8000-000000000003",
  email: "yasmine@example.dz",
  locale: "FR"
};

describe("La fixture décrit la ligne que la base produit VRAIMENT", () => {
  it("porte exactement les clés de `BOOKING_SELECT`, ni plus ni moins", () => {
    // ⚠ Confrontation à l'AUTORITÉ, jamais à une liste écrite à la main : le
    // jour où une colonne entre dans le select, c'est ICI que ça tombe.
    expect(Object.keys(LIGNE).sort()).toEqual(Object.keys(BOOKING_SELECT).sort());
  });
});

describe("La charge utile est COMPLÈTE", () => {
  it("porte les quinze champs du contrat, sans en inventer un seizième", () => {
    const charge = buildBookingNotification(ligne(), SALLE, CLIENT, null);
    expect(Object.keys(charge).sort()).toEqual(
      [
        "bookingId",
        "client",
        "clientName",
        "contact",
        "depositCents",
        "eventDate",
        "guests",
        "pro",
        "reason",
        "slotNameAr",
        "slotNameFr",
        "totalCents",
        "venueId",
        "venueNameAr",
        "venueNameFr"
      ].sort()
    );
  });
});

describe("⛔ La date de l'événement — lue en UTC, rendue en date CIVILE", () => {
  it("rend `YYYY-MM-DD`, jamais un instant", () => {
    const charge = buildBookingNotification(ligne(), SALLE, CLIENT, null);
    expect(charge.eventDate).toBe("2026-08-14");
  });

  it("ne recule PAS d'un jour sous un fuseau à l'ouest de Greenwich", () => {
    // Le fuseau est épinglé à Toronto (UTC−4 en août) : une lecture locale
    // rendrait le 13. C'est la seule mesure de cette faute dans tout le dépôt.
    expect(process.env.TZ, "fuseau non épinglé : la garde serait muette").toBe(FUSEAU_TEST);
    expect(new Date(Date.UTC(2026, 7, 14)).getDate(), "fuseau sans effet").toBe(13);
    const charge = buildBookingNotification(ligne(), SALLE, CLIENT, null);
    expect(charge.eventDate).toBe("2026-08-14");
  });
});

describe("⛔ Chemin de l'argent — les deux montants ne se croisent pas", () => {
  it("le total reste le total et l'acompte reste l'acompte", () => {
    const charge = buildBookingNotification(ligne(), SALLE, CLIENT, null);
    expect(charge.totalCents).toBe(45_000_000);
    expect(charge.depositCents).toBe(13_000_000);
    // Garde-fou du garde-fou : deux montants égaux rendraient l'interversion
    // indétectable, et cette spec verte sur la faute qu'elle prétend voir.
    expect(charge.totalCents).not.toBe(charge.depositCents);
  });
});

describe("⛔ Les deux téléphones ne se croisent pas non plus", () => {
  it("`contact` est celui SNAPSHOTÉ sur la réservation, `pro.phone` celui du pro", () => {
    const charge = buildBookingNotification(ligne(), SALLE, CLIENT, null);
    expect(charge.contact).toBe("+213555000111");
    expect(charge.pro.phone).toBe("+213661999888");
    expect(charge.contact).not.toBe(charge.pro.phone);
  });
});

describe("Les libellés bilingues ne se croisent pas", () => {
  it("FR et AR restent chacun de leur côté, salle comme créneau", () => {
    const charge = buildBookingNotification(ligne(), SALLE, CLIENT, null);
    expect(charge.venueNameFr).toBe("Dar El Farah");
    expect(charge.venueNameAr).toBe("دار الفرح");
    expect(charge.slotNameFr).toBe("Soirée");
    expect(charge.slotNameAr).toBe("سهرة");
  });

  it("SINGLE_SLOT : les deux libellés de créneau restent `null`, ils ne se replient pas ici", () => {
    // Le repli « la journée » est le métier du GABARIT (`templateVars`), pas de
    // la charge. Le poser ici ferait deux endroits qui décident du même mot.
    const charge = buildBookingNotification(
      ligne({ slotNameFr: null, slotNameAr: null }),
      SALLE,
      CLIENT,
      null
    );
    expect(charge.slotNameFr).toBeNull();
    expect(charge.slotNameAr).toBeNull();
  });
});

describe("Locales — « AR » bascule, tout le reste retombe sur « fr »", () => {
  it.each([
    ["AR", "ar"],
    ["FR", "fr"],
    // Valeur inattendue : la colonne est une chaîne libre côté base. Le repli
    // doit produire un gabarit lisible, jamais une clé introuvable.
    ["EN", "fr"],
    ["", "fr"],
    ["ar", "fr"]
  ])("locale pro « %s » ⇒ « %s »", (base, attendu) => {
    const charge = buildBookingNotification(
      ligne(),
      salle({ user: { ...SALLE.owner.user, locale: base } }),
      CLIENT,
      null
    );
    expect(charge.pro.locale).toBe(attendu);
  });

  it.each([
    ["AR", "ar"],
    ["FR", "fr"],
    ["EN", "fr"]
  ])("locale client « %s » ⇒ « %s »", (base, attendu) => {
    const charge = buildBookingNotification(ligne(), SALLE, { ...CLIENT, locale: base }, null);
    expect(charge.client?.locale).toBe(attendu);
  });
});

describe("Walk-in — l'absence de destinataire n'est pas un échec", () => {
  it("`client: null` traverse tel quel, et le pro reste servi", () => {
    const charge = buildBookingNotification(ligne({ clientId: null }), SALLE, null, null);
    expect(charge.client).toBeNull();
    expect(charge.pro.email).toBe("pro@zwadj.dz");
  });

  it("un client fourni ressort avec son identifiant de COMPTE, pas celui de la ligne", () => {
    const charge = buildBookingNotification(ligne(), SALLE, CLIENT, null);
    expect(charge.client?.userId).toBe(CLIENT.id);
    expect(charge.client?.email).toBe("yasmine@example.dz");
  });
});

describe("Nom du client et motif", () => {
  it("le nom est recollé et débarrassé de ses espaces DE BORD — pas de ceux du milieu", () => {
    const charge = buildBookingNotification(ligne(), SALLE, CLIENT, null);
    // ⚠ ATTENDU RELEVÉ SUR LA MESURE, PAS ÉCRIT DE MÉMOIRE. La première
    // rédaction annonçait deux espaces au milieu et le test a rougi : le
    // prénom porte DÉJÀ deux espaces à droite, le gabarit en ajoute un, et
    // `trim()` ne touche que les BORDS. Trois espaces, donc — et un nom de
    // client peut sortir d'ici avec des espaces intérieurs. Comportement
    // conservé tel quel : un lot de refactoring ne resserre pas une chaîne au
    // passage.
    expect(charge.clientName).toBe("Yasmine   Belkacem");
    // La garde qui mord vraiment sur un `trim()` retiré :
    expect(charge.clientName.startsWith(" ")).toBe(false);
    expect(charge.clientName.endsWith(" ")).toBe(false);
  });

  it("le motif traverse tel quel, `null` compris (D83 — motif facultatif)", () => {
    expect(buildBookingNotification(ligne(), SALLE, CLIENT, "Date déjà prise").reason).toBe(
      "Date déjà prise"
    );
    expect(buildBookingNotification(ligne(), SALLE, CLIENT, null).reason).toBeNull();
  });
});

describe("Canaux du pro — recopiés, jamais décidés ici", () => {
  it("les deux drapeaux traversent, y compris quand ils diffèrent", () => {
    const charge = buildBookingNotification(
      ligne(),
      salle({ notifyByEmail: false, notifyBySms: true }),
      CLIENT,
      null
    );
    expect(charge.pro.notifyByEmail).toBe(false);
    expect(charge.pro.notifyBySms).toBe(true);
  });
});
