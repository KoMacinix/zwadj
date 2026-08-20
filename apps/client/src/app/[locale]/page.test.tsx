// Page d'accueil — lot Accueil.
//
// ⚠ TESTS RE-DÉRIVÉS DU COMPORTEMENT. Le test précédent vérifiait qu'un
// squelette de 19 lignes se rendait sans erreur — dont la ligne « État de l'API :
// ok », qui n'a plus lieu d'exister. Ce qui compte ici n'est pas que la page
// s'affiche, c'est qu'elle ne PROMETTE rien que le produit n'ait :
//   · aucune salle de démonstration ne part en production ;
//   · aucun prestataire n'est référencé, et aucune carte de catégorie ne mène
//     nulle part ;
//   · aucun lauréat d'award n'est nommé ;
//   · la recherche fonctionne SANS JavaScript.
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { messages } from "@zwadj/i18n";
import type { VenueListResponse, VenueSummaryDTO } from "@zwadj/types";
import { HomeView } from "../../components/home-view";
import { PREVIEW_VENUES, previewVenuesFor } from "../../lib/preview-venues";
import { VENDOR_CATEGORIES } from "../../lib/vendor-categories";

/** ⚠ Une salle RÉELLE : elle n'a ni note, ni avis, ni badge — `VenueSummaryDTO`
 *  ne les porte pas. C'est le point de la carte conditionnelle : une salle
 *  réelle sort sans étoile, sans que rien ne casse. */
function salle(over: Partial<VenueSummaryDTO> = {}): VenueSummaryDTO {
  return {
    id: "v1",
    slug: "salle-el-ryad",
    cityId: "c1",
    nameFr: "Salle El Ryad",
    nameAr: "قاعة الرياض",
    taglineFr: "Vue sur la baie",
    taglineAr: null,
    districtFr: "Hydra",
    districtAr: "حيدرة",
    capacityMax: 400,
    basePriceCents: 158_100_000,
    bookingMode: "SINGLE_SLOT",
    ceremonyType: null,
    publicationStatus: "PUBLISHED",
    coverThumbUrl: null,
    photoCount: 0,
    availableOnDate: null,
    ...over
  } as VenueSummaryDTO;
}

function liste(items: VenueSummaryDTO[]): VenueListResponse {
  return { items, total: items.length, page: 1, pageSize: 6, availableOn: null };
}

function poser(props: Partial<Parameters<typeof HomeView>[0]> = {}, locale: "fr" | "ar" = "fr") {
  render(
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      <HomeView recent={liste([salle()])} affordable={liste([])} proUrl={null} {...props} />
    </NextIntlClientProvider>
  );
}

