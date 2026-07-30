// Lot A7 — vue de recherche. La navigation next-intl est doublée (pas de
// routeur Next en jsdom), comme dans les suites auth existantes.
//
// Ce qui est verrouillé ici : les trois états (résultats / vide / API muette),
// le préfixage des URL de médias relatives, le fait que la pagination soit
// faite de LIENS porteurs des filtres, et le fait que le formulaire soit un
// vrai `<form method="get">` — c'est lui qui rend la page utilisable sans
// JavaScript, ce qu'aucun test de rendu ne montrerait autrement.
import { render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { messages } from "@zwadj/i18n";
import type { AmenityDTO, VenueListResponse, VenueSummaryDTO, WilayaDTO } from "@zwadj/types";
import { parseSearchParams } from "../../lib/search-query";
import { SearchView } from "./search-view";

vi.mock("../../i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/salles"
}));

const CITY_ID = "6f1c0d2e-2b3a-4c5d-8e9f-0a1b2c3d4e5f";

const WILAYAS: WilayaDTO[] = [
  {
    id: "w16",
    code: 16,
    nameFr: "Alger",
    nameAr: "الجزائر",
    cities: [{ id: CITY_ID, nameFr: "Bab Ezzouar", nameAr: "باب الزوار", lat: null, lng: null }]
  }
];

const AMENITIES: AmenityDTO[] = [
  { id: "a1", key: "wifi", nameFr: "Wifi", nameAr: "واي فاي", icon: "wifi" },
  { id: "a2", key: "parking", nameFr: "Parking", nameAr: "موقف سيارات", icon: "parking" }
];

function venue(n: number, over: Partial<VenueSummaryDTO> = {}): VenueSummaryDTO {
  return {
    id: `v${n}`,
    slug: `salle-${n}`,
    cityId: CITY_ID,
    nameFr: `Salle ${n}`,
    nameAr: `قاعة ${n}`,
    taglineFr: null,
    taglineAr: null,
    districtFr: "Bab Ezzouar",
    districtAr: "باب الزوار",
    capacityMax: 300,
    basePriceCents: 20_000_000,
    bookingMode: "SINGLE_SLOT",
    publicationStatus: "PUBLISHED",
    coverThumbUrl: "/api/v1/media/cover-1-thumb.webp",
    photoCount: 4,
    ...over
  } as VenueSummaryDTO;
}

function results(items: VenueSummaryDTO[], total = items.length, page = 1): VenueListResponse {
  return { items, total, page, pageSize: 12 };
}

function renderView(
  over: Partial<Parameters<typeof SearchView>[0]> = {},
  locale: "fr" | "ar" = "fr",
  raw: Record<string, string | string[]> = {}
) {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      <SearchView
        state={parseSearchParams(raw)}
        results={results([venue(1)])}
        wilayas={WILAYAS}
        amenities={AMENITIES}
        {...over}
      />
    </NextIntlClientProvider>
  );
}

describe("Recherche — états", () => {
  it("résultats : nom, commune, capacité et prix formatés en DZD", () => {
    renderView();
    // Scopé à la liste : « Bab Ezzouar » figure AUSSI dans le sélecteur de
    // commune du panneau de filtres.
    const liste = within(screen.getByRole("list", { name: "Salles de mariage" }));
    expect(liste.getByRole("heading", { name: "Salle 1" })).toBeInTheDocument();
    expect(liste.getByText("Bab Ezzouar")).toBeInTheDocument();
    expect(liste.getByText("Jusqu'à 300 invités")).toBeInTheDocument();
    expect(liste.getByText(/200/)).toBeInTheDocument();
  });

  it("aucun résultat : message d'élargissement, PAS un écran vide", () => {
    renderView({ results: results([], 0) });
    expect(screen.getByText("Aucune salle ne correspond à ces critères")).toBeInTheDocument();
  });

  it("API muette : état d'ERREUR distinct du vide — on ne dit pas « aucune salle » quand on n'en sait rien", () => {
    renderView({ results: null });
    expect(screen.getByRole("alert")).toHaveTextContent("La recherche est momentanément indisponible");
    expect(screen.queryByText("Aucune salle ne correspond à ces critères")).toBeNull();
  });

  it("le compteur s'accorde au singulier", () => {
    renderView({ results: results([venue(1)], 1) });
    expect(screen.getByRole("status")).toHaveTextContent("1 salle");
    renderView({ results: results([venue(1), venue(2)], 37) });
    expect(screen.getAllByRole("status")[1]).toHaveTextContent("37 salles");
  });
});

