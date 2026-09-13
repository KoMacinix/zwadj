"""Analyse du releve de D291 — les regles appliquees sont celles du protocole COMMITE AVANT la mesure
(ZWADJ_CONTINUITE.md, section D291, commit f8b578d). Ce script les applique ; il ne les choisit pas.

Usage, depuis la racine : python docs/preuves/D291/releve/analyse.py
Lit docs/preuves/D291/releve/releve.csv et ech-c2.csv, ech-c3.csv, ech-c6.csv.
Chaque compteur rend ce qu'il a parcouru et son attendu (D290). Aucune moyenne.
"""
import csv
import io
import os
import statistics
import sys
from datetime import datetime

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")

D = os.path.join("docs", "preuves", "D291", "releve")
PLAN = {1: "OFF", 2: "ON", 3: "ON", 4: "OFF", 5: "OFF", 6: "ON"}


def nombre(v):
    return float(str(v).replace(",", "."))


def lire_csv(chemin):
    texte = open(chemin, "rb").read().decode("utf-8-sig")
    return list(csv.DictReader(io.StringIO(texte), delimiter=";"))


def rangs(valeurs):
    ordre = sorted(range(len(valeurs)), key=lambda i: valeurs[i])
    r = [0.0] * len(valeurs)
    i = 0
    while i < len(ordre):
        j = i
        while j + 1 < len(ordre) and valeurs[ordre[j + 1]] == valeurs[ordre[i]]:
            j += 1
        moyen = (i + j) / 2 + 1
        for k in range(i, j + 1):
            r[ordre[k]] = moyen
        i = j + 1
    return r


def spearman(x, y):
    rx, ry = rangs(x), rangs(y)
    mx, my = statistics.mean(rx), statistics.mean(ry)
    num = sum((a - mx) * (b - my) for a, b in zip(rx, ry))
    den = (sum((a - mx) ** 2 for a in rx) * sum((b - my) ** 2 for b in ry)) ** 0.5
    return num / den if den else float("nan")


lignes = lire_csv(os.path.join(D, "releve.csv"))
print(f"== releve.csv : {len(lignes)} passes lues (attendu 12)")
passes = {}
for l in lignes:
    cle = (int(l["cycle"]), l["position"])
    if cle in passes:
        sys.exit(f"ABANDON : passe {cle} en double")
    passes[cle] = l
manquantes = [(c, p) for c in PLAN for p in ("A", "B") if (c, p) not in passes]
print(f"   passes attendues absentes : {len(manquantes)} (attendu 0) {manquantes}")
if manquantes or len(lignes) != 12:
    sys.exit("ABANDON : releve incomplet")
for (c, p), l in sorted(passes.items()):
    if l["observateur"] != PLAN[c]:
        sys.exit(f"ABANDON : observateur {l['observateur']} au cycle {c}, le plan dit {PLAN[c]}")

print("\n== TOUTES LES PASSES, une ligne chacune (aucune moyenne)")
print("   cycle pos obs | alim     | PERF av  ap   | RAM  | chrome | verdict | delais | vitest | mur   | code")
for (c, p), l in sorted(passes.items()):
    print(f"   {c}     {p}   {l['observateur']:3s} | {l['alim_av']} {l['charge_av']}% | {nombre(l['perf_av']):5.1f} {nombre(l['perf_ap']):5.1f} | "
          f"{l['ram_av']} | {l['chrome_av']:>6} | {l['verdict']:7s} | {l['delais']:>6} | {nombre(l['duree_vitest']):6.2f} | {nombre(l['mur']):5.2f} | {l['code']}")

# Q5 — verdicts
rouges = [(c, p) for (c, p), l in passes.items()
          if int(l["failed"]) != 0 or int(l["delais"]) != 0 or l["code"] != "0" or l["passed"] != l["total"] or l["alim_av"] != "SECTEUR"]
print(f"\n== Q5 verdicts : {len(rouges)} passe(s) rouge(s) ou hors secteur sur 12 parcourues (attendu 0) {sorted(rouges)}")
retirees = set(rouges)

# Q1 — PERF avant B > PERF avant A, 6 cycles sur 6
q1 = [(c, nombre(passes[(c, 'A')]['perf_av']), nombre(passes[(c, 'B')]['perf_av'])) for c in PLAN]
n_q1 = sum(1 for _, a, b in q1 if b > a)
print(f"\n== Q1 « PERF avant » B > A : {n_q1} cycles sur {len(q1)} parcourus — regle : 6 sur 6 -> {'ETABLI' if n_q1 == 6 else 'NON ETABLI'}")
for c, a, b in q1:
    print(f"   cycle {c} : A {a:5.1f} · B {b:5.1f} · {'B > A' if b > a else 'B <= A'}")

# Q3 — position : duree B < A (ou >), 6 cycles sur 6
q3 = [(c, nombre(passes[(c, 'A')]['duree_vitest']), nombre(passes[(c, 'B')]['duree_vitest'])) for c in PLAN
      if (c, 'A') not in retirees and (c, 'B') not in retirees]
inf = sum(1 for _, a, b in q3 if b < a)
sup = sum(1 for _, a, b in q3 if b > a)
etabli_q3 = len(q3) == 6 and (inf == 6 or sup == 6)
print(f"\n== Q3 position : B plus rapide que A dans {inf} cycles, plus lente dans {sup}, sur {len(q3)} parcourus (attendu 6) — "
      f"regle : 6 sur 6 dans un sens -> {'ETABLI' if etabli_q3 else 'NON ETABLI'}")
