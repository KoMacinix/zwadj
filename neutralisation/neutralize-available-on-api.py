#!/usr/bin/env python3
"""Campagne de neutralisation — volet API du lot `availableOn`.

Mêmes règles que le volet client : chaque garde est désactivée, le test visé
DOIT rougir, et le script ASSERTE son nombre de remplacements (un remplacement
à zéro laisserait `vitest -t` sortir 0 et se lirait « garde muette »).

⛔ RÉÉCRIT PAR LE LOT DE DÉBLOCAGE (D312, rang 23 — exception bornée à D270,
arbitrée par Ko, D311). Jusque-là ce harnais n'avait JAMAIS lancé sa mesure sur
le poste de Ko : il appelait vitest par un chemin RELATIF à la racine
(`apps/api/node_modules/.bin\\vitest.CMD`) en se plaçant dans `apps/api` —
« 'apps' is not recognized » —, jetait la sortie, et comptait « ROUGE » tout code
non nul : treize « mordues » en 0 s à chaque certification (D310). Modes de
défaillance : `ZWADJ_CONTINUITE.md`, point d'entrée du rang 23, « MODES DE
DÉFAILLANCE DU HARNAIS » (MD-AOA-1 à 9), écrits AVANT ce correctif.

CE QUI EST EXIGÉ, DANS CET ORDRE — un seul manquement et le harnais REFUSE DE
JUGER (code 2) au lieu de compter :
  1. la version de vitest résolue par `apps/api` est celle sur laquelle la
     lecture est calibrée (MD-AOA-6) ;
  2. la CALIBRATION, rejouée à CHAQUE lancement, cinq bras (MD-AOA-7) : le
     défaut de D310 rejoué tel quel, une commande introuvable, un filtre sans
     titre ⇒ NON DÉMARRÉE ; la mutation de A1 ⇒ MORDUE, échec LU en
     `AssertionError` ; une mutation neutre ⇒ VERTE ;
  3. le PRÉ-VOL, une fois par mesure distincte, sur l'arbre NON muté : code 0,
     exécutés > 0, 0 en échec, aucun bloc d'échec de fichier (MD-AOA-4) ;
  4. sous mutation : MORDUE ⇔ au moins un test EN ÉCHEC et son bloc LU
     (MD-AOA-3) ; VERTE ⇒ la garde est MUETTE ; exécutés = 0 ou aucune ligne
     « Tests » ⇒ NON DÉMARRÉE (MD-AOA-1, -2) ; code ≠ 0 sans test en échec ⇒
     PANNE. NON DÉMARRÉE et PANNE ne sont JAMAIS une morsure.
  ⚠ « Exécutés » = passés + en échec, JAMAIS le total entre parenthèses : sous
  `-t`, vitest compte les tests écartés par le filtre — « Tests 25 skipped (25) »,
  25 collectés, AUCUN exécuté, code 0 (mesuré, D312 ; D144).

⚠ LANCEMENT (MD-AOA-1) : celui des harnais API qui fonctionnent
(`neutralize-s11a.py`, `-s11b.py`, `-rang23.py`) — `pnpm --filter @zwadj/api exec
vitest run <spec> -t <filtre>`, `pnpm` résolu par `shutil.which`, depuis la
RACINE, sans `cwd`. Aucun chemin relatif qui dépende du dossier courant.
⚠ Chaque sortie de mesure est écrite ENTIÈRE dans
`.neutralisation-journaux/available-on-api/` (MD-AOA-5) ; la ligne de verdict
porte exécutés, en échec, le titre en échec et la première ligne de son bloc.
Un délai dépassé y compte comme un échec : hors du chemin de l'argent, rien ne
l'exclut — il se LIT (limite déclarée).
⚠ `lancer-campagnes.py` compte « mordue » toute ligne qui commence par « ✓ »
sans « vol » (MD-AOA-8) : seules les cibles MORDUES commencent par « ✓ ».
⚠ Hors du chemin de l'argent : aucune des six branches de la règle de portée
(D311). Les `CIBLES` sont INCHANGÉES (MD-AOA-9) : `verifier-mutations.py`, la
reproduction et l'énumération de D310 les lisent.

Codes de sortie : 0 = toutes les cibles de la plage mordent · 1 = au moins une
garde MUETTE · 2 = refus de juger (version, calibration, pré-vol, mesure non
démarrée ou en panne) ou erreur de script.
Usage, depuis la racine :
    python3 neutralisation/neutralize-available-on-api.py            # toutes les cibles
    python3 neutralisation/neutralize-available-on-api.py 1 2        # une plage
"""

