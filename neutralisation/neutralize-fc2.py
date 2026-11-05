#!/usr/bin/env python3
"""Campagne de neutralisation — FC-2 (session `front-client`) : à 360 px, la page ne déborde pas.

Ce que le lot ajoute, et que chaque cible neutralise :
  · la barre de session de l'en-tête du CLIENT passe à la ligne (`.site-header--stacked .header-auth { flex-wrap: wrap }`) —
    garde : `e2e/specs/fc2-debordement-360.e2e.ts` (accueil, recherche, fiche ; FR et AR ; `scrollWidth` ≤ 360) — cible W-1,
    jouée avec `--e2e` (la seule mesure d'une mise en page est un vrai navigateur ; jsdom ne calcule aucune largeur).
Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-fc2.py           # aucune cible unitaire : la cible e2e s'imprime « NON MESURÉE », sortie 3
    python3 neutralisation/neutralize-fc2.py --e2e     # la cible e2e (serveurs de dev sur 3100/3101/5273, base zwadj_e2e)
    FC2_DECOUVERTE=1 python3 neutralisation/neutralize-fc2.py --e2e
Lecteurs, calibration, preuve de pose et restauration : `neutralisation/socle_front_client.py`.
CE QUE CETTE CAMPAGNE NE MESURE PAS : `justify-content: flex-end` et `row-gap` (l'alignement et l'écart, vus à l'œil sur deux
captures non versées, voir le rapport) ; une mutation qui les retire laisse la page dans la fenêtre — ce ne sont pas des gardes.
"""
import sys

sys.path.insert(0, "neutralisation")
import socle_front_client as socle  # noqa: E402

socle.exiger_racine(__file__)

THEME = "apps/client/src/app/theme.css"

campagne = socle.Campagne("fc2", {
    "debordement": socle.playwright("specs/fc2-debordement-360.e2e.ts"),
})

# Les titres, relevés sur la passe ROUGE de l'état d'avant (`docs/preuves/front-client/FC-2/rouges/rouge-e2e.txt`).
T_FR = [f"FC-2 — fr, {ecran} : à 360 px, la page tient dans la fenêtre" for ecran in ("accueil", "recherche", "fiche salle")]

campagne.cible("W-1. la barre de session ne passe plus à la ligne : le français redéborde", THEME,
               ".site-header--stacked .header-auth {\n  flex-wrap: wrap;",
               ".site-header--stacked .header-auth {\n  flex-wrap: nowrap;",
               {"debordement": T_FR})

if __name__ == "__main__":
    sys.exit(campagne.jouer(sys.argv[1:]))
