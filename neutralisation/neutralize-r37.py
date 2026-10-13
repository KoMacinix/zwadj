#!/usr/bin/env python3
"""Campagne de neutralisation — RANG 37 (D331), LOT L35-1 : « Ma salle » — la liste des salles est relue après toute modification.

Ce que le lot ajoute, et que chaque cible neutralise (une garde neuve dont on n'a pas montré qu'elle mord est une assurance sans mesure) :
  · le FOURNISSEUR (`pro-venues-context.tsx`) : la relecture d'entrée silencieuse (`revalidate`), son garde `idleRef` (aucun effet pendant un chargement ou sur `error`), le drapeau
    `silentRef` consommé à chaque exécution (F-12), l'annulation par la lecture la plus récente (F-8), l'échec et la réponse malformée qui LAISSENT la liste connue (F-9), le compte
    connu conservé pendant une relecture voulue (F-17), la relecture voulue qui reste VISIBLE (P-9) ;
  · l'ASSISTANT (`edit-venue-page.tsx`) : la relecture après un enregistrement réussi et après une suppression réussie, jamais avant la réponse du serveur, jamais sur un échec ni sur un
    diff vide ; la LISTE (`venue-list-page.tsx`) : la relecture demandée à l'entrée, et jamais une lecture propre à la page (garde de source) ;
  · le FAUX SERVEUR HONNÊTE (`client-doubles.ts`) : une écriture n'enregistre qu'à sa réponse (D-1 à D-3) — le défaut de D326.
Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-r37.py
    R37_DECOUVERTE=1 python3 neutralisation/neutralize-r37.py   # n'écrit AUCUN verdict : liste les tests qui rougissent, par cible
Codes de sortie : 0 = tout joué, tout a mordu ; 1 = au moins une garde MUETTE ; 2 = pré-vol rouge, ERREUR DE SCRIPT, vitest non attendu, calibration manquée, ou arbre non conforme.

⛔ UNE MORSURE SE LIT, ELLE NE SE DÉDUIT PAS D'UN CODE DE SORTIE (D304, D305, D312, D316) : la ligne « Tests » compte au moins un test en échec (exécutés = passés + en échec) ; le titre attendu
porte « × » ; la PREMIÈRE ligne de son bloc « FAIL … > titre » — en-têtes regroupés sautés — est une `AssertionError`. ⚠ Le lot n'est PAS du chemin de l'argent (méthode NORMALE, D325 : il
affiche un montant reçu du serveur, il n'en calcule ni n'en écrit) : la lecture n'y est pas EXIGÉE ; elle est appliquée parce qu'un code de sortie seul ne prouve rien (patron de `neutralize-r33.py`).
⛔ VITEST 3.2.7 : la lecture est calibrée sur SA sortie ; toute autre version ⇒ refus de juger.
⛔ LA MUTATION SE PROUVE POSÉE (D286) : ancre 1 → 0 ET marqueur n → n + 1 pour une SUBSTITUTION ; ancre 1 → 1 ET marqueur n → n + 1 pour une INSERTION. ⚠ Le remplacement d'une substitution
ne doit jamais être une SOUS-CHAÎNE de son ancre (D325).
⛔ UNE MUTATION ÉQUIVALENTE SE RETIRE PAR ÉCRIT, avec sa mesure, à la place de la cible retirée.
⛔ UNE GARDE QUI NE ROUGIT QUE PAR UN MATCHER jest-dom OU UNE REQUÊTE Testing Library N'EST PAS LUE COMME UNE MORSURE (D304, D316) : le test reçoit une assertion NATIVE.
⛔ SURVIVRE À UN SIGNAL : sauvegarde sur DISQUE avant toute mutation, restaurée au démarrage suivant.
⛔ UNE CIBLE PARTAGÉE SE VÉRIFIE DANS TOUS SES CONSOMMATEURS : une cible à plusieurs mesures n'est « mordue » que si CHACUNE mord.
⛔ LES TITRES ATTENDUS SE RELÈVENT, ILS NE S'ÉCRIVENT PAS DE MÉMOIRE : `R37_DECOUVERTE=1` liste, par cible, ce qui rougit.
⛔ CE QUE CETTE CAMPAGNE NE MESURE PAS (écrit, pas tu) : (1) le GEL de `listMine` À L'APPEL par le faux serveur — la mutation « gelé à la réponse » ne fait rougir aucun test (la réponse tardive
de F-8 ne porte un état ancien QUE grâce à lui, et le test ne rougit que si l'annulation est aussi retirée : P-6 mesure l'annulation, pas le gel) ; (2) ce qu'un VRAI navigateur voit — le montage
doublé de `StrictMode`, le routeur réel, la publication faite par un autre compte : `e2e/specs/r37-ma-salle.e2e.ts` et la garde A2, neutralisés À LA MAIN, sortie lue
(`docs/preuves/D331/neutralisation/`).

POURQUOI IL EXISTE : CLAUDE.md, « une garde qui ne mord pas n'est pas une garde ». Lecteur, calibration et boucle : repris de `neutralize-r33.py` (calibré par D316 / D325), sans le mode `--int`.
"""

