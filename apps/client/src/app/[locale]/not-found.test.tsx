// TESTS DE LA 404 — point B, volet front. (D233)
//
// ⚠ POURQUOI CE FICHIER EXISTE, ET POURQUOI IL COMMENCE PAR LE SYSTÈME DE
// FICHIERS. Le point B a été livré le 19/08/2026 avec deux pages 404 correctes
// — traduites, dans la charte, deux sorties — et AUCUNE des deux ne s'est
// jamais rendue pour un visiteur. Deux causes, toutes deux hors du contenu :
//   1. la page racine s'appelait `_not-found.tsx`. Le routeur ne reconnaît
//      qu'une liste FERMÉE de noms spéciaux ; ce fichier n'était pas une route.
//   2. `[locale]/not-found.tsx` n'est une frontière que pour un segment DÉJÀ
//      apparié : une URL inconnue n'apparie pas `[locale]`, donc Next remontait
//      au 404 racine — c'est-à-dire, vu (1), à rien.
//
// ⛔ UN TEST DE RENDU SERAIT RESTÉ VERT PENDANT TOUT CE TEMPS. Monter le
// composant et vérifier qu'il affiche « Cette page n'existe pas » ne mesure pas
// que quelqu'un l'atteint. C'est le motif de D218 et de D228 : la porte était
// verte sur un comportement cassé. D'où le premier bloc ci-dessous, qui mesure
// des NOMS DE FICHIERS — la seule chose qui avait cédé.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, relative } from "node:path";
import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { vi } from "vitest";
import { messages } from "@zwadj/i18n";
import LocaleNotFound from "./not-found";
import RootNotFound from "../not-found";

// Idiome relevé sur `components/site-nav.test.tsx` : le `Link` localisé est
// remplacé par un `<a href>` nu. ⚠ D209 — un `<a>` SANS `href` n'a pas le rôle
// `link` ; le `href` est donc porté, sinon les assertions ci-dessous
// passeraient à côté de leur cible en silence.
vi.mock("../../i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  )
}));

/** Racine de `src/app`, dérivée de l'emplacement de CE fichier — pas du
 *  répertoire de travail, qui dépend de l'endroit d'où Vitest est lancé.
 *  ⚠ `__dirname` et non `import.meta.url` : le chemin de ce fichier contient
 *  des crochets (`[locale]`), et `new URL(".", …)` ne les rend pas à un chemin
 *  de fichier — mesuré, l'appel lève « The URL must be of scheme file ». */
const APP = resolve(__dirname, "..");

/** Dossiers du routeur dont le `page.tsx` peut lever `notFound()`.
 *
 *  ⚠ Relevés en lisant la SOURCE, jamais énumérés à la main : une liste écrite
 *  ici vieillirait en silence, et c'est précisément ce genre de silence que ce
 *  fichier existe pour empêcher. */
function dossiersQuiRefusent(racine: string): string[] {
  const trouves: string[] = [];
  const parcourir = (dossier: string) => {
    for (const entree of readdirSync(dossier, { withFileTypes: true })) {
      const chemin = resolve(dossier, entree.name);
      if (entree.isDirectory()) parcourir(chemin);
      else if (entree.name === "page.tsx" && readFileSync(chemin, "utf-8").includes("notFound();")) {
        trouves.push(dossier);
      }
    }
  };
  parcourir(racine);
  return trouves;
}

