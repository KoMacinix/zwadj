"""Relevé D303 — quelles courses les specs d'intégration de la réservation et du devis mesurent-elles DÉJÀ ?
Fonde l'affirmation du cadrage du rang 23 : « aucun test existant ne croise deux commandes différentes sur la même
demande ». Lecture seule, fichiers SUIVIS à HEAD. Depuis la racine :
    python3 docs/preuves/D303/releves/courses-existantes.py
Pour chaque `Promise.all(` — la forme des tests concurrents du dépôt —, le titre du `it(` qui l'englobe et la ligne
de l'appel. Imprime le parcouru (fichiers, lignes, sites) à côté du relevé.
⚠ LIMITE DÉCLARÉE : une course écrite sans `Promise.all` (rival `pg`, promesses séparées) échapperait à ce motif ;
d'où le second compte, `new Client(` et `attendreBlocage`, attendu 0 dans ces deux specs."""
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")
SPECS = ["apps/api/test/int/bookings.int-spec.ts", "apps/api/test/int/quotes.int-spec.ts"]
total_lignes = total_sites = 0
for spec in SPECS:
    texte = subprocess.run(["git", "show", f"HEAD:{spec}"], capture_output=True, text=True, encoding="utf-8").stdout
    lignes = texte.splitlines()
    total_lignes += len(lignes)
    titre = "(hors it)"
    sites = []
    for no, l in enumerate(lignes, 1):
        m = re.search(r'\bit\("([^"]+)"', l)
        if m:
            titre = m.group(1)
        if "Promise.all(" in l:
            sites.append((no, titre, l.strip()[:110]))
    autres = sum(l.count("new Client(") + l.count("attendreBlocage") for l in lignes)
    total_sites += len(sites)
    print(f"== {spec} · {len(lignes)} lignes · sites Promise.all : {len(sites)} · `new Client(`/`attendreBlocage` : {autres} (attendu 0)")
    for no, t, l in sites:
        print(f"   {no:5d} | « {t} »\n         {l}")
print(f"== parcourus : {len(SPECS)} fichiers · {total_lignes} lignes · {total_sites} sites")
