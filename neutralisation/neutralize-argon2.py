"""Harnais du lot argon2 -> test:int (D271). A lancer DEPUIS LA RACINE :
    python3 neutralisation/neutralize-argon2.py

Prouve que les gardes du chemin anti-timing D5 MORDENT. Ces gardes ont remplace
deux comparaisons de DUREES (MD2) : elles doivent donc etre demontrees, sinon on
aurait troque une garde fragile contre une garde creuse.

Exigences du depot tenues ici :
- sauvegarde DISQUE avant mutation + restauration au DEMARRAGE + purge en fin,
  parce qu'un `finally` ne s'execute pas quand le processus est tue (D224) ;
- chaque cible DESIGNE son fichier de test (D223) ;
- assertion de COMPTAGE avant mutation, et verification que la mutation a bien
  ete APPLIQUEE apres ecriture ;
- lecture/ecriture en OCTETS : read_text() traduit CRLF -> LF en silence ;
- PRE-VOL DE LA DETECTION : le lecteur de rouges est lui-meme verifie sur une
  mutation connue rouge. Sans lui, un motif perime se lit exactement comme
  « la garde est muette » -- c'est le vert creux que ce script existe pour
  attraper, un etage au-dessus de lui (D144). Vecu pendant l'ecriture de ce lot :
  trois cibles rapportees MUETTES alors qu'elles mordaient toutes les trois.
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
    "(python3 neutralisation/neutralize-argon2.py)"
)

SRC = RACINE / "apps/api/src/auth/password.service.ts"
SAUV = SRC.with_suffix(".ts.sauvegarde")

# Le chemin est ecrit DEPUIS LA RACINE, et l'argument vitest en est DERIVE.
# Ecrit relativement au paquet, il resterait invisible au tri de
# `lancer-campagnes.py`, qui ne retient que les chemins resolvant depuis la
# racine : editer le seul fichier de spec ne declencherait jamais cette campagne.
SPEC_DEPUIS_RACINE = "apps/api/src/auth/password.service.dummy.spec.ts"
SPEC = SPEC_DEPUIS_RACINE.removeprefix("apps/api/")
assert (RACINE / SPEC_DEPUIS_RACINE).exists(), f"ERREUR DE SCRIPT : {SPEC_DEPUIS_RACINE} introuvable"

PNPM = shutil.which("pnpm")
assert PNPM, "ERREUR DE SCRIPT : pnpm introuvable"

LIGNE_ROUGE = re.compile(r"^\s*[\u00d7\u2717]\s")
NB_TESTS_ATTENDU = 4

CIBLES = [
    ("le verify contre le hash factice est retire (le chemin devient GRATUIT)",
     "    await this.verify(await this.dummyHash, plain);\n", "",
     "argon2.verify CONTRE LE HASH FACTICE"),
    ("la memoisation est retiree (le hash factice est recalcule a chaque appel)",
     "this.dummyHash ??= argon2.hash(", "this.dummyHash = argon2.hash(",
     "UN seul argon2.hash, DEUX verify"),
    ("la preimage devient le mot de passe soumis (la comparaison pourrait etre VRAIE)",
     'argon2.hash(randomBytes(32).toString("base64url")', "argon2.hash(plain",
     "image du hash factice n'est PAS le mot de passe soumis"),
]


def joue():
    r = subprocess.run(
        [PNPM, "--filter", "@zwadj/api", "exec", "vitest", "run", SPEC, "--reporter=verbose"],
        cwd=RACINE, capture_output=True, text=True, encoding="utf-8", errors="replace")
    sortie = re.sub(r"\x1b\[[0-9;]*m", "", r.stdout + r.stderr)
    total = re.search(r"Tests\s+.*?\((\d+)\)", sortie)
    assert total and int(total.group(1)) == NB_TESTS_ATTENDU, (
        f"ERREUR DE SCRIPT : {NB_TESTS_ATTENDU} tests attendus dans {SPEC}. "
        "Un filtre qui ne correspond plus rend 0 et se lit comme "
        f"« la garde est inutile » (D144).\n{sortie[-800:]}")
    return r.returncode, sortie


def rouges(sortie):
    return [l.strip() for l in sortie.splitlines() if LIGNE_ROUGE.match(l)]


def muter(avant, apres):
    brut = SRC.read_bytes()
    assert brut.count(b"\r\n") == brut.count(b"\n"), "fins de ligne mixtes dans la source"
    texte = brut.decode("utf-8")
    motif = avant.replace("\n", "\r\n")
    n = texte.count(motif)
    assert n == 1, f"ERREUR DE SCRIPT : {n} occurrence(s) du motif, attendu 1 -- ancre perimee ?"
    SRC.write_bytes(texte.replace(motif, apres.replace("\n", "\r\n"), 1).encode("utf-8"))
    assert SRC.read_bytes().decode("utf-8").count(motif) == 0, (
        "ERREUR DE SCRIPT : la mutation n'a pas ete appliquee")


# PRE-VOL DES ANCRES : chaque libelle attendu doit EXISTER dans le spec. Sans
# cette verification, un nom de test retape (un accent en moins suffit) rend la
# cible MUETTE alors que la garde mord -- vecu deux fois sur ce lot.
SOURCE_SPEC = (RACINE / SPEC_DEPUIS_RACINE).read_bytes().decode("utf-8")
for _nom, _a, _b, _attendu in CIBLES:
    assert _attendu in SOURCE_SPEC, (
        f"ERREUR DE SCRIPT : le libelle attendu << {_attendu} >> n'existe pas dans "
        f"{SPEC_DEPUIS_RACINE}. Une ancre perimee rend la cible MUETTE sans rien mesurer.")

if SAUV.exists():
    shutil.copyfile(SAUV, SRC)
    print("sauvegarde trouvee au demarrage : arbre restaure avant de commencer")
shutil.copyfile(SRC, SAUV)
REFERENCE = SRC.read_bytes()

print("temoin (aucune mutation)")
code, sortie = joue()
assert code == 0 and not rouges(sortie), "le temoin doit etre VERT avant toute mutation"

print("pre-vol de la DETECTION (mutation connue rouge)")
muter(CIBLES[0][1], CIBLES[0][2])
code, sortie = joue()
shutil.copyfile(SAUV, SRC)
assert code != 0, "PRE-VOL : la mutation temoin n'a pas fait rougir -- mutation inerte"
assert rouges(sortie), (
    "PRE-VOL : le lecteur ne voit AUCUN rouge alors que la suite est rouge. "
    "Le motif de detection est perime -- sans ce pre-vol, toutes les cibles "
    f"auraient ete rapportees « muettes ».\n{sortie[-800:]}")

tout_mord = True
compte = 0
for nom, avant, apres, attendu in CIBLES:
    muter(avant, apres)
    code, sortie = joue()
    shutil.copyfile(SAUV, SRC)
    lignes = rouges(sortie)
    mord = code != 0 and any(attendu in l for l in lignes)
    tout_mord &= mord
    compte += 1 if mord else 0
    # FORMAT IMPOSE PAR lancer-campagnes.py, RELEVE DANS SA SOURCE, PAS DEVINE :
    # il compte les lignes commencant par la coche (mordue) ou la croix (muette)
    # et cherche « N garde(s) mordue(s) sur M cible(s) ». Un harnais qui ecrit
    # autrement sort en 0 et se fait agreger a ZERO garde : invisible, donc pire
    # qu'en echec. Vecu sur ce lot -- le tri a rapporte 0 mordue sur 3.
    if mord:
        print("\u2713 " + nom)
    else:
        print("\u2717 " + nom)
        print("   garde attendue rouge : " + attendu + ", " + str(len(lignes)) + " rouge(s)")

SAUV.unlink()
conforme = SRC.read_bytes() == REFERENCE
print("")
print(str(compte) + " garde(s) mordue(s) sur " + str(len(CIBLES)) + " cible(s).")
if conforme:
    print("arbre rendu a son etat de depart : verifie.")
else:
    print("\u2717 ARBRE NON CONFORME en fin de campagne")
sys.exit(0 if (tout_mord and conforme) else 1)
