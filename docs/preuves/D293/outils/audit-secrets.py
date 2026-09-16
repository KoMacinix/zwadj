"""Audit de secrets NON TRONQUE sur tout ce qui est verse sous docs/preuves/ (D200, regle des preuves D291).

Usage, depuis la racine : python docs/preuves/D293/outils/audit-secrets.py

POURQUOI IL EXISTE A PART : l'audit de l'etape 0 vit dans `versement-d288/verser-et-confronter.py`, qui
COPIE et CONFRONTE les journaux de D288 ; apres la passe du rang 15, le dossier de travail porte d'autres
journaux et ce script-la ne se rejoue plus (sa garde abandonne plutot que d'ecraser une preuve). Cet
instrument-ci ne fait QUE l'audit, donc il se rejoue a chaque versement.
⚠ INSTRUMENT CONCURRENT ECARTE, et sur quelle mesure : ajouter un drapeau `--audit-seul` au script de
l'etape 0 aurait mis DEUX chemins dans une procedure deja archivee comme piece — « deux endroits ou se
tromper » (D128). Les motifs sont ceux de l'audit archive de D291, repris ici et CALIBRES a chaque
execution : la calibration ne s'herite pas (D286).

MOTIFS assembles a l'execution pour ne pas se detecter eux-memes (leçon D291 : l'audit s'etait trouve
dans sa propre source). « chemin local » est INFORMATIF : rapporte, jamais compte comme alerte.
CALIBRATION A DEUX BRAS, ABANDON si un bras manque : chaque motif trouve EXACTEMENT une occurrence dans
un echantillon positif construit a l'execution, et ZERO dans un echantillon propre.
SORTIE : par fichier, taille et marques ; en fin, fichiers et octets PARCOURUS, alertes et attendu (D290),
et le CONTEXTE de chaque alerte, valeur masquee, avec le nombre de fichiers suivis hors preuves qui la
portent deja — le tri est humain et se lit dans la sortie versee (D275).
SEULE EXCLUSION DECLAREE : les sorties de CET audit (`audit-secrets*.txt` de ce dossier).
"""
import os
import re
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")

if not os.path.isfile("pnpm-workspace.yaml"):
    sys.exit("ERREUR : a lancer depuis la racine du depot")

TIRETS = "-" * 5
MOTIFS = {
    "url-avec-identifiants": r"[a-z][a-z0-9+.-]*://[^\s:/@]+:[^\s@]+@",
    "mot-de-passe": r"pass(word|wd)\s*[\"']?\s*[:=]",
    "valeur-nommee-secrete": r"secret\s*[\"']?\s*[:=]",
    "jeton": r"(access|refresh|id|api)?_?token\s*[\"']?\s*[:=]",
    "jwt": r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.",
    "porteur": r"bearer\s+[A-Za-z0-9._~+/-]{16,}",
    "cle-privee": re.escape(TIRETS + "BEG" + "IN"),
    "google-client": re.escape("GOC" + "SPX-"),
    "aws": r"AKIA[0-9A-Z]{16}",
    "cle-api": r"api[_-]?key\s*[\"']?\s*[:=]",
    "chargily": "char" + "gily" + r"[^\n]{0,40}(k" + "ey|sec" + "ret)",
}
INFORMATIF = {"chemin-local": "ben" + "la"}
positifs = {
    "url-avec-identifiants": "post" + "gresql://u" + "ser:mo" + "tdepasse@hote/base",
    "mot-de-passe": "pass" + "word = x",
    "valeur-nommee-secrete": "sec" + "ret: x",
    "jeton": "access_" + "tok" + "en = x",
    "jwt": "ey" + "J" + "a" * 12 + "." + "b" * 12 + ".c",
    "porteur": "Bear" + "er " + "Z" * 20,
    "cle-privee": TIRETS + "BEG" + "IN RSA",
    "google-client": "GOC" + "SPX-abc",
    "aws": "AK" + "IA" + "A" * 16,
    "cle-api": "api" + "_key: x",
    "chargily": "char" + "gily k" + "ey",
}
propre = "✓ S11b-11. L'ÉCRÊTAGE S'INVERSE — `min` devient `max`  [echeances]"
manques = []
for cle, motif in MOTIFS.items():
    n_pos = len(re.findall(motif, positifs[cle], flags=re.IGNORECASE))
    n_neg = len(re.findall(motif, propre, flags=re.IGNORECASE))
    if n_pos != 1 or n_neg != 0:
        manques.append(f"{cle} (positif {n_pos}, attendu 1 ; negatif {n_neg}, attendu 0)")
