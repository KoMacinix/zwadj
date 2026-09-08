"""Harnais du lot ACT/PLAFONDS. A lancer DEPUIS LA RACINE :
    python3 neutralisation/neutralize-act-plafonds.py

Le lot a sorti `walkin-journey.test.tsx` de la liste PLAFONDS, apres avoir ramene
son bruit de 293 avertissements act(...) a ZERO. Le montrer vert ne prouve rien :
il etait DEJA vert avec ses 293, l'exemption les absorbait. Ce harnais prouve les
deux moities de ce qui a change.

  C1, C2, C3 — CIBLES CLASSIQUES : on retire, une par une, les trois fenetres
       `act` ouvertes par le correctif. Le fichier doit devenir ROUGE a chaque
       fois. Prouve que CHACUNE porte une charge -- et non que l'une d'elles
       suffit pendant que les deux autres decorent.
       ⚠ Les trois sont distinctes par construction : le socle de montage
       (122 avertissements), le montage du calendrier (3 par test) et la
       seconde execution de son effet (3 de plus dans les parcours longs).

  C4 — CIBLE INVERSEE, ET C'EST ELLE QUI MESURE LA SORTIE DE PLAFONDS. On retire
       la meme fenetre que C1 **et** on remet l'entree d'exemption, plafond 999.
       Le fichier doit RESTER VERT. Prouve que le rouge de C1 vient de l'ABSENCE
       D'EXEMPTION -- c'est-a-dire que la garde est desormais armee sur ce
       fichier -- et non d'un test qui echouerait pour une autre raison.
       ⚠ Une cible inversee se lit a l'envers : ici, « la mutation ne fait PAS
       rougir » est le succes. Sans elle, C1/C2/C3 seraient compatibles avec un
       fichier toujours exempte dont un test casse.

Exigences du depot tenues ici : sauvegarde DISQUE avant mutation, restauration au
DEMARRAGE, purge en fin (D224) ; assertion de comptage avant mutation et
verification que la mutation a ete APPLIQUEE apres ; lecture/ecriture en OCTETS
(read_text traduit CRLF -> LF en silence) ; comptage des tests executes, un filtre
qui ne correspond plus rend 0 et se lit comme « la garde est inutile » (D144).
⚠ Ce harnais mute DEUX fichiers (le spec et le fichier de preparation) : chacun a
sa sauvegarde, et l'arbre entier est confronte a sa reference en fin de campagne.
"""
import re
import shutil
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

RACINE = Path.cwd()
assert (RACINE / "pnpm-workspace.yaml").exists(), (
    "ERREUR DE SCRIPT : lancer depuis la RACINE du depot "
    "(python3 neutralisation/neutralize-act-plafonds.py)")

SPEC_DEPUIS_RACINE = "apps/pro/src/dashboard/walkin-journey.test.tsx"
SPEC = SPEC_DEPUIS_RACINE.removeprefix("apps/pro/")
SRC = RACINE / SPEC_DEPUIS_RACINE
PREP = RACINE / "apps/pro/src/test-setup.ts"
for f in (SRC, PREP):
    assert f.exists(), "ERREUR DE SCRIPT : " + str(f) + " introuvable"

SAUV = {f: f.with_suffix(f.suffix + ".sauvegarde") for f in (SRC, PREP)}

PNPM = shutil.which("pnpm")
assert PNPM, "ERREUR DE SCRIPT : pnpm introuvable"

NB_TESTS_ATTENDU = 41

# ⚠ L'ancre de chaque fenetre est son COMMENTAIRE, pas le seul appel : les trois
# appels a `laisserRetomber()` sont identiques, et une ancre qui en designe
# trois ne designe aucun (D272, famille « une garde qui se contente d'un
# exemple »).
FENETRE_SOCLE = """  // ⚠ Le bootstrap d'`AppProviders` est encore en vol quand `render` rend la
  // main : c'est lui qui produisait 2 avertissements `AuthProvider` et 1
  // `WalkinJourney` dans CHACUN des 41 tests, soit 122 des 293.
  await laisserRetomber();
"""

FENETRE_MONTAGE_CALENDRIER = """  // ⚠ Valider le client fait apparaître l'étape date, donc MONTE
  // `VenueCalendar`, qui part aussitôt chercher sa disponibilité. Ses trois
  // `setState` (`setData`, `setError`, `setLoading`) retombent ici.
  await laisserRetomber();
"""

FENETRE_SECOND_EFFET = """  // ⚠ Choisir la date fait REJOUER l'effet du calendrier — d'où 6 et non 3
  // dans les parcours qui vont au-delà de l'étape date. Le second passage se
  // reçoit comme le premier.
  await laisserRetomber();
"""

ANCRE_PLAFONDS = "  // 6 le 22/08 (S7), inchangé.\n"
EXEMPTION_REMISE = (
    '  "src/dashboard/walkin-journey.test.tsx": 999,\n'
    + ANCRE_PLAFONDS
)

