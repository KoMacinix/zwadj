#!/usr/bin/env python3
"""D351 — relecture MÉCANIQUE de `ce-qui-part-vers-le-tiers.md` pour une valeur réelle (consigne, § 3 : « relu par toi pour une valeur réelle (0 attendu) »). S'ajoute à la LECTURE humaine, ne la remplace pas.
Imprime ce qu'il a parcouru (D290). CALIBRATION deux bras : un texte fabriqué qui contient un faux e-mail, une fausse clé de 40 caractères, une fausse adresse IPv4 et une fausse URL à identifiants doit les trouver tous les quatre ; un texte ordinaire (la phrase « le site Zwadj ») n'en trouve aucun."""
import re
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

MOTIFS = {
    "e-mail": re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"),
    "chaîne longue de forme clé (>= 32 car. base64url/hex, mêlant lettres et chiffres)": re.compile(r"(?<![A-Za-z0-9_/.-])(?=[A-Za-z0-9_-]*[0-9])(?=[A-Za-z0-9_-]*[A-Za-z])[A-Za-z0-9_-]{32,}(?![A-Za-z0-9_/.-])"),
    "adresse IPv4": re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b"),
    "URL à identifiants ou à paramètre secret": re.compile(r"https?://[^\s/]*:[^\s/@]*@|[?&](?:key|apikey|api_key|token|access_token|secret)=[^\s&]+", re.I),
    "mot-clé de secret suivi d'une valeur": re.compile(r"\b(?:password|passwd|secret|api[_-]?key|bearer)\b\s*[:=]\s*\S{6,}", re.I),
}


def balayer(texte):
    return {nom: [m.group(0) for m in rx.finditer(texte)] for nom, rx in MOTIFS.items()}


faux = "contact jean.dupont@example.org ; clé AbCdEfGhIjKlMnOpQrStUvWxYz0123456789abcd ; serveur 192.168.10.25 ; https://user:pass@tiles.example.com/{z}/{x}/{y}.png ; secret = hunter2hunter2"
sain = "Le site Zwadj affiche la carte quand le visiteur la demande."
r_faux, r_sain = balayer(faux), balayer(sain)
if not (all(len(v) >= 1 for v in r_faux.values()) and all(len(v) == 0 for v in r_sain.values())):
    sys.exit(f"CALIBRATION RATÉE : positif {{ {', '.join(f'{k[:20]}={len(v)}' for k, v in r_faux.items())} }} (attendu >= 1 partout) ; négatif {sum(len(v) for v in r_sain.values())} (attendu 0). ABANDON.")
chemin = sys.argv[1]
t = open(chemin, encoding="utf-8", newline="").read()
r = balayer(t)
print(f"calibration (deux bras) : le faux texte déclenche {sum(len(v) >= 1 for v in r_faux.values())} motifs sur {len(MOTIFS)} ; le texte ordinaire 0 — les deux bras tiennent.")
print(f"fichier : {chemin} · {len(t)} caractères · {len(t.splitlines())} lignes parcourues")
total = 0
for nom, trouves in r.items():
    total += len(trouves)
    print(f"  {nom} : {len(trouves)} (attendu 0)" + (f" — {[x[:60] for x in trouves[:5]]}" if trouves else ""))
print(f"TOTAL : {total} (attendu 0)")
sys.exit(0 if total == 0 else 1)
