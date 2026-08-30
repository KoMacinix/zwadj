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
import { fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { messages } from "@zwadj/i18n";
import type { VenuePublicDTO, VenuePublicPhotoDTO } from "@zwadj/types";
import type { AuthClient } from "../../lib/auth/auth-client";
import { AuthProvider } from "../../lib/auth/auth-context";
import { VenueDetailView } from "./venue-detail-view";

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

function renderDetail(over: Partial<VenuePublicDTO> = {}, locale: "fr" | "ar" = "fr") {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      <AuthProvider client={anonymousAuth()}>
        <VenueDetailView venue={venue(over)} />
      </AuthProvider>
    </NextIntlClientProvider>
  );
}

describe("Détail salle — contenu", () => {
  it("nom, commune, accroche, prix formaté et capacité", () => {
    renderDetail();
    expect(screen.getByRole("heading", { level: 1, name: "Salle El Ryad" })).toBeInTheDocument();
    expect(screen.getByText("Élégance et confort")).toBeInTheDocument();
    expect(screen.getByText(/200/)).toBeInTheDocument();
    expect(screen.getByText("Jusqu'à 300 invités")).toBeInTheDocument();
    expect(screen.getByText("Un seul créneau par jour")).toBeInTheDocument();
  });

  it("le prix affiché est annoncé comme une BASE : le prix réel dépend du Flux B", () => {
    renderDetail();
    expect(screen.getByText(/Prix indicatif de base/)).toBeInTheDocument();
  });

  it("les sauts de ligne de la description sont conservés, sans jamais interpréter de HTML", () => {
    const { container } = renderDetail({ descriptionFr: "<b>gras</b>\nligne 2" });
    const paragraphe = [...container.querySelectorAll("p")].find((p) => p.textContent?.includes("gras"));
    expect(paragraphe).toHaveStyle({ whiteSpace: "pre-line" });
    // Le texte du pro reste du TEXTE : aucune balise injectée.
    expect(container.querySelector("b")).toBeNull();
  });

  it("équipements en pastilles ; liste vide dite explicitement", () => {
    renderDetail();
    expect(within(screen.getByRole("list", { name: "Équipements" })).getByText("Wifi")).toBeInTheDocument();
    renderDetail({ amenities: [] });
    expect(screen.getByText("Aucun équipement renseigné pour le moment.")).toBeInTheDocument();
  });
});

describe("Détail salle — D33", () => {
  it("TEMPORARILY_UNAVAILABLE : bandeau, et la page reste entièrement consultable", () => {
    renderDetail({ status: "TEMPORARILY_UNAVAILABLE" });
    expect(screen.getByRole("status")).toHaveTextContent("Salle temporairement indisponible");
    // Le point du test : le contenu n'est pas masqué pour autant.
    expect(screen.getByRole("heading", { level: 1, name: "Salle El Ryad" })).toBeInTheDocument();
  });

  it("ACTIVE : aucun bandeau", () => {
    renderDetail();
    expect(screen.queryByText("Salle temporairement indisponible")).toBeNull();
  });
});