describe("Recherche — médias", () => {
  it("une URL de vignette RELATIVE est préfixée par la base API, pas par l'origine de Next", () => {
    renderView();
    expect(screen.getByRole("presentation", { hidden: true }).getAttribute("src")).toBe(
      "http://localhost:3001/api/v1/media/cover-1-thumb.webp"
    );
  });

  it("une URL ABSOLUE (adapter S3/CDN) est laissée intacte", () => {
    renderView({ results: results([venue(1, { coverThumbUrl: "https://cdn.zwadj.dz/c.webp" })]) });
    expect(screen.getByRole("presentation", { hidden: true }).getAttribute("src")).toBe("https://cdn.zwadj.dz/c.webp");
  });

  it("salle sans photo : un cartouche explicite, pas une image cassée", () => {
    renderView({ results: results([venue(1, { coverThumbUrl: null })]) });
    expect(screen.getByText("Photo à venir")).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
  });
});

describe("Recherche — filtres sans JavaScript", () => {
  it("le panneau est un vrai formulaire GET : c'est ce qui fait filtrer la page sans JS", () => {
    const { container } = renderView();
    const form = container.querySelector("form");
    expect(form).toHaveAttribute("method", "get");
    // Pas d'`action` : le navigateur soumet vers l'URL courante, préfixe de
    // locale compris. En poser un casserait /ar.
    expect(form).not.toHaveAttribute("action");
  });

  it("les champs sont RÉALIMENTÉS depuis l'URL — un lien partagé rouvre la même recherche", () => {
    renderView({}, "fr", {
      cityId: CITY_ID,
      guests: "250",
      minPrice: "100000",
      maxPrice: "400000",
      amenities: ["wifi"],
      sort: "price_asc"
    });
    expect(screen.getByLabelText("Commune")).toHaveValue(CITY_ID);
    expect(screen.getByLabelText("Nombre d'invités")).toHaveValue(250);
    expect(screen.getByLabelText("Prix minimum (DA)")).toHaveValue(100000);
    expect(screen.getByLabelText("Prix maximum (DA)")).toHaveValue(400000);
    expect(screen.getByLabelText("Trier par")).toHaveValue("price_asc");
    expect(screen.getByRole("checkbox", { name: "Wifi" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Parking" })).not.toBeChecked();
  });

  it("les équipements partagent le même `name` : c'est l'encodage natif que le navigateur sait produire seul", () => {
    renderView();
    for (const box of screen.getAllByRole("checkbox")) expect(box).toHaveAttribute("name", "amenities");
  });

  it("le tri vit DANS le formulaire : sans JS, le bouton de soumission le valide comme les autres champs", () => {
    const { container } = renderView();
    expect(container.querySelector("form")?.contains(screen.getByLabelText("Trier par"))).toBe(true);
  });
});

describe("Recherche — pagination", () => {
  it("des LIENS, pas un « charger plus » : un bouton JS ne produit aucune URL indexable", () => {
    renderView({ results: results([venue(1)], 40, 2) }, "fr", { page: "2", sort: "price_asc" });
    const nav = screen.getByRole("navigation", { name: "Pagination" });
    const suivant = within(nav).getByRole("link", { name: "Suivant" });
    // Le lien reporte les filtres courants : changer de page ne remet pas la
    // recherche à zéro.
    expect(suivant).toHaveAttribute("href", "/salles?sort=price_asc&page=3");
    expect(within(nav).getByRole("link", { name: "Précédent" })).toHaveAttribute("href", "/salles?sort=price_asc");
  });

  it("la page courante est signalée aux lecteurs d'écran", () => {
    renderView({ results: results([venue(1)], 40, 2) }, "fr", { page: "2" });
    const courante = screen.getByRole("link", { current: "page" });
    expect(courante).toHaveTextContent("2");
    expect(courante).toHaveAccessibleName("Page 2, page courante");
  });

  it("une seule page : aucune navigation de pagination", () => {
    renderView({ results: results([venue(1)], 3) });
    expect(screen.queryByRole("navigation", { name: "Pagination" })).toBeNull();
  });
});

describe("Recherche — bilingue", () => {
  it("en arabe : libellés, noms de salle et de commune passent en AR", () => {
    renderView({}, "ar");
    expect(screen.getByRole("heading", { name: "قاعات الأفراح", level: 1 })).toBeInTheDocument();
    const liste = within(screen.getByRole("list", { name: "قاعات الأفراح" }));
    expect(liste.getByRole("heading", { name: "قاعة 1" })).toBeInTheDocument();
    expect(liste.getByText("باب الزوار")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "عرض النتائج" })).toBeInTheDocument();
  });

  it("aucun `dir` en dur : l'orientation vient de <html>, jamais d'un composant", () => {
    const { container } = renderView({}, "ar");
    expect(container.querySelectorAll("[dir]")).toHaveLength(0);
  });
});

describe("Recherche — carte", () => {
  it("le report post-MVP est DIT, pas laissé en blanc (décision produit n°2)", () => {
    renderView();
    expect(screen.getByText("Carte à venir")).toBeInTheDocument();
  });
});
