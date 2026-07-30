// Lot B4d — bornes de blocage. Le test qui compte est celui de la borne de
// fin : « du 3 au 10 » doit BLOQUER le 10. Une fin exclusive mal traduite
// laisserait le dernier jour libre, et le pro ne le verrait qu'une fois la
// réservation entrée.
import { describe, expect, it } from "vitest";
import {
  addDaysCivil,
  civilDateTime,
  defaultWindow,
  inclusiveEndDate,
  isWholeDays,
  toBlockPayload
} from "./block-time";

describe("addDaysCivil", () => {
  it("franchit un mois et une année bissextile sans dériver", () => {
    expect(addDaysCivil("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDaysCivil("2027-02-28", 1)).toBe("2027-03-01");
    expect(addDaysCivil("2027-12-31", 1)).toBe("2028-01-01");
    expect(addDaysCivil("2027-01-01", -1)).toBe("2026-12-31");
  });
});

describe("civilDateTime — aucun Date instancié", () => {
  it("assemble par concaténation, donc sans offset possible", () => {
    expect(civilDateTime("2027-08-14", "08:00")).toBe("2027-08-14T08:00");
    // Ni "Z", ni "+01:00", ni millisecondes : le fuseau appartient à l'API.
    expect(civilDateTime("2027-08-14", "08:00")).not.toMatch(/[Zz]|\+\d{2}:\d{2}|\./);
  });
});

describe("toBlockPayload — journées entières", () => {
  it("« du 3 au 10 » bloque BIEN le 10 : la fin exclusive part au 11", () => {
    expect(
      toBlockPayload({ startDate: "2027-08-03", endDate: "2027-08-10", startTime: "", endTime: "", allDay: true })
    ).toEqual({ startsAt: "2027-08-03T00:00", endsAt: "2027-08-11T00:00" });
  });

  it("une seule journée bloquée couvre bien 24 h, pas zéro", () => {
    expect(
      toBlockPayload({ startDate: "2027-08-03", endDate: "2027-08-03", startTime: "", endTime: "", allDay: true })
    ).toEqual({ startsAt: "2027-08-03T00:00", endsAt: "2027-08-04T00:00" });
  });

  it("la conversion franchit une fin de mois sans produire un 32", () => {
    expect(
      toBlockPayload({ startDate: "2027-08-31", endDate: "2027-08-31", startTime: "", endTime: "", allDay: true })
    ).toEqual({ startsAt: "2027-08-31T00:00", endsAt: "2027-09-01T00:00" });
  });
});

describe("toBlockPayload — plage horaire", () => {
  it("les heures saisies partent telles quelles, sans conversion", () => {
    expect(
      toBlockPayload({
        startDate: "2027-08-14",
        startTime: "14:00",
        endDate: "2027-08-14",
        endTime: "18:00",
        allDay: false
      })
    ).toEqual({ startsAt: "2027-08-14T14:00", endsAt: "2027-08-14T18:00" });
  });

  it("une plage qui franchit minuit s'exprime par la date de fin, pas par un +1440", () => {
    expect(
      toBlockPayload({
        startDate: "2027-08-14",
        startTime: "20:00",
        endDate: "2027-08-15",
        endTime: "02:00",
        allDay: false
      })
    ).toEqual({ startsAt: "2027-08-14T20:00", endsAt: "2027-08-15T02:00" });
  });
});

describe("Relecture — le pro relit ce qu'il a saisi", () => {
  it("un blocage de journées entières est reconnu comme tel", () => {
    expect(isWholeDays("2027-08-03T00:00", "2027-08-11T00:00")).toBe(true);
    expect(isWholeDays("2027-08-14T14:00", "2027-08-14T18:00")).toBe(false);
    // Même jour à 00:00 des deux côtés : ce n'est pas une journée entière.
    expect(isWholeDays("2027-08-03T00:00", "2027-08-03T00:00")).toBe(false);
  });

  it("la dernière journée bloquée est la veille de la borne exclusive", () => {
    expect(inclusiveEndDate("2027-08-11T00:00")).toBe("2027-08-10");
    expect(inclusiveEndDate("2027-09-01T00:00")).toBe("2027-08-31");
  });

  it("aller-retour complet : ce qui est saisi se relit à l'identique", () => {
    const payload = toBlockPayload({
      startDate: "2027-08-03",
      endDate: "2027-08-10",
      startTime: "",
      endTime: "",
      allDay: true
    });
    expect(isWholeDays(payload.startsAt, payload.endsAt)).toBe(true);
    expect(payload.startsAt.slice(0, 10)).toBe("2027-08-03");
    expect(inclusiveEndDate(payload.endsAt)).toBe("2027-08-10");
  });
});

describe("defaultWindow", () => {
  it("rend 92 jours, le plafond exact de l'API — pas 93", () => {
    const { from, to } = defaultWindow(Date.parse("2027-08-14T09:00:00Z"));
    const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000 + 1;
    expect(days).toBe(92);
  });

  it("« aujourd'hui » est celui d'ALGER : 23h30 UTC, on est déjà le lendemain", () => {
    expect(defaultWindow(Date.parse("2027-08-14T23:30:00Z")).from).toBe("2027-08-15");
  });
});
