#!/usr/bin/env python3
"""D351 — prépare le VERSEMENT des journaux de campagne (R-3) : pour chaque journal, (1) retire les codes ANSI et les CR, (2) MASQUE les suites de forme de jeton par la procédure de D350 (copie NON modifiée, lancée en ligne de commande : son code s'exécute à l'import),
(3) ajoute EN TÊTE la ligne d'empreinte du harnais (relevée AVANT la campagne, identique APRÈS : R-3 de la consigne) — la ligne est ajoutée par CETTE étape de copie et dite telle ; le journal brut reste hors dépôt.
Entrées (relevées par les wrappers `campagnes-tout.sh` et `campagnes-modes.sh`) : <dossier tout> (journaux/, harnais-avant.txt, harnais-apres.txt) et <dossier modes> (neutralize-<n><flag>.txt). Sortie : <dossier sortie>/journaux/*.txt et versement-campagnes.txt.
Usage : python3 verser-campagnes.py <dossier tout> <dossier modes> <dossier sortie> <masquer-jetons.py> <dossier temporaire>
Imprime ce qu'il a parcouru (D290) : journaux lus, suites masquées, suites restantes (attendu 0)."""
import hashlib
import os
import re
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

tout, modes, sortie, masqueur, tmp = sys.argv[1:6]
ANSI = re.compile(r"\x1b\[[0-9;]*m")
os.makedirs(tmp, exist_ok=True)
os.makedirs(os.path.join(sortie, "journaux"), exist_ok=True)


def empreintes(chemin):
    out = {}
    for l in open(chemin, encoding="utf-8"):
        l = l.strip()
        if l:
            h, n = l.split(None, 1)
            out[os.path.basename(n.lstrip("*"))] = h
    return out


avant, apres = empreintes(os.path.join(tout, "harnais-avant.txt")), empreintes(os.path.join(tout, "harnais-apres.txt"))
assert avant == apres and len(avant) == 68, f"empreintes avant/après : identiques {avant == apres}, {len(avant)} harnais"
rapport, total_masque, total_restant, lus = [], 0, 0, 0


def verser(src, dst, harnais, libelle):
    global total_masque, total_restant, lus
    brut = open(src, "rb").read().decode("utf-8", errors="replace")
    propre = ANSI.sub("", brut).replace("\r\n", "\n").replace("\r", "")
    p_in, p_out = os.path.join(tmp, "in.txt"), os.path.join(tmp, "out.txt")
    open(p_in, "w", encoding="utf-8", newline="\n").write(propre)
    r = subprocess.run([sys.executable, masqueur, p_in, p_out, libelle], capture_output=True, encoding="utf-8", errors="replace")
    assert r.returncode == 0, f"{libelle} : le masquage a échoué (code {r.returncode}) : {r.stdout[-300:]} {r.stderr[-300:]}"
    m = re.search(r"(\d+) occurrence\(s\) . (\d+) suite\(s\) distincte\(s\) . restantes apr.s masquage : (\d+)", r.stdout)
    assert m, f"{libelle} : sortie du masqueur illisible : {r.stdout[-300:]}"
    occ, dist, restant = int(m.group(1)), int(m.group(2)), int(m.group(3))
    assert restant == 0, f"{libelle} : {restant} suite(s) restante(s)"
    masque = open(p_out, "r", encoding="utf-8", newline="").read()
    entete = (f"# D351 — journal de campagne « {libelle} » — empreinte sha256 du harnais {harnais} : {avant[harnais]} (relevée AVANT la campagne, identique APRÈS : harnais non modifié). "
              f"Cette ligne est AJOUTÉE par l'étape de copie ; le journal brut ({len(brut.encode('utf-8'))} octets) reste hors dépôt.\n")
    open(dst, "w", encoding="utf-8", newline="\n").write(entete + masque)
    total_masque += occ
    total_restant += restant
    lus += 1
    rapport.append(f"{libelle} : {len(brut.encode('utf-8'))} o bruts · masqué {occ} occurrence(s) ({dist} distinctes) · restant {restant} · versé {os.path.getsize(dst)} o · sha256 du brut sans ANSI {hashlib.sha256(propre.encode('utf-8')).hexdigest()[:16]}…")


for nom in sorted(os.listdir(os.path.join(tout, "journaux"))):
    if not (nom.startswith("neutralize-") and nom.endswith(".py.log")):
        continue
    harnais = nom[: -len(".log")]
    if harnais not in avant:
        continue
    verser(os.path.join(tout, "journaux", nom), os.path.join(sortie, "journaux", nom[: -len(".py.log")] + ".txt"), harnais, f"lancer-campagnes.py --tout / {harnais}")
for fich in sorted(os.listdir(modes)):
    m = re.match(r"neutralize-(.+?)(--int|--e2e)\.txt$", fich)
    if m:
        verser(os.path.join(modes, fich), os.path.join(sortie, "journaux", f"{m.group(1)}{m.group(2)}.txt"), f"neutralize-{m.group(1)}.py", f"neutralize-{m.group(1)}.py {m.group(2)}")
print(f"journaux versés : {lus} ; occurrences de forme de jeton masquées : {total_masque} ; restantes : {total_restant} (attendu 0)")
open(os.path.join(sortie, "versement-campagnes.txt"), "w", encoding="utf-8", newline="\n").write("\n".join(rapport) + f"\nTOTAL : {lus} journaux ; {total_masque} occurrence(s) masquée(s) ; {total_restant} restante(s) (attendu 0)\n")
