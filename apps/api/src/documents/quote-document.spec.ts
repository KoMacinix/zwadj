import { readFileSync } from "node:fs";
import { join } from "node:path";
import arMessages from "@zwadj/i18n/messages/ar.json";
import frMessages from "@zwadj/i18n/messages/fr.json";
import { formatDZD, quoteDocumentFilename, ServicePricingType } from "@zwadj/types";
import { describe, expect, it } from "vitest";
import { buildQuoteDocumentHtml, longDate } from "./quote-document";
import { DOCUMENT_FONT_FAMILY, DOCUMENT_FONT_SUBSETS, DOCUMENT_FONT_WEIGHTS, loadDocumentFontCss } from "./quote-document-fonts";
import type { QuoteDocumentLine, QuoteDocumentRecord } from "./quote-document-source";
import { parseStoredLines } from "./quote-document-source.prisma";

// Rang 33 (D326) — le MODÈLE du document, module pur. Trois choses se mesurent ici : la règle des montants (valeur STOCKÉE, jamais recalculée),
// l'échappement (décision 3) et l'absence de tout chemin de calcul ou d'écriture dans les fichiers du document.
// Rang 38 (D332, L35-2) — le tableau sans colonne vide, le détail selon DB-9 (le TYPE de tarification, jamais la valeur), le nom du palier lu sur la ligne
// STOCKÉE, le récapitulatif en bloc séparé, et la lecture des lignes stockées.
const ID = "01a10f0a-5931-7a99-b800-a2cac272855a";
const LIBELLES = { fr: frMessages.quote.document, ar: arMessages.quote.document } as const;

/** Une ligne de devis STOCKÉE : le type de tarification, la quantité, le nom du palier (FR et AR) — ce que `ResolvedLine` écrit dans `quotes.lines`. */
function ligne(over: Partial<QuoteDocumentLine> = {}): QuoteDocumentLine {
  return {
    nameFr: "Prestation",
    nameAr: "خدمة",
    pricingType: ServicePricingType.FIXED,
    quantity: 1,
    tierLabelFr: null,
    tierLabelAr: null,
    lineTotalCents: 1_000_000,
    ...over
  };
}

/** Un devis dont l'acompte N'EST PAS 30 % du total : deux fixtures « pile à 30 % » ne prouveraient rien contre un `Math.round(total * 0.3)` côté PDF (AGENTS.md). */
function devis(over: Partial<QuoteDocumentRecord> = {}): QuoteDocumentRecord {
  return {
    id: ID,
    // Rang 39 (D333, L35-3) — la référence STOCKÉE du devis (année, salle 3, devis 14, version 2) : trois nombres distincts, aucun ne vient de l'identifiant.
    reference: "DEVIS-2026-0003-0014 v2",
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
      ligne({ nameFr: "Animation musicale", nameAr: "تنشيط موسيقي بفرقة حيّة", lineTotalCents: 4_500_000 }),
      ligne({ nameFr: "Buffet ouvert", nameAr: "بوفيه مفتوح للضيوف", pricingType: ServicePricingType.PER_GUEST, quantity: 150, lineTotalCents: 37_500_000 })
    ],
    venue: { nameFr: "Salle des Jasmins", nameAr: "قاعة الياسمين للأفراح" },
    slot: { nameFr: "Soirée", nameAr: "سهرة", startMinutes: 1200, endMinutes: 1560 },
    client: { firstName: "Amina", lastName: "Bensalem" },
    ...over
  };
}
const FONTS = "/* polices du test */";
const rendre = (record: QuoteDocumentRecord, locale: "fr" | "ar" = "fr") =>
  buildQuoteDocumentHtml({ record, locale, issuedOn: "2026-10-06", fontCss: FONTS });

