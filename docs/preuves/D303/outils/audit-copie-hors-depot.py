#!/usr/bin/env python3
"""AUDIT DE SECRETS D'UNE ARCHIVE, SUR UNE COPIE EXTRAITE HORS DU DÉPÔT — D303 (rang 23). Enveloppant, PAS un instrument.

Depuis la RACINE du monorepo :
    python3 docs/preuves/D303/outils/audit-copie-hors-depot.py <archive.zip> <sha256 attendu> <dossier HORS dépôt> \
        --sortie docs/preuves/D303/<nom>.txt

POURQUOI IL EXISTE. Ko : « passe l'audit de secrets sur une copie extraite HORS du dépôt : dans le dépôt, un zip lui
est opaque. Si l'instrument ne peut pas pointer ailleurs, dis-le. » ⇒ IL NE LE PEUT PAS, et c'est relevé, pas
supposé : `neutralisation/audit-secrets.py` (D298) n'a AUCUNE option de racine ; il parcourt `docs/preuves` RELATIF
AU DOSSIER COURANT (`os.walk(os.path.join("docs", "preuves"))`), exige `pnpm-workspace.yaml` dans ce dossier, et sa
calibration relit ses sorties épinglées à des chemins relatifs. Lancé ailleurs, il abandonne (bras « écho ») ; lancé
à la racine, il ne voit pas une copie hors du dépôt.
⛔ CE SCRIPT NE RETOUCHE PAS L'INSTRUMENT (D295 : un instrument se corrige avec sa pièce ou pas du tout ; D298 : c'est
lui qui fait foi). Il l'IMPORTE, tel quel, et en appelle les fonctions : `calibrer` (la calibration ENTIÈRE, tous
bras, cas réel compris quand il est sur le disque), `classer`, `compter`, `contextes_de`, `sceller`, `sceau_valide`.
Seul change ce qui est PARCOURU : les fichiers de la copie extraite, au lieu de `docs/preuves`.

EN PLUS DE L'INSTRUMENT, ET SÉPARÉ DE LUI — un contrôle de FORME de clé Chargily (`(test|live)_(pk|sk)_` suivi de
20 caractères alphanumériques ou plus). Motif : mesuré le 23/09/2026 (D303, `docs/preuves/D303/releves/`), les onze
motifs de l'instrument rendent 0 alerte sur les deux lignes qui portaient les clés au format Chargily dans
`apps/api/.env.example` (commits `dc63afb` et `d52c721`). Ce contrôle n'entre PAS dans le total de l'instrument : il
est imprimé à part, avec sa propre calibration à deux bras.

CE QU'IL FAIT, DANS L'ORDRE, ET IL ABANDONNE (code 2) AU PREMIER ÉCART :
  1. l'empreinte SHA-256 de l'archive est celle qu'on lui donne ;
  2. le dossier d'extraction est HORS du dépôt (chemin résolu, pas un nom) ; il est vidé puis rempli ;
  3. chaque entrée est extraite sous ce dossier et nulle part ailleurs (garde de chemin, « zip slip ») ; le nombre
     de fichiers extraits est celui de la liste de l'archive ;
  4. la calibration de l'instrument passe tous ses bras ; la calibration du contrôle Chargily passe ses deux bras ;
  5. audit : chaque fichier extrait passe par `classer` (même chemin de code que l'instrument), puis ses motifs.
SORTIE : scellée par la fonction de l'instrument, donc exclue de ses audits suivants tant que le sceau couvre ses
octets (D298) — elle récite des contextes MASQUÉS, et sans sceau elle se recompterait comme des alertes.
Codes : 0 = aucune alerte ; 1 = alertes (le tri est humain et se lit dans la sortie) ; 2 = ABANDON."""
import hashlib
import importlib.util
import os
import re
import shutil
import sys
import zipfile

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO (pnpm-workspace.yaml introuvable).")
    sys.exit(2)

args = sys.argv[1:]
sortie = None
if "--sortie" in args:
    i = args.index("--sortie")
    sortie = args[i + 1]
    args = args[:i] + args[i + 2:]
if len(args) != 3:
    print(__doc__.split("\n\n")[0]); sys.exit(2)
archive, sha_attendu, dossier = args

lignes = []


def dire(s=""):
    print(s, flush=True)
    lignes.append(s)


def abandon(raison):
    dire(f"ABANDON : {raison} — rien n'est audité")
    sys.exit(2)


spec = importlib.util.spec_from_file_location("audit_secrets_d298", "neutralisation/audit-secrets.py")
inst = importlib.util.module_from_spec(spec)
spec.loader.exec_module(inst)
empreinte_inst = hashlib.sha256(open("neutralisation/audit-secrets.py", "rb").read()).hexdigest()
dire(f"== INSTRUMENT IMPORTÉ, NON MODIFIÉ : neutralisation/audit-secrets.py sha256 {empreinte_inst} · motifs {len(inst.MOTIFS)}")

# 1. l'archive est celle qu'on croit
brut = open(archive, "rb").read()
sha = hashlib.sha256(brut).hexdigest()
dire(f"== ARCHIVE : {archive} · {len(brut)} octets · sha256 {sha} (attendu {sha_attendu})")
if sha != sha_attendu:
    abandon("empreinte de l'archive différente de l'attendue")

# 2. le dossier d'extraction est HORS du dépôt
racine = os.path.realpath(os.getcwd())
cible = os.path.realpath(dossier)
hors = os.path.commonpath([racine, cible]) != racine
dire(f"== EXTRACTION : {cible} · hors du dépôt : {hors} (attendu True)")
if not hors:
    abandon("le dossier d'extraction est DANS le dépôt")
