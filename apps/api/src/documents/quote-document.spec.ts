import { readFileSync } from "node:fs";
import { join } from "node:path";
import { formatDZD, quoteDocumentFilename } from "@zwadj/types";
import { describe, expect, it } from "vitest";
import { buildQuoteDocumentHtml, longDate, quoteReference } from "./quote-document";
import { DOCUMENT_FONT_FAMILY, DOCUMENT_FONT_SUBSETS, DOCUMENT_FONT_WEIGHTS, loadDocumentFontCss } from "./quote-document-fonts";
import type { QuoteDocumentRecord } from "./quote-document-source";

// Rang 33 (D326) — le MODÈLE du document, module pur. Trois choses se mesurent ici : la règle des montants (valeur STOCKÉE, jamais recalculée),
// l'échappement (décision 3) et l'absence de tout chemin de calcul ou d'écriture dans les fichiers du document.
const ID = "01a10f0a-5931-7a99-b800-a2cac272855a";

/** Un devis dont l'acompte N'EST PAS 30 % du total : deux fixtures « pile à 30 % » ne prouveraient rien contre un `Math.round(total * 0.3)` côté PDF (AGENTS.md). */
function devis(over: Partial<QuoteDocumentRecord> = {}): QuoteDocumentRecord {
  return {
    id: ID,
    version: 2,
    latestVersion: 2,
    status: "DRAFT",
    eventDate: "2026-12-05",
    guests: 150,
    basePriceCents: 18_000_000,
    servicesTotalCents: 45_000_000,
    totalCents: 63_000_000, // 630 000 DA ; 30 % = 189 000 DA
    depositCents: 12_345_000, // 123 450 DA — ni 30 %, ni rien de calculable depuis les règles
    lines: [
      { nameFr: "Animation musicale", nameAr: "تنشيط موسيقي بفرقة حيّة", quantity: 1, lineTotalCents: 4_500_000 },
      { nameFr: "Buffet ouvert", nameAr: "بوفيه مفتوح للضيوف", quantity: 150, lineTotalCents: 37_500_000 }
    ],
    venue: { nameFr: "Salle des Jasmins", nameAr: "قاعة الياسمين للأفراح" },
    slot: { nameFr: "Soirée", nameAr: "سهرة", startMinutes: 1200, endMinutes: 1560 },
    client: { firstName: "Amina", lastName: "Bensalem", locale: "fr" },
    ...over
  };
}
const FONTS = "/* polices du test */";
const rendre = (record: QuoteDocumentRecord, locale: "fr" | "ar" = "fr") =>
  buildQuoteDocumentHtml({ record, locale, issuedOn: "2026-10-06", fontCss: FONTS });

describe("le modèle imprime la valeur STOCKÉE — précision de Ko, règle des montants (décision 1)", () => {
  it("chaque montant imprimé est celui du devis, mis en forme par `formatDZD` — l'attendu vient du formateur, pas d'un texte tapé à la main", () => {
    const r = devis();
    const page = rendre(r);
    for (const cents of [r.basePriceCents, r.servicesTotalCents, r.totalCents, r.depositCents, ...r.lines.map((l) => l.lineTotalCents)]) {
      expect(page).toContain(formatDZD(cents));
    }
  });

  it("⛔ l'acompte imprimé est la valeur stockée, et PAS 30 % du total : un recalcul serait rougi ici", () => {
    const r = devis();
    const page = rendre(r);
    const recalcule = formatDZD(Math.round(r.totalCents * 0.3));
    expect(r.depositCents).not.toBe(Math.round(r.totalCents * 0.3)); // la fixture ne prouve quelque chose QUE si elle diffère du recalcul
    expect(page).toContain(formatDZD(r.depositCents));
    expect(page).not.toContain(recalcule);
  });

  it("modifier la valeur STOCKÉE change le montant imprimé — le seul moyen légitime de le faire changer (précision de Ko)", () => {
    const avant = rendre(devis());
    const apres = rendre(devis({ depositCents: 20_000_000 }));
    expect(apres).toContain(formatDZD(20_000_000));
    expect(apres).not.toContain(formatDZD(12_345_000));
    expect(avant).not.toBe(apres);
  });

  it("⛔ le total imprimé est la valeur STOCKÉE, et PAS base + prestations : une remise ou un arrondi stockés ne se recomposent pas (la fixture d'origine valait pile base + prestations)", () => {
    const r = devis({ totalCents: 61_000_000 }); // 610 000 DA ; base + prestations = 630 000 DA
    expect(r.totalCents).not.toBe(r.basePriceCents + r.servicesTotalCents); // la fixture ne prouve quelque chose QUE si elle diffère de la recomposition
    const page = rendre(r);
    expect(page).toContain(formatDZD(r.totalCents));
    expect(page).not.toContain(formatDZD(r.basePriceCents + r.servicesTotalCents));
  });

  it("en arabe les montants sont ceux de l'ÉCRAN du Pro (`formatDZD(cents)` sans locale) — pas une seconde mise en forme", () => {
    const r = devis();
    const page = rendre(r, "ar");
    expect(page).toContain(formatDZD(r.depositCents));
    expect(page).not.toContain(formatDZD(r.depositCents, "ar"));
  });
});

