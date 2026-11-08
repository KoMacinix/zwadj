#!/usr/bin/env python3
"""Campagne de neutralisation — RANG 47 (D345) : le parcours « Nouvelle réservation » garde son étape et ses saisies quand on change d'onglet.

Ce que le lot ajoute, et que chaque cible neutralise :
  · le parcours ÉCRIT son état au fournisseur (R47-1) et le RELIT à l'ouverture, champ par champ : étape, contact, noms, invités, date, créneau, fiche, chaîne
    de devis, « prestations répondues », prestations cochées et détails (R47-2 à R47-14) ; le devis AFFICHÉ n'est pas restauré, il est « à recalculer » (R47-6, R47-7) ;
  · une ISSUE du parcours — réservation créée, devis remis — efface le brouillon (R47-15, R47-16) ;
  · UN PARCOURS PAR SALLE : la clé du composant et la vérification de la salle à la lecture (R47-17, R47-18) ;
  · le brouillon est effacé à la déconnexion et au changement de compte (R47-19, R47-20), et ne survit pas au rechargement (R47-21 : un stockage qui survit à
    l'arbre ET plus d'effacement — la panne qu'un stockage navigateur ou un état de module produirait) ;
  · « Recommencer » remet les réponses à zéro (R47-22) ;
  · GARDE DE SOURCE : aucun accès au stockage du navigateur dans le fournisseur, le module pur ou le parcours (R47-23 à R47-25).
  Hors de ce harnais : le montage du fournisseur dans `AppProviders` (le retirer FAIT LEVER chaque test — `useWalkinDraft` jette hors fournisseur : une erreur, pas une
  assertion, donc pas une morsure sous la lecture ci-dessous) et le libellé « Recommencer » (une erreur de requête ; couvert par la parité des catalogues).

Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-r47.py
Codes de sortie : 0 = tout joué, tout a mordu ; 1 = au moins une garde MUETTE ; 2 = pré-vol rouge, ERREUR DE SCRIPT, vitest non attendu, calibration manquée,
ou arbre non conforme.

⛔ UNE MORSURE SE LIT, ELLE NE SE DÉDUIT PAS D'UN CODE DE SORTIE (D304, D305, D312, D316) : la ligne « Tests » compte au moins un test en échec ; le titre attendu porte
« × » ; la PREMIÈRE ligne de son bloc « FAIL … > titre » — en-têtes regroupés sautés — est une `AssertionError`. Ce lot n'est pas du chemin de l'argent : la lecture
n'y est pas exigée ; elle est appliquée parce qu'un code de sortie seul ne prouve rien (patron de `neutralize-r30.py`).
⛔ VITEST 3.2.7 : la lecture est calibrée sur SA sortie ; toute autre version ⇒ refus de juger.
⛔ LA MUTATION SE PROUVE POSÉE (D286) : pour chaque remplacement, ancre 1 → 0 ET marqueur n → n + 1 (toutes les cibles sont des SUBSTITUTIONS ; aucun remplacement n'est une
sous-chaîne de son ancre — D325). Une cible peut porter PLUSIEURS remplacements (R47-21 : le stockage qui survit ET l'effacement retiré, les deux faits d'une même panne).
⛔ SURVIVRE À UN SIGNAL : sauvegarde sur DISQUE avant toute mutation, restaurée au démarrage suivant.

POURQUOI IL EXISTE : une garde neuve dont on n'a pas montré qu'elle mord est une assurance sans mesure (CLAUDE.md). Lecteur, calibration et boucle : repris de
`neutralize-r30.py` (D322) tels quels, étendus à plusieurs remplacements par cible.
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

SAUVEGARDE = ".neutralisation-r47"
MANIFESTE = os.path.join(SAUVEGARDE, "manifeste.json")
JOURNAUX = os.path.join(".neutralisation-journaux", "r47")  # ignoré par git ; ce qu'une décision cite se COPIE (D291)
ANSI = re.compile(r"\x1b\[[0-9;]*m")
VITEST_ATTENDU = "v3.2.7"

J = "apps/pro/src/dashboard/walkin-journey.tsx"
C = "apps/pro/src/dashboard/walkin-draft-context.tsx"
D = "apps/pro/src/dashboard/walkin-draft.ts"

MESURES = {
    "brouillon": ["pnpm", "--filter", "@zwadj/pro", "exec", "vitest", "run", "src/dashboard/walkin-draft.test.tsx"],
}

T_DATE = "à l'étape DATE"
T_CONTACT = "à l'étape CONTACT"
T_CLIENT = "à l'étape CLIENT"
T_R3 = "R-3 : un devis déjà calculé"
T_PRESTATIONS = "à l'étape PRESTATIONS"
T_FIN_RESA = "à la fin du parcours (réservation créée)"
T_FIN_REMISE = "à la fin du parcours (devis remis)"
T_SALLE = "le brouillon de la salle 1 n'apparaît pas sur la salle 2"
T_DECONNEXION = "à la déconnexion"
T_COMPTE = "au changement de compte"
T_RELOAD = "un arbre neuf (rechargement de la page)"
T_RECOMMENCER = "par « Recommencer »"
T_SOURCE = "le module pur et le fournisseur n'accèdent à aucun stockage du navigateur"
T_SOURCE_PARCOURS = "le parcours lui-même n'y accède pas non plus"

EFFET_DE_COMPTE = (
    "  useEffect(() => {\r\n    gardeRef.current = null;\r\n  }, [userId]);",
    "  useEffect(() => {\r\n    void userId;\r\n  }, [userId]);",
)

CIBLES = [
    # ── Le parcours ÉCRIT son état.
    {"libelle": "R47-1. Le parcours n'écrit RIEN au fournisseur : le brouillon reste vide, tout se perd au changement d'onglet",
     "remplacements": [{"fichier": J, "avant": "    brouillons.ecrire({", "apres": "    void ({"}], "mesure": "brouillon", "titre": T_DATE},
    # ── Il RELIT, champ par champ.
    {"libelle": "R47-2. L'ÉTAPE n'est pas relue : on revient toujours à la première question",
     "remplacements": [{"fichier": J, "avant": 'useState<Step>(reprise?.step ?? "contact")', "apres": 'useState<Step>("contact")'}],
     "mesure": "brouillon", "titre": T_DATE},
    {"libelle": "R47-3. Le CONTACT (numéro, e-mail) n'est pas relu : le champ revient vide",
     "remplacements": [{"fichier": J, "avant": "useState<Identifiant>(reprise?.identifiant ?? NO_IDENTIFIANT)", "apres": "useState<Identifiant>(NO_IDENTIFIANT)"}],
     "mesure": "brouillon", "titre": T_CONTACT},
    {"libelle": "R47-4. Les NOMS ne sont pas relus : le nom tapé disparaît",
     "remplacements": [{"fichier": J, "avant": "useState<Noms>(reprise?.noms ?? NO_NOMS)", "apres": "useState<Noms>(NO_NOMS)"}],
     "mesure": "brouillon", "titre": T_CLIENT},
    {"libelle": "R47-5. Le NOMBRE D'INVITÉS n'est pas relu",
     "remplacements": [{"fichier": J, "avant": 'useState(reprise?.guests ?? "")', "apres": 'useState("")'}],
     "mesure": "brouillon", "titre": T_CLIENT},
    {"libelle": "R47-6. R-3 : le « à recalculer » n'est pas relu — l'écran ne dit plus que le total a été jeté",
     "remplacements": [{"fichier": J, "avant": "useState(reprise?.devisAffiche ?? false)", "apres": "useState(false)"}],
     "mesure": "brouillon", "titre": T_R3},
    {"libelle": "R47-7. R-3 : « un devis était affiché » n'est pas ÉCRIT — même faute, côté écriture",
     "remplacements": [{"fichier": J, "avant": "      devisAffiche: quote !== null || stale", "apres": "      devisAffiche: false"}],
     "mesure": "brouillon", "titre": T_R3},
    {"libelle": "R47-8. R-3 : la CHAÎNE de devis n'est pas relue — le clic suivant créerait un devis de plus au lieu de réviser",
     "remplacements": [{"fichier": J, "avant": "useState<string | null>(reprise?.chainQuoteId ?? null)", "apres": "useState<string | null>(null)"}],
     "mesure": "brouillon", "titre": T_R3},
    {"libelle": "R47-9. La DATE n'est pas relue",
     "remplacements": [{"fichier": J, "avant": "useState<string | null>(reprise?.eventDate ?? null)", "apres": "useState<string | null>(null)"}],
     "mesure": "brouillon", "titre": T_R3},
    {"libelle": "R47-10. Le CRÉNEAU n'est pas relu",
     "remplacements": [{"fichier": J, "avant": "useState<string | null>(reprise?.slotId ?? null)", "apres": "useState<string | null>(null)"}],
     "mesure": "brouillon", "titre": T_R3},
    {"libelle": "R47-11. La FICHE (trouvée ou créée) n'est pas relue : l'étape Client n'est plus répondue",
     "remplacements": [{"fichier": J, "avant": "useState<ClientRecordDTO | null>(reprise?.fiche ?? null)", "apres": "useState<ClientRecordDTO | null>(null)"}],
     "mesure": "brouillon", "titre": T_R3},
    {"libelle": "R47-12. « Prestations répondues » n'est pas relu : « aucune prestation » est oublié",
     "remplacements": [{"fichier": J, "avant": "useState(reprise?.servicesAnswered ?? false)", "apres": "useState(false)"}],
     "mesure": "brouillon", "titre": T_R3},
    {"libelle": "R47-13. Les PRESTATIONS cochées ne sont pas relues",
     "remplacements": [{"fichier": J, "avant": "useState<string[]>(reprise?.picks ?? [])", "apres": "useState<string[]>([])"}],
     "mesure": "brouillon", "titre": T_PRESTATIONS},
    {"libelle": "R47-14. Les DÉTAILS de prestation (palier, quantité) ne sont pas relus",
     "remplacements": [{"fichier": J, "avant": "useState<Record<string, DetailSaisi>>(reprise?.details ?? {})", "apres": "useState<Record<string, DetailSaisi>>({})"}],
     "mesure": "brouillon", "titre": T_PRESTATIONS},
    # ── Une ISSUE du parcours l'efface (R-4).
    {"libelle": "R47-15. R-4 : une réservation CRÉÉE n'efface plus le brouillon — revenir rouvrirait le devis conclu",
     "remplacements": [{"fichier": J, "avant": "if (outcome !== null || done !== null || remit !== null) {", "apres": "if (remit !== null) {"}],
     "mesure": "brouillon", "titre": T_FIN_RESA},
    {"libelle": "R47-16. R-4 : un devis REMIS n'efface plus le brouillon",
     "remplacements": [{"fichier": J, "avant": "if (outcome !== null || done !== null || remit !== null) {", "apres": "if (outcome !== null || done !== null) {"}],
     "mesure": "brouillon", "titre": T_FIN_REMISE},
    # ── Une salle, un parcours (R-5).
    {"libelle": "R47-17. R-5 : le parcours n'est plus monté PAR SALLE — la même instance garde ses réponses quand la salle change",
     "remplacements": [{"fichier": J, "avant": "return <ParcoursDeLaSalle key={venue.id} venue={venue} />;", "apres": "return <ParcoursDeLaSalle venue={venue} />;"}],
     "mesure": "brouillon", "titre": T_SALLE},
    {"libelle": "R47-18. R-5 : la lecture ne vérifie plus la salle — le brouillon de la salle 1 est montré sur la salle 2",
     "remplacements": [{"fichier": C, "avant": "if (garde.venueId !== venueId) {", "apres": "if (false) {"}],
     "mesure": "brouillon", "titre": T_SALLE},
    # ── Compte (R-4) et rechargement (R-2).
    {"libelle": "R47-19. R-4 : la déconnexion n'efface plus le brouillon — le même compte qui se reconnecte le retrouve",
     "remplacements": [{"fichier": C, "avant": EFFET_DE_COMPTE[0], "apres": EFFET_DE_COMPTE[1]}], "mesure": "brouillon", "titre": T_DECONNEXION},
    {"libelle": "R47-20. R-4 : un changement de compte n'efface plus le brouillon",
     "remplacements": [{"fichier": C, "avant": EFFET_DE_COMPTE[0], "apres": EFFET_DE_COMPTE[1]}], "mesure": "brouillon", "titre": T_COMPTE},
    {"libelle": "R47-21. R-2 : le brouillon SURVIT au rechargement — un stockage qui survit à l'arbre, et plus d'effacement au montage (la panne d'un stockage navigateur)",
     "remplacements": [
         {"fichier": C, "avant": "  const gardeRef = useRef<WalkinDraft | null>(null);",
          "apres": "  const gardeRef = ((globalThis as { __r47?: { current: WalkinDraft | null } }).__r47 ??= { current: null });"},
         {"fichier": C, "avant": EFFET_DE_COMPTE[0], "apres": EFFET_DE_COMPTE[1]},
     ],
     "mesure": "brouillon", "titre": T_RELOAD},
    # ── « Recommencer » (R-4).
    {"libelle": "R47-22. R-4 : « Recommencer » ne remet plus le CONTACT à zéro — le brouillon gardé le fait revenir",
     "remplacements": [{"fichier": J, "avant": "    setIdentifiant(NO_IDENTIFIANT);", "apres": "    void NO_IDENTIFIANT;"}],
     "mesure": "brouillon", "titre": T_RECOMMENCER},
    # ── Garde de SOURCE (R-1, R-6) : un accès au stockage du navigateur dans chaque fichier du brouillon.
    {"libelle": "R47-23. R-1 : le FOURNISSEUR lit le stockage du navigateur (localStorage)",
     "remplacements": [{"fichier": C, "avant": "  const userId = user?.id ?? null;", "apres": "  const userId = (typeof localStorage, user?.id ?? null);"}],
     "mesure": "brouillon", "titre": T_SOURCE},
    {"libelle": "R47-24. R-1 : le MODULE PUR lit le stockage du navigateur (indexedDB)",
     "remplacements": [{"fichier": D, "avant": 'export const WALKIN_STEPS = ["contact", "client", "date", "slot", "services", "quote"] as const;',
                        "apres": 'export const WALKIN_STEPS = (typeof indexedDB, ["contact", "client", "date", "slot", "services", "quote"] as const);'}],
     "mesure": "brouillon", "titre": T_SOURCE},
    {"libelle": "R47-25. R-1 : le PARCOURS lit le stockage du navigateur (sessionStorage)",
     "remplacements": [{"fichier": J, "avant": '  const isAr = i18n.language === "ar";', "apres": '  const isAr = (typeof sessionStorage, i18n.language === "ar");'}],
     "mesure": "brouillon", "titre": T_SOURCE_PARCOURS},
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
    Copie du lecteur de `neutralize-r30.py` (calibré par D316) — mêmes verdicts, mêmes bras de calibration ci-dessous."""
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


