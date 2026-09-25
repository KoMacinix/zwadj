# D306 — insère un paragraphe (lu dans un FICHIER, D289) dans la section D306 de `ZWADJ_CONTINUITE.md`, juste avant
# « ### D306 — ce qui a atterri, et où ». Ancre comptée avant (1), paragraphe relu après (identique, 1 fois), CRLF gardé.
# Usage, depuis la racine :  python docs/preuves/D306/outils/inserer-paragraphe.py <paragraphe.md>
import sys

for f in (sys.stdout, sys.stderr):
    f.reconfigure(encoding="utf-8")
CHEMIN = "ZWADJ_CONTINUITE.md"
ANCRE = "### D306 — ce qui a atterri, et où"
para = open(sys.argv[1], encoding="utf-8").read().replace("\r\n", "\n").rstrip("\n") + "\n\n"
brut = open(CHEMIN, "rb").read()
assert brut.count(b"\r\n") == brut.count(b"\n"), "fichier non homogène en CRLF"
t = brut.decode("utf-8").replace("\r\n", "\n")
n = t.count(ANCRE)
if n != 1:
    sys.exit(f"ancre trouvée {n} fois (attendu 1) — RIEN N'EST ÉCRIT")
t = t.replace(ANCRE, para + ANCRE)
open(CHEMIN, "wb").write(t.replace("\n", "\r\n").encode("utf-8"))
relu = open(CHEMIN, "rb").read()
r = relu.decode("utf-8").replace("\r\n", "\n")
print(f"paragraphe présent {r.count(para.rstrip(chr(10)))} fois (attendu 1) · octets {len(brut)} → {len(relu)} · "
      f"CRLF {relu.count(b'\r\n')} = LF {relu.count(b'\n')} : {relu.count(b'\r\n') == relu.count(b'\n')}")
