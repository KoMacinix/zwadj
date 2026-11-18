// Lot A8 — détail d'une salle. Ce qui est verrouillé ici :
//   - D33 : le bandeau « temporairement indisponible » (une salle HIDDEN
//     n'arrive jamais jusqu'à cette vue, c'est un 404 côté API) ;
//   - la visite Matterport n'est PAS montée au chargement — c'est la décision
//     de coût réseau du lot, et rien d'autre ne la démontrerait ;
//   - PLUS AUCUN appel à l'action inerte : la visite (C5) puis la demande de
//     réservation (E1a) sont réelles, leurs panneaux portent les titres. Deux
//     tests le figent, parce que c'est exactement ce qu'un zip construit sur une
//     base ancienne a déjà réintroduit une fois ;
//   - les URL de médias relatives sont préfixées, la couverture n'est pas
//     différée (LCP), les alt du pro font foi ;
//   - parité FR/AR et aucune orientation posée par un composant.
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { messages } from "@zwadj/i18n";
import type { VenuePublicDTO, VenuePublicPhotoDTO } from "@zwadj/types";
import type { AuthClient } from "../../lib/auth/auth-client";
import { AuthProvider } from "../../lib/auth/auth-context";
import { VenueDetailView } from "./venue-detail-view";

// CA-4 — la carte de la fiche est DOUBLÉE ici : ce fichier mesure QUAND la fiche la pose et ce qu'elle lui passe. Ce
// qu'elle fait (le geste, le point) est mesuré dans `venue-location-map.test.tsx`.
vi.mock("./venue-location-map", () => ({
  VenueLocationMap: ({ lat, lng, name, ar }: { lat: number; lng: number; name: string; ar: boolean }) => (
    <div data-testid="position-de-la-salle" data-lat={lat} data-lng={lng} data-name={name} data-ar={String(ar)} />
  )
}));

vi.mock("../../i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/salles/salle-el-ryad"
}));

function photo(n: number, over: Partial<VenuePublicPhotoDTO> = {}): VenuePublicPhotoDTO {
  return {
    id: `p${n}`,
    url: `/api/v1/media/p${n}.webp`,
    thumbUrl: `/api/v1/media/p${n}-thumb.webp`,
    width: 1920,
    height: 1080,
    altFr: null,
    altAr: null,
    ...over
  };
}

function venue(over: Partial<VenuePublicDTO> = {}): VenuePublicDTO {
  return {
    services: [],
    id: "v1",
    slug: "salle-el-ryad",
    nameFr: "Salle El Ryad",
    nameAr: "قاعة الرياض",
    taglineFr: "Élégance et confort",
    taglineAr: "أناقة وراحة",
    descriptionFr: "Première ligne.\nSeconde ligne.",
    descriptionAr: "السطر الأول.\nالسطر الثاني.",
    districtFr: "Bab Ezzouar",
    districtAr: "باب الزوار",
    address: "12 rue des Oliviers",
    lat: null,
    lng: null,
    capacityMax: 300,
    basePriceCents: 20_000_000,
    bookingMode: "SINGLE_SLOT",
  depositRateBps: 3000,
  depositAmountCents: null,
    status: "ACTIVE",
    city: { id: "c1", nameFr: "Bab Ezzouar", nameAr: "باب الزوار" },
    amenities: [{ id: "a1", key: "wifi", nameFr: "Wifi", nameAr: "واي فاي", icon: "wifi" }],
    styles: [],
    ceremonyType: null,
    photos: [photo(1), photo(2)],
    matterportModelId: "SxQL3iGyoDo",
    ...over
  };
}

/** Visiteur ANONYME : c'est l'état par défaut d'une page publique, et celui où
 *  le panneau C5 montre ses créneaux sans exiger de compte. */
function anonymousAuth(): AuthClient {
  return {
    bootstrap: vi.fn().mockResolvedValue(null),
    logout: vi.fn(),
    me: vi.fn(),
    authedRequest: vi.fn(),
    getAccessToken: () => null
  } as unknown as AuthClient;
}

