#!/usr/bin/env python3
"""Campagne de neutralisation — FP-3 (session `front-client`) : une révision reprend la copie du nom de la version courante.

Ce que le lot ajoute, et que chaque cible neutralise :
  la règle PURE `copiePourRevision` (`apps/pro/src/dashboard/walkin-client.ts`, mesurée par `walkin-revision.test.ts`) :
  · R-1 une AUTRE fiche que celle de la version reçoit la copie de l'ancien client ;
  · R-2 une fiche LIÉE reçoit un nom qu'elle n'a pas (le serveur le refuserait, 409 `CLIENT_RECORD_LINKED`) ;
  · R-3 et R-4 la version l'emporte sur le nom TAPÉ à l'écran (R-3 l'arabe, R-4 le latin) ;
  · R-5 et R-6 un nom absent de l'écran n'est plus repris de la version (R-5 l'arabe, R-6 le latin) ;
et son branchement dans l'ÉCRAN (`apps/pro/src/dashboard/walkin-journey.tsx`, mesuré par `walkin-journey.test.tsx`, bloc « FP-3 ») :
  · E-1 le corps de la révision ignore la règle (retour à `copiePourDevis`) ;
  · E-2 la version rendue n'est jamais gardée ; E-3 la version gardée est ÉCRASÉE par le devis jeté (`quote` redevient `null`) ;
  · E-4 la version gardée n'est plus liée à la chaîne en cours (après « Recommencer », la copie de l'ancien devis fuit sur un nouveau).
⚠ CE QUI N'A PAS DE CIBLE, ET POURQUOI — écrit plutôt que joué :
  (a) `version === null` : le retirer fait LEVER un `TypeError` à la première création (`version.clientRecordId` sur `null`) — un plantage, que
      le lecteur strict ne compte pas comme une morsure (D304) ; le cas « sans version » est tenu par un test qui n'a pas de mutation propre ;
  (b) le rognage de la copie reprise (`present`) : `copiePourDevis` rogne et écarte le vide à son tour — retirer `present` est une mutation
      ÉQUIVALENTE (D325), retirée par écrit ; les tests « BLANC compte pour absent » et « copie VIDE n'est pas reprise » gardent le comportement,
      ils ne mordent aucune mutation du code de ce lot ;
  (c) les DEUX gardes de lien à la chaîne (`chainQuoteId !== null` et l'égalité des identifiants) : chacune seule est ÉQUIVALENTE à la paire — dans
      tout état atteignable, la version gardée est celle de la chaîne en cours dès que celle-ci existe, et aucune des deux ne laisse passer une
      version avant la première création ; seule leur SUPPRESSION ensemble (E-4) se mesure.
Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-fp3.py
    FP3_DECOUVERTE=1 python3 neutralisation/neutralize-fp3.py
Lecteurs, calibration, preuve de pose et restauration : `neutralisation/socle_front_client.py`.
"""
import sys

sys.path.insert(0, "neutralisation")
import socle_front_client as socle  # noqa: E402

socle.exiger_racine(__file__)

REGLE = "apps/pro/src/dashboard/walkin-client.ts"
ECRAN = "apps/pro/src/dashboard/walkin-journey.tsx"

campagne = socle.Campagne("fp3", {
    "regle": socle.vitest("@zwadj/pro", "src/dashboard/walkin-revision.test.ts"),
    "ecran": socle.vitest("@zwadj/pro", "src/dashboard/walkin-journey.test.tsx"),
})

P_ABSENT = "⛔ un nom ABSENT de l'écran est repris de la version courante"
P_TAPE = "⛔ un nom TAPÉ l'emporte sur celui de la version"
P_AUTRE = "⛔ une AUTRE fiche n'en reçoit rien"
P_LIEE = "⛔ une fiche LIÉE n'en reçoit RIEN"
E_COPIE = "⛔ la révision porte la copie ARABE que la boîte de langue a complétée"
E_JETE = "⛔ la copie est reprise MÊME quand le devis affiché a été jeté"
E_TAPE = "⛔ un nom TAPÉ à la révision l'emporte"
E_LIEE = "⛔ une fiche LIÉE n'en reçoit rien : la révision"
E_ANNULER = "⛔ « Recommencer » puis un NOUVEAU devis pour la même fiche"