describe("le modèle — langue, sens, contenu", () => {
  it("français : `lang=fr`, `dir=ltr`, noms et libellés français", () => {
    const page = rendre(devis(), "fr");
    expect(page).toContain('<html lang="fr" dir="ltr">');
    expect(page).toContain("Salle des Jasmins");
    expect(page).toContain("Animation musicale");
    expect(page).toContain("Acompte");
    expect(page).not.toContain("قاعة الياسمين");
  });

  it("arabe : `lang=ar`, `dir=rtl`, noms et libellés arabes — tirés des catalogues, jamais écrits dans le modèle", () => {
    const page = rendre(devis(), "ar");
    expect(page).toContain('<html lang="ar" dir="rtl">');
    expect(page).toContain("قاعة الياسمين للأفراح");
    expect(page).toContain("تنشيط موسيقي بفرقة حيّة");
    expect(page).toContain("العربون");
    expect(page).not.toContain("Salle des Jasmins");
  });

  it("le créneau s'imprime par `formatSlotRange` (24 h), et un devis sans créneau ou sans client imprime « — » sans casser", () => {
    expect(rendre(devis())).toContain("20:00");
    expect(rendre(devis())).toContain("02:00");
    const nu = rendre(devis({ slot: null, client: null }));
    expect(nu).toContain("—");
    expect(nu).not.toContain("Amina");
  });

  it("le client s'imprime quand le devis y est lié ; la référence dit QUELLE version est imprimée", () => {
    expect(rendre(devis())).toContain("Amina Bensalem");
    expect(quoteReference(devis())).toBe("01a10f0a-v2");
    expect(rendre(devis())).toContain("01a10f0a-v2");
  });

  it("la date de l'événement est en toutes lettres, dans la langue du document ; elle ne dérive pas d'un fuseau (date civile)", () => {
    expect(longDate("2026-12-05", "fr")).toMatch(/5\s+décembre\s+2026/);
    expect(longDate("2026-12-05", "ar")).toContain("2026");
    expect(longDate("2026-12-05", "ar")).toMatch(/ديسمبر/);
    // Le dernier et le premier jour de l'année ne reculent pas d'un jour (le piège d'une date civile lue comme un instant local).
    expect(longDate("2026-01-01", "fr")).toMatch(/1er\s+janvier\s+2026|1\s+janvier\s+2026/);
    expect(longDate("2026-12-31", "fr")).toMatch(/31\s+décembre\s+2026/);
  });
});

describe("⛔ tout ce qui est inséré est ÉCHAPPÉ (décision 3) — mesuré de bout en bout sur des noms hostiles", () => {
  const HOSTILE = `<script>window.x=1</script><img src=x onerror=alert(1)>"'&`;

  it("le nom de la salle, du client, du créneau et des prestations deviennent du TEXTE, jamais du balisage", () => {
    const page = rendre(
      devis({
        venue: { nameFr: HOSTILE, nameAr: HOSTILE },
        client: { firstName: HOSTILE, lastName: HOSTILE, locale: "fr" },
        slot: { nameFr: HOSTILE, nameAr: HOSTILE, startMinutes: 1200, endMinutes: 1560 },
        lines: [{ nameFr: HOSTILE, nameAr: HOSTILE, quantity: 1, lineTotalCents: 100 }]
      })
    );
    const corps = page.slice(page.indexOf("<body>"));
    expect(corps).not.toContain("<script>");
    expect(corps).not.toContain("<img");
    expect(corps).not.toMatch(/onerror=alert\(1\)>/);
    expect(corps).toContain("&lt;script&gt;window.x=1&lt;/script&gt;");
    // La même charge dans la version arabe : le chemin arabe n'est pas un second chemin non gardé.
    const pageAr = rendre(devis({ venue: { nameFr: "x", nameAr: HOSTILE } }), "ar");
    expect(pageAr.slice(pageAr.indexOf("<body>"))).not.toContain("<script>");
  });

  it("le document ne contient QU'UN `<style>` et AUCUN `<script>` de son propre fait", () => {
    const page = rendre(devis());
    expect((page.match(/<style>/g) ?? []).length).toBe(1);
    expect(page).not.toContain("<script");
  });

  it("le nom du fichier ne porte AUCUNE donnée personnelle, même quand les noms sont hostiles", () => {
    const f = quoteDocumentFilename(devis({ venue: { nameFr: HOSTILE, nameAr: HOSTILE }, client: { firstName: HOSTILE, lastName: HOSTILE, locale: "ar" } }));
    expect(f).toMatch(/^devis-\d{4}-\d{2}-\d{2}-v\d+-[0-9a-f]{8}\.pdf$/);
    expect(f).toBe("devis-2026-12-05-v2-01a10f0a.pdf");
  });
});

