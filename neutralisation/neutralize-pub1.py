#!/usr/bin/env python3
"""Campagne de neutralisation — RANG 50 (D348), lot PUB-1 : une salle publiée se voit sur le site client (`e2e/specs/r50-salle-publiee.e2e.ts`).

Chaque cible MUTE l'application (jamais la spec) pour faire apparaître la faute que la garde nomme, joue la spec dans un vrai navigateur, et lit l'échec du test visé : il doit être
une ASSERTION `expect(...)` (D305, D323). La mutation dure le temps d'une mesure, puis le fichier est restauré (D318).
Cibles — l'API : le filtre de publication, le statut de la liste, le statut du détail, la suppression, le créneau actif sous une date, les filtres « invités », « ville », « budget »,
« équipement », « style » · le client : le repli sur des salles FICTIVES (accueil et recherche), l'accueil qui ne rend plus les salles, la conversion du budget, la ville non transmise,
le 404 de la fiche, la photo de la carte, le nom arabe, le cache de la liste et le cache de la fiche · le Pro : le badge de publication. La carte des cibles : `docs/preuves/D348/rouges/`.

Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-pub1.py            # la calibration du lecteur et la preuve de pose de chaque mutation, EN MÉMOIRE ; les cibles e2e : NON MESURÉES (code 3)
    python3 neutralisation/neutralize-pub1.py --e2e      # + toutes les cibles (serveurs de développement, base zwadj_e2e)
    python3 neutralisation/neutralize-pub1.py --e2e --seulement=PUB1-3,PUB1-4   # reprise déclarée de certaines cibles (jamais après une modification du harnais : alors, EN ENTIER)
Codes de sortie : 0 = tout joué, tout a mordu ; 1 = au moins une garde MUETTE ; 2 = pré-vol rouge, ERREUR DE SCRIPT, mutation non posée, calibration manquée, ou arbre non conforme ;
3 = campagne INCOMPLÈTE (cibles e2e hors exécution : lancer avec --e2e).

⛔ UNE MORSURE SE LIT, ELLE NE SE DÉDUIT PAS D'UN CODE DE SORTIE (D304, D305, D312, D316, D323) : une ligne « x » porte le titre visé, et le bloc d'erreur de CE test porte `expect(`.
Un délai d'ACTION (`click`, `goto`) n'est pas une morsure ; l'expiration d'une assertion web-first l'est (D323). Le lecteur et sa calibration (deux bras par verdict) sont ceux de
`neutralize-r49.py`, repris tels quels.
⛔ LA MUTATION SE PROUVE POSÉE (D286) : ancre 1 → 0 ET marqueur n → n + 1 pour CHAQUE remplacement (substitutions seulement ; aucun texte remplaçant n'est une sous-chaîne de son ancre — D325).
⛔ SURVIVRE À UN SIGNAL : sauvegarde sur DISQUE avant toute mutation, restaurée au démarrage suivant si une exécution a été tuée.
⚠ Les fichiers mutés sont en CRLF : une ancre sur plusieurs lignes porte `\r\n`.
⚠ La mesure rejoue la spec AVEC SA PROPRE PILE (`playwright.config.ts` : API `nest start` compilée UNE fois au lancement, donc la mutation de l'API posée AVANT est bien servie) : les ports 3100,
3101 et 5273 doivent être libres.
⚠ Une spec sérielle (M-1) joue ses tests dans l'ordre : la mesure joue le describe ENTIER ; le titre visé est celui du test qui doit rougir.

POURQUOI IL EXISTE : le lot a trouvé « une salle publiée s'affiche » VRAI partout sauf sur la fiche d'une salle masquée ou supprimée. Une garde verte du premier coup ne prouve rien : sans cette
campagne, rien ne dirait qu'on peut retirer le filtre de publication, laisser passer une salle masquée ou ajouter des salles fictives sans qu'aucune porte rougisse.
"""

import io
import json
import os
import re
import shutil
import subprocess
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO (pnpm-workspace.yaml introuvable).")
    print(f"  dossier courant : {os.getcwd()}")
    print(f"  → python3 neutralisation/{os.path.basename(__file__)}")
    sys.exit(2)

