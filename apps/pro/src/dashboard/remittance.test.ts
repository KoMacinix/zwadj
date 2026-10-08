import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ApiError } from "@zwadj/api-client";
import { messages } from "@zwadj/i18n";
import { QUOTE_SENT_VIA, QUOTE_SENT_VIA_ORDER, quoteSentViaNeedsEmail, quoteSentViaNeedsPhone, type QuoteDTO, type QuoteSentVia } from "@zwadj/types";
import { describe, expect, it } from "vitest";
import { onQuoteRemitted } from "./remittance-hook";
import { CHANNELS_WITH_FUTURE_SENDING, channelBlockers, describeRemittance, wantsRealSending, type RemitOutcome } from "./remittance";

// Rang 33 (D326) — les décisions 8, 9 et 10 du relecteur, module PUR : aucun DOM, aucun réseau. Les attendus viennent du CONTRAT (`@zwadj/types`) et des
// CATALOGUES, jamais d'une liste de canaux recopiée ici.
const ECHEC = new ApiError(503, "QUOTE_DOCUMENT_UNAVAILABLE", "quote.errors.documentUnavailable", []);
const OK = { ok: true } as const;
const KO = { ok: false, failure: ECHEC } as const;
const sortie = (channel: QuoteSentVia, recorded: RemitOutcome["recorded"], pdf: RemitOutcome["pdf"]): RemitOutcome => ({ channel, recorded, pdf });

describe("channelBlockers — ce qui retient un canal vient du CONTRAT (décision 8)", () => {
  it("chaque canal est retenu par exactement ce que les prédicats du contrat disent, pour chacun des quatre états de contact", () => {
    for (const canal of QUOTE_SENT_VIA_ORDER) {
      for (const phoneOk of [false, true]) {
        for (const emailOk of [false, true]) {
          const attendu = [...(quoteSentViaNeedsPhone(canal) && !phoneOk ? ["needPhone"] : []), ...(quoteSentViaNeedsEmail(canal) && !emailOk ? ["needEmail"] : [])];
          expect(channelBlockers(canal, { phoneOk, emailOk }), `${canal} phone=${phoneOk} email=${emailOk}`).toEqual(attendu);
        }
      }
    }
  });

  it("l'e-mail exige l'ADRESSE et rien d'autre ; le SMS et le téléphone exigent le MOBILE ; l'impression et l'annonce de vive voix n'exigent rien", () => {
    expect(channelBlockers(QUOTE_SENT_VIA.EMAIL, { phoneOk: true, emailOk: false })).toEqual(["needEmail"]);
    expect(channelBlockers(QUOTE_SENT_VIA.EMAIL, { phoneOk: false, emailOk: true })).toEqual([]);
    expect(channelBlockers(QUOTE_SENT_VIA.SMS, { phoneOk: false, emailOk: true })).toEqual(["needPhone"]);
    expect(channelBlockers(QUOTE_SENT_VIA.PHONE, { phoneOk: false, emailOk: true })).toEqual(["needPhone"]);
    expect(channelBlockers(QUOTE_SENT_VIA.PRINT, { phoneOk: false, emailOk: false })).toEqual([]);
    expect(channelBlockers(QUOTE_SENT_VIA.IN_PERSON, { phoneOk: false, emailOk: false })).toEqual([]);
  });
});

describe("D181 — tout canal de la liste d'autorité a un libellé FR et AR, MESURÉ", () => {
  it("`venue.ui.quotes.sv_<canal>` existe, non vide, dans les DEUX catalogues, pour chacun des canaux (« e-mail » compris)", () => {
    expect(QUOTE_SENT_VIA_ORDER).toContain(QUOTE_SENT_VIA.EMAIL);
    for (const langue of ["fr", "ar"] as const) {
      const libelles = messages[langue].venue.ui.quotes as Record<string, string>;
      for (const canal of QUOTE_SENT_VIA_ORDER) {
        expect(libelles[`sv_${canal}`], `${langue} sv_${canal}`).toMatch(/\S/);
      }
    }
  });
});

