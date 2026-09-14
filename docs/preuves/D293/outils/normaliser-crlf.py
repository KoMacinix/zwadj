"""Normalise en CRLF les fichiers d'autorite edites dans la session D293, et REND ce qu'il a parcouru.

Usage, depuis la racine : python docs/preuves/D293/outils/normaliser-crlf.py FICHIER [FICHIER...]

POURQUOI : l'outil d'edition insere des LF nus dans un fichier CRLF (AGENTS.md, campagne SOLID/Strategy).
Ce script convertit tout LF nu en CRLF, sans toucher un CRLF existant, et imprime pour chaque fichier :
octets, CRLF et LF nus AVANT, puis APRES, avec l'attendu (LF nus 0) sur la meme ligne (D290).
CALIBRATION A DEUX BRAS, rejouee a chaque execution, ABANDON si un bras manque (D286) :
  positif  : b"a\\nb\\r\\nc\\n"  -> b"a\\r\\nb\\r\\nc\\r\\n" (2 LF nus convertis) ;
  negatif  : b"a\\r\\nb\\r\\n"   -> octets IDENTIQUES (0 conversion).
Pourquoi il vit ici et pas dans le scratchpad : D288 et D291 ont laisse le leur hors depot, et l'ont
declare comme ecart. Verse comme piece de procedure (docs/preuves/), il n'est pas promu en instrument.
"""
import re
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")


def normaliser(b):
    return re.sub(rb"(?<!\r)\n", b"\r\n", b)


def compte(b):
    crlf = b.count(b"\r\n")
    return crlf, b.count(b"\n") - crlf


cas = [("positif", b"a\nb\r\nc\n", b"a\r\nb\r\nc\r\n"), ("negatif", b"a\r\nb\r\n", b"a\r\nb\r\n")]
for nom, entree, attendu in cas:
    vu = normaliser(entree)
    print(f"calibration {nom} : {'✓' if vu == attendu else '✗'} ({vu!r}, attendu {attendu!r})")
    if vu != attendu:
        sys.exit("ABANDON : un bras de la calibration manque son verdict")

if len(sys.argv) < 2:
    sys.exit("ABANDON : aucun fichier donne")
for f in sys.argv[1:]:
    avant = open(f, "rb").read()
    apres = normaliser(avant)
    c0, n0 = compte(avant)
    c1, n1 = compte(apres)
    if apres != avant:
        open(f, "wb").write(apres)
    relu = open(f, "rb").read()
    c2, n2 = compte(relu)
    print(f"{f} : avant {len(avant)} o, CRLF {c0}, LF nus {n0} -> relu {len(relu)} o, CRLF {c2}, LF nus {n2} (attendu 0)"
          f" · lignes parcourues {c2 + n2}")
    if n2 != 0:
        sys.exit(f"ABANDON : {f} porte encore {n2} LF nu(s)")
