// ADM-2 (D350, rang 52, R-7, MD-ADM-9) — les écrans `/admin` ne sont NI indexables NI annoncés : `<meta name="robots" content="noindex, nofollow">` pendant qu'un écran de l'administration est monté.
//
// ⚠ L'app Pro est une SPA : un seul `index.html` pour toutes les adresses. À `b8e5511` elle ne portait AUCUNE balise `robots` (mesuré, `docs/preuves/D350/etat-des-lieux/`). Marquer `index.html` marquerait
// tout le Pro, ce que ce lot ne décide pas : la balise se pose donc au montage de la coquille de l'administration et se retire à son démontage. Un robot qui exécute le JavaScript la voit ; un robot qui ne
// l'exécute pas ne voit que la coquille vide de la SPA, sans donnée d'administration (aucun rendu serveur n'existe ici).
//
// Plusieurs écrans montés en même temps (ou le double montage de `StrictMode` en développement) ne laissent qu'UNE balise : un compteur de références, et la balise n'est retirée qu'au dernier démontage.
// ⚠ Il ne retire que SA balise (repérée par un attribut de données) : une balise `robots` posée par ailleurs n'est jamais touchée.
import { useEffect } from "react";

const MARQUE = "data-zwadj-noindex";
let references = 0;
let balise: HTMLMetaElement | null = null;

function poser(): void {
  references += 1;
  if (references === 1) {
    balise = document.createElement("meta");
    balise.setAttribute("name", "robots");
    balise.setAttribute("content", "noindex, nofollow");
    balise.setAttribute(MARQUE, "");
    document.head.appendChild(balise);
  }
}

function retirer(): void {
  references = Math.max(0, references - 1);
  if (references === 0 && balise !== null) {
    balise.remove();
    balise = null;
  }
}

/** À appeler par la coquille de l'administration. */
export function useNoIndex(): void {
  useEffect(() => {
    poser();
    return retirer;
  }, []);
}