// Le panneau de visite appelle `getVisitSlots`, donc `fetch`. Sans ce double,
// jsdom tenterait un VRAI appel vers localhost:3001 : lent hors ligne, et vert
// pour une mauvaise raison si un serveur traîne sur le port.
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        venueId: "v1",
        slug: "salle-el-ryad",
        from: "2026-01-01",
        to: "2026-01-31",
        durationMinutes: 30,
        slots: []
      })
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** ⚠ FC-9 — RENDRE, PUIS ATTENDRE L'ÉTAT FINAL, AVANT DE RENDRE LA MAIN. La fiche monte quatre chargements (la session, les
 *  créneaux de visite, les disponibilités du panneau de demande, le calendrier) : un test qui lit puis rend la main avant eux laisse
 *  leurs écritures d'état tomber APRÈS lui, hors `act` — cinq avertissements par rendu, cent pour ce fichier, qu'un plafond tolérait
 *  (relevé de FC-9, `docs/preuves/front-client/FC-9/releve.md`). L'idiome du dépôt (`visit-booking-panel.test.tsx`, D269) : le rendu
 *  dans `act`, puis un état FINAL lu à l'écran — le panneau de visite qui a reçu ses créneaux ; le relevé montre que l'attendre
 *  suffit (le seul test qui l'attendait déjà n'émettait rien).
 *  ⚠ Lu DANS ce rendu (`within`) : un test qui rend deux fois trouverait sinon deux panneaux. */
async function renderDetail(over: Partial<VenuePublicDTO> = {}, locale: "fr" | "ar" = "fr") {
  let rendu: ReturnType<typeof render> | undefined;
  await act(async () => {
    rendu = render(
      <NextIntlClientProvider locale={locale} messages={messages[locale]}>
        <AuthProvider client={anonymousAuth()}>
          <VenueDetailView venue={venue(over)} />
        </AuthProvider>
      </NextIntlClientProvider>
    );
  });
  const fait = rendu!;
  await within(fait.container).findByText(messages[locale].venueDetail.visit.none);
  return fait;
}

describe("Détail salle — contenu", () => {
  it("nom, commune, accroche, prix formaté et capacité", async () => {
    await renderDetail();
    expect(screen.getByRole("heading", { level: 1, name: "Salle El Ryad" })).toBeInTheDocument();
    expect(screen.getByText("Élégance et confort")).toBeInTheDocument();
    expect(screen.getByText(/200/)).toBeInTheDocument();
    expect(screen.getByText("Jusqu'à 300 invités")).toBeInTheDocument();
    expect(screen.getByText("Un seul créneau par jour")).toBeInTheDocument();
  });

  it("le prix affiché est annoncé comme une BASE : le prix réel dépend du Flux B", async () => {
    await renderDetail();
    expect(screen.getByText(/Prix indicatif de base/)).toBeInTheDocument();
  });

  it("les sauts de ligne de la description sont conservés, sans jamais interpréter de HTML", async () => {
    const { container } = await renderDetail({ descriptionFr: "<b>gras</b>\nligne 2" });
    const paragraphe = [...container.querySelectorAll("p")].find((p) => p.textContent?.includes("gras"));
    expect(paragraphe).toHaveStyle({ whiteSpace: "pre-line" });
    // Le texte du pro reste du TEXTE : aucune balise injectée.
    expect(container.querySelector("b")).toBeNull();
  });

  it("équipements en pastilles ; liste vide dite explicitement", async () => {
    await renderDetail();
    expect(within(screen.getByRole("list", { name: "Équipements" })).getByText("Wifi")).toBeInTheDocument();
    await renderDetail({ amenities: [] });
    expect(screen.getByText("Aucun équipement renseigné pour le moment.")).toBeInTheDocument();
  });
});

describe("Détail salle — D33", () => {
  it("TEMPORARILY_UNAVAILABLE : bandeau, et la page reste entièrement consultable", async () => {
    await renderDetail({ status: "TEMPORARILY_UNAVAILABLE" });
    expect(screen.getByRole("status")).toHaveTextContent("Salle temporairement indisponible");
    // Le point du test : le contenu n'est pas masqué pour autant.
    expect(screen.getByRole("heading", { level: 1, name: "Salle El Ryad" })).toBeInTheDocument();
  });

  it("ACTIVE : aucun bandeau", async () => {
    await renderDetail();
    expect(screen.queryByText("Salle temporairement indisponible")).toBeNull();
  });
});

