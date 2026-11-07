#!/usr/bin/env python3
"""Campagne de neutralisation — FC-8 (session `front-client`) : le lot ③, l'assistant est un MODE de `/salles` (D229 à D231).

Ce que le lot ajoute, et que chaque cible neutralise :
  · les règles PURES (`search-query.ts`, `seo.ts`) — une valeur inconnue de `guide` qui OUVRIRAIT le panneau (G-1, D230), l'étape
    suivante qui retombe sur la commune (G-2 : la boucle sans fin de l'assistant d'avant), `guide` qui cesse d'être une variante
    (G-3) ;
  · l'assistant réécrit, sans état local (`filter-wizard.tsx`) — une réponse qui n'entre pas dans l'URL (G-4), une coche qui ferme
    le panneau (G-5), « Voir les salles » qui ne le ferme plus (G-6), la boîte qui se dit MODALE sans l'être : Échap ne ferme rien,
    Tab en sort (G-12, le seul piège de focus du dépôt débranché) ;
  · ⛔ CE QUE SEUL UN NAVIGATEUR VOIT (D205) — le panneau rendu par le SERVEUR, qui recouvrirait sans répondre la page d'un
    visiteur sans JavaScript (G-7), la page `/salles` qui ne passe plus `guide` (G-8) : jouées avec `--e2e` ;
  · l'accueil (D231) — le champ `guide` dans le HTML du serveur (G-9 : sans JavaScript, le formulaire soumettrait autre chose que
    ses trois champs), l'étape suivante non calculée (G-10), l'entrée « Li hwas lqa » qui n'ouvre plus l'assistant (G-11).
Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-fc8.py           # cibles unitaires ; les cibles e2e s'impriment « NON MESURÉES », sortie 3
    python3 neutralisation/neutralize-fc8.py --e2e     # + les cibles e2e (serveurs de dev sur 3100/3101/5273, base zwadj_e2e)
    FC8_DECOUVERTE=1 python3 neutralisation/neutralize-fc8.py --e2e
Lecteurs, calibration, preuve de pose et restauration : `neutralisation/socle_front_client.py`.
"""
import sys

sys.path.insert(0, "neutralisation")
import socle_front_client as socle  # noqa: E402

socle.exiger_racine(__file__)

REQUETE = "apps/client/src/lib/search-query.ts"
SEO = "apps/client/src/lib/seo.ts"
ASSISTANT = "apps/client/src/components/filter-wizard.tsx"
VUE = "apps/client/src/components/search/search-view.tsx"
PAGE = "apps/client/src/app/[locale]/salles/(recherche)/page.tsx"
ACCUEIL = "apps/client/src/components/home-view.tsx"

campagne = socle.Campagne("fc8", {
    "pures": socle.vitest("@zwadj/client", "src/lib/search-query.test.ts"),
    "seo": socle.vitest("@zwadj/client", "src/lib/seo.test.ts"),
    "assistant": socle.vitest("@zwadj/client", "src/components/filter-wizard.test.tsx"),
    "accueil": socle.vitest("@zwadj/client", "src/app/[locale]/page.test.tsx"),
    "navigateur": socle.playwright("specs/fc8-mode-guide.e2e.ts"),
})

PARCOURS = "fr — `/salles?guide=guests` ouvre l'assistant par-dessus les résultats ; chaque réponse pousse l'URL ; « Voir les salles » le ferme"
SANS_JS = "fr — sans JavaScript, le HTML servi de `/salles?guide=city` ne porte AUCUN panneau, et porte le formulaire de recherche"

campagne.cible("G-1. ⛔ une valeur INCONNUE de `guide` ouvre le panneau (sur la commune)", REQUETE,
               "includes(valeur) ? (valeur as GuideStep) : null;", 'includes(valeur) ? (valeur as GuideStep) : "city";',
               {"pures": "une étape connue s'ouvre ; ⛔ toute AUTRE valeur ferme le panneau (l'ouvrir ferait croire qu'elle a été comprise)"})
