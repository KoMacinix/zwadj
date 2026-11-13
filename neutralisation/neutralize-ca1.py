#!/usr/bin/env python3
"""Campagne de neutralisation — CA-1 (session parallèle « carte ») : la route de points `GET /api/v1/venue-map`.

Ce que le lot ajoute, et que chaque cible neutralise :
  · le module PUR `venue-map.ts` (forme d'un point, enveloppe, « avoir des coordonnées », colonnes lues) — cibles M-n ;
  · `VenuesPublicService.map()` et le filtre commun `publicFilter` (une seule autorité pour la liste et la carte) — cibles S-n ;
  · le contrôleur `venue-map.controller.ts` et son enregistrement (route publique, schéma de la liste, chemin qui ne masque
    aucune fiche) — cibles C-n, vues par la base réelle seulement.
Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-ca1.py           # cibles unitaires ; cibles d'intégration : NON MESURÉES (sortie 3)
    python3 neutralisation/neutralize-ca1.py --int     # + les cibles d'intégration (PostgreSQL réel, base zwadj_test)
    CA1_DECOUVERTE=1 python3 neutralisation/neutralize-ca1.py --int
Lecteurs, calibration, preuve de pose et restauration : `neutralisation/socle_front_client.py` (module partagé, D305).
⚠ Le socle ne connaît que deux modes, « unit » et « e2e ». Une mesure d'intégration est déclarée « unit » avec `--int`, « e2e »
sans : sans `--int`, ses cibles s'impriment donc « NON MESURÉE … relancer avec --e2e » — LIRE « --int ». La campagne sort
alors en 3 (incomplète), jamais en 0.

CE QUI N'EST PAS NEUTRALISÉ, ET POURQUOI (écrit, pas tu) : la garde « une seule coordonnée ⇒ pas de point » de
`toVenueMapPoint`. La retirer fait PLANTER la conversion (`TypeError` sur `null.toNumber()`), et un plantage n'est pas une
morsure (D304). La même faute est mesurée un étage plus haut, par assertion : cibles M-6 et M-7 (`HAS_COORDINATES`).
"""
import sys

sys.path.insert(0, "neutralisation")
import socle_front_client as socle  # noqa: E402

socle.exiger_racine(__file__)

AVEC_INT = "--int" in sys.argv[1:]
MODULE = "apps/api/src/venues/venue-map.ts"
SERVICE = "apps/api/src/venues/venues-public.service.ts"
CONTROLEUR = "apps/api/src/venues/venue-map.controller.ts"
LISTE = "apps/api/src/venues/venues-public.controller.ts"
MODULE_NEST = "apps/api/src/venues/venues.module.ts"

campagne = socle.Campagne("ca1", {
    "module": socle.vitest("@zwadj/api", "src/venues/venue-map.spec.ts"),
    "service": socle.vitest("@zwadj/api", "src/venues/venues-public.service.spec.ts"),
    "int": {"genre": "vitest", "mode": "unit" if AVEC_INT else "e2e",
            "cmd": ["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", "-c", "vitest.config.int.ts",
                    "test/int/venue-map.int-spec.ts"]},
})

T_FORME = "rend exactement les champs du contrat, coordonnées en NOMBRES, prix et capacité tels que lus"
T_FUITE = "⛔ aucun champ en plus ne sort, même si la ligne lue en porte (taux, adresse, propriétaire)"
T_SANS = "le nombre de salles SANS coordonnées est le total des filtres moins les salles situées"
T_PILE = "au plafond PILE, rien n'est tronqué (`>` et pas `>=`)"
T_TRONQUE = "⛔ une salle située de plus que le plafond : `truncated` le DIT, et les points s'arrêtent au plafond"
T_NEGATIF = "deux comptes lus à deux instants (une salle supprimée entre les deux) ne rendent jamais un nombre négatif"
T_COORD = "« avoir des coordonnées » = latitude ET longitude non nulles"
T_SELECT = "⛔ le SELECT ne lit ni taux, ni adresse, ni propriétaire : ce qui n'est pas lu ne peut pas sortir"