describe("Détail salle — photos", () => {
  it("URL relatives préfixées ; la couverture en pleine taille, les suivantes en vignette", async () => {
    await renderDetail();
    const images = within(screen.getByRole("list", { name: "Photos" })).getAllByRole("presentation", { hidden: true });
    expect(images[0]).toHaveAttribute("src", "http://localhost:3001/api/v1/media/p1.webp");
    expect(images[1]).toHaveAttribute("src", "http://localhost:3001/api/v1/media/p2-thumb.webp");
  });

  it("la COUVERTURE n'est pas différée : c'est le plus grand élément affiché (LCP)", async () => {
    await renderDetail();
    const images = within(screen.getByRole("list", { name: "Photos" })).getAllByRole("presentation", { hidden: true });
    expect(images[0]).toHaveAttribute("loading", "eager");
    expect(images[1]).toHaveAttribute("loading", "lazy");
  });

  it("« agrandir » RESTE un lien vers l'original : le repli sans JavaScript (FC-12 y ajoute la visionneuse)", async () => {
    await renderDetail();
    const liens = within(screen.getByRole("list", { name: "Photos" })).getAllByRole("link");
    expect(liens[0]).toHaveAttribute("href", "http://localhost:3001/api/v1/media/p1.webp");
    expect(liens[0]).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("l'alt saisi par le pro fait foi ; absent, l'image est décorative", async () => {
    await renderDetail({ photos: [photo(1, { altFr: "Vue de la salle" }), photo(2)] });
    expect(screen.getByRole("img", { name: "Vue de la salle" })).toBeInTheDocument();
    expect(screen.getAllByRole("presentation", { hidden: true })).toHaveLength(1);
  });

  it("aucune photo : c'est dit, pas un trou dans la page", async () => {
    await renderDetail({ photos: [] });
    expect(screen.getByText("Cette salle n'a pas encore publié de photos.")).toBeInTheDocument();
  });
});

// ── FC-12 (session `front-client`) — LA VISIONNEUSE : la galerie s'agrandit SANS quitter la page ──────────────────────────────────
// ⚠ Par la fiche RENDUE (un composant livré mais non monté est un composant absent). Chaque test affirme d'abord que la boîte s'est
// ouverte, par une assertion NATIVE : sans visionneuse (avant FC-12), le rouge se lit en assertion, pas en plantage (D304).
// ⚠ Les libellés viennent des CATALOGUES (lus en dictionnaire : avant FC-12, la clé n'existe pas — elle se lit vide, sans planter).
const TROIS_PHOTOS = [
  photo(1, { altFr: "La grande salle", altAr: "القاعة الكبرى" }),
  photo(2, { altFr: "Le jardin", altAr: "الحديقة" }),
  photo(3)
];
const catalogue = (locale: "fr" | "ar") => messages[locale].venueDetail as unknown as Record<string, string | undefined>;
const etiquette = (locale: "fr" | "ar", n: number, total: number) =>
  String(catalogue(locale).viewerLabel ?? "").replace("{n}", String(n)).replace("{total}", String(total));
const vignettes = (locale: "fr" | "ar" = "fr") =>
  within(screen.getByRole("list", { name: messages[locale].venueDetail.photos })).getAllByRole("link");
const boite = () => screen.queryByRole("dialog");

describe("FC-12 — la visionneuse : la galerie s'agrandit sans quitter la page", () => {
  it("un clic sur une vignette ouvre la visionneuse sur CETTE photo, pleine taille, avec l'alt du pro dans la langue de la page", async () => {
    await renderDetail({ photos: TROIS_PHOTOS });
    fireEvent.click(vignettes()[1]!);
    expect(boite() !== null).toBe(true);
    expect(boite()?.getAttribute("aria-label")).toBe(etiquette("fr", 2, 3));
    expect(boite()?.querySelector("img")?.getAttribute("alt")).toBe("Le jardin");
    expect(boite()?.querySelector("img")?.getAttribute("src")).toBe("http://localhost:3001/api/v1/media/p2.webp");
  });

  it("⛔ Échap ferme, et le focus REVIENT à la vignette qui l'a ouverte", async () => {
    await renderDetail({ photos: TROIS_PHOTOS });
    const lien = vignettes()[2]!;
    // ⚠ SANS focus préalable : sur macOS, cliquer ne donne PAS le focus — la boîte doit savoir d'où elle vient (`restoreFocusRef`).
    expect(document.activeElement === lien).toBe(false);
    fireEvent.click(lien);
    expect(boite() !== null).toBe(true);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(boite()).toBe(null);
    expect(document.activeElement).toBe(lien);
  });

  it("le focus reste DANS la boîte : Tab depuis le dernier bouton revient au premier", async () => {
    await renderDetail({ photos: TROIS_PHOTOS });
    fireEvent.click(vignettes()[0]!);
    expect(boite() !== null).toBe(true);
    const boutons = [...(boite()?.querySelectorAll("button") ?? [])];
    expect(boutons.length).toBe(3);
    boutons[2]!.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(boutons[0]);
  });

  it("en français, la flèche DROITE mène à la photo suivante, la GAUCHE à la précédente — et la galerie boucle", async () => {
    await renderDetail({ photos: TROIS_PHOTOS });
    fireEvent.click(vignettes()[0]!);
    expect(boite() !== null).toBe(true);
    fireEvent.keyDown(boite()!, { key: "ArrowRight" });
    expect(boite()?.getAttribute("aria-label")).toBe(etiquette("fr", 2, 3));
    fireEvent.keyDown(boite()!, { key: "ArrowLeft" });
    fireEvent.keyDown(boite()!, { key: "ArrowLeft" });
    expect(boite()?.getAttribute("aria-label")).toBe(etiquette("fr", 3, 3));
  });

  it("⛔ en arabe (RTL), les flèches sont INVERSÉES : la GAUCHE mène à la photo suivante", async () => {
    await renderDetail({ photos: TROIS_PHOTOS }, "ar");
    fireEvent.click(vignettes("ar")[0]!);
    expect(boite() !== null).toBe(true);
    fireEvent.keyDown(boite()!, { key: "ArrowLeft" });
    expect(boite()?.getAttribute("aria-label")).toBe(etiquette("ar", 2, 3));
    expect(boite()?.querySelector("img")?.getAttribute("alt")).toBe("الحديقة");
    fireEvent.keyDown(boite()!, { key: "ArrowRight" });
    expect(boite()?.getAttribute("aria-label")).toBe(etiquette("ar", 1, 3));
  });

  it("un alt ABSENT reste vide dans la visionneuse (image décorative), jamais inventé", async () => {
    await renderDetail({ photos: TROIS_PHOTOS });
    fireEvent.click(vignettes()[2]!);
    expect(boite() !== null).toBe(true);
    expect(boite()?.querySelector("img")?.getAttribute("alt")).toBe("");
  });

  it("une seule photo : la boîte n'a que « Fermer » — ni précédente ni suivante", async () => {
    await renderDetail({ photos: [photo(1)] });
    fireEvent.click(vignettes()[0]!);
    expect(boite() !== null).toBe(true);
    expect(boite()?.querySelectorAll("button").length).toBe(1);
  });

  it("un clic avec MODIFICATEUR (Ctrl) reste un lien : la visionneuse ne s'ouvre pas", async () => {
    await renderDetail({ photos: TROIS_PHOTOS });
    fireEvent.click(vignettes()[0]!, { ctrlKey: true });
    expect(boite()).toBe(null);
  });
});

describe("Détail salle — visite Matterport", () => {
  it("AUCUNE iframe au chargement : le tiers ne se charge qu'au geste (coût de données)", async () => {
    const { container } = await renderDetail();
    expect(container.querySelector("iframe")).toBeNull();
    expect(screen.getByRole("button", { name: "Lancer la visite virtuelle" })).toBeInTheDocument();
    expect(screen.getByText(/consomme des données/)).toBeInTheDocument();
  });

  it("après le geste : l'iframe est montée sur l'URL Matterport de l'identifiant", async () => {
    const { container } = await renderDetail();
    fireEvent.click(screen.getByRole("button", { name: "Lancer la visite virtuelle" }));
    const frame = container.querySelector("iframe");
    expect(frame).toHaveAttribute("src", "https://my.matterport.com/show/?m=SxQL3iGyoDo");
    expect(frame).toHaveAttribute("title", "Visite virtuelle de la salle");
  });

  it("le lien externe est TOUJOURS là : c'est le repli quand JavaScript n'arrive pas", async () => {
    await renderDetail();
    expect(screen.getByRole("link", { name: "Ouvrir dans un nouvel onglet" })).toHaveAttribute(
      "href",
      "https://my.matterport.com/show/?m=SxQL3iGyoDo"
    );
  });

  it("salle sans scan : aucune section visite, aucun bouton mort", async () => {
    await renderDetail({ matterportModelId: null });
    expect(screen.queryByText("Visite virtuelle")).toBeNull();
    expect(screen.queryByRole("button", { name: "Lancer la visite virtuelle" })).toBeNull();
  });
});

describe("Détail salle — appels à l'action (Flux B)", () => {
  it("PLUS AUCUN bouton mort : la demande de réservation est réelle depuis E1a", async () => {
    await renderDetail();
    // E1b — le dernier appel à l'action inerte a disparu. Il annonçait « les
    // demandes ouvriront prochainement » alors qu'elles sont ouvertes. Ce test
    // le FIGE : c'est exactement ce qu'un zip bâti sur une base ancienne a déjà
    // réintroduit une fois.
    expect(screen.queryByRole("button", { name: "Demander une réservation" })).toBeNull();
    expect(screen.queryByText(/ouvriront prochainement/)).toBeNull();
    // Et le panneau RÉEL porte désormais le titre.
    expect(screen.getByRole("heading", { level: 2, name: "Demander cette salle" })).toBeInTheDocument();
  });

  it("AUCUN bouton mort « Réserver une visite » : c'est le panneau RÉEL de C5 qui porte ce titre", async () => {
    await renderDetail();
    // Deux appels à l'action pour la même chose, dont un mort, apprennent
    // surtout au visiteur que le site ne marche pas.
    expect(screen.queryByRole("button", { name: "Réserver une visite" })).toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: "Réserver une visite" })).toBeInTheDocument();
  });

  it("le panneau de visite est MONTÉ et interroge les créneaux — un composant livré mais non monté est un composant absent", async () => {
    await renderDetail();
    await screen.findByText("Cette salle ne propose aucun créneau de visite pour le moment.");
    // Anonyme : on ne cache pas les créneaux, on demande la session au moment
    // où elle devient nécessaire.
    expect(screen.getByRole("link", { name: "Se connecter pour réserver" })).toBeInTheDocument();
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      expect.stringContaining("/venues/salle-el-ryad/visit-slots?"),
      expect.objectContaining({ cache: "no-store" })
    );
  });
});