SAUVEGARDE = ".neutralisation-pub1"
MANIFESTE = os.path.join(SAUVEGARDE, "manifeste.json")
JOURNAUX = os.path.join(".neutralisation-journaux", "pub1")  # ignoré par git ; ce qu'une décision cite se COPIE (D291), MASQUÉ (les journaux portent des jetons de développement)
ANSI = re.compile(r"\x1b\[[0-9;]*m")
VITEST_ATTENDU = "v3.2.7"

API = "apps/api/src/venues/venues-public.service.ts"
HOME = "apps/client/src/components/home-view.tsx"
SEARCH = "apps/client/src/components/search/search-view.tsx"
QUERY = "apps/client/src/lib/search-query.ts"
CLIENT_API = "apps/client/src/lib/api.ts"
FICHE = "apps/client/src/app/[locale]/salles/[slug]/page.tsx"
CARTE = "apps/client/src/components/venue-card.tsx"
PRO_LIST = "apps/pro/src/venues/venue-list-page.tsx"

SPEC = "specs/r50-salle-publiee.e2e.ts"
MESURES = {
    "e2e-m1": ["pnpm", "--filter", "@zwadj/e2e", "exec", "playwright", "test", SPEC, "-g", "M-1"],
    "e2e-m2": ["pnpm", "--filter", "@zwadj/e2e", "exec", "playwright", "test", SPEC, "-g", "M-2"],
    "e2e-m3": ["pnpm", "--filter", "@zwadj/e2e", "exec", "playwright", "test", SPEC, "-g", "M-3"],
}
MODE = {"e2e-m1": "e2e", "e2e-m2": "e2e", "e2e-m3": "e2e"}

# Les titres visés : un fragment du titre du test qui doit rougir.
M1_CREER = "le pro crée sa salle"
M1_ACCUEIL_FR = "FR · l'accueil montre la salle"
M1_ACCUEIL_AR = "AR · l'accueil montre la salle"
M1_SALLES_FR = "FR · /salles : sans filtre"
M1_FICHE_FR = "FR · la fiche s'ouvre"
M2 = "témoin, brouillon, masqu"
M3 = "publiée après une visite en 404"


def cible(libelle: str, fichier: str, remplacements: list, mesure: str, titre: str) -> dict:
    return {"libelle": libelle, "fichier": fichier, "remplacements": remplacements, "mesure": mesure, "titre": titre}


