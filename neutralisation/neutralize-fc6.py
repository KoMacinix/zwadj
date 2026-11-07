#!/usr/bin/env python3
"""Campagne de neutralisation — FC-6 (session `front-client`) : les dates et les nombres en arabe en `ar-DZ`, par UNE règle.

Ce que le lot ajoute, et que chaque cible neutralise :
  · LA RÈGLE, `intlLocale` (`packages/types/src/intl-locale.ts`) : une garde sur du code partagé se vérifie dans TOUS ses
    consommateurs — client (`intl-locale.test.ts`) ET pro (`intl-locale-pro.test.ts`) (F-1) ;
  · chaque formateur la suit — garde de SOURCE universelle (`intl-locale-guard.test.ts`) et tests de rendu : le mois et la date
    longue du client (F-2, F-3), le mois du pro (F-4), un montant du panneau qui perd sa langue (F-5), une note qui réécrit la
    règle en ligne (F-6), la date d'une demande de suppression rendue au navigateur (F-7) ou privée de son fuseau (F-8) ;
  · ⛔ CE QUE LA GARDE DE SOURCE NE VOIT PAS : une langue écrite en dur (deux arguments, le mauvais) — le test de rendu en arabe
    du panneau la voit (F-9) ;
  · les montants d'un DEVIS suivent le PDF (D326, décision 1) — `quote-amount.test.ts` : l'écran passe la langue de la page au
    lieu de `QUOTE_AMOUNT_LOCALE` (F-10), la constante change (F-11), le PDF passe une langue (F-12 : une MESURE dans
    `apps/api`, restaurée — la session n'y change rien).
Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-fc6.py
    FC6_DECOUVERTE=1 python3 neutralisation/neutralize-fc6.py
Lecteurs, calibration, preuve de pose et restauration : `neutralisation/socle_front_client.py`.
CE QUE CETTE CAMPAGNE NE MESURE PAS : la valeur que `intlLocale` donne au FRANÇAIS (`fr` et `fr-DZ` rendent les mêmes octets pour
tous les formats employés — relevé navigateur, `docs/preuves/front-client/FC-6/releve-ar-dz.txt` : une mutation vers `fr` serait
ÉQUIVALENTE, aucune mesure ne pourrait rougir) ; le numéro du jour et les noms de jours (même raison : `ar` = `ar-DZ`).
"""
import sys

sys.path.insert(0, "neutralisation")
import socle_front_client as socle  # noqa: E402

socle.exiger_racine(__file__)

REGLE = "packages/types/src/intl-locale.ts"
CAL_CLIENT = "apps/client/src/lib/calendar.ts"
BOOKING_CAL = "apps/client/src/lib/booking-calendar.ts"
CAL_PRO = "apps/pro/src/venues/pro-calendar.ts"
PANNEAU = "apps/client/src/components/venue/booking-request-panel.tsx"
NOTE = "packages/i18n/src/format.ts"
COMPTE = "apps/client/src/components/account/account-settings-view.tsx"
COMPTOIR = "apps/pro/src/dashboard/walkin-journey.tsx"
MONNAIE = "packages/types/src/money.ts"
PDF = "apps/api/src/documents/quote-document.ts"

campagne = socle.Campagne("fc6", {
    "garde": socle.vitest("@zwadj/client", "src/lib/intl-locale-guard.test.ts"),
    "regle-client": socle.vitest("@zwadj/client", "src/lib/intl-locale.test.ts"),
    "regle-pro": socle.vitest("@zwadj/pro", "src/venues/intl-locale-pro.test.ts"),
    "montants": socle.vitest("@zwadj/client", "src/components/venue/booking-request-panel-montants.test.tsx"),
    "devis": socle.vitest("@zwadj/pro", "src/venues/quote-amount.test.ts"),
})

GARDE = "aucun formateur de date ou de nombre ne choisit sa langue — ni son fuseau — tout seul"

campagne.cible("F-1. ⛔ la règle rend `ar` au lieu de `ar-DZ` — les DEUX applications", REGLE,
               'return locale === "ar" ? "ar-DZ" : "fr-DZ";', 'return locale === "ar" ? "ar" : "fr-DZ";',
               {"regle-client": "l'arabe se met en forme en `ar-DZ`, le français en `fr-DZ` (la règle des montants, déjà celle de `formatDZD`)",
                "regle-client#2": "le mois du calendrier",
                "regle-pro": "page arabe : le mois est celui de l'Algérie (`ar-DZ`)"})
