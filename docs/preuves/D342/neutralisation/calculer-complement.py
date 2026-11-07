"""D342 — calcule le COMPLÉMENT de l'union : les campagnes que le tri de `lancer-campagnes.py` ne voit pas (son angle mort — D341, § 7), sans retaper de liste de mémoire.
COPIE ADAPTÉE de `docs/preuves/D341/neutralisation/calculer-complement.py` (archivée comme PREUVE, jamais promue en instrument — D291). CE QUI CHANGE : (1) deux SHA, `<départ>` et `<fin>` ; (2) D341 ne cherchait que les
chemins relatifs à `apps/api` ; ici TOUS les préfixes que la fusion touche ou pourrait toucher — `apps/client/`, `apps/pro/`, `apps/api/`, `packages/types/`, `packages/i18n/`, `e2e/` ; (3) une occurrence ne compte
que si elle N'EST PAS la fin d'un chemin depuis la racine (« apps/client/src/x.ts » ne retient pas une campagne qui écrit déjà le chemin complet : le tri normal la voit) ; (4) l'union déjà versée est retranchée.
POURQUOI : `lancer-campagnes.py` ne reconnaît que les chaînes qui sont des chemins depuis la RACINE du dépôt. Un harnais qui lance vitest DEPUIS `apps/api` y écrit un fichier de test en chemin relatif
(`test/int/migration-non-empty.int-spec.ts`) : un lot qui le modifie ne retient aucune de ces campagnes.
Imprime ce qu'il a parcouru (D290) : fichiers du diff par préfixe, campagnes lues, et pour chaque campagne retenue le chemin relatif qui l'a retenue. Dernière ligne : `COMPLEMENT: a.py,b.py,…` (peut être vide).
CALIBRATION, DEUX BRAS (D286 ; abandon si un cas manque son verdict) : (positif) le chemin `apps/api/test/int/migration-non-empty.int-spec.ts` — le cas connu de D341 — doit retenir au moins `neutralize-r43.py` ;
(négatif) un chemin relatif fabriqué (`apps/api/test/int/zzz-fichier-fabrique-xyz.int-spec.ts`) ne doit en retenir AUCUNE.
Usage, depuis la RACINE : python3 calculer-complement.py <départ> <fin> <union-sortie.txt> [<sortie>]"""
import glob
import os
import re
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

depart, fin, fichier_union = sys.argv[1], sys.argv[2], sys.argv[3]
PREFIXES = ("apps/client/", "apps/pro/", "apps/api/", "packages/types/", "packages/i18n/", "e2e/")
campagnes = sorted(glob.glob("neutralisation/neutralize-*.py"))
sources = {c: open(c, encoding="utf-8", newline="").read() for c in campagnes}
deja = []
for l in open(fichier_union, encoding="utf-8").read().splitlines():
    if l.startswith("UNION: "):
        deja = [n for n in l[len("UNION: "):].split(",") if n]


def occurrence_relative(source, prefixe, rel):
    """Vrai si `rel` apparaît dans `source` SANS être la fin de `prefixe + rel`."""
    for m in re.finditer(re.escape(rel), source):
        debut = max(0, m.start() - len(prefixe))
        if source[debut:m.start()] != prefixe:
            return True
    return False


def retenues_par(chemins_du_diff):
    par = {}
    for c in campagnes:
        for f in chemins_du_diff:
            for prefixe in PREFIXES:
                if f.startswith(prefixe):
                    rel = f[len(prefixe):]
                    if rel and occurrence_relative(sources[c], prefixe, rel):
                        par.setdefault(os.path.basename(c), []).append(f)
    return par


# calibration
positif = retenues_par(["apps/api/test/int/migration-non-empty.int-spec.ts"])
negatif = retenues_par(["apps/api/test/int/zzz-fichier-fabrique-xyz.int-spec.ts"])
if "neutralize-r43.py" not in positif or negatif:
    sys.exit(f"CALIBRATION RATÉE : positif={sorted(positif)} (doit contenir neutralize-r43.py), négatif={sorted(negatif)} (doit être vide). ABANDON.")

diff = [l for l in subprocess.run(["git", "diff", "--name-only", depart, fin], capture_output=True, text=True, encoding="utf-8").stdout.splitlines() if l.strip()]
par_prefixe = {p: len([f for f in diff if f.startswith(p)]) for p in PREFIXES}
par_campagne = retenues_par(diff)
complement = sorted(n for n in par_campagne if n not in deja)
print(f"départ {depart} · fin {fin} · fichiers du diff : {len(diff)} dont par préfixe {par_prefixe} · campagnes lues : {len(campagnes)} · déjà dans l'union versée : {len(deja)} · retenues par chemin RELATIF : {len(par_campagne)} · COMPLÉMENT : {len(complement)}")
print(f"calibration : le chemin relatif connu retient {len(positif)} campagne(s) dont neutralize-r43.py ; le chemin fabriqué en retient {len(negatif)} — les deux bras tiennent.")
for n in sorted(par_campagne):
    print(f"  {n:30} {'(union)' if n in deja else '(COMPLÉMENT)':14} ← {', '.join(par_campagne[n])[:200]}")
ligne = "COMPLEMENT: " + ",".join(complement)
print(ligne)
if len(sys.argv) > 4:
    open(sys.argv[4], "w", encoding="utf-8", newline="\n").write(
        f"départ {depart} · fin {fin} · fichiers du diff : {len(diff)} dont par préfixe {par_prefixe} · campagnes lues : {len(campagnes)} · retenues par chemin RELATIF : {len(par_campagne)} · COMPLÉMENT : {len(complement)}\n"
        + "\n".join(f"  {n:30} ← {', '.join(par_campagne[n])[:300]}" for n in complement) + ("\n" if complement else "")
        + ligne + "\n")
