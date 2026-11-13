#!/usr/bin/env python3
"""Campagne de neutralisation — CA-2 (session parallèle « carte ») : le cadre de carte et la vue « carte » de la recherche.

Ce que le lot ajoute, et que chaque cible neutralise :
  · T-n  `packages/ui/src/map/map-tiles.ts` — quel fond de carte (R-2), précision d'une coordonnée, boîte des points ;
  · P-n  `apps/client/src/components/map/venue-points-map.tsx` — ce qui est dit autour de la carte, la salle choisie, le prix
         du SERVEUR (R-4) ;
  · U-n  `packages/ui/src/map/venue-map.tsx` — le cadre : tuile en échec, bibliothèque non chargée, mention d'attribution ;
  · L-n  `apps/client/src/components/map/venue-map-loader.tsx` — les quatre issues du chargeur ;
  · V-n  `apps/client/src/components/search/search-view.tsx` — la carte ne se monte qu'au geste (R-9), sur les filtres courants ;
  · Q-n  `toMapQuery` ; A-n `getVenueMap` ; G-n la garde de source des imports de Leaflet (R-1).
Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-ca2.py
    CA2_DECOUVERTE=1 python3 neutralisation/neutralize-ca2.py
Lecteurs, calibration, preuve de pose et restauration : `neutralisation/socle_front_client.py` (module partagé, D305).

CE QUI N'EST PAS NEUTRALISÉ, ET POURQUOI (écrit, pas tu) :
  · la garde de forme `Array.isArray(response.points)` de `venue-points-map.tsx` : la retirer fait PLANTER le rendu
    (`TypeError`), et un plantage n'est pas une morsure (D304). Son test existe et passe ; il ne se prouve pas par assertion.
  · « un 500 est lu comme une réponse » dans `getVenueMap` : mutation ÉQUIVALENTE tant que la garde de forme tient (un corps
    d'erreur n'a pas de `points`) — c'est la garde de forme qui est neutralisée (A-2).
  · la VRAIE carte (Leaflet dans un navigateur) : `e2e/specs/ca6-carte.e2e.ts`, lot CA-6. Les tests de composant doublent
    le canevas ; ils mesurent ce que nos composants lui passent, pas ce que Leaflet en fait.
"""
import sys

sys.path.insert(0, "neutralisation")
import socle_front_client as socle  # noqa: E402

socle.exiger_racine(__file__)

TUILES = "packages/ui/src/map/map-tiles.ts"
CADRE = "packages/ui/src/map/venue-map.tsx"
POINTS = "apps/client/src/components/map/venue-points-map.tsx"
CHARGEUR = "apps/client/src/components/map/venue-map-loader.tsx"
VUE = "apps/client/src/components/search/search-view.tsx"
REQUETE = "apps/client/src/lib/search-query.ts"
API = "apps/client/src/lib/api.ts"

campagne = socle.Campagne("ca2", {
    "tuiles": socle.vitest("@zwadj/client", "src/components/ui-map-tiles.test.ts"),
    "points": socle.vitest("@zwadj/client", "src/components/map/venue-points-map.test.tsx"),
    "chargeur": socle.vitest("@zwadj/client", "src/components/map/venue-map-loader.test.tsx"),
    "vue": socle.vitest("@zwadj/client", "src/components/search/search-view.test.tsx"),
    "requete": socle.vitest("@zwadj/client", "src/lib/search-query.test.ts"),
    "api": socle.vitest("@zwadj/client", "src/lib/api.test.ts"),
    "garde": socle.vitest("@zwadj/client", "src/lib/leaflet-import-guard.test.ts"),
})

# ── le fond de carte (R-2) ───────────────────────────────────────────────────────────────────────────────────────────
campagne.cible("T-1. ⛔ PRODUCTION sans variable : le défaut de développement est servi", TUILES,
               "return env.production ? null : DEV_MAP_TILES;", "return DEV_MAP_TILES;",
               {"tuiles": "⛔ PRODUCTION sans variable : PAS de carte — jamais le défaut de développement"})
campagne.cible("T-2. Une adresse de tuiles sans mention d'attribution est acceptée", TUILES,
               'if (url === "" || attribution === "") return null;', 'if (url === "") return null;',
               {"tuiles": "⛔ une adresse SANS mention : pas de carte (on n'affiche pas les tuiles d'un tiers sans le créditer)"})