import hashlib
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

SAUVEGARDE = ".neutralisation-r37"
MANIFESTE = os.path.join(SAUVEGARDE, "manifeste.json")
JOURNAUX = os.path.join(".neutralisation-journaux", "r37")  # ignoré par git ; ce qu'une décision cite se COPIE (D291)
ANSI = re.compile(r"\x1b\[[0-9;]*m")
VITEST_ATTENDU = "v3.2.7"
DECOUVERTE = os.environ.get("R37_DECOUVERTE") == "1"
# `R37_FILTRE="P-,E-"` ne joue que les cibles dont l'identifiant commence par l'un de ces préfixes — POUR LA DÉCOUVERTE SEULEMENT : une campagne filtrée n'est pas une campagne verte.
FILTRE = [p for p in os.environ.get("R37_FILTRE", "").split(",") if p]

FOURNISSEUR = "apps/pro/src/shell/pro-venues-context.tsx"
EDITION = "apps/pro/src/venues/edit-venue-page.tsx"
LISTE = "apps/pro/src/venues/venue-list-page.tsx"
DOUBLES = "apps/pro/src/test-support/client-doubles.ts"


def _vitest(paquet: str, fichier: str) -> list[str]:
    return ["pnpm", "--filter", paquet, "exec", "vitest", "run", fichier]


MESURES = {
    "pro-relecture": _vitest("@zwadj/pro", "src/venues/ma-salle-relecture.test.tsx"),
    "pro-fournisseur": _vitest("@zwadj/pro", "src/shell/pro-venues-context.test.tsx"),
    "pro-creation": _vitest("@zwadj/pro", "src/venues/create-venue-page.test.tsx"),
}

CIBLES: list[dict] = []


def cible(libelle: str, fichier: str, avant: str, apres: str, mesures: dict[str, str], genre: str = "substitution") -> None:
    """`mesures` : {nom de mesure → sous-chaîne du titre du test qui doit rougir}. Chaque mesure doit mordre.
    `genre` (D286 — chaque genre a SON arithmétique) : « substitution » = ancre 1→0 ET marqueur n→n+1 ; « insertion » = le remplacement CONTIENT l'ancre, qui doit
    donc SURVIVRE (1→1) tandis que le marqueur passe de n à n+1."""
    CIBLES.append({"libelle": libelle, "fichier": fichier, "avant": avant, "apres": apres, "mesures": mesures, "genre": genre})


A_DECOUVRIR = "?"