describe("describeRemittance — la fenêtre dit ce qui a RÉELLEMENT eu lieu (décision 9)", () => {
  it("les QUATRE issues rendent quatre titres différents, dans l'ordre enregistrement puis PDF", () => {
    const tout = describeRemittance(sortie(QUOTE_SENT_VIA.PRINT, OK, OK));
    expect(tout.titleKey).toBe("remitTitleDone");
    expect(tout.lines.map((l) => l.key)).toEqual(["remitRecorded", "remitPdfDone"]);

    const enregistreSeul = describeRemittance(sortie(QUOTE_SENT_VIA.PRINT, OK, KO));
    expect(enregistreSeul.titleKey).toBe("remitTitleRecordedOnly");
    expect(enregistreSeul.lines.map((l) => l.key)).toEqual(["remitRecorded", "remitPdfFailed"]);
    expect(enregistreSeul.lines[1]!.failure).toBe(ECHEC);

    const pdfSeul = describeRemittance(sortie(QUOTE_SENT_VIA.PRINT, KO, OK));
    expect(pdfSeul.titleKey).toBe("remitTitlePdfOnly");
    expect(pdfSeul.lines.map((l) => l.key)).toEqual(["remitRecordFailed", "remitPdfDone"]);
    expect(pdfSeul.lines[0]!.failure).toBe(ECHEC);

    const rien = describeRemittance(sortie(QUOTE_SENT_VIA.PRINT, KO, KO));
    expect(rien.titleKey).toBe("remitTitleNone");
    expect(rien.lines.map((l) => l.key)).toEqual(["remitRecordFailed", "remitPdfFailed"]);
    expect(new Set([tout.titleKey, enregistreSeul.titleKey, pdfSeul.titleKey, rien.titleKey]).size).toBe(4);
  });

  it("⛔ aucune issue ne dit « tout est fait » quand l'une des deux a échoué : le titre « Remise enregistrée » est le SEUL de l'issue complète", () => {
    for (const canal of QUOTE_SENT_VIA_ORDER) {
      for (const [recorded, pdf] of [[OK, KO], [KO, OK], [KO, KO]] as const) {
        expect(describeRemittance(sortie(canal, recorded, pdf)).titleKey).not.toBe("remitTitleDone");
      }
    }
  });

  it("la ligne « Zwadj n'envoie pas encore » n'existe que pour le SMS et l'e-mail ENREGISTRÉS — jamais pour l'impression, la vive voix, le téléphone, ni après un échec d'enregistrement", () => {
    for (const canal of QUOTE_SENT_VIA_ORDER) {
      const cles = describeRemittance(sortie(canal, OK, OK)).lines.map((l) => l.key);
      expect(cles.includes(`remitNotSent${canal}`), canal).toBe(CHANNELS_WITH_FUTURE_SENDING.includes(canal));
      expect(describeRemittance(sortie(canal, KO, OK)).lines.map((l) => l.key).some((k) => k.startsWith("remitNotSent")), `${canal} après échec`).toBe(false);
    }
    expect(CHANNELS_WITH_FUTURE_SENDING).toEqual([QUOTE_SENT_VIA.SMS, QUOTE_SENT_VIA.EMAIL]);
    expect(QUOTE_SENT_VIA_ORDER.filter(wantsRealSending)).toEqual([QUOTE_SENT_VIA.SMS, QUOTE_SENT_VIA.EMAIL]);
  });

  it("la ligne d'enregistrement NOMME le canal que le serveur a écrit (jamais un autre)", () => {
    for (const canal of QUOTE_SENT_VIA_ORDER) {
      expect(describeRemittance(sortie(canal, OK, OK)).lines[0]).toEqual({ key: "remitRecorded", channel: canal });
    }
  });
});

