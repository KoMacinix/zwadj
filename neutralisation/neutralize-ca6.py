#!/usr/bin/env python3
"""Campagne de neutralisation — CA-6 (session parallèle « carte ») : la spec navigateur `e2e/specs/ca6-carte.e2e.ts`.

Ce que le lot ajoute : la spec qui monte la VRAIE carte (Leaflet) dans un navigateur, et deux réparations qu'elle a
imposées (un point répond au clavier ; la carte de l'accueil ne se monte pas à la seule ouverture d'une page courte).
Chaque cible restaure un défaut dans le CODE DE L'APPLICATION et exige que le test navigateur qui le garde rougisse :
c'est la seule preuve que la spec regarde le produit et pas ses propres doubles.
Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-ca6.py            # toutes les cibles sont e2e : NON MESURÉES, sortie 3
    python3 neutralisation/neutralize-ca6.py --e2e      # serveurs de développement, base zwadj_e2e, Chromium
    CA6_DECOUVERTE=1 python3 neutralisation/neutralize-ca6.py --e2e
Lecteurs, calibration, preuve de pose et restauration : `neutralisation/socle_front_client.py` (Playwright 1.50.1,
rapporteur `list` ; une assertion web-first expirée est une morsure si son bloc montre `expect(` — D323).
⚠ Chaque mesure ne joue QUE le test visé (`--grep`) : les serveurs démarrent à chaque cible.
⛔ Aucun serveur de tuiles réel n'est appelé : la spec intercepte tout ce qui sort de la pile locale.
"""
import sys

sys.path.insert(0, "neutralisation")
import socle_front_client as socle  # noqa: E402

socle.exiger_racine(__file__)

SPEC = "specs/ca6-carte.e2e.ts"
CANEVAS = "packages/ui/src/map/leaflet-canvas.tsx"
TUILES = "packages/ui/src/map/map-tiles.ts"
APPROCHE = "apps/client/src/components/map/near-viewport-map.tsx"
CHARGEUR = "apps/client/src/components/map/venue-map-loader.tsx"
VUE = "apps/client/src/components/search/search-view.tsx"
FICHE = "apps/client/src/components/venue/venue-location-map.tsx"
FORMULAIRE = "apps/pro/src/venues/venue-form.tsx"

T_FR = "CA-6 — fr, recherche"
T_AR = "CA-6 — ar, recherche"
T_TUILES = "CA-6 — panne des TUILES"
T_POINTS = "CA-6 — panne de la ROUTE DE POINTS"
T_ACCUEIL = "CA-6 — accueil"
T_FICHE = "CA-6 — fiche"
T_PRO = "CA-6 — pro"

campagne = socle.Campagne("ca6", {
    "recherche": socle.playwright(SPEC, "recherche"),
    "tuiles": socle.playwright(SPEC, "panne des TUILES"),
    "points": socle.playwright(SPEC, "panne de la ROUTE"),
    "accueil": socle.playwright(SPEC, "accueil"),
    "fiche": socle.playwright(SPEC, "fiche"),
    "pro": socle.playwright(SPEC, "pro :"),
})

campagne.cible("E-1. ⛔ LE DÉFAUT RESTAURÉ : un point de la carte ne répond plus au clavier", CANEVAS,
               'if (event.key !== "Enter" && event.key !== " ") return;', 'if (event.key !== "F24") return;',
               {"recherche": [T_FR, T_AR]})
campagne.cible("E-2. ⛔ R-9 : la carte de la recherche est montée dès l'arrivée sur la page", VUE,
               'useState<ResultView>("grid")', 'useState<ResultView>("map")', {"recherche": [T_FR, T_AR]})
campagne.cible("E-3. Un point n'a plus de nom accessible", CANEVAS,
               '          element.setAttribute("aria-label", point.label);\n          element.setAttribute("aria-pressed"',
               '          element.setAttribute("aria-label", "");\n          element.setAttribute("aria-pressed"', {"recherche": [T_FR, T_AR]})
campagne.cible("E-4. ⛔ Une tuile en échec n'est plus signalée", CANEVAS,
               "      onTilesErrorRef.current?.();\n", "", {"tuiles": [T_TUILES]})
campagne.cible("E-5. ⛔ Une panne de la route de points se présente comme « aucune salle »", CHARGEUR,
               "if (!annule) setEtat(issue);",
               'if (!annule) setEtat(issue.kind === "ok" ? issue : { kind: "ok", data: { points: [], total: 0, withoutCoordinates: 0, truncated: false, limit: 0, availableOn: null } });',
               {"points": [T_POINTS]})
campagne.cible("E-6. ⛔ LE DÉFAUT RESTAURÉ : la carte de l'accueil se monte à l'ouverture d'une page courte", APPROCHE,
               "if (!proche || !defile) return;", "if (!proche) return;", {"accueil": [T_ACCUEIL]})
campagne.cible("E-7. ⛔ R-9 : la carte de la fiche est montée dès l'ouverture", FICHE,
               "const [montee, setMontee] = useState(false);", "const [montee, setMontee] = useState(true);", {"fiche": [T_FICHE]})
campagne.cible("E-8. ⛔ Poser le point n'écrit que la latitude", FORMULAIRE,
               "onPick={(p) => onChange({ lat: String(p.lat), lng: String(p.lng) })}", "onPick={(p) => onChange({ lat: String(p.lat) })}",
               {"pro": [T_PRO]})
campagne.cible("E-9. La position posée n'est plus arrondie à six décimales", TUILES,
               "return Math.round(value * factor) / factor;", "return value + factor * 0;", {"pro": [T_PRO]})

if __name__ == "__main__":
    sys.exit(campagne.jouer(sys.argv[1:]))
