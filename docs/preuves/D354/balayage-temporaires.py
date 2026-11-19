#!/usr/bin/env python3
"""D354 — BALAYAGE DES MOTS DE PASSE TEMPORAIRES (la consigne : « audits de secrets avant chaque versement (D298) — les mots de passe temporaires des tests compris »).

POURQUOI IL EXISTE : l'audit de secrets (`neutralisation/audit-secrets.py`) reconnaît des motifs (mot de passe nommé, jeton, clé d'API…), pas la FORME d'un mot de passe temporaire de ce lot : douze symboles de l'alphabet de
`staff-temporary-password.ts` (31 symboles sans 0, O, 1, I, l), lettres ET chiffres. INSTRUMENTS ÉCARTÉS : un motif ajouté à l'audit (il n'est pas ouvert par ce lot) ; `aucune-valeur-reelle.py` (D299), qui cherche les valeurs
d'un journal e2e qu'on lui nomme — ici il n'y a pas de journal à valeurs réelles à nommer.
CE QU'IL FAIT : compte, dans les fichiers donnés (dossiers parcourus, récursivement), les suites de EXACTEMENT douze symboles de cet alphabet qui mêlent lettres et chiffres, et pour chaque valeur DISTINCTE imprime
seulement une empreinte (sha256, douze premiers caractères), les dossiers qui la portent et si elle figure dans une SOURCE suivie (`git grep`, apps, packages, neutralisation). IL N'IMPRIME JAMAIS UNE VALEUR (D299).
CALIBRATION, deux bras, abandon si un manque : un texte construit qui porte une suite de douze symboles est trouvé (positif) ; onze symboles, treize symboles, minuscules : non (trois négatifs).
Usage, depuis la RACINE : python3 balayage-temporaires.py <fichier|dossier>…   Codes : 0 = parcours fait ; 2 = ABANDON (calibration manquée)."""
import hashlib
import os
import re
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
RX = re.compile(r"(?<![A-Za-z0-9])[%s]{12}(?![A-Za-z0-9])" % ALPHABET)


def porteur(s: str) -> bool:
    return any(c.isalpha() for c in s) and any(c.isdigit() for c in s)


def trouves(texte: str) -> list[str]:
    return [m.group(0) for m in RX.finditer(texte) if porteur(m.group(0))]


ok = (
    len(trouves("x TQ7MN4XK2RVB y")) == 1
    and not trouves("x TQ7MN4XK2RV y")
    and not trouves("x TQ7MN4XK2RVBZ y")
    and not trouves("x tq7mn4xk2rvb y")
)
print("calibration (positif 1 · trois négatifs 0) :", "✓" if ok else "✗ ABANDON")
if not ok:
    sys.exit(2)

fichiers = []
for a in sys.argv[1:]:
    if os.path.isdir(a):
        for racine, _, noms in os.walk(a):
            fichiers += [os.path.join(racine, n).replace("\\", "/") for n in noms]
    elif os.path.isfile(a):
        fichiers.append(a.replace("\\", "/"))
valeurs: dict[str, set[str]] = {}
octets = 0
for f in sorted(set(fichiers)):
    t = open(f, encoding="utf-8", errors="replace").read()
    octets += len(t)
    for v in trouves(t):
        valeurs.setdefault(v, set()).add(os.path.dirname(f))
total = sum(1 for _ in valeurs)
print(f"fichiers examinés : {len(set(fichiers))} · caractères : {octets} · valeurs DISTINCTES de douze symboles (lettres et chiffres) : {total}")
for v, dossiers in sorted(valeurs.items(), key=lambda kv: hashlib.sha256(kv[0].encode()).hexdigest()):
    r = subprocess.run(["git", "grep", "-l", "-F", v, "--", "apps", "packages", "neutralisation"], capture_output=True, text=True, encoding="utf-8")
    dans_sources = "oui : " + ", ".join(r.stdout.split()) if r.stdout.strip() else "non"
    print(f"  sha256 {hashlib.sha256(v.encode()).hexdigest()[:12]} · dossiers : {sorted(dossiers)} · dans une source suivie : {dans_sources}")