# ── CALIBRATION DU LECTEUR, à chaque lancement (D286) — les bras vitest de `neutralize-r30.py`, formes réelles versées sous `docs/preuves/D316/` et `docs/preuves/D304/`.
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


def fichiers_cibles() -> list[str]:
    return sorted({r["fichier"] for c in CIBLES for r in c["remplacements"]})


def empreintes() -> dict[str, str]:
    return {f: hashlib.sha256(open(f, "rb").read()).hexdigest() for f in fichiers_cibles()}


def verifier_arbre(moment: str, depart: dict[str, str] | None = None) -> bool:
    """Chaque ancre est là, UNE fois ; à l'arrivée, chaque fichier ciblé a l'EMPREINTE du départ (restauration prouvée à l'octet)."""
    ecarts = []
    for c in CIBLES:
        for r in c["remplacements"]:
            src = io.open(r["fichier"], encoding="utf-8", newline="").read()
            if src.count(r["avant"]) != 1:
                ecarts.append(f"{c['libelle'][:7]} : ancre ×{src.count(r['avant'])} dans {r['fichier']}")
    if depart is not None:
        maintenant = empreintes()
        ecarts += [f"{f} : empreinte changée" for f in depart if depart[f] != maintenant[f]]
        print(f"  empreintes : {len(depart)} fichier(s) ciblé(s) comparé(s) au départ · {sum(depart[f] != maintenant[f] for f in depart)} différent(s) (attendu 0)")
    if ecarts:
        print(f"✗ ARBRE NON CONFORME {moment} : " + " ; ".join(ecarts))
        return False
    return True


