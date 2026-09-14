"""Etape 0 du rang 15 (D293) : verser les 26 journaux de campagne attribues a D288, et CONFRONTER ce
rattachement au texte de D288 AVANT de l'ecrire comme un fait.

Usage, depuis la racine : python docs/preuves/D293/versement-d288/verser-et-confronter.py

POURQUOI : `lancer-campagnes.py --tout` rouvre chaque `neutralize-*.py.log` en "w". La certification du
rang 15 lance `--tout` : sans versement prealable, la piece de la certification D288 disparait.
⚠ Le rattachement de ces journaux a D288 est une INFERENCE par nom et par heure (backlog, reports de
D291). Cette procedure le confronte a ce que D288 ECRIT ; elle ne le prouve pas.

A. INVENTAIRE ET COPIE OCTET POUR OCTET (sha256 source = copie ; source inchangee apres copie ;
   une copie existante et differente fait ABANDONNER : une preuve ne s'ecrase pas).
B. CONFRONTATION au texte de D288 (ZWADJ_CONTINUITE.md, section D288, « LES CAMPAGNES — 195 GARDES ») :
   - la regle de comptage est celle du lanceur TEL QU'IL ETAIT a c2ac531 (arbre de D288), relue
     dans git, jamais recopiee de memoire ;
   - calibration a deux bras sur des cas synthetiques, et sur deux journaux dont la reponse a ete
     lue dans la sortie brute avant d'ecrire ce script (s11b : 9/0/4 ; 404 : 12/0/0) ; ABANDON si un
     cas manque son verdict (D286) ;
   - chaque compte imprime ce qu'il a PARCOURU et son ATTENDU sur la meme ligne (D290).
C. AUDIT DE SECRETS NON TRONQUE (D200) sur docs/preuves/D288 et docs/preuves/D293, et .gitattributes.
   Motifs : ceux de l'audit archive de D291 (docs/preuves/D291/controles/integrite-et-secrets.py),
   ASSEMBLES A L'EXECUTION pour ne pas se detecter eux-memes. ⚠ La calibration n'est PAS heritee :
   elle se rejoue ici, deux bras, abandon si un bras manque. Seule exclusion declaree : les sorties
   de ce script (`*.txt` de ce dossier), qui ne recopient aucun contenu audite.
"""
import datetime
import hashlib
import io
import os
import re
import shutil
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")

if not os.path.isfile("pnpm-workspace.yaml"):
    sys.exit("ERREUR : a lancer depuis la racine du depot")

SOURCE = ".neutralisation-journaux"
DEST = os.path.join("docs", "preuves", "D288", "campagnes")
ICI = os.path.join("docs", "preuves", "D293", "versement-d288")
COMMIT_D288 = "c2ac531"
ATTENDU_N = 26  # « 26 campagnes » — texte de D288


def sha(chemin):
    return hashlib.sha256(open(chemin, "rb").read()).hexdigest()


def git(*args):
    r = subprocess.run(["git", *args], capture_output=True, text=True, encoding="utf-8")
    if r.returncode != 0:
        sys.exit(f"ABANDON : git {' '.join(args)} a rendu {r.returncode} : {r.stderr.strip()}")
    return r.stdout


# ============================================================================ A
print("== A. INVENTAIRE ET COPIE OCTET POUR OCTET ==")
noms = sorted(n for n in os.listdir(SOURCE) if n.startswith("neutralize-") and n.endswith(".py.log"))
print(f"  journaux examines dans {SOURCE}/ : {len(noms)} (attendu {ATTENDU_N})")
if len(noms) != ATTENDU_N:
    sys.exit("ABANDON : le nombre de journaux n'est pas celui de l'arbitrage")