import io
import json
import os
import re
import shutil
import subprocess
import sys

# ⛔ LA CONSOLE WINDOWS EST EN cp1252 : le premier « ✓ » imprimé fait LEVER ce
#   script (UnicodeEncodeError), APRÈS le pré-vol — donc après avoir payé la
#   mesure, et avec une trace Python qui ressemble à un défaut de harnais
#   alors que la campagne allait bien. Propagé aux 21 scripts le 30/08/2026
#   (D268) : avant lui, AUCUN harnais n'avait jamais tourné sur ce poste.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

ENV = {"DATABASE_URL": "postgresql://x:x@localhost:5432/x"}

CIBLES = [
    (
        "A1. Le refus de date passée est retiré",
        "apps/api/src/venues/venues-public.service.ts",
        "if (civilUtcMs(date) < civilUtcMs(aujourdhui)) this.throwAvailableOnPast();",
        "/* neutralisé */",
        1,
        "date passée",
        "src/venues/venues-public.service.spec.ts",
    ),
    (
        "A2. La borne devient `<=` : aujourd'hui est refusé à tort",
        "apps/api/src/venues/venues-public.service.ts",
        "if (civilUtcMs(date) < civilUtcMs(aujourdhui)) this.throwAvailableOnPast();",
        "if (civilUtcMs(date) <= civilUtcMs(aujourdhui)) this.throwAvailableOnPast();",
        1,
        "AUJOURD'HUI EST ACCEPTÉ",
        "src/venues/venues-public.service.spec.ts",
    ),
    (
        "A3. `PENDING` est rechargé : une demande en attente grise",
        "apps/api/src/venues/venues-public.service.ts",
        "status: { in: [...HARD_BOOKING_STATUSES] },",
        'status: { in: ["PENDING", ...HARD_BOOKING_STATUSES] },',
        1,
        "PENDING",
        "src/venues/venues-public.service.spec.ts",
    ),
    (
        "A4. La fenêtre retombe à minuit + 24 h (la soirée 20h→02h ment)",
        "apps/api/src/venues/availability-time.ts",
        "return civilDayStartMs(date) + SLOT_END_MAX_MINUTES * MINUTE_MS;",
        "return civilDayStartMs(date) + 1440 * MINUTE_MS;",
        1,
        "48 H",
        "src/venues/venues-public.service.spec.ts",
    ),
    (
        # ⚠ CIBLE REMPLACÉE. Elle neutralisait `null` -> `false` sur une branche
        # qui N'EXISTE PLUS : l'exclusion vit désormais dans le `where`.
        # Laissée telle quelle, elle a échoué en ERREUR DE SCRIPT — donc
        # bruyamment, pas en vert. C'est exactement à ça que sert
        # l'assertion de comptage : une décision inversée périme ses cibles.
        "A5. L'exclusion des salles sans créneau (situation B) quitte le `where`",
        "apps/api/src/venues/venues-public.service.ts",
        "      ...(annotateOn === null ? {} : { slotTemplates: { some: ACTIVE_SLOT } }),",
        "",
        1,
        "SITUATION B",
        "src/venues/venues-public.service.spec.ts",
    ),
    (
        "A6. Le regroupement par salle saute : les salles se contaminent",
        "apps/api/src/venues/venues-public.service.ts",
        "bookings: (bookingsByVenue.get(row.id) ?? []) as BookingWindow[],",
        "bookings: [...bookingsByVenue.values()].flat() as BookingWindow[],",
        1,
        "CONTAMINENT",
        "src/venues/venues-public.service.spec.ts",
    ),
    (
        "A7. `singleSlot` est câblé en dur à `false`",
        "apps/api/src/venues/venues-public.service.ts",
        'singleSlot: row.bookingMode === "SINGLE_SLOT"',
        "singleSlot: false",
        1,
        "SINGLE_SLOT",
        "src/venues/venues-public.service.spec.ts",
    ),
    (
        "A8. L'annotation devient un FILTRE (la salle grisée quitte la page)",
        "apps/api/src/venues/venues-public.service.ts",
        "      items: rows.map((row) => this.toSummary(row, availability)),",
        "      items: rows.filter((row) => availability.get(row.id) !== false).map((row) => this.toSummary(row, availability)),",
        1,
        "ANNOTER N'EST PAS FILTRER",
        "src/venues/venues-public.service.spec.ts",
    ),
    (
        "A9. L'écho `availableOn` disparaît de la réponse",
        "apps/api/src/venues/venues-public.service.ts",
        "      availableOn: query.availableOn ?? null",
        "      availableOn: null",
        1,
        "ANNOTER N'EST PAS FILTRER",
        "src/venues/venues-public.service.spec.ts",
    ),
    (
        "A10. `computeDayAvailability` cesse de déléguer (seconde autorité)",
        "apps/api/src/venues/availability-engine.ts",
        "  return computeDaySlotStatuses({ dayStartMs, slots, bookings, blocks, singleSlot }).map((entry) => {",
        "  const st = computeDaySlotStatuses({ dayStartMs, slots, bookings, blocks, singleSlot });\r\n  return st.map((entry) => {",
        1,
        "DÉLÈGUE",
        "src/venues/availability-engine.spec.ts",
    ),
    (
        "B1. Le 404 de routage n'est plus normalisé (retour à l'enveloppe brute de Nest)",
        "apps/api/src/common/filters/all-exceptions.filter.ts",
        "    if (exception instanceof NotFoundException && !carriesCode(body)) {",
        "    if (false as boolean) {",
        1,
        "ROUTE INCONNUE",
        "src/common/filters/all-exceptions.filter.spec.ts",
    ),
    (
        "B2. TOUS les 404 sont réécrits : le code métier est écrasé",
        "apps/api/src/common/filters/all-exceptions.filter.ts",
        "    if (exception instanceof NotFoundException && !carriesCode(body)) {",
        "    if (exception instanceof NotFoundException) {",
        1,
        "404 MÉTIER",
        "src/common/filters/all-exceptions.filter.spec.ts",
    ),
    (
        "A13. L'exclusion mord AUSSI sans date (elle retire trop large)",
        "apps/api/src/venues/venues-public.service.ts",
        "      ...(annotateOn === null ? {} : { slotTemplates: { some: ACTIVE_SLOT } }),",
        "      ...{ slotTemplates: { some: ACTIVE_SLOT } },",
        1,
        "SANS `availableOn`, AUCUNE exclusion",
        "src/venues/venues-public.service.spec.ts",
    ),
]


