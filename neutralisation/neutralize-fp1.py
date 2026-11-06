#!/usr/bin/env python3
"""Campagne de neutralisation — FP-1 (session `front-client`) : la quantité (PER_UNIT) et le palier (TIERED) au comptoir.

⛔ Méthode RENFORCÉE : une garde du chemin de l'argent n'est prouvée que par une neutralisation dont l'échec est LU en assertion
(D304, D305) — le socle (`neutralisation/socle_front_client.py`) refuse un plantage, un délai, une collecte ratée. Les montants ne sont
jamais calculés ici : chaque cible mute ce que l'écran ENVOIE ou ce qu'il exige, jamais un prix.
Ce que le lot ajoute, et que chaque cible neutralise — la règle PURE (`walkin-services.ts`, mesurée par `walkin-services.test.ts`) :
  · P-1 un palier par DÉFAUT (MD-1) ; P-2 un palier INACTIF accepté (MD-11) ; P-3 une quantité qui n'est pas un entier strict (MD-2) ;
  · P-4 la borne BASSE du catalogue ignorée, P-5 la borne HAUTE (MD-3) ; P-6 un palier envoyé à une prestation qui n'en veut pas (MD-4) ;
  · P-7 une prestation incomplète omise EN SILENCE au lieu d'être signalée (MD-1, MD-2) ;
et l'ÉCRAN (`walkin-journey.tsx`, mesuré par `walkin-journey.test.tsx`) :
  · E-1 le corps ignore la règle (l'écran n'envoie que `{ serviceId }`, MD-5) ; E-2 la révision perd les choix (MD-9) ;
  · E-3 décocher n'efface pas le détail (MD-7) ; E-4 un détail changé ne jette pas le devis (MD-6) ;
  · E-5 « Voir le devis » n'est plus retenu (MD-1, MD-2) ; E-6 la raison n'est plus dite ;
  · E-7 l'unité n'est plus dans la langue de la page, E-8 le palier non plus (MD-10) ; E-9 un palier INACTIF est proposé (MD-11) ;
  · E-10 la borne basse, E-11 la borne haute du champ ne viennent plus du catalogue.
⚠ CE QUI N'A PAS DE CIBLE, ET POURQUOI — écrit plutôt que joué : (a) la garde `if (prestationsIncompletes) return;` de `confirmStep` est
une DÉFENSE EN PROFONDEUR derrière le bouton inactif (un clic sur un bouton `disabled` ne part pas) : la retirer ne change rien de
mesurable — mutation ÉQUIVALENTE, retirée par écrit (D325) ; (b) `aria-describedby` du bouton vers la raison : aucun test ne le lit
(rapporté, pas prétendu gardé) ; (c) `setDetails({})` de la remise à zéro du parcours : aucun test ne le lit.
Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-fp1.py
    FP1_DECOUVERTE=1 python3 neutralisation/neutralize-fp1.py
Lecteurs, calibration, preuve de pose et restauration : `neutralisation/socle_front_client.py`.
"""
import sys

sys.path.insert(0, "neutralisation")
import socle_front_client as socle  # noqa: E402

socle.exiger_racine(__file__)

REGLE = "apps/pro/src/dashboard/walkin-services.ts"
ECRAN = "apps/pro/src/dashboard/walkin-journey.tsx"

campagne = socle.Campagne("fp1", {
    "regle": socle.vitest("@zwadj/pro", "src/dashboard/walkin-services.test.ts"),
    "ecran": socle.vitest("@zwadj/pro", "src/dashboard/walkin-journey.test.tsx"),
})

T_MD1_R = "⛔ MD-1 : TIERED sans palier — AUCUN choix (jamais un palier par défaut)"
T_MD1_E = "⛔ MD-1 : sans palier, « Voir le devis » reste INACTIF et la raison est DITE"
T_MD23_E = "⛔ MD-2, MD-3 : la quantité est bornée par le CATALOGUE"
T_MD3_R = "⛔ MD-3 : PER_UNIT — les bornes sont CELLES DU CATALOGUE"
T_BODY_E = "⛔ MD-5, MD-9 : le corps du devis porte le palier CHOISI et la quantité SAISIE"

campagne.cible("P-1. ⛔ un palier est choisi PAR DÉFAUT : le premier actif, sans que le pro l'ait choisi (un montant que personne n'a décidé)", REGLE,
               "const palier = service.tiers.find((t) => t.isActive && t.id === detail?.tierId);",
               "const palier = service.tiers.find((t) => t.isActive && (detail?.tierId === undefined || t.id === detail?.tierId));",
               {"regle": T_MD1_R, "ecran": T_MD1_E})
campagne.cible("P-2. ⛔ un palier INACTIF (retiré du catalogue) est accepté", REGLE,
               "const palier = service.tiers.find((t) => t.isActive && t.id === detail?.tierId);",
               "const palier = service.tiers.find((t) => t.id === detail?.tierId);",
               {"regle": "⛔ MD-11 : un palier INACTIF, ou d'une autre prestation, n'est pas un choix"})
campagne.cible("P-3. ⛔ la quantité n'est plus un ENTIER strict : « 1e3 » passe (la notation du moteur, pas la saisie)", REGLE,
               'if (!/^[0-9]+$/.test(saisie)) return null;', 'if (saisie === "") return null;',
               {"regle": "⛔ MD-2 : PER_UNIT sans quantité, ou une saisie qui n'est pas un entier — AUCUN choix"})