CIBLES = [
    # ── L'API : ce qui décide qu'une salle est ou n'est pas dans la liste et sur la fiche
    cible("PUB1-1. la liste et la fiche n'exigent plus la PUBLICATION (un brouillon s'affiche)", API,
          [("publicationStatus: VenuePublicationStatus.PUBLISHED,", "publicationStatus: { not: VenuePublicationStatus.PENDING },")], "e2e-m2", M2),
    cible("PUB1-2. la liste montre aussi les salles masquées et temporairement indisponibles", API,
          [("status: VenueAvailabilityStatus.ACTIVE, // D33 liste : ACTIVE seul",
            "status: { in: [VenueAvailabilityStatus.ACTIVE, VenueAvailabilityStatus.HIDDEN, VenueAvailabilityStatus.TEMPORARILY_UNAVAILABLE] },")], "e2e-m2", M2),
    cible("PUB1-3. la fiche d'une salle MASQUÉE s'ouvre", API,
          [("  VenueAvailabilityStatus.TEMPORARILY_UNAVAILABLE\r\n] as const;", "  VenueAvailabilityStatus.TEMPORARILY_UNAVAILABLE,\r\n  VenueAvailabilityStatus.HIDDEN\r\n] as const;")], "e2e-m2", M2),
    cible("PUB1-4. une salle SUPPRIMÉE (ou archivée avec le compte du pro) reste dans la liste et sur la fiche", API,
          [("  deletedAt: null\r\n} as const;", "  deletedAt: undefined\r\n} as const;")], "e2e-m2", M2),
    cible("PUB1-5. une salle sans créneau actif reste dans une recherche DATÉE", API,
          [("...(annotateOn === null ? {} : { slotTemplates: { some: ACTIVE_SLOT } }),", "...{},")], "e2e-m2", M2),
    cible("PUB1-6. le filtre « invités » ne filtre plus (300 places pour 450 invités)", API,
          [("{ capacityMax: { gte: query.guests } }", "{ capacityMax: { gte: 0 } }"), ("? {} : { gte: query.guests }),", "? {} : { gte: 0 }),")], "e2e-m2", M2),
    cible("PUB1-7. le filtre « ville » ne filtre plus", API,
          [("...(query.cityId === undefined ? {} : { cityId: query.cityId }),", "...{},")], "e2e-m1", M1_SALLES_FR),
    cible("PUB1-8. le filtre « budget » ne filtre plus", API,
          [("...(query.minPriceCents === undefined ? {} : { gte: query.minPriceCents }),", "...{},"),
           ("...(query.maxPriceCents === undefined ? {} : { lte: query.maxPriceCents })", "...{}")], "e2e-m1", M1_SALLES_FR),
    cible("PUB1-9. le filtre « équipement » ne filtre plus", API,
          [(": { AND: amenityKeys.map((key) => ({ amenities: { some: { amenity: { key } } } })) })", ": {})")], "e2e-m1", M1_SALLES_FR),
    cible("PUB1-10. le filtre « style » ne filtre plus", API,
          [("...(styleKeys.length === 0 ? {} : { styles: { some: { style: { key: { in: styleKeys } } } } }),", "...{},")], "e2e-m1", M1_SALLES_FR),
    # ── Le client : le repli fictif, l'accueil, la recherche, la fiche, la carte
    cible("PUB1-11. l'accueil garde les salles FICTIVES et leur bandeau à côté d'une vraie salle", HOME,
          [("previewVenues !== null && previewVenues.length > 0 && (recent === null || recent.items.length === 0);",
            "previewVenues !== null && previewVenues.length > 0 && (recent === null || recent.items.length >= 0);")], "e2e-m1", M1_ACCUEIL_FR),
    cible("PUB1-12. la recherche garde les salles FICTIVES et leur bandeau à côté d'une vraie salle", SEARCH,
          [("(results === null || results.items.length === 0);", "(results === null || results.items.length >= 0);")], "e2e-m1", M1_SALLES_FR),
    cible("PUB1-13. l'accueil ne rend plus aucune salle réelle (ni « récentes » ni « moins chères »)", HOME,
          [(": (recent?.items ?? []).slice(0, RECENT_COUNT);", ": [];"), ("(affordable?.items ?? [])", "[] as VenueCardData[]")], "e2e-m1", M1_ACCUEIL_FR),
    cible("PUB1-14. le budget de l'URL est converti en centimes avec un facteur faux (× 10)", QUERY,
          [('query.set("minPriceCents", String(centsFromDinars(state.minPrice)));', 'query.set("minPriceCents", String(centsFromDinars(state.minPrice) * 10));')], "e2e-m1", M1_SALLES_FR),
    cible("PUB1-15. la ville de l'URL n'est plus transmise à l'API", QUERY,
          [('  if (state.cityId) query.set("cityId", state.cityId);\r\n  if (state.guests) query.set("guests", state.guests);\r\n  // Dinars',
            '  // mutation PUB1-15\r\n  if (state.guests) query.set("guests", state.guests);\r\n  // Dinars')], "e2e-m1", M1_SALLES_FR),
    cible("PUB1-16. la liste de recherche est gardée 300 s (la salle qui vient d'être publiée n'y est pas)", CLIENT_API,
          [("`${API_URL}/api/v1/venues?${query.toString()}`, { cache: \"no-store\" });", "`${API_URL}/api/v1/venues?${query.toString()}`, { next: { revalidate: 300 } });")], "e2e-m1", M1_ACCUEIL_FR),
    # PUB1-17 RETIRÉE PAR ÉCRIT (D348, campagne rejouée en entier après ce retrait). « La fiche d'une salle introuvable répond 200 au lieu de 404 » (`if (!venue) notFound();`) est DÉJÀ gardée par
    # le PRÉCHAUFFAGE de la suite (`e2e/specs/warmup.setup.ts`, projet dont dépend `chromium`) : il visite une fiche inconnue et exige un 404 par `expect(...).toEqual([])`. Mesuré aux passes 1 et 2
    # (`→ 200 (404 attendu : la route compilée, l'identifiant inconnu)`) : la mutation MORD, mais au préchauffage, AVANT qu'un test de la spec ne démarre — la spec ne peut pas la mesurer seule, et
    # le harnais refuse (à raison) de juger une mesure sans ligne [chromium]. La numérotation garde le trou : les cibles ne se renumérotent pas.
    cible("PUB1-18. la carte d'une salle qui a une photo annonce « aucune photo »", CARTE,
          [("{venue.coverThumbUrl ? (", "{false ? (")], "e2e-m1", M1_FICHE_FR),
    cible("PUB1-19. en arabe, la carte affiche le nom français", CARTE,
          [("const name = ar ? venue.nameAr : venue.nameFr;", "const name = venue.nameFr;")], "e2e-m1", M1_ACCUEIL_AR),
    cible("PUB1-20. la fiche est gardée 300 s : une salle renommée, masquée ou supprimée y reste vue (le défaut mesuré par M-3)", CLIENT_API,
          [("`${API_URL}/api/v1/venues/${encodeURIComponent(slug)}`, {\r\n      cache: \"no-store\"", "`${API_URL}/api/v1/venues/${encodeURIComponent(slug)}`, {\r\n      next: { revalidate: 300 }")], "e2e-m3", M3),
    # ── Le Pro : ce que le pro lit
    # ⛔ ANCRE RÉVISÉE LE 18/11/2026 (D352, rang 54) : la carte de « Mes salles » ne rend plus `PublicationBadge` directement mais `PublicationListBadge` (R-1) — l'ancre d'AVANT (`<PublicationBadge status={venue.publicationStatus} />`) n'existait plus : le lanceur `lancer-touchees.py` l'a trouvée PÉRIMÉE (« ARBRE NON CONFORME AU DÉPART : PUB1-21 : ancre ×0 »), la campagne ne démarrait pas. La cible mesure la MÊME chose (le pro ne lit plus l'état de publication de sa salle : le badge disparaît) ; campagne REJOUÉE EN ENTIER (`--e2e`).
    cible("PUB1-21. le pro ne lit plus l'état de publication de sa salle (le badge disparaît)", PRO_LIST,
          [("<PublicationListBadge venue={venue} />", "{null}")], "e2e-m2", M2),
]


