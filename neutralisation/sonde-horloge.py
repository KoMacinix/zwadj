"""SONDE HORLOGE — quels fichiers de test dependent de l'horloge ?
    python3 neutralisation/sonde-horloge.py [chemins relatifs au paquet...]

Repond a UNE question : ce fichier changerait-il de resultat si la date changeait ?

METHODE — deux bras, tous deux DERIVES des fixtures du fichier, jamais d'une date
posee a cote ; le fichier est joue SEUL :
  · bras DANS  : gel au milieu de la fenetre de dates du fichier ;
  · bras APRES : gel 60 jours apres sa derniere date. Ce bras existe parce qu'un
    fichier vert aujourd'hui qui cassera a l'echeance doit entrer dans le lot.

DEUX INSTRUMENTS ONT ETE ECARTES AVANT CELUI-CI, chacun par son propre controle :
  1. le gel GLOBAL dans test-setup.ts : pose a la date DU JOUR, ou rien ne devrait
     changer, il rendait 26 echecs au lieu de 24 ; aux dates lointaines la collecte
     entiere tombait. Il perturbait ce qu'il mesurait.
  2. la detection STATIQUE des lectures d'horloge (new Date(), Date.now(), today) :
     elle classait SANS RISQUE le seul fichier dont on savait qu'il etait casse — la
     lecture se faisait plus bas dans l'arbre. Un classificateur qui rate le cas
     connu ne peut pas trier les autres.

ARTEFACT CONNU, NEUTRALISE ICI : les faux timers perturbent l'ordonnancement
asynchrone de React et produisent des avertissements act(...), que la garde de
test-setup.ts transforme en echecs. Un fichier qui ne rougit QUE par cette garde
n'est PAS sensible a la date : c'est la sonde qui le casse. C'est le mecanisme qui
avait invalide l'instrument global, revenu par fichier et en plus discret.

CALIBRATION OBLIGATOIRE — la sonde ABANDONNE si un seul cas manque son verdict :
  · POSITIF, synthetique : une copie temporaire du fichier corrige, PRIVEE de son
    gel, doit ressortir SENSIBLE. Sans lui la sonde ne prouverait plus qu'elle sait
    DETECTER : le cas positif naturel a disparu le jour ou le lot horloge l'a
    corrige, et une sonde sans cas positif est une garde qui ne mord pas.
  · NEGATIF sans date : doit ressortir insensible.
  · NEGATIF AVEC une date en dur : doit ressortir insensible. C'est le seul cas qui
    distingue une vraie sonde d'un detecteur de « contient une date » deguise.

POUR L'APPLIQUER A UN AUTRE PAQUET (client, api) : changer PAQUET_NOM et PAQUET, et
DESIGNER TROIS NOUVEAUX CAS DE CALIBRATION dont la reponse est connue AVANT de
mesurer. Une sonde transposee sans recalibrage ne mesure rien.
"""
import datetime
import re
import shutil
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

RACINE = Path.cwd()
assert (RACINE / "pnpm-workspace.yaml").exists(), (
    "ERREUR DE SCRIPT : lancer depuis la RACINE (python3 neutralisation/sonde-horloge.py)")
PNPM = shutil.which("pnpm")
assert PNPM, "ERREUR DE SCRIPT : pnpm introuvable"

PAQUET_NOM = "pro"
PAQUET = RACINE / "apps/pro"
DATE = re.compile(r"[\"'`](\d{4}-\d{2}-\d{2})(?:T[\d:.]+Z?)?[\"'`]")
GEL_EXISTANT = re.compile(r"setSystemTime|useFakeTimers|MockDate")
GARDE_CONSOLE = re.compile(r"avertissement\(s\) de console")
CAUSE = re.compile(r"(?:^|\n)\s*(?:Error|AssertionError|TestingLibraryElementError)[^\n]*")
MARQUE = "SONDE HORLOGE - INJECTION TEMPORAIRE"

CORRIGE = "src/dashboard/walkin-journey.test.tsx"
TEMOIN_POSITIF = "src/dashboard/__sonde-positif.test.tsx"
GEL_DU_CORRIGE = ("  vi.useFakeTimers({ shouldAdvanceTime: true });\n"
                  "  vi.setSystemTime(MAINTENANT);\n")
NEGATIF_SANS_DATE = "src/ui-tokens.test.ts"
NEGATIF_AVEC_DATE = "src/venues/photos-section.test.tsx"


def dates_du_fichier(src):
    out = []
    for brut in DATE.findall(src):
        try:
            out.append(datetime.date.fromisoformat(brut))
        except ValueError:
            pass          # une chaine qui ressemble a une date n'en est pas une
    return sorted(set(out))