# ── Sécurité de reprise ─────────────────────────────────────────────────────
# ⚠ DÉFAUT RÉEL RENCONTRÉ : ce script a été tué par un `timeout` externe. Le
# `finally` de restauration n'a alors PAS tourné, et l'arbre de travail est
# resté avec une garde neutralisée — c'est-à-dire un fichier sciemment cassé,
# indiscernable à l'œil. Un lot construit dans cet état aurait embarqué la
# faute. Le `finally` protège de l'exception, pas du signal.
#
# Parade : les originaux sont écrits sur disque AVANT toute mutation, et un
# démarrage les restaure s'ils traînent encore d'une exécution interrompue.
# ⛔ CE SCRIPT SE LANCE DEPUIS LA RACINE DU MONOREPO, jamais depuis son propre
#   dossier : tous ses chemins sont relatifs au DOSSIER COURANT. Sans cette
#   garde, un `cd neutralisation` produirait « ERREUR DE SCRIPT : 0
#   occurrence(s) » — un message qui envoie chercher un défaut de code là où il
#   n'y a qu'un dossier de travail.
if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO (pnpm-workspace.yaml introuvable).")
    print(f"  dossier courant : {os.getcwd()}")
    print(f"  → python3 neutralisation/{os.path.basename(__file__)}")
    sys.exit(2)

SAUVEGARDE = ".neutralisation-sauvegarde"
JOURNAUX = os.path.join(".neutralisation-journaux", "available-on-api")
# La lecture de la ligne « Tests » est calibrée sur CETTE version (MD-AOA-6).
VITEST_CALIBRE = "3.2.7"
VITEST_PAQUET = os.path.join("apps", "api", "node_modules", "vitest", "package.json")
ANSI = re.compile(r"\x1b\[[0-9;]*m")
RESUME = re.compile(r"^\s*Tests\s+(.+?)\s*$", re.M)
# « FAIL  <spec> > <describe> > <titre> » : un TEST en échec. Le bloc d'échec de
# FICHIER s'écrit « FAIL  <spec> [ <spec> ] » (collecte, import, crochet — D304).
ECHEC_TEST = re.compile(r"^\s*FAIL\s+\S+\s+>\s+(.+?)\s*$")
ECHEC_FICHIER = re.compile(r"^\s*FAIL\s+\S+\s+\[\s", re.M)
FILTRE_SANS_TITRE = "motif-sans-titre-d312-qq"


