#!/usr/bin/env python3
"""Campagne de neutralisation — RANG 30 (D322) : le calendrier, suite.

Ce que le lot ajoute, et que chaque cible neutralise :
  · les NOMS de jours et de mois du calendrier du panneau dans la LANGUE DE LA PAGE, en arabe ET en français — et aucune
    liste écrite en dur (modes N-a à N-d). ⚠ Aucun défaut n'a été reproduit à l'ouverture : le lot écrit la GARDE qui
    manquait (`booking-date-picker.test.tsx`), et ce harnais prouve qu'elle mord ;
  · le WEEK-END mis en avant tiré de l'autorité `WEEKEND_DAYS` (D56), jamais de jours écrits dans la vue (W-a à W-d) ;
  · le lien « Calendrier de la salle » de l'assistant pro : une route DÉCLARÉE, sur la salle éditée (K-a à K-c).
  (Le point « jour déjà demandé » est arrêté et rapporté à Ko : aucun code, aucune cible. La vérification navigateur du
  lien est une spec Playwright VERSÉE (`docs/preuves/D322/navigateur/`) — rouge lu avant le correctif, vert après —, hors
  de ce harnais et hors de la suite e2e : section D322, « le lien dans un navigateur ».)

Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-r30.py
Codes de sortie : 0 = tout joué, tout a mordu ; 1 = au moins une garde MUETTE ; 2 = pré-vol rouge, ERREUR DE SCRIPT,
vitest non attendu, calibration manquée, ou arbre non conforme.

⛔ UNE MORSURE SE LIT, ELLE NE SE DÉDUIT PAS D'UN CODE DE SORTIE (D304, D305, D312, D316) : la ligne « Tests » compte au
moins un test en échec (exécutés = passés + en échec) ; le titre attendu porte « × » ; la PREMIÈRE ligne de son bloc
« FAIL … > titre » — en-têtes regroupés sautés — est une `AssertionError`. ⚠ Ce lot n'est pas du chemin de l'argent
(borne de D316 tenue par construction : ni le panneau, ni le module du calendrier, ni sa vue ne changent dans ce lot ;
les cibles R30-1 à R30-6 ne mutent que des NOMS et une CLASSE d'affichage, le temps d'une mesure) : la lecture n'y est
pas EXIGÉE ; elle y est appliquée parce qu'un code de sortie seul ne prouve rien (patron de `neutralize-r29.py`).
⛔ VITEST 3.2.7 : la lecture est calibrée sur SA sortie ; toute autre version ⇒ refus de juger.
⛔ LA MUTATION SE PROUVE POSÉE (D286) : ancre 1 → 0 ET marqueur n → n + 1 (toutes les cibles sont des SUBSTITUTIONS).
⛔ SURVIVRE À UN SIGNAL : sauvegarde sur DISQUE avant toute mutation, restaurée au démarrage suivant.

POURQUOI IL EXISTE : une garde neuve dont on n'a pas montré qu'elle mord est une assurance sans mesure (CLAUDE.md).
Lecteur, calibration et boucle : repris de `neutralize-r29.py` (D321) tels quels.
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

SAUVEGARDE = ".neutralisation-r30"
MANIFESTE = os.path.join(SAUVEGARDE, "manifeste.json")
JOURNAUX = os.path.join(".neutralisation-journaux", "r30")  # ignoré par git ; ce qu'une décision cite se COPIE (D291)
ANSI = re.compile(r"\x1b\[[0-9;]*m")
VITEST_ATTENDU = "v3.2.7"

GRILLE = "apps/client/src/lib/calendar.ts"
MODULE = "apps/client/src/lib/booking-calendar.ts"
PICKER = "apps/client/src/components/venue/booking-date-picker.tsx"
EDITION = "apps/pro/src/venues/edit-venue-page.tsx"

MESURES = {
    "calendrier-noms": ["pnpm", "--filter", "@zwadj/client", "exec", "vitest", "run",
                        "src/components/venue/booking-date-picker.test.tsx"],
    "lien-pro": ["pnpm", "--filter", "@zwadj/pro", "exec", "vitest", "run", "src/venues/calendar-link.test.tsx"],
}

T_AR = "ar : le mois, les sept en-têtes et le nom d'un jour sortent dans la langue de la page"
T_FR = "fr : le mois, les sept en-têtes et le nom d'un jour sortent dans la langue de la page"

CIBLES = [
    # ── Noms — en arabe ET en français (N-a), chaque formateur dans les deux sens où il peut se tromper.
    {"libelle": "R30-1. N-a : les en-têtes de jours ignorent la langue de la page — toujours en FRANÇAIS (vu en arabe)",
     "fichier": GRILLE, "avant": 'const fmt = new Intl.DateTimeFormat(locale, { weekday: format, timeZone: "UTC" });',
     "apres": 'const fmt = new Intl.DateTimeFormat("fr", { weekday: format, timeZone: "UTC" });',
     "mesure": "calendrier-noms", "titre": T_AR},
    {"libelle": "R30-2. N-a : les en-têtes de jours ignorent la langue de la page — toujours en ARABE (vu en français)",
     "fichier": GRILLE, "avant": 'const fmt = new Intl.DateTimeFormat(locale, { weekday: format, timeZone: "UTC" });',
     "apres": 'const fmt = new Intl.DateTimeFormat("ar", { weekday: format, timeZone: "UTC" });',
     "mesure": "calendrier-noms", "titre": T_FR},
    {"libelle": "R30-3. N-a : le nom du mois sort toujours en ARABE (vu en français)",
     "fichier": GRILLE,
     "avant": 'return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(',
     "apres": 'return new Intl.DateTimeFormat("ar", { month: "long", year: "numeric", timeZone: "UTC" }).format(',
     "mesure": "calendrier-noms", "titre": T_FR},
    {"libelle": "R30-4. N-a : la date longue — le nom accessible d'un jour — sort toujours en FRANÇAIS (vu en arabe)",
     "fichier": MODULE, "avant": 'DateTimeFormat(locale, {\r\n    weekday: "long",',
     "apres": 'DateTimeFormat("fr", {\r\n    weekday: "long",',
     "mesure": "calendrier-noms", "titre": T_AR},
    {"libelle": "R30-5. ⛔ N-b : une LISTE de jours écrite en dur dans la vue — juste en français, fausse en arabe",
     "fichier": PICKER, "avant": 'const courts = weekdayHeaders(locale, "short");',
     "apres": 'const courts = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];',
     "mesure": "calendrier-noms", "titre": "N-b : aucun littéral ne porte un nom de jour ou de mois"},
    # ── Week-end (W).
    {"libelle": "R30-6. W-a, W-b : le week-end mis en avant est écrit dans la vue, samedi-dimanche (la convention CLDR, pas D56)",
     "fichier": PICKER, "avant": 'className={cell.isWeekend ? "cal-cell is-weekend" : "cal-cell"}',
     "apres": 'className={cell.dayOfWeek === 6 || cell.dayOfWeek === 0 ? "cal-cell is-weekend" : "cal-cell"}',
     "mesure": "calendrier-noms", "titre": "fr : chaque jour d'août 2027 porte « is-weekend »"},
    # ── Lien de l'assistant pro (K).
    {"libelle": "R30-7. ⛔ K-a : LE DÉFAUT RESTAURÉ — le lien vise `/salles/<id>/calendrier`, route supprimée par D130",
     "fichier": EDITION, "avant": '<Link to="/calendrier" className="btn" onClick={() => selectVenue(venue.id)}>',
     "apres": '<Link to={`/salles/${venue.id}/calendrier`} className="btn" onClick={() => selectVenue(venue.id)}>',
     "mesure": "lien-pro", "titre": "K-a, K-c : sa cible est une route DÉCLARÉE"},
    {"libelle": "R30-8. K-b : le lien ne sélectionne plus la salle éditée — le calendrier ouvert est celui de la PREMIÈRE salle",
     "fichier": EDITION, "avant": "onClick={() => selectVenue(venue.id)}", "apres": "onClick={() => undefined}",
     "mesure": "lien-pro", "titre": "K-b : le calendrier ouvert est celui de la salle ÉDITÉE"},
]


def _binaire(nom: str) -> str:
    """Résout l'exécutable AVANT `subprocess.run` (Windows : `pnpm.cmd`)."""
    return shutil.which(nom) or nom