# Les titres, relevés par R37_DECOUVERTE=1 (jamais écrits de mémoire).
T_EDITION_COURANTE = "la salle courante et le compte sont ceux du SERVEUR après l'enregistrement"
T_EDITION_ECHEC = "F-10 : si la relecture qui suit l'enregistrement ÉCHOUE"
T_EDITION_APRES = "F-4 : la relecture part APRÈS la réponse du serveur, pas avant — tant que la réponse est retenue"
T_EDITION_LIBELLE = "F-17 : le libellé « Mes salles » ne retombe PAS"
T_EDITION_VIDE = "un enregistrement sans rien à enregistrer ne relit PAS la liste"
T_SUPPR_SONDE = "le compte et la salle courante sont ceux du SERVEUR après la suppression"
T_SUPPR_HONNETE = "n'est jamais montrée comme présente dans la liste pendant la relecture"
T_SUPPR_APRES = "tant que la suppression est retenue"
T_SUPPR_REFUSEE = "une suppression REFUSÉE ne relit PAS la liste"
T_ENTREE = "le serveur change SANS requête de ce client"
T_ENTREE_CONNUE = "pendant la relecture d'entrée la liste CONNUE reste affichée"
T_ENTREE_STRICT = "sous `StrictMode` (montage doublé), UNE entrée dans la liste"
T_ENTREE_ERREUR = "si la lecture de démarrage ÉCHOUE (état « error »), entrer dans la liste ne la rejoue PAS"
T_SOURCE = "aucune des trois pages ne lit elle-même la liste"
T_P_CONNUE = "F-7 : relire une liste CONNUE ne la masque pas"
T_P_CHARGEMENT = "F-6 : pendant le CHARGEMENT de démarrage"
T_P_ERREUR = "F-6 : sur l'état « error »"
T_P_ECHEC = "F-9 : un ÉCHEC de la relecture d'entrée LAISSE la liste connue"
T_P_TABLEAU = "F-9 : une réponse qui n'est PAS un tableau"
T_P_VOULUE = "F-10 : l'échec d'une relecture VOULUE"
T_P_COMPTE = "F-17 : pendant une relecture VOULUE le compte garde"
T_P_COURSE = "F-8 : une réponse TARDIVE"
T_P_SESSION = "F-12/F-13 : un drapeau armé AVANT une déconnexion"
T_C_APRES = "la relecture part APRÈS la réponse de `create`"

# ── P — le FOURNISSEUR : la relecture d'entrée et la relecture voulue.
cible("P-1. `revalidate` perd son garde `idleRef` : il relit pendant un chargement et sur l'état « error » (une cascade, et le bouton « Réessayer » contourné)", FOURNISSEUR,
      "if (!idleRef.current) return;", "void 0;", {"pro-fournisseur": T_P_CHARGEMENT, "pro-fournisseur#2": T_P_ERREUR, "pro-relecture": T_ENTREE_ERREUR})
cible("P-2. la relecture d'entrée n'est plus silencieuse : elle masque la liste connue pendant la lecture", FOURNISSEUR,
      "silentRef.current = true;", "silentRef.current = false;", {"pro-fournisseur": T_P_CONNUE, "pro-relecture": T_ENTREE_CONNUE})
cible("P-3. ⛔ le drapeau silencieux n'est plus consommé quand aucun PRO n'est connecté : la première lecture de la session suivante est silencieuse (la liste de l'ancien compte reste à l'écran)", FOURNISSEUR,
      "silentRef.current = false;\n    if (!isPro) return;", "if (!isPro) return;\n    silentRef.current = false;", {"pro-fournisseur": T_P_SESSION})
cible("P-4. un échec de la relecture d'entrée remplace la liste connue par l'état « error »", FOURNISSEUR,
      'silent && prev.state.kind === "ready" ? prev : { state: { kind: "error" }', 'false && prev.state.kind === "ready" ? prev : { state: { kind: "error" }', {"pro-fournisseur": T_P_ECHEC})
cible("P-5. ⛔ une réponse qui n'est pas un tableau remplace la liste connue par une liste VIDE (un compte faux présenté comme un fait)", FOURNISSEUR,
      'silent && prev.state.kind === "ready" ? prev : { state: { kind: "ready", venues: [] }', 'false && prev.state.kind === "ready" ? prev : { state: { kind: "ready", venues: [] }',
      {"pro-fournisseur": T_P_TABLEAU})
cible("P-6. ⛔ la lecture précédente n'est plus annulée : une réponse tardive écrase la plus fraîche", FOURNISSEUR, "cancelled = true;", "void 0;", {"pro-fournisseur": T_P_COURSE})
cible("P-7. `count` ne garde plus le dernier compte connu pendant une relecture voulue : le libellé « Mes salles » clignote", FOURNISSEUR,
      'const count = state.kind === "ready" ? venues.length : knownCount;', 'const count = state.kind === "ready" ? venues.length : 0;', {"pro-fournisseur": T_P_COMPTE, "pro-relecture": T_EDITION_LIBELLE})
