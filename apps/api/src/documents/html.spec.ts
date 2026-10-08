import { describe, expect, it } from "vitest";
import { escapeHtml, html, isSafeHtml, raw, toHtmlString } from "./html";

// Rang 33 (D326), décision 3 — « toute donnée insérée dans le modèle est échappée ». Ce fichier mesure la GARDE ELLE-MÊME : la balise de gabarit.
// Le modèle du devis (quote-document.spec.ts) la mesure, lui, sur des noms hostiles de bout en bout.
describe("html — l'échappement est le COMPORTEMENT PAR DÉFAUT", () => {
  const HOSTILE = `<script>alert("x")</script> & 'y'`;

  it("escapeHtml remplace les cinq caractères actifs, et RIEN d'autre", () => {
    expect(escapeHtml(HOSTILE)).toBe("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;");
    // Un texte arabe et un texte sans caractère actif ressortent à l'identique (on n'échappe pas ce qui n'a pas à l'être).
    expect(escapeHtml("قاعة الياسمين — 150")).toBe("قاعة الياسمين — 150");
  });

  it("escapeHtml échappe « & » EN PREMIER : « &lt; » saisi ne devient pas « < »", () => {
    // Un échappement fait dans le désordre (« < » avant « & ») produirait « &amp;lt; » lu comme « &lt; » puis « < » : le test pose l'ordre.
    expect(escapeHtml("&lt;")).toBe("&amp;lt;");
  });

  it("une valeur interpolée est ÉCHAPPÉE sans que l'appelant l'ait demandé", () => {
    const fragment = html`<p>${HOSTILE}</p>`;
    expect(toHtmlString(fragment)).toBe("<p>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;</p>");
    expect(toHtmlString(fragment)).not.toContain("<script>");
  });

  it("un nombre est inséré ; un tableau est rendu élément par élément, chacun échappé", () => {
    expect(toHtmlString(html`<i>${150}</i>`)).toBe("<i>150</i>");
    expect(toHtmlString(html`<ul>${["<a>", "b"].map((x) => html`<li>${x}</li>`)}</ul>`)).toBe("<ul><li>&lt;a&gt;</li><li>b</li></ul>");
    // Un tableau de CHAÎNES (pas de fragments) est échappé aussi : la garde ne dépend pas du fait que l'appelant ait emballé ses éléments.
    expect(toHtmlString(html`${["<b>"]}`)).toBe("&lt;b&gt;");
  });

  it("raw() est le SEUL moyen d'insérer du balisage, et il est exempt d'échappement", () => {
    const fragment = html`<style>${raw("a > b { color: red }")}</style>`;
    expect(toHtmlString(fragment)).toBe("<style>a > b { color: red }</style>");
  });

  it("un fragment déjà sûr n'est PAS échappé une seconde fois", () => {
    const interne = html`<b>${"x & y"}</b>`;
    expect(toHtmlString(html`<p>${interne}</p>`)).toBe("<p><b>x &amp; y</b></p>");
  });

  it("un objet qui N'est PAS un fragment sûr ne passe pas pour tel — même s'il en a la forme", () => {
    // Une saisie ne peut pas se faire passer pour un fragment de confiance : la marque est un Symbol que seul ce module possède.
    const imposteur = { value: "<script>1</script>" };
    expect(isSafeHtml(imposteur)).toBe(false);
    expect(() => html`<p>${imposteur}</p>`).toThrow(TypeError);
  });

  it("une valeur non insérable LÈVE au lieu d'imprimer « [object Object] » ou « null »", () => {
    expect(() => html`<p>${null}</p>`).toThrow(/null/);
    expect(() => html`<p>${undefined}</p>`).toThrow(/undefined/);
    expect(() => html`<p>${{}}</p>`).toThrow(TypeError);
  });
});
