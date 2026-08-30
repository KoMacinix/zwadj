// Nuage de mots de la 404 — décor de fond, plein écran.
//
// ⚠ CE QUI SE MESURE ICI N'EST PAS « ÇA REND ». Quatre propriétés portent la
// demande, et aucune ne se vérifie à l'œil sur une capture :
//   1. AUCUN CHEVAUCHEMENT entre deux mots ;
//   2. RIEN au centre, là où vivent le titre et les boutons ;
//   3. la disposition REMPLIT le canevas, avec des tailles VARIÉES ;
//   4. elle est STABLE — sinon écart d'hydratation et saut visuel.
// On les mesure sur la SORTIE de `disposerNuage`, pas sur le DOM : le DOM dirait
// « il y a des mots », jamais « celui-ci mord sur celui-là ».
//
// ⛔ CE QUE CE FICHIER NE PEUT PAS MESURER, écrit plutôt que tu. La géométrie
// vérifiée ici est celle des BOÎTES. Elle ne coïncide avec le dessin que parce
// que chaque `<text>` porte `textLength` : l'attribut impose au navigateur la
// largeur qui a servi à réserver la place. Retirer `textLength` laisserait ces
// tests VERTS pendant que les mots se marcheraient dessus à l'écran — d'où le
// test de rendu « la largeur calculée est IMPOSÉE au dessin », plus bas.
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  ARABIC_LOST_WORDS,
  LATIN_LOST_WORDS,
  LOST_WORDS,
  LostWordCloud,
  type MotPlace,
  NUAGE_COMPACT,
  NUAGE_LARGE,
  chevauchent,
  disposerNuage,
  largeurDuMot
} from "./lost-word-cloud";

/** Les mêmes constantes que le composant, reconstruites ici pour vérifier sa
 *  sortie de l'extérieur. ⚠ Si elles divergent, c'est le test qui ment. */
const MARGE = 0.16;
const HAUTEUR_LIGNE = { fr: 1, ar: 1.25 } as const;

function boiteDe(mot: MotPlace) {
  const largeurTexte = largeurDuMot(mot.texte, mot.lang, mot.taille);
  const hauteurTexte = mot.taille * (mot.lang === "ar" ? HAUTEUR_LIGNE.ar : HAUTEUR_LIGNE.fr);
  const marge = mot.taille * MARGE;
  const l = (mot.vertical ? hauteurTexte : largeurTexte) + marge * 2;
  const h = (mot.vertical ? largeurTexte : hauteurTexte) + marge * 2;
  return { x1: mot.x - l / 2, x2: mot.x + l / 2, y1: mot.y - h / 2, y2: mot.y + h / 2 };
}

const CANEVAS = [
  ["large", NUAGE_LARGE, 1200, 800, { largeur: 0.56, hauteur: 0.42 }],
  ["compact", NUAGE_COMPACT, 420, 900, { largeur: 0.9, hauteur: 0.34 }]
] as const;

