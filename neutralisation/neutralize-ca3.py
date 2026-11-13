#!/usr/bin/env python3
"""Campagne de neutralisation — CA-3 (session parallèle « carte ») : la carte de l'accueil.

Ce que le lot ajoute, et que chaque cible neutralise :
  · N-n  `apps/client/src/components/map/near-viewport-map.tsx` — la carte ne se monte qu'à l'APPROCHE de l'écran (R-9) ;
  · H-n  `apps/client/src/components/home-view.tsx` — la section `hm-map` pose cette carte, avec un lien vers la recherche.
Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-ca3.py
    CA3_DECOUVERTE=1 python3 neutralisation/neutralize-ca3.py
Lecteurs, calibration, preuve de pose et restauration : `neutralisation/socle_front_client.py` (module partagé, D305).
⚠ La vraie carte et le vrai défilement sont mesurés dans un navigateur : `e2e/specs/ca6-carte.e2e.ts` (lot CA-6). Ici
l'observateur d'intersection est un double que le test commande (jsdom n'a ni mise en page ni `IntersectionObserver`).
"""
import sys

sys.path.insert(0, "neutralisation")
import socle_front_client as socle  # noqa: E402

socle.exiger_racine(__file__)

APPROCHE = "apps/client/src/components/map/near-viewport-map.tsx"
ACCUEIL = "apps/client/src/components/home-view.tsx"

campagne = socle.Campagne("ca3", {
    "approche": socle.vitest("@zwadj/client", "src/components/map/near-viewport-map.test.tsx"),
    "accueil": socle.vitest("@zwadj/client", "src/app/[locale]/page.test.tsx"),
})

T_RIEN = "⛔ au chargement de la page : RIEN n'est demandé — ni points, ni carte (R-9)"
T_APPROCHE = ("⛔ quand la section approche : les points de TOUTES les salles publiques sont demandés, la carte se monte, et "
              "l'observateur est débranché")
T_ACCUEIL = "⛔ CA-3 — la section carte : au chargement la carte n'est PAS montée (R-9), et un lien mène à la recherche"

campagne.cible("N-1. ⛔ R-9 : la carte de l'accueil est montée dès le chargement de la page", APPROCHE,
               'setEtat("observe");', 'setEtat("montee");', {"approche": T_RIEN})
campagne.cible("N-2. Un signal « hors de la marge » monte la carte", APPROCHE,
               "if (entries.some((entry) => entry.isIntersecting)) {", "if (entries.some((entry) => entry.isIntersecting || true)) {",
               {"approche": "un signal « hors de la marge » ne monte rien"})
campagne.cible("N-3. L'approche de l'écran ne monte rien", APPROCHE,
               '          observer.disconnect();\n          setEtat("montee");', '          observer.disconnect();\n          setEtat("observe");',
               {"approche": T_APPROCHE})
campagne.cible("N-4. L'observateur reste branché après le montage", APPROCHE,
               '          observer.disconnect();\n          setEtat("montee");', '          void observer;\n          setEtat("montee");',
               {"approche": T_APPROCHE})
campagne.cible("N-5. La marge d'approche n'est plus celle qui est déclarée", APPROCHE,
               "{ rootMargin: NEAR_VIEWPORT_MARGIN }", '{ rootMargin: "0px" }',
               {"approche": "la section est observée, avec la marge déclarée"})
campagne.cible("N-6. Sans `IntersectionObserver`, la carte se charge seule", APPROCHE,
               '      setEtat("geste");\n      return;', '      setEtat("montee");\n      return;',
               {"approche": "navigateur sans `IntersectionObserver` : rien n'est chargé seul, un BOUTON monte la carte"})
campagne.cible("N-7. Le bouton « Afficher la carte » ne monte rien", APPROCHE,
               'onClick={() => setEtat("montee")}', "onClick={() => undefined}",
               {"approche": "le bouton « Afficher la carte » la monte sans attendre le défilement"})
campagne.cible("N-8. ⛔ Sans fond de carte, la section observe et propose un bouton", APPROCHE,
               'if (sansFond || etat === "montee") {', 'if (etat === "montee") {',
               {"approche": "⛔ pas de fond de carte : « carte indisponible » tout de suite, rien n'est observé ni demandé"})
campagne.cible("N-9. La carte de l'accueil reçoit une autre requête que celle qu'on lui passe", APPROCHE,
               "<VenueMapLoader query={query} ", '<VenueMapLoader query="guests=1" ', {"approche": T_APPROCHE})

campagne.cible("H-1. ⛔ L'accueil ne pose plus la carte dans sa section", ACCUEIL,
               '        <NearViewportMap query="" ar={ar} headingLevel={3} />\n', "", {"accueil": T_ACCUEIL})
campagne.cible("H-2. La carte de l'accueil est filtrée (elle ne montre plus toutes les salles publiques)", ACCUEIL,
               '<NearViewportMap query="" ar={ar}', '<NearViewportMap query="sort=price_asc" ar={ar}', {"accueil": T_ACCUEIL})
campagne.cible("H-3. Le lien de la section carte ne mène plus à la recherche", ACCUEIL,
               '          <Link href={SEARCH_PATH} className="hm-btn">\n            {tMap("home.search")}',
               '          <Link href="/" className="hm-btn">\n            {tMap("home.search")}', {"accueil": T_ACCUEIL})

if __name__ == "__main__":
    sys.exit(campagne.jouer(sys.argv[1:]))