/** Les cellules d'en-tête du tableau (`<th>`) et les lignes de son corps (`<tr>` de `<tbody>`) — comptées dans le HTML rendu, jamais devinées. */
const entetes = (page: string) => (page.match(/<th\b/g) ?? []).length;
const lignesDuCorps = (page: string) => {
  const debut = page.indexOf("<tbody>");
  if (debut === -1) return [];
  return page.slice(debut, page.indexOf("</tbody>")).split("<tr").slice(1);
};
/** La ligne du corps qui porte `nom` (un nom unique par fixture). */
const ligneDe = (page: string, nom: string) => lignesDuCorps(page).find((l) => l.includes(nom)) ?? "";

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

  it("⛔ le montant d'une LIGNE est la valeur stockée, et PAS prix unitaire × quantité : le total de ligne de la fixture n'est pas le produit (P-4)", () => {
    const l = ligne({ nameFr: "Menu", pricingType: ServicePricingType.PER_GUEST, quantity: 150, lineTotalCents: 33_333_300 });
    const produit = 150 * 250_000; // un prix unitaire plausible : 2 500 DA × 150 = 375 000 DA, que la fixture ne stocke PAS
    expect(l.lineTotalCents).not.toBe(produit);
    const page = rendre(devis({ lines: [l] }));
    expect(ligneDe(page, "Menu")).toContain(formatDZD(33_333_300));
    expect(page).not.toContain(formatDZD(produit));
  });

  it("en arabe les montants sont ceux de l'ÉCRAN du Pro (`formatDZD(cents)` sans locale) — pas une seconde mise en forme", () => {
    const r = devis();
    const page = rendre(r, "ar");
    expect(page).toContain(formatDZD(r.depositCents));
    expect(page).not.toContain(formatDZD(r.depositCents, "ar"));
  });
});

describe("rang 38 — le tableau des prestations n'a AUCUNE colonne vide (P-1, constat 1 de Ko)", () => {
  it("sans prestation : AUCUN tableau, et une phrase dit qu'aucune prestation n'est choisie — dans les deux langues", () => {
    for (const locale of ["fr", "ar"] as const) {
      const page = rendre(devis({ lines: [], servicesTotalCents: 0, totalCents: 18_000_000 }), locale);
      expect(page).not.toContain("<table");
      expect(page).not.toContain("<th");
      expect(page).toContain(LIBELLES[locale].noServices);
    }
  });

  it("des prestations TOUTES « fixe » : un tableau à DEUX colonnes (prestation, montant) — pas de colonne de détail, ni vide ni autre", () => {
    const page = rendre(
      devis({
        lines: [ligne({ nameFr: "Décoration" }), ligne({ nameFr: "Photographe" })]
      })
    );
    expect(entetes(page)).toBe(2);
    expect(page).not.toContain(`>${LIBELLES.fr.detail}<`);
    expect(page).not.toContain("×");
    expect(lignesDuCorps(page)).toHaveLength(2);
  });

  it("une prestation qui a un détail : un tableau à TROIS colonnes, l'en-tête « Détail » en français comme en arabe", () => {
    for (const locale of ["fr", "ar"] as const) {
      const page = rendre(
        devis({ lines: [ligne({ nameFr: "Décoration" }), ligne({ nameFr: "Menu", pricingType: ServicePricingType.PER_GUEST, quantity: 150 })] }),
        locale
      );
      expect(entetes(page)).toBe(3);
      expect(page).toContain(`>${LIBELLES[locale].detail}<`);
    }
  });

  it("une ligne de tableau par prestation choisie — ni plus, ni moins", () => {
    const lignes = [1, 2, 3, 4].map((n) => ligne({ nameFr: `Prestation ${n}`, pricingType: n % 2 === 0 ? ServicePricingType.PER_UNIT : ServicePricingType.FIXED, quantity: n }));
    expect(lignesDuCorps(rendre(devis({ lines: lignes })))).toHaveLength(4);
  });
});

