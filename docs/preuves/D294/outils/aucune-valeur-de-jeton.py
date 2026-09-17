"""Aucune VALEUR de jeton n'est entree au depot — controle de D294, complementaire de l'audit.

Usage, depuis la racine : python docs/preuves/D294/outils/aucune-valeur-de-jeton.py

POURQUOI IL EXISTE A COTE DE L'AUDIT DE SECRETS
  L'audit de D293 alerte sur le MOT « token= », donc il rougit sur de la prose et sur des motifs
  — 33 alertes a ce versement, aucune n'etant une valeur. C'est voulu : un audit large se TRIE,
  il ne se relache pas (D293). Mais un tri humain sur 33 lignes n'est pas une mesure. Ce controle
  repond a la seule question qui engage le depot : **une VALEUR de jeton est-elle entree ?**

FORME
  Un jeton reel est `token=` suivi d'au moins 20 caracteres de base64url. La prose (« 0 token=
  dans la sortie ») et les motifs (`token=`) ne matchent pas ; un jeton de 43 caracteres, si.

CALIBRATION, DEUX BRAS, REJOUEE A CHAQUE INVOCATION (D286)
  - positif : le journal e2e HORS DEPOT doit rendre exactement 24 — le compte que l'audit du
    16/09/2026 a releve, et qui est la raison d'etre de toute cette regle ;
  - negatif : ce script lui-meme doit rendre 0, alors qu'il contient le mot.
  ABANDON si un bras manque. ⚠ Si le journal a disparu, le script ABANDONNE plutot que de
  rendre un 0 rassurant sur un instrument non calibre : un 0 sans cas positif n'est pas une
  mesure, c'est un silence qui a la forme d'un resultat (D290).

CE QU'IL IMPRIME (D290)
  Le total ET ce qu'il a parcouru — fichiers ouverts et octets lus.
⛔ IL N'IMPRIME JAMAIS UNE VALEUR, meme masquee : il compte, il ne montre pas.
"""
import io
import os
import re
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")

if not os.path.isfile("pnpm-workspace.yaml"):
    sys.exit("ERREUR : a lancer depuis la racine du depot")

MOTIF = re.compile("token=[A-Za-z0-9_" + chr(92) + "-]{20,}")
JOURNAL = ".neutralisation-journaux/rang15-e2e.log"

if not os.path.exists(JOURNAL):
    sys.exit("ABANDON : cas positif absent (%s) — instrument non calibre, son 0 ne vaut rien"
             % JOURNAL)
positif = len(MOTIF.findall(io.open(JOURNAL, encoding="utf-8", errors="replace").read()))
negatif = len(MOTIF.findall(io.open(__file__, encoding="utf-8").read()))
print("== CALIBRATION")
print("   bras positif (journal e2e, hors depot) : %d (attendu 24)" % positif)
print("   bras negatif (ce script)               : %d (attendu 0)" % negatif)
if positif != 24 or negatif != 0:
    sys.exit("ABANDON : la calibration a manque un verdict — l'instrument n'est pas cru")
print("   => 2 bras sur 2\n")

total, fichiers, octets = 0, 0, 0
for racine, _, noms in os.walk("docs/preuves"):
    for nom in sorted(noms):
        chemin = os.path.join(racine, nom)
        fichiers += 1
        brut = open(chemin, "rb").read()
        octets += len(brut)
        combien = len(MOTIF.findall(brut.decode("utf-8", errors="replace")))
        if combien:
            total += combien
            print("   ⛔ %s : %d valeur(s)" % (chemin.replace(os.sep, "/"), combien))

print("== PARCOURU : %d fichiers, %d octets sous docs/preuves/" % (fichiers, octets))
print("== VALEURS DE JETON TROUVEES : %d (attendu 0)" % total)
if total:
    sys.exit("ABANDON : une valeur de jeton est entree au depot")
print("== ✓ aucune valeur de jeton sous docs/preuves/.")
