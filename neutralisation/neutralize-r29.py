#!/usr/bin/env python3
"""Campagne de neutralisation — RANG 29 (D321) : la page de réservation du client.

Ce que le lot ajoute, et que chaque cible neutralise :
  · le CALENDRIER du panneau de demande — module pur `lib/booking-calendar.ts` (mois de la fenêtre, jour choisissable,
    déplacement au clavier) et composant `booking-date-picker.tsx` (un mois à la fois, tabulation itinérante, noms
    accessibles, dates indisponibles inactives) — modes de défaillance C-a à C-j ;
  · un `<label>` VISIBLE par champ du panneau, `required` sur les obligatoires — L-a, L-b ;
  · l'adresse de connexion définie UNE fois par application, et LA garde qui la tient — P-a à P-c ;
  · la garde laissée par D317 : l'API de l'e2e ne tourne pas en surveillance — G-a.
  (La seconde garde de D317 — la neutralisation côté client des assertions de `r26` — vit dans `neutralize-r26.py`,
  cibles R26-3 et R26-4 : elle mesure la spec e2e de `r26`.)

Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-r29.py
Codes de sortie : 0 = tout joué, tout a mordu ; 1 = au moins une garde MUETTE ; 2 = pré-vol rouge, ERREUR DE SCRIPT,
vitest non attendu, calibration manquée, ou arbre non conforme.

⛔ UNE MORSURE SE LIT, ELLE NE SE DÉDUIT PAS D'UN CODE DE SORTIE (D304, D305, D312, D316) : la ligne « Tests » compte au
moins un test en échec (exécutés = passés + en échec) ; le titre attendu porte « × » ; la PREMIÈRE ligne de son bloc
« FAIL … > titre » — en-têtes regroupés sautés — est une `AssertionError`. ⚠ Ce lot n'est pas du chemin de l'argent
(borne de D316 tenue : ni l'aperçu d'acompte, ni le transport de la date vers le prix ne sont mutés) : cette lecture n'y
est pas EXIGÉE ; elle y est appliquée parce qu'un code de sortie seul ne prouve rien (patron de `neutralize-r25.py`).
⛔ VITEST 3.2.7 : la lecture est calibrée sur SA sortie ; toute autre version ⇒ refus de juger.
⛔ LA MUTATION SE PROUVE POSÉE (D286) : ancre 1 → 0 ET marqueur n → n + 1 (toutes les cibles sont des SUBSTITUTIONS).
⛔ SURVIVRE À UN SIGNAL : sauvegarde sur DISQUE avant toute mutation, restaurée au démarrage suivant.

POURQUOI IL EXISTE : une garde neuve dont on n'a pas montré qu'elle mord est une assurance sans mesure (CLAUDE.md).
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

SAUVEGARDE = ".neutralisation-r29"
MANIFESTE = os.path.join(SAUVEGARDE, "manifeste.json")
JOURNAUX = os.path.join(".neutralisation-journaux", "r29")  # ignoré par git ; ce qu'une décision cite se COPIE (D291)
ANSI = re.compile(r"\x1b\[[0-9;]*m")
VITEST_ATTENDU = "v3.2.7"

MODULE = "apps/client/src/lib/booking-calendar.ts"
PICKER = "apps/client/src/components/venue/booking-date-picker.tsx"
PANNEAU = "apps/client/src/components/venue/booking-request-panel.tsx"
CHROME = "apps/client/src/components/site-chrome.tsx"
ROUTES_PRO = "apps/pro/src/routes.ts"
APP_PRO = "apps/pro/src/App.tsx"
CONFIG_E2E = "e2e/playwright.config.ts"

MESURES = {
    "calendrier": ["pnpm", "--filter", "@zwadj/client", "exec", "vitest", "run", "src/lib/booking-calendar.test.ts"],
    "panneau": ["pnpm", "--filter", "@zwadj/client", "exec", "vitest", "run",
                "src/components/venue/booking-request-panel.test.tsx"],
    "garde-connexion": ["pnpm", "--filter", "@zwadj/client", "exec", "vitest", "run", "src/lib/login-path-guard.test.ts"],
    "routes-pro": ["pnpm", "--filter", "@zwadj/pro", "exec", "vitest", "run", "src/routes.test.tsx"],
    "garde-surveillance": ["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run",
                           "src/common/e2e-api-sans-surveillance.spec.ts"],
}

CIBLES = [
    # ── Calendrier — le module pur.
    {"libelle": "R29-1. C-b : un jour TOUT PRIS redevient choisissable (« au moins un créneau » au lieu de « un créneau LIBRE »)",
     "fichier": MODULE, "avant": 'return day !== undefined && day.slots.some((slot) => slot.status === "AVAILABLE");',
     "apres": "return day !== undefined && day.slots.length > 0;",
     "mesure": "calendrier", "titre": "C-b : aucun créneau AVAILABLE"},
    {"libelle": "R29-2. C-e : en arabe, la flèche droite AVANCE — elle va à l'envers de ce que l'œil voit",
     "fichier": MODULE, "avant": "return walk(addDays(from, rtl ? -1 : 1), rtl ? -1 : 1);",
     "apres": "return walk(addDays(from, 1), 1);",
     "mesure": "calendrier", "titre": "flèche droite = jour suivant de gauche à droite"},
    {"libelle": "R29-3. C-c : la navigation s'arrête un mois AVANT la fin de la fenêtre",
     "fichier": MODULE, "avant": "compareMonths(m, monthOf(bounds.last)) <= 0", "apres": "compareMonths(m, monthOf(bounds.last)) < 0",
     "mesure": "calendrier", "titre": "couvre la fenêtre de 182 jours mois par mois"},
    {"libelle": "R29-4. C-a : le calendrier s'ouvre sur un mois sans date libre alors que le suivant en a",
     "fichier": MODULE, "avant": "const libre = days.find((day) => isDaySelectable(day));", "apres": "const libre = days[0];",
     "mesure": "calendrier", "titre": "le mois ouvert d'abord est celui du premier jour LIBRE"},
    # ── Calendrier — le composant.
    {"libelle": "R29-5. ⛔ C-j : LE DÉFAUT RESTAURÉ — tous les mois de la fenêtre rendus d'un coup",
     "fichier": PICKER, "avant": "const grille = monthGrid(shown.year, shown.month);",
     "apres": "const grille = months.flatMap((m) => monthGrid(m.year, m.month));",
     "mesure": "panneau", "titre": "C-j : UN mois à la fois"},
    {"libelle": "R29-6. C-b : une date indisponible redevient activable",
     "fichier": PICKER, "avant": "disabled={!ok}", "apres": "disabled={false}",
     "mesure": "panneau", "titre": "une date PRISE reste affichée, désactivée"},
    {"libelle": "R29-7. C-f : un jour ne se nomme plus que par son numéro — ni la date entière, ni son état",
     "fichier": PICKER, "avant": 'aria-label={t(ok ? "dayFree" : "dayFull", { date: longDate(date, locale) })}',
     "apres": "aria-label={dayNumber(date, locale)}",
     "mesure": "panneau", "titre": "C-e : UN arrêt de tabulation dans la grille"},
    {"libelle": "R29-8. C-e : chaque jour est un arrêt de tabulation — la grille se traverse au Tab, jour par jour",
     "fichier": PICKER, "avant": "tabIndex={date === arret ? 0 : -1}", "apres": "tabIndex={0}",
     "mesure": "panneau", "titre": "C-e : UN arrêt de tabulation dans la grille"},
    {"libelle": "R29-9. C-d : le jour cliqué n'est pas celui dont les créneaux s'affichent (et s'envoient)",
     "fichier": PICKER, "avant": "onSelect(date);", "apres": "onSelect(days.find((d) => isDaySelectable(d))?.date ?? date);",
     "mesure": "panneau", "titre": "C-d : le jour REGARDÉ est celui qu'on envoie"},
    # ── Libellés.
    {"libelle": "R29-10. L-a : le libellé du palier n'est plus ASSOCIÉ à son champ",
     "fichier": PANNEAU, "avant": "<label htmlFor={`${champId}-${service.id}-palier`}",
     "apres": "<label htmlFor={`${champId}-${service.id}-palier-x`}",
     "mesure": "panneau", "titre": "L-a : chaque champ du panneau a un <label> visible associé"},
    {"libelle": "R29-11. L-b : le nombre d'invités n'est plus déclaré obligatoire (D32)",
     "fichier": PANNEAU, "avant": '<Field label={t("guests")} required>', "apres": '<Field label={t("guests")}>',
     "mesure": "panneau", "titre": "L-a : chaque champ du panneau a un <label> visible associé"},
    # ── Adresse de connexion.
    {"libelle": "R29-12. ⛔ P-a : un littéral de connexion posé AILLEURS (l'en-tête du site)",
     "fichier": CHROME, "avant": "href={LOGIN_PATH}", "apres": 'href="/auth/connexion"',
     "mesure": "garde-connexion", "titre": "P-a : aucune adresse de connexion ailleurs que dans les deux constantes"},
    {"libelle": "R29-13. P-c : le Pro change sa page de connexion, le lien du client vise l'ancienne",
     "fichier": ROUTES_PRO, "avant": 'export const LOGIN_PATH = "/auth/connexion";',
     "apres": 'export const LOGIN_PATH = "/auth/se-connecter";',
     "mesure": "garde-connexion", "titre": "P-c : le lien du client vers la connexion PRO"},
    {"libelle": "R29-14. P-b : la route du Pro à LOGIN_PATH ne rend plus la page de connexion",
     "fichier": APP_PRO, "avant": "<LoginPage />", "apres": "<ForgotPage />",
     "mesure": "routes-pro", "titre": "à LOGIN_PATH, la page de connexion se rend"},
    # ── Garde de D317.
    {"libelle": "R29-15. ⛔ G-a : LE DÉFAUT DE D317 RESTAURÉ — l'API de l'e2e relancée par `run dev` (nest start --watch)",
     "fichier": CONFIG_E2E, "avant": 'command: "pnpm --filter @zwadj/api exec nest start",',
     "apres": 'command: "pnpm --filter @zwadj/api run dev",',
     "mesure": "garde-surveillance", "titre": "G-a : dans `e2e/playwright.config.ts`"},
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
    # Bras AJOUTÉ par ce harnais. ⚠ Sa première version prenait pour titre « t », sous-chaîne de « autre » : le lecteur
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
    l'octet). ⚠ Défaut de la première version, lu au premier lancement : elle exigeait aussi « marqueur ×0 » — faux pour
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