describe("Détail salle — photos", () => {
  it("URL relatives préfixées ; la couverture en pleine taille, les suivantes en vignette", () => {
    renderDetail();
    const images = within(screen.getByRole("list", { name: "Photos" })).getAllByRole("presentation", { hidden: true });
    expect(images[0]).toHaveAttribute("src", "http://localhost:3001/api/v1/media/p1.webp");
    expect(images[1]).toHaveAttribute("src", "http://localhost:3001/api/v1/media/p2-thumb.webp");
  });

  it("la COUVERTURE n'est pas différée : c'est le plus grand élément affiché (LCP)", () => {
    renderDetail();
    const images = within(screen.getByRole("list", { name: "Photos" })).getAllByRole("presentation", { hidden: true });
    expect(images[0]).toHaveAttribute("loading", "eager");
    expect(images[1]).toHaveAttribute("loading", "lazy");
  });

  it("« agrandir » est un simple lien vers l'original — aucune visionneuse JS", () => {
    renderDetail();
    const liens = within(screen.getByRole("list", { name: "Photos" })).getAllByRole("link");
    expect(liens[0]).toHaveAttribute("href", "http://localhost:3001/api/v1/media/p1.webp");
    expect(liens[0]).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("l'alt saisi par le pro fait foi ; absent, l'image est décorative", () => {
    renderDetail({ photos: [photo(1, { altFr: "Vue de la salle" }), photo(2)] });
    expect(screen.getByRole("img", { name: "Vue de la salle" })).toBeInTheDocument();
    expect(screen.getAllByRole("presentation", { hidden: true })).toHaveLength(1);
  });

  it("aucune photo : c'est dit, pas un trou dans la page", () => {
    renderDetail({ photos: [] });
    expect(screen.getByText("Cette salle n'a pas encore publié de photos.")).toBeInTheDocument();
  });
});

describe("Détail salle — visite Matterport", () => {
  it("AUCUNE iframe au chargement : le tiers ne se charge qu'au geste (coût de données)", () => {
    const { container } = renderDetail();
    expect(container.querySelector("iframe")).toBeNull();
    expect(screen.getByRole("button", { name: "Lancer la visite virtuelle" })).toBeInTheDocument();
    expect(screen.getByText(/consomme des données/)).toBeInTheDocument();
  });

  it("après le geste : l'iframe est montée sur l'URL Matterport de l'identifiant", () => {
    const { container } = renderDetail();
    fireEvent.click(screen.getByRole("button", { name: "Lancer la visite virtuelle" }));
    const frame = container.querySelector("iframe");
    expect(frame).toHaveAttribute("src", "https://my.matterport.com/show/?m=SxQL3iGyoDo");
    expect(frame).toHaveAttribute("title", "Visite virtuelle de la salle");
  });

  it("le lien externe est TOUJOURS là : c'est le repli quand JavaScript n'arrive pas", () => {
    renderDetail();
    expect(screen.getByRole("link", { name: "Ouvrir dans un nouvel onglet" })).toHaveAttribute(
      "href",
      "https://my.matterport.com/show/?m=SxQL3iGyoDo"
    );
  });

  it("salle sans scan : aucune section visite, aucun bouton mort", () => {
    renderDetail({ matterportModelId: null });
    expect(screen.queryByText("Visite virtuelle")).toBeNull();
    expect(screen.queryByRole("button", { name: "Lancer la visite virtuelle" })).toBeNull();
  });
});

describe("Détail salle — appels à l'action (Flux B)", () => {
  it("PLUS AUCUN bouton mort : la demande de réservation est réelle depuis E1a", () => {
    renderDetail();
    // E1b — le dernier appel à l'action inerte a disparu. Il annonçait « les
    // demandes ouvriront prochainement » alors qu'elles sont ouvertes. Ce test
    // le FIGE : c'est exactement ce qu'un zip bâti sur une base ancienne a déjà
    // réintroduit une fois.
    expect(screen.queryByRole("button", { name: "Demander une réservation" })).toBeNull();
    expect(screen.queryByText(/ouvriront prochainement/)).toBeNull();
    // Et le panneau RÉEL porte désormais le titre.
    expect(screen.getByRole("heading", { level: 2, name: "Demander cette salle" })).toBeInTheDocument();
  });

  it("AUCUN bouton mort « Réserver une visite » : c'est le panneau RÉEL de C5 qui porte ce titre", () => {
    renderDetail();
    // Deux appels à l'action pour la même chose, dont un mort, apprennent
    // surtout au visiteur que le site ne marche pas.
    expect(screen.queryByRole("button", { name: "Réserver une visite" })).toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: "Réserver une visite" })).toBeInTheDocument();
  });

  it("le panneau de visite est MONTÉ et interroge les créneaux — un composant livré mais non monté est un composant absent", async () => {
    renderDetail();
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
  it("en arabe : nom, accroche, description et libellés passent en AR", () => {
    renderDetail({}, "ar");
    expect(screen.getByRole("heading", { level: 1, name: "قاعة الرياض" })).toBeInTheDocument();
    expect(screen.getByText("أناقة وراحة")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "اطلب هذه القاعة" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /العودة إلى القاعات/ })).toBeInTheDocument();
  });

  it("aucun `dir` en dur : l'orientation vient de <html>", () => {
    const { container } = renderDetail({}, "ar");
    expect(container.querySelectorAll("[dir]")).toHaveLength(0);
  });
});
