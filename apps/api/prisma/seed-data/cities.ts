// Villes — référentiel seedé (Flux A, Lot A1). Clé naturelle de l'upsert :
// (wilayaId, nameFr) — contrainte UNIQUE réelle depuis la migration
// city_natural_key.
//
// PÉRIMÈTRE DU LOT (décision Ko) : la wilaya 16 (Alger) UNIQUEMENT — marché
// de lancement. Les 57 autres wilayas existent dans la table `wilayas`
// (cible de FK, liste déroulante future) mais SANS ville pour l'instant.
// Volontairement AUCUNE ville générique « Alger » : une salle est dans une
// commune (Chéraga, Zéralda…), jamais dans « Alger » tout court —
// Alger-Centre couvre l'hypercentre. Étendre la couverture (autres communes,
// couronne Blida/Tipaza/Boumerdès, autres wilayas) = une ligne par commune
// ci-dessous, zéro migration.
//
// GPS : centre de commune, 6 décimales max (colonne Decimal(9,6)) — précision
// « placer un repère sur la carte », pas un cadastre. Graphies AR officielles ;
// validation terrain avant usage marketing, comme les amenities.

export interface SeedCity {
  /** Code officiel de la wilaya de rattachement (résolu en `wilayaId` au seed). */
  wilayaCode: number;
  nameFr: string;
  nameAr: string;
  lat: number;
  lng: number;
}

export const CITIES: readonly SeedCity[] = [
  { wilayaCode: 16, nameFr: "Alger-Centre", nameAr: "الجزائر الوسطى", lat: 36.77, lng: 3.0576 },
  { wilayaCode: 16, nameFr: "Bab El Oued", nameAr: "باب الوادي", lat: 36.7925, lng: 3.0522 },
  { wilayaCode: 16, nameFr: "El Biar", nameAr: "الأبيار", lat: 36.7669, lng: 3.0331 },
  { wilayaCode: 16, nameFr: "Hydra", nameAr: "حيدرة", lat: 36.7453, lng: 3.0319 },
  { wilayaCode: 16, nameFr: "Ben Aknoun", nameAr: "بن عكنون", lat: 36.7539, lng: 3.0125 },
  { wilayaCode: 16, nameFr: "Bir Mourad Raïs", nameAr: "بئر مراد رايس", lat: 36.7367, lng: 3.0503 },
  { wilayaCode: 16, nameFr: "Birkhadem", nameAr: "بئر خادم", lat: 36.7147, lng: 3.0513 },
  { wilayaCode: 16, nameFr: "Kouba", nameAr: "القبة", lat: 36.7266, lng: 3.0886 },
  { wilayaCode: 16, nameFr: "Hussein Dey", nameAr: "حسين داي", lat: 36.7439, lng: 3.0972 },
  { wilayaCode: 16, nameFr: "Bab Ezzouar", nameAr: "باب الزوار", lat: 36.7233, lng: 3.1856 },
  { wilayaCode: 16, nameFr: "Dar El Beïda", nameAr: "الدار البيضاء", lat: 36.7131, lng: 3.2125 },
  { wilayaCode: 16, nameFr: "Bordj El Kiffan", nameAr: "برج الكيفان", lat: 36.7481, lng: 3.1925 },
  { wilayaCode: 16, nameFr: "Bordj El Bahri", nameAr: "برج البحري", lat: 36.7869, lng: 3.2508 },
  { wilayaCode: 16, nameFr: "Aïn Taya", nameAr: "عين طاية", lat: 36.7928, lng: 3.2867 },
  { wilayaCode: 16, nameFr: "Rouiba", nameAr: "الرويبة", lat: 36.7372, lng: 3.2842 },
  { wilayaCode: 16, nameFr: "Chéraga", nameAr: "الشراقة", lat: 36.7669, lng: 2.9586 },
  { wilayaCode: 16, nameFr: "Ouled Fayet", nameAr: "أولاد فايت", lat: 36.7328, lng: 2.9503 },
  { wilayaCode: 16, nameFr: "Dély Ibrahim", nameAr: "دالي إبراهيم", lat: 36.7519, lng: 2.9833 },
  { wilayaCode: 16, nameFr: "Draria", nameAr: "درارية", lat: 36.7156, lng: 2.9931 },
  { wilayaCode: 16, nameFr: "El Achour", nameAr: "العاشور", lat: 36.7378, lng: 2.9986 },
  { wilayaCode: 16, nameFr: "Zéralda", nameAr: "زرالدة", lat: 36.7114, lng: 2.8417 },
  { wilayaCode: 16, nameFr: "Staoueli", nameAr: "سطاوالي", lat: 36.7519, lng: 2.8875 },
  { wilayaCode: 16, nameFr: "Aïn Benian", nameAr: "عين البنيان", lat: 36.8022, lng: 2.92 }
] as const;
