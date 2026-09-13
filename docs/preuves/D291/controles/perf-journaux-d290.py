"""Ce que les journaux de l'echantillonneur de D290 portent sur PERF — recalcule, pas recopie (D291).

Usage, depuis la racine : python docs/preuves/D291/controles/perf-journaux-d290.py
Lit les COPIES versees dans docs/preuves/D290/ (empreintes verifiees a la copie).

DEFINITION DE CE QU'ON COMPTE, ecrite avant de compter (D290 : deux passes qui se comparent
comptent la meme chose) :
  - « ligne de passe » = ligne dont node >= 13 : 11 workers + 2 pnpm + 1 runner = 14 en regime,
    13 pendant la montee (D290). Pour r13-racine-1, cela couvre api PUIS client (15 node),
    la phase pro (8 node) est hors definition.
  - « bande 73-77 » = 73 <= perf_pct <= 77, sur TOUTES les lignes.
Chaque compteur rend ce qu'il a parcouru et son attendu.
"""
import csv
import io
import os
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")

dossier = os.path.join("docs", "preuves", "D290")
journaux = ["r13-client-1.csv", "r13-racine-1.csv", "r13-client-x3.csv"]
tot_lignes = tot_passe = tot_sup100 = tot_bande = 0
minimum = None
for nom in journaux:
    texte = open(os.path.join(dossier, nom), "rb").read().decode("utf-8-sig")
    lignes = list(csv.DictReader(io.StringIO(texte), delimiter=";"))
    passe = [l for l in lignes if int(l["node"]) >= 13]
    perfs = [float(l["perf_pct"]) for l in passe]
    sup100 = sum(1 for p in perfs if p > 100)
    bande = sum(1 for l in lignes if 73 <= float(l["perf_pct"]) <= 77)
    mini = min(perfs)
    debut, fin = lignes[0]["horodatage"], lignes[-1]["horodatage"]
    print(f"{nom:20s} lignes {len(lignes):>2} · lignes de passe {len(passe):>2} · >100 : {sup100:>2} · "
          f"min {mini:5.1f} · mediane {sorted(perfs)[len(perfs)//2]:5.1f} · bande 73-77 : {bande} (attendu 0) · {debut} -> {fin}")
    tot_lignes += len(lignes)
    tot_passe += len(passe)
    tot_sup100 += sup100
    tot_bande += bande
    minimum = mini if minimum is None else min(minimum, mini)
print(f"TOTAL : {len(journaux)} journaux parcourus (attendu 3) · {tot_lignes} lignes · {tot_passe} lignes de passe · "
      f">100 : {tot_sup100} · min {minimum} · bande 73-77 : {tot_bande} (attendu 0)")