os.makedirs(DEST, exist_ok=True)
inventaire = []
identiques = 0
for n in noms:
    src = os.path.join(SOURCE, n)
    dst = os.path.join(DEST, n)
    st = os.stat(src)
    mtime = datetime.datetime.fromtimestamp(st.st_mtime)
    h_src = sha(src)
    if os.path.exists(dst):
        if sha(dst) != h_src:
            sys.exit(f"ABANDON : {dst} existe et differe de sa source — une preuve ne s'ecrase pas")
        etat = "deja-verse"
    else:
        shutil.copyfile(src, dst)
        etat = "copie"
    st2 = os.stat(src)
    h_dst = sha(dst)
    ok = h_dst == h_src and sha(src) == h_src and st2.st_mtime == st.st_mtime
    identiques += ok
    inventaire.append((n, mtime, st.st_size))
    print(f"  {'✓' if ok else '✗'} {n:38s} {mtime:%Y-%m-%d %H:%M:%S}  {st.st_size:>5} o  {h_dst}  {etat}")
print(f"  copies identiques a leur source, source inchangee : {identiques} sur {len(noms)} parcourues (attendu {ATTENDU_N})")
if identiques != ATTENDU_N:
    sys.exit("ABANDON : integrite non etablie")

# ============================================================================ B
print()
print("== B. CONFRONTATION AU TEXTE DE D288 ==")
lanceur = git("show", f"{COMMIT_D288}:neutralisation/lancer-campagnes.py")
REGLES = {
    "mordues": 'mordues = len([l for l in sortie.splitlines() if l.startswith("✓ ") and "vol" not in l])',
    "muettes": 'muettes = len([l for l in sortie.splitlines() if l.startswith("✗ ")])',
    "non_mes": 'non_mes = len([l for l in sortie.splitlines() if "NON MESUR" in l and ":" in l])',
}
vues = {k: lanceur.count(v) for k, v in REGLES.items()}
print(f"  regles relues dans {COMMIT_D288}:neutralisation/lancer-campagnes.py : "
      + " · ".join(f"{k} {v} occurrence(s) (attendu 1)" for k, v in vues.items()))
if any(v != 1 for v in vues.values()):
    sys.exit("ABANDON : la regle de comptage du lanceur de D288 n'est pas celle que ce script applique")
ecart_lanceur = subprocess.run(["git", "diff", "--quiet", COMMIT_D288, "HEAD", "--", "neutralisation/"]).returncode
print(f"  neutralisation/ entre {COMMIT_D288} et HEAD : {'INCHANGE' if ecart_lanceur == 0 else 'MODIFIE'} (attendu INCHANGE)")


def compter(texte):
    lignes = texte.splitlines()
    return (len(lignes),
            len([l for l in lignes if l.startswith("✓ ") and "vol" not in l]),
            len([l for l in lignes if l.startswith("✗ ")]),
            len([l for l in lignes if "NON MESUR" in l and ":" in l]))


cas = [
    ("synthetique positif", "✓ A\n✓ Pré-vol : 2 mesure(s)\n✗ B\n⚠ C\n   NON MESURÉE.\n  NON MESURÉE : C (hors exécution : x)\n", (1, 1, 1)),
    ("synthetique negatif", "rien\n  ✓ indente\nNON MESUREE sans deux-points\n⚠ D\n", (0, 0, 0)),
    ("reel lu brut : s11b", io.open(os.path.join(DEST, "neutralize-s11b.py.log"), encoding="utf-8").read(), (9, 0, 4)),
    ("reel lu brut : 404", io.open(os.path.join(DEST, "neutralize-404.py.log"), encoding="utf-8").read(), (12, 0, 0)),
]
rates = 0
for nom, texte, attendu in cas:
    vu = compter(texte)[1:]
    rates += vu != attendu
    print(f"  calibration {nom:22s} : {vu} (attendu {attendu}) {'✓' if vu == attendu else '✗'}")
if rates:
    sys.exit("ABANDON : un cas de calibration manque son verdict")

# Attendus : texte de D288. Les trois campagnes gardees derriere --int y sont chiffrees une a une ;
# les 23 autres ne le sont qu'en total (182 - 3 - 9 - 2 = 168 mordues, 0 non mesuree).
PAR_CAMPAGNE = {"neutralize-e3d1-s8.py": (3, 0, 5), "neutralize-s11b.py": (9, 0, 4), "neutralize-solid-s6.py": (2, 0, 4)}
T_MORD, T_MUET, T_NONM = 182, 0, 13
MORDUES_RE = re.compile(r"(\d+) garde\(s\) mordue\(s\) sur (\d+) cible")
ROUGES_RE = re.compile(r"(\d+) garde\(s\) neutralis..e\(s\) et ROUGE\(s\)")