if os.path.isdir(cible):
    shutil.rmtree(cible)
os.makedirs(cible)

# 3. extraction gardée
with zipfile.ZipFile(archive) as z:
    membres = [m for m in z.infolist() if not m.is_dir()]
    for m in membres:
        dest = os.path.realpath(os.path.join(cible, m.filename))
        if os.path.commonpath([cible, dest]) != cible:
            abandon(f"entrée hors du dossier d'extraction : {m.filename}")
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with z.open(m) as src, open(dest, "wb") as out:
            shutil.copyfileobj(src, out)
extraits = []
for base, dossiers, noms in os.walk(cible):
    dossiers.sort()
    for n in sorted(noms):
        extraits.append(os.path.join(base, n))
dire(f"   entrées-fichiers de l'archive : {len(membres)} · fichiers extraits relus sur le disque : {len(extraits)} (attendu {len(membres)})")
if len(extraits) != len(membres):
    abandon("le nombre de fichiers extraits ne correspond pas à la liste de l'archive")

# 4a. calibration de l'instrument, entière
dire("== CALIBRATION DE L'INSTRUMENT (sa fonction `calibrer`, tous bras)")
cal, manques, etat_reel = inst.calibrer(inst.CAS_REEL)
for l in cal:
    dire(l)
dire(f"   calibration : {sum(1 for l in cal if l.startswith('   ✓'))} bras passent sur {len(cal)} imprimés, {len(manques)} manqué(s) · cas réel : {etat_reel}")
if manques:
    abandon(f"un bras de la calibration de l'instrument manque son verdict ({', '.join(manques)})")

# 4b. calibration du contrôle de forme Chargily, deux bras — SÉPARÉ de l'instrument
FORME = re.compile(r"\b(?:test|live)_(?:pk|sk)_[A-Za-z0-9]{20,}")
pos = "cle : " + "te" + "st_s" + "k_" + ("Ab9" * 14)
neg = "CHARGILY_SECRET_KEY=  # " + "te" + "st_s" + "k_" + " seul ; sk_test_court hors format"
bp, bn = len(FORME.findall(pos)), len(FORME.findall(neg))
dire(f"== CALIBRATION DU CONTRÔLE CHARGILY (hors instrument) : bras positif {bp} (attendu 1) · bras négatif {bn} (attendu 0)")
if (bp, bn) != (1, 0):
    abandon("un bras du contrôle Chargily manque son verdict")

# 5. audit
pieces = [(os.path.relpath(p, cible).replace(os.sep, "/"), open(p, "rb").read()) for p in extraits]
audites, exclus, signales = inst.classer(pieces)
dire(f"== AUDIT : {len(pieces)} fichier(s) parcouru(s) · audités {len(audites)} · exclus {len(exclus)} (attendu 0 : aucune sortie épinglée ni scellée dans une archive tierce)")
for s in signales:
    dire("  " + s)
alertes = {c: 0 for c in inst.MOTIFS}
info, octets, contextes, formes = 0, 0, [], {}
for chemin, contenu in audites:
    octets += len(contenu)
    texte = contenu.decode("utf-8", errors="replace")
    marques = []
    for cle, motif in inst.MOTIFS.items():
        k = len(re.findall(motif, texte, flags=re.IGNORECASE))
        if k:
            alertes[cle] += k
            marques.append(f"ALERTE {cle}={k}")
            contextes += inst.contextes_de(chemin, texte, cle, motif)
    for cle, motif in inst.INFORMATIF.items():
        k = len(re.findall(motif, texte, flags=re.IGNORECASE))
        if k:
            info += k
            marques.append(f"{cle}={k}")
    f = len(FORME.findall(texte))
    if f:
        formes[chemin] = f
    if marques:
        dire(f"  {chemin:62s} {len(contenu):>8} o  {' · '.join(marques)}")
total = sum(alertes.values())
dire(f"  parcourus : {len(pieces)} fichiers, {sum(len(c) for _, c in pieces)} octets · audités : {len(audites)} fichiers, {octets} octets"
     f" · alertes : {total} (attendu 0) · chemin local (informatif) : {info}")
dire("  ventilation par motif : " + (" · ".join(f"{k}={v}" for k, v in alertes.items() if v) or "aucune"))
dire("  motifs à ZÉRO — des hypothèses à vérifier, jamais des absences constatées (D295) : "
     + (", ".join(k for k, v in alertes.items() if not v) or "aucun"))
dire(f"== CONTRÔLE CHARGILY (hors instrument) : fichiers porteurs {len(formes)} · jetons au format {sum(formes.values())} (attendu 0)"
     + (" · " + ", ".join(f"{c}={n}" for c, n in formes.items()) if formes else ""))
if contextes:
    dire("== CONTEXTE DES ALERTES, VALEURS MASQUÉES (fonction `contextes_de` de l'instrument) — le tri est humain (D275) ==")
    for c in contextes:
        dire(c)

if sortie:
    scelle = inst.sceller("\n".join(lignes) + "\n")
    os.makedirs(os.path.dirname(sortie) or ".", exist_ok=True)
    with open(sortie, "wb") as fh:
        fh.write(scelle)
    relu = open(sortie, "rb").read()
    print(f"sortie scellée : {sortie} ({len(relu)} octets) · relue identique : {relu == scelle} · sceau vérifié : {inst.sceau_valide(relu)}")
sys.exit(1 if (total or formes) else 0)
