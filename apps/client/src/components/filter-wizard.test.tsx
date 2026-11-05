// Assistant de filtres — RÉÉCRIT par FC-8 (session `front-client`, le lot ③) : un MODE de `/salles` (D229), sans état local.
//
// ⚠ CE QUI EST MESURÉ ICI. L'étape et les réponses viennent des PROPS — c'est-à-dire de l'URL, que la page lit (`parseGuide`,
// `parseSearchParams`) ; chaque réponse POUSSE une URL de `/salles`, relue par le parseur RÉEL de la page d'arrivée, jamais
// comparée à une chaîne écrite ici seulement ; aucune question ne pose un critère que la page ignorerait (la date — cinquième
// étape — est HORS lot). La chrome de parcours PARTAGÉE (`@zwadj/ui/journey`) reste mesurée ici, côté client (D223) : rail,
// liaison, carte remontée, « Modifier ».
// ⚠ Les titres que des harnais d'autres rangs attendent sont CONSERVÉS là où leur sens tient (`neutralize-journey.py`,
// `neutralize-r32.py` R-1, `neutralize-maxprice.py` M3 et M10).
import { fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { formatDZD, messages } from "@zwadj/i18n";
import type { AmenityDTO, VenueStyleDTO, WilayaDTO } from "@zwadj/types";
import { FilterWizard } from "./filter-wizard";
// ⚠ Le parseur RÉEL de la page d'arrivée, pas une copie : c'est la confrontation des deux modules qui manquait (D228).
import { BUDGET_TIERS, centsFromDinars, parseSearchParams, toApiQuery, type SearchState } from "../lib/search-query";

const push = vi.fn();
const replace = vi.fn();
vi.mock("../i18n/navigation", () => ({
  useRouter: () => ({ push, replace }),
  Link: ({ children }: { children: React.ReactNode }) => <a href="#">{children}</a>
}));

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
// ⚠ DEUX styles ET deux équipements : avec un seul élément, un séparateur faux ne se mesure pas.
const STYLES: VenueStyleDTO[] = [
  { id: "s1", key: "moderne", nameFr: "Moderne", nameAr: "عصري" },
  { id: "s2", key: "traditionnel", nameFr: "Traditionnel", nameAr: "تقليدي" }
] as VenueStyleDTO[];
const AMENITIES: AmenityDTO[] = [
  { id: "a1", key: "parking", nameFr: "Parking", nameAr: "موقف" },
  { id: "a2", key: "wifi", nameFr: "Wifi", nameAr: "واي فاي" }
] as AmenityDTO[];

type Etape = "city" | "guests" | "budget" | "taste";
const FR = messages.fr.wizard;

/** ⚠ Le libellé du palier vient du FORMATEUR, jamais tapé à la main (espaces insécables étroites, D209 n° 6), et le montant de
 *  l'AUTORITÉ (`BUDGET_TIERS`, D254). `Math.max` : le palier le plus haut, sans indexation par un calcul. */
const PALIER = Math.max(...BUDGET_TIERS);
const PALIER_TEXTE = formatDZD(centsFromDinars(PALIER), "fr");
const REPONSES = { cityId: "c1", guests: "250", maxPrice: String(PALIER) };

function element(step: Etape, raw: Record<string, string | string[]> = {}, locale: "fr" | "ar" = "fr", total: number | null = 7) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      <FilterWizard step={step} state={parseSearchParams(raw)} total={total} wilayas={WILAYAS} styles={STYLES} amenities={AMENITIES} />
    </NextIntlClientProvider>
  );
}

function poser(step: Etape, raw: Record<string, string | string[]> = {}, locale: "fr" | "ar" = "fr", total: number | null = 7) {
  return render(element(step, raw, locale, total));
}

/** Une URL poussée (`push` ou `replace`), relue par le parseur RÉEL de `/salles` — clés répétées comprises. */
function relue(url: string): { chemin: string; params: URLSearchParams; etat: SearchState } {
  const [chemin = "", q = ""] = url.split("?");
  const params = new URLSearchParams(q);
  const brut: Record<string, string | string[]> = {};
  for (const cle of new Set(params.keys())) {
    const valeurs = params.getAll(cle);
    brut[cle] = valeurs.length > 1 ? valeurs : (valeurs[0] ?? "");
  }
  return { chemin, params, etat: parseSearchParams(brut) };
}
const poussee = (n = 0) => relue(push.mock.calls[n]?.[0] as string);