describe("les polices viennent du DÉPÔT (décisions 3 et 5)", () => {
  it("quatre faces — deux sous-ensembles et deux graisses — en `data:`, chacune avec sa plage `unicode-range`", () => {
    const css = loadDocumentFontCss();
    expect((css.match(/@font-face/g) ?? []).length).toBe(DOCUMENT_FONT_SUBSETS.length * DOCUMENT_FONT_WEIGHTS.length);
    expect((css.match(/data:font\/woff2;base64,/g) ?? []).length).toBe(4);
    expect((css.match(/unicode-range:/g) ?? []).length).toBe(4);
    expect(css).toContain(`font-family: "${DOCUMENT_FONT_FAMILY}"`);
    // AUCUNE ADRESSE : le navigateur n'a pas de réseau, une police référencée par URL ne se chargerait pas.
    expect(css).not.toMatch(/url\((?!data:)/);
  });

  it("le CSS des polices est inséré tel quel dans le `<style>` du document (une police absente retomberait sur le système)", () => {
    const page = buildQuoteDocumentHtml({ record: devis(), locale: "ar", issuedOn: "2026-10-06", fontCss: "@font-face { /* marqueur-de-test */ }" });
    expect(page).toContain("@font-face { /* marqueur-de-test */ }");
  });
});

describe("⛔ aucun chemin de CALCUL ni d'ÉCRITURE dans les fichiers du document (décision 4) — garde de SOURCE", () => {
  const lire = (f: string) =>
    // Les commentaires sont retirés AVANT d'asserter : ils expliquent justement pourquoi ces modules n'importent pas ce qu'on interdit.
    readFileSync(join(__dirname, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const FICHIERS = ["quote-document.ts", "quote-document-policy.ts", "quote-document.service.ts", "quote-document-source.ts", "quote-document-source.prisma.ts"];

  it("aucun n'importe le moteur de prix, l'acompte, le chiffrage des prestations, ni le port d'ÉCRITURE des devis", () => {
    for (const f of FICHIERS) {
      const code = lire(f);
      expect({ f, motif: /pricing-engine|\/deposit|service-pricing|quote-store|quotes\.service|booking-charge/.exec(code)?.[0] ?? null }).toEqual({ f, motif: null });
    }
  });

  it("l'adaptateur Prisma ne fait QUE lire : ni create, ni update, ni delete, ni upsert, ni transaction, ni SQL brut", () => {
    const code = lire("quote-document-source.prisma.ts");
    expect(/\.(create|createMany|update|updateMany|delete|deleteMany|upsert)\(|\$transaction|\$executeRaw|\$queryRaw/.exec(code)?.[0] ?? null).toBeNull();
    // Et il LIT bien : la garde ci-dessus ne serait pas verte pour la raison qu'il ne fait rien.
    expect(code).toContain("findFirst(");
    expect(code).toContain("aggregate(");
  });

  it("le modèle ne contient aucune multiplication ni division : il met en forme, il ne calcule pas", () => {
    const code = lire("quote-document.ts");
    expect(/\bMath\.(round|floor|ceil|trunc)\b/.exec(code)?.[0] ?? null).toBeNull();
    expect(/Cents\s*[*/]\s*\d|\d\s*[*/]\s*\w*Cents/.exec(code)?.[0] ?? null).toBeNull();
  });
});