def lancer(mesure: str) -> tuple[int, str]:
    cmd = MESURES[mesure]
    r = subprocess.run([_binaire(cmd[0]), *cmd[1:]], capture_output=True, text=True, encoding="utf-8", errors="replace")
    return r.returncode, ANSI.sub("", (r.stdout or "") + "\n" + (r.stderr or ""))


def lire_vitest(sortie: str, titre: str | None) -> tuple[str, str]:
    """Rend (verdict, détail). Verdicts : VERT, ROUGE, MORD, SANS-TITRE, PAS-ASSERTION, NON-DÉMARRÉE, VERSION.
    Copie du lecteur de `neutralize-r25.py` (calibré par D316) — mêmes verdicts, mêmes bras de calibration ci-dessous."""
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


# ── CALIBRATION DU LECTEUR, à chaque lancement (D286) — les bras vitest de `neutralize-r25.py`, formes réelles versées
# sous `docs/preuves/D316/` et `docs/preuves/D304/`.
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
    ("matcher jest-dom (Error, pas AssertionError)", _V
     + "   × d > t 12ms\n FAIL  a.test.ts > d > t\nError: expect(element).toHaveAttribute(\"href\", \"/x\")\n"
       "      Tests  1 failed | 13 passed (14)\n", "t", "PAS-ASSERTION"),
    ("rien d'exécuté sous filtre", _V + "      Tests  25 skipped (25)\n", "t", "NON-DÉMARRÉE"),
    ("autre version", " RUN  v3.2.6 C:/x\n      Tests  1 failed (1)\n", "t", "VERSION"),
    ("crochet en échec (bloc de FICHIER, 1 skipped)", _V
     + " Test Files  1 failed (1)\n      Tests  1 skipped (1)\n FAIL  cas/crochet.cas.ts [ cas/crochet.cas.ts ]\n"
       "Error: crochet en panne\n", "t", "NON-DÉMARRÉE"),
    # Bras ajouté par `neutralize-r29.py` (D321), repris tel quel. ⚠ Sa première version prenait pour titre « t », sous-chaîne de « autre » : le lecteur
    # (qui cherche le titre comme SOUS-CHAÎNE, les titres réels étant des débuts de noms de tests) l'y trouvait, et la
    # calibration a ABANDONNÉ avant toute mesure — défaut de l'ÉCHANTILLON, pas du lecteur (D298, section D321).
    ("le titre attendu n'échoue pas (un autre, si)", _V
     + "   × d > une autre garde 3ms\n FAIL  a.test.ts > d > une autre garde\nAssertionError: expected 1 to be 2\n"
       "      Tests  1 failed | 4 passed (5)\n", "garde visée par la cible", "SANS-TITRE"),
]