campagne.cible("G-2. ⛔ l'étape suivante retombe sur la commune : qui passe tout tourne en rond", REQUETE,
               "  const depuis = apres === undefined ? 0 : GUIDE_STEPS.indexOf(apres) + 1;", "  const depuis = 0;",
               {"pures": "l'étape suivante est la première SANS réponse APRÈS celle qu'on quitte — sinon la dernière (on n'y retombe pas en boucle)",
                "assistant": "⚠ « Passer » avance SANS réponse, et la séquence se TERMINE : on ne retombe jamais sur la commune"})
campagne.cible("G-3. `guide` cesse d'être une variante : le mode guidé se fait indexer", SEO,
               '  "guide"\n', "",
               {"seo": "`guide` est dans la liste, et une page qui le porte n'est pas indexable"})
campagne.cible("G-4. la commune choisie n'entre pas dans l'URL (une réponse jetée)", ASSISTANT,
               'onClick={() => repondre({ ...state, cityId: villeRef.current?.value ?? "" })}', "onClick={() => repondre({ ...state })}",
               {"assistant": "répondre à la commune pousse `/salles?cityId=…&guide=guests` (D229, mot pour mot)"})
campagne.cible("G-5. une coche FERME le panneau (elle quitte l'étape)", ASSISTANT,
               "router.replace(`${SEARCH_PATH}${guidedSearchQuery(suivant, step)}`)", "router.replace(`${SEARCH_PATH}${guidedSearchQuery(suivant, null)}`)",
               {"assistant": "⚠ construit l'URL avec les noms et l'encodage que `/salles` LIT"})
campagne.cible("G-6. « Voir les salles » ne ferme plus le panneau", ASSISTANT,
               'onClick={() => aller(state, null)}>\n                  {t("see")}', 'onClick={() => aller(state, "taste")}>\n                  {t("see")}',
               {"assistant": "⚠ construit l'URL avec les noms et l'encodage que `/salles` LIT",
                "assistant#2": "sans aucun critère, « Voir les salles » mène à /salles nu"})
campagne.cible("G-12. ⛔ la boîte se dit MODALE et n'en a plus le comportement : Échap ne ferme rien, Tab en sort", ASSISTANT,
               "useDismissLayer({ open: true, panelRef: boiteRef,", "useDismissLayer({ open: false, panelRef: boiteRef,",
               {"assistant": "⛔ Échap FERME l'assistant", "assistant#2": "⛔ Tab reste DANS le panneau"})
campagne.cible("G-7. ⛔ le panneau est rendu par le SERVEUR : sans JavaScript, il recouvrirait la page sans répondre", VUE,
               "{monte && guide !== null ? (", "{guide !== null ? (",
               {"navigateur": [SANS_JS]})
campagne.cible("G-8. ⛔ la page `/salles` ne passe plus `guide` (le composant serveur, invisible aux tests unitaires)", PAGE,
               "      guide={guide}\n", "",
               {"navigateur": [PARCOURS]})
campagne.cible("G-9. le champ `guide` est dans le HTML du SERVEUR : sans JavaScript, l'accueil soumet autre chose que ses trois champs", ACCUEIL,
               # ⚠ `avecJs` → `true`, et non le retrait du ternaire : un remplacement SOUS-CHAÎNE de son ancre ne se prouve pas posé (D325).
               "{avecJs ? <input ref={etapeRef}", "{true ? <input ref={etapeRef}",
               {"accueil": "sans JavaScript, le formulaire soumet la commune, les invités et le budget — et rien d'autre"})
campagne.cible("G-10. l'accueil n'avance pas : l'étape suivante n'est pas calculée", ACCUEIL,
               "etapeRef.current.value = nextGuideStep(etat);", 'etapeRef.current.value = "city";',
               {"accueil": "⚠ avec JavaScript, le même formulaire devient l'ÉTAPE 1 : il porte l'étape SUIVANTE de l'assistant (`guide`)"})
campagne.cible("G-11. « Li hwas lqa » n'ouvre plus l'assistant", ACCUEIL,
               'guidedSearchQuery(parseSearchParams({}), "city")', "guidedSearchQuery(parseSearchParams({}), null)",
               {"accueil": "le libellé est celui que D229 décide, et le lien ouvre l'assistant à sa première étape"})

if __name__ == "__main__":
    sys.exit(campagne.jouer(sys.argv[1:]))