tm = tu = tn = tl = 0
autres_mord = autres_nonm = 0
desaccords = 0
erreurs_script = 0
print(f"  {'campagne':26s} {'lignes':>6s} {'mord':>5s} {'muet':>5s} {'nonm':>5s} {'decl':>5s}  attendu (texte de D288)")
for n, _, _ in inventaire:
    texte = io.open(os.path.join(DEST, n), encoding="utf-8").read()
    lignes, mord, muet, nonm = compter(texte)
    m = MORDUES_RE.search(texte) or ROUGES_RE.search(texte)
    decl = m.group(1) if m else "—"
    erreurs_script += texte.count("ERREUR DE SCRIPT")
    campagne = n[:-len(".log")]
    if campagne in PAR_CAMPAGNE:
        att = PAR_CAMPAGNE[campagne]
        ok = (mord, muet, nonm) == att
        desaccords += not ok
        attendu = f"{att[0]} mord · {att[1]} muet · {att[2]} nonm {'✓' if ok else '✗'}"
    else:
        autres_mord += mord
        autres_nonm += nonm
        ok = muet == 0 and nonm == 0
        desaccords += not ok
        attendu = f"0 muet · 0 nonm {'✓' if ok else '✗'} (mordues : total seulement)"
    tl, tm, tu, tn = tl + lignes, tm + mord, tu + muet, tn + nonm
    print(f"  {campagne:26s} {lignes:>6d} {mord:>5d} {muet:>5d} {nonm:>5d} {decl:>5s}  {attendu}")
print(f"  lignes parcourues : {tl} sur {len(inventaire)} journaux")
print(f"  23 campagnes non chiffrees une a une : {autres_mord} mordues (attendu 168) · {autres_nonm} non mesurees (attendu 0)")
print(f"  TOTAL : {tm} mordues (attendu {T_MORD}) · {tu} muettes (attendu {T_MUET}) · {tn} non mesurees (attendu {T_NONM})")
print(f"  « ERREUR DE SCRIPT » : {erreurs_script} occurrence(s) (attendu 0)")
concorde_comptes = (tm, tu, tn) == (T_MORD, T_MUET, T_NONM) and desaccords == 0 and autres_mord == 168 and erreurs_script == 0

# Noms : les 26 journaux contre les 26 harnais de l'arbre de D288.
harnais = sorted(os.path.basename(p) for p in git("ls-tree", "--name-only", COMMIT_D288, "neutralisation/").split()
                 if os.path.basename(p).startswith("neutralize-") and p.endswith(".py"))
journaux = [n[:-len(".log")] for n, _, _ in inventaire]
print(f"  harnais neutralize-*.py a {COMMIT_D288} : {len(harnais)} (attendu {ATTENDU_N}) · "
      f"sans journal : {len(set(harnais) - set(journaux))} (attendu 0) · journal sans harnais : {len(set(journaux) - set(harnais))} (attendu 0)")
concorde_noms = harnais == journaux

# Heures : fenetre de l'echantillonneur ECRITE par D288, pas relue dans un fichier non verse.
f0 = datetime.datetime(2026, 9, 12, 0, 41, 9)
f1 = datetime.datetime(2026, 9, 12, 1, 34, 58)
dedans = sum(1 for _, t, _ in inventaire if f0 <= t <= f1)
print(f"  dates de modification dans la fenetre ecrite par D288 ({f0:%H:%M:%S} -> {f1:%H:%M:%S}) : {dedans} sur {len(inventaire)} (attendu {ATTENDU_N})")
ordre_mtime = [n for n, _, _ in sorted(inventaire, key=lambda x: x[1])]
ordre_jeu = [n for n, _, _ in inventaire]  # sorted(glob) : l'ordre de jeu du lanceur
meme_ordre = ordre_mtime == ordre_jeu
print(f"  ordre des dates de modification = ordre de jeu du lanceur (tri alphabetique) : {'OUI' if meme_ordre else 'NON'} (attendu OUI)")
premier, dernier = min(t for _, t, _ in inventaire), max(t for _, t, _ in inventaire)
etendue = (dernier - premier).total_seconds()
print(f"  premier -> dernier : {premier:%H:%M:%S} -> {dernier:%H:%M:%S}, {etendue:.0f} s ; D288 ecrit 1 944 s pour les 26 "
      f"-> {'compatible' if etendue <= 1944 else 'INCOMPATIBLE'} (l'etendue exclut la duree de la premiere campagne)")