def poser(cible: dict) -> tuple[list, dict[str, str], list[str]] | None:
    """Applique les remplacements EN MÉMOIRE puis sur disque ; rend (annuler, contenus mutés, preuves). `None` si une mutation n'est pas posée (ERREUR DE SCRIPT)."""
    contenus: dict[str, str] = {}
    originaux: dict[str, str] = {}
    preuves = []
    for r in cible["remplacements"]:
        f = r["fichier"]
        if f not in contenus:
            originaux[f] = io.open(f, encoding="utf-8", newline="").read()
            contenus[f] = originaux[f]
        source = contenus[f]
        ancre_avant, marque_avant = source.count(r["avant"]), source.count(r["apres"])
        if ancre_avant != 1:
            print(f"✗ {cible['libelle']}\n   ERREUR DE SCRIPT : {ancre_avant} occurrence(s), 1 attendue dans {f}")
            return None
        mute = source.replace(r["avant"], r["apres"])
        ancre_apres, marque_apres = mute.count(r["avant"]), mute.count(r["apres"])
        if (ancre_apres, marque_apres) != (0, marque_avant + 1):
            print(f"✗ {cible['libelle']}\n   MUTATION NON POSÉE : ancre {ancre_avant}→{ancre_apres}, marqueur {marque_avant}→{marque_apres}"
                  f" (attendu 1→0 et {marque_avant}→{marque_avant + 1})")
            return None
        contenus[f] = mute
        preuves.append(f"ancre 1→0 · marqueur {marque_avant}→{marque_avant + 1}")
    annuler = [{"chemin": f, "contenu": originaux[f]} for f in originaux]
    return annuler, contenus, preuves


