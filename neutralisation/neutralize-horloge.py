"""Harnais du lot HORLOGE. A lancer DEPUIS LA RACINE :
    python3 neutralisation/neutralize-horloge.py

L'objet du lot est de rendre `walkin-journey.test.tsx` INSENSIBLE A TOUTE DATE.
Le montrer vert ne prouve rien : il l'etait aussi avant, jusqu'au 01/09/2026 a
minuit. Ce harnais prouve les DEUX moities de la propriete.

  C1 — CIBLE CLASSIQUE : on retire le gel d'horloge. Le fichier doit devenir ROUGE.
       Prouve que le gel MORD, et non qu'il decore.

  C2 — CIBLE INVERSEE : on deplace l'ancre `MAINTENANT` de dix ans. Le fichier doit
       RESTER VERT. Prouve que toutes les fixtures DERIVENT de l'ancre — s'il en
       restait une ecrite en dur, elle divergerait et le test tomberait.
       ⚠ Une cible inversee se lit a l'envers : ici, « la mutation ne change RIEN »
       est le succes. C'est la seule facon de mesurer une insensibilite, qu'aucune
       mutation-qui-fait-rougir ne peut demontrer.

Exigences du depot tenues ici : sauvegarde DISQUE avant mutation, restauration au
DEMARRAGE, purge en fin (D224) ; assertion de comptage avant mutation et
verification que la mutation a ete APPLIQUEE apres ; lecture/ecriture en OCTETS
(read_text traduit CRLF -> LF en silence) ; comptage des tests execute, un filtre
qui ne correspond plus rend 0 et se lit comme « la garde est inutile » (D144).
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
    "(python3 neutralisation/neutralize-horloge.py)")

SPEC_DEPUIS_RACINE = "apps/pro/src/dashboard/walkin-journey.test.tsx"
SPEC = SPEC_DEPUIS_RACINE.removeprefix("apps/pro/")
SRC = RACINE / SPEC_DEPUIS_RACINE
SAUV = SRC.with_suffix(".tsx.sauvegarde")
assert SRC.exists(), "ERREUR DE SCRIPT : " + SPEC_DEPUIS_RACINE + " introuvable"

PNPM = shutil.which("pnpm")
assert PNPM, "ERREUR DE SCRIPT : pnpm introuvable"

NB_TESTS_ATTENDU = 41

CIBLES = [
    ("C1  le gel d'horloge est retire",
     "  vi.useFakeTimers({ shouldAdvanceTime: true });\n  vi.setSystemTime(MAINTENANT);\n",
     "",
     "rouge"),
    ("C2  l'ancre MAINTENANT est deplacee de dix ans",
     'const MAINTENANT = new Date("2026-08-10T09:00:00Z");',
     'const MAINTENANT = new Date("2036-08-10T09:00:00Z");',
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


def muter(avant, apres):
    brut = SRC.read_bytes()
    assert brut.count(b"\r\n") == brut.count(b"\n"), "fins de ligne mixtes dans la source"
    texte = brut.decode("utf-8")
    motif = avant.replace("\n", "\r\n")
    n = texte.count(motif)
    assert n == 1, ("ERREUR DE SCRIPT : " + str(n) + " occurrence(s) du motif, attendu 1 "
                    "-- ancre perimee ?")
    SRC.write_bytes(texte.replace(motif, apres.replace("\n", "\r\n"), 1).encode("utf-8"))
    assert SRC.read_bytes().decode("utf-8").count(motif) == 0, (
        "ERREUR DE SCRIPT : la mutation n'a pas ete appliquee")


if SAUV.exists():
    shutil.copyfile(SAUV, SRC)
    print("sauvegarde trouvee au demarrage : arbre restaure avant de commencer")
shutil.copyfile(SRC, SAUV)
REFERENCE = SRC.read_bytes()

print("temoin (aucune mutation)")
assert joue() == 0, "le temoin doit etre VERT avant toute mutation"

compte = 0
tout = True
for nom, avant, apres, attendu in CIBLES:
    muter(avant, apres)
    code = joue()
    shutil.copyfile(SAUV, SRC)
    obtenu = "vert" if code == 0 else "rouge"
    bon = obtenu == attendu
    tout = tout and bon
    compte += 1 if bon else 0
    if bon:
        print("\u2713 " + nom + "  (attendu " + attendu + ", obtenu " + obtenu + ")")
    else:
        print("\u2717 " + nom + "  (attendu " + attendu + ", obtenu " + obtenu + ")")
        if attendu == "vert":
            print("   une date est restee ECRITE EN DUR : elle n'a pas suivi l'ancre.")
        else:
            print("   le gel ne MORD pas : le fichier passe sans lui.")

SAUV.unlink()
conforme = SRC.read_bytes() == REFERENCE
print("")
print(str(compte) + " garde(s) mordue(s) sur " + str(len(CIBLES)) + " cible(s).")
if conforme:
    print("arbre rendu a son etat de depart : verifie.")
else:
    print("\u2717 ARBRE NON CONFORME en fin de campagne")
sys.exit(0 if (tout and conforme) else 1)
