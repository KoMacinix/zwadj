"""D310 — Ce que `-Resume` n'imprime pas, relevé sur le CSV FERMÉ de l'échantillonneur (patron de D299,
`rang19-p2-etat-complement.txt`) : alimentation, `chrome` max, PERF, écarts entre échantillons, et CHAQUE échantillon
sous la barre avec ses `node`, `chrome` et `nb_proc` — pour le point 7 du critère. Lu APRÈS la clôture seulement.
Usage, depuis la racine :  python docs/preuves/D310/outils/lire-etat.py <etat.csv> <barre imprimée par la sonde>
"""
import csv
import sys
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8")
chemin, barre = sys.argv[1], float(sys.argv[2])
rows = list(csv.DictReader(open(chemin, encoding="utf-8-sig"), delimiter=";"))
bons = [r for r in rows if r["ram_libre_mo"] != "ECHEC-INSTRUMENT"]
print(f"échantillons parcourus : {len(rows)} · dont ECHEC-INSTRUMENT : {len(rows) - len(bons)} (attendu 0)")
print(f"alimentation : {sorted({r['alim'] for r in bons})} (attendu ['SECTEUR']) · chrome max : "
      f"{max(int(r['chrome']) for r in bons)} (attendu 0)")
perf = [float(r["perf_pct"]) for r in bons]
print(f"PERF : min {min(perf)} · max {max(perf)} · au-dessus de 100 sur {sum(p > 100 for p in perf)} échantillons sur {len(perf)}")
ts = [datetime.strptime(r["horodatage"], "%Y-%m-%d %H:%M:%S") for r in rows]
ec = [(b - a).total_seconds() for a, b in zip(ts, ts[1:])]
print(f"écarts entre échantillons : {len(ec)} · min {min(ec)} s · max {max(ec)} s · au-delà de 60 s : {sum(e > 60 for e in ec)}")
creux = [r for r in bons if float(r["ram_libre_mo"]) < barre]
print(f"sous la barre ({barre:g} Mo) : {len(creux)} échantillon(s) — chacun avec ses node, chrome, nb_proc :")
for r in creux:
    print(f"  {r['horodatage']} · RAM {r['ram_libre_mo']} · node {r['node']} · chrome {r['chrome']} · nb_proc {r['nb_proc']}")
