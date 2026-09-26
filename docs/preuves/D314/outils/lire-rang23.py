"""D314 — LECTURE DE `rang23` À LA CERTIFICATION QUI CLÔT LE RANG 23. COPIE de `docs/preuves/D310/outils/lire-rang23.py`
(pièce de D310, non retouchée : même lecteur de D306, mêmes titres importés du harnais, même verdict), à laquelle
s'ajoute la PREUVE LUE DU POINT 12 telle que Ko l'a arbitrée (D313, 1b) : « Tests passés + tests en échec > 0 ; jamais
le total entre parenthèses (mesure de D312) ». ⚠ Le lecteur de D306 compte « collectés » sur le TOTAL entre parenthèses
(son en-tête) — la quantité que Ko exclut : les EXÉCUTÉS se calculent ici, à part, sur la dernière ligne « Tests » de
chaque journal, codes ANSI retirés.
Usage, depuis la racine :
    python docs/preuves/D314/outils/lire-rang23.py                                  # calibration seule
    python docs/preuves/D314/outils/lire-rang23.py <dossier rang23 de la passe>
(lecture seule — contrairement à la copie de D310, il ne copie rien : le versement est fait par `verser.py`)
CALIBRATION À DEUX BRAS, AVANT TOUTE LECTURE, ABANDON SI UN BRAS MANQUE (D286), sur la pièce versée de D310
(`docs/preuves/D310/passe-r23c-20260926-0032/rang23/`, 13 mesures dont D310 a lu 13 morsures) :
  positif  les 13 journaux tels quels : 13 MORSURES LUES et 13 mesures à exécutés > 0 ;
  négatif  les mêmes, la dernière ligne « Tests » de UN journal remplacée EN MÉMOIRE par « Tests  25 skipped (25) »
           (la sonde S2 de D312) : ce journal doit sortir à exécutés 0 — REFUSÉ —, et le total rester > 0.
"""

import importlib.util
import os
import re

import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    sys.exit("✗ À LANCER DEPUIS LA RACINE.")
sys.path.insert(0, "docs/preuves/D306/outils")
from lire import juger, lire  # noqa: E402

ANSI = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")
spec = importlib.util.spec_from_file_location("h_rang23", "neutralisation/neutralize-rang23.py")
H = importlib.util.module_from_spec(spec)
spec.loader.exec_module(H)


def executes(texte: str):
    """Passés + en échec sur la DERNIÈRE ligne « Tests » ; (None, None) si aucune ligne « Tests »."""
    res = re.findall(r"^\s*Tests\s+(.+?)\s*$", ANSI.sub("", texte), re.M)
    if not res:
        return None, None
    n = lambda mot: int(m.group(1)) if (m := re.search(rf"(\d+) {mot}\b", res[-1])) else 0
    return n("passed") + n("failed"), res[-1]


def mesures_de(dossier: str, remplacer=None):
    """Rend, par mesure déclarée : (identifiant, verdict de D306, exécutés, ligne Tests)."""
    out = []
    for libelle, _c, _a, _p, _n, mesures, titres in H.CIBLES:
        ident = libelle.split(".")[0]
        for m in mesures:
            journal = os.path.join(dossier, f"{ident}-{m}.txt")
            spec_de_m = H.MESURES[m][-1]
            texte_spec = open(os.path.join("apps/api", spec_de_m), encoding="utf-8").read()
            exiges = [t for t in titres if t in texte_spec]
            verdict, _ = juger(lire(journal), exiges)
            texte = open(journal, "rb").read().decode("utf-8", errors="replace")
            if remplacer and os.path.basename(journal) == remplacer:
                lignes = texte.splitlines()
                i = max(k for k, l in enumerate(lignes) if re.match(r"^\s*Tests\s", ANSI.sub("", l)))
                lignes[i] = " Tests  25 skipped (25)"
                texte = "\n".join(lignes)
            ex, ligne = executes(texte)
            out.append((f"{ident} [{m}]", os.path.basename(journal), verdict, ex, ligne))
    return out


# ------------------------------------------------------------------ CALIBRATION
print("== CALIBRATION, deux bras (abandon si un seul manque)")
REF = "docs/preuves/D310/passe-r23c-20260926-0032/rang23"
pos = mesures_de(REF)
ok_pos = len(pos) == 13 and all(v == "MORSURE LUE" for _, _, v, _, _ in pos) and all((e or 0) > 0 for *_, e, _ in pos)
print(f"  {'✓' if ok_pos else '✗'} positif D310 : {len(pos)} mesures (attendu 13) · MORSURES LUES "
      f"{sum(v == 'MORSURE LUE' for _, _, v, _, _ in pos)} (attendu 13) · exécutés > 0 "
      f"{sum((e or 0) > 0 for *_, e, _ in pos)} (attendu 13)")
cible = pos[0][1]
neg = mesures_de(REF, remplacer=cible)
refus = [x for x in neg if not ((x[3] or 0) > 0)]
ok_neg = [x[1] for x in refus] == [cible]
print(f"  {'✓' if ok_neg else '✗'} négatif : « Tests  25 skipped (25) » posé en mémoire dans {cible} ⇒ refusés "
      f"{[x[1] for x in refus]} (attendu [{cible!r}]) — exécutés {refus[0][3] if refus else '—'} (attendu 0)")
if not (ok_pos and ok_neg):
    print("✗ ABANDON — calibration manquée.")
    sys.exit(2)
if len(sys.argv) < 2:
    print("(calibration seule : aucun dossier de passe donné)")
    sys.exit(0)

# ------------------------------------------------------------------ LA PASSE (lecture seule : le versement est l'affaire de verser.py)
SRC = sys.argv[1]
print(f"\n== PASSE : {SRC} — {len(os.listdir(SRC))} journaux présents")
lues = mesures_de(SRC)
mordues = sum(v == "MORSURE LUE" for _, _, v, _, _ in lues)
demarrees = sum((e or 0) > 0 for *_, e, _ in lues)
for ident, journal, v, e, ligne in lues:
    ok = v == "MORSURE LUE" and (e or 0) > 0
    print(f"{'✓' if ok else '✗'} {ident} ⇒ {v} · exécutés (passés + en échec) {e} · « {ligne} »")
print(f"\nMESURES LUES : {len(lues)} · MORSURES LUES : {mordues} · DÉMARRÉES (exécutés > 0) : {demarrees} "
      f"(attendu {len(lues)} et {len(lues)})")
sys.exit(0 if mordues == demarrees == len(lues) else 1)
