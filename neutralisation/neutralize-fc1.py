#!/usr/bin/env python3
"""Campagne de neutralisation — FC-1 (session `front-client`) : le contraste des quatre textes en accent.

Ce que le lot ajoute, et que chaque cible neutralise :
  · `.filters-reset`, `.range-value`, `.results-count-n`, `.wz-eyebrow` posent leur texte en `var(--accent-text)` (D264) au lieu de
    `var(--accent)` — garde : `apps/client/src/app/theme-contrast.test.ts` (unitaire, résout les tokens des deux feuilles et exige
    4,5:1 sur chaque fond neutre des deux thèmes) — cibles C-1 à C-4 ;
  · la référence a11y de B8 ne TOLÈRE plus `.filters-reset` ni `.range-value` sur « client recherche de salles » — garde :
    `e2e/specs/b8-accessibility.e2e.ts` (axe-core dans un vrai navigateur) — cibles E-1 et E-2, jouées avec `--e2e`.
Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-fc1.py           # cibles unitaires ; les cibles e2e s'impriment « NON MESURÉE », sortie 3
    python3 neutralisation/neutralize-fc1.py --e2e     # toutes les cibles (serveurs de dev sur 3100/3101/5273, base zwadj_e2e)
    FC1_DECOUVERTE=1 python3 neutralisation/neutralize-fc1.py [--e2e]   # aucun verdict : liste ce qui rougit, par cible
Lecteurs, calibration, preuve de pose et restauration : `neutralisation/socle_front_client.py` (calibré à chaque lancement).
CE QUE CETTE CAMPAGNE NE MESURE PAS (écrit, pas tu) : `.results-count-n` et `.wz-eyebrow` ne sont vus par AUCUN écran de B8 (le
compteur n'apparaît qu'avec au moins une salle, l'assistant n'est pas dans la liste de B8) — leur seule garde est l'unitaire.
"""
import os
import sys

sys.path.insert(0, "neutralisation")
import socle_front_client as socle  # noqa: E402

socle.exiger_racine(__file__)

THEME = "apps/client/src/app/theme.css"
TEST_CONTRASTE = "src/app/theme-contrast.test.ts"

campagne = socle.Campagne("fc1", {
    "contraste": socle.vitest("@zwadj/client", TEST_CONTRASTE),
    "b8-recherche": socle.playwright("specs/b8-accessibility.e2e.ts", "client recherche de salles"),
})

# Les titres, relevés par FC1_DECOUVERTE=1 (jamais écrits de mémoire).
T_CLAIR = "— clair : son texte passe AA (≥ 4,5:1) sur --bg, --surface et --bg-2"
T_B8 = ["client recherche de salles : aucune NOUVELLE violation"]

# ── C — chaque texte, ramené à `var(--accent)` : l'unitaire du thème CLAIR doit rougir (en sombre, `--accent` vaut déjà
#    l'accent sombre, lisible : la cible ne vise que le clair, et c'est écrit).
campagne.cible("C-1. `.filters-reset` repasse en `var(--accent)`", THEME,
               "à 4,16:1 (D264). */\n  color: var(--accent-text);",
               "à 4,16:1 (D264). */\n  color: var(--accent);",
               {"contraste": f".filters-reset {T_CLAIR}"})
campagne.cible("C-2. `.range-value` repasse en `var(--accent)`", THEME,
               "même mesure. */\n  color: var(--accent-text);",
               "même mesure. */\n  color: var(--accent);",
               {"contraste": f".range-value {T_CLAIR}"})
campagne.cible("C-3. `.results-count-n` repasse en `var(--accent)`", THEME,
               ".results-count-n {\n  color: var(--accent-text);",
               ".results-count-n {\n  color: var(--accent);",
               {"contraste": f".results-count-n {T_CLAIR}"})
campagne.cible("C-4. `.wz-eyebrow` repasse en `var(--accent)`", THEME,
               "l'ornement suit (`currentColor`). */\n  color: var(--accent-text);",
               "l'ornement suit (`currentColor`). */\n  color: var(--accent);",
               {"contraste": f".wz-eyebrow {T_CLAIR}"})

# ── E — la référence a11y ne tolère plus ces deux textes : ramenés à `var(--accent)`, B8 voit une NOUVELLE violation.
campagne.cible("E-1. `.filters-reset` repasse en `var(--accent)` : B8 « client recherche de salles » rougit", THEME,
               "à 4,16:1 (D264). */\n  color: var(--accent-text);",
               "à 4,16:1 (D264). */\n  color: var(--accent);",
               {"b8-recherche": T_B8})
campagne.cible("E-2. `.range-value` repasse en `var(--accent)` : B8 « client recherche de salles » rougit", THEME,
               "même mesure. */\n  color: var(--accent-text);",
               "même mesure. */\n  color: var(--accent);",
               {"b8-recherche": T_B8})

if __name__ == "__main__":
    sys.exit(campagne.jouer(sys.argv[1:]))