cible("P-8. le drapeau « liste connue » reste coincé après un échec silencieux : plus aucune relecture d'entrée ensuite", FOURNISSEUR,
      "idleRef.current = silent;", "idleRef.current = false;", {"pro-fournisseur": T_P_ECHEC})
cible("P-9. ⛔ la relecture VOULUE devient silencieuse : la salle supprimée reste montrée comme présente, et l'échec d'une relecture après écriture est avalé", FOURNISSEUR,
      "silentRef.current = false;\n    idleRef.current = false;", "silentRef.current = true;\n    idleRef.current = false;", {"pro-relecture": T_SUPPR_HONNETE, "pro-fournisseur": T_P_VOULUE})
cible("P-10. le drapeau « liste connue » n'est plus relevé après une lecture réussie : la relecture d'entrée ne part jamais", FOURNISSEUR,
      'setSnap({ state: { kind: "ready", venues: list }, knownCount: list.length });\n        idleRef.current = true;',
      'setSnap({ state: { kind: "ready", venues: list }, knownCount: list.length });\n        void 0;', {"pro-relecture": T_ENTREE, "pro-fournisseur": T_P_CONNUE})

# ── E — l'ASSISTANT : relire après un enregistrement réussi et après une suppression réussie, à la bonne place.
cible("E-1. ⛔ l'enregistrement réussi ne fait plus relire la liste : « Ma salle », le libellé et la salle courante restent ceux d'avant (S4 de D327)", EDITION,
      "reloadVenues();\n      if (next !== null) goStep(next);", "void 0;\n      if (next !== null) goStep(next);",
      {"pro-relecture": T_EDITION_COURANTE, "pro-relecture#2": T_EDITION_ECHEC, "pro-relecture#3": T_EDITION_APRES})
cible("E-2. ⛔ la relecture part AVANT la réponse du serveur (F-4) : elle lit l'état d'avant l'enregistrement", EDITION,
      "const updated = await venuesApi.update(state.venue.id, diff.data);", "reloadVenues();\n      const updated = await venuesApi.update(state.venue.id, diff.data);",
      {"pro-relecture": T_EDITION_APRES}, genre="insertion")
cible("E-3. ⛔ la suppression réussie ne fait plus relire la liste avant d'y arriver : la salle supprimée y est montrée (S6 de D327)", EDITION,
      'reloadVenues();\n      void navigate("/salles");', 'void 0;\n      void navigate("/salles");', {"pro-relecture": T_SUPPR_HONNETE})
cible("E-4. la relecture part AVANT la réponse de la suppression : elle part même quand le serveur REFUSE", EDITION,
      "await venuesApi.softDelete(state.venue.id);", "reloadVenues();\n      await venuesApi.softDelete(state.venue.id);", {"pro-relecture": T_SUPPR_REFUSEE, "pro-relecture#2": T_SUPPR_APRES}, genre="insertion")
cible("E-5. un enregistrement SANS rien à enregistrer relit quand même la liste", EDITION,
      'if (diff.kind === "empty") {', 'if (diff.kind === "empty") {\n      reloadVenues();', {"pro-relecture": T_EDITION_VIDE}, genre="insertion")

# ── L — la LISTE : la relecture d'entrée, et jamais une lecture propre à la page.
cible("L-1. ⛔ la liste ne demande plus la relecture à son entrée : la publication faite ailleurs reste invisible (S5 de D327)", LISTE,
      "revalidate();", "void revalidate;", {"pro-relecture": T_ENTREE, "pro-relecture#2": T_ENTREE_CONNUE, "pro-relecture#3": T_ENTREE_STRICT})
cible("L-2. la liste demande une relecture VOULUE à son entrée : elle se masque (« Chargement ») à chaque visite", LISTE,
      "revalidate();", "load();", {"pro-relecture": T_ENTREE_CONNUE})
