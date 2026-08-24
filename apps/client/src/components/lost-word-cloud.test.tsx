// Nuage de mots de la 404 — décor, et rien d'autre.
//
// ⚠ CE QUE CE FICHIER NE MESURE PAS, écrit plutôt que tu.
// `LATIN_LOST_WORDS` n'est PAS la source du rendu : les mots sont posés à la
// main dans le JSX, chacun avec ses coordonnées, dans les DEUX canevas. La
// constante est donc une LISTE DE CONTRÔLE, pas une autorité — elle attrape
// un mot retiré du dessin, jamais un mot ajouté au dessin sans y figurer.
// L'écrire ici évite qu'un prochain lecteur la prenne pour ce qu'elle n'est
// pas et « simplifie » le composant en bouclant dessus : les positions
// seraient perdues.
//
// ⚠ Le nuage est HORS de l'arbre d'accessibilité (`aria-hidden`), donc
// `getAllByText` est le seul accès possible : `getByRole` ne le verrait pas.
// Les deux canevas rendent les mêmes mots, d'où `getAllByText` et non
// `getByText`, qui lèverait sur le doublon.
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LostWordCloud, LATIN_LOST_WORDS } from "./lost-word-cloud";

describe("LostWordCloud", () => {
  it("rend tout le vocabulaire darija demandé en latin", () => {
    render(<LostWordCloud />);

    for (const word of LATIN_LOST_WORDS) {
      expect(screen.getAllByText(word).length).toBeGreaterThan(0);
    }
  });

  it("mélange latin et arabe dans deux SVG décoratifs adaptés à l'écran", () => {
    const { container } = render(<LostWordCloud />);
    const clouds = container.querySelectorAll("svg");

    expect(clouds).toHaveLength(2);
    for (const cloud of clouds) {
      expect(cloud).toHaveAttribute("aria-hidden", "true");
      expect(cloud).toHaveAttribute("focusable", "false");
    }

    expect(screen.getAllByText("ضيّعنا الكورتيج").length).toBeGreaterThan(0);
    expect(screen.getAllByText("تلفتو الطريق").length).toBeGreaterThan(0);
  });
});