describe("404 — conventions de routage (ce qui avait réellement cédé)", () => {
  it("⛔ la 404 racine s'appelle `not-found.tsx`, sans tiret bas", () => {
    // Le tiret bas est ce qui la rendait invisible au routeur. On mesure les
    // DEUX faces : le bon nom présent, l'ancien nom absent — sans quoi une
    // copie oubliée laisserait croire que la question est réglée.
    expect(existsSync(resolve(APP, "not-found.tsx"))).toBe(true);
    expect(readdirSync(APP)).not.toContain("_not-found.tsx");
  });

  it("⛔ l'attrape-tout `[locale]/[...rest]/page.tsx` est au chemin conventionnel", () => {
    // Sans lui, `[locale]/not-found.tsx` n'est atteint QUE par un `notFound()`
    // levé depuis une page du segment. Une URL inconnue retombe sur le 404
    // anglais de Next. Aucun test de RENDU ne s'en apercevrait.
    //
    // ⚠ CE QUE CETTE ASSERTION NE DÉMONTRE PAS, mesuré au harnais (cible C3).
    // Supprimer le fichier ne la fait pas rougir : elle ne s'exécute même pas.
    // Vite analyse statiquement le `import()` du test suivant et tombe à la
    // COLLECTE (« Failed to resolve import »), donc tout le fichier échoue
    // sans annoncer un seul titre. La garde qui MORD sur une suppression est
    // cet import-là, pas cette ligne-ci.
    // Ce qui reste à cette ligne, et qui justifie de la garder : elle NOMME le
    // chemin attendu. Un attrape-tout déplacé sous un autre segment, ou renommé
    // `[...slug]`, produit sinon une erreur de résolution opaque que personne
    // ne relie au 404.
    expect(existsSync(resolve(APP, "[locale]", "[...rest]", "page.tsx"))).toBe(true);
  });

  it("⛔ AUCUNE `loading.tsx` ne surplombe une page qui peut refuser", () => {
    // ⚠ LA GARDE LA PLUS IMPORTANTE DE CE FICHIER, et la moins évidente.
    // Une frontière Suspense au-dessus d'un `notFound()` fait vider la coquille
    // AVANT que le refus ne remonte : l'en-tête HTTP est déjà parti, et le 404
    // sort en **200**. C'est un soft-404 — la page se fait indexer comme une
    // vraie page, et toute sonde de supervision lit « tout va bien ».
    // Mesuré le 23/08/2026 : `[locale]/loading.tsx` mettait `/fr/nimportequoi`
    // ET la fiche de salle dépubliée en 200, alors que cette dernière portait
    // l'invariant contraire écrit dans son propre fichier.
    //
    // ⚠ Les pages concernées sont RELEVÉES DANS LA SOURCE, pas listées ici :
    // une troisième page qui apprendrait à refuser serait couverte le jour où
    // elle est écrite, sans que personne n'ait à penser à cette garde.
    const fautes: string[] = [];
    for (const dossier of dossiersQuiRefusent(APP)) {
      // Le balayage inclut le dossier de la page elle-même : une `loading.tsx`
      // posée À CÔTÉ du `page.tsx` l'enveloppe tout autant qu'une ancêtre.
      for (let courant = dossier; courant.startsWith(APP); courant = resolve(courant, "..")) {
        if (existsSync(resolve(courant, "loading.tsx"))) {
          fautes.push(`${relative(APP, courant) || "."}/loading.tsx surplombe ${relative(APP, dossier)}`);
        }
        if (courant === APP) break;
      }
    }
    expect(fautes).toEqual([]);
  });

  it("l'attrape-tout ne rend rien : il lève `notFound()`", async () => {
    const notFound = vi.fn(() => {
      // La vraie fonction lève ; un espion muet laisserait passer un
      // attrape-tout qui RETOURNE au lieu de lever, donc qui rendrait une page
      // vide avec un statut 200.
      throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
    });
    vi.doMock("next/navigation", () => ({ notFound }));
    const { default: CatchAll } = await import("./[...rest]/page");
    expect(() => CatchAll()).toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
    expect(notFound).toHaveBeenCalledTimes(1);
    vi.doUnmock("next/navigation");
  });
});

function poser(locale: "fr" | "ar") {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      <LocaleNotFound />
    </NextIntlClientProvider>
  );
}

