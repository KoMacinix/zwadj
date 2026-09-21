"""Aucune des 24 valeurs RÉELLES du journal e2e n'a-t-elle atteint un fichier versé ? (D298)
La calibration de `neutralisation/audit-secrets.py` manipule ces valeurs EN MÉMOIRE ; ce contrôle vérifie
qu'aucune n'est sortie. N'imprime que des comptes, jamais une valeur.
Usage, depuis la racine : python3 docs/preuves/D298/lecture/aucune-valeur-reelle.py <journal> <fichier|dossier>...
Calibration à deux bras, ABANDON si un bras manque (D286) : le journal lui-même doit rendre 24 valeurs
trouvées (bras positif), un texte propre 0 (bras négatif)."""
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
PARAM = "to" + "ken"
brut = open(sys.argv[1], "rb").read().decode("utf-8", errors="replace")
valeurs = set(re.findall(r"verification-email\?" + PARAM + r"=([A-Za-z0-9_-]{43})", brut))


def trouvees(texte: str) -> int:
    return sum(1 for v in valeurs if v in texte)


pos, neg = trouvees(brut), trouvees("aucune valeur ici")
print(f"calibration : valeurs relevées {len(valeurs)} (attendu 24) · positif {pos} (attendu 24) · négatif {neg} (attendu 0)")
if len(valeurs) != 24 or pos != 24 or neg != 0:
    sys.exit("ABANDON : un bras de la calibration manque son verdict")
fichiers = []
for cible in sys.argv[2:]:
    if os.path.isdir(cible):
        for base, _, noms in os.walk(cible):
            fichiers += [os.path.join(base, n) for n in noms]
    else:
        fichiers.append(cible)
touches = 0
octets = 0
for f in sorted(fichiers):
    b = open(f, "rb").read()
    octets += len(b)
    k = trouvees(b.decode("utf-8", errors="replace"))
    if k:
        touches += 1
        print(f"  ⛔ {f} : {k} valeur(s) réelle(s)")
print(f"== parcourus : {len(fichiers)} fichiers, {octets} octets · fichiers portant une valeur réelle : {touches} (attendu 0)")
sys.exit(1 if touches else 0)
