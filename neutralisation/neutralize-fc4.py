#!/usr/bin/env python3
"""Campagne de neutralisation — FC-4 (session `front-client`) : le jour et le créneau déjà DEMANDÉS se choisissent, avec un avis.

Ce que le lot ajoute, et que chaque cible neutralise :
  · la RÈGLE (`apps/client/src/lib/booking-calendar.ts`) : REQUESTED se choisit (S-1), un jour seulement demandé est « demandé »
    (S-2), un jour libre reste « libre » même à côté d'un REQUESTED (S-3) — gardes : `booking-calendar.test.ts` et le panneau ;
  · le CALENDRIER (`booking-date-picker.tsx`) : le nom du jour suit son état (J-1) ;
  · le PANNEAU (`booking-request-panel.tsx`) : le créneau suit la règle (K-1), son libellé dit « demandes en attente » (K-2),
    l'avis paraît quand un créneau demandé est choisi (K-3) — garde : `booking-request-panel-demande.test.tsx`.
Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-fc4.py
    FC4_DECOUVERTE=1 python3 neutralisation/neutralize-fc4.py
Lecteurs, calibration, preuve de pose et restauration : `neutralisation/socle_front_client.py`.
CE QUE CETTE CAMPAGNE NE MESURE PAS : l'aspect du jour demandé (bord pointillé, `theme.css`) et de l'avis — CSS, vus à l'œil sur
une capture (rapport) ; le texte arabe des trois clés — relecture humaine (`arabe-a-relire.md`).
"""
import sys

sys.path.insert(0, "neutralisation")
import socle_front_client as socle  # noqa: E402

socle.exiger_racine(__file__)

REGLE = "apps/client/src/lib/booking-calendar.ts"
CALENDRIER = "apps/client/src/components/venue/booking-date-picker.tsx"
PANNEAU = "apps/client/src/components/venue/booking-request-panel.tsx"

campagne = socle.Campagne("fc4", {
    "regle": socle.vitest("@zwadj/client", "src/lib/booking-calendar.test.ts"),
    "panneau": socle.vitest("@zwadj/client", "src/components/venue/booking-request-panel-demande.test.tsx"),
})

T_REGLE_JOUR = "FC-4 : un seul créneau REQUESTED suffit — le jour déjà DEMANDÉ se choisit (arbitrage de Ko)"
T_REGLE_STATUTS = "les statuts choisissables sont EXACTEMENT AVAILABLE et REQUESTED"
T_REGLE_ETAT = "libre s'il porte un AVAILABLE, même à côté d'un REQUESTED"
T_JOUR = "le 16 (un créneau demandé, un fermé) : choisissable, nommé « demandes en attente »"
T_CRENEAU = "le créneau demandé est actif, et son libellé dit « demandes en attente »"
T_AVIS = "le choisir fait paraître l'AVIS : d'autres demandes sont en attente"

campagne.cible("S-1. REQUESTED ne se choisit plus (retour à AVAILABLE seul)", REGLE,
               'CHOOSABLE_SLOT_STATUSES: readonly SlotAvailabilityStatus[] = ["AVAILABLE", "REQUESTED"];',
               'CHOOSABLE_SLOT_STATUSES: readonly SlotAvailabilityStatus[] = ["AVAILABLE"];',
               {"regle": T_REGLE_JOUR, "regle#2": T_REGLE_STATUTS, "panneau": T_JOUR})
campagne.cible("S-2. un jour seulement demandé est dit « complet »", REGLE,
               '? "requested" : "full";', '? "full" : "full";',
               {"regle": T_REGLE_ETAT, "panneau": T_JOUR})
campagne.cible("S-3. un jour libre à côté d'un REQUESTED est dit « demandé »", REGLE,
               'if (day.slots.some((slot) => slot.status === "AVAILABLE")) return "free";',
               'if (day.slots.every((slot) => slot.status === "AVAILABLE")) return "free";',
               {"regle": T_REGLE_ETAT})
campagne.cible("J-1. le nom du jour ne dit plus « demandes en attente »", CALENDRIER,
               'requested: "dayRequested"', 'requested: "dayFree"',
               {"panneau": T_JOUR})
campagne.cible("K-1. le créneau ne suit plus la règle (AVAILABLE seul)", PANNEAU,
               "const choisissable = isSlotChoosable(slot.status);", 'const choisissable = slot.status === "AVAILABLE";',
               {"panneau": T_CRENEAU})
campagne.cible("K-2. le libellé du créneau demandé ne le dit plus", PANNEAU,
               '{slot.status === "REQUESTED" ? ` · ${t("requested")}` :', '{slot.status === "§" ? ` · ${t("requested")}` :',
               {"panneau": T_CRENEAU})
campagne.cible("K-3. l'avis ne paraît plus", PANNEAU,
               '?.slots.find((row) => row.slotTemplateId === chosen.slotTemplateId)?.status === "REQUESTED" ? (',
               '?.slots.find((row) => row.slotTemplateId === chosen.slotTemplateId)?.status === "§" ? (',
               {"panneau": T_AVIS})

if __name__ == "__main__":
    sys.exit(campagne.jouer(sys.argv[1:]))