def main() -> int:
    restaurer_si_interrompu()
    if not calibrer():
        print("✗ ABANDON : le lecteur manque un bras de sa calibration — rien n'est mesuré.")
        return 2
    if not verifier_arbre("AU DÉPART"):
        return 2
    depart = empreintes()
    os.makedirs(JOURNAUX, exist_ok=True)
    print(f"cibles : {len(CIBLES)} déclarées · {sum(len(c['remplacements']) for c in CIBLES)} remplacements · {len(CIBLES)} jouées (unit)")

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
        posee = poser(cible)
        if posee is None:
            erreurs.append(cible["libelle"])
            break
        annuler, contenus, preuves = posee
        _ecrire_manifeste(annuler)
        for f, contenu in contenus.items():
            io.open(f, "w", encoding="utf-8", newline="").write(contenu)
        try:
            code, sortie = lancer(cible["mesure"])
        finally:
            _defaire(annuler)
            shutil.rmtree(SAUVEGARDE, ignore_errors=True)
        # La sortie ENTIÈRE se journalise : un rouge qu'on ne peut plus relire se relance sans être lu (D270).
        ident = cible["libelle"].split(".")[0]
        io.open(os.path.join(JOURNAUX, f"{ident}.log"), "w", encoding="utf-8").write(sortie)
        verdict, detail = lire_vitest(sortie, cible["titre"])
        pose = " ; ".join(preuves)
        if verdict == "MORD" and code != 0:
            mordu += 1
            print(f"✓ {cible['libelle']}\n   {pose} · code {code} · {detail}")
        elif verdict in ("NON-DÉMARRÉE", "VERSION"):
            print(f"✗ {cible['libelle']}\n   MESURE NON DÉMARRÉE ({verdict}) : {detail}")
            erreurs.append(cible["libelle"])
            break
        else:
            muettes.append(cible["libelle"])
            print(f"✗ {cible['libelle']}\n   {pose} · code {code} · {verdict} — {detail}")

    conforme = verifier_arbre("À L'ARRIVÉE", depart)
    print(f"\n{mordu} garde(s) mordue(s) sur {len(CIBLES)} cible(s) jouée(s) · {len(muettes)} muette(s) · {len(erreurs)} non mesurée(s) "
          f"(attendu : {len(CIBLES)} sur {len(CIBLES)} · 0 · 0)")
    if conforme:
        print("arbre rendu à son état de départ : vérifié.")
    if erreurs or not conforme:
        return 2
    return 1 if muettes else 0


if __name__ == "__main__":
    sys.exit(main())
