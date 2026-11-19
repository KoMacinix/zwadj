#!/usr/bin/env python3
"""Vérifie, EN MÉMOIRE et sur les objets de `HEAD`, les ancres et la pose des mutations d'un harnais EXISTANT (`neutralize-<x>.py`) : on exécute son PRÉFIXE (jusqu'au bloc TITRES, c'est-à-dire ses constantes et ses
appels `cible(...)`) et on lit `CIBLES`. N'écrit rien, ne mute rien, ne lit pas l'arbre de travail. Usage : python3 verifier_harnais.py <x> [<x> ...]   (ex. r44 adm1)"""
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")


def source(chemin):
    r = subprocess.run(["git", "show", f"HEAD:{chemin}"], capture_output=True)
    return r.stdout.decode("utf-8") if r.returncode == 0 else None


total_defauts = 0
for nom in sys.argv[1:]:
    chemin = f"neutralisation/neutralize-{nom}.py"
    texte = open(chemin, encoding="utf-8", newline="").read().replace("\r\n", "\n")
    # le préfixe : tout ce qui précède le moteur (les cibles sont déclarées AVANT le bloc TITRES ou le moteur)
    for borne in ("# <<TITRES>>", "def _est_int(c: dict)", "def lancer(", "# ── TITRES"):
        if borne in texte:
            prefixe = texte[: texte.index(borne)]
            break
    else:
        print(f"[{nom}] ✗ aucune borne trouvée")
        total_defauts += 1
        continue
    saved_argv = sys.argv
    sys.argv = [chemin]
    ns = {"__file__": chemin, "__name__": "verif"}
    try:
        exec(compile(prefixe, chemin, "exec"), ns)
    finally:
        sys.argv = saved_argv
    cibles = ns.get("CIBLES")
    if not cibles:
        print(f"[{nom}] ✗ CIBLES introuvable ou vide")
        total_defauts += 1
        continue
    defauts = []
    inconnus = set()
    for c in cibles:
        src = source(c["fichier"])
        if src is None:
            inconnus.add(c["fichier"])
            continue
        adapter = (lambda t: t.replace("\n", "\r\n")) if "\r\n" in src else (lambda t: t)
        avant, apres = adapter(c["avant"]), adapter(c["apres"])
        n_avant, m_avant = src.count(avant), src.count(apres)
        if n_avant != 1:
            defauts.append(f"{c['libelle'].split('.')[0]} : ancre ×{n_avant} dans {c['fichier']}")
            continue
        mute = src.replace(avant, apres)
        n_apres, m_apres = mute.count(avant), mute.count(apres)
        attendu = 1 if c.get("genre") == "insertion" else 0
        if (n_apres, m_apres) != (attendu, m_avant + 1):
            defauts.append(f"{c['libelle'].split('.')[0]} : NON POSÉE ({n_avant}→{n_apres}, {m_avant}→{m_apres})")
    print(f"[{nom}] cibles examinées : {len(cibles)} ; fichiers introuvables à HEAD : {sorted(inconnus)} ; ancres périmées ou mutations non posées : {len(defauts)} (attendu 0)")
    for d in defauts:
        print("   ✗", d)
    total_defauts += len(defauts)
sys.exit(1 if total_defauts else 0)