cible("L-3. ⛔ la page lit elle-même la liste (`listMine`) : deux sources, le libellé et la liste peuvent diverger (D78)", LISTE,
      "const venuesApi = useVenueCrud();", "const venuesApi = useVenueCrud();\n  void venuesApi.listMine();", {"pro-relecture": T_SOURCE}, genre="insertion")

# ── D — le FAUX SERVEUR : une écriture n'enregistre qu'à sa RÉPONSE (le défaut de D326).
cible("D-1. ⛔ `create` enregistre la salle AU MOMENT DE L'APPEL : une relecture partie trop tôt la verrait (le test de D326, vert pour la mauvaise raison)", DOUBLES,
      'await attendre("create");', "void 0;", {"pro-creation": T_C_APRES})
cible("D-2. `update` enregistre au moment de l'appel", DOUBLES, 'await attendre("update");', "void 0;", {"pro-relecture": T_EDITION_APRES})
cible("D-3. `softDelete` supprime au moment de l'appel", DOUBLES, 'await attendre("softDelete");', "void 0;", {"pro-relecture": T_SUPPR_APRES})


def _jouees() -> list[dict]:
    """Les cibles jouées. Une clé de mesure peut porter un suffixe `#n` : plusieurs titres d'un MÊME fichier de test pour une même cible (le dictionnaire ne peut pas répéter une clé)."""
    return [{**c, "mesures": dict(c["mesures"])} for c in CIBLES]


def _mesure_de(cle: str) -> str:
    return cle.split("#")[0]


def _binaire(nom: str) -> str:
    """Résout l'exécutable AVANT `subprocess.run` (Windows : `pnpm.cmd`)."""
    return shutil.which(nom) or nom


def lancer(mesure: str) -> tuple[int, str]:
    cmd = MESURES[_mesure_de(mesure)]
    r = subprocess.run([_binaire(cmd[0]), *cmd[1:]], capture_output=True, text=True, encoding="utf-8", errors="replace")
    return r.returncode, ANSI.sub("", (r.stdout or "") + "\n" + (r.stderr or ""))


def lire_vitest(sortie: str, titre: str | None) -> tuple[str, str]:
    """Rend (verdict, détail). Verdicts : VERT, ROUGE, MORD, SANS-TITRE, PAS-ASSERTION, NON-DÉMARRÉE, VERSION.
    Copie du lecteur de `neutralize-r33.py` (calibré par D316 et D325) — mêmes verdicts, mêmes bras de calibration ci-dessous."""
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
    lignes = sortie.splitlines()
    premiere = "—"
    for i, l in enumerate(lignes):
        if l.strip().startswith("FAIL ") and titre in l:
            premiere = next((x.strip() for x in lignes[i + 1:] if x.strip() and not x.strip().startswith("FAIL ")), "—")
            break
    if not premiere.startswith("AssertionError"):
        return "PAS-ASSERTION", f"première ligne du bloc : {premiere[:140]}"
    return "MORD", f"passés {passes} · en échec {echecs} · {premiere[:140]}"


def echecs_de(sortie: str) -> list[tuple[str, str]]:
    """Mode DÉCOUVERTE : (titre, première ligne de son bloc) pour chaque test en échec. Les en-têtes REGROUPÉS partagent le message qui les suit."""
    lignes = sortie.splitlines()
    rendus: list[tuple[str, str]] = []
    i = 0
    while i < len(lignes):
        if lignes[i].strip().startswith("FAIL ") and ">" in lignes[i]:
            titres = []
            while i < len(lignes) and (lignes[i].strip().startswith("FAIL ") or not lignes[i].strip()):
                if lignes[i].strip():
                    titres.append(lignes[i].strip())
                i += 1
            message = lignes[i].strip() if i < len(lignes) else "—"
            rendus += [(t, message) for t in titres]
        else:
            i += 1
    return rendus


