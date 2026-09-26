"""D308 — 23a-2 : REJEU À L'IDENTIQUE des mutations de D306 pour C1 à C5 (+ X3 pour C6), et d'UNE mutation neuve.

Décision du relecteur (chat), déléguée par Ko le 25/09/2026 : « la preuve de 23a-2 tient lieu de session adverse. Rejoue
À L'IDENTIQUE les mutations versées par D306 pour C1 à C5. Chacune doit maintenant faire échouer son titre attendu par
`AssertionError`, et l'échec doit être lu. »

⛔ À L'IDENTIQUE, ET PROUVÉ, PAS AFFIRMÉ : les éditions ne sont PAS recopiées. Elles sont IMPORTÉES de la pièce de D306
(`docs/preuves/D306/outils/neutraliser.py`) — l'objet Python lui-même, `is` vérifié —, et appliquées par SA fonction
`appliquer` (preuve de pose forme D286). Les empreintes des trois fichiers de D306 utilisés sont imprimées.
⛔ LE LECTEUR est celui de D306 (`lire.py`), mais sa CALIBRATION est REJOUÉE avant usage (D286 : une calibration héritée
n'est pas une calibration) — sortie versée à part. Les titres neufs de 23a-2 sont vérifiés UNIQUES dans les specs à la
révision courante (MD-R1-8) avant toute lecture qui les exige.
Seule mutation NEUVE : R23-C1-t (la table ouvre l'annulation client depuis DECLINED) — écrite par D308, déclarée comme
telle au cadrage (§ 5), jamais présentée comme venant de D306.

Usage, depuis la racine, base de développement lancée :
    python docs/preuves/D308/outils/rejouer.py avant  [<cible>...]   # AVANT les tests de 23a-2 : ce que D306 a vu
    python docs/preuves/D308/outils/rejouer.py apres  [<cible>...]   # APRÈS : chaque titre attendu doit mordre
Sorties : docs/preuves/D308/neutralisation/<phase>/<cible>-<mesure>.txt (+ .code) et <cible>-lecture.txt.
"""
import hashlib
import importlib.util
import os
import re
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")
if not os.path.exists("pnpm-workspace.yaml"):
    print("ABANDON : à lancer depuis la racine.")
    sys.exit(2)

D306 = "docs/preuves/D306/outils"
spec = importlib.util.spec_from_file_location("neutraliser_d306", os.path.join(D306, "neutraliser.py"))
N6 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(N6)  # insère D306/outils dans sys.path : `lire` et `titres` sont ceux de D306
from lire import rapport  # noqa: E402
from titres import TITRES as TITRES_D306  # noqa: E402

TITRES = dict(TITRES_D306)
TITRES.update({
    # Titres NEUFS de 23a-2 — mot pour mot au cadrage du rang 23, § 5 (annotation D308).
    "C1U": "C1 — depuis un statut TERMINAL",
    "ACC": "writableFrom et decideBookingTransition s'accordent",
    "C1H": "C1 — un client annule une demande déjà REFUSÉE",
    "C2": "C2 — un REFUS commite pendant l'annulation client SANS motif",
    # Titres EXISTANTS que C3 fait désormais asserter (D121) — D306 n'en avait qu'un dans sa table.
    "D121R": "D121 — deux refus SIMULTANÉS",
    "D121P": "D121 — deux annulations PRO SIMULTANÉES",
})

# La SEULE mutation neuve. Même constructeur `E` que D306 : même preuve de pose.
TABLE_DECLINED = [N6.E("    from: [BookingStatus.PENDING, BookingStatus.ACCEPTED],",
                       "    from: [BookingStatus.PENDING, BookingStatus.ACCEPTED, BookingStatus.DECLINED],")]

# id : (fichier, éditions, mesure, titres attendus APRÈS, origine)
CIBLES = {
    "R23-C1": (*N6.CIBLES["X4-service-plus-DECLINED"][:3], ["C1H", "C2"], "X4 de D306"),
    "R23-C1-t-unit": (N6.TRANS, TABLE_DECLINED, "unit", ["C1U"], "NEUVE (D308)"),
    "R23-C1-t-int": (N6.TRANS, TABLE_DECLINED, "int", ["C1H", "C2"], "NEUVE (D308)"),
    "R23-C2": (*N6.CIBLES["X10-decision-sur-ACCEPTED"][:3], ["C2", "D121C"], "X10 de D306"),
    "R23-C3": (*N6.CIBLES["X2a-relecture-transition-const"][:3], ["C1H", "C2", "D121R", "D121P", "D121C"], "X2a de D306"),
    "R23-C4": (*N6.CIBLES["X14-statut-du-400"][:3], ["T3", "SEQ400"], "X14 de D306"),
    "R23-C5": (*N6.CIBLES["X15-motif-ignore-au-site"][:3], ["SEQ400"], "X15 de D306"),
    "R23-C6": (*N6.CIBLES["X3-writableFrom-plus-DECLINED"][:3], ["U1", "U2", "C1U", "ACC"], "X3 de D306"),
}
ORIGINE_D306 = {"R23-C1": "X4-service-plus-DECLINED", "R23-C2": "X10-decision-sur-ACCEPTED",
                "R23-C3": "X2a-relecture-transition-const", "R23-C4": "X14-statut-du-400",
                "R23-C5": "X15-motif-ignore-au-site", "R23-C6": "X3-writableFrom-plus-DECLINED"}


