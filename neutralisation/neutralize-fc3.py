#!/usr/bin/env python3
"""Campagne de neutralisation — FC-3 (session `front-client`) : les noms du panneau de demande dans la langue de la page.

Ce que le lot ajoute, et que chaque cible neutralise :
  · la RÈGLE (`apps/client/src/lib/nom-localise.ts`, module pur) : l'arabe en arabe (N-1), le repli seulement si l'arabe est vide
    (N-2), le repli DIT par `lang` ET `dir` (N-3) — gardes : `nom-localise.test.ts` et le test du panneau ;
  · le PANNEAU (`booking-request-panel.tsx`) : chaque nom passe par la règle — créneau (P-1), prestation (P-2), unité (P-3),
    palier (P-4) — et le repli se pose sur le texte (P-5) — garde : `booking-request-panel-langue.test.tsx`.
Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-fc3.py
    FC3_DECOUVERTE=1 python3 neutralisation/neutralize-fc3.py   # aucun verdict : liste ce qui rougit, par cible
Lecteurs, calibration, preuve de pose et restauration : `neutralisation/socle_front_client.py`.
CE QUE CETTE CAMPAGNE NE MESURE PAS : le repli d'une UNITÉ ne se marque pas (`lang`) — l'unité vit dans une phrase de message
(« … par {unit} »), où un élément ne peut pas s'insérer ; écrit au rapport du lot.
"""
import sys

sys.path.insert(0, "neutralisation")
import socle_front_client as socle  # noqa: E402

socle.exiger_racine(__file__)

REGLE = "apps/client/src/lib/nom-localise.ts"
PANNEAU = "apps/client/src/components/venue/booking-request-panel.tsx"

campagne = socle.Campagne("fc3", {
    "regle": socle.vitest("@zwadj/client", "src/lib/nom-localise.test.ts"),
    "panneau": socle.vitest("@zwadj/client", "src/components/venue/booking-request-panel-langue.test.tsx"),
})

# Les titres, relevés par FC3_DECOUVERTE=1 (jamais écrits de mémoire).
T_R_PRESENT = "arabe, champ arabe présent : le texte ARABE, sans repli"
T_R_VIDE = "arabe, champ arabe VIDE : le français, et le repli est DIT"
T_R_ATTRIBUTS = "les attributs : RIEN hors repli ; `lang` ET `dir` ensemble dans le repli"
T_P_CRENEAU = "le créneau : « سهرة », jamais « Soirée »"
T_P_PRESTATION = "la prestation : son nom ARABE à côté de la case"
T_P_UNITE = "l'unité d'une prestation « à l'unité » : son nom ARABE"
T_P_PALIER = "le palier d'une prestation « par palier » : son nom ARABE dans la liste"
T_P_REPLI_CRENEAU = "un créneau sans nom arabe : son nom français, marqué"
T_P_REPLI_PRESTATION = "une prestation sans nom arabe : son nom français, marqué"

campagne.cible("N-1. la règle rend TOUJOURS le français", REGLE,
               'if (locale !== "ar") return', 'if (locale !== "zz") return',
               {"regle": T_R_PRESENT, "panneau": T_P_CRENEAU})
campagne.cible("N-2. un arabe vide n'est plus vu comme vide : pas de repli", REGLE,
               'return arabe === "" ?', 'return arabe === "§" ?',
               {"regle": T_R_VIDE, "panneau": T_P_REPLI_CRENEAU})
campagne.cible("N-3. le repli perd sa direction (`lang` sans `dir`)", REGLE,
               'nom.repli ? { lang: "fr", dir: "ltr" } : {}', 'nom.repli ? { lang: "fr" } : {}',
               {"regle": T_R_ATTRIBUTS, "panneau": T_P_REPLI_CRENEAU})
campagne.cible("P-1. le créneau relit son nom FRANÇAIS", PANNEAU,
               "nomLocalise(slot.nameFr, slot.nameAr, locale)", "nomLocalise(slot.nameFr, slot.nameFr, locale)",
               {"panneau": T_P_CRENEAU})
campagne.cible("P-2. la prestation relit son nom FRANÇAIS", PANNEAU,
               "nomLocalise(service.nameFr, service.nameAr, locale)", "nomLocalise(service.nameFr, service.nameFr, locale)",
               {"panneau": T_P_PRESTATION})
campagne.cible("P-3. l'unité relit son nom FRANÇAIS", PANNEAU,
               "nomLocalise(service.unitNameFr, service.unitNameAr, locale)", "nomLocalise(service.unitNameFr, service.unitNameFr, locale)",
               {"panneau": T_P_UNITE})
campagne.cible("P-4. le palier relit son nom FRANÇAIS", PANNEAU,
               "nomLocalise(tier.labelFr, tier.labelAr, locale)", "nomLocalise(tier.labelFr, tier.labelFr, locale)",
               {"panneau": T_P_PALIER})
campagne.cible("P-5. le repli ne se pose plus sur le texte du panneau", PANNEAU,
               "return nom.repli ? <span {...attributsDeLangue(nom)}>", "return false ? <span {...attributsDeLangue(nom)}>",
               {"panneau": T_P_REPLI_PRESTATION})

if __name__ == "__main__":
    sys.exit(campagne.jouer(sys.argv[1:]))