const question = () => document.getElementById("wz-question")?.textContent;
const recap = () => screen.getByRole("list", { name: FR.recapLabel });
const rail = () => screen.getByRole("navigation", { name: /Avancement/ });

beforeEach(() => {
  push.mockReset();
  replace.mockReset();
});

describe("FC-8 — l'étape vient de l'URL, une question à la fois", () => {
  it("s'ouvre à l'étape DEMANDÉE, et sur elle seule", () => {
    poser("guests");
    expect(question()).toBe(FR.qGuests);
    expect(screen.queryByLabelText(FR.stepCity)).toBe(null);
  });

  it("⚠ ne pose AUCUNE question de date — la cinquième étape est HORS lot", () => {
    for (const etape of ["city", "guests", "budget", "taste"] as const) {
      const { unmount } = poser(etape);
      expect(/date/i.test(document.body.textContent ?? "")).toBe(false);
      unmount();
    }
  });

  it("les communes sont GROUPÉES par wilaya", () => {
    poser("city");
    const select = screen.getByLabelText(FR.stepCity) as HTMLSelectElement;
    expect(select.querySelectorAll("optgroup").length).toBe(1);
    expect(select.querySelector("optgroup")?.getAttribute("label")).toBe("Alger");
  });

  it("le champ REPREND la réponse déjà donnée — elle est lue dans l'URL, pas dans une mémoire locale", () => {
    const { unmount } = poser("city", { cityId: "c1" });
    expect((screen.getByLabelText(FR.stepCity) as HTMLSelectElement).value).toBe("c1");
    unmount();
    poser("guests", { guests: "250" });
    expect((screen.getByLabelText(FR.stepGuests) as HTMLInputElement).value).toBe("250");
  });
});

describe("FC-8 — chaque réponse POUSSE une URL de `/salles` (aucun état local, D229)", () => {
  it("répondre à la commune pousse `/salles?cityId=…&guide=guests` (D229, mot pour mot)", () => {
    poser("city");
    fireEvent.change(screen.getByLabelText(FR.stepCity), { target: { value: "c1" } });
    fireEvent.click(screen.getByRole("button", { name: FR.continue }));
    const { chemin, params } = poussee();
    expect(chemin).toBe("/salles");
    expect([...params.entries()]).toEqual([
      ["cityId", "c1"],
      ["guide", "guests"]
    ]);
  });

  it("les invités : la valeur tenue par le DOM part à « Continuer » (le seul champ non contrôlé, D229)", () => {
    poser("guests", { cityId: "c1" });
    fireEvent.change(screen.getByLabelText(FR.stepGuests), { target: { value: "250" } });
    fireEvent.click(screen.getByRole("button", { name: FR.continue }));
    const { params, etat } = poussee();
    expect(etat.cityId).toBe("c1");
    expect(etat.guests).toBe("250");
    expect(params.get("guide")).toBe("budget");
  });

  it("⚠ « Passer » avance SANS réponse, et la séquence se TERMINE : on ne retombe jamais sur la commune", () => {
    poser("guests");
    fireEvent.click(screen.getByRole("button", { name: FR.skip }));
    expect(poussee().params.get("guide")).toBe("budget");
    expect(poussee().etat.guests).toBe("");
  });

  it.each([...BUDGET_TIERS])("le palier %s DA arrive intact à l'API ET à l'URL, et les deux CONCORDENT", (palier) => {
    poser("budget", { cityId: "c1" });
    fireEvent.click(screen.getByRole("button", { name: formatDZD(centsFromDinars(palier), "fr") }));
    const { params, etat } = poussee();
    // L'URL PUBLIQUE porte des DINARS, sous le nom que la page LIT ; l'API en reçoit des CENTIMES par la SEULE conversion.
    expect(params.get("maxPrice")).toBe(String(palier));
    expect(params.get("maxPriceCents")).toBe(null);
    expect(toApiQuery(etat).get("maxPriceCents")).toBe(String(centsFromDinars(palier)));
    expect(params.get("guide")).toBe("taste");
  });

  it("« Sans limite » efface le plafond et passe aux goûts", () => {
    poser("budget", { maxPrice: String(PALIER) });
    fireEvent.click(screen.getByRole("button", { name: FR.budgetAny }));
    expect(poussee().etat.maxPrice).toBe("");
    expect(poussee().params.get("guide")).toBe("taste");
  });

  it("⚠ construit l'URL avec les noms et l'encodage que `/salles` LIT", () => {
    poser("taste", { ...REPONSES, styles: "moderne" });
    // Cocher reste SUR l'étape : `replace`, pas `push` — le bouton retour recule d'une QUESTION, pas d'une coche (D230).
    fireEvent.click(screen.getByRole("button", { name: "Traditionnel" }));
    fireEvent.click(screen.getByRole("button", { name: "Wifi" }));
    const coche = relue(replace.mock.calls[0]?.[0] as string);
    expect(coche.params.getAll("styles")).toEqual(["moderne", "traditionnel"]);
    expect(coche.params.get("guide")).toBe("taste");
    const wifi = relue(replace.mock.calls[1]?.[0] as string);
    expect(wifi.params.getAll("amenities")).toEqual(["wifi"]);
    // « Voir les salles » : la page de résultats, panneau FERMÉ, réponses intactes — relues par le parseur réel.
    fireEvent.click(screen.getByRole("button", { name: /Voir/ }));
    const { chemin, params, etat } = poussee();
    expect(chemin).toBe("/salles");
    expect(params.get("guide")).toBe(null);
    expect(etat).toMatchObject({ cityId: "c1", guests: "250", maxPrice: String(PALIER), styles: ["moderne"] });
  });

  it("⚠ n'invente AUCUN paramètre absent du contrat", () => {
    poser("taste", { ...REPONSES, styles: ["moderne", "traditionnel"], amenities: "parking" });
    fireEvent.click(screen.getByRole("button", { name: /Voir/ }));
    const permis = ["cityId", "guests", "maxPrice", "styles", "amenities"];
    for (const [cle] of poussee().params) expect(permis.includes(cle)).toBe(true);
  });

  it("sans aucun critère, « Voir les salles » mène à /salles nu", () => {
    poser("taste");
    fireEvent.click(screen.getByRole("button", { name: /Voir/ }));
    expect(push).toHaveBeenCalledWith("/salles");
  });

  it("« Fermer » rend la page de résultats SANS `guide`, réponses gardées", () => {
    poser("budget", { cityId: "c1", guests: "250" });
    fireEvent.click(screen.getByRole("button", { name: FR.close }));
    const { params, etat } = poussee();
    expect(params.get("guide")).toBe(null);
    expect(etat.cityId).toBe("c1");
  });

  it("« Recommencer » repart de la commune, sans AUCUNE réponse", () => {
    poser("taste", REPONSES);
    fireEvent.click(screen.getByRole("button", { name: FR.reset }));
    expect(push).toHaveBeenCalledWith("/salles?guide=city");
  });
});

