"""TRI DIFFÉRENTIEL — quelles alertes d'un audit sont ABSENTES de la sortie scellée PRÉCÉDENTE ? (D299)
Règle de Ko du 21/09/2026 : « toute alerte absente de la sortie scellée précédente se trie au contexte
avant le commit. Rien n'est caché, le coût reste borné au nouveau. »

Usage, depuis la racine :
    python3 docs/preuves/D299/outils/alertes-nouvelles.py <sortie précédente> <sortie nouvelle> [--voir]
Codes : 0 = calculé ; 2 = ABANDON (calibration manquée, ou sortie illisible).

CE QU'IL COMPARE : les lignes de CONTEXTE des deux sorties (`  [motif] chemin:ligne : contexte masqué`),
par la clé (motif, chemin, contexte masqué) — SANS le numéro de ligne, qui bouge quand un fichier bouge,
et SANS la ligne « -> … fichiers suivis », qui dépend de l'état du dépôt, pas de l'alerte. Comparaison
AVEC multiplicité : deux alertes identiques dans un fichier ne se couvrent pas l'une l'autre.

⛔ POURQUOI IL N'IMPRIME AUCUN CONTEXTE DANS SA SORTIE : une sortie qui recopierait les contextes serait un
ÉCHO de plus, NON scellé — exactement ce que le rang 18 a fermé. Il imprime le motif, le chemin et le
NUMÉRO DE LIGNE du contexte DANS LA SORTIE SCELLÉE NOUVELLE, où il se lit. `--voir` l'imprime à la
console pour le tri humain ; cette console ne se verse pas.

⚠ POURQUOI IL VIT ICI : l'intégrer à `neutralisation/audit-secrets.py` serait du code, donc un lot qui
compte ; une certification ne peut pas le porter (D299). Report au backlog.

CALIBRATION À DEUX BRAS, sur des sorties VERSÉES dont la réponse est connue, ABANDON si un bras manque :
  négatif  la sortie de D298 comparée à elle-même : 0 nouvelle ;
  positif  D298 (nouvelle) contre D297 (précédente) : EXACTEMENT les 2 alertes triées par D298 — une dans
           `D298/portes/porte-test-int.log`, une dans `D298/passe-d277/sortie-audit.txt` (section D298,
           « 92 = 90 + 1 + 1 »). ⚠ D297 est une sortie de l'outil de D293 : même format de contexte.
"""
import os
import re
import sys
from collections import Counter

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")

if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO.")
    sys.exit(2)

CTX = re.compile(r"^  \[([a-z-]+)\] (\S+?):(\d+) : (.*)$")
D297 = "docs/preuves/D297/audit-secrets-d297.txt"
D298 = "docs/preuves/D298/audit-secrets-d298.txt"


def alertes(chemin: str) -> list:
    """(clé, numéro de ligne dans la sortie) pour chaque ligne de contexte."""
    rendu = []
    for no, l in enumerate(open(chemin, encoding="utf-8").read().split("\n"), 1):
        m = CTX.match(l)
        if m:
            rendu.append(((m.group(1), m.group(2), m.group(4)), no))
    return rendu


def nouvelles(prec: str, nouv: str) -> tuple:
    a, b = alertes(prec), alertes(nouv)
    reste = Counter(k for k, _ in a)
    sortie = []
    for k, no in b:
        if reste[k]:
            reste[k] -= 1
        else:
            sortie.append((k, no))
    return len(a), len(b), sortie


def main(argv: list) -> int:
    print("== CALIBRATION — deux bras, abandon si un seul manque")
    manques = []
    va, vb, n = nouvelles(D298, D298)
    ok = not n and va > 0
    print(f"   {'✓' if ok else '✗'} négatif  D298 contre elle-même : {va} contextes lus · nouvelles {len(n)} (attendu 0)")
    manques += [] if ok else ["négatif"]
    va, vb, n = nouvelles(D297, D298)
    chemins = sorted(k[1] for k, _ in n)
    attendu = ["docs/preuves/D298/passe-d277/sortie-audit.txt", "docs/preuves/D298/portes/porte-test-int.log"]
    ok = chemins == attendu
    print(f"   {'✓' if ok else '✗'} positif  D298 contre D297 : {va} et {vb} contextes lus · nouvelles {len(n)} (attendu 2) "
          f"· chemins {chemins} (attendu {attendu})")
    manques += [] if ok else ["positif"]
    if manques:
        print(f"ABANDON : bras manqué(s) : {', '.join(manques)}")
        return 2
    if len(argv) < 2:
        return 0
    prec, nouv = argv[0], argv[1]
    va, vb, n = nouvelles(prec, nouv)
    print(f"== TRI DIFFÉRENTIEL : précédente {prec} ({va} contextes) · nouvelle {nouv} ({vb} contextes)")
    print(f"   alertes ABSENTES de la précédente : {len(n)} — à trier au contexte avant le commit")
    for (motif, chemin, ctx), no in n:
        print(f"   [{motif}] {chemin} — contexte : ligne {no} de {nouv}")
        if "--voir" in argv:
            print(f"        (console seulement) {ctx}")
    par = Counter(k[0] for k, _ in n)
    print("   ventilation par motif : " + (" · ".join(f"{m}={c}" for m, c in par.items()) or "aucune"))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
