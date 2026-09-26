"""D307 — RELEVÉ pour le tri des sept doutes de la carte de D304 (décision 2c du relecteur, chat, déléguée par Ko).
Pièce jetable, versée. N'écrit rien dans le dépôt : elle imprime.

Principe du relecteur : « Un harnais se classe par ses CIBLES, jamais par les fichiers qu'il cite. » Ce script rend
donc, pour `s11a`, `solid-s1`, `s10a` et `solid-s6`, CHAQUE cible : son libellé, le fichier qu'elle mute, l'ancre et
le remplacement (tronqués), et ses mesures — importés du harnais lui-même (même chargement que
`neutralisation/verifier-mutations.py`), jamais recopiés. Le classement se fait À LA MAIN, dans `tri.txt`.

Il relève aussi, pour `venues.service.ts` (« dehors tant qu'il ne fait que transporter ; dedans s'il valide ou transforme
un montant ou un taux »), chaque ligne qui nomme un montant ou un taux, et OÙ VIT la validation applicative de D35
(cashback ≤ commission) dans le code de l'API et de `packages/types` (hors specs, hors client généré).
Chaque relevé imprime ce qu'il a parcouru (D290) ; calibration à deux bras sur le relevé D35 (D286).
Usage, depuis la racine :  python docs/preuves/D307/carte/releve-cibles.py
"""
import importlib.util
import os
import re
import sys

for f in (sys.stdout, sys.stderr):
    f.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE.")
    sys.exit(2)

HARNAIS = ["s11a", "solid-s1", "s10a", "solid-s6"]


def charger(nom: str):
    chemin = f"neutralisation/neutralize-{nom}.py"
    spec = importlib.util.spec_from_file_location("h_" + nom.replace("-", "_"), chemin)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


total = 0
for nom in HARNAIS:
    m = charger(nom)
    print(f"\n===== neutralize-{nom}.py — {len(m.CIBLES)} cible(s)")
    fichiers = {}
    for c in m.CIBLES:
        lib, fic, avant, apres = c[0], c[1], c[2], c[3]
        mesures = c[5] if len(c) > 5 else "?"
        fichiers[fic] = fichiers.get(fic, 0) + 1
        total += 1
        print(f"- {lib}")
        print(f"    fichier  : {fic}")
        print(f"    ancre    : {avant[:140]!r}")
        print(f"    remplacé : {apres[:140]!r}")
        print(f"    mesures  : {mesures}")
    print(f"  fichiers mutés : " + " · ".join(f"{k} ({v})" for k, v in fichiers.items()))
print(f"\nCIBLES EXAMINÉES : {total} sur {len(HARNAIS)} harnais")

# ── venues.service.ts : montant ou taux ? ────────────────────────────────────────────────────────────────────
MOTIF_ARGENT = re.compile(r"(?i)commission|cashback|deposit|baseprice|ratebps|amountcents|Math\.|round\(|\bcents\b|\* ?100\b|/ ?100\b|10_?000")
chemin = "apps/api/src/venues/venues.service.ts"
lignes = open(chemin, encoding="utf-8").read().splitlines()
touches = [(i + 1, l.strip()) for i, l in enumerate(lignes) if MOTIF_ARGENT.search(l)]
print(f"\n===== {chemin} — lignes parcourues : {len(lignes)} · lignes qui nomment un montant ou un taux : {len(touches)}")
for n, l in touches:
    print(f"  {n}: {l[:150]}")

# ── D35 : où vit la validation applicative ? ─────────────────────────────────────────────────────────────────
MOTIF_D35 = re.compile(r"cashbackRateBps\s*>\s*[\w.]*commissionRateBps|CASHBACK_EXCEEDS_COMMISSION")


def fichiers_source():
    for racine in ("apps/api/src", "packages/types/src"):
        for d, _sd, fs in os.walk(racine):
            if "generated" in d.replace("\\", "/").split("/"):
                continue
            for f in fs:
                if f.endswith(".ts") and not f.endswith(".spec.ts"):
                    yield os.path.join(d, f).replace("\\", "/")


# Calibration, deux bras : un fichier qui porte la validation (connu), un fichier qui ne la porte pas (connu).
POSITIF, NEGATIF = "apps/api/src/venues/venues-admin.service.ts", "apps/api/src/venues/slug.ts"
pos = bool(MOTIF_D35.search(open(POSITIF, encoding="utf-8").read()))
neg = bool(MOTIF_D35.search(open(NEGATIF, encoding="utf-8").read()))
print(f"\n===== D35 — calibration : positif {POSITIF} → {'TROUVÉ' if pos else 'MANQUÉ'} (attendu TROUVÉ) · "
      f"négatif {NEGATIF} → {'TROUVÉ' if neg else 'absent'} (attendu absent)")
if not pos or neg:
    print("✗ ABANDON : calibration manquée")
    sys.exit(2)
vus, sites = 0, []
for f in fichiers_source():
    vus += 1
    for i, l in enumerate(open(f, encoding="utf-8").read().splitlines(), start=1):
        if MOTIF_D35.search(l):
            sites.append((f, i, l.strip()))
print(f"fichiers parcourus : {vus} · sites : {len(sites)} (attendu > 0)")
for f, i, l in sites:
    print(f"  {f}:{i}: {l[:150]}")
print(f"venues.service.ts parmi les sites : {'OUI' if any(s[0] == chemin for s in sites) else 'NON'}")
