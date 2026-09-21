"""Passe D277 de D298 : compte des motifs sur le texte APLATI des fichiers d'autorité (D294), avec
contexte, ventilation par motif et motifs à zéro NOMMÉS (D295), et nombre parcouru (D290).
Usage, depuis la racine : python3 docs/preuves/D298/passe-d277/compte.py <fichier-de-motifs> [contexte]
Fichier de motifs : une ligne = nom<TAB>expression ; « # » en tête = commentaire.
⚠ Le contexte d'une occurrence est borné par le texte disponible, jamais fixe : la première version,
en `grep -o '.{90}…{60}'`, ratait une occurrence à moins de 60 caractères de la fin du fichier."""
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
FICHIERS = ["AGENTS.md", "CLAUDE.md", "ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md"]
motifs = []
for ligne in open(sys.argv[1], encoding="utf-8"):
    ligne = ligne.rstrip("\n")
    if ligne and not ligne.startswith("#"):
        nom, rx = ligne.split("\t", 1)
        motifs.append((nom, rx))
contexte = int(sys.argv[2]) if len(sys.argv) > 2 else 90
par_motif = {nom: 0 for nom, _ in motifs}
car = 0
for f in FICHIERS:
    plat = re.sub(r"\s+", " ", open(f, encoding="utf-8").read())
    car += len(plat)
    for nom, rx in motifs:
        occ = list(re.finditer(rx, plat))
        for m in occ:
            print(f"  [{nom}] {f} @{m.start()} : …{plat[max(0, m.start() - contexte):m.end() + contexte]}…")
        par_motif[nom] += len(occ)
        print(f"{f:22s} {nom:30s} {len(occ)}")
print("== ventilation par motif : " + " · ".join(f"{n}={k}" for n, k in par_motif.items()))
print("== motifs à ZÉRO — des hypothèses à vérifier, pas des absences (D295) : "
      + (", ".join(n for n, k in par_motif.items() if not k) or "aucun"))
print(f"== parcourus : {len(FICHIERS)} fichiers, {car} caractères aplatis · {len(motifs)} motifs · "
      f"{sum(par_motif.values())} occurrences")
