// Lot UI-D5 — jeu de salles FICTIVES, pour voir la grille de résultats quand
// la base est vide ou l'API éteinte.
//
// ── Pourquoi ce fichier existe ───────────────────────────────────────────────
// La page de recherche ne se juge pas à vide : une grille de quatre colonnes,
// des badges, des notes et des prix alignés ne se dessinent pas dans un état
// « aucun résultat ». Sans ce jeu, chaque passe visuelle exigeait une base
// seedée et une API allumée — et se faisait donc rarement.
//
// ── Trois garde-fous, parce que de fausses salles sont un vrai danger ────────
//  1. **Jamais en production.** L'activation est calculée dans la page serveur
//     (`process.env.NODE_ENV !== "production"`), pas ici : un module de données
//     ne doit pas décider seul quand il s'affiche.
//  2. **Jamais silencieuses.** La vue pose un bandeau au-dessus de la grille.
//     Une salle inventée qu'on ne peut pas distinguer d'une vraie est un piège
//     à captures d'écran et à démonstrations client.
//  3. **Jamais un type à part.** `PreviewVenue` ÉTEND `VenueSummaryDTO` : la
//     grille rend les deux avec le même composant. Un jeu de démonstration qui
//     passe par un autre chemin de rendu ne prouve rien du rendu réel.
//
// ── Ce que le DTO ne porte pas, et qui est donc fictif à part ────────────────
// `VenueSummaryDTO` n'a **ni note, ni nombre d'avis, ni badge** — le design de
// référence les affiche, l'API ne les sert pas encore (les avis relèvent du
// Flux B). Ces trois champs sont ajoutés ICI et rendus de façon CONDITIONNELLE
// par la carte : une salle réelle sort donc sans étoile, sans que rien ne
// casse. Le jour où l'API les servira, la carte n'aura pas à changer.
//
// ⚠ Les liens de ces cartes pointent des `slug` qui n'existent pas en base :
// cliquer une salle de démonstration donne un 404. C'est le résultat HONNÊTE —
// la salle n'existe pas —, et c'est préférable à une carte non cliquable qui ne
// se comporterait pas comme une vraie.
//
// ⚠ Les photos sont des URL Unsplash ABSOLUES (celles du prototype de
// référence, pour que le rendu soit comparable à l'image de cadrage).
// `mediaSrc()` ne préfixe que le relatif, elles passent donc intactes. Aucune
// entrée `remotePatterns` n'est nécessaire : cette page rend des `<img>` nus,
// jamais `next/image` (écart assumé n°2 du Lot A7).
import type { VenueSummaryDTO } from "@zwadj/types";

/** Pastille d'accroche du design de référence. Clés i18n : `search.badge.*`. */
export type PreviewBadge = "favourite" | "new" | "premium";

/** Champs que le design affiche et que `VenueSummaryDTO` ne porte pas encore. */
export interface VenueCardExtras {
  /** Note moyenne sur 5. `undefined` = non notée : la carte n'affiche rien. */
  ratingAvg?: number;
  reviewCount?: number;
  badge?: PreviewBadge;
}

/** Ce que la grille sait rendre : le DTO réel, éventuellement enrichi. */
export type VenueCardData = VenueSummaryDTO & VenueCardExtras;

export type PreviewVenue = VenueCardData;

/**
 * Le jeu de démonstration, ou `null`, selon l'environnement REÇU.
 *
 * ⚠ POURQUOI CETTE FONCTION EXISTE MAINTENANT. Le garde-fou n°1 était tenu par
 * un ternaire écrit dans chaque page serveur — correct, et **impossible à
 * mesurer** : aucun test ne rend une page serveur Next, donc rien ne rougissait
 * si le ternaire disparaissait. Le harnais de neutralisation l'a montré : muter
 * `page.tsx` pour passer le jeu en toutes circonstances laissait 19 tests verts.
 *
 * ⚠ ELLE NE VIOLE PAS LE GARDE-FOU N°1. Ce module ne décide toujours pas seul :
 * l'environnement lui est PASSÉ. Un module de données qui lirait `process.env`
 * lui-même s'activerait tout seul — c'est cela qui était interdit, pas le fait
 * de savoir répondre à la question quand on la lui pose.
 */
export function previewVenuesFor(nodeEnv: string | undefined): readonly VenueCardData[] | null {
  return nodeEnv === "production" ? null : PREVIEW_VENUES;
}

/** Ville d'Alger du seed A1. La valeur importe peu — rien ne la requête —,
 *  mais elle doit être un UUID valide : `cityId` est typé comme tel et un
 *  `"preview"` traînant finirait dans une URL de filtre au premier copier. */
const ALGER_CENTRE = "0198e1c4-1000-7000-8000-00000000a16a";

/** Prix affichés en DINARS dans le design ; le DTO est en CENTIMES (invariant
 *  argent-en-entiers). La conversion est écrite une fois, ici, plutôt que
 *  répétée six fois avec six occasions de se tromper d'un facteur 100. */
const da = (dinars: number): number => dinars * 100;

