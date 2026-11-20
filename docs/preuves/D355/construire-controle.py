# Fabrique `docs/preuves/D355/controle-fin-de-lot.py` à partir de `docs/preuves/D354/controle-fin-de-lot.py` : le CODE du contrôle est LU dans celui de D354 (aucune ligne retapée), les constantes du lot, les noms de pièces et
# deux contrôles neufs (R-4 : aucun contrat d'API neuf, aucun fichier du chemin de l'argent) sont posés par remplacements dont chacun COMPTE ses occurrences avant d'écrire. Archivé comme PIÈCE (D291), jamais promu en instrument.
# Usage, depuis la RACINE : python3 -I -X utf8 construire-controle.py <sortie.py>
import sys

SRC = "docs/preuves/D354/controle-fin-de-lot.py"
SORTIE = sys.argv[1]
t = open(SRC, encoding="utf-8", newline="").read().replace("\r\n", "\n")


def remplacer(texte: str, ancien: str, neuf: str, attendu: int) -> str:
    n = texte.count(ancien)
    assert n == attendu, (ancien[:80], n, attendu)
    return texte.replace(ancien, neuf)


# 1. le docstring : remplacé en entier
debut = t.index('"""')
fin = t.index('"""', debut + 3) + 3
doc = '''"""Contrôle de FIN DE LOT — D355 (rang 57) — règles de `AGENTS.md` : D288 (local et `origin/main` sur le MÊME SHA, vérifié et rapporté), D328 (l'ordre des commits d'un lot est fixé, et c'est `git` qui le prouve), D334 point 5 (les rouges avant le code).
Chaque contrôle rend ce qu'il a PARCOURU à côté de son verdict et l'ATTENDU à côté du mesuré (D290). Lecture seule : aucun fichier n'est écrit, sauf `--sortie` (UTF-8, LF, écrit par le script lui-même, jamais par redirection).
Usage, depuis la racine, APRÈS la poussée : python3 docs/preuves/D355/controle-fin-de-lot.py [--sortie <chemin>]  (il fait `git fetch` : une lecture du distant).

CODE LU dans `docs/preuves/D354/controle-fin-de-lot.py` par `docs/preuves/D355/construire-controle.py` (aucune ligne retapée) ; CE QUI CHANGE : le SHA de départ, la table, les noms des pièces et des fichiers de code du lot, la liste des rouges (deux familles : unitaire et
intégration, pas de client d'API), les contrôles 8 et 9 (renvoient à R-4, pas à R-7 et R-1), et DEUX contrôles neufs : 10 (aucun fichier de `packages/` : R-4, aucun contrat d'API neuf) et 11 (aucun fichier du chemin de l'argent par sa fonction : le calcul du prix,
l'acompte, les montants, le paiement). Le contrôle 7 (la chaîne d'empreintes AVANT → APRÈS des tests corrigés après les rouges) lit `docs/preuves/D355/corrections-tests-apres-rouges.txt`.
CALIBRATION (D286) : le contrôle d'ordre est essayé sur un cas dont la réponse est connue (la table d'ouverture précède la consigne : vrai ; la consigne précède la table : faux) ; le contrôle de déclaration sur un chemin du lot (déclaré) et un chemin hors lot (non
déclaré) ; le contrôle de chaîne sur un fichier dont la chaîne est connue (rompue : faux)."""'''
t = t[:debut] + doc + t[fin:]

# 2. constantes
t = remplacer(t, 'DEPART = "04239635cb09b20a06a0bf758531216c6b34b107"', 'DEPART = "cc653dd9b1a74b319ab3fe6e0f4a6e5df18d1f2a"', 1)
t = remplacer(t, 'TABLE = "docs/preuves/D354/table-ouverture.md"', 'TABLE = "docs/preuves/D355/table-ouverture.md"', 1)

# 3. les chemins `docs/preuves/D354/` du code deviennent ceux de D355 (hors docstring déjà remplacé)
t = t.replace("docs/preuves/D354/", "docs/preuves/D355/")

# 4. calibration du contrôle de déclaration + contrôle 6 : les fichiers du lot
t = remplacer(t, "apps/api/src/staff/staff-members.service.ts", "apps/api/src/clients/client-record-audit.ts", 2)
t = remplacer(t, "`staff-members.service.ts` déclaré", "`client-record-audit.ts` déclaré", 1)

# 5. contrôle 4 : l'arbitrage du rang 57
t = remplacer(t, "ARBITRÉ LE 19/11/2026 PAR KO — LE RANG 56", "ARBITRÉ LE 19/11/2026 PAR KO — LE RANG 57", 3)
t = remplacer(t, "(bloc « ARBITRÉ LE 19/11/2026 PAR KO — LE RANG 57 »)", "(bloc « ARBITRÉ LE 19/11/2026 PAR KO — LE RANG 57 »)", 1)