def calibrer() -> bool:
    manques = 0
    for nom, texte, titre, attendu in CALIBRATION:
        verdict, _ = lire_vitest(texte, titre)
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


def empreintes() -> dict[str, str]:
    return {c["fichier"]: hashlib.sha256(open(c["fichier"], "rb").read()).hexdigest() for c in CIBLES}


def verifier_arbre(moment: str, depart: dict[str, str] | None = None) -> bool:
    """Chaque ancre est là, UNE fois ; à l'arrivée, chaque fichier ciblé a l'EMPREINTE du départ (restauration prouvée à
    l'octet). ⚠ Défaut de la première version de `neutralize-r29.py` (D321), lu à son premier lancement : elle exigeait aussi « marqueur ×0 » — faux pour
    R29-14, dont le marqueur `<ForgotPage />` EXISTE déjà dans `App.tsx` (D286 : le marqueur peut préexister)."""
    ecarts = []
    for c in CIBLES:
        src = io.open(c["fichier"], encoding="utf-8", newline="").read()
        if src.count(c["avant"]) != 1:
            ecarts.append(f"{c['libelle'][:7]} : ancre ×{src.count(c['avant'])}")
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
    depart = empreintes()
    os.makedirs(JOURNAUX, exist_ok=True)
    print(f"cibles : {len(CIBLES)} déclarées · {len(CIBLES)} jouées (unit)")

    # ── PRÉ-VOL : chaque mesure, SANS mutation, doit être verte et avoir DÉMARRÉ.
    for mesure in sorted({c["mesure"] for c in CIBLES}):
        code, sortie = lancer(mesure)
        io.open(os.path.join(JOURNAUX, f"prevol-{mesure}.log"), "w", encoding="utf-8").write(sortie)
        verdict, detail = lire_vitest(sortie, None)
        if code != 0 or verdict != "VERT":
            print(f"✗ PRÉ-VOL {mesure} : code {code}, {verdict} — {detail}")
            print(sortie[-3000:])
            return 2
        print(f"  pré-vol {mesure} : code 0 · {detail}")

    mordu, muettes, erreurs = 0, [], []
    for cible in CIBLES:
        chemin = cible["fichier"]
        source = io.open(chemin, encoding="utf-8", newline="").read()
        ancre_avant, marque_avant = source.count(cible["avant"]), source.count(cible["apres"])
        if ancre_avant != 1:
            print(f"✗ {cible['libelle']}\n   ERREUR DE SCRIPT : {ancre_avant} occurrence(s), 1 attendue dans {chemin}")
            erreurs.append(cible["libelle"])
            break
        mute = source.replace(cible["avant"], cible["apres"])
        ancre_apres, marque_apres = mute.count(cible["avant"]), mute.count(cible["apres"])
        if (ancre_apres, marque_apres) != (0, marque_avant + 1):
            print(f"✗ {cible['libelle']}\n   MUTATION NON POSÉE : ancre {ancre_avant}→{ancre_apres}, "
                  f"marqueur {marque_avant}→{marque_apres} (attendu 1→0 et {marque_avant}→{marque_avant + 1})")
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
        verdict, detail = lire_vitest(sortie, cible["titre"])
        posee = f"ancre 1→0 · marqueur {marque_avant}→{marque_avant + 1}"
        if verdict == "MORD" and code != 0:
            mordu += 1
            print(f"✓ {cible['libelle']}\n   {posee} · code {code} · {detail}")
        elif verdict in ("NON-DÉMARRÉE", "VERSION"):
            print(f"✗ {cible['libelle']}\n   MESURE NON DÉMARRÉE ({verdict}) : {detail}")
            erreurs.append(cible["libelle"])
            break
        else:
            muettes.append(cible["libelle"])
            print(f"✗ {cible['libelle']}\n   {posee} · code {code} · {verdict} — {detail}")

    conforme = verifier_arbre("À L'ARRIVÉE", depart)
    print(f"\n{mordu} garde(s) mordue(s) sur {len(CIBLES)} cible(s) jouée(s) · 0 non mesurée(s) "
          f"(attendu : {len(CIBLES)} sur {len(CIBLES)})")
    if conforme:
        print("arbre rendu à son état de départ : vérifié.")
    if erreurs or not conforme:
        return 2
    return 1 if muettes else 0


if __name__ == "__main__":
    sys.exit(main())
