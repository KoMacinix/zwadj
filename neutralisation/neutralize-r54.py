#!/usr/bin/env python3
"""Campagne de neutralisation — RANG 54 (D352), lot R-1 : la liste « Mes salles » dit « Refusée » pour une salle refusée (voie (A), sans contrat neuf : la carte lit `GET pro/venues/:id/publication`).

Ce que le lot ajoute, et que chaque cible neutralise (une garde neuve dont on n'a pas montré qu'elle mord est une assurance sans mesure) :
  · la CARTE (`PublicationListBadge`, `publication-review.tsx`) : le refus est lu et affiché (L-2), rien n'est affirmé avant la réponse (L-1, L-5, L-8), une panne n'est pas « pas refusée » (L-3, L-4), le MOTIF n'entre
    jamais dans la liste (L-6), une salle publiée n'appelle rien (L-7) ;
  · la LISTE (`venue-list-page.tsx`) : elle rend la carte (L-9), UNE par salle (L-11) ;
  · le BADGE (`venue-form.tsx`) : l'état « pas connu » est sans libellé (L-8) et `aria-busy` (L-10).
Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-r54.py
    R54_DECOUVERTE=1 python3 neutralisation/neutralize-r54.py     # n'écrit AUCUN verdict : liste les tests qui rougissent, par cible
Codes de sortie : 0 = tout joué, tout a mordu ; 1 = au moins une garde MUETTE ; 2 = pré-vol rouge, ERREUR DE SCRIPT, vitest non attendu, calibration manquée, ou arbre non conforme.

⛔ L'EMPREINTE DU HARNAIS EN TÊTE DE CHAQUE JOURNAL (R-9 de D349) : première ligne de la sortie et de CHAQUE journal de mesure ; un harnais modifié en cours de campagne ⇒ la campagne est rejouée EN ENTIER.
⛔ UNE MORSURE SE LIT, ELLE NE SE DÉDUIT PAS D'UN CODE DE SORTIE (D304, D305, D312, D316) : la ligne « Tests » compte au moins un test en échec ; le titre attendu y est marqué en échec ET la PREMIÈRE ligne de son bloc
« FAIL … > titre » — en-têtes regroupés sautés — est une `AssertionError`. ⛔ **UNE ERREUR DE REQUÊTE DE TESTING LIBRARY N'EST PAS UNE MORSURE** (S-192 REFUSÉE, R-8 de D351 ; D352) : elle se lit PAS-ASSERTION, la cible est MUETTE.
⛔ VITEST 3.2.7 : la lecture est calibrée sur SA sortie ; toute autre version ⇒ refus de juger.
⛔ LA MUTATION SE PROUVE POSÉE (D286) : ancre 1 → 0 ET marqueur n → n + 1 pour une SUBSTITUTION ; ancre 1 → 1 ET marqueur n → n + 1 pour une INSERTION. ⚠ Le remplacement d'une substitution ne doit jamais être une
SOUS-CHAÎNE de son ancre (D325).
⛔ SURVIVRE À UN SIGNAL : sauvegarde sur DISQUE avant toute mutation, restaurée au démarrage suivant.
⛔ LES TITRES ATTENDUS SE RELÈVENT, ILS NE S'ÉCRIVENT PAS DE MÉMOIRE : `R54_DECOUVERTE=1` liste, par cible, ce qui rougit.
⛔ CE QUE CETTE CAMPAGNE NE MESURE PAS (écrit, pas tu) : (1) un VRAI navigateur : les tests de la liste tournent sous jsdom (les gestes de Ko, `docs/preuves/D352/scenarios-ko.md`, et l'e2e `a2-mount-effects` disent le reste) ;
(2) l'ARABE du badge : sa parité est mesurée, sa justesse de traduction ne l'est pas (la clé `publicationReview.refusedBadge` est celle de D350, « à relire par un humain »).

POURQUOI IL EXISTE : CLAUDE.md, « une garde qui ne mord pas n'est pas une garde ». Lecteur, calibration et boucle : COPIÉS de `neutralize-adm2.py` (lui-même copié de `neutralize-adm1.py` puis `neutralize-r43.py`, calibrés
D316 / D325 / D331 / D332 / D333) **dans leur état de D352** (sans la lecture des requêtes de présence) ; changent le jeu de cibles et les mesures.
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

# ⛔ LA PREMIÈRE LIGNE DE LA SORTIE : l'empreinte du fichier qui joue la passe.
EMPREINTE_HARNAIS = hashlib.sha256(open(__file__, "rb").read()).hexdigest()
print(f"empreinte du harnais (sha256) : {EMPREINTE_HARNAIS}  ({os.path.basename(__file__)})")

SAUVEGARDE = ".neutralisation-r54"
MANIFESTE = os.path.join(SAUVEGARDE, "manifeste.json")
JOURNAUX = os.path.join(".neutralisation-journaux", "r54")  # ignoré par git ; ce qu'une décision cite se COPIE (D291), MASQUÉ
ANSI = re.compile(r"\x1b\[[0-9;]*m")
VITEST_ATTENDU = "v3.2.7"
DECOUVERTE = os.environ.get("R54_DECOUVERTE") == "1"


def _vitest(paquet: str, fichier: str) -> list[str]:
    return ["pnpm", "--filter", paquet, "exec", "vitest", "run", fichier]


MESURES = {
    "liste": _vitest("@zwadj/pro", "src/venues/venue-list.test.tsx"),
}

LISTE = "apps/pro/src/venues/venue-list-page.tsx"
REVIEW = "apps/pro/src/venues/publication-review.tsx"
FORM = "apps/pro/src/venues/venue-form.tsx"

CIBLES: list[dict] = []


def cible(libelle: str, fichier: str, avant: str, apres: str, mesures: dict[str, str], genre: str = "substitution") -> None:
    """`mesures` : {nom de mesure → sous-chaîne du titre du test qui doit rougir}. Chaque mesure doit mordre.
    `genre` (D286 — chaque genre a SON arithmétique) : « substitution » = ancre 1→0 ET marqueur n→n+1 ; « insertion » = le remplacement CONTIENT l'ancre, qui doit donc SURVIVRE (1→1) tandis que le marqueur passe de n à n+1."""
    CIBLES.append({"libelle": libelle, "fichier": fichier, "avant": avant, "apres": apres, "mesures": mesures, "genre": genre})