apres = sorted((datetime.datetime.fromtimestamp(os.stat(os.path.join(SOURCE, x)).st_mtime), x)
               for x in os.listdir(SOURCE) if os.path.isfile(os.path.join(SOURCE, x)))
apres = [(t, x) for t, x in apres if dernier < t <= f1]
print(f"  fichiers de {SOURCE}/ modifies apres le dernier journal et avant la fin de fenetre : "
      + (", ".join(f"{x} ({t:%H:%M:%S})" for t, x in apres) or "aucun"))

print()
if concorde_comptes and concorde_noms and dedans == ATTENDU_N and meme_ordre and etendue <= 1944:
    print("VERDICT B : CONCORDANT — comptes, noms, fenetre et ordre de jeu concordent avec le texte de D288.")
    print("  ⚠ Ce n'est PAS une preuve d'origine : aucune piece ne lie ces fichiers au processus de D288.")
    print("  ⚠ NON CONFRONTABLE ICI : le total certifiant 195 (les +13 des trois rejeux --int ne sont dans aucun")
    print("    de ces journaux : le lanceur ne passe pas --int), la duree 1 944 s, et le code de sortie 1.")
else:
    print("VERDICT B : NON CONCORDANT — provenance a declarer INCERTAINE.")

# ============================================================================ C
print()
print("== C. AUDIT DE SECRETS, NON TRONQUE ==")
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
print(f"  calibration : {len(MOTIFS)} motifs, {len(MOTIFS) - len(manques)} passent leurs deux bras (attendu {len(MOTIFS)})")
if manques:
    print("\n".join("  MANQUE : " + m for m in manques))
    sys.exit("ABANDON : un bras de la calibration manque son verdict")

fichiers, exclus = [".gitattributes"], []
for racine in (os.path.join("docs", "preuves", "D288"), os.path.join("docs", "preuves", "D293")):
    for base, _, ns in os.walk(racine):
        for x in sorted(ns):
            chemin = os.path.join(base, x)
            # ⚠ CORRIGE LE 14/09/2026 : la regle etait « tout .txt de ce dossier », et elle a exclu 4 fichiers
            # dont 2 sorties d'AUTRES controles (gitattributes-controle.txt, verifier-decl.txt). La sortie
            # fautive est gardee : verser-et-confronter-avant-commit.txt.
            if os.path.normpath(base) == os.path.normpath(ICI) and x.startswith("verser-et-confronter") and x.endswith(".txt"):
                exclus.append(chemin)
            else:
                fichiers.append(chemin)
print(f"  exclus (sorties de ce script) : {len(exclus)} fichier(s)")
alertes = info = octets = 0
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
            for no, ligne in enumerate(t.split("\n"), 1):
                for mm in re.finditer(motif, ligne, flags=re.IGNORECASE):
                    marques.append(f"\n      contexte l.{no}, valeur masquee : {ligne[:mm.start()].strip()[-80:]} <{len(mm.group(0))} car.>")
    for cle, motif in INFORMATIF.items():
        k = len(re.findall(motif, t, flags=re.IGNORECASE))
        if k:
            info += k
            marques.append(f"{cle}={k}")
    print(f"  {f.replace(os.sep, '/'):60s} {len(brut):>6} o  {' · '.join(marques)}")
print(f"  parcourus : {len(fichiers)} fichiers, {octets} octets · alertes : {alertes} (attendu 0) · chemin local (informatif) : {info}")
sys.exit(1 if alertes else 0)