GARDE = "version === null || fiche.linked || version.clientRecordId !== fiche.id) return copiePourDevis(noms, fiche.id);"
LIGNE_AR = 'ar: noms.ar.trim() !== "" ? noms.ar : (present(version.clientNameAr) ?? ""),'
LIGNE_LATIN = 'latin: noms.latin.trim() !== "" ? noms.latin : (present(version.clientNameLatin) ?? "")'
CORPS = ": copiePourRevision(nomsEffectifs, fiche, chainQuoteId !== null && versionRendue.current?.id === chainQuoteId ? versionRendue.current : null))"
LIEN_CHAINE = "chainQuoteId !== null && versionRendue.current?.id === chainQuoteId ? versionRendue.current : null"
MEMOIRE = "if (quote !== null) versionRendue.current = quote;"

campagne.cible("R-1. ⛔ une AUTRE fiche que celle de la version reçoit la copie de l'ancien client", REGLE,
               GARDE, "version === null || fiche.linked) return copiePourDevis(noms, fiche.id);",
               {"regle": P_AUTRE})
campagne.cible("R-2. ⛔ une fiche LIÉE reçoit le nom que le serveur lui refuserait (409 CLIENT_RECORD_LINKED)", REGLE,
               GARDE, "version === null || version.clientRecordId !== fiche.id) return copiePourDevis(noms, fiche.id);",
               {"regle": P_LIEE, "ecran": E_LIEE})
campagne.cible("R-3. ⛔ la version l'emporte sur le nom ARABE tapé à l'écran", REGLE,
               LIGNE_AR, "ar: present(version.clientNameAr) ?? noms.ar,",
               {"regle": P_TAPE})
campagne.cible("R-4. ⛔ la version l'emporte sur le nom LATIN tapé à l'écran", REGLE,
               LIGNE_LATIN, "latin: present(version.clientNameLatin) ?? noms.latin",
               {"regle": P_TAPE, "ecran": E_TAPE})
campagne.cible("R-5. ⛔ le nom ARABE absent de l'écran n'est plus repris de la version (la copie de K-5 se perd)", REGLE,
               LIGNE_AR, "ar: noms.ar,",
               {"regle": P_ABSENT, "ecran#1": E_COPIE, "ecran#2": E_JETE})
campagne.cible("R-6. ⛔ le nom LATIN absent de l'écran n'est plus repris de la version", REGLE,
               LIGNE_LATIN, 'latin: noms.latin || ""',
               {"regle": P_TAPE})
campagne.cible("E-1. ⛔ le corps de la révision ignore la règle : retour à la copie des seuls noms de l'écran", ECRAN,
               CORPS, ": copiePourDevis(nomsEffectifs, fiche.id))",
               {"ecran#1": E_COPIE, "ecran#2": E_JETE, "ecran#3": E_TAPE})
campagne.cible("E-2. ⛔ la version rendue n'est jamais gardée", ECRAN,
               MEMOIRE, "if (quote === null) versionRendue.current = null;",
               {"ecran#1": E_COPIE, "ecran#2": E_JETE})
campagne.cible("E-3. ⛔ la version gardée est ÉCRASÉE quand la modification jette le devis affiché", ECRAN,
               MEMOIRE, "if (quote !== null || quote === null) versionRendue.current = quote;",
               {"ecran": E_JETE})
campagne.cible("E-4. ⛔ la version gardée n'est plus liée à la chaîne en cours : après « Recommencer », la copie de l'ancien devis fuit", ECRAN,
               LIEN_CHAINE, "(versionRendue.current ?? null)",
               {"ecran": E_ANNULER})

if __name__ == "__main__":
    sys.exit(campagne.jouer(sys.argv[1:]))