A_DECOUVRIR = "?"

# ── L — la CARTE de « Mes salles » (R-1, voie (A)).
cible("L-1. ⛔ R-1 — avant la réponse, la carte affirme l'état de la liste (« en attente ») : l'affichage SAUTE de « en attente » à « refusée »", REVIEW,
      "  return <PublicationBadge status={null} busy />;\n}", "  return <PublicationBadge status={venue.publicationStatus} busy />;\n}",
      {"liste": "l'affichage ne SAUTE pas"})
cible("L-2. ⛔ R-1 — la carte ne rend plus la réponse de la lecture : « Refusée » n'apparaît jamais", REVIEW,
      'if (state.kind === "ready") return <PublicationHeaderState status={venue.publicationStatus} review={state} />;', 'if (state.kind === "pret") return <PublicationHeaderState status={venue.publicationStatus} review={state} />;',
      {"liste": "une salle REFUSÉE : la carte dit « Refusée » et ne dit PLUS"})
cible("L-3. ⛔ R-1 / D133 — une PANNE de lecture rend le badge d'avant (« en attente ») : une panne se lit « pas refusée »", REVIEW,
      "        <PublicationBadge status={null} />\n", "        <PublicationBadge status={venue.publicationStatus} />\n",
      {"liste": "D133, D142 — une PANNE de lecture n'est PAS"})
cible("L-4. ⛔ R-1 / D133 — une panne de lecture ne le DIT plus (la phrase de l'étape « Publication » disparaît de la carte)", REVIEW,
      '        <p className="field-hint" style={{ margin: 0 }}>\n          {t("publicationReview.loadError")}\n        </p>', '        <p className="field-hint" style={{ margin: 0 }}>\n          {""}\n        </p>',
      {"liste": "D133, D142 — une PANNE de lecture n'est PAS"})