campagne.cible("T-3. Une mention sans adresse retombe sur le défaut de développement", TUILES,
               'if (url === "" || attribution === "") return null;',
               'if (url === "" || attribution === "") return env.production ? null : DEV_MAP_TILES;',
               {"tuiles": "⛔ une mention SANS adresse : pas de carte non plus (elle créditerait le défaut de développement d'un autre nom)"})
campagne.cible("T-4. N'importe quelle adresse passe pour un gabarit de tuiles", TUILES,
               "  if (!isTileTemplate(url, env.production)) return null;\n", "",
               {"tuiles": "une adresse qui n'est pas un gabarit de tuiles ({z}, {x}, {y}) est refusée"})
campagne.cible("T-5. `http://` est admis en production", TUILES,
               '(!production && url.startsWith("http://"))', '(url.startsWith("http://"))',
               {"tuiles": "`http://` : admis hors production (serveur de tuiles local), refusé en production"})
campagne.cible("T-6. Le lien de la mention accepte n'importe quel schéma", TUILES,
               'attributionUrl.startsWith("https://") ? attributionUrl : null', 'attributionUrl === "" ? null : attributionUrl',
               {"tuiles": "le lien de la mention est facultatif, et n'est gardé que s'il est en `https://`"})
campagne.cible("T-7. Une coordonnée n'est plus arrondie à la précision de la colonne", TUILES,
               "return Math.round(value * factor) / factor;", "return value + factor * 0;",
               {"tuiles": "une coordonnée s'écrit à la précision de la colonne (six décimales)"})
campagne.cible("T-8. La borne de latitude n'est plus incluse", TUILES,
               "position.lat <= 90 &&", "position.lat < 90 &&", {"tuiles": "une position plausible : les bornes du contrat, INCLUSES"})
campagne.cible("T-9. La boîte des points prend le mauvais extrême", TUILES,
               "south = Math.min(south, point.lat);", "south = Math.min(north, point.lat);",
               {"tuiles": "la boîte des points : `null` sans point, le point lui-même s'il est seul, les extrêmes sinon"})

# ── les points et la salle choisie ───────────────────────────────────────────────────────────────────────────────────
T_CHOISIR = "⛔ choisir un point ouvre SA carte : nom, capacité, prix DU SERVEUR mis en forme, lien vers SA fiche"
T_ARABE = "en arabe : les points portent le nom ARABE, et la carte sait que la page se lit de droite à gauche"
campagne.cible("P-1. Le compte affiché est le total des filtres, pas le nombre de points", POINTS,
               't("count", { count: points.length })', 't("count", { count: response.total })',
               {"points": "le nombre de salles sur la carte est celui des points"})
campagne.cible("P-2. La phrase « sans position » s'affiche même à zéro", POINTS,
               "{response.withoutCoordinates > 0 ? (", "{response.withoutCoordinates >= 0 ? (",
               {"points": "⛔ les salles SANS position sont comptées et dites ; à zéro, la phrase n'existe pas"})
campagne.cible("P-3. ⛔ Les salles sans position ne sont plus dites", POINTS,
               "{response.withoutCoordinates > 0 ? (", "{response.withoutCoordinates > Infinity ? (",
               {"points": "⛔ les salles SANS position sont comptées et dites ; à zéro, la phrase n'existe pas"})
campagne.cible("P-4. ⛔ La troncature ne se dit plus", POINTS,
               "{response.truncated === true ? ", "{response.truncated === null ? ",
               {"points": "⛔ une carte TRONQUÉE le dit, avec le plafond ; non tronquée, elle ne dit rien"})
campagne.cible("P-5. Une carte non tronquée annonce une troncature", POINTS,
               "{response.truncated === true ? ", "{response.limit > 0 ? ",
               {"points": "⛔ une carte TRONQUÉE le dit, avec le plafond ; non tronquée, elle ne dit rien"})
campagne.cible("P-6. Sans aucun point, la carte (et son fond) est chargée quand même", POINTS,
               "{points.length === 0 ? (", "{points.length < 0 ? (",
               {"points": "⛔ AUCUN point : c'est dit, et la carte n'est PAS chargée (aucun fond de carte demandé pour ne rien montrer)"})
