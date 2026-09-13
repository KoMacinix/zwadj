"""Integrite des preuves versees et audit de secrets AVANT commit (regle des preuves, D291).

Usage, depuis la racine : python docs/preuves/D291/controles/integrite-et-secrets.py [dossier_source_D290]

A. INTEGRITE : si le dossier source de D290 est fourni et existe, chaque copie de docs/preuves/D290
   est confrontee a sa source par sha256. Rend le nombre parcouru et l'attendu.
B. AUDIT DE SECRETS, NON TRONQUE (D200) : tous les fichiers sous docs/preuves/ et .gitattributes.
   CALIBRATION A DEUX BRAS rejouee a chaque execution, ABANDON si un bras manque (D286) :
   chaque motif doit trouver EXACTEMENT une occurrence dans un echantillon positif construit a
   l'execution, et zero dans un echantillon propre.
   Les litteraux qui se detecteraient eux-memes dans ce fichier (en-tete de cle, prefixe de
   secret Google, nom du compte local...) sont ASSEMBLES A L'EXECUTION : sinon l'audit se
   trouverait dans sa propre source, comme le cas connu du delai a compte son propre commentaire.
   « chemin local » est INFORMATIF : il est rapporte, il ne compte pas comme alerte.
"""
import hashlib
import os
import re
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")

if not os.path.isfile("pnpm-workspace.yaml"):
    sys.exit("ERREUR : a lancer depuis la racine du depot")

TIRETS = "-" * 5
# ⚠ LES CLES NE NOMMENT PAS CE QU'ELLES CHERCHENT, et c'est un correctif MESURE (13/09/2026) : la
# premiere execution a rendu 12 alertes, toutes dans cette source — une cle « nom-du-motif »
# suivie de deux-points satisfait le motif qu'elle nomme, et la ligne de resume aussi.
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

# --- calibration : un positif par motif, construit a l'execution ---
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
propre = "Tests 287 passed (287) Duration 18.65s node C:/depot/apps/client"
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

# --- A. integrite des copies de D290 ---
source = sys.argv[1] if len(sys.argv) > 1 else ""
d290 = os.path.join("docs", "preuves", "D290")
relatifs = ["r13-client-1.csv", "r13-racine-1.csv", "r13-client-x3.csv", "passes_secteur.ps1"] + [
    f"passes/client-secteur-{i}.log" for i in range(1, 6)]
if source and os.path.isdir(source):
    origines = {r: os.path.join(".neutralisation-journaux", r) if r.startswith("r13-") else os.path.join(source, r)
                for r in relatifs}
    identiques = 0
    print("== A. INTEGRITE DES COPIES DE D290 ==")
    for r in relatifs:
        a = hashlib.sha256(open(origines[r], "rb").read()).hexdigest()
        b = hashlib.sha256(open(os.path.join(d290, r), "rb").read()).hexdigest()
        identiques += a == b
        print(f"  {'✓' if a == b else '✗'} {r:30s} {b}")
    print(f"  copies identiques a leur source : {identiques} sur {len(relatifs)} parcourues (attendu {len(relatifs)})")
else:
    print("== A. INTEGRITE : dossier source non fourni ou absent — NON VERIFIEE dans cette execution")

# --- B. audit de secrets, non tronque ---
# ⚠ SEULE EXCLUSION, DECLAREE ET COMPTEE : les sorties de CET audit. Elles ne recopient aucun contenu
# audite (noms de fichiers, tailles, comptes), mais la sortie de la premiere execution porte les
# noms des motifs qui se sont detectes eux-memes, et se detecterait a nouveau.
fichiers, exclus = [".gitattributes"], []
for base, _, noms in os.walk(os.path.join("docs", "preuves")):
    for n in sorted(noms):
        chemin = os.path.join(base, n)
        if n.startswith("integrite-et-secrets-") and n.endswith(".txt"):
            exclus.append(chemin)
        else:
            fichiers.append(chemin)
print(f"== EXCLUS (sorties de cet audit) : {len(exclus)} fichier(s)")
alertes, info, octets = 0, 0, 0
print(f"== B. AUDIT DE SECRETS : {len(fichiers)} fichiers ==")
for f in sorted(fichiers):
    texte = open(f, "rb").read()
    octets += len(texte)
    t = texte.decode("utf-8", errors="replace")
    ligne = []
    for cle, motif in MOTIFS.items():
        n = len(re.findall(motif, t, flags=re.IGNORECASE))
        if n:
            alertes += n
            ligne.append(f"ALERTE {cle}={n}")
    for cle, motif in INFORMATIF.items():
        n = len(re.findall(motif, t, flags=re.IGNORECASE))
        if n:
            info += n
            ligne.append(f"{cle}={n}")
    print(f"  {f.replace(os.sep, '/'):58s} {len(texte):>7} o  {' · '.join(ligne)}")
print(f"  parcourus : {len(fichiers)} fichiers, {octets} octets · alertes : {alertes} (attendu 0) · "
      f"chemin local (informatif) : {info}")
sys.exit(1 if alertes else 0)