describe("Détail salle — bilingue", () => {
  it("en arabe : nom, accroche, description et libellés passent en AR", async () => {
    await renderDetail({}, "ar");
    expect(screen.getByRole("heading", { level: 1, name: "قاعة الرياض" })).toBeInTheDocument();
    expect(screen.getByText("أناقة وراحة")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "اطلب هذه القاعة" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /العودة إلى القاعات/ })).toBeInTheDocument();
  });

  it("aucun `dir` en dur : l'orientation vient de <html>", async () => {
    const { container } = await renderDetail({}, "ar");
    expect(container.querySelectorAll("[dir]")).toHaveLength(0);
  });
});

// ── Carte (session « carte », lot CA-4) ──────────────────────────────────────
describe("Détail salle — la position sur la carte (R-7)", () => {
  /** La section « Emplacement » : celle dont le titre est le libellé du catalogue. */
  const emplacement = (racine: HTMLElement, locale: "fr" | "ar" = "fr"): Element | null =>
    Array.from(racine.querySelectorAll("section")).find(
      (section) => section.querySelector("h2")?.textContent === messages[locale].venueDetail.location
    ) ?? null;
  const cartes = (zone: ParentNode | null) => Array.from(zone?.querySelectorAll('[data-testid="position-de-la-salle"]') ?? []);

  it("⛔ une salle SANS coordonnées : l'adresse, et rien d'autre — aucune carte n'est offerte", async () => {
    const { container } = await renderDetail({ lat: null, lng: null });
    expect(emplacement(container)?.textContent).toContain("12 rue des Oliviers");
    expect(cartes(container)).toHaveLength(0);
  });

  it("⛔ une salle située : la carte est posée SOUS L'ADRESSE, à SA position, sous son nom", async () => {
    const { container } = await renderDetail({ lat: 36.745312, lng: 3.031987 });
    const dansLaSection = cartes(emplacement(container));
    expect(dansLaSection.map((c) => [c.getAttribute("data-lat"), c.getAttribute("data-lng"), c.getAttribute("data-name"), c.getAttribute("data-ar")])).toEqual([
      ["36.745312", "3.031987", "Salle El Ryad", "false"]
    ]);
    // Une seule carte sur la fiche, et elle est dans la section de l'adresse.
    expect(cartes(container)).toHaveLength(1);
  });

  it("⚠ UNE seule coordonnée n'est pas une position : latitude seule, puis longitude seule ⇒ pas de carte", async () => {
    const premiere = await renderDetail({ lat: 36.745312, lng: null });
    expect(cartes(premiere.container)).toHaveLength(0);
    premiere.unmount();
    const seconde = await renderDetail({ lat: null, lng: 3.031987 });
    expect(cartes(seconde.container)).toHaveLength(0);
  });

  it("en arabe : la carte reçoit le nom ARABE de la salle et le sens d'écriture de la page", async () => {
    const { container } = await renderDetail({ lat: 36.745312, lng: 3.031987 }, "ar");
    expect(cartes(emplacement(container, "ar")).map((c) => [c.getAttribute("data-name"), c.getAttribute("data-ar")])).toEqual([
      ["قاعة الرياض", "true"]
    ]);
  });
});