campagne.cible("P-7. ⛔ R-4 : le prix est RECALCULÉ dans le navigateur (arrondi)", POINTS,
               "{formatDZD(selected.basePriceCents, lang)}", "{formatDZD(Math.round(selected.basePriceCents / 1_000_000) * 1_000_000, lang)}",
               {"points": T_CHOISIR})
campagne.cible("P-8. Le lien de la carte de salle mène à une autre adresse", POINTS,
               "href={venuePath(selected.slug)}", "href={venuePath(selected.id)}", {"points": T_CHOISIR})
campagne.cible("P-9. Le point choisi n'est pas marqué sur la carte", POINTS,
               "selectedId={selectedId}", "selectedId={null}", {"points": T_CHOISIR})
campagne.cible("P-10. Les points portent le nom français dans une page arabe", POINTS,
               "label: nameOf(point) }", "label: point.nameFr }", {"points": T_ARABE})
campagne.cible("P-11. La carte ne sait pas que la page se lit de droite à gauche", POINTS,
               "rtl={ar}", "rtl={false}", {"points": T_ARABE})
campagne.cible("P-12. Latitude et longitude sont interverties", POINTS,
               "lat: point.lat, lng: point.lng,", "lat: point.lng, lng: point.lat,",
               {"points": "UN point par salle de la réponse, à SA position et sous SON nom"})
campagne.cible("P-13. « Fermer » ne ferme rien", POINTS,
               "onClick={() => setSelectedId(null)}", "onClick={() => undefined}",
               {"points": "« Fermer » retire la carte de salle et démarque le point"})

# ── le cadre (`@zwadj/ui`) ───────────────────────────────────────────────────────────────────────────────────────────
campagne.cible("U-1. ⛔ Une tuile en échec ne se dit plus", CADRE,
               "onTilesError={() => setTuilesEnEchec(true)}", "onTilesError={() => undefined}",
               {"points": "⛔ une tuile en échec : un MESSAGE, et la carte comme ses points restent là"})
campagne.cible("U-2. ⛔ La bibliothèque qui ne se charge pas laisse un écran d'attente sans fin", CADRE,
               'if (!annule) setChargement({ etat: "echec" });', 'if (!annule) setChargement({ etat: "attente" });',
               {"points": "⛔ la bibliothèque de carte ne se charge pas : un message, pas un écran vide"})
campagne.cible("U-3. La mention d'attribution perd son lien de licence", CADRE,
               "<a href={tiles.attributionUrl} ", '<a href="#" ',
               {"points": "le fond de carte reçu est celui qu'on lui passe, et sa mention est AFFICHÉE, avec son lien"})

# ── le chargeur ──────────────────────────────────────────────────────────────────────────────────────────────────────
T_PANNE = "⛔ la route de points ne répond pas : un message et « Réessayer » — ni page blanche, ni « aucune salle »"
campagne.cible("L-1. ⛔ Sans fond de carte, les points sont demandés quand même", CHARGEUR,
               "    if (sansFond) return;\n", "",
               {"chargeur": "⛔ production sans fond de carte : « carte indisponible », et AUCUNE requête de points n'est lancée"})
campagne.cible("L-2. ⛔ Une PANNE de la route de points se présente comme « aucune salle »", CHARGEUR,
               "if (!annule) setEtat(issue);",
               'if (!annule) setEtat(issue.kind === "ok" ? issue : { kind: "ok", data: { points: [], total: 0, withoutCoordinates: 0, truncated: false, limit: 0, availableOn: null } });',
               {"chargeur": T_PANNE})
campagne.cible("L-3. ⛔ Une réponse ancienne écrase la nouvelle", CHARGEUR,
               "if (!annule) setEtat(issue);", "if (annule || !annule) setEtat(issue);",
               {"chargeur": "⛔ une réponse ANCIENNE arrivée après la nouvelle ne l'écrase pas"})
campagne.cible("L-4. Les points sont demandés sans les filtres", CHARGEUR,
               "void load(new URLSearchParams(query), controller.signal)", "void load(new URLSearchParams(), controller.signal)",
               {"chargeur": "demande les points de LA requête reçue, puis rend la carte"})
campagne.cible("L-5. Un changement de filtres ne recharge pas les points", CHARGEUR,
               "}, [query, essai, sansFond, load]);", "}, [essai, sansFond, load]);",
               {"chargeur": "quand la requête change (l'assistant a poussé une adresse), les points sont REDEMANDÉS pour la nouvelle"})