def _binaire(nom: str) -> str:
    """Résout l'exécutable AVANT `subprocess.run` (Windows : `pnpm.cmd`)."""
    return shutil.which(nom) or nom


def lancer(mesure: str) -> tuple[int, str]:
    cmd = MESURES[mesure]
    r = subprocess.run([_binaire(cmd[0]), *cmd[1:]], capture_output=True, text=True, encoding="utf-8", errors="replace")
    return r.returncode, ANSI.sub("", (r.stdout or "") + "\n" + (r.stderr or ""))


def lire_vitest(sortie: str, titre: str | None) -> tuple[str, str]:
    """Rend (verdict, détail). Verdicts : VERT, MORD, SANS-TITRE, PAS-ASSERTION, NON-DÉMARRÉE, VERSION."""
    if f"RUN  {VITEST_ATTENDU}" not in sortie:
        m = re.search(r"RUN\s+(v\S+)", sortie)
        return "VERSION", f"vitest {m.group(1) if m else 'introuvable'}, {VITEST_ATTENDU} attendu"
    ligne = re.search(r"^\s*Tests\s+(.*)$", sortie, re.M)
    if not ligne:
        return "NON-DÉMARRÉE", "aucune ligne « Tests »"
    echecs = int(m.group(1)) if (m := re.search(r"(\d+) failed", ligne.group(1))) else 0
    passes = int(m.group(1)) if (m := re.search(r"(\d+) passed", ligne.group(1))) else 0
    if passes + echecs == 0:
        return "NON-DÉMARRÉE", f"exécutés 0 ({ligne.group(0).strip()})"
    if titre is None or echecs == 0:
        return ("VERT" if echecs == 0 else "ROUGE"), f"passés {passes} · en échec {echecs}"
    if not any("×" in l and titre in l for l in sortie.splitlines()):
        return "SANS-TITRE", f"en échec {echecs}, aucun « × » ne porte « {titre} »"
    # ⚠ DÉFAUT DE LECTEUR RÉPARÉ (D298), vu à la première passe : vitest REGROUPE sous un seul message les tests qui
    # échouent de la même façon — plusieurs en-têtes « FAIL … » d'affilée, PUIS l'erreur. La première version prenait
    # la ligne suivant l'en-tête du titre : c'était un autre en-tête, et elle déclarait « PAS-ASSERTION » une morsure.
    lignes = sortie.splitlines()
    premiere = "—"
    for i, l in enumerate(lignes):
        if l.strip().startswith("FAIL ") and titre in l:
            premiere = next((x.strip() for x in lignes[i + 1:] if x.strip() and not x.strip().startswith("FAIL ")), "—")
            break
    if not premiere.startswith("AssertionError"):
        return "PAS-ASSERTION", f"première ligne du bloc : {premiere[:140]}"
    return "MORD", f"passés {passes} · en échec {echecs} · {premiere[:140]}"


