"""Étape 0 de D300 — les échantillons SOUS LA BARRE de la passe 2 de D299, RATTACHÉS À LA MESURE QUI TOURNAIT.
Usage, depuis la racine : python3 docs/preuves/D300/etape0/creux.py
Ne fait que LIRE : l'échantillonneur de la passe (`rang19-p2-etat.csv`), la barre que la SONDE imprime
(`BARRE_D273_MO` du relevé d'ouverture — jamais recopiée ici), les horodatages des relevés de sonde (chaque
mesure court de SON relevé au relevé suivant, ordre du protocole de `c42c967`), la table des durées de
`lancer-campagnes --tout` et son début (`rang19-p2-campagnes-tout.heures`), et la SOURCE de chaque harnais pour
savoir s'il lance Playwright ou vitest (relevé, pas deviné).
Pourquoi : la consigne de Ko du 22/09/2026 attribue les 12 à 14 `node` des creux à « 11 workers, plus pnpm, plus
le runner, compté par D290 ». D290 a dénombré cela sur une suite VITEST (`client`). Ce script dit, creux par creux,
quelle mesure tournait, et si c'était du vitest.
Imprime aussi `nb_proc - node` contre le dernier échantillon à `node` = 0 qui précède : ce sont des processus NON
node apparus avec la mesure. ⚠ L'échantillonneur ne les NOMME pas — leur identité reste une inférence.
⚠ Les bornes des campagnes sont DÉRIVÉES (début + somme des durées de la table, arrondies à la seconde) : l'écart
entre cette somme et le chronomètre global est imprimé, c'est la dérive maximale de l'attribution."""
import csv
import datetime as dt
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO (pnpm-workspace.yaml introuvable).")
    sys.exit(2)
P = "docs/preuves/D299/passe/"
J = dt.date(2026, 9, 22)


def heure(txt):
    h, m, s = (int(x) for x in txt.split(":"))
    return dt.datetime.combine(J, dt.time(h, m, s))


def champ(fichier, cle):
    for ligne in open(P + fichier, encoding="utf-8-sig"):
        if ligne.startswith(cle + "="):
            return ligne.split("=", 1)[1].strip()
    print(f"ABANDON : {cle} absent de {fichier}")
    sys.exit(2)


barre = int(champ("rang19-p2-sonde-ouverture-1.txt", "BARRE_D273_MO"))

# 1. les mesures, de relevé à relevé — ordre du protocole commité dans c42c967
SONDES = [("typecheck", "typecheck"), ("lint", "lint"), ("test", "test"), ("build", "build"),
          ("test:int", "testint"), ("test:e2e", "e2e"), ("--tout", "campagnes"),
          ("e3d1-s8 --int", "int-e3d1-s8"), ("s11b --int", "int-s11b"), ("solid-s6 --int", "int-solid-s6")]
debuts = [(nom, heure(champ(f"rang19-p2-sonde-avant-{suffixe}.txt", "HORODATAGE").split()[1]))
          for nom, suffixe in SONDES]
fin_passe = heure(champ("rang19-p2-sonde-cloture.txt", "HORODATAGE").split()[1])
mesures = [(n, d, debuts[i + 1][1] if i + 1 < len(debuts) else fin_passe) for i, (n, d) in enumerate(debuts)]

# 2. les campagnes de --tout, bornes DÉRIVÉES de la table
heures = open(P + "rang19-p2-campagnes-tout.heures", encoding="utf-8").read()
t0 = heure(re.search(r"début \S+ (\d\d:\d\d:\d\d)", heures).group(1))
chrono = int(re.search(r"· (\d+) s ·", heures).group(1))
brut = re.sub(r"\x1b\[[0-9;]*m", "", open(P + "rang19-p2-campagnes-tout.log", encoding="utf-8").read())
table = re.findall(r"(?m)^(neutralize-\S+\.py)\s+\d+\s+\S+\s+\d+\s+\d+\s+\d+\s+(\d+)\s*$", brut)
campagnes, t = [], t0
for nom, sec in table:
    source = open("neutralisation/" + nom, encoding="utf-8").read().lower()
    runner = "playwright" if "playwright" in source else ("vitest" if "vitest" in source else "?")
    campagnes.append((nom, t, t + dt.timedelta(seconds=int(sec)), runner))
    t += dt.timedelta(seconds=int(sec))
somme = sum(int(s) for _, s in table)

# 3. les échantillons
lignes_csv = open(P + "rang19-p2-etat.csv", "rb").read().count(b"\n") - 1
lignes = list(csv.DictReader(open(P + "rang19-p2-etat.csv", encoding="utf-8-sig"), delimiter=";"))
attendu_creux = int(re.search(r"sous \d+ Mo : (\d+) sur",
                              open(P + "rang19-p2-etat-complement.txt", encoding="utf-8").read()).group(1))
creux, base = [], None
for x in lignes:
    h = dt.datetime.strptime(x["horodatage"], "%Y-%m-%d %H:%M:%S")
    node, chrome, nbp, ram = int(x["node"]), int(x["chrome"]), int(x["nb_proc"]), int(x["ram_libre_mo"])
    if node == 0:
        base = (x["horodatage"][11:], nbp)
    if ram < barre:
        mes = next((n for n, d, f in mesures if d <= h < f), "(hors mesure)")
        detail = ""
        if mes == "--tout":
            c = next(((n, r) for n, d, f, r in campagnes if d <= h < f), ("(hors table)", "?"))
            detail = f" · campagne {c[0]} (runner relevé dans sa source : {c[1]})"
        elif mes == "test:e2e":
            detail = " · runner : playwright (e2e/playwright.config.ts)"
        delta = f"{nbp - node - base[1]:+d} contre {base[0]}" if base else "sans base"
        creux.append((x["horodatage"][11:], ram, node, chrome, nbp - node, delta, mes + detail))

print(f"barre imprimée par la sonde d'ouverture : {barre} Mo")
print(f"mesures de la passe, de relevé à relevé : {len(mesures)} (attendu {len(SONDES)})")
print(f"campagnes dans la table : {len(table)} (attendu 27) · somme des durées {somme} s · chronomètre {chrono} s"
      f" · dérive maximale de l'attribution {abs(chrono - somme)} s")
print(f"échantillons parcourus : {len(lignes)} (attendu {lignes_csv}, compté sur les octets)")
print(f"échantillons sous la barre : {len(creux)} (attendu {attendu_creux}, relevé par D299 dans le complément)")
print("heure    · RAM  · node · chrome · non-node (écart au dernier node=0) · mesure en vol")
for h, ram, node, chrome, nn, delta, mes in creux:
    print(f"{h} · {ram} · {node:4d} · {chrome:6d} · {nn} ({delta}) · {mes}")
par = {}
for c in creux:
    cle = "playwright" if "playwright" in c[6] else ("vitest" if "vitest" in c[6] else "autre")
    par[cle] = par.get(cle, 0) + 1
print("== ventilation par runner : " + " · ".join(f"{k}={v}" for k, v in sorted(par.items())))
print(f"== chrome max dans les creux : {max(c[3] for c in creux) if creux else 'n/a'} (attendu 0)")
if len(creux) != attendu_creux or len(lignes) != lignes_csv or len(table) != 27:
    print("✗ ÉCART AU PARCOURU — ne rien conclure")
    sys.exit(1)