# ── CALIBRATION DU LECTEUR, à chaque lancement (D286) — les bras vitest de `neutralize-r33.py`, formes réelles versées sous `docs/preuves/D316/` et `docs/preuves/D304/`.
_V = " RUN  v3.2.7 C:/x\n"
CALIBRATION = [
    ("en-têtes REGROUPÉS puis AssertionError", _V
     + "   × d > 93 jour(s) : t 8ms\n   × d > 182 jour(s) : t 1ms\n"
       " FAIL  a.test.ts > d > 93 jour(s) : t\n FAIL  a.test.ts > d > 182 jour(s) : t\n"
       "AssertionError: expected false to be true // Object.is equality\n      Tests  7 failed | 9 passed (16)\n",
     "182 jour(s) : t", "MORD"),
    ("plantage (TypeError)", _V
     + "   × d > t 219ms\n FAIL  a.test.ts > d > t\nTypeError: .toMatch() expects to receive a string, but got undefined\n"
       "      Tests  1 failed | 18 passed (19)\n", "t", "PAS-ASSERTION"),
    ("erreur de REQUÊTE Testing Library (pas une assertion)", _V
     + "   × d > t 1105ms\n FAIL  a.test.ts > d > t\nTestingLibraryElementError: Unable to find an element with the text: x\n"
       "      Tests  1 failed | 13 passed (14)\n", "t", "PAS-ASSERTION"),
    ("rien d'exécuté sous filtre", _V + "      Tests  25 skipped (25)\n", "t", "NON-DÉMARRÉE"),
    ("autre version", " RUN  v3.2.6 C:/x\n      Tests  1 failed (1)\n", "t", "VERSION"),
    ("crochet en échec (bloc de FICHIER, 1 skipped)", _V
     + " Test Files  1 failed (1)\n      Tests  1 skipped (1)\n FAIL  cas/crochet.cas.ts [ cas/crochet.cas.ts ]\n"
       "Error: crochet en panne\n", "t", "NON-DÉMARRÉE"),
    ("le titre attendu n'échoue pas (un autre, si)", _V
     + "   × d > une autre garde 3ms\n FAIL  a.test.ts > d > une autre garde\nAssertionError: expected 1 to be 2\n"
       "      Tests  1 failed | 4 passed (5)\n", "garde visée par la cible", "SANS-TITRE"),
    ("délai dépassé (jamais une morsure)", _V
     + "   × d > t 5001ms\n FAIL  a.test.ts > d > t\nError: Test timed out in 5000ms.\n      Tests  1 failed | 7 passed (8)\n", "t", "PAS-ASSERTION"),
    # Bras propre à ce lot : le bruit de console (« not wrapped in act(...) ») fait échouer le test par une `Error` de `test-setup.ts` — ce n'est pas une morsure non plus.
    ("plafond de console (Error de test-setup, pas une assertion)", _V
     + "   × d > t 30ms\n FAIL  a.test.ts > d > t\nError: 3 avertissement(s) de console dans un fichier NON exempté.\n      Tests  1 failed | 3 passed (4)\n", "t", "PAS-ASSERTION"),
]


def calibrer() -> bool:
    manques = 0
    for nom, texte, titre, attendu in CALIBRATION:
        verdict, _ = lire_vitest(texte, titre)
        manques += verdict != attendu
        print(f"  calibration {'✓' if verdict == attendu else '✗'} {nom} : {verdict} (attendu {attendu})")
    decouverte = echecs_de(_V + " FAIL  a.test.ts > d > un\n FAIL  a.test.ts > d > deux\nAssertionError: m1\n\n FAIL  a.test.ts > d > trois\nTypeError: m2\n")
    attendu_decouverte = [("FAIL  a.test.ts > d > un", "AssertionError: m1"), ("FAIL  a.test.ts > d > deux", "AssertionError: m1"),
                          ("FAIL  a.test.ts > d > trois", "TypeError: m2")]
    ok = decouverte == attendu_decouverte
    manques += not ok
    print(f"  calibration {'✓' if ok else '✗'} découverte : {len(decouverte)} échec(s) lu(s) (attendu 3)")
    print(f"  calibration : {len(CALIBRATION) + 1} bras · {manques} manqué(s) (attendu 0)")
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