def sha(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def git(*a: str) -> str:
    return subprocess.run(["git", *a], capture_output=True, text=True, encoding="utf-8", check=True).stdout.strip()


def identite() -> list:
    """Preuve d'identité : chaque cible issue de D306 porte l'OBJET même de la pièce, pas une copie."""
    out = []
    for f in ("neutraliser.py", "lire.py", "titres.py"):
        out.append(f"D306/outils/{f} sha256 {sha(open(os.path.join(D306, f), 'rb').read())[:16]}")
    for cid, x in ORIGINE_D306.items():
        meme = CIBLES[cid][1] is N6.CIBLES[x][1] and CIBLES[cid][0] == N6.CIBLES[x][0] and CIBLES[cid][2] == N6.CIBLES[x][2]
        out.append(f"{cid} ← {x} : éditions {'IDENTIQUES (même objet)' if meme else 'DIFFÉRENTES'}")
        if not meme:
            raise SystemExit("ABANDON : une cible ne porte pas les éditions de D306")
    return out


def titres_uniques() -> list:
    """MD-R1-8 : chaque titre attendu désigne EXACTEMENT un test collecté, à la révision courante."""
    specs = ["apps/api/test/int/bookings.int-spec.ts", "apps/api/src/venues/booking-transitions.spec.ts"]
    tous = []
    for s in specs:
        tous += re.findall(r'\bit\(\s*"((?:[^"\\]|\\.)*)"', open(s, encoding="utf-8").read())
    lignes, ok = [f"titres `it(` relevés : {len(tous)}"], True
    for cle in sorted({k for c in CIBLES.values() for k in c[3]}):
        n = sum(1 for t in tous if TITRES[cle] in t)
        ok &= n == 1
        lignes.append(f"  {'✓' if n == 1 else '✗'} {cle} → {n} test(s) (attendu 1) : {TITRES[cle]}")
    if not ok:
        raise SystemExit("\n".join(lignes) + "\nABANDON : un titre attendu n'est pas unique")
    return lignes


def jouer(cid: str, phase: str) -> str:
    fichier, editions, mesure, attendus, origine = CIBLES[cid]
    dossier = f"docs/preuves/D308/neutralisation/{phase}"
    os.makedirs(dossier, exist_ok=True)
    out = [f"=== {cid} ({origine}) — phase {phase}", f"FICHIER={fichier}"]
    if git("status", "--porcelain", "--", fichier):
        out.append("REFUS : fichier sale avant mutation.")
        return "\n".join(out)
    origine_octets = open(fichier, "rb").read()
    h0 = sha(origine_octets)
    texte, posee = origine_octets.decode("utf-8"), True
    for e in editions:
        texte, ligne, bon = N6.appliquer(texte, e)
        out.append(ligne)
        posee = posee and bon
    sortie = os.path.abspath(f"{dossier}/{cid}-{mesure}.txt")
    try:
        with open(fichier, "wb") as f:
            f.write(texte.encode("utf-8"))
        relu = open(fichier, "rb").read()
        ecrit = relu == texte.encode("utf-8") and relu != origine_octets
        out.append(f"  RELU = texte muté, octet pour octet : {'OUI' if ecrit else 'NON'}")
        posee = posee and ecrit
        out.append(f"MUTATION={'POSÉE' if posee else 'NON POSÉE'}")
        if not posee:
            return "\n".join(out)
        cmd = ["node", "node_modules/vitest/vitest.mjs", "run", *N6.MESURES[mesure]]
        r = subprocess.run([sys.executable, os.path.abspath(os.path.join(D306, "lancer.py")), sortie, "apps/api", "--", *cmd],
                           capture_output=True, text=True, encoding="utf-8")
        out.append(r.stdout.strip())
        out.append(f"COMMANDE=(apps/api) {' '.join(cmd)}")
    finally:
        with open(fichier, "wb") as f:
            f.write(origine_octets)
        h1 = sha(open(fichier, "rb").read())
        st = git("status", "--porcelain", "--", fichier)
        out.append(f"RESTAURE sha256 {h0[:16]} → {h1[:16]} {'IDENTIQUE' if h0 == h1 else 'DIFFÉRENT'} · git status "
                   f"{'vide' if not st else st} ⇒ {'RESTAURATION PROUVÉE' if h0 == h1 and not st else 'ÉCHEC'}")
    # AVANT : aucun titre n'est exigé — on LIT ce que la suite voyait. APRÈS : chaque titre attendu est exigé.
    exiges = [TITRES[k] for k in attendus] if phase == "apres" else []
    out.append(f"TITRES_EXIGES={','.join(attendus) if exiges else '(aucun : phase avant)'}")
    out.append(rapport(sortie, exiges))
    return "\n".join(out)


def main() -> int:
    if len(sys.argv) < 2 or sys.argv[1] not in ("avant", "apres"):
        print("usage: rejouer.py avant|apres [<cible>...]")
        return 2
    phase, ids = sys.argv[1], (sys.argv[2:] or list(CIBLES))
    entete = identite()
    if phase == "apres":
        entete += titres_uniques()
    print("\n".join(entete) + "\n", flush=True)
    for cid in ids:
        texte = jouer(cid, phase)
        print(texte + "\n", flush=True)
        with open(f"docs/preuves/D308/neutralisation/{phase}/{cid}-lecture.txt", "w", encoding="utf-8", newline="\n") as f:
            f.write("\n".join(entete) + "\n\n" + texte + "\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