describe("⛔ AUCUN TEXTE NE DIT QUE ZWADJ A ENVOYÉ QUOI QUE CE SOIT (Ko, 04/10/2026) — mesuré sur les catalogues, les deux langues", () => {
  // Un verbe d'envoi ou d'impression À L'ACTIF de Zwadj — hors négation (« n'envoie pas »).
  const FR = /\bZwadj\s+(?:a\s+(?:envoy|imprim)|envoie\b(?!\s+pas)|imprime\b(?!\s+pas)|vous\s+a\s+(?:envoy|imprim))|\benvoy[ée]e?s?\s+par\s+Zwadj/i;
  const AR = /زواج\s+(?:أرسل|طبع|يرسل\b(?!\s*بعد)|يطبع\b(?!\s*بعد))|(?:أُرسل|مُرسَل)\s+من\s+زواج/;

  it("la phrase retirée n'existe plus, ni en français ni en arabe, et rien dans `venue.ui.walkin` ne la remplace", () => {
    for (const [langue, motif] of [["fr", FR], ["ar", AR]] as const) {
      const texte = JSON.stringify(messages[langue].venue.ui.walkin);
      expect(texte).not.toMatch(motif);
    }
    expect(messages.fr.venue.ui.walkin.deliverHint).not.toMatch(/n'imprime rien/);
    expect(messages.ar.venue.ui.walkin.deliverHint).not.toMatch(/لا يطبع/);
  });

  it("chaque ligne que la fenêtre peut afficher existe dans les deux catalogues, et celle du SMS et de l'e-mail dit l'INVERSE d'un envoi : « n'envoie pas encore »", () => {
    for (const langue of ["fr", "ar"] as const) {
      const walkin = messages[langue].venue.ui.walkin as Record<string, string>;
      const vues = [
        describeRemittance(sortie(QUOTE_SENT_VIA.SMS, OK, OK)),
        describeRemittance(sortie(QUOTE_SENT_VIA.EMAIL, OK, KO)),
        describeRemittance(sortie(QUOTE_SENT_VIA.PRINT, KO, OK)),
        describeRemittance(sortie(QUOTE_SENT_VIA.PHONE, KO, KO))
      ];
      for (const vue of vues) {
        expect(walkin[vue.titleKey], `${langue} ${vue.titleKey}`).toMatch(/\S/);
        for (const ligne of vue.lines) expect(walkin[ligne.key], `${langue} ${ligne.key}`).toMatch(/\S/);
      }
    }
    expect(messages.fr.venue.ui.walkin.remitNotSentSMS).toMatch(/n'envoie pas encore/);
    expect(messages.fr.venue.ui.walkin.remitNotSentEMAIL).toMatch(/n'envoie pas encore/);
    expect(messages.ar.venue.ui.walkin.remitNotSentSMS).toMatch(/لا يرسل.*بعد/);
    expect(messages.ar.venue.ui.walkin.remitNotSentEMAIL).toMatch(/لا يرسل.*بعد/);
  });
});

describe("remittance-hook — le point de branchement NE FAIT RIEN (décision 10)", () => {
  const SOURCE = readFileSync(resolve(__dirname, "remittance-hook.ts"), "utf8");
  const code = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("appelée, elle ne lève pas et ne rend RIEN, pour chaque canal", () => {
    const devis = { id: "q" } as unknown as QuoteDTO;
    for (const canal of QUOTE_SENT_VIA_ORDER) expect(onQuoteRemitted(canal, devis)).toBeUndefined();
  });

  it("⛔ aucun appel d'API, aucun contrat neuf : le fichier n'importe RIEN à l'exécution et n'appelle ni fetch, ni XMLHttpRequest, ni sendBeacon, ni WebSocket", () => {
    // Seul un import de TYPES est permis.
    const imports = [...code.matchAll(/^import\s+(type\s+)?[^;]+;/gm)].map((m) => m[0]);
    expect(imports.every((i) => /^import\s+type\s/.test(i))).toBe(true);
    expect(/\b(fetch|XMLHttpRequest|sendBeacon|WebSocket|EventSource|axios|request\()/.exec(code)?.[0] ?? null).toBeNull();
  });
});