campagne.cible("P-4. ⛔ la borne BASSE du catalogue (`minUnits`) est ignorée", REGLE,
               "      if (service.minUnits !== null && quantite < service.minUnits) return null;\n", "",
               {"regle": T_MD3_R, "ecran": T_MD23_E})
campagne.cible("P-5. ⛔ la borne HAUTE du catalogue (`maxUnits`) est ignorée", REGLE,
               "      if (service.maxUnits !== null && quantite > service.maxUnits) return null;\n", "",
               {"regle": T_MD3_R, "ecran": T_MD23_E})
campagne.cible("P-6. ⛔ un palier saisi est envoyé à une prestation qui n'en veut pas (le contrat l'interdit)", REGLE,
               "      return { serviceId: service.id };",
               "      return { serviceId: service.id, ...(detail?.tierId === undefined ? {} : { tierId: detail.tierId }) };",
               {"regle": "⛔ MD-4 : un détail saisi pour une prestation qui n'en veut pas N'EST PAS envoyé"})
campagne.cible("P-7. ⛔ une prestation INCOMPLÈTE est omise en silence : le devis part sans elle, l'écran ne dit rien", REGLE,
               "    if (un === null) manquants.push(id);\n    else choix.push(un);",
               "    if (un !== null) choix.push(un);",
               {"ecran": T_MD1_E})

campagne.cible("E-1. ⛔ le corps du devis ignore la règle : l'écran n'envoie que `{ serviceId }` (le palier et la quantité jetés)", ECRAN,
               "...(prestationsDuDevis.choix.length === 0 ? {} : { services: prestationsDuDevis.choix }),",
               "...(picks.length === 0 ? {} : { services: picks.map((serviceId) => ({ serviceId })) }),",
               {"ecran": T_BODY_E})
campagne.cible("E-2. ⛔ la RÉVISION perd les choix : version 2 sans palier ni quantité (le serveur la refuserait)", ECRAN,
               "await quotes.revise(chainQuoteId, body());",
               "await quotes.revise(chainQuoteId, { ...body(), services: undefined });",
               {"ecran": T_BODY_E})
campagne.cible("E-3. ⛔ décocher n'EFFACE plus le détail : recocher renverrait l'ancien palier", ECRAN,
               "    if (picks.includes(serviceId)) setDetails((avant) => Object.fromEntries(Object.entries(avant).filter(([id]) => id !== serviceId)));\n", "",
               {"ecran": "⛔ MD-7 : décocher EFFACE le détail"})
campagne.cible("E-4. ⛔ un détail changé APRÈS le calcul ne jette plus le devis affiché", ECRAN,
               "    setDetails((avant) => ({ ...avant, [serviceId]: { ...avant[serviceId], ...patch } }));\n    invalidate();",
               "    setDetails((avant) => ({ ...avant, [serviceId]: { ...avant[serviceId], ...patch } }));\n    void invalidate;",
               {"ecran": "⛔ MD-6 : changer la quantité APRÈS le calcul jette le devis affiché"})
campagne.cible("E-5. ⛔ « Voir le devis » n'est plus retenu quand un palier ou une quantité manque", ECRAN,
               "disabled={prestationsIncompletes}", "disabled={false}",
               {"ecran#1": T_MD1_E, "ecran#2": T_MD23_E})
campagne.cible("E-6. la RAISON n'est plus dite : le bouton est retenu sans un mot", ECRAN,
               '            {prestationsIncompletes ? (\n'
               '              <p id="wk-services-manque" className="wk-hint" role="status">\n'
               '                {t("venue.ui.walkin.servicesMissing", { names: nomsManquants.join(isAr ? "، " : ", ") })}\n'
               '              </p>\n'
               '            ) : null}',
               "            {null}",
               {"ecran": T_MD1_E})
campagne.cible("E-7. l'unité d'une quantité n'est plus dans la langue de la page (français dans une page arabe)", ECRAN,
               "const unite = isAr ? service.unitNameAr : service.unitNameFr;", "const unite = service.unitNameFr;",
               {"ecran": "MD-10 : en arabe, le palier et l'unité s'écrivent en arabe"})
campagne.cible("E-8. le libellé d'un palier n'est plus dans la langue de la page", ECRAN,
               "{isAr ? palier.labelAr : palier.labelFr}", "{palier.labelFr}",
               {"ecran": "MD-10 : en arabe, le palier et l'unité s'écrivent en arabe"})
campagne.cible("E-9. ⛔ un palier INACTIF (retiré du catalogue) est proposé au pro", ECRAN,
               "                              .filter((palier) => palier.isActive)\n", "",
               {"ecran": "⛔ MD-1, MD-11 : une prestation PAR FORMULE cochée propose ses paliers ACTIFS"})
campagne.cible("E-10. ⛔ la borne basse du champ ne vient plus du catalogue (`min` fixé à 1)", ECRAN,
               "min={service.minUnits ?? 1}", "min={1}",
               {"ecran": T_MD23_E})
campagne.cible("E-11. ⛔ la borne haute du champ ne vient plus du catalogue (aucun `max`)", ECRAN,
               "max={service.maxUnits ?? undefined}", "max={undefined}",
               {"ecran": T_MD23_E})

if __name__ == "__main__":
    sys.exit(campagne.jouer(sys.argv[1:]))