def lire_playwright(sortie: str, titre: str | None) -> tuple[str, str]:
    echecs = [l for l in sortie.splitlines() if re.match(r"^\s+x\s+\d+ \[chromium\]", l)]
    oks = [l for l in sortie.splitlines() if re.match(r"^\s+ok\s+\d+ \[chromium\]", l)]
    if not echecs and not oks:
        return "NON-DÉMARRÉE", "aucune ligne de test [chromium] (serveurs ? base ?)"
    if titre is None or not echecs:
        return ("VERT" if not echecs else "ROUGE"), f"ok {len(oks)} · x {len(echecs)}"
    if not any(titre in l for l in echecs):
        return "SANS-TITRE", f"x {len(echecs)}, aucun ne porte « {titre} »"
    # ⚠ DÉFAUT DE LECTEUR RÉPARÉ (D298, D312), vu à la campagne officielle : un `beforeAll` en échec (ici `ECONNREFUSED`,
    # l'API de développement redémarrait) marque le test « x … (0ms) » — son CORPS n'a jamais tourné, la mutation n'a
    # jamais été exercée. La première version le jugeait « PAS-ASSERTION », donc MUETTE : le faux négatif de D286, un
    # verdict sur une garde qui n'a pas été mesurée. C'est une mesure NON DÉMARRÉE, et le harnais refuse de juger.
    if any(titre in l and l.rstrip().endswith("(0ms)") for l in echecs):
        return "NON-DÉMARRÉE", "le test visé a échoué en 0 ms : son corps n'a pas tourné (crochet en échec)"
    bloc = re.search(rf"\d+\) \[chromium\] .*{re.escape(titre)}.*?\n(.*?)attachment #1", sortie, re.S)
    texte = bloc.group(1) if bloc else ""
    if "expect(" not in texte:
        return "PAS-ASSERTION", "le bloc d'erreur ne porte pas « expect( »"
    premiere = next((l.strip() for l in texte.splitlines() if l.strip().startswith("Error:")), "—")
    return "MORD", f"ok {len(oks)} · x {len(echecs)} · {premiere[:140]}"


def lire(mesure: str, sortie: str, titre: str | None) -> tuple[str, str]:
    return lire_playwright(sortie, titre) if MODE[mesure] == "e2e" else lire_vitest(sortie, titre)


