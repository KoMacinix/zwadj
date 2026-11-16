"""Verse un journal brut en retirant les lignes qui portent un jeton de développement (« token= »), puis ASSERTE qu'il n'en reste aucun
et qu'aucune suite de 43 caractères base64url mêlant minuscules, majuscules et chiffres ne subsiste (la forme d'un jeton opaque du dépôt).
Usage : python verser_journal.py <brut> <sortie> <libellé>
Imprime : lignes lues, lignes retirées, « token= » restants (attendu 0), suites de forme jeton restantes (attendu 0)."""
import hashlib
import re
import sys

brut, sortie, libelle = sys.argv[1], sys.argv[2], sys.argv[3]
octets = open(brut, "rb").read()
texte = octets.decode("utf-8", errors="replace")
lignes = texte.splitlines()
gardees = [l for l in lignes if "token=" not in l]
retirees = len(lignes) - len(gardees)
JETON = re.compile(r"(?<![A-Za-z0-9_-])[A-Za-z0-9_-]{43}(?![A-Za-z0-9_-])")
restants_token = sum(l.count("token=") for l in gardees)
forme = [m.group(0) for l in gardees for m in JETON.finditer(l) if any(c.islower() for c in m.group(0)) and any(c.isupper() for c in m.group(0)) and any(c.isdigit() for c in m.group(0))]
assert restants_token == 0, f"{restants_token} « token= » restants"
assert not forme, f"{len(forme)} suites de forme jeton restantes"
entete = f"# {libelle} — journal brut hors dépôt : sha256 {hashlib.sha256(octets).hexdigest()} · {len(octets)} octets · {len(lignes)} lignes lues · {retirees} lignes retirées (jetons de développement des courriels d'activation) · « token= » restants : {restants_token} (attendu 0) · suites de forme jeton restantes : {len(forme)} (attendu 0)\n"
open(sortie, "w", encoding="utf-8", newline="\n").write(entete + "\n".join(gardees) + "\n")
print(f"lues {len(lignes)} · retirées {retirees} · token= restants {restants_token} (attendu 0) · forme jeton restantes {len(forme)} (attendu 0)")