cible("L-5. ⛔ R-1 — la carte qui attend ne porte plus `aria-busy`", REVIEW,
      "  return <PublicationBadge status={null} busy />;\n}", "  return <PublicationBadge status={null} />;\n}",
      {"liste": "l'affichage ne SAUTE pas"})
cible("L-6. ⛔ R-1 — le MOTIF du refus entre dans la liste (la carte rend `rejection.reason`)", REVIEW,
      'if (state.kind === "ready") return <PublicationHeaderState status={venue.publicationStatus} review={state} />;',
      'if (state.kind === "ready") return <><PublicationHeaderState status={venue.publicationStatus} review={state} /><p>{state.review.rejection?.reason}</p></>;',
      {"liste": "le MOTIF et la DATE du refus n'entrent JAMAIS dans la liste"})
cible("L-7. ⛔ R-1 — une salle PUBLIÉE appelle la route du refus (la lecture ne s'arrête plus au statut)", REVIEW,
      "const active = status !== null && status !== VenuePublicationStatus.PUBLISHED;", "const active = status !== null;",
      {"liste": "une salle PUBLIÉE : « Publiée », et AUCUNE lecture du refus"})
cible("L-8. ⛔ R-1 — le badge « pas connu » dit « en attente » (le libellé de repli est celui du brouillon)", FORM,
      "{status === null ? null : labels[status]}", "{status === null ? labels[VenuePublicationStatus.DRAFT] : labels[status]}",
      {"liste": "l'affichage ne SAUTE pas"})
cible("L-9. ⛔ R-1 — la liste ne rend plus la carte (le badge de publication disparaît)", LISTE,
      "<PublicationListBadge venue={venue} />", "<span />",
      {"liste": "une salle REFUSÉE : la carte dit « Refusée » et ne dit PLUS"})
cible("L-10. ⛔ R-1 — le badge « pas connu » ne porte plus `aria-busy`", FORM,
      "aria-busy={busy ? true : undefined}", "aria-busy={undefined}",
      {"liste": "l'affichage ne SAUTE pas"})
cible("L-11. ⛔ R-1 — la liste rend DEUX cartes par salle (deux lectures du refus par salle non publiée)", LISTE,
      "<PublicationListBadge venue={venue} />", "<PublicationListBadge venue={venue} /><PublicationListBadge venue={{ ...venue }} />",
      {"liste": "le nombre d'appels est borné"}, "insertion")


def _mesure_de(cle: str) -> str:
    return cle.split("#")[0]


def _binaire(nom: str) -> str:
    """Résout l'exécutable AVANT `subprocess.run` (Windows : `pnpm.cmd`)."""
    return shutil.which(nom) or nom


def lancer(mesure: str) -> tuple[int, str]:
    cmd = MESURES[_mesure_de(mesure)]
    r = subprocess.run([_binaire(cmd[0]), *cmd[1:]], capture_output=True, text=True, encoding="utf-8", errors="replace", env={**os.environ, "NO_COLOR": "1", "FORCE_COLOR": "0"})
    return r.returncode, ANSI.sub("", (r.stdout or "") + "\n" + (r.stderr or ""))


def lire_vitest(sortie: str, titre: str | None) -> tuple[str, str]:
    """Rend (verdict, détail). Verdicts : VERT, ROUGE, MORD, SANS-TITRE, PAS-ASSERTION, NON-DÉMARRÉE, VERSION.
    Copie du lecteur de `neutralize-adm2.py` dans son état de D352 : une erreur de REQUÊTE de Testing Library n'est PAS une morsure (S-192 refusée)."""
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
    if premiere.startswith("AssertionError"):
        return "MORD", f"passés {passes} · en échec {echecs} · {premiere[:140]}"
    return "PAS-ASSERTION", f"première ligne du bloc : {premiere[:140]}"


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


