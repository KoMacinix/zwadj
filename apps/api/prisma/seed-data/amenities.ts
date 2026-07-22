// Équipements (Amenity) — référentiel seedé (Flux A, Lot A1). Clé naturelle :
// `key` (stable, kebab-case — c'est elle que les fronts mappent aux icônes et
// aux filtres, jamais les libellés). Liste = les 23 entrées VERROUILLÉES au
// cadrage Flux A (document de continuité), verbatim ; « kosha » reçoit
// l'icône `sofa` (arbitrage Ko, Lot A1). Icônes : noms lucide, tous vérifiés
// existants. Graphies AR : à confirmer par l'équipe terrain + l'expert SEO —
// ajuster une entrée = modifier UNE ligne ici puis re-seeder, jamais une
// migration.
//
// Différenciateurs marché algérien assumés (probablement les filtres les plus
// utilisés) : groupe-electrogene (délestages), espaces-separes, salle-priere,
// loge-mariee, kosha, traiteur-externe-autorise.

export interface SeedAmenity {
  key: string;
  nameFr: string;
  nameAr: string;
  icon: string;
}

export const AMENITIES: readonly SeedAmenity[] = [
  { key: "climatisation", nameFr: "Climatisation", nameAr: "تكييف الهواء", icon: "air-vent" },
  { key: "chauffage", nameFr: "Chauffage", nameAr: "تدفئة", icon: "heater" },
  { key: "groupe-electrogene", nameFr: "Groupe électrogène", nameAr: "مولّد كهربائي احتياطي", icon: "zap" },
  { key: "parking", nameFr: "Parking privé", nameAr: "موقف سيارات خاص", icon: "square-parking" },
  { key: "acces-pmr", nameFr: "Accès PMR", nameAr: "ولوج ميسّر لذوي الاحتياجات الخاصة", icon: "accessibility" },
  { key: "wifi", nameFr: "Wifi", nameAr: "واي فاي", icon: "wifi" },
  { key: "traiteur-sur-place", nameFr: "Traiteur sur place", nameAr: "خدمة الطعام في عين المكان", icon: "chef-hat" },
  {
    key: "traiteur-externe-autorise",
    nameFr: "Traiteur externe autorisé",
    nameAr: "السماح بمموّن خارجي",
    icon: "utensils"
  },
  { key: "cuisine-equipee", nameFr: "Cuisine équipée à disposition", nameAr: "مطبخ مجهّز", icon: "cooking-pot" },
  { key: "chambre-froide", nameFr: "Chambre froide", nameAr: "غرفة تبريد", icon: "snowflake" },
  { key: "vaisselle-mobilier", nameFr: "Vaisselle & mobilier inclus", nameAr: "أوانٍ ومفروشات مشمولة", icon: "armchair" },
  {
    key: "espaces-separes",
    nameFr: "Espaces hommes/femmes séparés",
    nameAr: "فضاءان منفصلان للرجال والنساء",
    icon: "users"
  },
  { key: "salle-priere", nameFr: "Salle de prière", nameAr: "مصلّى", icon: "moon-star" },
  { key: "loge-mariee", nameFr: "Loge de la mariée", nameAr: "جناح العروس", icon: "crown" },
  { key: "jardin", nameFr: "Jardin / espace extérieur", nameAr: "حديقة / فضاء خارجي", icon: "trees" },
  { key: "espace-enfants", nameFr: "Espace enfants", nameAr: "ركن الأطفال", icon: "baby" },
  { key: "hebergement", nameFr: "Hébergement sur place", nameAr: "إقامة في عين المكان", icon: "bed-double" },
  { key: "sonorisation", nameFr: "Sonorisation incluse", nameAr: "تجهيز صوتي", icon: "speaker" },
  { key: "eclairage-scenique", nameFr: "Éclairage scénique", nameAr: "إضاءة احتفالية", icon: "lightbulb" },
  { key: "kosha", nameFr: "Kosha (podium des mariés)", nameAr: "كوشة العروسين", icon: "sofa" },
  { key: "ecran-projection", nameFr: "Écran / vidéoprojecteur", nameAr: "شاشة عرض", icon: "projector" },
  { key: "securite", nameFr: "Sécurité / gardiennage", nameAr: "حراسة وأمن", icon: "shield-check" },
  { key: "decoration-incluse", nameFr: "Décoration incluse", nameAr: "الديكور مشمول", icon: "party-popper" }
] as const;