def _binaire(nom: str) -> str:
    """Résout l'exécutable AVANT `subprocess.run`.

    ⚠ Windows : `pnpm` est un `pnpm.cmd`, et `CreateProcess` ne consulte PAS
    `PATHEXT` — il ne cherche qu'un `.exe`, échoue en `WinError 2`, et la
    campagne meurt avant d'avoir mesuré quoi que ce soit. `shutil.which`, lui,
    consulte `PATHEXT` et rend le chemin complet. Sur POSIX il rend le même nom.
    ⛔ Il ne rend un chemin ABSOLU que pour un NOM cherché dans le PATH : pour un
    chemin relatif (`apps/api/…`), il rend ce chemin relatif — résolu depuis le
    dossier COURANT du processus qui le lance. C'était le défaut de D310.
    """
    return shutil.which(nom) or nom


def mesure(fichier: str, filtre: str) -> list:
    """La commande des harnais API qui fonctionnent, lancée depuis la racine (MD-AOA-1)."""
    return ["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", fichier, "-t", filtre]


def restaurer_si_interrompu() -> None:
    if not os.path.isdir(SAUVEGARDE):
        return
    for nom in os.listdir(SAUVEGARDE):
        chemin = nom.replace("__", "/")
        contenu = io.open(os.path.join(SAUVEGARDE, nom), encoding="utf-8", newline="").read()
        io.open(chemin, "w", encoding="utf-8", newline="").write(contenu)
        print(f"↺ restauré après interruption : {chemin}")
    shutil.rmtree(SAUVEGARDE)


def sauver(chemin: str, contenu: str) -> str:
    os.makedirs(SAUVEGARDE, exist_ok=True)
    nom = os.path.join(SAUVEGARDE, chemin.replace("/", "__"))
    io.open(nom, "w", encoding="utf-8", newline="").write(contenu)
    return nom


def lancer(commande: list, journal: str, cwd=None):
    """Lance la commande et ÉCRIT SA SORTIE ENTIÈRE dans `journal` (MD-AOA-5) : un
    rouge qu'on ne peut plus relire se relance sans être lu (D270). Rend (code,
    sortie sans ANSI). Une commande que le système ne trouve pas (POSIX :
    `FileNotFoundError`) rend le code `None` : elle n'a pas démarré."""
    try:
        r = subprocess.run(
            [_binaire(commande[0]), *commande[1:]],
            cwd=cwd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            env={**os.environ, **ENV},
        )
        code, sortie = r.returncode, (r.stdout or "") + "\n--- stderr ---\n" + (r.stderr or "")
    except OSError as e:
        code, sortie = None, f"--- OSError : {e} ---"
    sortie = ANSI.sub("", sortie)
    os.makedirs(JOURNAUX, exist_ok=True)
    with io.open(os.path.join(JOURNAUX, journal), "w", encoding="utf-8", newline="") as f:
        f.write(f"$ {' '.join(commande)}{f'   (cwd : {cwd})' if cwd else ''}\n{sortie}\n--- code de sortie : {code} ---\n")
    return code, sortie


