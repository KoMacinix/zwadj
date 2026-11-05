#!/usr/bin/env python3
"""Campagne de neutralisation — FC-5 (session `front-client`) : la source unique — la semaine, et les adresses de pages.

Ce que le lot ajoute, et que chaque cible neutralise :
  · LA SEMAINE vit dans `packages/types/src/week.ts` ; les deux calendriers l'importent — garde de source
    `semaine-source-unique.test.ts` (W-1, W-2) ; sa VALEUR (dimanche ; vendredi-samedi ; D56) se mesure dans les DEUX
    consommateurs, `calendar.spec.ts` (client) et `pro-calendar.spec.ts` (pro) — une garde sur du code partagé se vérifie dans
    tous ses consommateurs (W-3, W-4) ;
  · UNE ADRESSE DE PAGE NE S'ÉCRIT QUE DANS LA TABLE de son application — `adresses-guard.test.ts` (A-1 client, A-2 pro, A-3 la
    table de routes du pro elle-même), et le pro nomme les pages du client par leurs constantes (A-4) ;
  · CHAQUE CONSTANTE DÉSIGNE UNE PAGE — client : `routes.test.ts` (R-1, R-2) ; pro : `routes.test.tsx`, la table de routes réelle
    y rend sa page sans la quitter (R-3).
Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-fc5.py
    FC5_DECOUVERTE=1 python3 neutralisation/neutralize-fc5.py
Lecteurs, calibration, preuve de pose et restauration : `neutralisation/socle_front_client.py`.
CE QUE CETTE CAMPAGNE NE MESURE PAS : une FAUTE DE FRAPPE dans une constante du pro employée à la fois par `App.tsx` et par les
liens ne casse rien (les deux suivent) — ce n'est pas un défaut, c'est le but d'une source unique ; la page d'accueil `/` (non
relevée, D321).
"""
import sys

sys.path.insert(0, "neutralisation")
import socle_front_client as socle  # noqa: E402

socle.exiger_racine(__file__)

SEMAINE = "packages/types/src/week.ts"
CAL_CLIENT = "apps/client/src/lib/calendar.ts"
CAL_PRO = "apps/pro/src/venues/pro-calendar.ts"
TABLE_CLIENT = "apps/client/src/lib/routes.ts"
TABLE_PRO = "apps/pro/src/routes.ts"
PIED = "apps/client/src/components/site-footer.tsx"
NAV_PRO = "apps/pro/src/shell/pro-nav.tsx"
APP_PRO = "apps/pro/src/App.tsx"

campagne = socle.Campagne("fc5", {
    "semaine": socle.vitest("@zwadj/client", "src/lib/semaine-source-unique.test.ts"),
    "cal-client": socle.vitest("@zwadj/client", "src/lib/calendar.spec.ts"),
    "cal-pro": socle.vitest("@zwadj/pro", "src/venues/pro-calendar.spec.ts"),
    "adresses": socle.vitest("@zwadj/client", "src/lib/adresses-guard.test.ts"),
    "routes-client": socle.vitest("@zwadj/client", "src/lib/routes.test.ts"),
    "routes-pro": socle.vitest("@zwadj/pro", "src/routes.test.tsx"),
})

# ⚠ ANCRES RÉORIENTÉES (session `front-client`, FC-6) : l'import de la semaine porte aussi `intlLocale` (la règle de mise en
# forme) ; la mutation garde cet import et redéclare la semaine — même faute, W-1 et W-2.
IMPORT = 'import { WEEKEND_DAYS, WEEK_START_DAY, intlLocale } from "@zwadj/types";'
LOCALE = 'import { intlLocale } from "@zwadj/types";\nconst WEEK_START_DAY = 0;\nconst WEEKEND_DAYS: readonly number[] = [5, 6];'

campagne.cible("W-1. le calendrier du CLIENT redéclare la semaine au lieu de l'importer", CAL_CLIENT, IMPORT, LOCALE,
               {"semaine": "apps/client/src/lib/calendar.ts ne redéclare ni WEEK_START_DAY ni WEEKEND_DAYS",
                "semaine#2": "apps/client/src/lib/calendar.ts les importe de @zwadj/types"})
