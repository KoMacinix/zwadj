#!/usr/bin/env python3
"""Lecture SEULE du cache de données de Next (fetch-cache) : pour chaque entrée dont l'URL est un référentiel, imprime date du fichier,
statut, `revalidate`, et le NOMBRE d'éléments du corps JSON. Usage : python3 lire-cache.py <dossier fetch-cache>"""
import base64, datetime, json, os, sys

dossier = sys.argv[1]
vus = 0
retenus = 0
for nom in sorted(os.listdir(dossier)):
    chemin = os.path.join(dossier, nom)
    if not os.path.isfile(chemin):
        continue
    vus += 1
    try:
        e = json.load(open(chemin, encoding="utf-8"))
    except Exception as x:
        print(f"ILLISIBLE {nom[:10]} {x}")
        continue
    d = e.get("data", {})
    url = d.get("url", "")
    if not any(k in url for k in ("/wilayas", "/amenities", "/venue-styles", "/venues/")):
        continue
    retenus += 1
    corps = d.get("body", "")
    try:
        brut = base64.b64decode(corps).decode("utf-8")
        j = json.loads(brut)
        n = len(j) if isinstance(j, list) else f"objet({','.join(list(j)[:3])})"
    except Exception as x:
        n = f"?{x}"
    quand = datetime.datetime.fromtimestamp(os.path.getmtime(chemin)).strftime("%d/%m %H:%M")
    print(f"{quand}  {nom[:8]}  {d.get('status')}  rev={e.get('revalidate')}  n={n}  {url.split('/api/v1')[-1][:60]}")
print(f"-- {vus} entrées examinées, {retenus} retenues (référentiels et fiches)")