def lire(code, sortie: str):
    """Lit UNE mesure (MD-AOA-1 à 3). Rend (état, détail, premières lignes des
    blocs d'échec de test). États : MORDUE, VERTE, NON DÉMARRÉE, PANNE."""
    resumes = RESUME.findall(sortie)
    if not resumes:
        return "NON DÉMARRÉE", f"code {code} · aucune ligne « Tests » : la mesure n'a pas démarré", []
    resume = resumes[-1]

    def nombre(mot: str) -> int:
        m = re.search(rf"(\d+) {mot}\b", resume)
        return int(m.group(1)) if m else 0

    echecs, passes = nombre("failed"), nombre("passed")
    executes = echecs + passes
    lignes = sortie.splitlines()
    blocs = []
    for i, ligne in enumerate(lignes):
        m = ECHEC_TEST.match(ligne)
        if m:
            premiere = next((x.strip() for x in lignes[i + 1:i + 8] if x.strip()), "")
            blocs.append((m.group(1), premiere))
    fichier = len(ECHEC_FICHIER.findall(sortie))
    base = f"code {code} · exécutés {executes} · en échec {echecs} · « Tests {resume} »"
    if executes == 0:
        return "NON DÉMARRÉE", base + " — collecte à zéro : aucun test exécuté", blocs
    if echecs > 0 and code not in (0, None) and blocs:
        titre, premiere = blocs[0]
        delai = " ⚠ DÉLAI — à lire" if "timed out" in premiere.lower() else ""
        return "MORDUE", base + f" · « {titre} » · {premiere}{delai}", blocs
    if echecs == 0 and code == 0 and not fichier:
        return "VERTE", base, blocs
    return "PANNE", base + f" · blocs d'échec lus {len(blocs)} · blocs d'échec de FICHIER {fichier}", blocs


def muter_et_mesurer(cible, apres: str, journal: str):
    """Pose `apres` à la place de l'ancre, mesure, RESTAURE. Rend (code, sortie)."""
    libelle, chemin, avant, _, attendu, filtre, fichier = cible
    source = io.open(chemin, encoding="utf-8", newline="").read()
    vus = source.count(avant)
    if vus != attendu:
        raise RuntimeError(f"{libelle} : {vus} occurrence(s), {attendu} attendue(s) dans {chemin}")
    marque = sauver(chemin, source)
    io.open(chemin, "w", encoding="utf-8", newline="").write(source.replace(avant, apres))
    try:
        return lancer(mesure(fichier, filtre), journal)
    finally:
        io.open(chemin, "w", encoding="utf-8", newline="").write(source)
        os.remove(marque)


def calibrer() -> bool:
    """CINQ BRAS, abandon si un seul manque (MD-AOA-7) — rejoués à chaque lancement.
    Une calibration héritée n'est pas une calibration (D286)."""
    a1 = CIBLES[0]
    _, _, avant_a1, apres_a1, _, filtre_a1, fichier_a1 = a1
    bras = []
    # (i) LE DÉFAUT DE D310, REJOUÉ TEL QUEL : binaire relatif à la racine, lancé depuis `apps/api`.
    c, s = lancer(["apps/api/node_modules/.bin/vitest", "run", fichier_a1, "-t", filtre_a1],
                  "calibration-1-defaut-d310.txt", cwd="apps/api")
    bras.append(("(i) le défaut de D310 rejoué tel quel", "NON DÉMARRÉE", lire(c, s), None))
    # (ii) une commande introuvable, par `pnpm`.
    c, s = lancer(["pnpm", "--filter", "@zwadj/api", "exec", "vitest-introuvable-d312", "run", fichier_a1],
                  "calibration-2-commande-introuvable.txt")
    bras.append(("(ii) commande introuvable", "NON DÉMARRÉE", lire(c, s), None))
    # (iii) un filtre qui ne correspond à AUCUN titre : code 0, « Tests 25 skipped (25) » (D144).
    c, s = lancer(mesure(fichier_a1, FILTRE_SANS_TITRE), "calibration-3-filtre-sans-titre.txt")
    bras.append(("(iii) filtre sans titre", "NON DÉMARRÉE", lire(c, s), None))
    # (iv) une mutation CONNUE : A1 retire le refus de la date passée, deux tests en exigent le rejet.
    c, s = muter_et_mesurer(a1, apres_a1, "calibration-4-mutation-connue.txt")
    bras.append(("(iv) mutation connue (A1)", "MORDUE", lire(c, s), "AssertionError"))
    # (v) une mutation NEUTRE : l'ancre remplacée par elle-même.
    c, s = muter_et_mesurer(a1, avant_a1, "calibration-5-mutation-neutre.txt")
    bras.append(("(v) mutation neutre", "VERTE", lire(c, s), None))
    manques = 0
    for nom, attendu, (etat, detail, blocs), type_attendu in bras:
        ok = etat == attendu
        if ok and type_attendu:
            # L'échec est LU : chaque bloc d'échec de test commence par le type attendu.
            ok = bool(blocs) and all(p.startswith(type_attendu) for _, p in blocs)
            detail += f" · blocs lus {len(blocs)}, tous en {type_attendu} : {ok}"
        manques += not ok
        print(f"  calibration {nom} : {etat} (attendu {attendu}) — {detail} · {'OK' if ok else 'MANQUÉ'}")
    print(f"  calibration : {len(bras) - manques} bras sur {len(bras)} (attendu {len(bras)})")
    return manques == 0


