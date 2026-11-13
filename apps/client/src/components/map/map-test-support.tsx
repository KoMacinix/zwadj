// Doubles de test de la carte (session « carte », lot CA-2) — UN endroit pour les trois écrans du client.
//
// ⚠ POURQUOI UN FAUX CANEVAS. jsdom ne calcule aucune mise en page : y monter Leaflet ne mesurerait que jsdom. Ce que ces
// tests mesurent, c'est ce que NOS composants passent à la carte et ce qu'ils font de ses rappels ; la vraie carte est
// mesurée dans un navigateur (`e2e/specs/ca6-carte.e2e.ts`). Le faux canevas rend donc un bouton par point reçu — rien
// qu'il fabriquerait lui-même.
import type { ComponentType, ReactElement } from "react";
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { messages } from "@zwadj/i18n";
import type { VenueMapPointDTO, VenueMapResponse } from "@zwadj/types";
import type { LeafletCanvasProps, MapTiles } from "@zwadj/ui";

export const TUILES: MapTiles = {
  url: "https://tuiles.test/{z}/{x}/{y}.png",
  attribution: "© Fond de test",
  attributionUrl: "https://tuiles.test/licence"
};

export function FauxCanevas(props: LeafletCanvasProps): ReactElement {
  return (
    <div data-testid="canevas" aria-label={props.labels.region} data-tuiles={props.tiles.url} data-rtl={String(props.rtl)}>
      {props.markers.map((marker) => (
        <button
          key={marker.id}
          type="button"
          data-lat={marker.lat}
          data-lng={marker.lng}
          aria-pressed={marker.id === props.selectedId}
          onClick={() => props.onSelect?.(marker.id)}
        >
          {marker.label}
        </button>
      ))}
      <button type="button" onClick={() => props.onTilesError?.()}>
        (test) une tuile échoue
      </button>
    </div>
  );
}

/** Chargeur du faux canevas, d'identité STABLE (le composant relance son chargement si la fonction change). */
export const chargerFauxCanevas = (): Promise<{ default: ComponentType<LeafletCanvasProps> }> =>
  Promise.resolve({ default: FauxCanevas });

export function point(n: number, over: Partial<VenueMapPointDTO> = {}): VenueMapPointDTO {
  return {
    id: `id-${n}`,
    slug: `salle-${n}`,
    nameFr: `Salle ${n}`,
    nameAr: `قاعة ${n}`,
    lat: 36.7 + n / 100,
    lng: 3.05 + n / 100,
    // ⚠ Jamais un montant « rond » : une valeur que seul le serveur peut avoir donnée (R-4).
    basePriceCents: 12_345_600 + n * 1_111_100,
    capacityMax: 100 + n * 37,
    coverThumbUrl: null,
    ...over
  };
}

export function reponse(points: VenueMapPointDTO[], over: Partial<VenueMapResponse> = {}): VenueMapResponse {
  return { points, total: points.length, withoutCoordinates: 0, truncated: false, limit: 500, availableOn: null, ...over };
}

/** L'enveloppe de messages — exportée pour `rerender`, qui doit reposer le MÊME fournisseur. */
export function enveloppe(ui: ReactElement, locale: "fr" | "ar" = "fr"): ReactElement {
  return (
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      {ui}
    </NextIntlClientProvider>
  );
}

export function rendre(ui: ReactElement, locale: "fr" | "ar" = "fr") {
  return render(enveloppe(ui, locale));
}

/** Un message du catalogue, ses jetons remplacés — l'attendu vient du CATALOGUE, jamais d'une phrase retapée. */
export function message(locale: "fr" | "ar", cle: string, valeurs: Record<string, string | number> = {}): string {
  let noeud: unknown = messages[locale];
  for (const part of cle.split(".")) noeud = (noeud as Record<string, unknown>)[part];
  if (typeof noeud !== "string") throw new Error(`clé de message introuvable : ${cle} (${locale})`);
  return Object.entries(valeurs).reduce((texte, [nom, valeur]) => texte.replace(`{${nom}}`, String(valeur)), noeud);
}
