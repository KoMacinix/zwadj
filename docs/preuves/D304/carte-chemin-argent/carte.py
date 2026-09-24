"""D304 — LA CARTE de la règle « chemin de l'argent » (décision 3 du relecteur, chat, déléguée
par Ko le 24/09/2026) vers des FICHIERS. ⛔ PIÈCE DATÉE, PAS UNE AUTORITÉ : la règle vit dans
`AGENTS.md` et `ZWADJ_CONTINUITE.md` ; cette carte en est une lecture mécanique à `HEAD`, qui se
périme au premier lot qui ajoute un fichier. En cas de doute, la session demande au relecteur.

Depuis la racine :   python3 docs/preuves/D304/carte-chemin-argent/carte.py

LA RÈGLE (décision 3), et la sonde qui en lit chaque branche :
  (1) code ou contrainte SQL qui CALCULE, ARRONDIT ou VALIDE un montant
      M1 arithmétique sur un identifiant de montant (…Cents, …Bps)       — code
      M2 arrondi (Math.round/floor/ceil/trunc) DANS un fichier qui nomme un montant
      M3 validation Zod d'un montant (`…Cents: z.` / `…Bps: z.`)
      M4 comparaison d'un montant (`<`, `>`, `<=`, `>=` contre …Cents/…Bps)
      S1 contrainte SQL (CHECK) sur une colonne `_cents` ou `_bps`       — migrations
  (2) transition de réservation ou de devis (send, revise, convert, accept, decline, cancel,
      expire) : T1 symboles des tableaux et des ports de transition
  (3) le paiement (E3) : P1 `apps/api/src/payments/`, P2 migrations qui nomment `payments`
  (4) les harnais qui prouvent les gardes de (1) à (3) : H1 chemin littéral d'un fichier de
      (1)-(3) dans `neutralisation/neutralize-*.py` — MÊME motif que D303
      (`fichiers-mutes-par-harnais.py`), pour que les deux relevés comptent la même chose.
  Exclu par la règle : un affichage qui FORMATE un montant reçu. Inclus : un aperçu qui
  RECALCULE une règle du serveur (A3) — c'est M1/M2/M4 côté navigateur, à trier à la main.

⚠ UNE SONDE REND DES CANDIDATS, PAS UN VERDICT : « transporte un montant » et « calcule un
montant » ne se séparent pas par une expression régulière. Le TRI, écrit à la main, est dans
`tri.txt` à côté ; il cite la ligne d'évidence que ce script imprime.
⚠ Imprime le corpus parcouru, la ventilation par sonde et les sondes à zéro (D290, D295).
⚠ CALIBRATION À DEUX BRAS : `booking-charge.ts` doit sortir en (1) (module de chiffrage, D279) ;
`apps/client/src/lib/format.ts` s'il existe — sinon le premier fichier de formatage relevé —
ne doit sortir d'AUCUNE branche ; `booking-locks.prisma.ts` doit sortir en (2). Un bras manqué
⇒ ABANDON.

⛔ DÉFAUT D'INSTRUMENT DE LA PREMIÈRE PASSE, À MON COMPTE (règle de D298 : recalibrer, rejouer
EN ENTIER, écrire le défaut). Sortie brute de la première passe, recopiée telle quelle :
  « calibration (1) booking-charge.ts : OK · (2) booking-locks.prisma.ts : OK · négatif
    packages/i18n/src/format.ts hors carte : MANQUÉ » puis « ABANDON : calibration manquée ».
Cause, relue dans le fichier : `formatDZD` fait `amountCents / 100` — une CONVERSION D'UNITÉ
pour l'affichage, que la règle exclut (« un affichage qui formate un montant reçu »), et que M1
prenait pour un calcul. ⇒ M1 ignore désormais une division ou une multiplication par le
littéral 100 (centimes ↔ dinars). Ce qui sort ainsi de (1) : les conversions d'affichage et de
paramètre d'URL ; la conversion de `chargily.gateway.ts` (D195) reste sur la carte par (3).
"""
import os
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    sys.exit("à lancer depuis la racine du dépôt")