# ── CALIBRATION DU LECTEUR, à chaque lancement : chaque bras doit rendre SON verdict, sinon ABANDON (D286). Les
# échantillons reproduisent des sorties RÉELLES, versées sous `docs/preuves/D316/` : le regroupement d'en-têtes
# (`neutralisation/forme-groupee-extrait.txt`), l'échec d'un matcher jest-dom (`neutralisation/campagne-r25-unit-extrait.txt`,
# R25-7), le bloc d'erreur de Playwright (`e2e/rouge-defaut1-extrait.txt`), le crochet en échec
# (`neutralisation/premiere-passe-officielle/R25-E2-extrait.txt`). ⚠ Le `TypeError` de `toMatch` sur `undefined` a été lu
# à la PREMIÈRE course rouge d'intégration, dont le journal a été ÉCRASÉ par la seconde (même nom) : sa forme — « × »,
# en-tête `FAIL`, première ligne `TypeError: …` — est celle du cas `CAS-PLANTAGE` versé par D304
# (`docs/preuves/D304/r1/signatures/sorties/tests.defaut.txt`).
_V = " RUN  v3.2.7 C:/x\n"
CALIBRATION = [
    ("vitest, en-têtes REGROUPÉS puis AssertionError", "vitest", _V
     + "   × d > 93 jour(s) : t 8ms\n   × d > 182 jour(s) : t 1ms\n"
       " FAIL  a.test.ts > d > 93 jour(s) : t\n FAIL  a.test.ts > d > 182 jour(s) : t\n"
       "AssertionError: expected false to be true // Object.is equality\n      Tests  7 failed | 9 passed (16)\n",
     "182 jour(s) : t", "MORD"),
    ("vitest, plantage (TypeError)", "vitest", _V
     + "   × d > t 219ms\n FAIL  a.test.ts > d > t\nTypeError: .toMatch() expects to receive a string, but got undefined\n"
       "      Tests  1 failed | 18 passed (19)\n", "t", "PAS-ASSERTION"),
    ("vitest, matcher jest-dom (Error, pas AssertionError)", "vitest", _V
     + "   × d > t 12ms\n FAIL  a.test.ts > d > t\nError: expect(element).toHaveAttribute(\"href\", \"/x\")\n"
       "      Tests  1 failed | 13 passed (14)\n", "t", "PAS-ASSERTION"),
    ("vitest, rien d'exécuté sous filtre", "vitest", _V + "      Tests  25 skipped (25)\n", "t", "NON-DÉMARRÉE"),
    ("vitest, autre version", "vitest", " RUN  v3.2.6 C:/x\n      Tests  1 failed (1)\n", "t", "VERSION"),
    ("playwright, assertion", "e2e",
     "  x  2 [chromium] › specs\\a.e2e.ts:1:1 › titre (1.0s)\n\n  1) [chromium] › specs\\a.e2e.ts:1:1 › titre \n\n"
     "    Error: message\n\n    Timed out 7000ms waiting for expect(locator).toHaveCount(expected)\n\n"
     "    attachment #1: screenshot\n", "titre", "MORD"),
    ("playwright, plantage sans expect(", "e2e",
     "  x  2 [chromium] › specs\\a.e2e.ts:1:1 › titre (1.0s)\n\n  1) [chromium] › specs\\a.e2e.ts:1:1 › titre \n\n"
     "    Error: page.goto: net::ERR_CONNECTION_REFUSED\n\n    attachment #1: screenshot\n", "titre", "PAS-ASSERTION"),
    ("playwright, rien d'exécuté", "e2e", "Error: Timed out waiting 180000ms from config.webServer.\n", "titre",
     "NON-DÉMARRÉE"),
    # Relevé sur `.neutralisation-journaux/r25/R25-E2.log`, campagne officielle du 27/09/2026 (versé : D316).
    ("playwright, crochet en échec (0 ms, did not run)", "e2e",
     "  x  2 [chromium] › specs\\a.e2e.ts:30:7 › titre (0ms)\n  -  3 [chromium] › specs\\a.e2e.ts:30:7 › autre\n\n"
     "  1) [chromium] › specs\\a.e2e.ts:30:7 › titre \n\n    Error: POST http://localhost:3101/api/v1/auth/register a échoué"
     " après 66 ms.\n      TypeError: fetch failed\n\n    attachment #1: trace\n  1 failed\n  1 did not run\n", "titre",
     "NON-DÉMARRÉE"),
    # Relevé sur `docs/preuves/D304/r1/signatures/sorties/crochet.defaut.txt` (vitest 3.2.7, crochet en échec).
    ("vitest, crochet en échec (bloc de FICHIER, 1 skipped)", "vitest", _V
     + " Test Files  1 failed (1)\n      Tests  1 skipped (1)\n FAIL  cas/crochet.cas.ts [ cas/crochet.cas.ts ]\n"
       "Error: crochet en panne\n", "t", "NON-DÉMARRÉE"),
]