describe("Accueil — ce que la page ne promet pas", () => {
  it("⚠ ne nomme AUCUN lauréat d'award — la section n'existe pas", () => {
    poser();
    expect(screen.queryByText(/award/i)).toBeNull();
    expect(screen.queryByText(/lauréat/i)).toBeNull();
  });

  it("⚠ n'affiche AUCUN compte de prestataires — un nombre serait vérifiable, et faux", () => {
    poser();
    const vendors = screen.getByRole("heading", { name: /Le reste du mariage/ }).closest("section");
    // Les comptes de la maquette : 142, 87, 124, 64, 96…
    expect(vendors?.textContent).not.toMatch(/\d/u);
  });

  it("⚠ aucune carte de catégorie n'est cliquable ni focusable", () => {
    poser();
    const vendors = screen.getByRole("heading", { name: /Le reste du mariage/ }).closest("section");
    expect(vendors?.querySelectorAll("a, button, [tabindex]")).toHaveLength(0);
    // Toutes les catégories sont bien rendues, et toutes portent « À venir » en
    // TEXTE : le gris ne porte pas le message seul (WCAG 1.4.1).
    expect(vendors?.querySelectorAll(".hm-vendor")).toHaveLength(VENDOR_CATEGORIES.length);
    expect(vendors?.querySelectorAll(".hm-vendor-soon")).toHaveLength(VENDOR_CATEGORIES.length);
  });

  it("⚠ ne dit plus l'état de l'API — ce n'est pas l'affaire d'un visiteur", () => {
    poser();
    expect(screen.queryByText(/État de l'API/i)).toBeNull();
    expect(screen.queryByText(/db:/i)).toBeNull();
  });

  it("annonce la carte comme À VENIR, sans image de carte figée", () => {
    poser();
    expect(screen.getByText("Carte à venir")).toBeInTheDocument();
  });
});

describe("Accueil — la recherche marche sans JavaScript", () => {
  it("le héros est un vrai formulaire GET vers /salles", () => {
    poser();
    const form = screen.getByRole("group", { name: "Rechercher une salle" }).closest("form");
    expect(form).toHaveAttribute("method", "get");
    expect(form).toHaveAttribute("action", "/salles");
  });

  it("les champs portent les NOMS du contrat public — aucune traduction d'URL", () => {
    poser();
    expect(screen.getByLabelText("Invités")).toHaveAttribute("name", "guests");
    expect(screen.getByLabelText("Budget maximum")).toHaveAttribute("name", "maxPriceCents");
  });
});

describe("Accueil — salles réelles, jeu de démonstration, catalogue vide", () => {
  it("rend les salles RÉELLES quand l'API en renvoie", () => {
    poser({ recent: liste([salle()]) });
    expect(screen.getByRole("heading", { name: "Salle El Ryad" })).toBeInTheDocument();
    // ⚠ Pas de bandeau de démonstration : ces salles existent.
    expect(screen.queryByText(/Données de démonstration/)).toBeNull();
  });

  it("⚠ les salles RÉELLES gagnent sur le jeu de démonstration, même en dev", () => {
    // Relevé par le harnais : sans ce test, faire du repli une condition
    // inconditionnelle laissait tout vert — et l'accueil aurait montré des
    // salles inventées PAR-DESSUS un catalogue réel.
    poser({ recent: liste([salle()]), previewVenues: PREVIEW_VENUES });
    expect(screen.getByRole("heading", { name: "Salle El Ryad" })).toBeInTheDocument();
    expect(screen.queryByText(/Données de démonstration/)).toBeNull();
  });

  it("⚠ une salle réelle sort SANS étoile — le DTO ne porte pas de note", () => {
    poser({ recent: liste([salle()]) });
    expect(screen.queryByText(/\(\d+\)/u)).toBeNull();
  });

  it("le jeu de démonstration ne s'affiche JAMAIS sans bandeau", () => {
    poser({ recent: liste([]), previewVenues: PREVIEW_VENUES });
    expect(screen.getByText(/Données de démonstration/)).toBeInTheDocument();
  });

  it("⚠ sans jeu de démonstration, un catalogue vide le DIT — il ne se remplit pas", () => {
    // C'est l'état de PRODUCTION : la page serveur passe `null`.
    poser({ recent: liste([]), previewVenues: null });
    expect(screen.getByText(/Aucune salle publiée/)).toBeInTheDocument();
    expect(screen.queryByText(/Données de démonstration/)).toBeNull();
  });

  it("le titre de salle est un h3, sous le h2 de section", () => {
    // ⚠ Sur la recherche la carte rend un `h2` sous le `h1` de page ; ici les
    // SECTIONS sont des `h2`. Une salle au même rang qu'un titre de section
    // donnerait un plan de page faux à un lecteur d'écran.
    poser({ recent: liste([salle()]) });
    expect(screen.getByRole("heading", { name: "Salle El Ryad", level: 3 })).toBeInTheDocument();
  });

  it("⚠ n'affiche PAS deux fois la même salle dans les deux grilles", () => {
    const meme = salle();
    poser({ recent: liste([meme]), affordable: liste([meme]) });
    expect(screen.getAllByRole("heading", { name: "Salle El Ryad" })).toHaveLength(1);
  });
});

describe("Accueil — quartiers relevés, jamais inventés", () => {
  it("relève les quartiers des salles affichées, sans aucun compte", () => {
    poser({ recent: liste([salle({ districtFr: "Hydra" }), salle({ id: "v2", slug: "s2", districtFr: "Chéraga" })]) });
    const section = screen.getByRole("heading", { name: /quartiers représentés/i }).closest("section");
    expect(section?.textContent).toContain("Hydra");
    expect(section?.textContent).toContain("Chéraga");
    // La maquette met « 24 », « 18 »… : un compte tiré d'une seule page serait faux.
    expect(section?.querySelectorAll(".hm-chip")).toHaveLength(2);
  });

  it("⚠ une salle SANS quartier ne produit aucune puce — rien n'est substitué", () => {
    poser({ recent: liste([salle({ districtFr: null, districtAr: null })]), previewVenues: null });
    expect(screen.getByText(/Aucun quartier à afficher/)).toBeInTheDocument();
  });

  it("⚠ les quartiers ne sont PAS cliquables — aucun filtre par quartier n'existe", () => {
    poser({ recent: liste([salle({ districtFr: "Hydra" })]) });
    const section = screen.getByRole("heading", { name: /quartiers représentés/i }).closest("section");
    expect(section?.querySelectorAll("a, button")).toHaveLength(0);
  });

  it("catalogue vide ⇒ aucun quartier inventé", () => {
    poser({ recent: liste([]), previewVenues: null });
    expect(screen.getByText(/Aucun quartier à afficher/)).toBeInTheDocument();
  });
});

describe("Accueil — espace gestionnaire", () => {
  it("⚠ le bloc DISPARAÎT sans PRO_URL, au lieu de mener nulle part", () => {
    // ⚠ Première version fautive : un `<a>` sans `href` n'a PAS le rôle « link »,
    // donc `queryByRole("link")` rendait `null` même quand le bloc s'affichait —
    // le test passait sur un écran cassé. Relevé par le harnais.
    poser({ proUrl: null });
    expect(screen.queryByText("Ouvrir l'espace gestionnaire")).toBeNull();
    expect(screen.queryByRole("heading", { name: /Vous gérez une salle/ })).toBeNull();
  });

  it("rend un lien EXTERNE quand l'URL est configurée", () => {
    poser({ proUrl: "https://pro.zwadj.dz" });
    expect(screen.getByRole("link", { name: /Ouvrir l'espace gestionnaire/ })).toHaveAttribute(
      "href",
      "https://pro.zwadj.dz"
    );
  });
});

describe("⚠ Aucune salle de démonstration en production", () => {
  // Relevé par le harnais : cette garde vivait dans un ternaire de `page.tsx`,
  // que nul test ne rend. Muter la page laissait 19 tests verts, et six salles
  // inventées seraient parties chez les visiteurs.
  it("rend null en production", () => {
    expect(previewVenuesFor("production")).toBeNull();
  });

  it("rend le jeu en développement et en test", () => {
    expect(previewVenuesFor("development")).toBe(PREVIEW_VENUES);
    expect(previewVenuesFor("test")).toBe(PREVIEW_VENUES);
  });

  it("⚠ une variable ABSENTE n'est pas la production — on montre, on ne cache pas", () => {
    // Se tromper vers « je montre le jeu » coûte un bandeau de trop en local ;
    // se tromper vers « je le cache » rend la grille invisible là où elle sert.
    // Le vrai danger est dans l'autre sens, et il est couvert par le premier test.
    expect(previewVenuesFor(undefined)).toBe(PREVIEW_VENUES);
  });
});

describe("Accueil — arabe", () => {
  it("se rend en arabe sans clé manquante", () => {
    poser({ recent: liste([salle()]) }, "ar");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/[\u0600-\u06FF]/u);
    // Une clé absente rendrait son chemin brut (« home.vendors.title »).
    expect(document.body.textContent).not.toMatch(/home\./u);
  });
});
