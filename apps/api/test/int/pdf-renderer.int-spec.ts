// Intégration du MOTEUR de rendu PDF — le VRAI Chromium. Rang 33 (D326), décisions 2, 3 et 6 du relecteur.
//
// Ce qui ne se prouve QU'ICI (le spec unitaire joue un faux navigateur, qui ne sait ni exécuter un script ni demander une image) :
//   - JavaScript est COUPÉ : un script qui change le titre du document ne le change pas dans le PDF ;
//   - le RÉSEAU est muet : une image et une feuille de style demandées à un serveur local ne l'atteignent JAMAIS ;
//   - la police du dépôt est EMBARQUÉE, et SEULE (aucun caractère ne retombe sur une police système) ;
//   - le navigateur est FERMÉ, sur le chemin du succès comme sur celui du délai ;
//   - le moteur n'est pas écrit pour le seul devis (décision 6) : un document quelconque passe par le même port.
// Le test n'a pas besoin de la base, mais `test:int` la prépare pour tous : il n'y touche pas.
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { chromium, type Browser } from "playwright-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PdfRenderUnavailableError } from "../../src/documents/pdf-renderer.port";
import { PlaywrightPdfRenderer } from "../../src/documents/playwright-pdf.renderer";
import { buildQuoteDocumentHtml } from "../../src/documents/quote-document";
import { loadDocumentFontCss } from "../../src/documents/quote-document-fonts";
import type { QuoteDocumentRecord } from "../../src/documents/quote-document-source";
import { fabriquePdf, pdfFonts, pdfPageCount, pdfTitle } from "./pdf-inspect";

const RENDU = 90_000;

const devisArabe: QuoteDocumentRecord = {
  id: "01a10f0a-5931-7a99-b800-a2cac272855a",
  version: 1,
  latestVersion: 1,
  status: "DRAFT",
  eventDate: "2026-12-05",
  guests: 150,
  basePriceCents: 18_000_000,
  servicesTotalCents: 45_000_000,
  totalCents: 63_000_000,
  depositCents: 12_345_000,
  lines: [{ nameFr: "Buffet ouvert", nameAr: "بوفيه مفتوح للضيوف", quantity: 150, lineTotalCents: 37_500_000 }],
  venue: { nameFr: "Salle des Jasmins", nameAr: "قاعة الياسمين للأفراح والمناسبات" },
  slot: { nameFr: "Soirée", nameAr: "سهرة", startMinutes: 1200, endMinutes: 1560 },
  client: { firstName: "آمنة", lastName: "بن سالم", locale: "ar" }
};