describe("Le compte vient du SERVEUR — le total de la page de résultats, jamais un filtrage local", () => {
  it("à la dernière étape, il dit le total que la page a reçu", () => {
    poser("taste", REPONSES, "fr", 7);
    expect(screen.getByRole("status").textContent).toContain("7");
  });

  it("⚠ « je ne sais pas » ne se dit PAS « zéro salle »", () => {
    poser("taste", REPONSES, "fr", null);
    expect(screen.getByRole("status").textContent).toMatch(/indisponible/i);
    expect(screen.getByRole("status").textContent).not.toMatch(/aucune salle/i);
  });

  it("zéro salle le dit, et propose d'élargir", () => {
    poser("taste", REPONSES, "fr", 0);
    expect(screen.getByRole("status").textContent).toMatch(/Aucune salle/);
    expect(screen.getByText(/Décochez un critère/)).toBeInTheDocument();
  });
});

describe("Le récapitulatif et le rail lisent l'URL — ils ne se replient pas", () => {
  it("le récapitulatif garde TOUTES les réponses de l'URL, sauf l'étape en cours", () => {
    poser("city", REPONSES);
    expect(recap().textContent).toContain("250");
    expect(recap().textContent).toContain(PALIER_TEXTE);
    expect(recap().textContent).not.toContain("Hydra");
  });

  it("cliquer le numéro du rail vaut « Modifier »", () => {
    poser("taste", REPONSES);
    fireEvent.click(within(rail()).getByRole("button", { name: /Modifier.*Invités/ }));
    const { params, etat } = poussee();
    expect(params.get("guide")).toBe("guests");
    expect(etat.guests).toBe("250");
  });

  it("⚠ une étape sans réponse n'est pas cliquable dans le rail", () => {
    poser("city");
    expect(within(rail()).queryAllByRole("button")).toHaveLength(0);
  });

  // ── Rang 32 (D325) — le LIBELLÉ du rail est cliquable comme sa pastille (chrome partagée : garde côté Client ET côté Pro) ──
  it("⚠ cliquer le LIBELLÉ d'une étape répondue vaut « Modifier », comme sa pastille", () => {
    poser("taste", REPONSES);
    fireEvent.click(within(rail()).getByText("Invités"));
    expect(poussee().params.get("guide")).toBe("guests");
  });

  it("⚠ la pastille et le libellé sont UN seul bouton ; le libellé d'une étape sans réponse n'est dans aucun bouton (on ne saute pas une étape incomplète)", () => {
    poser("taste", { cityId: "c1", guests: "250" });
    expect(within(rail()).getAllByRole("button", { name: /Modifier.*Invités/ })).toHaveLength(1);
    expect(within(rail()).getByText("Invités").closest("button")).not.toBeNull();
    const courante = rail().querySelector("li.is-current .zj-rail-label");
    expect(courante).not.toBeNull();
    expect((courante as HTMLElement).closest("button")).toBeNull();
  });
});