# ── CALIBRATION DU LECTEUR, à chaque lancement (D286) — les bras de `neutralize-adm2.py`, formes réelles versées sous `docs/preuves/D316/` et `docs/preuves/D304/`.
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
    ("erreur de REQUÊTE Testing Library : PAS une morsure (S-192 refusée, D352)", _V
     + "   × d > t 1105ms\n FAIL  a.test.ts > d > t\nTestingLibraryElementError: Unable to find an element with the text: x\n"
       "      Tests  1 failed | 13 passed (14)\n", "t", "PAS-ASSERTION"),
    ("plantage à l'intérieur du rendu (TypeError), même si le DOM est vide ensuite", _V
     + "   × d > t 40ms\n FAIL  a.test.ts > d > t\nTypeError: Cannot read properties of undefined (reading 'x')\n"
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


def _entete_journal() -> str:
    """⛔ R-9 : la PREMIÈRE ligne de chaque journal est l'empreinte du harnais."""
    return f"empreinte du harnais (sha256) : {EMPREINTE_HARNAIS}  ({os.path.basename(__file__)})\n"


def main() -> int:
    restaurer_si_interrompu()
    if not calibrer():
        print("✗ ABANDON : le lecteur manque un bras de sa calibration — rien n'est mesuré.")
        return 2
    if not verifier_arbre("AU DÉPART"):
        return 2
    sans_titre = [c["libelle"].split(".")[0] for c in CIBLES for t in c["mesures"].values() if t == A_DECOUVRIR]
    if sans_titre and not DECOUVERTE:
        print(f"✗ TITRE NON RELEVÉ pour {len(sans_titre)} mesure(s) ({', '.join(sorted(set(sans_titre)))}) : relever par R54_DECOUVERTE=1, puis écrire le titre — aucun verdict n'est rendu sur « ? ».")
        return 2
    depart = empreintes()
    os.makedirs(JOURNAUX, exist_ok=True)
    mesures_utilisees = sorted({_mesure_de(m) for c in CIBLES for m in c["mesures"]})
    print(f"cibles : {len(CIBLES)} déclarées · {len(mesures_utilisees)} mesure(s) distincte(s) · {len({c['fichier'] for c in CIBLES})} fichier(s) muté(s)")

    # ── PRÉ-VOL : chaque mesure, SANS mutation, doit être verte et avoir DÉMARRÉ.
    for mesure in mesures_utilisees:
        code, sortie = lancer(mesure)
        io.open(os.path.join(JOURNAUX, f"prevol-{mesure}.log"), "w", encoding="utf-8").write(_entete_journal() + sortie)
        verdict, detail = lire_vitest(sortie, None)
        if code != 0 or verdict != "VERT":
            print(f"✗ PRÉ-VOL {mesure} : code {code}, {verdict} — {detail}")
            print(sortie[-3000:])
            return 2
        print(f"  pré-vol {mesure} : code 0 · {detail}")

    mordu, muettes, erreurs = 0, [], []
    for cible_ in CIBLES:
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
        # La sortie ENTIÈRE se journalise, après l'empreinte du harnais (R-9) : un rouge qu'on ne peut plus relire se relance sans être lu (D270).
        for mesure, (code, sortie) in sorties.items():
            io.open(os.path.join(JOURNAUX, f"{ident}-{mesure}.log"), "w", encoding="utf-8").write(_entete_journal() + sortie)
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
        print(f"\nDÉCOUVERTE : {len(CIBLES)} cible(s) jouée(s), aucun verdict écrit.")
    else:
        print(f"\n{mordu} garde(s) mordue(s) sur {len(CIBLES)} cible(s) jouée(s) · toutes lues en AssertionError · {len(muettes)} muette(s) · {len(erreurs)} non mesurée(s) "
              f"(attendu : {len(CIBLES)} sur {len(CIBLES)}, 0, 0)")
    if conforme:
        print("arbre rendu à son état de départ : vérifié.")
    if erreurs or not conforme:
        return 2
    return 1 if muettes else 0


if __name__ == "__main__":
    sys.exit(main())