describe("pdf-inspect — le lecteur de PDF est calibré à deux bras (un lecteur qui répondrait « embarquée » à tout passerait le cas positif seul)", () => {
  const COMPOSITE = [
    "<< /Type /Font /Subtype /Type0 /BaseFont /AAAAAA+ReadexPro-Regular /Encoding /Identity-H /DescendantFonts [ 2 0 R ] >>",
    "<< /Type /Font /Subtype /CIDFontType2 /BaseFont /AAAAAA+ReadexPro-Regular /FontDescriptor 3 0 R >>",
    "<< /Type /FontDescriptor /FontName /AAAAAA+ReadexPro-Regular /FontFile2 4 0 R >>",
    "<< /Length 0 >>"
  ];

  it("positif : une police composite dont le descripteur référence un fichier est « embarquée »", () => {
    expect(pdfFonts(fabriquePdf(...COMPOSITE))).toEqual([
      { name: "AAAAAA+ReadexPro-Regular", subtype: "Type0", embedded: true },
      { name: "AAAAAA+ReadexPro-Regular", subtype: "CIDFontType2", embedded: true }
    ]);
  });

  it("négatif : un descripteur SANS fichier de police se lit « non embarquée »", () => {
    const sansFichier = [COMPOSITE[0]!, COMPOSITE[1]!, "<< /Type /FontDescriptor /FontName /AAAAAA+ReadexPro-Regular >>"];
    expect(pdfFonts(fabriquePdf(...sansFichier)).map((f) => f.embedded)).toEqual([false, false]);
  });

  it("négatifs : une police de base (Helvetica) n'est pas embarquée ; un PDF sans police n'en a aucune", () => {
    expect(pdfFonts(fabriquePdf("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"))).toEqual([{ name: "Helvetica", subtype: "Type1", embedded: false }]);
    expect(pdfFonts(fabriquePdf("<< /Type /Catalog /Pages 2 0 R >>"))).toEqual([]);
  });

  it("un flux d'objets compressé LÈVE : un lecteur qui n'en verrait que la moitié ferait passer un PDF sans police", () => {
    expect(() => pdfFonts(fabriquePdf("<< /Type /ObjStm /N 1 /First 4 >>"))).toThrow(/flux d'objets/);
  });

  it("le titre et le nombre de pages se lisent ; absents, ils se lisent absents", () => {
    expect(pdfTitle(fabriquePdf("<< /Title (Devis) /Creator (x) >>"))).toBe("Devis");
    expect(pdfTitle(fabriquePdf("<< /Creator (x) >>"))).toBeNull();
    expect(pdfPageCount(fabriquePdf("<< /Type /Pages /Count 2 >>", "<< /Type /Page >>", "<< /Type /Page >>"))).toBe(2);
  });
});

describe("PlaywrightPdfRenderer — le vrai Chromium", () => {
  const rendu = new PlaywrightPdfRenderer();
  let sonde: Server;
  let port = 0;
  let requetesRecues: string[] = [];

  beforeAll(async () => {
    // Un serveur LOCAL qui compte ce qu'on lui demande : si la page peut sortir sur le réseau, il le verra.
    sonde = createServer((req, res) => {
      requetesRecues.push(req.url ?? "");
      res.writeHead(200, { "content-type": "image/png" });
      res.end();
    });
    await new Promise<void>((ok) => sonde.listen(0, "127.0.0.1", ok));
    port = (sonde.address() as AddressInfo).port;
  });
  afterAll(async () => {
    await new Promise<void>((ok) => sonde.close(() => ok()));
  });

  it("rend un PDF d'UNE page — et un document QUELCONQUE passe par le même port (décision 6 : le moteur n'est pas écrit pour le seul acompte)", async () => {
    const pdf = await rendu.render("<!doctype html><title>autre</title><p>bonjour</p>");
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(pdfPageCount(pdf)).toBe(1);
    expect(pdfTitle(pdf)).toBe("autre");
  }, RENDU);

  it("garde 1 — JavaScript est COUPÉ : le script qui change le titre ne le change pas", async () => {
    const pdf = await rendu.render(`<!doctype html><title>avant</title><script>document.title = "apres";</script><p>x</p>`);
    expect(pdfTitle(pdf)).toBe("avant");
  }, RENDU);

  it("garde 2 — le RÉSEAU est muet : ni l'image ni la feuille de style n'atteignent le serveur local", async () => {
    requetesRecues = [];
    const html = `<!doctype html><title>t</title><link rel="stylesheet" href="http://127.0.0.1:${port}/style.css"><p>x</p><img src="http://127.0.0.1:${port}/pixel.png">`;
    const pdf = await rendu.render(html);
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    // Laisser au navigateur le temps de demander ce qu'il aurait demandé : un « zéro » prématuré serait vert pour la mauvaise raison.
    await new Promise((ok) => setTimeout(ok, 500));
    expect(requetesRecues).toEqual([]);
  }, RENDU);

  it("la police du DÉPÔT est embarquée, et SEULE : aucun caractère arabe ou latin ne retombe sur une police système", async () => {
    const html = buildQuoteDocumentHtml({ record: devisArabe, locale: "ar", issuedOn: "2026-10-06", fontCss: loadDocumentFontCss() });
    const polices = pdfFonts(await rendu.render(html));
    expect(polices.length).toBeGreaterThan(0);
    expect(polices.filter((f) => !f.embedded)).toEqual([]);
    // Toutes sont Readex Pro (sous-ensembles « arabic » et « latin », graisses 400 et 600) : une seule autre police dans le PDF dirait qu'une plage `unicode-range` est trop étroite.
    expect(polices.filter((f) => !/ReadexPro/.test(f.name))).toEqual([]);
  }, RENDU);

  it("le TÉMOIN sans la police ne porte pas Readex Pro : le test précédent discrimine donc quelque chose", async () => {
    const html = buildQuoteDocumentHtml({ record: devisArabe, locale: "ar", issuedOn: "2026-10-06", fontCss: "" });
    const polices = pdfFonts(await rendu.render(html));
    expect(polices.filter((f) => /ReadexPro/.test(f.name))).toEqual([]);
  }, RENDU);

  it("garde 3 — le navigateur est FERMÉ après un rendu réussi, et après un rendu qui dépasse son délai", async () => {
    const lances: Browser[] = [];
    const launch = async () => {
      const b = await chromium.launch();
      lances.push(b);
      return b;
    };
    await new PlaywrightPdfRenderer({ launch }).render("<p>ok</p>");
    // Un délai de 1 ms ne laisse pas le temps de lancer quoi que ce soit : le rendu échoue, et le navigateur — lancé ensuite, orphelin sans la garde — doit être fermé quand même.
    await expect(new PlaywrightPdfRenderer({ launch, timeoutMs: 1 }).render("<p>trop tard</p>")).rejects.toBeInstanceOf(PdfRenderUnavailableError);
    // Le lancement du second finit APRÈS le rejet : on attend (au plus 15 s) qu'il soit fini ET fermé, au lieu de dormir une durée choisie au jugé.
    for (let i = 0; i < 60 && !(lances.length === 2 && lances.every((b) => !b.isConnected())); i += 1) await new Promise((ok) => setTimeout(ok, 250));
    expect(lances.length).toBe(2);
    expect(lances.map((b) => b.isConnected())).toEqual([false, false]);
  }, RENDU);
});
