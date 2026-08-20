// Assistant de filtres — lot Assistant.
//
// ⚠ TESTS RE-DÉRIVÉS DU COMPORTEMENT. Ce qui compte ici n'est pas que l'écran
// s'affiche, c'est que la séquence produise EXACTEMENT les paramètres du
// contrat public, et qu'aucune question ne pose un critère que la page de
// résultats ignorerait — la faute que la maquette commet deux fois.
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { formatDZD, messages } from "@zwadj/i18n";
import type { AmenityDTO, VenueStyleDTO, WilayaDTO } from "@zwadj/types";
import { FilterWizard } from "./filter-wizard";

const push = vi.fn();
vi.mock("../i18n/navigation", () => ({
  useRouter: () => ({ push }),
  Link: ({ children }: { children: React.ReactNode }) => <a href="#">{children}</a>
}));

const countVenues = vi.fn();
vi.mock("../lib/api", () => ({ countVenues: (...a: unknown[]) => countVenues(...a) }));

const WILAYAS: WilayaDTO[] = [
  {
    id: "w1",
    code: 16,
    nameFr: "Alger",
    nameAr: "الجزائر",
    cities: [
      { id: "c1", nameFr: "Hydra", nameAr: "حيدرة" },
      { id: "c2", nameFr: "Chéraga", nameAr: "الشراقة" }
    ]
  }
] as WilayaDTO[];
// ⚠ DEUX styles ET deux équipements : avec un seul élément, `join(";")` rend
// exactement la même chaîne que `join(",")`, et le séparateur ne se mesure pas.
// Relevé par le harnais — la garde `styles` ne mordait pas pour cette raison.
const STYLES: VenueStyleDTO[] = [
  { id: "s1", key: "moderne", nameFr: "Moderne", nameAr: "عصري" },
  { id: "s2", key: "traditionnel", nameFr: "Traditionnel", nameAr: "تقليدي" }
] as VenueStyleDTO[];
const AMENITIES: AmenityDTO[] = [
  { id: "a1", key: "parking", nameFr: "Parking", nameAr: "موقف" },
  { id: "a2", key: "wifi", nameFr: "Wifi", nameAr: "واي فاي" }
] as AmenityDTO[];

function poser(locale: "fr" | "ar" = "fr") {
  render(
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      <FilterWizard wilayas={WILAYAS} styles={STYLES} amenities={AMENITIES} />
    </NextIntlClientProvider>
  );
}

/** ⚠ Le libellé du palier vient du FORMATEUR, jamais tapé à la main :
 *  `Intl` en `fr-DZ` insère des espaces insécables ÉTROITES (U+202F), et
 *  « 1 000 000 » écrit au clavier ne correspond à rien. Première version fautive,
 *  et c'est la même famille de défaut que la doctrine des valeurs relevées. */
const PALIER_1M = formatDZD(100_000_000, "fr");

const question = () => document.getElementById("wz-question")?.textContent;
const recap = () => screen.getByRole("list", { name: "Réponses déjà données" });
const rail = () => screen.getByRole("navigation", { name: /Avancement/ });

beforeEach(() => {
  push.mockReset();
  countVenues.mockReset().mockResolvedValue(7);
});

async function repondreTout() {
  fireEvent.change(screen.getByLabelText("Commune"), { target: { value: "c1" } });
  fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
  fireEvent.change(screen.getByLabelText("Invités"), { target: { value: "250" } });
  fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
  fireEvent.click(screen.getByRole("button", { name: PALIER_1M }));
  await screen.findByRole("button", { name: "Moderne" });
}