# (nom, [(fichier, avant, apres), ...], verdict attendu)
CIBLES = [
    ("C1  la fenetre act du socle de montage est retiree",
     [(SRC, FENETRE_SOCLE, "")],
     "rouge"),
    ("C2  la fenetre act du montage du calendrier est retiree",
     [(SRC, FENETRE_MONTAGE_CALENDRIER, "")],
     "rouge"),
    ("C3  la fenetre act du second effet du calendrier est retiree",
     [(SRC, FENETRE_SECOND_EFFET, "")],
     "rouge"),
    ("C4  meme retrait que C1, mais l'exemption PLAFONDS est remise",
     [(SRC, FENETRE_SOCLE, ""), (PREP, ANCRE_PLAFONDS, EXEMPTION_REMISE)],
     "vert"),
]


def joue():
    r = subprocess.run([PNPM, "--filter", "@zwadj/pro", "exec", "vitest", "run", SPEC],
                       cwd=RACINE, capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    s = re.sub(r"\x1b\[[0-9;]*m", "", r.stdout + r.stderr)
    total = re.search(r"Tests\s+.*?\((\d+)\)", s)
    assert total and int(total.group(1)) == NB_TESTS_ATTENDU, (
        "ERREUR DE SCRIPT : " + str(NB_TESTS_ATTENDU) + " tests attendus dans " + SPEC
        + ". Un filtre qui ne correspond plus rend 0 et se lit comme "
        "« la garde est inutile » (D144).\n" + s[-800:])
    return r.returncode


def muter(fichier, avant, apres):
    brut = fichier.read_bytes()
    assert brut.count(b"\r\n") == brut.count(b"\n"), (
        "fins de ligne mixtes dans " + fichier.name)
    texte = brut.decode("utf-8")
    motif = avant.replace("\n", "\r\n")
    n = texte.count(motif)
    assert n == 1, ("ERREUR DE SCRIPT : " + str(n) + " occurrence(s) du motif dans "
                    + fichier.name + ", attendu 1 -- ancre perimee ?")
    # ⛔ LA VERIFICATION NE PEUT PAS ETRE « L'ANCRE A DISPARU ». C4 est une
    # INSERTION : son remplacement CONTIENT l'ancre, qui est donc toujours la
    # apres coup. Ecrite ainsi, elle levait « la mutation n'a pas ete appliquee »
    # sur une mutation parfaitement appliquee -- une erreur de script qui se lit
    # comme un defaut de code (meme famille que D144).
    # ⇒ On compare a l'ETAT ATTENDU : cela couvre les deux formes, et attrape en
    # prime la mutation INERTE, celle qui remplace une expression par une autre
    # de meme valeur et ne mesure donc rien (D236).
    attendu = texte.replace(motif, apres.replace("\n", "\r\n"), 1)
    assert attendu != texte, (
        "ERREUR DE SCRIPT : mutation INERTE dans " + fichier.name
        + " -- le remplacement ne change rien, la cible ne mesurerait rien.")
    fichier.write_bytes(attendu.encode("utf-8"))
    assert fichier.read_bytes().decode("utf-8") == attendu, (
        "ERREUR DE SCRIPT : l'ecriture n'a pas pris dans " + fichier.name)


for f, s in SAUV.items():
    if s.exists():
        shutil.copyfile(s, f)
        print("sauvegarde trouvee au demarrage : " + f.name + " restaure avant de commencer")
for f, s in SAUV.items():
    shutil.copyfile(f, s)
REFERENCE = {f: f.read_bytes() for f in SAUV}

# ⛔ PRE-VOL : le fichier ne doit PLUS etre exempte, sinon tout ce qui suit
# mesure autre chose. Une campagne qui part d'un fichier exempte rendrait C1
# vert et se lirait comme « le correctif est inutile ».
prep = PREP.read_bytes().decode("utf-8")
assert '"src/dashboard/walkin-journey.test.tsx":' not in prep, (
    "ERREUR DE SCRIPT : le spec est ENCORE exempte dans PLAFONDS. "
    "Le lot n'est pas dans l'etat qu'il pretend mesurer.")
print("pre-vol : le spec n'est plus exempte dans PLAFONDS")

print("temoin (aucune mutation)")
assert joue() == 0, "le temoin doit etre VERT avant toute mutation"

compte = 0
tout = True
for nom, mutations, attendu in CIBLES:
    for fichier, avant, apres in mutations:
        muter(fichier, avant, apres)
    code = joue()
    for fichier in SAUV:
        shutil.copyfile(SAUV[fichier], fichier)
    obtenu = "vert" if code == 0 else "rouge"
    bon = obtenu == attendu
    tout = tout and bon
    compte += 1 if bon else 0
    if bon:
        print("✓ " + nom + "  (attendu " + attendu + ", obtenu " + obtenu + ")")
    else:
        print("✗ " + nom + "  (attendu " + attendu + ", obtenu " + obtenu + ")")
        if attendu == "vert":
            print("   le rouge de C1 ne venait donc PAS de l'absence d'exemption :")
            print("   un test echoue pour une autre raison, et C1/C2/C3 ne mesurent rien.")
        else:
            print("   cette fenetre act ne porte AUCUNE charge : le fichier passe sans elle.")

for s in SAUV.values():
    s.unlink()
conforme = all(f.read_bytes() == REFERENCE[f] for f in SAUV)
print("")
print(str(compte) + " garde(s) mordue(s) sur " + str(len(CIBLES)) + " cible(s).")
if conforme:
    print("arbre rendu a son etat de depart : verifie.")
else:
    print("✗ ARBRE NON CONFORME en fin de campagne")
sys.exit(0 if (tout and conforme) else 1)
