"""Simule, SANS lancer de test, l'arithmétique d'ancre et de marqueur du moteur de neutralize-r44.py sur les fichiers RÉELS (D286 : « ancre 1→0 ET marqueur n→n+1 » pour une substitution ; « ancre 1→1 ET marqueur n→n+1 » pour une insertion).
Rend, pour chaque cible fautive : l'identifiant, ce qui manque, et les comptes mesurés. Imprime aussi CE QU'IL A PARCOURU (D290). Calibration, deux bras : (sain) une cible fabriquée correcte rend « ok » ; (fautif) une cible dont le remplacement est une sous-chaîne de l'ancre rend « fautive »."""
import importlib.util
import io
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

spec = importlib.util.spec_from_file_location("r44", "neutralisation/neutralize-r44.py")
r44 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r44)


def verdict(source: str, avant: str, apres: str, genre: str) -> tuple[bool, str]:
    avant, apres = r44._adapter(avant, source), r44._adapter(apres, source)
    n_ancre = source.count(avant)
    if n_ancre != 1:
        return False, f"ancre ×{n_ancre} (1 attendue)"
    marque_avant = source.count(apres)
    mute = source.replace(avant, apres)
    ancre_apres, marque_apres = mute.count(avant), mute.count(apres)
    attendue = 1 if genre == "insertion" else 0
    if (ancre_apres, marque_apres) != (attendue, marque_avant + 1):
        return False, f"ancre 1→{ancre_apres} (attendu 1→{attendue}) · marqueur {marque_avant}→{marque_apres} (attendu {marque_avant}→{marque_avant + 1})"
    return True, "ok"


# calibration
sain = verdict("a b c", "b", "X", "substitution")
fautif = verdict("a bb c", "bb", "b", "substitution")
assert sain[0] is True and fautif[0] is False, f"calibration manquée : sain={sain} fautif={fautif}"

examinees = 0
fautives = []
for c in r44.CIBLES:
    examinees += 1
    source = io.open(c["fichier"], encoding="utf-8", newline="").read()
    ok, detail = verdict(source, c["avant"], c["apres"], c["genre"])
    if not ok:
        fautives.append((c["libelle"].split(".")[0], detail))
print(f"cibles examinées : {examinees} · fautives : {len(fautives)} (attendu 0)")
for ident, detail in fautives:
    print(f"  ✗ {ident} : {detail}")