def main(depuis: int = 1, jusqua: int = 99) -> int:
    restaurer_si_interrompu()
    version = json.load(io.open(VITEST_PAQUET, encoding="utf-8"))["version"] if os.path.isfile(VITEST_PAQUET) else None
    if version != VITEST_CALIBRE:
        print(f"✗ VERSION : vitest {version!r} résolu par apps/api, lecture calibrée sur {VITEST_CALIBRE} — "
              "le harnais REFUSE DE JUGER (MD-AOA-6).")
        return 2
    print(f"  version de vitest : {version} (lecture calibrée sur {VITEST_CALIBRE})")
    try:
        calibre = calibrer()
    except RuntimeError as e:
        print(f"✗ CALIBRATION : ERREUR DE SCRIPT — {e}")
        return 2
    if not calibre:
        print("✗ CALIBRATION : un bras au moins a manqué son verdict — ABANDON, rien n'est jugé (D286).")
        return 2

    plage = [(r, c) for r, c in enumerate(CIBLES, start=1) if depuis <= r <= jusqua]
    # ── PRÉ-VOL (MD-AOA-4) : une fois par mesure distincte, sur l'arbre NON muté.
    etats, refus = {}, []
    for _, (libelle, _, _, _, _, filtre, fichier) in plage:
        if (fichier, filtre) in etats:
            continue
        code, sortie = lancer(mesure(fichier, filtre), f"pre-vol-{len(etats) + 1}.txt")
        etat, detail, _ = lire(code, sortie)
        etats[(fichier, filtre)] = etat
        print(f"  · pré-vol {libelle.split('.')[0]} [{fichier} · -t « {filtre} »] : {etat} — {detail}")
        if etat != "VERTE":
            refus.append(libelle)
    if refus:
        print(f"✗ PRÉ-VOL : {len(refus)} mesure(s) ne démarrent pas ou ne sont pas vertes sur l'arbre NON muté "
              "— le harnais REFUSE DE JUGER.")
        return 2
    print(f"✓ Pré-vol : {len(etats)} mesure(s) démarrée(s) et verte(s) sur l'arbre non muté.\n")

    mordu, muettes, refusees = 0, [], []
    for rang, cible in plage:
        libelle, chemin, avant, apres, attendu = cible[:5]
        try:
            code, sortie = muter_et_mesurer(cible, apres, f"{libelle.split('.')[0]}.txt")
        except RuntimeError as e:
            print(f"✗ {libelle}\n   ERREUR DE SCRIPT : {e}")
            return 2
        etat, detail, _ = lire(code, sortie)
        if etat == "MORDUE":
            mordu += 1
            print(f"✓ {libelle}\n    {detail}")
        elif etat == "VERTE":
            muettes.append(libelle)
            print(f"✗ {libelle}\n   VERT malgré la neutralisation — cette garde ne mesure rien. {detail}")
        else:
            refusees.append(libelle)
            print(f"✗ {libelle}\n   {etat} — PAS une morsure : {detail}")

    # Le dossier de sauvegarde a été vidé fichier par fichier ; on retire la
    # coquille, sinon une campagne réussie laisse une trace dans `git status`
    # et le prochain lecteur se demande si quelque chose a mal tourné.
    if os.path.isdir(SAUVEGARDE) and not os.listdir(SAUVEGARDE):
        os.rmdir(SAUVEGARDE)

    print(f"\n{mordu} garde(s) mordue(s) sur {len(plage) - len(refusees)} cible(s) RÉELLEMENT MESURÉE(S) "
          f"(déclarées dans la plage : {len(plage)}) — morsure = au moins un test EN ÉCHEC, bloc LU.")
    print(f"journaux : {JOURNAUX} (une sortie entière par mesure)")
    for m in muettes:
        print(f"  muette : {m}")
    for m in refusees:
        print(f"  NON JUGÉE (non démarrée ou en panne) : {m}")
    return 2 if refusees else (1 if muettes else 0)


if __name__ == "__main__":
    sys.exit(main(int(sys.argv[1]) if len(sys.argv) > 1 else 1, int(sys.argv[2]) if len(sys.argv) > 2 else 99))