describe("FC-8 — un panneau par-dessus les résultats : une boîte de dialogue, et le focus y entre", () => {
  it("la boîte est nommée par son titre, et la carte de la question reçoit le focus", () => {
    poser("budget");
    const boite = screen.getByRole("dialog");
    expect(boite.getAttribute("aria-modal")).toBe("true");
    expect(document.getElementById(boite.getAttribute("aria-labelledby") ?? "")?.textContent).toBe(FR.title);
    expect(document.activeElement).toBe(document.querySelector(".zj-card"));
  });
});

describe("Arabe", () => {
  it("se rend sans clé manquante", () => {
    poser("taste", REPONSES, "ar");
    expect(document.body.textContent).not.toMatch(/wizard\./u);
  });
});

// ── Point D — chrome de parcours PARTAGÉE (`@zwadj/ui/journey`) ─────────────────────────────────────────────────────────────
// ⚠ CE QUI EST MESURÉ ICI : que l'assistant client et l'assistant Pro rendent la MÊME chrome. Le rail, la carte remontée, le
// bouton « Modifier » partagé, le trait de liaison.
describe("Point D — chrome partagée", () => {
  it("⚠⚠ LA CARTE EST REMONTÉE À CHAQUE ÉTAPE : c'est ce qui fait rejouer l'animation", () => {
    // On mesure l'IDENTITÉ du nœud DOM, pas le style — jsdom ne calcule pas les animations (D222). L'étape change par l'URL :
    // la page se rend de nouveau avec une autre étape.
    const { rerender } = poser("city");
    const avant = document.querySelector(".zj-card");
    rerender(element("guests", { cityId: "c1" }));
    const apres = document.querySelector(".zj-card");
    expect(apres).not.toBeNull();
    expect(apres).not.toBe(avant);
  });

  it("la coche du rail est une ICÔNE, la même que côté Pro — plus un glyphe texte", () => {
    poser("guests", { cityId: "c1" });
    const faite = rail().querySelector("li.is-done .zj-rail-n");
    expect(faite?.querySelector("svg")).not.toBeNull();
    expect(faite?.textContent).toBe("");
  });

  it("⚠ TRAIT DE LIAISON : absent tant qu'il n'y a rien à relier, présent ensuite", () => {
    const { rerender } = poser("city");
    expect(document.querySelector(".zj-connector")).toBeNull();
    rerender(element("guests", { cityId: "c1" }));
    expect(document.querySelector(".zj-connector")).not.toBeNull();
  });

  it("le trait est DÉCORATIF : il ne dit rien à un lecteur d'écran", () => {
    poser("guests", { cityId: "c1" });
    expect(document.querySelector(".zj-connector")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("le bouton « Modifier » vient du composant partagé, et ramène bien à l'étape", () => {
    poser("guests", { cityId: "c1" });
    const bouton = within(recap()).getByRole("button", { name: /Modifier/ });
    expect(bouton.classList.contains("zj-recap-edit")).toBe(true);
    fireEvent.click(bouton);
    expect(poussee().params.get("guide")).toBe("city");
  });

  it("⚠ la MISE EN PAGE reste à l'application : `.wz-*` cohabite avec `.zj-*`", () => {
    poser("city");
    expect(rail().classList.contains("zj-rail")).toBe(true);
    expect(rail().classList.contains("wz-rail")).toBe(true);
  });
});
