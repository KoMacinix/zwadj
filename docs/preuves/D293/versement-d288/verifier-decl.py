"""Controle de l'affirmation « la colonne decl rend — parce que ROUGES attend deux caracteres » (D293).

Usage, depuis la racine : python docs/preuves/D293/versement-d288/verifier-decl.py
Pour chaque journal verse ou les deux expressions du lanceur (relues a c2ac531) ne trouvent rien, imprime
la ligne de resume, et teste l'expression ROUGES telle quelle, puis avec un seul caractere a la place des
deux. Rend le nombre de journaux parcourus et l'attendu.
"""
import io
import os
import re
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")

lanceur = subprocess.run(["git", "show", "c2ac531:neutralisation/lancer-campagnes.py"],
                         capture_output=True, text=True, encoding="utf-8").stdout
m_mord = re.search(r'MORDUES = re\.compile\(r"(.+)"\)', lanceur)
m_roug = re.search(r'ROUGES = re\.compile\(r"(.+)"\)', lanceur)
if not (m_mord and m_roug):
    sys.exit("ABANDON : expressions du lanceur introuvables a c2ac531")
MORDUES, ROUGES = re.compile(m_mord.group(1)), re.compile(m_roug.group(1))
UN = re.compile(m_roug.group(1).replace("neutralis..e", "neutralis.e"))
print(f"ROUGES relue a c2ac531 : {m_roug.group(1)}")

d = os.path.join("docs", "preuves", "D288", "campagnes")
noms = sorted(os.listdir(d))
sans, un_car = 0, 0
for n in noms:
    t = io.open(os.path.join(d, n), encoding="utf-8").read()
    if MORDUES.search(t) or ROUGES.search(t):
        continue
    sans += 1
    resume = [l for l in t.splitlines() if "garde(s)" in l]
    trouve = bool(UN.search(t))
    un_car += trouve
    print(f"  {n:36s} ROUGES tel quel : non · avec un caractere : {'oui' if trouve else 'NON'} · resume : {resume[-1] if resume else '(aucun)'}")
print(f"journaux parcourus : {len(noms)} (attendu 26) · sans « decl » : {sans} (attendu 11) · "
      f"retrouves avec un seul caractere : {un_car} (attendu {sans})")