campagne.cible("L-6. « Réessayer » ne relance rien", CHARGEUR,
               "onClick={() => setEssai((n) => n + 1)}", "onClick={() => undefined}", {"chargeur": T_PANNE})

# ── la vue de recherche (R-9) ────────────────────────────────────────────────────────────────────────────────────────
MONTAGE = "<VenueMapLoader query={toMapQuery(state).toString()} ar={ar} />"
campagne.cible("V-1. ⛔ R-9 : la carte est montée dès l'arrivée sur la page, sans geste", VUE,
               'useState<ResultView>("grid")', 'useState<ResultView>("map")',
               {"vue": "⛔ la grille est l'affichage par DÉFAUT, et AUCUNE carte n'est montée avant le geste (R-9)"})
campagne.cible("V-2. La carte reçoit l'adresse publique (dinars, page) au lieu de la requête des points", VUE,
               MONTAGE, "<VenueMapLoader query={toPublicQuery(state)} ar={ar} />",
               {"vue": "⛔ le geste « Carte » monte la carte sur les filtres COURANTS, sans la page ni sa taille ; la grille cède la place"})
campagne.cible("V-3. ⛔ Le refus de date ne passe plus avant la carte", VUE,
               "{refus !== null ? (", '{refus !== null && view !== "map" ? (',
               {"vue": "⛔ un REFUS de date passe AVANT la carte : la vue « carte » dit le refus, elle ne charge rien"})
campagne.cible("V-4. La carte ne reçoit pas le sens d'écriture de la page", VUE,
               MONTAGE, "<VenueMapLoader query={toMapQuery(state).toString()} ar={false} />",
               {"vue": "en arabe, la carte reçoit le sens d'écriture de la page"})

# ── la requête des points, l'accès à la route ────────────────────────────────────────────────────────────────────────
campagne.cible("Q-1. La page reste dans la requête de la carte", REQUETE,
               '  query.delete("page");\n', "",
               {"requete": "changer de PAGE ne change pas la requête de la carte (elle ne se recharge pas pour rien)"})
campagne.cible("Q-2. ⛔ LA DIVERGENCE : un filtre de la liste manque à la carte", REQUETE,
               '  query.delete("pageSize");\n', '  query.delete("pageSize");\n  query.delete("amenities");\n',
               {"requete": "⛔ les MÊMES filtres que la requête de la liste — tout ce que `toApiQuery` envoie, moins la page et sa taille"},
               genre="insertion")
campagne.cible("A-1. Les points sont demandés à la route de la liste", API,
               "/api/v1/venue-map${suffixe", "/api/v1/venues${suffixe",
               {"api": "200 : `ok`, avec le corps tel quel, demandé à la route de carte avec LA requête reçue"})
campagne.cible("A-2. ⛔ Une réponse abîmée devient une carte vide", API,
               "!Array.isArray(data.points)", "data.points === undefined",
               {"api": "⛔ 200 dont `points` n'est pas un tableau ⇒ `unreachable`, pas une carte vide"})
campagne.cible("A-3. Sans filtre, l'adresse porte un « ? » orphelin", API,
               '${suffixe === "" ? "" : `?${suffixe}`}', '${"?" + suffixe}', {"api": "sans filtre : aucun « ? » orphelin"})

# ── la garde de source des imports (R-1) ─────────────────────────────────────────────────────────────────────────────
campagne.cible("G-1. ⛔ Le cadre importe le canevas STATIQUEMENT (Leaflet retombe dans le paquet initial)", CADRE,
               'import type { LeafletCanvasProps, MapMarker } from "./leaflet-canvas";',
               'import { type LeafletCanvasProps, type MapMarker } from "./leaflet-canvas";',
               {"garde": "⛔ le canevas n'est chargé que par `import()`, et seulement depuis le cadre ; ailleurs, au plus ses TYPES"})
campagne.cible("G-2. ⛔ Un second fichier importe Leaflet", TUILES,
               "export interface MapTiles {", 'import "leaflet";\nexport interface MapTiles {',
               {"garde": "⛔ UN SEUL fichier importe Leaflet, et il existe (la garde a PARCOURU de vrais fichiers)"},
               genre="insertion")

if __name__ == "__main__":
    sys.exit(campagne.jouer(sys.argv[1:]))
