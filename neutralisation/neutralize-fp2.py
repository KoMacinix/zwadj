#!/usr/bin/env python3
"""Campagne de neutralisation — FP-2 (session `front-client`) : après le 409 de K-5, l'écran garde la copie du nom qui existe déjà.

Ce que le lot ajoute (`apps/pro/src/dashboard/walkin-journey.tsx`, `completerLeNom`), et que chaque cible neutralise — mesuré par
`walkin-journey.test.tsx` (le bloc « FP-2 ») :
  · A-1 le 409 ne relit plus rien (le défaut d'origine : le devis local reste sans la copie, la question se repose à l'infini) ;
  · A-2 N'IMPORTE QUEL refus de l'API relit la liste (seul le 409 de la copie déjà là le justifie) ;
  · A-3 le devis relu n'est plus cherché par son identifiant : la copie d'un AUTRE devis de la salle passe au devis courant ;
  · A-4 la relecture porte sur le mauvais identifiant (celui du devis, pas celui de la salle) ;
  · A-5 une relecture qui échoue vide le devis local (au lieu de le laisser tel quel) ;
  · A-6 l'écran remet de lui-même après la relecture (le pro n'a rien demandé, et rien n'a été relu par lui).
⚠ CE QUI N'A PAS DE CIBLE, ET POURQUOI — écrit plutôt que joué : retirer le `try/catch` de la relecture fait lever la promesse
(rejet non géré) : l'échec du test serait un PLANTAGE, qu'un lecteur strict ne compte pas comme une morsure (D304) — A-5 mesure la même
garde par une mutation qui échoue en assertion.
Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-fp2.py
    FP2_DECOUVERTE=1 python3 neutralisation/neutralize-fp2.py
Lecteurs, calibration, preuve de pose et restauration : `neutralisation/socle_front_client.py`.
"""
import sys

sys.path.insert(0, "neutralisation")
import socle_front_client as socle  # noqa: E402

socle.exiger_racine(__file__)

ECRAN = "apps/pro/src/dashboard/walkin-journey.tsx"

campagne = socle.Campagne("fp2", {"ecran": socle.vitest("@zwadj/pro", "src/dashboard/walkin-journey.test.tsx")})

T1 = "⛔ le 409 relit la liste des devis de LA SALLE"
T2 = "⛔ la copie du SERVEUR est gardée"
T3 = "⛔ le devis relu est cherché PAR SON IDENTIFIANT"
T4 = "une relecture qui ÉCHOUE ne change rien"
T5 = "⛔ un AUTRE refus (500) ne relit PAS la liste"

campagne.cible("A-1. ⛔ le 409 ne relit plus rien : le devis local reste sans la copie, la question du nom se repose à chaque remise", ECRAN,
               "if (cause instanceof ApiError && cause.code === QuoteErrorCode.QUOTE_CLIENT_NAME_ALREADY_SET) {", "if (false) {",
               {"ecran#1": T1, "ecran#2": T2})
campagne.cible("A-2. ⛔ N'IMPORTE QUEL refus de l'API relit la liste (un 500 n'est pas « la copie existe déjà »)", ECRAN,
               "if (cause instanceof ApiError && cause.code === QuoteErrorCode.QUOTE_CLIENT_NAME_ALREADY_SET) {", "if (cause instanceof ApiError) {",
               {"ecran": T5})
campagne.cible("A-3. ⛔ le devis relu n'est plus cherché par son identifiant : la copie d'un AUTRE devis passe au devis courant", ECRAN,
               ".find((ligne) => ligne.id === devis.id)", ".find((ligne) => ligne !== undefined)",
               {"ecran": T3})
campagne.cible("A-4. la relecture porte sur le mauvais identifiant : celui du devis au lieu de celui de la salle", ECRAN,
               "await quotes.listForVenue(venue.id)", "await quotes.listForVenue(devis.id)",
               {"ecran": T1})
campagne.cible("A-5. ⛔ une relecture qui échoue VIDE le devis local : la remise suivante ne sait plus de quel devis il s'agit", ECRAN,
               "/* la relecture est un confort : le refus reste dit, l'écran inchangé */", "setQuote(null);",
               {"ecran": T4})
campagne.cible("A-6. ⛔ l'écran REMET de lui-même après la relecture : le pro n'a rien demandé", ECRAN,
               "if (relu !== undefined) setQuote(relu);",
               "if (relu !== undefined) { setQuote(relu); remettreLeDevis(attente.canal, attente.locale, relu); }",
               {"ecran#1": T1, "ecran#2": T2})

if __name__ == "__main__":
    sys.exit(campagne.jouer(sys.argv[1:]))