describe("404 localisée — contenu", () => {
  // ⚠ Les libellés attendus sont LUS dans `packages/i18n`, jamais retapés :
  // une chaîne recopiée à la main diverge dès la première retouche de
  // traduction, et le test devient un test de ma frappe.
  it.each(["fr", "ar"] as const)("dit au visiteur, en %s, que la page n'existe pas", (locale) => {
    poser(locale);
    const t = messages[locale].notFound;
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(t.title);
    expect(screen.getByText(t.body)).toBeInTheDocument();
  });

  it("⛔ ne laisse échapper AUCUN texte anglais par défaut", () => {
    poser("fr");
    // La phrase que Next affiche quand rien ne le remplace. Sa présence
    // signifierait qu'on mesure la page de Next, pas la nôtre.
    expect(document.body.textContent).not.toContain("This page could not be found");
  });

  it("offre DEUX sorties, et la première mène aux salles", () => {
    poser("fr");
    const t = messages.fr.notFound;
    const liens = screen.getAllByRole("link");
    expect(liens).toHaveLength(2);
    // L'ordre compte : le cas fréquent est une fiche dépubliée, donc « voir les
    // salles » vient avant « accueil ». Un jour où les deux seraient inversés,
    // le visiteur le plus fréquent se retrouverait renvoyé à la case départ.
    expect(liens[0]).toHaveAccessibleName(t.venues);
    expect(liens[0]).toHaveAttribute("href", "/salles");
    expect(liens[1]).toHaveAccessibleName(t.home);
    expect(liens[1]).toHaveAttribute("href", "/");
  });

  it("⛔ AUCUN « 404 » à l'écran — le code vit dans le statut HTTP", () => {
    // Demande explicite du 23/08/2026. Le chiffre était affiché en très grand
    // au-dessus du titre ; il ne disait rien au visiteur que la phrase ne dise
    // mieux, et il écrasait le nuage de mots qui occupe désormais la page.
    // ⚠ La garde porte sur le TEXTE RENDU, pas sur une classe : renommer
    // `.notfound-code` en la gardant à l'écran ne doit pas passer.
    poser("fr");
    expect(screen.queryByText("404")).toBeNull();
    expect(document.body.textContent).not.toContain("404");
  });

  it("⛔ le décor EST là, et il reste DÉCORATIF", () => {
    // Rien ne le vérifiait : on pouvait retirer le décor des deux pages sans
    // qu'un seul test bouge. C'est pourtant tout ce que le visiteur voit
    // d'abord.
    const { container } = poser("fr");
    const nuage = container.querySelector("img.lost-word-cloud");
    expect(nuage).not.toBeNull();
    // ⚠ `alt=""` est le traitement EXACT d'une image sans valeur
    // d'information : elle sort de l'arbre d'accessibilité. `alt` absent la
    // laisserait annoncée par son nom de fichier.
    expect(nuage).toHaveAttribute("alt", "");
    expect(nuage).toHaveAttribute("aria-hidden", "true");
    expect(nuage).toHaveAttribute("src", "/404-nuage.svg");
  });

  it("⛔ l'image du décor EXISTE, et elle est faite de TRACÉS", () => {
    // ⚠ LA SEULE GARDE QUI RESTE SUR L'ARTEFACT, et elle porte sur les deux
    // choses qui peuvent casser en silence :
    //   — un `src` qui ne pointe sur rien : le fond devient vide, aucune
    //     erreur, aucun test de rendu ne bouge ;
    //   — un fichier « optimisé » où les tracés seraient redevenus du
    //     `<text>` : une image en `<img>` n'accède pas aux polices de la
    //     page, donc l'arabe s'y afficherait en lettres NON LIÉES. Le défaut
    //     ne se verrait que sur la moitié arabe du public.
    const chemin = resolve(APP, "..", "..", "public", "404-nuage.svg");
    expect(existsSync(chemin)).toBe(true);
    const svg = readFileSync(chemin, "utf-8");
    // ⚠ COMMENTAIRES RETIRÉS AVANT DE CHERCHER. Mesuré : le fichier explique
    // dans son propre en-tête pourquoi il n'utilise pas `<text>` — et la
    // garde rougissait sur cette phrase. Elle mesurait sa documentation au
    // lieu de son balisage.
    const balisage = svg.replace(/<!--[\s\S]*?-->/g, "");
    expect(balisage).toContain("<path");
    expect(balisage).not.toContain("<text");
    expect(svg).toContain('role="presentation"');
    // Budget de poids : ~188 ko brut, ~27 ko une fois compressé par le
    // serveur. Au-delà de 400 ko, quelque chose a été régénéré sans les
    // coordonnées arrondies.
    expect(svg.length).toBeLessThan(400_000);
  });
});

describe("404 racine — bilingue, et sans aucun fournisseur", () => {
  // ⚠ Rendue en CHAÎNE (`renderToStaticMarkup`), pas dans le DOM : la page
  // porte ses propres `<html>`/`<body>`, que React refuse d'imbriquer dans le
  // conteneur d'un test — l'avertissement ferait tomber le fichier via la garde
  // de `test-setup.ts`. Le rendu serveur est de toute façon le seul que cette
  // page connaisse.
  const markup = () => renderToStaticMarkup(<RootNotFound />);

  it("se rend SANS `NextIntlClientProvider` — c'est sa raison d'être", () => {
    // Aucun fournisseur n'est monté ici, volontairement. Le jour où quelqu'un
    // remplacera les chaînes en dur par `useTranslations`, ce test tombera —
    // avant que la page ne tombe chez un visiteur.
    expect(() => markup()).not.toThrow();
  });

  it("s'adresse au visiteur dans les DEUX langues", () => {
    const html = markup();
    expect(html).toContain("Cette page n’existe pas.");
    expect(html).toContain("هذه الصفحة غير موجودة.");
    // ⛔ TOUS les passages arabes, pas « au moins un ». Mesuré le 23/08/2026 :
    // quand la page est passée d'un seul `<p lang="ar">` à trois éléments
    // arabes, l'ancienne assertion (`toMatch` sur la première occurrence)
    // est restée VERTE alors qu'on lui retirait sa direction — il en restait
    // deux autres pour la satisfaire. Une garde qui se contente d'un exemple
    // ne mesure plus rien dès qu'il y en a deux.
    // Sans `dir="rtl"`, la ponctuation finale se place du mauvais côté.
    // ⚠ DEUX ATTRIBUTS POUR LA MÊME CHOSE, relevés sur le rendu réel et non
    // devinés : HTML écrit `dir="rtl"`, SVG écrit `direction="rtl"` (attribut
    // de présentation). Le nuage décoratif est du `<text>` SVG ; n'accepter
    // que la forme HTML ferait rougir un balisage parfaitement correct.
    const arabes = html.match(/<[a-z]+[^>]*\slang="ar"[^>]*>/g) ?? [];
    expect(arabes.length).toBeGreaterThan(0);
    for (const balise of arabes) {
      expect(balise).toMatch(/\sdir="rtl"|\sdirection="rtl"/);
    }
  });

  it("offre une sortie vers CHAQUE racine localisée", () => {
    const html = markup();
    expect(html).toContain('href="/fr"');
    expect(html).toContain('href="/ar"');
  });
});