def injecte(chemin, jour):
    brut = chemin.read_bytes()
    assert brut.count(b"\r\n") == brut.count(b"\n"), "fins de ligne mixtes : " + str(chemin)
    lignes = [
        "// " + MARQUE + " - a restaurer",
        'import { afterAll as __sApres, beforeAll as __sAvant, vi as __sVi } from "vitest";',
        "__sAvant(() => { __sVi.useFakeTimers({ shouldAdvanceTime: true });"
        ' __sVi.setSystemTime(new Date("' + jour.isoformat() + 'T09:00:00Z")); });',
        "__sApres(() => { __sVi.useRealTimers(); });",
        "",
    ]
    chemin.write_bytes(("\r\n".join(lignes) + brut.decode("utf-8")).encode("utf-8"))
    assert MARQUE in chemin.read_bytes().decode("utf-8"), "injection non appliquee"


def joue(rel):
    r = subprocess.run([PNPM, "--filter", "@zwadj/" + PAQUET_NOM, "exec", "vitest", "run", rel],
                       cwd=RACINE, capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    s = re.sub(r"\x1b\[[0-9;]*m", "", r.stdout + r.stderr)
    causes = CAUSE.findall(s)
    artefact = r.returncode != 0 and bool(causes) and all(GARDE_CONSOLE.search(c) for c in causes)
    return (r.returncode != 0 and not artefact), artefact


def sonde(rel):
    chemin = PAQUET / rel
    src = chemin.read_bytes().decode("utf-8")
    if GEL_EXISTANT.search(src):
        return "deja gele", None
    jours = dates_du_fichier(src)
    dans = (jours[0] + (jours[-1] - jours[0]) / 2 if jours
            else datetime.date.today() + datetime.timedelta(days=400))
    base = jours[-1] if jours else datetime.date.today()
    apres = max(base, datetime.date.today()) + datetime.timedelta(days=60)

    rouge_t, _ = joue(rel)
    sauv = chemin.with_suffix(chemin.suffix + ".sauvegarde")
    shutil.copyfile(chemin, sauv)
    res = {}
    try:
        for nom, j in (("dans", dans), ("apres", apres)):
            shutil.copyfile(sauv, chemin)
            injecte(chemin, j)
            res[nom] = joue(rel)
    finally:
        shutil.copyfile(sauv, chemin)
        sauv.unlink()
    assert MARQUE not in chemin.read_bytes().decode("utf-8"), "RESTAURATION RATEE"

    if rouge_t and not res["dans"][0]:
        v = "SENSIBLE"
    elif not rouge_t and res["dans"][0]:
        v = "SENSIBLE"
    elif not rouge_t and res["apres"][0]:
        v = "SENSIBLE (a echeance)"
    elif rouge_t:
        v = "rouge pour une AUTRE raison"
    else:
        v = "insensible"
    if res["dans"][1] or res["apres"][1]:
        v = v + " [artefact de sonde ecarte]"
    return v, (dans, apres)


def purge():
    for s in PAQUET.rglob("*.sauvegarde"):
        shutil.copyfile(s, s.with_suffix(""))
        s.unlink()
        print("sauvegarde residuelle restauree : " + s.name)
    t = PAQUET / TEMOIN_POSITIF
    if t.exists():
        t.unlink()
        print("temoin positif residuel supprime")


purge()
print("=== CALIBRATION ===")
ok = True

source = (PAQUET / CORRIGE).read_bytes().decode("utf-8")
motif = GEL_DU_CORRIGE.replace("\n", "\r\n")
assert source.count(motif) == 1, (
    "ERREUR DE SCRIPT : le gel de " + CORRIGE + " est introuvable — ancre perimee. "
    "Sans temoin positif, la sonde ne prouve plus qu'elle sait detecter.")
temoin = PAQUET / TEMOIN_POSITIF
temoin.write_bytes(source.replace(motif, "", 1).encode("utf-8"))
try:
    v, _ = sonde(TEMOIN_POSITIF)
finally:
    temoin.unlink()
bon = v.split(" [")[0] == "SENSIBLE"
ok = ok and bon
print(("  OK   | " if bon else "  RATE | ") + "positif synthetique (" + CORRIGE + " sans son gel)")
print("         attendu SENSIBLE, obtenu " + v)

for rel, attendu in ((NEGATIF_SANS_DATE, "insensible"), (NEGATIF_AVEC_DATE, "insensible")):
    v, _ = sonde(rel)
    bon = v.split(" [")[0] == attendu
    ok = ok and bon
    print(("  OK   | " if bon else "  RATE | ") + rel)
    print("         attendu " + attendu + ", obtenu " + v)

if not ok:
    print("\nABANDON : un cas de calibration est manque, le verdict n'a aucune valeur.")
    sys.exit(1)
print("\nsonde calibree sur 3/3.\n")

for rel in sys.argv[1:]:
    v, det = sonde(rel)
    extra = "  [dans=" + str(det[0]) + " apres=" + str(det[1]) + "]" if det else ""
    print("  " + v.rjust(34) + " | " + rel + extra)