for c, a, b in q3:
    print(f"   cycle {c} ({PLAN[c]}) : A {a:6.2f} s · B {b:6.2f} s · A - B = {a - b:+.2f} s ({(a - b) / a * 100:+.1f} % de A)")

# Q2 — observateur : pour A ET pour B, les 3 ON du meme cote des 3 OFF, dans le meme sens
sens = {}
print("\n== Q2 observateur (durees vitest)")
for p in ("A", "B"):
    on = [nombre(passes[(c, p)]["duree_vitest"]) for c in PLAN if PLAN[c] == "ON" and (c, p) not in retirees]
    off = [nombre(passes[(c, p)]["duree_vitest"]) for c in PLAN if PLAN[c] == "OFF" and (c, p) not in retirees]
    if len(on) == 3 and len(off) == 3 and min(on) > max(off):
        sens[p] = "ON plus lent"
    elif len(on) == 3 and len(off) == 3 and max(on) < min(off):
        sens[p] = "ON plus rapide"
    else:
        sens[p] = "entremeles"
    print(f"   position {p} : ON {sorted(on)} · OFF {sorted(off)} -> {sens[p]}")
etabli_q2 = sens["A"] == sens["B"] and sens["A"] != "entremeles"
print(f"   regle : meme sens pour A et pour B -> {'ETABLI (' + sens['A'] + ')' if etabli_q2 else 'NON ETABLI'}")

# Q4 — PERF pendant la passe (observateur ON), par l'echantillonneur
print("\n== Q4 PERF PENDANT la passe, journaux de l'observateur (cycles ON)")
med, dur, total_lignes = [], [], 0
for c in [c for c in PLAN if PLAN[c] == "ON"]:
    ech = lire_csv(os.path.join(D, f"ech-c{c}.csv"))
    valides = [e for e in ech if e.get("perf_pct") not in (None, "") and e.get("ram_libre_mo") != "ECHEC-INSTRUMENT"]
    echecs = len(ech) - len(valides)
    total_lignes += len(ech)
    for p in ("A", "B"):
        l = passes[(c, p)]
        debut = datetime.strptime(l["debut"][:19], "%Y-%m-%d %H:%M:%S")
        fin = datetime.strptime(l["fin"][:19], "%Y-%m-%d %H:%M:%S")
        dedans = [e for e in valides if debut <= datetime.strptime(e["horodatage"], "%Y-%m-%d %H:%M:%S") <= fin]
        perfs = [nombre(e["perf_pct"]) for e in dedans]
        nodes = [int(e["node"]) for e in dedans]
        if (c, p) in retirees or not perfs:
            print(f"   cycle {c} {p} : {len(perfs)} ligne(s) dans la fenetre — RETIREE ou vide")
            continue
        m = statistics.median(perfs)
        med.append(m)
        dur.append(nombre(l["duree_vitest"]))
        print(f"   cycle {c} {p} : {len(perfs)} lignes dans [{l['debut'][11:19]} ; {l['fin'][11:19]}] · node {min(nodes)}-{max(nodes)} · "
              f"PERF min {min(perfs):.1f} · mediane {m:.1f} · max {max(perfs):.1f} · > 100 : {sum(1 for x in perfs if x > 100)} · duree {nombre(l['duree_vitest']):.2f} s")
    avant_a = [e for e in valides if datetime.strptime(e["horodatage"], "%Y-%m-%d %H:%M:%S") < datetime.strptime(passes[(c, 'A')]["debut"][:19], "%Y-%m-%d %H:%M:%S")]
    if avant_a:
        dix = [nombre(e["perf_pct"]) for e in avant_a[-4:]]
        print(f"   cycle {c} repos : {len(avant_a)} lignes avant la passe A · PERF des 4 dernieres {dix} · echecs d'instrument dans le journal : {echecs}")
rho = spearman(med, dur) if len(med) >= 2 else float("nan")
print(f"   {total_lignes} lignes d'observateur parcourues · passes ON retenues : {len(med)} (attendu 6)")
print(f"   rho de Spearman (mediane PERF pendant, duree) = {rho:+.2f} sur n = {len(med)} — "
      f"regle : jamais etabli ; seul rho = +-1 se dit compatible -> {'COMPATIBLE' if abs(rho) == 1 else 'NON ETABLI'}")

print("\n== SYNTHESE SELON LES REGLES COMMITEES")
print(f"   Q1 retombee : {'ETABLI' if n_q1 == 6 else 'NON ETABLI'} ({n_q1}/6)")
print(f"   Q2 observateur : {'ETABLI' if etabli_q2 else 'NON ETABLI'} (A : {sens['A']} · B : {sens['B']})")
print(f"   Q3 position : {'ETABLI' if etabli_q3 else 'NON ETABLI'} (B plus rapide {inf}/6, plus lente {sup}/6)")
print(f"   Q4 PERF pendant : rho {rho:+.2f}, n = {len(med)} — jamais etabli par regle")
print(f"   Q5 verdicts : {12 - len(rouges)} verts sur 12")
toutes = [nombre(l["duree_vitest"]) for l in passes.values()]
print(f"   etendue des 12 durees : {min(toutes):.2f} -> {max(toutes):.2f} s")