describe("rang 38 — DB-9 : le détail suit le TYPE de tarification, jamais la valeur (P-2)", () => {
  const AUTRES = ligne({ nameFr: "Témoin fixe" }); // une ligne « fixe » qui garde la colonne de détail ouverte quand elle existe

  it("« par invité » imprime la quantité stockée (le nombre d'invités)", () => {
    const page = rendre(devis({ lines: [AUTRES, ligne({ nameFr: "Menu", pricingType: ServicePricingType.PER_GUEST, quantity: 150 })] }));
    expect(ligneDe(page, "Menu")).toContain("× 150");
  });

  it("« à l'unité » imprime la quantité — y compris 1 : la règle suit le TYPE, pas la valeur", () => {
    for (const q of [1, 7]) {
      const page = rendre(devis({ lines: [AUTRES, ligne({ nameFr: "Chaises", pricingType: ServicePricingType.PER_UNIT, quantity: q })] }));
      expect(ligneDe(page, "Chaises")).toContain(`× ${q}`);
    }
  });

  it("« fixe » n'imprime RIEN, même quand sa quantité stockée n'est pas 1 (la règle suit le type)", () => {
    const page = rendre(devis({ lines: [ligne({ nameFr: "Forfait", quantity: 7 }), ligne({ nameFr: "Menu", pricingType: ServicePricingType.PER_GUEST, quantity: 150 })] }));
    expect(ligneDe(page, "Forfait")).not.toContain("×");
    expect(ligneDe(page, "Forfait")).not.toContain("7");
  });

  it("« à paliers » imprime le NOM du palier, pas une quantité (la quantité stockée d'un palier est 1)", () => {
    const page = rendre(devis({ lines: [ligne({ nameFr: "Gâteau", pricingType: ServicePricingType.TIERED, quantity: 1, tierLabelFr: "Formule Prestige", tierLabelAr: "الصيغة الفاخرة" })] }));
    expect(ligneDe(page, "Gâteau")).toContain("Formule Prestige");
    expect(ligneDe(page, "Gâteau")).not.toContain("×");
  });

  it("les quatre types ensemble : une colonne de détail, chaque ligne dit ce que DB-9 veut", () => {
    const page = rendre(
      devis({
        lines: [
          ligne({ nameFr: "Forfait" }),
          ligne({ nameFr: "Menu", pricingType: ServicePricingType.PER_GUEST, quantity: 150 }),
          ligne({ nameFr: "Chaises", pricingType: ServicePricingType.PER_UNIT, quantity: 40 }),
          ligne({ nameFr: "Gâteau", pricingType: ServicePricingType.TIERED, tierLabelFr: "Formule Prestige", tierLabelAr: "الصيغة الفاخرة" })
        ]
      })
    );
    expect(entetes(page)).toBe(3);
    expect(ligneDe(page, "Forfait")).not.toMatch(/×|Formule/);
    expect(ligneDe(page, "Menu")).toContain("× 150");
    expect(ligneDe(page, "Chaises")).toContain("× 40");
    expect(ligneDe(page, "Gâteau")).toContain("Formule Prestige");
  });
});

