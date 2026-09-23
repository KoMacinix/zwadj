"""D303 — les hausses « avant → après » de la passe D277 viennent-elles des textes de D303 ?
Depuis la racine : python3 docs/preuves/D303/passe-d277/verif-hausses.py
Pour chaque occurrence de l'état APRÈS, cherche si une tranche de 70 caractères de son contexte existe déjà dans un
contexte de l'état AVANT. ⚠ LIMITE DÉCLARÉE : une annotation AJOUTÉE à une ligne existante partage son contexte avec
l'avant, et n'est donc PAS séparée par ce contrôle — il ne voit que les occurrences dans du texte entièrement neuf.
Imprime les comptes à côté de l'écart."""
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")


def occ(p):
    lignes = open(p, encoding="utf-8").read().splitlines()
    out = []
    for i, l in enumerate(lignes):
        m = re.match(r"^(\S+):(\d+) \[([^\]]+)\] (\S+)", l)
        if m and i + 1 < len(lignes):
            out.append((m.group(1), m.group(2), m.group(3), m.group(4), lignes[i + 1].strip()))
    return out


for s in ("sens1", "sens2"):
    av = occ(f"docs/preuves/D303/passe-d277/{s}-avant.txt")
    ap = occ(f"docs/preuves/D303/passe-d277/{s}-apres.txt")
    ctx = [o[4] for o in av]
    neuves = [o for o in ap if not any(o[4][20:90] in c for c in ctx)]
    print(f"== {s} : avant {len(av)} · après {len(ap)} (écart {len(ap) - len(av)}) · à contexte entièrement neuf : {len(neuves)}")
    for f, n, m, cl, c in neuves:
        print(f"   [{m}] {f}:{n} {cl} · {c[:160]}")