S_TOTAL = "⛔ le total se compte avec le MÊME `where` que la liste, pour une requête qui porte TOUS les filtres"
S_POINTS = "les points : ce même `where` ET des coordonnées, dans l'ordre de la liste, au plafond, sans pagination"
S_SITUEES = "les salles SITUÉES se comptent sur le prédicat des points, pas sur celui du total"
S_ENVELOPPE = "l'enveloppe : total, sans coordonnées, tronqué, plafond, écho de la date"
S_PASSE = "une date passée est REFUSÉE comme pour la liste, avant toute requête (un point ne s'écrête pas)"

I_MEMES = "⛔ pour CHAQUE requête : les points sont les salles de la liste qui ont des coordonnées, et le reste est COMPTÉ"
I_ORDRE = "l'ordre des points est celui de la liste (le tri décide quels points restent si le plafond tronque)"
I_PAGE = "`page` et `pageSize` ne découpent pas la carte : tous les points, quelle que soit la page demandée"
I_PUBLIQUE = "route PUBLIQUE : aucune session n'est demandée"
I_PASSE = "une date passée est refusée avec le code de la liste (400 AVAILABLE_ON_PAST), pas rendue vide"
I_SCHEMA = "un filtre mal formé est un 400, comme pour la liste (même schéma)"
I_SLUG = "⛔ la route de carte ne MASQUE aucune fiche : une salle dont le slug est « map » reste lisible"

# ── le module pur ────────────────────────────────────────────────────────────────────────────────────────────────────
campagne.cible("M-1. Le plafond PILE est déclaré tronqué (`>=`)", MODULE,
               "truncated: input.located > input.limit,", "truncated: input.located >= input.limit,", {"module": T_PILE})
campagne.cible("M-2. ⛔ La troncature ne se dit plus", MODULE,
               "truncated: input.located > input.limit,", "truncated: false,", {"module": T_TRONQUE})
campagne.cible("M-3. Le plafond n'est plus réappliqué aux points", MODULE,
               "for (const row of input.rows.slice(0, input.limit)) {", "for (const row of input.rows) {", {"module": T_TRONQUE})
campagne.cible("M-4. Le nombre de salles sans coordonnées peut devenir négatif", MODULE,
               "withoutCoordinates: Math.max(0, input.total - input.located),", "withoutCoordinates: input.total - input.located,",
               {"module": T_NEGATIF})
campagne.cible("M-5. Le nombre de salles sans coordonnées est faux (soustraction inversée)", MODULE,
               "Math.max(0, input.total - input.located)", "Math.max(0, input.located - input.total)", {"module": T_SANS})
campagne.cible("M-11. L'écho de la date est perdu par l'enveloppe", MODULE,
               "availableOn: input.requestedOn ?? null", "availableOn: null",
               {"module": "l'écho de la date : la date demandée, ou `null` si aucune (une réponse paramétrée porte l'écho de son paramètre)"})
campagne.cible("M-6. ⛔ Une latitude SEULE suffit à « avoir des coordonnées »", MODULE,
               "export const HAS_COORDINATES = { lat: { not: null }, lng: { not: null } } as const;",
               "export const HAS_COORDINATES = { lat: { not: null } } as const;", {"module": T_COORD, "int": I_MEMES})
campagne.cible("M-7. ⛔ Une longitude SEULE suffit à « avoir des coordonnées »", MODULE,
               "export const HAS_COORDINATES = { lat: { not: null }, lng: { not: null } } as const;",
               "export const HAS_COORDINATES = { lng: { not: null } } as const;", {"module": T_COORD, "int": I_MEMES})
campagne.cible("M-8. ⛔ Toute la ligne lue sort dans le point (fuite de champs)", MODULE,
               "    id: row.id,", "    ...row, id: row.id,", {"module": T_FUITE})
campagne.cible("M-9. La vignette est la clé d'objet brute, pas son adresse publique", MODULE,
               "coverThumbUrl: cover === undefined ? null : urlOf(cover.thumbKey)",
               "coverThumbUrl: cover === undefined ? null : cover.thumbKey", {"module": T_FORME})
campagne.cible("M-10. ⛔ Le SELECT lit un taux", MODULE,
               "  basePriceCents: true,", "  basePriceCents: true, commissionRateBps: true,", {"module": T_SELECT}, genre="insertion")

