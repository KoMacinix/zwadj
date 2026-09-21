import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

FICHIERS = ["AGENTS.md", "CLAUDE.md", "ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md"]
MOTIFS_FICHIER = sys.argv[1]


def aplatir(t):
    # Retire le balisage d'emphase et aplatit TOUS les blancs : ces fichiers sont
    # enveloppés à ~95 colonnes, une expression de quelques mots y est coupée.
    t = t.replace("**", "").replace("`", "").replace("~~", "")
    return re.sub(r"\s+", " ", t).lower()


def compter(texte, motif):
    return texte.count(aplatir(motif))


# --- calibration : 3 bras, l'outil abandonne si un seul manque ---
cal_pos_retour = aplatir("le lot de\n**CODE** des budgets")
cal_pos_accent = aplatir("⛔ **Ce qui reste SANS\nRANG**, et c'est")
cal_neg = aplatir("rien de tout cela ici")
bras = [
    ("positif, enjambe un retour à la ligne", compter(cal_pos_retour, "lot de CODE des budgets"), 1),
    ("positif, accents + balisage + retour", compter(cal_pos_accent, "reste SANS RANG"), 1),
    ("négatif", compter(cal_neg, "lot de CODE des budgets"), 0),
]
for nom, mesure, attendu in bras:
    print(f"calibration {nom} : {mesure} (attendu {attendu})")
    if mesure != attendu:
        print("ABANDON : la calibration a manqué un verdict")
        sys.exit(2)

motifs = [l.rstrip("\r\n") for l in open(MOTIFS_FICHIER, encoding="utf-8") if l.strip() and not l.startswith("#")]
textes = {}
car = 0
for f in FICHIERS:
    t = open(f, encoding="utf-8", newline="").read()
    car += len(t)
    textes[f] = aplatir(t)
print(f"parcouru : {len(FICHIERS)} fichiers, {car} caractères, {len(motifs)} motifs")
total = 0
zeros = []
for m in motifs:
    detail = {f: compter(textes[f], m) for f in FICHIERS}
    n = sum(detail.values())
    total += n
    if n == 0:
        zeros.append(m)
    print(f"  {n:4d}  « {m} »  " + " · ".join(f"{f}={v}" for f, v in detail.items() if v))
print(f"total : {total} occurrences")
print(f"motifs à ZÉRO ({len(zeros)}) — hypothèses à vérifier, pas absences constatées :")
for m in zeros:
    print(f"  - « {m} »")