print(f"== CALIBRATION : {len(MOTIFS)} motifs, {len(MOTIFS) - len(manques)} passent leurs deux bras (attendu {len(MOTIFS)})")
if manques:
    print("\n".join("  MANQUE : " + m for m in manques))
    sys.exit("ABANDON : un bras de la calibration manque son verdict")

ICI = os.path.join("docs", "preuves", "D293", "outils")
fichiers, exclus = [".gitattributes"], []
for base, _, noms in os.walk(os.path.join("docs", "preuves")):
    for n in sorted(noms):
        chemin = os.path.join(base, n)
        if os.path.normpath(base) == os.path.normpath(ICI) and n.startswith("audit-secrets") and n.endswith(".txt"):
            exclus.append(chemin)
        else:
            fichiers.append(chemin)
print(f"== EXCLUS (sorties de cet audit) : {len(exclus)} fichier(s)")

contextes = []


def contexte(f, t, cle, motif):
    for no, ligne in enumerate(t.split("\n"), 1):
        for m in re.finditer(motif, ligne, flags=re.IGNORECASE):
            if motif.endswith("[:=]"):
                suite = re.match(r"\s*[\"']?([^\s\"',}]*)", ligne[m.end():])
                debut, valeur = m.end() + suite.start(1), suite.group(1)
            else:
                debut, valeur = m.start(), m.group(0)
            masque = ligne[:debut] + f"<{len(valeur)} car. masques>" + ligne[debut + len(valeur):]
            suivis = "valeur trop courte pour une recherche"
            if len(valeur) >= 3:
                r = subprocess.run(["git", "grep", "-l", "-F", "--", valeur], capture_output=True, text=True, encoding="utf-8")
                hors = [x for x in r.stdout.splitlines() if not x.startswith("docs/preuves/")]
                suivis = f"valeur deja presente dans {len(hors)} fichier(s) suivi(s) hors preuves"
            contextes.append(f"  [{cle}] {f.replace(os.sep, '/')}:{no} : {masque.strip()[:200]}\n      -> {suivis}")


alertes = info = octets = 0
print(f"== AUDIT : {len(fichiers)} fichiers ==")
for f in sorted(fichiers):
    brut = open(f, "rb").read()
    octets += len(brut)
    t = brut.decode("utf-8", errors="replace")
    marques = []
    for cle, motif in MOTIFS.items():
        k = len(re.findall(motif, t, flags=re.IGNORECASE))
        if k:
            alertes += k
            marques.append(f"ALERTE {cle}={k}")
            contexte(f, t, cle, motif)
    for cle, motif in INFORMATIF.items():
        k = len(re.findall(motif, t, flags=re.IGNORECASE))
        if k:
            info += k
            marques.append(f"{cle}={k}")
    if marques:
        print(f"  {f.replace(os.sep, '/'):62s} {len(brut):>8} o  {' · '.join(marques)}")
print(f"  parcourus : {len(fichiers)} fichiers, {octets} octets · alertes : {alertes} (attendu 0) · "
      f"chemin local (informatif) : {info}")
if contextes:
    print("== CONTEXTE DES ALERTES, VALEURS MASQUEES — le tri est humain et se lit ici (D275) ==")
    print("\n".join(contextes))
sys.exit(1 if alertes else 0)