def empreintes() -> dict[str, str]:
    return {f: hashlib.sha256(open(f, "rb").read()).hexdigest() for f in sorted({c["fichier"] for c in CIBLES})}


def _adapter(texte: str, source: str) -> str:
    """Les ancres multi-lignes sont écrites en `\\n` : un fichier en CRLF les porte en `\\r\\n` (D325 : « un motif multi-lignes doit porter `\\r\\n` »)."""
    return texte.replace("\n", "\r\n") if "\r\n" in source else texte


def verifier_arbre(moment: str, depart: dict[str, str] | None = None) -> bool:
    """Chaque ancre est là, UNE fois ; à l'arrivée, chaque fichier ciblé a l'EMPREINTE du départ (restauration prouvée à l'octet)."""
    ecarts = []
    for c in CIBLES:
        src = io.open(c["fichier"], encoding="utf-8", newline="").read()
        n = src.count(_adapter(c["avant"], src))
        if n != 1:
            ecarts.append(f"{c['libelle'][:5]} : ancre ×{n}")
    if depart is not None:
        maintenant = empreintes()
        ecarts += [f"{f} : empreinte changée" for f in depart if depart[f] != maintenant[f]]
        print(f"  empreintes : {len(depart)} fichier(s) ciblé(s) comparé(s) au départ · {sum(depart[f] != maintenant[f] for f in depart)} différent(s) (attendu 0)")
    if ecarts:
        print(f"✗ ARBRE NON CONFORME {moment} : " + " ; ".join(ecarts))
        return False
    return True