describe("rang 38 — le nom du palier est celui de la LIGNE stockée, dans la langue du document (P-3, P-7)", () => {
  const PALIER = ligne({ nameFr: "Gâteau", nameAr: "كعكة", pricingType: ServicePricingType.TIERED, tierLabelFr: "Formule Prestige", tierLabelAr: "الصيغة الفاخرة" });

  it("français : le nom FRANÇAIS du palier ; arabe : le nom ARABE — l'autre langue ne s'imprime pas", () => {
    const fr = rendre(devis({ lines: [PALIER] }), "fr");
    expect(ligneDe(fr, "Gâteau")).toContain("Formule Prestige");
    expect(fr).not.toContain("الصيغة الفاخرة");
    const ar = rendre(devis({ lines: [PALIER] }), "ar");
    expect(ligneDe(ar, "كعكة")).toContain("الصيغة الفاخرة");
    expect(ar).not.toContain("Formule Prestige");
  });

  it("⛔ une ligne « à paliers » SANS nom de palier stocké LÈVE : elle ne s'imprime pas à moitié", () => {
    expect(() => rendre(devis({ lines: [{ ...PALIER, tierLabelFr: null }] }), "fr")).toThrow(TypeError);
    expect(() => rendre(devis({ lines: [{ ...PALIER, tierLabelAr: null }] }), "ar")).toThrow(TypeError);
  });

  it("un nom de palier HOSTILE devient du texte, jamais du balisage", () => {
    const HOSTILE = `<script>window.x=1</script><img src=x onerror=alert(1)>"'&`;
    const page = rendre(devis({ lines: [{ ...PALIER, tierLabelFr: HOSTILE }] }), "fr");
    const corps = page.slice(page.indexOf("<body>"));
    expect(corps).not.toContain("<script>");
    expect(corps).not.toContain("<img");
    expect(corps).toContain("&lt;script&gt;window.x=1&lt;/script&gt;");
  });
});