def calibrer() -> bool:
    manques = 0
    for nom, genre, texte, titre, attendu in CALIBRATION:
        verdict, _ = lire_playwright(texte, titre) if genre == "e2e" else lire_vitest(texte, titre)
        manques += verdict != attendu
        print(f"  calibration {'✓' if verdict == attendu else '✗'} {nom} : {verdict} (attendu {attendu})")
    print(f"  calibration : {len(CALIBRATION)} bras · {manques} manqué(s) (attendu 0)")
    return manques == 0


def _ecrire_manifeste(actions: list) -> None:
    os.makedirs(SAUVEGARDE, exist_ok=True)
    io.open(MANIFESTE, "w", encoding="utf-8", newline="").write(json.dumps(actions, ensure_ascii=False))


def _defaire(actions: list) -> None:
    for action in reversed(actions):
        io.open(action["chemin"], "w", encoding="utf-8", newline="").write(action["contenu"])


def restaurer_si_interrompu() -> None:
    if os.path.isfile(MANIFESTE):
        actions = json.load(io.open(MANIFESTE, encoding="utf-8"))
        _defaire(actions)
        print(f"↺ arbre restauré après une exécution interrompue ({len(actions)} fichier(s)).")
    shutil.rmtree(SAUVEGARDE, ignore_errors=True)


def _poser(source: str, remplacements: list) -> tuple[str | None, str]:
    """Pose TOUS les remplacements d'une cible et prouve chacun : ancre 1 → 0 ET marqueur n → n + 1 (D286). Rend (contenu muté | None, détail)."""
    courant, preuves = source, []
    for avant, apres in remplacements:
        a1, m1 = courant.count(avant), courant.count(apres)
        if a1 != 1:
            return None, f"ERREUR DE SCRIPT : {a1} occurrence(s), 1 attendue pour « {avant[:60]} »"
        courant = courant.replace(avant, apres)
        a2, m2 = courant.count(avant), courant.count(apres)
        if (a2, m2) != (0, m1 + 1):
            return None, f"MUTATION NON POSÉE : ancre {a1}→{a2}, marqueur {m1}→{m2} (attendu 1→0 et {m1}→{m1 + 1})"
        preuves.append(f"ancre 1→0 · marqueur {m1}→{m2}")
    return courant, " ; ".join(preuves)


def prouver_poses() -> bool:
    """EN MÉMOIRE, sans rien écrire : chaque mutation est posable (ancre 1 → 0, marqueur n → n + 1) — c'est la moitié que les harnais ne relisaient pas (D286)."""
    echecs = 0
    for c in CIBLES:
        source = io.open(c["fichier"], encoding="utf-8", newline="").read()
        mute, detail = _poser(source, c["remplacements"])
        if mute is None:
            echecs += 1
        print(f"  pose {'✓' if mute is not None else '✗'} {c['libelle'].split('.')[0]} : {detail}")
    print(f"  pose : {len(CIBLES)} cible(s) · {echecs} non posable(s) (attendu 0)")
    return echecs == 0


def verifier_arbre(moment: str) -> bool:
    """Chaque ancre est là, UNE fois, et aucune mutation ne traîne."""
    ecarts = []
    for c in CIBLES:
        src = io.open(c["fichier"], encoding="utf-8", newline="").read()
        for avant, _ in c["remplacements"]:
            if src.count(avant) != 1:
                ecarts.append(f"{c['libelle'].split('.')[0]} : ancre ×{src.count(avant)} dans {c['fichier']}")
    if ecarts:
        print(f"✗ ARBRE NON CONFORME {moment} : " + " ; ".join(sorted(set(ecarts))))
        return False
    return True