# ── le service ───────────────────────────────────────────────────────────────────────────────────────────────────────
COMPTES = "      this.prisma.venue.count({ where }),\n      this.prisma.venue.count({ where: located })"
campagne.cible("S-1. ⛔ LA DIVERGENCE : le total de la carte se compte sans les filtres", SERVICE, COMPTES,
               "      this.prisma.venue.count({ where: PUBLIC_BASE_WHERE }),\n      this.prisma.venue.count({ where: located })",
               {"service": S_TOTAL, "int": I_MEMES})
campagne.cible("S-2. Les points n'exigent plus de coordonnées", SERVICE,
               "const located: Prisma.VenueWhereInput = { AND: [where, HAS_COORDINATES] };",
               "const located: Prisma.VenueWhereInput = { AND: [where] };", {"service": S_POINTS, "int": I_MEMES})
campagne.cible("S-3. ⛔ LA DIVERGENCE : les points ignorent les filtres", SERVICE,
               "const located: Prisma.VenueWhereInput = { AND: [where, HAS_COORDINATES] };",
               "const located: Prisma.VenueWhereInput = { AND: [PUBLIC_BASE_WHERE, HAS_COORDINATES] };",
               {"service": S_POINTS, "int": I_MEMES})
campagne.cible("S-4. La requête des points n'a plus de plafond", SERVICE,
               "        take: VENUE_MAP_MAX_POINTS,\n        select: VENUE_MAP_SELECT",
               "        take: Number.MAX_SAFE_INTEGER,\n        select: VENUE_MAP_SELECT", {"service": S_POINTS})
campagne.cible("S-5. L'ordre des points n'est plus celui de la liste", SERVICE,
               "        orderBy: this.orderBy(query.sort),\n        take: VENUE_MAP_MAX_POINTS,",
               "        orderBy: [{ id: \"asc\" }],\n        take: VENUE_MAP_MAX_POINTS,", {"service": S_POINTS, "int": I_ORDRE})
campagne.cible("S-6. La carte se met à paginer", SERVICE,
               "        take: VENUE_MAP_MAX_POINTS,\n        select: VENUE_MAP_SELECT",
               "        skip: (query.page - 1) * query.pageSize,\n        take: VENUE_MAP_MAX_POINTS,\n        select: VENUE_MAP_SELECT",
               {"service": S_POINTS, "int": I_PAGE}, genre="insertion")
campagne.cible("S-7. ⛔ La carte ne refuse plus une date passée", SERVICE,
               "const { where } = this.publicFilter(query, Date.now());",
               "const { where } = this.publicFilter({ ...query, availableOn: undefined }, Date.now());",
               {"service": S_PASSE, "int": I_PASSE})
campagne.cible("S-8. L'écho de la date est perdu", SERVICE,
               "      requestedOn: query.availableOn,\n      urlOf: this.urlOf",
               "      requestedOn: undefined,\n      urlOf: this.urlOf", {"service": S_ENVELOPPE})
campagne.cible("S-9. Les salles situées se comptent sur le prédicat du total", SERVICE, COMPTES,
               "      this.prisma.venue.count({ where }),\n      this.prisma.venue.count({ where })",
               {"service": S_SITUEES, "int": I_MEMES})

# ── le contrôleur et son enregistrement (base réelle) ────────────────────────────────────────────────────────────────
campagne.cible("C-1. ⛔ La route de carte n'est plus publique", CONTROLEUR,
               "@Public()\n", "", {"int": I_PUBLIQUE})
campagne.cible("C-2. Le contrôleur n'est plus enregistré (leçon R1)", MODULE_NEST,
               "    VenueMapController,\n", "", {"int": I_PUBLIQUE})
campagne.cible("C-3. La requête n'est plus validée par le schéma de la liste", CONTROLEUR,
               "@Query(new ZodValidationPipe(venueListQuerySchema)) query: VenueListQueryInput",
               "@Query() query: VenueListQueryInput", {"int": I_SCHEMA})
campagne.cible("C-4. ⛔ L'ÉCART C-1 DÉFAIT : une route `map` sous `/venues` masque la fiche de slug « map »", LISTE,
               "  @Get(\":slug\")",
               "  @Get(\"map\")\n  carteSousVenues(): { points: never[] } {\n    return { points: [] };\n  }\n\n  @Get(\":slug\")",
               {"int": I_SLUG}, genre="insertion")

if __name__ == "__main__":
    sys.exit(campagne.jouer([a for a in sys.argv[1:] if a != "--int"]))
