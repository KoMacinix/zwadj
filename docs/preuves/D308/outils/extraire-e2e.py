"""D308 — EXTRAIT du journal e2e. Pièce jetable, versée. Le journal COMPLET reste hors dépôt
(`.neutralisation-journaux/d308/`, ignoré par git) : il porte les requêtes des serveurs de développement AVEC leurs
en-têtes (jetons de session de test) — même règle que D305.
Retire les lignes qui commencent par « [WebServer] » APRÈS retrait des codes ANSI (faute n° 4 de D305 : sans ce retrait,
0 ligne retirée). Le nombre retiré est RECOUPÉ par une seconde méthode indépendante (expression sur les octets), et
l'attendu s'imprime à côté du mesuré (D290). Garde les autres lignes octet pour octet.
Usage :  python docs/preuves/D308/outils/extraire-e2e.py <complet.log> <extrait.txt>
"""
import hashlib
import re
import sys

for f in (sys.stdout, sys.stderr):
    f.reconfigure(encoding="utf-8")
src, dst = sys.argv[1], sys.argv[2]
brut = open(src, "rb").read()
ANSI = re.compile(rb"\x1b\[[0-9;]*m")
lignes = brut.split(b"\n")
gardees = [l for l in lignes if not ANSI.sub(b"", l).startswith(b"[WebServer]")]
retirees = len(lignes) - len(gardees)
# Seconde méthode : sur le texte ENTIER débarrassé de l'ANSI, compter les débuts de ligne « [WebServer] ».
recoupe = len(re.findall(rb"(?m)^\[WebServer\]", ANSI.sub(b"", brut)))
entete = (
    f"EXTRAIT de {src.replace(chr(92), '/').split('/')[-1]} (hors dépôt : .neutralisation-journaux/d308/, ignoré par git)\n"
    f"— le complet porte les requêtes des serveurs de dev AVEC leurs en-têtes (jetons de session de test).\n"
    f"complet : {len(brut)} octets, {len(lignes)} lignes (découpe sur \\n), sha256 {hashlib.sha256(brut).hexdigest()}\n"
    f"retirées : {retirees} lignes « [WebServer] » après retrait de l'ANSI (attendu {recoupe}, recoupé par une seconde "
    f"méthode) ; gardées : {len(gardees)}, octet pour octet.\n"
    + "-" * 100 + "\n"
).encode("utf-8")
open(dst, "wb").write(entete + b"\n".join(gardees))
print(f"lignes lues {len(lignes)} · retirées {retirees} (attendu {recoupe}) · gardées {len(gardees)}")
sys.exit(0 if retirees == recoupe and retirees > 0 else 1)
