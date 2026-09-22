"""VERSEMENT DES PIÈCES DE LA PASSE 2 DU RANG 19 (D299) — procédure archivée comme preuve (D291), jamais
promue en instrument. Usage, depuis la racine :
    python3 docs/preuves/D299/outils/verser-passe.py [<sortie console de l'échantillonneur>]

CE QU'ELLE FAIT : copie OCTET POUR OCTET, depuis `.neutralisation-journaux/` (ignoré par git), la liste
ÉNUMÉRÉE ci-dessous vers `docs/preuves/D299/passe/` et les 27 journaux de campagne vers
`docs/preuves/D299/passe/campagnes/`, puis RELIT chaque destination et confronte son SHA-256 à celui de
la source — le compte rendu de la copie ne fait pas foi, le fichier relu si (D289).
⛔ LE JOURNAL e2e BRUT N'ENTRE PAS (critère du rang 9, point 9) : tout nom qui porte « e2e » et finit en
« .log » est REFUSÉ, avant toute écriture — son extrait est produit à part par `extraire-e2e.py`.
⛔ AUCUN ÉCRASEMENT : une destination qui existe déjà avec d'autres octets fait ABANDONNER.
Imprime son parcouru à côté de l'attendu (D290). Codes : 0 = tout versé et identique ; 2 = abandon.
"""
import hashlib
import os
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")

if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO.")
    sys.exit(2)

J = ".neutralisation-journaux"
DEST = "docs/preuves/D299/passe"
P = "rang19-p2-"
INT = ["e3d1-s8", "s11b", "solid-s6"]
SONDES = ["ouverture-1", "ouverture-2", "avant-typecheck", "avant-lint", "avant-test", "avant-build",
          "avant-testint", "avant-e2e", "avant-campagnes"] + [f"avant-int-{c}" for c in INT] + ["cloture"]
PORTES = ["typecheck", "lint", "test", "build", "test-int"]

liste = [f"{P}pg.txt", f"{P}avant-releve.txt"]
liste += [f"{P}sonde-{s}.txt" for s in SONDES]
liste += [f"{P}arbre-{n}.txt" for n in range(1, 6)]
liste += [f"{P}{p}.{x}" for p in PORTES for x in ("log", "code")]
liste += [f"{P}test-e2e.code", f"{P}avant-e2e.txt", f"{P}apres-e2e.txt"]
liste += [f"{P}campagnes-tout.{x}" for x in ("log", "code", "heures")]
liste += [f"{P}pg-int-{c}.txt" for c in INT] + [f"{P}int-{c}.{x}" for c in INT for x in ("log", "code")]
liste += [f"{P}contre-epreuve.{x}" for x in ("txt", "code")]
liste += [f"{P}etat.csv", f"{P}etat-resume.txt", f"{P}etat-complement.txt"]
ATTENDU_PASSE = 2 + 13 + 5 + 10 + 3 + 3 + 3 + 6 + 2 + 3

paires = [(os.path.join(J, n), os.path.join(DEST, n)) for n in liste]
if len(sys.argv) > 1:
    paires.append((sys.argv[1], os.path.join(DEST, f"{P}echantillonneur-sortie.txt")))
    ATTENDU_PASSE += 1
campagnes = sorted(n for n in os.listdir(J) if n.startswith("neutralize-") and n.endswith(".py.log"))
paires += [(os.path.join(J, n), os.path.join(DEST, "campagnes", n)) for n in campagnes]

print(f"== liste : {len(liste) + (1 if len(sys.argv) > 1 else 0)} pièce(s) de passe (attendu {ATTENDU_PASSE}) · "
      f"{len(campagnes)} journal(aux) de campagne (attendu 27)")
if len(liste) + (1 if len(sys.argv) > 1 else 0) != ATTENDU_PASSE or len(campagnes) != 27:
    print("ABANDON : la liste ne rend pas son attendu — rien n'est écrit")
    sys.exit(2)
refuses = [s for s, _ in paires if "e2e" in os.path.basename(s) and s.endswith(".log")]
manquants = [s for s, _ in paires if not os.path.isfile(s)]
if refuses or manquants:
    print(f"ABANDON : journal e2e brut dans la liste {refuses} · sources manquantes {manquants} — rien n'est écrit")
    sys.exit(2)


def sha(chemin):
    with open(chemin, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


conflits = [d for s, d in paires if os.path.exists(d) and sha(d) != sha(s)]
if conflits:
    print(f"ABANDON : destination(s) déjà présente(s) avec d'autres octets {conflits} — rien n'est écrit")
    sys.exit(2)

os.makedirs(os.path.join(DEST, "campagnes"), exist_ok=True)
identiques = 0
for s, d in paires:
    with open(s, "rb") as f:
        octets = f.read()
    with open(d, "wb") as f:
        f.write(octets)
    hs, hd = hashlib.sha256(octets).hexdigest(), sha(d)
    identiques += hs == hd
    print(f"   {'✓' if hs == hd else '✗'} {hd[:16]}… {len(octets):>8} o  {d}")
print(f"== {identiques} identique(s) par SHA-256 sur {len(paires)} relue(s) (attendu {len(paires)})")
sys.exit(0 if identiques == len(paires) else 2)