// ⚠ `availableOnDate: null` PARTOUT, et jamais `true`. Une salle inventée ne
// peut rien dire d'une disponibilité réelle ; l'annoncer libre ferait tester le
// chemin « pas grisée » avec une donnée qui ne vient d'aucun moteur. Le repli
// de démonstration ne s'active de toute façon que sans résultat, donc sans
// question de date posée — `null` est la valeur HONNÊTE, pas un remplissage.
export const PREVIEW_VENUES: readonly PreviewVenue[] = [
  {
    id: "0198e1c4-2000-7000-8000-000000000001",
    slug: "salle-el-aurassi-royale",
    cityId: ALGER_CENTRE,
    nameFr: "Salle El Aurassi Royale",
    nameAr: "قاعة الأوراسي الملكية",
    taglineFr: "Vue panoramique sur la baie d'Alger",
    taglineAr: "إطلالة بانورامية على خليج الجزائر",
    districtFr: "El Mouradia, Alger",
    districtAr: "المرادية، الجزائر",
    capacityMax: 600,
    basePriceCents: da(850_000),
    bookingMode: "SINGLE_SLOT",
    ceremonyType: "INDOOR",
    publicationStatus: "PUBLISHED",
    coverThumbUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80",
    photoCount: 5,
    availableOnDate: null,
    ratingAvg: 4.92,
    reviewCount: 142,
    badge: "favourite"
  },
  {
    id: "0198e1c4-2000-7000-8000-000000000002",
    slug: "domaine-du-jardin-dessai",
    cityId: ALGER_CENTRE,
    nameFr: "Domaine du Jardin d'Essai",
    nameAr: "ضيعة الحامة",
    taglineFr: "Mariage en plein air, palmiers centenaires",
    taglineAr: "حفل في الهواء الطلق، نخيل معمّر",
    districtFr: "Hamma, Alger",
    districtAr: "الحامة، الجزائر",
    capacityMax: 350,
    basePriceCents: da(620_000),
    bookingMode: "MULTI_SLOT",
    ceremonyType: "OUTDOOR",
    publicationStatus: "PUBLISHED",
    coverThumbUrl: "https://images.unsplash.com/photo-1464047736614-af63643285bf?w=800&q=80",
    photoCount: 4,
    availableOnDate: null,
    ratingAvg: 4.87,
    reviewCount: 98
  },
  {
    id: "0198e1c4-2000-7000-8000-000000000003",
    slug: "villa-marina-sidi-fredj",
    cityId: ALGER_CENTRE,
    nameFr: "Villa Marina Sidi Fredj",
    nameAr: "فيلا مارينا سيدي فرج",
    taglineFr: "Bord de mer, mariage les pieds dans l'eau",
    taglineAr: "على شاطئ البحر، عرس على الماء",
    districtFr: "Sidi Fredj, Alger",
    districtAr: "سيدي فرج، الجزائر",
    capacityMax: 280,
    basePriceCents: da(720_000),
    bookingMode: "SINGLE_SLOT",
    ceremonyType: "MIXED",
    publicationStatus: "PUBLISHED",
    coverThumbUrl: "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&q=80",
    photoCount: 4,
    availableOnDate: null,
    ratingAvg: 4.95,
    reviewCount: 76,
    badge: "new"
  },
  {
    id: "0198e1c4-2000-7000-8000-000000000004",
    slug: "palais-des-rais",
    cityId: ALGER_CENTRE,
    nameFr: "Palais des Raïs",
    nameAr: "قصر الرياس",
    taglineFr: "Patrimoine ottoman, casbah d'Alger",
    taglineAr: "تراث عثماني، قصبة الجزائر",
    districtFr: "Bastion 23, Alger Centre",
    districtAr: "الحصن 23، وسط الجزائر",
    capacityMax: 220,
    basePriceCents: da(940_000),
    bookingMode: "SINGLE_SLOT",
    ceremonyType: "MIXED",
    publicationStatus: "PUBLISHED",
    coverThumbUrl: "https://images.unsplash.com/photo-1578730169862-749bbdc763a8?w=800&q=80",
    photoCount: 4,
    availableOnDate: null,
    ratingAvg: 4.99,
    reviewCount: 54,
    badge: "premium"
  },
  {
    id: "0198e1c4-2000-7000-8000-000000000005",
    slug: "domaine-des-oliviers",
    cityId: ALGER_CENTRE,
    nameFr: "Domaine des Oliviers",
    nameAr: "ضيعة الزيتون",
    taglineFr: "Oliveraie centenaire, ambiance champêtre",
    taglineAr: "بستان زيتون عريق، أجواء ريفية",
    districtFr: "Cheraga, Alger",
    districtAr: "الشراقة، الجزائر",
    capacityMax: 450,
    basePriceCents: da(540_000),
    bookingMode: "MULTI_SLOT",
    ceremonyType: "OUTDOOR",
    publicationStatus: "PUBLISHED",
    coverThumbUrl: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=800&q=80",
    photoCount: 3,
    availableOnDate: null,
    ratingAvg: 4.78,
    reviewCount: 211
  },
  {
    id: "0198e1c4-2000-7000-8000-000000000006",
    slug: "hilton-alger-ballroom",
    cityId: ALGER_CENTRE,
    nameFr: "Hilton Alger Ballroom",
    nameAr: "قاعة هيلتون الجزائر",
    taglineFr: "Salle de bal contemporaine, Bab Ezzouar",
    taglineAr: "قاعة احتفالات معاصرة، باب الزوار",
    districtFr: "Bab Ezzouar, Alger",
    districtAr: "باب الزوار، الجزائر",
    capacityMax: 800,
    basePriceCents: da(980_000),
    bookingMode: "MULTI_SLOT",
    ceremonyType: "INDOOR",
    publicationStatus: "PUBLISHED",
    coverThumbUrl: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=80",
    photoCount: 3,
    availableOnDate: null,
    ratingAvg: 4.84,
    reviewCount: 189
  }
];
