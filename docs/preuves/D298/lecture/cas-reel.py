"""Recompte le CAS RÉEL connu (journal e2e du rang 15, hors dépôt) SANS imprimer aucune valeur, et
relève la FORME de ses lignes, valeur retirée (D298). Usage, depuis la racine :
    python3 docs/preuves/D298/lecture/cas-reel.py .neutralisation-journaux/rang15-e2e.log
Le paramètre du lien est assemblé à l'exécution : écrit en clair, ce fichier se détecterait lui-même
au prochain audit (leçon D291)."""
import hashlib
import re
import sys
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8")
PARAM = "to" + "ken"
FORME = re.compile(r"verification-email\?" + PARAM + r"=([^\s\"'<>&]*)")
brut = open(sys.argv[1], "rb").read()
t = brut.decode("utf-8", errors="replace")
vals = FORME.findall(t)
print(f"{sys.argv[1]} : {len(brut)} octets · sha256 {hashlib.sha256(brut).hexdigest()}")
print(f"  lignes (splitlines) : {len(t.splitlines())} · occurrences de la forme : {len(vals)} (attendu 24, D293)"
      f" · longueurs {dict(Counter(len(v) for v in vals))} · valeurs distinctes : {len(set(vals))}"
      f" · alphabet base64url : {all(re.fullmatch(r'[A-Za-z0-9_-]*', v) for v in vals)}")
prefixes = Counter(l[:l.index("verification-email?")] for l in t.split("\n") if "verification-email?" + PARAM in l)
for p, n in prefixes.items():
    print(f"  forme relevée, {n} ligne(s) : {p!r} + « verification-email? » + paramètre du lien + valeur")