suivis = subprocess.run(["git", "ls-files"], capture_output=True, text=True, encoding="utf-8").stdout.splitlines()
head = subprocess.run(["git", "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip()


def est_code(p: str) -> bool:
    if not re.match(r"(apps/(api|client|pro)/src|packages/[^/]+/src)/", p):
        return False
    if "/generated/" in p or "__fixtures__" in p or "test-support" in p:
        return False
    if re.search(r"\.(spec|test)\.tsx?$|\.int-spec\.ts$", p):
        return False
    return p.endswith((".ts", ".tsx"))


code = [p for p in suivis if est_code(p)]
migrations = [p for p in suivis if re.match(r"apps/api/prisma/migrations/.+/migration\.sql$", p)]
harnais = [p for p in suivis if re.match(r"neutralisation/neutralize-.+\.py$", p)]
print(f"HEAD {head} · corpus : {len(code)} fichiers de code (hors tests, générés, doubles), "
      f"{len(migrations)} migrations, {len(harnais)} harnais")


def sans_commentaires_ts(t: str) -> str:
    t = re.sub(r"/\*[\s\S]*?\*/", " ", t)
    return re.sub(r"(?<![:\"'`])//[^\n]*", " ", t)


def sans_commentaires_sql(t: str) -> str:
    return re.sub(r"--[^\n]*", " ", t)


MONTANT = r"\w*(?:Cents|Bps)\b"
SONDES_CODE = {
    # (?!\s*100\b) : `x / 100`, `x * 100` = conversion centimes ↔ dinars (défaut de la 1re passe)
    "M1": re.compile(rf"{MONTANT}\s*(?:[-+%](?![=>])|[*/](?![=>])(?!\s*100\b))|(?<![=<>!-])[-+*/%]\s*{MONTANT}"),
    "M2": re.compile(r"Math\.(?:round|floor|ceil|trunc)\("),
    "M3": re.compile(r"\w*(?:Cents|Bps)\w*\s*:\s*z\."),
    "M4": re.compile(rf"{MONTANT}\s*(?:<=|>=|<(?![=>])|(?<![=-])>(?!=))|(?:<=|>=)\s*{MONTANT}"),
    "T1": re.compile(r"\b(?:BookingCommand|QuoteCommand|allowedFrom|quoteAllowedFrom|transitionStatus|"
                     r"acceptUnderVenueLock|checkAndSet|convertirEnDemande|creerRevision|changerStatut|"
                     r"marquerRemis|decideBookingTransition|decideQuoteTransition)\b"),
}
NOMME_MONTANT = re.compile(MONTANT)

ventil = {k: 0 for k in ["M1", "M2", "M3", "M4", "S1", "T1", "P1", "P2", "H1"]}
branches: dict[str, dict[str, list[str]]] = {"1": {}, "2": {}, "3": {}}
lignes_lues = 0


def evidence(texte: str, rx: re.Pattern) -> str:
    for l in texte.splitlines():
        if rx.search(l):
            return l.strip()[:110]
    return "?"


for p in code:
    brut = open(p, encoding="utf-8").read()
    lignes_lues += brut.count("\n")
    t = sans_commentaires_ts(brut)
    for k in ["M1", "M3", "M4"]:
        if SONDES_CODE[k].search(t):
            ventil[k] += 1
            branches["1"].setdefault(p, []).append(f"{k}: {evidence(t, SONDES_CODE[k])}")
    if SONDES_CODE["M2"].search(t) and NOMME_MONTANT.search(t):
        ventil["M2"] += 1
        branches["1"].setdefault(p, []).append(f"M2: {evidence(t, SONDES_CODE['M2'])}")
    if SONDES_CODE["T1"].search(t):
        ventil["T1"] += 1
        branches["2"].setdefault(p, []).append(f"T1: {evidence(t, SONDES_CODE['T1'])}")
    if p.startswith("apps/api/src/payments/"):
        ventil["P1"] += 1
        branches["3"].setdefault(p, []).append("P1: dossier payments/")

for p in migrations:
    brut = open(p, encoding="utf-8").read()
    lignes_lues += brut.count("\n")
    t = sans_commentaires_sql(brut)
    noms = []
    for stmt in t.split(";"):
        if re.search(r"\bCHECK\b", stmt) and re.search(r"_(?:cents|bps)\b", stmt):
            m = re.search(r'CONSTRAINT\s+"([^"]+)"', stmt)
            noms.append(m.group(1) if m else "(CHECK sans nom)")
    if noms:
        ventil["S1"] += 1
        branches["1"].setdefault(p, []).append("S1: " + ", ".join(noms))
    if re.search(r'"payments"', t):
        ventil["P2"] += 1
        branches["3"].setdefault(p, []).append("P2: nomme la table payments")

CHEMIN = re.compile(r"""["']((?:apps|packages)/[A-Za-z0-9_./\-\[\]]+\.(?:ts|tsx|sql|css|json))["']""")
sur_le_chemin = set(branches["1"]) | set(branches["2"]) | set(branches["3"])
h_resultats = {}
for h in harnais:
    brut = open(h, encoding="utf-8").read()
    lignes_lues += brut.count("\n")
    communs = sorted(set(CHEMIN.findall(brut)) & sur_le_chemin)
    if communs:
        ventil["H1"] += 1
        h_resultats[h] = communs

print(f"lignes lues : {lignes_lues}")

# --- calibration ---------------------------------------------------------------------------
pos1 = "apps/api/src/venues/booking-charge.ts" in branches["1"]
pos2 = "apps/api/src/venues/booking-locks.prisma.ts" in branches["2"]
formateurs = [p for p in code if re.search(r"/(format|formatters?)\.tsx?$", p)]
neg = formateurs[0] if formateurs else None
neg_ok = neg is not None and neg not in sur_le_chemin
print(f"calibration (1) booking-charge.ts : {'OK' if pos1 else 'MANQUÉ'} · (2) booking-locks.prisma.ts : "
      f"{'OK' if pos2 else 'MANQUÉ'} · négatif {neg} hors carte : {'OK' if neg_ok else 'MANQUÉ'}")
if not (pos1 and pos2 and neg_ok):
    sys.exit("ABANDON : calibration manquée")

# --- sortie ----------------------------------------------------------------------------------
titres = {"1": "(1) CALCULE, ARRONDIT OU VALIDE UN MONTANT — candidats", "2": "(2) TRANSITIONS",
          "3": "(3) PAIEMENT (E3)"}
for b in ["1", "2", "3"]:
    print(f"\n=== {titres[b]} : {len(branches[b])} fichier(s)")
    for p in sorted(branches[b]):
        print(f"  {p}")
        for e in branches[b][p]:
            print(f"      {e}")
print(f"\n=== (4) HARNAIS qui mutent ou mesurent un fichier de (1)-(3) : {len(h_resultats)}")
for h, c in sorted(h_resultats.items()):
    print(f"  {os.path.basename(h)} ← {len(c)} : {', '.join(os.path.basename(x) for x in c)}")

print("\n=== « expire » : écrivains de EXPIRED dans le code (hors tests)")
ecrivains = [p for p in code if re.search(r"status\s*:\s*(?:BookingStatus\.)?[\"']?EXPIRED", open(p, encoding="utf-8").read())]
print(f"  {len(ecrivains)} : {ecrivains if ecrivains else 'aucun — la transition expire n’a pas de code à HEAD'}")

print("\nventilation — fichiers portant chaque sonde :")
for k, n in ventil.items():
    print(f"  {k} : {n}")
zeros = [k for k, n in ventil.items() if n == 0]
print(f"sondes à zéro (hypothèses à vérifier, D295) : {zeros if zeros else 'aucune'}")