describe("rang 38 — le récapitulatif est un bloc SÉPARÉ, aligné (P-5, constat 1 de Ko)", () => {
  it("une section titrée « Récapitulatif », APRÈS le tableau, qui porte les quatre lignes dans l'ordre location, prestations, total, acompte", () => {
    for (const locale of ["fr", "ar"] as const) {
      const L = LIBELLES[locale];
      const page = rendre(devis(), locale);
      const debut = page.indexOf('<section class="recap">');
      expect(debut).toBeGreaterThan(page.indexOf("</table>"));
      const bloc = page.slice(debut, page.indexOf("</section>", debut));
      expect(bloc).toContain(`<h2>${L.recap}</h2>`);
      const rang = [L.basePrice, L.servicesTotal, L.total, L.deposit].map((libelle) => bloc.indexOf(`<dt>${libelle}</dt>`));
      expect(rang.every((i) => i >= 0)).toBe(true);
      expect([...rang].sort((a, b) => a - b)).toEqual(rang);
    }
  });

  it("les libellés du récapitulatif ne sont PAS dans le tableau des prestations (deux blocs, pas un seul mélangé)", () => {
    const page = rendre(devis());
    const tableau = page.slice(page.indexOf("<table"), page.indexOf("</table>"));
    for (const libelle of [LIBELLES.fr.basePrice, LIBELLES.fr.servicesTotal, LIBELLES.fr.total, LIBELLES.fr.deposit]) {
      expect(tableau).not.toContain(libelle);
    }
  });

  it("sans prestation, le récapitulatif est là quand même — la location, un total de prestations à zéro, le total, l'acompte (les valeurs stockées)", () => {
    const r = devis({ lines: [], servicesTotalCents: 0, totalCents: 18_000_000, depositCents: 5_400_000 });
    const page = rendre(r);
    const bloc = page.slice(page.indexOf('<section class="recap">'));
    for (const cents of [r.basePriceCents, r.servicesTotalCents, r.totalCents, r.depositCents]) {
      expect(bloc).toContain(formatDZD(cents));
    }
  });

  it("les montants et les libellés s'alignent par des propriétés LOGIQUES : aucune propriété physique (left, right, margin-left…) dans la feuille du document", () => {
    const page = rendre(devis());
    const feuille = page.slice(page.indexOf("<style>"), page.indexOf("</style>"));
    expect(/\b(?:margin|padding|border)-(?:left|right)\b|\b(?:left|right)\s*:|text-align\s*:\s*(?:left|right)/.exec(feuille)?.[0] ?? null).toBeNull();
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

  it("le client s'imprime quand le devis y est lié", () => {
    expect(rendre(devis())).toContain("Amina Bensalem");
  });

  it("⛔ rang 39 : la référence imprimée est la référence STOCKÉE du devis (année, salle, devis, version) — dans le titre du document ET dans l'en-tête, dans les deux langues", () => {
    for (const locale of ["fr", "ar"] as const) {
      const page = rendre(devis(), locale);
      expect(page).toContain("<title>");
      expect(page.slice(page.indexOf("<title>"), page.indexOf("</title>"))).toContain("DEVIS-2026-0003-0014 v2");
      expect(page.slice(page.indexOf('<p class="sous">'), page.indexOf("</p>", page.indexOf('<p class="sous">')))).toContain("DEVIS-2026-0003-0014 v2");
    }
  });

  it("⛔ rang 39 : la référence imprimée change AVEC la ligne stockée — rien n'est recalculé depuis l'identifiant", () => {
    const page = rendre(devis({ reference: "DEVIS-2027-0011-0102 v5" }));
    expect(page).toContain("DEVIS-2027-0011-0102 v5");
    expect(page).not.toContain("DEVIS-2026-0003-0014");
    // l'ancienne formule (les huit premiers caractères de l'identifiant) a disparu
    expect(page).not.toContain(ID.slice(0, 8));
  });

  it("⛔ rang 39 (F-16) : la référence est isolée de GAUCHE À DROITE dans l'en-tête, même dans une page arabe — sinon l'algorithme bidirectionnel inverse ses groupes de chiffres", () => {
    for (const locale of ["fr", "ar"] as const) {
      const page = rendre(devis(), locale);
      expect(page).toContain('<bdi dir="ltr">DEVIS-2026-0003-0014 v2</bdi>');
    }
  });

  it("⛔ rang 39 : une référence hostile devient du TEXTE (le champ vient d'une ligne de base, pas d'une saisie, mais l'échappement ne dépend pas de la confiance)", () => {
    const page = rendre(devis({ reference: `<script>window.x=1</script> v1` }));
    expect(page.slice(page.indexOf("<body>"))).not.toContain("<script>");
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
        client: { firstName: HOSTILE, lastName: HOSTILE },
        slot: { nameFr: HOSTILE, nameAr: HOSTILE, startMinutes: 1200, endMinutes: 1560 },
        lines: [ligne({ nameFr: HOSTILE, nameAr: HOSTILE, lineTotalCents: 100 })]
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
    const f = quoteDocumentFilename(devis({ venue: { nameFr: HOSTILE, nameAr: HOSTILE }, client: { firstName: HOSTILE, lastName: HOSTILE } }), "fr");
    expect(f).toMatch(/^DEVIS-\d{4}-\d{4,}-\d{4,}_(fr|ar)_v\d+\.pdf$/);
    expect(f).toBe("DEVIS-2026-0003-0014_fr_v2.pdf");
  });
});

describe("rang 38 — la lecture des lignes STOCKÉES : une forme inattendue LÈVE, elle ne s'imprime pas à moitié (P-3)", () => {
  const STOCKEE = {
    serviceId: "01a1314b-2a98-7f11-9bdd-e6754ff47268",
    tierId: null,
    nameFr: "Traiteur",
    nameAr: "مطعم",
    pricingType: "FIXED",
    tierLabelFr: null,
    tierLabelAr: null,
    unitPriceCents: 2_300_000,
    quantity: 1,
    lineTotalCents: 2_300_000
  };

  it("les quatre types de tarification sont lus avec leur type, leur quantité et le nom du palier (FR et AR) tels que stockés", () => {
    const lues = parseStoredLines([
      STOCKEE,
      { ...STOCKEE, pricingType: "PER_GUEST", quantity: 150, lineTotalCents: 37_500_000 },
      { ...STOCKEE, pricingType: "PER_UNIT", quantity: 40, lineTotalCents: 800_000 },
      { ...STOCKEE, pricingType: "TIERED", tierId: "t1", tierLabelFr: "Formule Prestige", tierLabelAr: "الصيغة الفاخرة", lineTotalCents: 5_000_000 }
    ]);
    expect(lues.map((l) => l.pricingType)).toEqual(["FIXED", "PER_GUEST", "PER_UNIT", "TIERED"]);
    expect(lues.map((l) => l.quantity)).toEqual([1, 150, 40, 1]);
    expect(lues[3]).toMatchObject({ tierLabelFr: "Formule Prestige", tierLabelAr: "الصيغة الفاخرة", lineTotalCents: 5_000_000 });
    expect(lues[0]).toMatchObject({ tierLabelFr: null, tierLabelAr: null });
  });

  it("un type de tarification INCONNU ou ABSENT lève", () => {
    expect(() => parseStoredLines([{ ...STOCKEE, pricingType: "AU_FORFAIT" }])).toThrow(TypeError);
    const sans = Object.fromEntries(Object.entries(STOCKEE).filter(([cle]) => cle !== "pricingType"));
    expect(() => parseStoredLines([sans])).toThrow(TypeError);
  });

  it("⛔ une ligne « à paliers » dont le nom du palier n'est pas stocké (FR ou AR) lève", () => {
    const palier = { ...STOCKEE, pricingType: "TIERED", tierId: "t1" };
    expect(() => parseStoredLines([{ ...palier, tierLabelFr: "Formule", tierLabelAr: null }])).toThrow(TypeError);
    expect(() => parseStoredLines([{ ...palier, tierLabelFr: null, tierLabelAr: "صيغة" }])).toThrow(TypeError);
    expect(() => parseStoredLines([{ ...palier, tierLabelFr: "", tierLabelAr: "صيغة" }])).toThrow(TypeError);
  });

  it("tout le reste de la forme garde sa garde (un non-tableau, une quantité non entière, un total absent)", () => {
    expect(() => parseStoredLines({})).toThrow(TypeError);
    expect(() => parseStoredLines([{ ...STOCKEE, quantity: 1.5 }])).toThrow(TypeError);
    expect(() => parseStoredLines([{ ...STOCKEE, lineTotalCents: undefined }])).toThrow(TypeError);
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

  it("⛔ rang 38 (P-3) : le nom du palier est lu sur la LIGNE — le modèle, la politique, le service et le port n'importent ni Prisma ni un catalogue (seul l'adaptateur de lecture parle à la base)", () => {
    for (const f of FICHIERS.filter((x) => x !== "quote-document-source.prisma.ts")) {
      const code = lire(f);
      expect({ f, motif: /prisma|catalogue|ServicePricing\b|unitName/i.exec(code)?.[0] ?? null }).toEqual({ f, motif: null });
    }
  });

  it("⛔ rang 39 (F-10) : l'ancienne référence (les huit premiers caractères de l'identifiant) a disparu du document, de son service, de sa source ET du contrat partagé", () => {
    for (const f of [...FICHIERS, "../../../../packages/types/src/quote.ts"]) {
      const code = lire(f);
      expect({ f, motif: /\.slice\(\s*0\s*,\s*8\s*\)|\bquoteReference\b/.exec(code)?.[0] ?? null }).toEqual({ f, motif: null });
    }
  });

  it("⛔ rang 39 : le modèle IMPRIME la référence lue (`record.reference`) — il n'en bâtit pas une, il n'importe pas la formule", () => {
    const code = lire("quote-document.ts");
    expect(code).toContain("record.reference");
    expect(/formatQuoteReference/.exec(code)?.[0] ?? null).toBeNull();
  });

  it("⛔ rang 38 (P-15) : la branche « langue du client » est RETIRÉE sans code mort — plus de `chooseDocumentLocale`, de `DocumentLocaleBranch`, de `branch`, ni de `users.locale` lue", () => {
    for (const f of FICHIERS) {
      const code = lire(f);
      expect({ f, motif: /chooseDocumentLocale|DocumentLocaleBranch|clientLocale|\bbranch\b|locale:\s*true|client\??\.locale/.exec(code)?.[0] ?? null }).toEqual({ f, motif: null });
    }
  });
});