campagne.cible("W-2. le calendrier du PRO redéclare la semaine au lieu de l'importer", CAL_PRO, IMPORT, LOCALE,
               {"semaine": "apps/pro/src/venues/pro-calendar.ts ne redéclare ni WEEK_START_DAY ni WEEKEND_DAYS",
                "semaine#2": "apps/pro/src/venues/pro-calendar.ts les importe de @zwadj/types"})
campagne.cible("W-3. ⛔ l'autorité « s'aligne sur la locale » : la semaine commence le samedi (CLDR ar-DZ) — les DEUX applications",
               SEMAINE, "export const WEEK_START_DAY = 0;", "export const WEEK_START_DAY = 6;",
               {"cal-client": "commence le DIMANCHE", "cal-pro": "commence le DIMANCHE"})
campagne.cible("W-4. l'autorité met le week-end en samedi-dimanche — les DEUX applications", SEMAINE,
               "export const WEEKEND_DAYS: readonly number[] = [5, 6];", "export const WEEKEND_DAYS: readonly number[] = [6, 0];",
               {"cal-client": "le week-end est vendredi-samedi, pas samedi-dimanche", "cal-pro": "le week-end est vendredi-samedi, pas samedi-dimanche"})
campagne.cible("A-1. une adresse de page réapparaît en dur dans un composant du CLIENT", PIED,
               "<Link href={TERMS_PATH}>", '<Link href="/cgu">', {"adresses": "aucune adresse de page hors des deux tables de routes"})
campagne.cible("A-2. une adresse de page réapparaît en dur dans un composant du PRO", NAV_PRO,
               "{ to: REQUESTS_PATH, ", '{ to: "/demandes", ', {"adresses": "aucune adresse de page hors des deux tables de routes"})
campagne.cible("A-3. ⛔ la table de routes du pro DÉCLARE une route par un littéral, que les liens ne suivent plus", APP_PRO,
               "path={CALENDAR_PATH}", 'path="/agenda"',
               {"adresses": "aucune adresse de page hors des deux tables de routes",
                "routes-pro": "CALENDAR_PATH (« /calendrier ») : la page s'y rend, et l'adresse RESTE celle demandée"})
campagne.cible("A-4. le pro lie aux CGU du client par une adresse qui n'est plus la leur", TABLE_PRO,
               'export const CLIENT_TERMS_PATH = "/cgu";', 'export const CLIENT_TERMS_PATH = "/conditions";',
               {"adresses": "le pro lie aux pages du CLIENT par des constantes qui NOMMENT ces pages"})
campagne.cible("R-1. une constante du client ne désigne plus de page (faute de frappe)", TABLE_CLIENT,
               'export const TERMS_PATH = "/cgu";', 'export const TERMS_PATH = "/cgus";',
               {"routes-client": "chaque chaîne de la table désigne un `page.tsx`",
                "routes-client#2": "chaque page DÉCLARÉE a sa constante — fixe par une chaîne, dynamique par `venuePath`"})
campagne.cible("R-2. la fiche d'une salle vise une page qui n'existe pas", TABLE_CLIENT,
               "return `${SEARCH_PATH}/${slug}`;", "return `${SEARCH_PATH}/${slug}/fiche`;",
               {"routes-client": "la fiche d'une salle (`venuePath`) désigne la page `[slug]`"})
campagne.cible("R-3. l'assistant d'une salle (pro) vise une route qui n'existe pas", TABLE_PRO,
               "return `${VENUES_PATH}/${id}`;", "return `${VENUES_PATH}/${id}/fiche`;",
               {"routes-pro": "venuePath(id) — l'assistant d'une salle : la page s'y rend, et l'adresse RESTE celle demandée"})

if __name__ == "__main__":
    sys.exit(campagne.jouer(sys.argv[1:]))
