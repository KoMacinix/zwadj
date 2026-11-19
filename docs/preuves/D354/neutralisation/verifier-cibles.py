#!/usr/bin/env python3
"""Vérifie, EN MÉMOIRE et sur les objets de `HEAD` (jamais sur l'arbre de travail, qu'une campagne peut être en train de muter), que chaque cible de r56_cibles.txt POSE sa mutation : ancre 1 → 0 ET marqueur n → n + 1
(substitution) ; rend la liste des défauts. N'écrit rien. Usage : python3 verifier_cibles.py <r56_cibles.txt> <constantes.py>"""
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

CIBLES = []


def cible(libelle, fichier, avant, apres, mesures, genre="substitution"):
    CIBLES.append({"libelle": libelle, "fichier": fichier, "avant": avant, "apres": apres, "genre": genre})


env = {"cible": cible}
exec(open(sys.argv[2], encoding="utf-8").read(), env)
exec(open(sys.argv[1], encoding="utf-8").read(), env)


def source(chemin):
    return subprocess.run(["git", "show", f"HEAD:{chemin}"], capture_output=True).stdout.decode("utf-8")


defauts = []
for c in CIBLES:
    src = source(c["fichier"])
    adapter = (lambda t: t.replace("\n", "\r\n")) if "\r\n" in src else (lambda t: t)
    avant, apres = adapter(c["avant"]), adapter(c["apres"])
    n_avant, m_avant = src.count(avant), src.count(apres)
    if n_avant != 1:
        defauts.append(f"{c['libelle'][:5]} : ancre ×{n_avant} dans {c['fichier']}")
        continue
    mute = src.replace(avant, apres)
    n_apres, m_apres = mute.count(avant), mute.count(apres)
    attendu_ancre = 1 if c["genre"] == "insertion" else 0
    if (n_apres, m_apres) != (attendu_ancre, m_avant + 1):
        defauts.append(f"{c['libelle'][:5]} : NON POSÉE — ancre {n_avant}→{n_apres}, marqueur {m_avant}→{m_apres} (attendu 1→{attendu_ancre} et {m_avant}→{m_avant + 1})")
print(f"cibles examinées : {len(CIBLES)} ; défauts : {len(defauts)} (attendu 0)")
for d in defauts:
    print("  ✗", d)
sys.exit(1 if defauts else 0)