campagne.cible("F-2. le mois du calendrier du CLIENT contourne la règle", CAL_CLIENT,
               '  return new Intl.DateTimeFormat(intlLocale(locale), { month: "long", year: "numeric", timeZone: "UTC" }).format(',
               '  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(',
               {"regle-client": "le mois du calendrier", "garde": GARDE})
campagne.cible("F-3. la date longue du client (le nom accessible d'un jour) contourne la règle", BOOKING_CAL,
               "export function longDate(date: string, locale: string): string {\n  return new Intl.DateTimeFormat(intlLocale(locale), {",
               "export function longDate(date: string, locale: string): string {\n  return new Intl.DateTimeFormat(locale, {",
               {"regle-client": "la date longue — le nom accessible d'un jour", "garde": GARDE})
campagne.cible("F-4. le mois du calendrier du PRO contourne la règle", CAL_PRO,
               '  return new Intl.DateTimeFormat(intlLocale(locale), { month: "long", year: "numeric", timeZone: "UTC" }).format(',
               '  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(',
               {"regle-pro": "page arabe : le mois est celui de l'Algérie (`ar-DZ`)", "garde": GARDE})
campagne.cible("F-5. le prix d'un créneau perd sa langue (le défaut d'origine)", PANNEAU,
               "{formatDZD(slot.priceCents, langue)}", "{formatDZD(slot.priceCents)}",
               {"montants": "le prix du créneau", "garde": GARDE})
campagne.cible("F-6. la note réécrit la règle en ligne", NOTE,
               "  return new Intl.NumberFormat(intlLocale(locale), {",
               '  return new Intl.NumberFormat(locale === "ar" ? "ar" : "fr-DZ", {',
               {"garde": GARDE})
campagne.cible("F-7. la date d'une demande de suppression revient au NAVIGATEUR (`toLocaleDateString`)", COMPTE,
               "{ date: formatInstantDate(current.requestedAt, locale) }",
               "{ date: new Date(current.requestedAt).toLocaleDateString() }",
               {"garde": GARDE})
campagne.cible("F-8. la date d'un instant perd son fuseau (celui de la machine décide)", REGLE,
               'year: "numeric", timeZone: ALGIERS_TIME_ZONE }',
               'year: "numeric" }',
               {"garde": GARDE})
campagne.cible("F-9. ⛔ une langue écrite EN DUR : deux arguments, le mauvais — la garde de source ne la voit pas", PANNEAU,
               'const langue = locale === "ar" ? "ar" : "fr";', 'const langue = "fr";',
               {"montants": "le prix du créneau",
                "montants#2": "le prix d'une prestation, à côté de sa case",
                "montants#3": "le total, sans prestation choisie : le prix du créneau du serveur"})
campagne.cible("F-10. le total d'un DEVIS passe la langue arabe au lieu de celle du PDF", COMPTOIR,
               "<strong>{formatDZD(quote.totalCents, QUOTE_AMOUNT_LOCALE)}</strong>",
               '<strong>{formatDZD(quote.totalCents, "ar")}</strong>',
               {"devis": "apps/pro/src/dashboard/walkin-journey.tsx : chaque montant du devis passe `QUOTE_AMOUNT_LOCALE`"})
campagne.cible("F-11. la langue des montants d'un devis passe à `ar` sans le PDF", MONNAIE,
               'export const QUOTE_AMOUNT_LOCALE = "fr" as const;', 'export const QUOTE_AMOUNT_LOCALE = "ar" as const;',
               {"devis": "`QUOTE_AMOUNT_LOCALE` existe et rend ce que rend le PDF (le défaut de `formatDZD`)"})
campagne.cible("F-12. ⛔ le PDF passe une langue à un montant : l'écran ne le suit plus (MESURE dans apps/api, restaurée)", PDF,
               "<dd>${formatDZD(record.totalCents)}</dd>", '<dd>${formatDZD(record.totalCents, "ar")}</dd>',
               {"devis": "le PDF imprime ses montants par `formatDZD` SANS langue — relu dans sa source"})

if __name__ == "__main__":
    sys.exit(campagne.jouer(sys.argv[1:]))
