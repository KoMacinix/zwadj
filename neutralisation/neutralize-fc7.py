#!/usr/bin/env python3
"""Campagne de neutralisation — FC-7 (session `front-client`) : le repli `maxPriceCents` est RETIRÉ, et le reste.

Ce que le lot ajoute : la garde qui exige que l'ancien nom n'ait PLUS D'EFFET (`search-query.test.ts`, bloc « ⛔ D228 (FC-7) »).
Le test qui exigeait le repli est devenu cette garde ; ses cibles d'origine (`neutralize-maxprice.py` M5 à M7) visaient le code
retiré et sont RETIRÉES par écrit dans ce harnais-là.
  · P-1. ⛔ le repli REVIENT : un `?maxPriceCents=` repose un plafond (la régression que la garde existe pour voir) ;
  · P-2. le repli revient « à moitié » : seulement quand `maxPrice` est absent — la forme qu'aurait une restauration fidèle.
Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-fc7.py
    FC7_DECOUVERTE=1 python3 neutralisation/neutralize-fc7.py
Lecteurs, calibration, preuve de pose et restauration : `neutralisation/socle_front_client.py`.
"""
import sys

sys.path.insert(0, "neutralisation")
import socle_front_client as socle  # noqa: E402

socle.exiger_racine(__file__)

MODULE = "apps/client/src/lib/search-query.ts"
ANCRE = "    atCeiling(positiveInteger(first(raw.maxPrice)), BUDGET_CEILING)"

campagne = socle.Campagne("fc7", {"module": socle.vitest("@zwadj/client", "src/lib/search-query.test.ts")})

GARDE = "un lien qui porte `maxPriceCents` n'a AUCUN plafond, et l'API n'en reçoit aucun"

campagne.cible("P-1. ⛔ le repli REVIENT : un `?maxPriceCents=` repose un plafond", MODULE, ANCRE,
               "    atCeiling(positiveInteger(first(raw.maxPrice) || String(Number(first(raw.maxPriceCents)) / 100)), BUDGET_CEILING)",
               {"module": GARDE})
campagne.cible("P-2. le repli revient À MOITIÉ : seulement quand `maxPrice` est absent", MODULE, ANCRE,
               "    atCeiling(positiveInteger(raw.maxPrice === undefined ? String(Number(first(raw.maxPriceCents)) / 100) : first(raw.maxPrice)), BUDGET_CEILING)",
               {"module": GARDE})

if __name__ == "__main__":
    sys.exit(campagne.jouer(sys.argv[1:]))