describe("Quatre étapes, une question à la fois", () => {
  it("s'ouvre sur la commune, et sur elle seule", () => {
    poser();
    expect(question()).toBe("Où célébrez-vous ?");
    expect(screen.queryByLabelText("Invités")).toBeNull();
    expect(screen.queryByRole("button", { name: "Moderne" })).toBeNull();
  });

  it("⚠ l'étape répondue QUITTE l'écran", async () => {
    poser();
    fireEvent.change(screen.getByLabelText("Commune"), { target: { value: "c1" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    expect(question()).toBe("Combien d'invités ?");
    expect(screen.queryByLabelText("Commune")).toBeNull();
  });

  it("⚠ ne pose AUCUNE question de date — le contrat public n'en porte pas", () => {
    // La maquette la pose et jette la réponse. Ici, elle n'est pas posée : le
    // client ne déclare pas une contrainte que les résultats violeraient.
    poser();
    expect(screen.queryByText(/date/i)).toBeNull();
    expect(within(rail()).queryByText(/date/i)).toBeNull();
  });

  it("les communes sont GROUPÉES par wilaya", () => {
    poser();
    const select = screen.getByLabelText("Commune") as HTMLSelectElement;
    expect(select.querySelectorAll("optgroup")).toHaveLength(1);
    expect(select.querySelector("optgroup")).toHaveAttribute("label", "Alger");
  });
});

describe("Le récapitulatif ne se replie pas", () => {
  it("garde les réponses quand on revient en arrière", async () => {
    poser();
    await repondreTout();
    fireEvent.click(within(recap()).getByRole("button", { name: /Modifier.*Commune/ }));
    expect(recap().textContent).toContain("250");
    expect(recap().textContent).toContain(PALIER_1M);
  });

  it("⚠ n'affiche PAS l'étape en cours dans le récapitulatif", async () => {
    // Relevé par le harnais : sans revenir sur une étape DÉJÀ répondue, la
    // garde ne pouvait pas se manifester — à l'étape « style », aucune réponse
    // n'était à la fois donnée et courante.
    poser();
    await repondreTout();
    fireEvent.click(within(recap()).getByRole("button", { name: /Modifier.*Commune/ }));
    expect(recap().textContent).not.toContain("Hydra");
    expect(screen.getByLabelText("Commune")).toHaveValue("c1");
  });

  it("cliquer le numéro du rail vaut « Modifier »", async () => {
    poser();
    await repondreTout();
    fireEvent.click(within(rail()).getByRole("button", { name: /Modifier.*Invités/ }));
    expect(question()).toBe("Combien d'invités ?");
    expect(screen.getByLabelText("Invités")).toHaveValue(250);
  });

  it("⚠ une étape sans réponse n'est pas cliquable dans le rail", () => {
    poser();
    expect(within(rail()).queryAllByRole("button")).toHaveLength(0);
  });
});

describe("Le compteur vient du SERVEUR", () => {
  it("n'apparaît qu'à la dernière étape", async () => {
    poser();
    expect(countVenues).not.toHaveBeenCalled();
    await repondreTout();
    await waitFor(() => expect(screen.getByRole("status").textContent).toContain("7"));
  });

  it("⚠ interroge le serveur avec les paramètres du CONTRAT, jamais un filtrage local", async () => {
    poser();
    await repondreTout();
    await waitFor(() => expect(countVenues).toHaveBeenCalled());
    const q = countVenues.mock.calls[0]?.[0] as URLSearchParams;
    expect(q.get("cityId")).toBe("c1");
    expect(q.get("guests")).toBe("250");
    expect(q.get("maxPriceCents")).toBe("100000000");
  });

  it("⚠ « je ne sais pas » ne se dit PAS « zéro salle »", async () => {
    countVenues.mockResolvedValue(null);
    poser();
    await repondreTout();
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/indisponible/i));
    expect(screen.getByRole("status").textContent).not.toMatch(/aucune salle/i);
  });

  it("zéro salle le dit, et propose d'élargir", async () => {
    countVenues.mockResolvedValue(0);
    poser();
    await repondreTout();
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/Aucune salle/));
    expect(screen.getByText(/Décochez un critère/)).toBeInTheDocument();
  });
});

describe("La séquence finit sur la page de résultats EXISTANTE", () => {
  it("⚠ construit l'URL avec les noms et l'encodage du contrat public", async () => {
    poser();
    await repondreTout();
    fireEvent.click(screen.getByRole("button", { name: "Moderne" }));
    fireEvent.click(screen.getByRole("button", { name: "Parking" }));
    fireEvent.click(screen.getByRole("button", { name: "Voir les salles" }));
    // `styles` et `amenities` sont des clés SÉPARÉES PAR DES VIRGULES — relevé
    // du schéma Zod, jamais deviné.
    expect(push).toHaveBeenCalledWith(
      "/salles?cityId=c1&guests=250&maxPriceCents=100000000&styles=moderne&amenities=parking"
    );
    // ⚠ Avec DEUX valeurs, sinon un séparateur faux passerait inaperçu : un
    // `join(";")` sur une liste d'un élément rend exactement la même chaîne.
    // Le schéma Zod n'accepte que `^[a-z0-9-]+(?:,[a-z0-9-]+)*$` — relevé.
    // `push` est un double : on reste sur la même étape, il suffit de cocher.
    push.mockReset();
    fireEvent.click(screen.getByRole("button", { name: "Wifi" }));
    fireEvent.click(screen.getByRole("button", { name: "Traditionnel" }));
    fireEvent.click(screen.getByRole("button", { name: "Voir les salles" }));
    const url = push.mock.calls[0]?.[0] as string;
    expect(url).toContain("amenities=parking%2Cwifi");
    expect(url).toContain("styles=moderne%2Ctraditionnel");
  });

  it("sans aucun critère, mène à /salles nu", () => {
    poser();
    fireEvent.click(screen.getByRole("button", { name: "Passer" }));
    fireEvent.click(screen.getByRole("button", { name: "Passer" }));
    fireEvent.click(screen.getByRole("button", { name: "Sans limite" }));
    fireEvent.click(screen.getByRole("button", { name: "Voir les salles" }));
    expect(push).toHaveBeenCalledWith("/salles");
  });

  it("⚠ n'invente AUCUN paramètre absent du contrat", async () => {
    poser();
    await repondreTout();
    fireEvent.click(screen.getByRole("button", { name: "Voir les salles" }));
    const url = push.mock.calls[0]?.[0] as string;
    const permis = ["cityId", "guests", "maxPriceCents", "styles", "amenities"];
    for (const [cle] of new URLSearchParams(url.split("?")[1] ?? "")) {
      expect(permis).toContain(cle);
    }
  });
});