describe("disposerNuage — les propriétés demandées", () => {
  it.each(CANEVAS)("⛔ canevas %s : PAS UN SEUL chevauchement", (_nom, places) => {
    // Comparaison de toutes les paires. Une seule collision suffit à faire
    // rougir : c'est la demande, elle n'admet pas de tolérance.
    const fautes: string[] = [];
    for (let i = 0; i < places.length; i += 1) {
      for (let j = i + 1; j < places.length; j += 1) {
        const a = places[i];
        const b = places[j];
        if (a && b && chevauchent(boiteDe(a), boiteDe(b))) fautes.push(`${a.texte} × ${b.texte}`);
      }
    }
    expect(fautes).toEqual([]);
    expect(places.length).toBeGreaterThan(20);
  });

  it.each(CANEVAS)("⛔ canevas %s : le CENTRE est vide", (_nom, places, largeur, hauteur, vide) => {
    // Le titre, la phrase et les deux boutons y vivent. Un mot qui déborde dans
    // ce rectangle passe DERRIÈRE du texte lisible — c'est précisément ce qu'on
    // ne veut plus.
    const zone = {
      x1: largeur * (0.5 - vide.largeur / 2),
      x2: largeur * (0.5 + vide.largeur / 2),
      y1: hauteur * (0.5 - vide.hauteur / 2),
      y2: hauteur * (0.5 + vide.hauteur / 2)
    };
    expect(places.filter((m) => chevauchent(boiteDe(m), zone)).map((m) => m.texte)).toEqual([]);
  });

  it.each(CANEVAS)("canevas %s : rempli partout où c'est PERMIS", (_nom, places, largeur, hauteur, vide) => {
    const quadrants = new Set(
      places.map((m) => `${m.x < largeur / 2 ? "gauche" : "droite"}-${m.y < hauteur / 2 ? "haut" : "bas"}`)
    );
    expect(quadrants.size).toBe(4);

    // ⚠ « PERMIS », et la nuance n'est pas cosmétique. Écrite d'abord comme
    // « aucune bande de 20 % ne reste déserte », cette garde rougissait sur le
    // canevas compact — dont la bande centrale est ENTIÈREMENT réservée au
    // texte. Elle réclamait des mots là où on vient d'en interdire. Une bande
    // n'est donc exigée que si elle sort de la zone réservée.
    const hautVide = hauteur * (0.5 - vide.hauteur / 2);
    const basVide = hauteur * (0.5 + vide.hauteur / 2);
    for (const part of [0.2, 0.4, 0.6, 0.8, 1]) {
      const bas = hauteur * (part - 0.2);
      const haut = hauteur * part;
      const entierementReservee = bas >= hautVide && haut <= basVide;
      if (entierementReservee) continue;
      expect(places.some((m) => m.y <= haut && m.y > bas)).toBe(true);
    }
  });

  it.each(CANEVAS)("canevas %s : aucun mot ne déborde du cadre", (_nom, places, largeur, hauteur) => {
    for (const mot of places) {
      const b = boiteDe(mot);
      expect(b.x1).toBeGreaterThanOrEqual(0);
      expect(b.y1).toBeGreaterThanOrEqual(0);
      expect(b.x2).toBeLessThanOrEqual(largeur);
      expect(b.y2).toBeLessThanOrEqual(hauteur);
    }
  });

  it("⛔ TAILLES VARIÉES, et l'opacité les suit", () => {
    const tailles = [...new Set(NUAGE_LARGE.map((m) => m.taille))];
    expect(tailles.length).toBeGreaterThanOrEqual(5);
    expect(Math.max(...tailles)).toBeGreaterThan(Math.min(...tailles) * 3);

    // ⚠ Comparaison de MOYENNES : la profondeur repose sur la corrélation des
    // deux. Décorrélées, elles donneraient du bruit — un petit mot très net à
    // côté d'un grand mot pâle ne se lit pas comme un arrière-plan.
    const opacites = [...new Set(NUAGE_LARGE.map((m) => m.opacite))].sort((a, b) => a - b);
    const moyenne = (o: number) => {
      const lot = NUAGE_LARGE.filter((m) => m.opacite === o);
      return lot.reduce((somme, m) => somme + m.taille, 0) / lot.length;
    };
    expect(opacites.length).toBeGreaterThanOrEqual(4);
    expect(moyenne(opacites[opacites.length - 1] ?? 0)).toBeGreaterThan(moyenne(opacites[0] ?? 0));
  });

  it("⛔ DISPOSITION STABLE : deux appels rendent exactement le même dessin", () => {
    // ⚠ LA GARDE QUI PROTÈGE L'HYDRATATION. Le jour où quelqu'un remplace la
    // graine par `Math.random()` ou `Date.now()` « pour varier », le serveur et
    // le navigateur ne dessinent plus la même chose : React signale un écart et
    // le nuage saute sous les yeux du visiteur. Rien d'autre ne s'en
    // apercevrait.
    const options = {
      largeur: 1200,
      hauteur: 800,
      graine: 20260824,
      videCentral: { largeur: 0.56, hauteur: 0.42 }
    };
    expect(disposerNuage(options)).toEqual(disposerNuage(options));
    expect(NUAGE_LARGE).toEqual(disposerNuage(options));
    // Contre-épreuve : sans elle, une grille figée passerait le test ci-dessus
    // les doigts dans le nez.
    expect(disposerNuage({ ...options, graine: 7 })).not.toEqual(NUAGE_LARGE);
  });

  it("tout le vocabulaire est employé, sur chaque canevas", () => {
    for (const [, places] of CANEVAS.map((c) => [c[0], c[1]] as const)) {
      expect(new Set(places.map((m) => m.texte)).size).toBe(LOST_WORDS.length);
    }
    expect(LOST_WORDS.length).toBe(LATIN_LOST_WORDS.length + ARABIC_LOST_WORDS.length);
  });

  it("les deux écritures se mêlent", () => {
    for (const [, places] of CANEVAS.map((c) => [c[0], c[1]] as const)) {
      expect(places.some((m) => m.lang === "ar")).toBe(true);
      expect(places.some((m) => m.lang === "fr")).toBe(true);
    }
  });
});

describe("LostWordCloud — le rendu", () => {
  it("deux canevas, tous deux DÉCORATIFS et couvrants", () => {
    const { container } = render(<LostWordCloud />);
    const canevas = container.querySelectorAll("svg");
    expect(canevas).toHaveLength(2);
    for (const c of canevas) {
      expect(c).toHaveAttribute("aria-hidden", "true");
      expect(c).toHaveAttribute("focusable", "false");
      // `slice` : le canevas couvre le conteneur au lieu de s'y insérer avec des
      // marges. Sans lui, le nuage ne remplit plus l'écran.
      expect(c).toHaveAttribute("preserveAspectRatio", "xMidYMid slice");
    }
    expect(container.querySelector(".lost-word-cloud")).toHaveAttribute("aria-hidden", "true");
  });

  it("⛔ la largeur calculée est IMPOSÉE au dessin — sans quoi tout le reste ment", () => {
    // C'est le seul point où la géométrie vérifiée plus haut rejoint ce que le
    // navigateur trace. `textLength` sans `lengthAdjust` ne changerait que
    // l'espacement des lettres et laisserait les glyphes déborder.
    const { container } = render(<LostWordCloud />);
    const textes = [...container.querySelectorAll("text")];
    expect(textes.length).toBe(NUAGE_LARGE.length + NUAGE_COMPACT.length);
    for (const t of textes) {
      expect(t.getAttribute("textLength")).toBeTruthy();
      expect(t).toHaveAttribute("lengthAdjust", "spacingAndGlyphs");
    }
  });

  it("chaque mot du vocabulaire apparaît", () => {
    render(<LostWordCloud />);
    for (const mot of [...LATIN_LOST_WORDS, ...ARABIC_LOST_WORDS]) {
      expect(screen.getAllByText(mot).length).toBeGreaterThan(0);
    }
  });

  it("⚠ l'arabe porte sa direction, y compris en SVG", () => {
    const { container } = render(<LostWordCloud />);
    const arabes = container.querySelectorAll('text[lang="ar"]');
    expect(arabes.length).toBeGreaterThan(0);
    for (const t of arabes) {
      expect(t).toHaveAttribute("direction", "rtl");
    }
  });
});