def main(argv: list[str]) -> int:
    modes = {"unit"} | ({"e2e"} if "--e2e" in argv else set())
    seul_ancres = "--ancres" in argv
    # --seulement=PUB1-11,PUB1-19 : ne joue que ces cibles (campagne reprise après une cible corrigée ; la reprise se DÉCLARE dans la pièce).
    seul = next((a.split("=", 1)[1].split(",") for a in argv if a.startswith("--seulement=")), None)
    restaurer_si_interrompu()
    if not calibrer():
        print("✗ ABANDON : le lecteur manque un bras de sa calibration — rien n'est mesuré.")
        return 2
    if not verifier_arbre("AU DÉPART"):
        return 2
    if not prouver_poses():
        return 2
    if seul_ancres:
        return 0
    os.makedirs(JOURNAUX, exist_ok=True)

    jouees = [c for c in CIBLES if MODE[c["mesure"]] in modes and (seul is None or c["libelle"].split(".")[0] in seul)]
    horsjeu = [c for c in CIBLES if MODE[c["mesure"]] not in modes] if seul is None else []
    print(f"cibles : {len(CIBLES)} déclarées · {len(jouees)} jouées ({', '.join(sorted(modes))}) · {len(horsjeu)} hors exécution")

    # ── PRÉ-VOL : la mesure, SANS mutation, doit être verte et avoir DÉMARRÉ (au moins un test exécuté).
    for mesure in sorted({c["mesure"] for c in jouees}):
        code, sortie = lancer(mesure)
        verdict, detail = lire(mesure, sortie, None)
        if code != 0 or verdict != "VERT":
            print(f"✗ PRÉ-VOL {mesure} : code {code}, {verdict} — {detail}")
            print(sortie[-3000:])
            return 2
        print(f"  pré-vol {mesure} : code 0 · {detail}")

    mordu, muettes, erreurs = 0, [], []
    for cible in jouees:
        chemin = cible["fichier"]
        source = io.open(chemin, encoding="utf-8", newline="").read()
        mute, posee = _poser(source, cible["remplacements"])
        if mute is None:
            print(f"✗ {cible['libelle']}\n   {posee}")
            erreurs.append(cible["libelle"])
            break
        annuler = [{"chemin": chemin, "contenu": source}]
        _ecrire_manifeste(annuler)
        io.open(chemin, "w", encoding="utf-8", newline="").write(mute)
        try:
            code, sortie = lancer(cible["mesure"])
        finally:
            _defaire(annuler)
            shutil.rmtree(SAUVEGARDE, ignore_errors=True)
        # La sortie ENTIÈRE se journalise : un rouge qu'on ne peut plus relire se relance sans être lu (D270).
        ident = cible["libelle"].split(".")[0]
        io.open(os.path.join(JOURNAUX, f"{ident}.log"), "w", encoding="utf-8").write(sortie)
        verdict, detail = lire(cible["mesure"], sortie, cible["titre"])
        if verdict == "MORD" and code != 0:
            mordu += 1
            print(f"✓ {cible['libelle']}\n   {posee} · code {code} · {detail}")
        elif verdict in ("VERSION", "NON-DÉMARRÉE"):
            print(f"✗ {cible['libelle']}\n   MESURE NON DÉMARRÉE ou non jugeable : {verdict} — {detail}")
            erreurs.append(cible["libelle"])
            break
        else:
            muettes.append(cible["libelle"])
            print(f"✗ {cible['libelle']}\n   {posee} · code {code} · {verdict} — {detail}")

    for c in horsjeu:
        print(f"  NON MESURÉE : {c['libelle']} — mesure « {c['mesure']} », relancer avec --{MODE[c['mesure']]}")
    conforme = verifier_arbre("À L'ARRIVÉE")
    print(f"\n{mordu} garde(s) mordue(s) sur {len(jouees)} cible(s) jouée(s) · {len(horsjeu)} non mesurée(s) "
          f"(attendu : {len(jouees)} sur {len(jouees)})")
    if conforme:
        print("arbre rendu à son état de départ : vérifié.")
    if erreurs or not conforme:
        return 2
    if muettes:
        return 1
    return 3 if horsjeu else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
