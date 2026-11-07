"""D342 — calcule l'UNION des campagnes de neutralisation CONCERNÉES par la fusion de `front-client` : celles dont les fichiers lus ou mutés (le balayage large de `lancer-campagnes.py`) croisent le diff `<départ>..<fin>`.
COPIE ADAPTÉE de `docs/preuves/D341/neutralisation/calculer-union.py` (archivée comme PREUVE, jamais promue en instrument — D291). CE QUI CHANGE, et rien d'autre : (1) il prend DEUX SHA, `<départ>` et `<fin>`
(le diff de la fusion est `499d1bf..2b79355`, et non `<départ>..HEAD` : après la fusion, des pièces de D342 sont commitées, qu'aucune campagne ne lit mais qui gonfleraient le diff) ; (2) la CALIBRATION ne dépend plus du vrai
diff (D341 exigeait que `neutralize-r44.py` soit retenue, ce qui n'était vrai que de SON diff) : elle se joue sur deux diffs FABRIQUÉS ; (3) il imprime les campagnes NON retenues.
POURQUOI PAS `lancer-campagnes.py` TEL QUEL (R-10 : l'instrument n'est pas retouché) : son tri croise `git diff --name-only HEAD`, vide une fois la fusion commitée. Même logique, autre base.
Imprime ce qu'il a parcouru (D290) : campagnes lues, fichiers du diff, et pour chaque campagne retenue l'intersection. Dernière ligne : `UNION: a.py,b.py,…`.
CALIBRATION, DEUX BRAS (D286 ; abandon si un cas manque son verdict) : (positif) un diff fabriqué qui ne contient QU'UN fichier lu par `neutralize-fc1.py` doit retenir `neutralize-fc1.py` ; (négatif) un diff fabriqué
qui ne contient qu'un chemin inexistant ne doit retenir AUCUNE campagne.
Usage, depuis la RACINE : python3 calculer-union.py <départ> <fin> [<sortie>]"""
import importlib.util
import os
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

depart, fin = sys.argv[1], sys.argv[2]
spec = importlib.util.spec_from_file_location("lc", "neutralisation/lancer-campagnes.py")
lc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lc)

campagnes = lc.campagnes()
lus_de = {c: lc.fichiers_lus(c) for c in campagnes}


def retenues_pour(changes):
    return [os.path.basename(c) for c in campagnes if lus_de[c] & changes]


# calibration
fc1 = [c for c in campagnes if os.path.basename(c) == "neutralize-fc1.py"]
assert len(fc1) == 1 and lus_de[fc1[0]], "calibration : neutralize-fc1.py n'existe pas (1 exigé) ou ne lit aucun fichier"
un_fichier = sorted(lus_de[fc1[0]])[0]
positif = retenues_pour({un_fichier})
negatif = retenues_pour({"zzz/chemin-inexistant-xyz.ts"})
if "neutralize-fc1.py" not in positif or negatif:
    sys.exit(f"CALIBRATION RATÉE : positif={positif} (doit contenir neutralize-fc1.py pour {un_fichier}), négatif={negatif} (doit être vide). ABANDON.")

changes = {l for l in subprocess.run(["git", "diff", "--name-only", depart, fin], capture_output=True, text=True, encoding="utf-8").stdout.splitlines() if l.strip()}
retenues, sorties, non = [], [], []
for c in campagnes:
    inter = sorted(lus_de[c] & changes)
    if inter:
        retenues.append(os.path.basename(c))
        sorties.append(f"  {os.path.basename(c):34} ← {', '.join(inter)[:300]}")
    else:
        non.append(f"{os.path.basename(c)} ({len(lus_de[c])} lus)")
sans_fichier = [c for c in campagnes if not lus_de[c]]

print(f"départ {depart} · fin {fin} · fichiers du diff : {len(changes)} · campagnes lues : {len(campagnes)} · retenues : {len(retenues)} · non retenues : {len(non)} · sans aucun fichier lu : {len(sans_fichier)}")
print(f"calibration : positif — un diff fabriqué avec {un_fichier} retient {len(positif)} campagne(s), dont neutralize-fc1.py ; négatif — un chemin inexistant en retient {len(negatif)} — les deux bras tiennent.")
print("\n".join(sorties))
print("NON RETENUES : " + ", ".join(non))
if sans_fichier:
    print("⚠ campagnes qui ne lisent AUCUN fichier (jamais retenues) : " + ", ".join(sans_fichier))
ligne = "UNION: " + ",".join(retenues)
print(ligne)
if len(sys.argv) > 3:
    open(sys.argv[3], "w", encoding="utf-8", newline="\n").write("\n".join(sorties) + "\nNON RETENUES : " + ", ".join(non) + "\n" + ligne + "\n")