describe("Arabe", () => {
  it("se rend sans clé manquante", () => {
    poser("ar");
    expect(document.body.textContent).not.toMatch(/wizard\./u);
  });
});

// ── Point D — chrome de parcours PARTAGÉE (`@zwadj/ui/journey`) ─────────────
// ⚠ CE QUI EST MESURÉ ICI : que l'assistant client et l'assistant Pro rendent
// la MÊME chrome, pas une chrome « inspirée ». Les quatre points de l'exigence
// Ko, dans l'ordre : rail animé, carte remontée, bouton « Modifier » partagé,
// trait de liaison.
describe("Point D — chrome partagée", () => {
  it("⚠⚠ LA CARTE EST REMONTÉE À CHAQUE ÉTAPE : c'est ce qui fait rejouer l'animation", () => {
    // LE défaut du lot. `animation: zj-step-in` était déclarée depuis la
    // première livraison, dans les DEUX applications, et n'a jamais rejoué :
    // React réconciliait une `<section>` stable, le navigateur n'avait donc
    // rien à réarmer. On mesure l'IDENTITÉ du nœud DOM, pas le style — jsdom ne
    // calcule pas les animations, et un test sur la classe CSS aurait été vert
    // pendant tout le temps où le défaut existait.
    poser();
    const avant = document.querySelector(".zj-card");
    fireEvent.change(screen.getByLabelText("Commune"), { target: { value: "c1" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    const apres = document.querySelector(".zj-card");
    expect(apres).not.toBeNull();
    expect(apres).not.toBe(avant);
  });

  it("la coche du rail est une ICÔNE, la même que côté Pro — plus un glyphe texte", () => {
    // Le client rendait `✓` en texte, le Pro une icône `lucide`. Deux rendus
    // pour le même signe, dans deux copies du même écran.
    poser();
    fireEvent.change(screen.getByLabelText("Commune"), { target: { value: "c1" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    const faite = rail().querySelector("li.is-done .zj-rail-n");
    expect(faite?.querySelector("svg")).not.toBeNull();
    expect(faite?.textContent).toBe("");
  });

  it("⚠ TRAIT DE LIAISON : absent tant qu'il n'y a rien à relier, présent ensuite", () => {
    poser();
    expect(document.querySelector(".zj-connector")).toBeNull();
    fireEvent.change(screen.getByLabelText("Commune"), { target: { value: "c1" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    expect(document.querySelector(".zj-connector")).not.toBeNull();
  });

  it("le trait est DÉCORATIF : il ne dit rien à un lecteur d'écran", () => {
    poser();
    fireEvent.change(screen.getByLabelText("Commune"), { target: { value: "c1" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    expect(document.querySelector(".zj-connector")).toHaveAttribute("aria-hidden", "true");
  });

  it("le bouton « Modifier » vient du composant partagé, et ramène bien à l'étape", () => {
    poser();
    fireEvent.change(screen.getByLabelText("Commune"), { target: { value: "c1" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuer" }));
    const bouton = within(recap()).getByRole("button", { name: /Modifier/ });
    expect(bouton).toHaveClass("zj-recap-edit");
    fireEvent.click(bouton);
    expect(question()).toBe("Où célébrez-vous ?");
  });

  it("⚠ la MISE EN PAGE reste à l'application : `.wz-*` cohabite avec `.zj-*`", () => {
    // La chrome est partagée, pas la grille : `grid-area` et la position
    // collante restent propres à cet écran. Si la `className` d'app sautait, le
    // rail se retrouverait dans le flux au lieu de sa colonne.
    poser();
    expect(rail()).toHaveClass("zj-rail");
    expect(rail()).toHaveClass("wz-rail");
  });
});