def main() -> int:
    restaurer_si_interrompu()
    if not calibrer():
        print("✗ ABANDON : le lecteur manque un bras de sa calibration — rien n'est mesuré.")
        return 2
    if not verifier_arbre("AU DÉPART"):
        return 2
    if FILTRE and not DECOUVERTE:
        print("✗ R37_FILTRE n'est admis qu'avec R37_DECOUVERTE=1 : une campagne filtrée n'est pas une campagne verte, aucun verdict n'est rendu.")
        return 2
    toutes = _jouees()
    sans_titre = [c["libelle"].split(".")[0] for c in toutes for t in c["mesures"].values() if t == A_DECOUVRIR]
    if sans_titre and not DECOUVERTE:
        print(f"✗ TITRE NON RELEVÉ pour {len(sans_titre)} mesure(s) ({', '.join(sorted(set(sans_titre)))}) : relever par R37_DECOUVERTE=1, puis écrire le titre — aucun verdict n'est rendu sur « ? ».")
        return 2
    actives = [c for c in toutes if not FILTRE or any(c["libelle"].startswith(p) for p in FILTRE)]
    depart = empreintes()
    os.makedirs(JOURNAUX, exist_ok=True)
    mesures_utilisees = sorted({_mesure_de(m) for c in actives for m in c["mesures"]})
    print(f"cibles : {len(CIBLES)} déclarées · {len(actives)} jouées · {len(mesures_utilisees)} mesure(s) distincte(s) · {len({c['fichier'] for c in actives})} fichier(s) muté(s)")

    # ── PRÉ-VOL : chaque mesure, SANS mutation, doit être verte et avoir DÉMARRÉ.
    for mesure in mesures_utilisees:
        code, sortie = lancer(mesure)
        io.open(os.path.join(JOURNAUX, f"prevol-{mesure}.log"), "w", encoding="utf-8").write(sortie)
        verdict, detail = lire_vitest(sortie, None)
        if code != 0 or verdict != "VERT":
            print(f"✗ PRÉ-VOL {mesure} : code {code}, {verdict} — {detail}")
            print(sortie[-3000:])
            return 2
        print(f"  pré-vol {mesure} : code 0 · {detail}")

    mordu, muettes, erreurs = 0, [], []
    for cible_ in actives:
        chemin = cible_["fichier"]
        source = io.open(chemin, encoding="utf-8", newline="").read()
        avant, apres = _adapter(cible_["avant"], source), _adapter(cible_["apres"], source)
        ancre_avant, marque_avant = source.count(avant), source.count(apres)
        if ancre_avant != 1:
            print(f"✗ {cible_['libelle']}\n   ERREUR DE SCRIPT : {ancre_avant} occurrence(s), 1 attendue dans {chemin}")
            erreurs.append(cible_["libelle"])
            break
        mute = source.replace(avant, apres)
        ancre_apres, marque_apres = mute.count(avant), mute.count(apres)
        ancre_attendue = 1 if cible_["genre"] == "insertion" else 0
        if (ancre_apres, marque_apres) != (ancre_attendue, marque_avant + 1):
            print(f"✗ {cible_['libelle']}\n   MUTATION NON POSÉE : ancre {ancre_avant}→{ancre_apres}, "
                  f"marqueur {marque_avant}→{marque_apres} (attendu 1→{ancre_attendue} et {marque_avant}→{marque_avant + 1}, genre {cible_['genre']})")
            erreurs.append(cible_["libelle"])
            break
        annuler = [{"chemin": chemin, "contenu": source}]
        _ecrire_manifeste(annuler)
        io.open(chemin, "w", encoding="utf-8", newline="").write(mute)
        sorties: dict[str, tuple[int, str]] = {}
        try:
            for mesure in {_mesure_de(m) for m in cible_["mesures"]}:
                sorties[mesure] = lancer(mesure)
        finally:
            _defaire(annuler)
            shutil.rmtree(SAUVEGARDE, ignore_errors=True)
        ident = cible_["libelle"].split(".")[0]
        posee = f"ancre 1→{ancre_attendue} · marqueur {marque_avant}→{marque_avant + 1} · genre {cible_['genre']}"
        # La sortie ENTIÈRE se journalise : un rouge qu'on ne peut plus relire se relance sans être lu (D270).
        for mesure, (code, sortie) in sorties.items():
            io.open(os.path.join(JOURNAUX, f"{ident}-{mesure}.log"), "w", encoding="utf-8").write(sortie)
        if DECOUVERTE:
            print(f"■ {cible_['libelle']}\n   {posee}")
            for mesure, (code, sortie) in sorties.items():
                verdict, detail = lire_vitest(sortie, None)
                print(f"   [{mesure}] code {code} · {verdict} — {detail}")
                for titre, message in echecs_de(sortie):
                    print(f"      {titre[:200]}\n         ↳ {message[:150]}")
            continue
        verdicts = []
        for cle, titre in cible_["mesures"].items():
            code, sortie = sorties[_mesure_de(cle)]
            verdict, detail = lire_vitest(sortie, titre)
            verdicts.append((cle, code, verdict, detail))
        if any(v in ("NON-DÉMARRÉE", "VERSION") for _, _, v, _ in verdicts):
            for mesure, code, verdict, detail in verdicts:
                print(f"✗ {cible_['libelle']}\n   [{mesure}] MESURE NON DÉMARRÉE ({verdict}) : {detail}")
            erreurs.append(cible_["libelle"])
            break
        if all(v == "MORD" and code != 0 for _, code, v, _ in verdicts):
            mordu += 1
            print(f"✓ {cible_['libelle']}\n   {posee}")
            for mesure, code, verdict, detail in verdicts:
                print(f"   [{mesure}] code {code} · {detail}")
        else:
            muettes.append(cible_["libelle"])
            print(f"✗ {cible_['libelle']}\n   {posee}")
            for mesure, code, verdict, detail in verdicts:
                print(f"   [{mesure}] code {code} · {verdict} — {detail}")

    conforme = verifier_arbre("À L'ARRIVÉE", depart)
    if DECOUVERTE:
        print(f"\nDÉCOUVERTE : {len(actives)} cible(s) jouée(s) sur {len(CIBLES)}, aucun verdict écrit.")
    else:
        print(f"\n{mordu} garde(s) mordue(s) sur {len(actives)} cible(s) jouée(s) · {len(muettes)} muette(s) · {len(erreurs)} non mesurée(s) "
              f"(attendu : {len(actives)} sur {len(actives)}, 0, 0)")
    if conforme:
        print("arbre rendu à son état de départ : vérifié.")
    if erreurs or not conforme:
        return 2
    return 1 if muettes else 0


if __name__ == "__main__":
    sys.exit(main())