# 6. contrôle 6 : les rouges et le premier commit de code
t = remplacer(t, '("rouge-unit.txt", "rouge-client.txt", "rouge-int.txt", "lecture-des-rouges.md")', '("rouge-unit.txt", "rouge-int.txt", "lecture-des-rouges.md")', 1)
t = remplacer(t, "les pièces des rouges (unitaire, client d'API, intégration, leur lecture)", "les pièces des rouges (unitaire, intégration, leur lecture)", 1)
ancien_codes = '("apps/api/src/clients/client-record-audit.ts", "apps/api/src/staff/staff-members.controller.ts", "packages/types/src/staff-capabilities.ts", "apps/api/src/staff/staff-account-state.ts", "packages/api-client/src/staff-client.ts")'
neuf_codes = '("apps/api/src/clients/client-record-audit.ts", "apps/api/src/staff/staff-store.prisma.ts", "apps/api/src/staff/staff-session.service.ts", "apps/api/src/clients/pro-client-store.prisma.ts", "apps/api/src/venues/quote-store.prisma.ts")'
t = remplacer(t, ancien_codes, neuf_codes, 1)

# 7. contrôle 7 : deux familles de rouges
t = remplacer(t, 'for n in ("rouge-unit.txt", "rouge-client.txt", "rouge-int.txt"):', 'for n in ("rouge-unit.txt", "rouge-int.txt"):', 1)

# 8. contrôles 8 et 9 : les renvois
t = remplacer(t, "(R-7 : aucun écran)", "(R-4 : aucun écran)", 1)
t = remplacer(t, "(R-1 : aucune migration)", "(R-4 : aucune migration)", 1)

# 10. le contrôle 7 lit les OCTETS DU DISQUE, pas le blob git : les empreintes des rouges sont celles des fichiers de l'arbre de travail au moment du jeu (fins de ligne comprises, CRLF pour `clients/` et `venues/`) ; l'arbre est propre au contrôle (contrôle 12)
ancien_blob = '''def blob_head(chemin):
    return subprocess.run(["git", "show", f"HEAD:{chemin}"], capture_output=True).stdout'''
neuf_blob = '''def blob_head(chemin):
    # D355 : les empreintes des rouges sont celles des OCTETS DU DISQUE au moment du jeu (fins de ligne comprises) ; l'arbre est propre au contrôle (contrôle 12) : le disque est donc le fichier de HEAD tel que git l'écrit ici.
    return open(chemin, "rb").read()'''
t = remplacer(t, ancien_blob, neuf_blob, 1)

# 9. deux contrôles neufs, posés avant « 10. l'arbre est propre » (renumérotés 12 et 13)
bloc_neuf = '''# 10. R-4 : aucun contrat d'API neuf — rien dans `packages/` (ni `packages/types`, ni `packages/api-client`, ni `packages/i18n`)
paquets = [f for f in diff if f.startswith("packages/")]
v("10", "aucun fichier de `packages/` au diff (R-4 : aucun contrat d'API neuf, aucun message)", not paquets, f"{len(diff)} fichiers au diff ; sous `packages/` : {len(paquets)} {paquets[:3]} (attendu 0)")

# 11. R-4 : rien du chemin de l'argent PAR SA FONCTION — aucun fichier du calcul du prix, de l'acompte, des montants ou du paiement
MOTIFS_ARGENT = ("pricing", "deposit", "booking-charge", "payment", "chargily", "commission", "cashback", "remise")
argent = [f for f in diff if f.startswith("apps/api/src/") and any(m in f.rsplit("/", 1)[-1] for m in MOTIFS_ARGENT)]
cal_argent = (any(m in "apps/api/src/venues/pricing-engine.ts" for m in MOTIFS_ARGENT), any(m in "apps/api/src/clients/client-record-audit.ts" for m in MOTIFS_ARGENT))
L.append(f"calibration : `pricing-engine.ts` reconnu comme chemin de l'argent : {cal_argent[0]} (attendu vrai) ; `client-record-audit.ts` : {cal_argent[1]} (attendu faux)")
if cal_argent != (True, False):
    L.append("✗ ABANDON : la calibration du contrôle du chemin de l'argent a manqué son verdict")
    print("\\n".join(L))
    sys.exit(2)
v("11", "aucun fichier de `apps/api/src/` dont le nom désigne le chemin de l'argent (prix, acompte, montants, paiement, commission, cashback) au diff — ce contrôle ne lit QUE les noms de fichier : que `quote-store.prisma.ts` et `quotes.service.ts` ne portent que la boîte de langue (K-5) est une LECTURE du diff, faite par la session, pas par ce contrôle", not argent, f"{len(diff)} fichiers au diff ; noms de fichier reconnus comme chemin de l'argent : {len(argent)} {argent[:3]} (attendu 0)")

'''
t = remplacer(t, "# 10. l'arbre est propre ; 11. local = origin/main", bloc_neuf + "# 12. l'arbre est propre ; 13. local = origin/main", 1)
t = remplacer(t, 'v("10", "l\'arbre est propre', 'v("12", "l\'arbre est propre', 1)
t = remplacer(t, 'v("11", "local et `origin/main` sur le MÊME SHA (D288)', 'v("13", "local et `origin/main` sur le MÊME SHA (D288)', 1)

open(SORTIE, "w", encoding="utf-8", newline="").write(t.replace("\n", "\r\n") if "\r\n" in open(SRC, "rb").read().decode("utf-8") else t)
print(f"écrit : {SORTIE} ({t.count(chr(10))} lignes)")
