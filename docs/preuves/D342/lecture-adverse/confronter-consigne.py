#!/usr/bin/env python3
"""Lecture adverse de la consigne du rang 45 — l'intégration de la branche `front-client` dans `main` — contre le dépôt — D342 (forme ALLÉGÉE).

MODE D'EMPLOI : depuis la RACINE, `python3 docs/preuves/D342/lecture-adverse/confronter-consigne.py [--sortie <chemin>]`.
Il ne lit que des OBJETS GIT à SHA fixe (SHA_BASE = d44867a, l'état de DÉPART du lot ; SHA_BRANCHE = 43996e2, la pointe de `front-client`) et ne
touche à aucun fichier, sauf `--sortie` (UTF-8, LF, écrit par le script lui-même : jamais par redirection du shell — D298). Deux vérifications lisent
l'arbre de travail ou le disque : l'état des fichiers non suivis (`git status`, lecture seule) et l'existence de `apps/client/.next/types`.
Aucun texte ne traverse un interpréteur : les arguments de `git` sont passés en LISTE (D289).

POURQUOI IL EXISTE : la consigne demande une lecture adverse « contre le dépôt, dont chaque affirmation du BILAN qu'elle cite ». Chaque affirmation
VÉRIFIABLE est ici un contrôle qui rend (verdict, détail), et le détail imprime CE QUI A ÉTÉ PARCOURU à côté de ce qui a été trouvé (D290).

VERDICTS : ✓ vrai · ✗ faux (la règle d'arrêt joue : on s'arrête et on le dit) · ≈ vrai pour l'essentiel, IMPRÉCIS ou en TENSION sur un point (écrit en
seconde partie, jamais tu) · ? non vérifiable contre le dépôt (dit pourquoi).

FORME ALLÉGÉE : les affirmations de la consigne uniquement, plus celles du BILAN qu'elle cite, plus une recherche EN ADVERSAIRE des endroits où la
consigne se contredit elle-même ou contredit un fichier d'autorité (section 4). Les MESURES de la fusion (tests, campagnes) ne sont pas ici : elles se
font APRÈS la fusion, et la lecture adverse n'en préjuge pas.

INSTRUMENTS ÉCARTÉS : réutiliser `docs/preuves/D341/lecture-adverse/confronter-consigne.py` — collé aux affirmations de D341 (SHA, lignes, noms).
Seuls les PRINCIPES sont repris : texte APLATI avant toute recherche multi-mots (AGENTS.md, D277/D294), jamais de comptage par sous-chaîne sans
contexte (D275), le compte de ce qui a été parcouru à côté du total (D290).

CALIBRATION (D286 : deux bras, ABANDON si un cas manque son verdict) : pour CHAQUE sorte de contrôle employée plus bas — ligne du registre, motif
cherché dans un fichier d'un SHA, ancêtre, existence d'un chemin, compte d'un diff — un cas VRAI connu doit rendre « présent » et un cas FAUX connu
« absent ». Sans cela, « 0 occurrence » serait vrai de n'importe quel motif (un zéro sur zéro élément parcouru, D290).
"""
import re
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

SHA_BASE = "d44867a"
SHA_BRANCHE = "43996e2"
SHA_TABLE = "14dbb84"
MERGE_BASE = "e40c141"

CONT = "ZWADJ_CONTINUITE.md"
BACK = "ZWADJ_BACKLOG.md"
AGENTS = "AGENTS.md"
BILAN = "docs/preuves/front-client/BILAN.md"
CONSIGNE_CLOUD = "docs/preuves/front-client/consigne.md"


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, encoding="utf-8", errors="replace").stdout


def rc(*args):
    return subprocess.run(["git", *args], capture_output=True).returncode


def blob(sha, path):
    return git("show", f"{sha}:{path}")


def existe(sha, path):
    return rc("cat-file", "-e", f"{sha}:{path}") == 0


def aplati(t):
    return re.sub(r"\s+", " ", t)


def trouve(t, motif):
    return list(re.finditer(motif, t))


def ctx(t, m, avant=50, apres=190):
    return t[max(0, m.start() - avant): m.end() + apres]


def ancetre(a, b):
    return rc("merge-base", "--is-ancestor", a, b) == 0


def diff_trois_points():
    return [l for l in git("diff", "--name-only", f"{SHA_BASE}...{SHA_BRANCHE}").splitlines() if l.strip()]


# ───────────────────────── CALIBRATION, DEUX BRAS ─────────────────────────
TEXTES = {
    CONT: aplati(blob(SHA_BASE, CONT)),
    BACK: aplati(blob(SHA_BASE, BACK)),
    AGENTS: aplati(blob(SHA_BASE, AGENTS)),
}
B = aplati(blob(SHA_BRANCHE, BILAN))
CC = aplati(blob(SHA_BRANCHE, CONSIGNE_CLOUD))

cal = []


def calibre(nom, positif, negatif):
    ok = (positif is True) and (negatif is False)
    cal.append((nom, positif, negatif, ok))
    if not ok:
        sys.exit(f"CALIBRATION RATÉE — {nom} : cas vrai → {positif} (attendu True), cas faux → {negatif} (attendu False). ABANDON, rien n'a été jugé.")


calibre("ligne du registre (D341 présente, D999 absente)", len(trouve(TEXTES[CONT], r"\| D341 \| A \| D341 —")) == 1, len(trouve(TEXTES[CONT], r"\| D999 \| A \| D999 —")) > 0)
calibre("motif dans un fichier d'un SHA (RANG 45 présent, RANG 99 absent)", len(trouve(TEXTES[CONT], r"RANG 45 : EN ATTENTE DE CADRAGE DU RELECTEUR")) > 0, len(trouve(TEXTES[CONT], r"RANG 99 : EN ATTENTE DE CADRAGE DU RELECTEUR")) > 0)
calibre("ancêtre (le premier commit de la branche l'est, main ne l'est pas)", ancetre("1e6426f", SHA_BRANCHE), ancetre(SHA_BASE, SHA_BRANCHE))
calibre("existence d'un chemin à un SHA (AGENTS.md oui, un harnais inventé non)", existe(SHA_BASE, AGENTS), existe(SHA_BASE, "neutralisation/neutralize-zzz-inexistant.py"))
calibre("motif du compteur dans AGENTS (« TROIS → QUATRE » présent, « QUATRE → DIX-HUIT » pas encore écrit)", len(trouve(TEXTES[AGENTS], r"POUR MÉMOIRE TROIS → QUATRE")) == 1, len(trouve(TEXTES[AGENTS], r"QUATRE → DIX-HUIT")) > 0)
vide = [l for l in git("diff", "--name-only", SHA_BASE, SHA_BASE).splitlines() if l.strip()]
calibre("compte d'un diff (la fusion apporte des fichiers, deux SHA identiques n'en apportent aucun)", len(diff_trois_points()) > 0, len(vide) > 0)

R = []


def v(ident, enonce, verdict, detail):
    R.append((verdict, ident, enonce, detail))


# ───────────────────────── 0. REPRISE ─────────────────────────
tete = git("log", "-1", "--format=%P", SHA_TABLE).split()
fichiers_table = [l for l in git("show", "--name-only", "--format=", SHA_TABLE).splitlines() if l.strip()]
v("0.1", "le premier commit du lot (la table) a pour parent d44867a et ne contient que table-ouverture.md",
  "✓" if tete == [git("rev-parse", SHA_BASE).strip()] and fichiers_table == ["docs/preuves/D342/table-ouverture.md"] else "✗",
  f"parent de {SHA_TABLE} = {[p[:7] for p in tete]} ; fichiers du commit = {fichiers_table}")

om, ofc = git("rev-parse", "origin/main").strip(), git("rev-parse", "origin/front-client").strip()
v("0.2", "origin/main = d44867a au moment de la lecture", "✓" if om.startswith(SHA_BASE) else "✗", f"origin/main = {om[:12]} ; attendu {SHA_BASE} (après le `git fetch` de la session)")
v("0.3", "origin/front-client = 43996e2", "✓" if ofc.startswith(SHA_BRANCHE) else "✗", f"origin/front-client = {ofc[:12]} ; attendu {SHA_BRANCHE}")

stash = [l for l in git("stash", "list").splitlines() if l.strip()]
etat = [l for l in git("status", "--short").splitlines() if l.strip()]
hors = [l for l in etat if "docs/preuves/D342/" not in l]
v("0.4", "arbre propre et aucun stash", "✓" if not stash and not hors else "✗",
  f"stash : {len(stash)} ligne(s) ; `git status --short` : {len(etat)} ligne(s), dont {len(hors)} hors docs/preuves/D342/ (les pièces de CE lot, pas encore commitées, sont les seules attendues)")

rang44 = trouve(TEXTES[CONT], r"RANG 44 CLOS SUR LE CODE|rang 44 \(SUITE\) CLOS SUR LE CODE|L36-3a-1 CLOS SUR LE CODE")
rang45 = trouve(TEXTES[CONT], r"« RANG 45 : EN ATTENTE DE CADRAGE DU RELECTEUR »")
v("0.5", "rang 44 CLOS SUR LE CODE (D341) et « RANG 45 : EN ATTENTE DE CADRAGE DU RELECTEUR »", "✓" if rang44 and rang45 else "✗",
  f"« rang 44 clos sur le code » : {len(rang44)} occurrence(s) ; « RANG 45 : EN ATTENTE DE CADRAGE DU RELECTEUR » : {len(rang45)} occurrence(s) dans {CONT}@{SHA_BASE}")

cptc = trouve(TEXTES[CONT], r"POUR MÉMOIRE QUATRE")
cpta = trouve(TEXTES[AGENTS], r"POUR MÉMOIRE TROIS → QUATRE")
v("0.6", "compteur QUATRE", "✓" if cptc and cpta else "✗",
  f"{CONT} : « POUR MÉMOIRE QUATRE » : {len(cptc)} occurrence(s) ; {AGENTS} l'écrit autrement — « compteur POUR MÉMOIRE TROIS → QUATRE » (l'annotation de D341) : {len(cpta)} occurrence(s), et « QUATRE → DIX-HUIT » : {len(trouve(TEXTES[AGENTS], r'QUATRE → DIX-HUIT'))} (attendu 0 : c'est CE lot qui l'écrit)")

lignes_reg = re.findall(r"^\| (D\d+) \|", blob(SHA_BASE, CONT), re.M)
d342 = {n: len(trouve(t, r"D342\b")) for n, t in TEXTES.items()}
d342_claude = len(trouve(aplati(blob(SHA_BASE, "CLAUDE.md")), r"D342\b"))
v("0.7", "la dernière ligne du registre est D341 (numéro attendu D342, libre)", "✓" if lignes_reg and lignes_reg[-1] == "D341" and sum(d342.values()) + d342_claude == 0 else "✗",
  f"{len(lignes_reg)} ligne(s) de registre parcourue(s), la dernière = {lignes_reg[-1] if lignes_reg else None} ; « D342 » : {d342} + CLAUDE.md {d342_claude} (attendu 0 partout)")

# ───────────────────────── 1. CE QUE KO ARBITRE OU ADOPTE ─────────────────────────
fc = [l for l in git("ls-tree", "-r", "--name-only", SHA_BRANCHE, "docs/preuves/front-client").splitlines() if l.strip()]
v("1.1", "pièces : docs/preuves/front-client/, dont BILAN.md", "✓" if BILAN in fc else "✗", f"{len(fc)} fichier(s) sous docs/preuves/front-client/ à {SHA_BRANCHE} ; BILAN.md {'présent' if BILAN in fc else 'ABSENT'} ({len(blob(SHA_BRANCHE, BILAN))} caractères)")

t_bilan = trouve(B, r"session `front-client` \(05 et 06/11/2026\)")
t_cc = trouve(CC, r"reçue le 05/11/2026")
exc = trouve(CC, r"EXCEPTION BORNÉE À « UN LOT PAR SESSION »")
borne = trouve(CC, r"pour CETTE session seulement")
dans_autorite = {n: len(trouve(t, r"front-client|session cloud")) for n, t in TEXTES.items()}
v("1.2", "session cloud des 05 et 06/11/2026, sous l'exception bornée à « un lot par session » adoptée par Ko le 04/11/2026",
  "≈" if t_bilan and exc and borne and not any(dans_autorite.values()) else "✗",
  f"BILAN « (05 et 06/11/2026) » : {len(t_bilan)} ; consigne de la branche « reçue le 05/11/2026 » : {len(t_cc)} (et NON le 04/11) ; « EXCEPTION BORNÉE À « UN LOT PAR SESSION » » : {len(exc)}, « pour CETTE session seulement » : {len(borne)}. "
  f"⚠ La date du 04/11 ne se lit dans AUCUN fichier du dépôt, et NI la branche NI la session cloud NI son exception ne figurent dans un fichier d'autorité de `main` (« front-client » / « session cloud » : {dans_autorite}) — c'est D276 : cette session doit les écrire.")

v("1.3", "1 b : l'exception de la session cloud est CONSOMMÉE (Ko, 06/11/2026)", "?",
  f"la consigne de la branche la borne elle-même (« pour CETTE session seulement… ne crée pas de précédent », {len(borne)} occurrence) ; la parole de Ko du 06/11 est dans le chat, hors dépôt.")

fp3 = trouve(B, r"Pour une fiche liée, la copie complétée par K-5 est donc perdue à la révision, et K-5 reposera sa question")
v("1.4", "1 c : la question de FP-3 (la copie du nom complétée par K-5 survit-elle à une révision pour une fiche liée ?) ; « oui, pour FP-3 »", "?",
  f"la question est dans le BILAN § 5 ({len(fp3)} occurrence de « …perdue à la révision, et K-5 reposera sa question ») ; la citation de Ko est du chat (la consigne l'exclut elle-même de l'adoption) ; le serveur refuse 409 `CLIENT_RECORD_LINKED` — un lot d'API, `apps/api` n'est touché par aucun fichier de la branche.")

sx = {k: len(trouve(TEXTES[CONT], rf"\*\*S-{k}\*\*")) for k in (113, 116, 123, 129)}
v("1.5", "1 d : S-113 à S-129 (D341) existent, sont à ratifier ; S-116 acceptée telle quelle", "✓" if all(sx.values()) else "✗",
  f"lignes de table `**S-nnn**` dans {CONT}@{SHA_BASE} : {sx} ; « S-113 à S-129 sont À RATIFIER » : {len(trouve(TEXTES[CONT], r'S-113 à S-129 sont \*\*?À RATIFIER|S-113 à S-129 sont À RATIFIER'))} occurrence(s)")

# ───────────────────────── 2. DÉCISIONS DU RELECTEUR ─────────────────────────
mt = subprocess.run(["git", "merge-tree", "--write-tree", "--name-only", SHA_BASE, SHA_BRANCHE], capture_output=True, encoding="utf-8", errors="replace")
arbre = mt.stdout.splitlines()[0] if mt.stdout.strip() else ""
v("2.1", "R-1 : origin/front-client fusionne dans origin/main (d44867a) SANS AUCUN CONFLIT", "✓" if mt.returncode == 0 and len(arbre) == 40 else "✗",
  f"`git merge-tree --write-tree {SHA_BASE} {SHA_BRANCHE}` → code {mt.returncode}, arbre prédit {arbre[:12]} (aucune ligne de conflit : {len(mt.stdout.splitlines()) - 1} ligne(s) après l'arbre)")

nb_ancetre = ancetre(SHA_BRANCHE, SHA_BASE)
v("2.2", "R-1 : « le relecteur a fusionné origin/front-client DANS origin/main (d44867a) »", "≈" if not nb_ancetre else "✓",
  f"origin/main = {SHA_BASE} ne contient PAS la branche (la pointe {SHA_BRANCHE} est ancêtre de main : {nb_ancetre}) — l'essai du relecteur est local et non poussé ; la phrase se lit « sur la base de d44867a ». Aucun effet : la fusion reste à faire, et l'absence de conflit est reconfirmée en 2.1.")

ajoutes_tests = [l.split("\t")[1] for l in git("diff", "--name-status", f"{SHA_BASE}...{SHA_BRANCHE}").splitlines() if l.startswith("A\t") and re.search(r"\.test\.tsx?$", l)]
m_tot = trouve(TEXTES[CONT], r"sur secteur, SHA `40b7380`, arbre propre avant et après : `typecheck` 0 · `lint` 0 · `test` (\d+) (\d{3}) / (\d+)")
base_tests, base_fich = (int(m_tot[-1].group(1) + m_tot[-1].group(2)), int(m_tot[-1].group(3))) if m_tot else (None, None)
ent = trouve(B, r"api-client 59, api 1 096, client 386, pro 653 = 2 194 tests")
sort = trouve(B, r"client \*\*488\*\*, pro \*\*711\*\*")
somme = 66 + 1336 + 488 + 711
v("2.3", "R-1 : 2 601 tests, 173 fichiers (api-client 66, api 1 336, client 488, pro 711)", "✓" if somme == 2601 and base_tests == 66 + 1336 + 386 + 653 and base_fich is not None and base_fich + len(ajoutes_tests) == 173 else "✗",
  f"ARITHMÉTIQUE seulement (la mesure est celle des portes, après la fusion) : 66+1336+488+711 = {somme} ; le dernier « `test` N / F » de {CONT} = {base_tests} / {base_fich} (D341) = 66+1336+386+653 = {66 + 1336 + 386 + 653} avec le client 386 et le pro 653 de l'entrée du BILAN ({len(ent)} occurrence) ; "
  f"fichiers : {base_fich} + {len(ajoutes_tests)} fichiers de test AJOUTÉS par la fusion = {None if base_fich is None else base_fich + len(ajoutes_tests)} (attendu 173) ; BILAN sortie « client 488, pro 711 » : {len(sort)} occurrence")

ecart_main = git("rev-list", "--count", f"{SHA_BRANCHE}..{SHA_BASE}").strip()
sans_api = [l for l in diff_trois_points() if l.startswith("apps/api/")]
l3a2 = trouve(TEXTES[CONT], r"L36-3a-2 \(création, liste, réinitialisation, désactivation, capacités")
v("2.4", "R-1 : « chaque lot de main éloigne la branche ; la branche touche les écrans, L36-3a-2 le serveur »", "✓" if int(ecart_main) > 0 and not sans_api and l3a2 else "✗",
  f"commits de main absents de la branche : {ecart_main} ; fichiers du diff de la fusion sous apps/api/ : {len(sans_api)} (sur {len(diff_trois_points())} parcourus) ; L36-3a-2 = « création, liste, réinitialisation, désactivation, capacités… » : {len(l3a2)} occurrence(s) dans {CONT} (un lot serveur)")

cand = trouve(TEXTES[CONT], r"candidat désigné par R-1 : \*\*L36-3a-2\*\*")
pasarb = trouve(TEXTES[CONT], r"candidat \*\*désigné\*\* par R-1 de D340[^.]{0,80}\*\*L36-3a-2\*\*|candidat désigné par R-1 : \*\*L36-3a-2\*\* \(création")
v("2.5", "R-1 : « L'intégration passe avant L36-3a-2 » (le candidat désigné pour le rang 45 par D341)", "✓" if cand else "✗",
  f"{CONT} : « candidat désigné par R-1 : L36-3a-2 » : {len(cand)} occurrence(s) — un CANDIDAT « désigné », pas un rang arbitré (le rang 45 est « EN ATTENTE DE CADRAGE », 0.5) : aucune permission périmée à lever ; la consigne § 5 refait de L36-3a-2 le candidat du rang 46.")

s116 = trouve(TEXTES[CONT], r"\*\*S-116\*\* \| \*\*lecture de la tension R-3 / MP-17\*\*[^|]{0,200}\| ⚠ \*\*MP-17 ne promet pas ce qu'il disait\*\* : vingt connexions parallèles[^|]{0,400}borné par la limite de débit par IP \(10 connexions de personnel / 15 min\), pas par la pause")
s123 = trouve(TEXTES[CONT], r"\*\*S-123\*\* \| débit : `staffActivate` 5 / 15 min / IP[^|]{0,120}`staffLogin` 10 / 15 min / IP")
v("2.6", "R-2 : S-116 — pendant la pause chaque essai paie le coût factice, la rafale est bornée par le débit par IP (S-123), pas par la pause", "✓" if s116 and s123 else "✗",
  f"ligne S-116 (« vingt connexions parallèles… borné par la limite de débit par IP… pas par la pause ») : {len(s116)} ; ligne S-123 (`staffLogin` 10 / 15 min / IP) : {len(s123)} dans {CONT}@{SHA_BASE}")

r3_d340 = trouve(TEXTES[CONT], r"- R-3\. Méthode RENFORCÉE\. Motif : chemin d'identité")
r3_d341 = trouve(aplati(blob("HEAD", "docs/preuves/D341/consigne.md")), r"R-3\. S-103 est REFUSÉE\. Pendant la pause de 15 minutes, la réponse est la même.{0,200}au même coût \(argon2 factice, D5\).{0,900}Motif : DR5")
dr5 = trouve(TEXTES[CONT], r"réponse identique pour compte inconnu et mauvais mot de passe")
v("2.7", "R-2 : « Motif : R-3 de D340 (réponse et coût identiques, DR5) »", "≈" if r3_d341 and r3_d340 and dr5 else "✗",
  f"R-3 de D340 dans {CONT} = « Méthode RENFORCÉE. Motif : chemin d'identité… » ({len(r3_d340)} occurrence) — elle NE dit PAS « réponse et coût identiques » ; "
  f"la décision qui le dit est **R-3 de la consigne de D341** (« S-103 est REFUSÉE… au même coût (argon2 factice, D5)… Motif : DR5 », {len(r3_d341)} occurrence dans docs/preuves/D341/consigne.md) ; DR5 « réponse identique pour compte inconnu et mauvais mot de passe » : {len(dr5)} occurrence. "
  f"⚠ Le fond est juste, la RÉFÉRENCE est décalée d'un lot : « R-3 de D340 » se lit « R-3 de D341 » — D342 écrit la bonne.")

clos = {lot: sha for lot, sha in (("FC-1", "5f95ba3"), ("FC-2", "7113356"), ("FC-3", "470dfe1"), ("FC-4", "e537bb1"), ("FC-5", "b595bde"), ("FC-6", "06261c3"), ("FC-7", "a2d96f0"), ("FC-8", "f4c9256"), ("FC-9", "669cdae"), ("FC-10", "eb98ee7"), ("FC-12", "aec8141"), ("FP-1", "8fb0296"), ("FP-2", "8432070"), ("FP-3", "bcb51fd"))}
cites = {lot: len([l for l in git("grep", "-l", sha, SHA_BRANCHE, "--", "docs/preuves/front-client").splitlines() if l.strip()]) for lot, sha in clos.items()}
ok_anc = all(ancetre(sha, SHA_BRANCHE) for sha in clos.values())
v("2.8", "R-3 : les pièces de chaque lot citent les SHA de la branche (une réécriture les rendrait faux)", "✓" if ok_anc and all(cites.values()) else "≈",
  f"SHA de clôture des {len(clos)} lots de code, tous ancêtres de {SHA_BRANCHE} : {ok_anc} ; fichiers de docs/preuves/front-client/ qui citent chacun : {cites}")

bil_due = trouve(B, r"Elle est due avant l'intégration de FP-1")
dr1 = trouve(TEXTES[AGENTS], r"les sessions B d'attaque à froid et la relecture extérieure D sont en pause")
ordre = [l.split()[0] for l in git("rev-list", "--reverse", "aec8141..8fb0296").splitlines()]
def premier(chemin):
    r = git("log", "--diff-filter=A", "--format=%H", f"{SHA_BRANCHE}", "--", chemin).split()
    return r[-1] if r else None
rouge1, rouge2 = premier("docs/preuves/front-client/FP-1/rouges/rouge-pro.txt"), premier("docs/preuves/front-client/FP-1/rouges/rouge-pro-v2.txt")
code_fp1 = [l.split()[0] for l in git("log", "--reverse", "--no-merges", "--format=%H %s", "aec8141..8fb0296", "--", "apps/pro/src", "packages").splitlines() if " test(" not in l]
pos = lambda s: ordre.index(s) if s in ordre else None
harn = git("log", "--diff-filter=A", "--format=%H", SHA_BRANCHE, "--", "neutralisation/neutralize-fp1.py").split()
v("2.9", "R-4 : la session adverse de FP-1 n'est PAS due (sessions B en pause, DR1) ; FP-1 a eu ses rouges AVANT son code et son harnais", "✓" if bil_due and dr1 and rouge1 and rouge2 and code_fp1 and pos(rouge1) < pos(code_fp1[0]) and pos(rouge2) < pos(code_fp1[0]) and harn and pos(harn[-1]) > pos(code_fp1[0]) else "✗",
  f"BILAN « Elle est due avant l'intégration de FP-1 » : {len(bil_due)} ; AGENTS « les sessions B d'attaque à froid… sont en pause » : {len(dr1)} ; FP-1 parcourt {len(ordre)} commits : rouges aux positions {pos(rouge1)} et {pos(rouge2)}, premier commit de code de production à la position {pos(code_fp1[0]) if code_fp1 else None}, harnais `neutralize-fp1.py` à la position {pos(harn[-1]) if harn else None} (0 = premier)")

lots_code = re.findall(r"\| (FC-\d+|FP-\d+) \| \*\*(PRÊT|ARRÊTÉ)\*\*", blob(SHA_BRANCHE, BILAN))
prets = [l for l, s in lots_code if s == "PRÊT"]
arretes = [l for l, s in lots_code if s == "ARRÊTÉ"]
r2d340 = trouve(TEXTES[CONT], r"la pause n'est posée que parce qu'aucun client réel n'existe \(DR1\) ; elle se lève avant le premier client réel")
cc_0d = trouve(CC, r"Compteur pour mémoire : chaque lot de code compte, à l'intégration")
v("2.10", "R-5 : quatorze lots de code comptent ; compteur QUATRE → DIX-HUIT ; la limite de cinq reste suspendue ; ce chiffre dit ce qu'une certification devra couvrir avant le premier client réel (R-2 de D340)", "✓" if len(prets) == 14 and 4 + len(prets) == 18 and r2d340 and cc_0d else "✗",
  f"lignes de lot du BILAN parcourues : {len(lots_code)} (attendu 17), dont PRÊT {len(prets)} (attendu 14) et ARRÊTÉ {arretes} ; 4 + {len(prets)} = {4 + len(prets)} ; consigne de la branche 0 d « chaque lot de code compte, à l'intégration » : {len(cc_0d)} ; R-2 de D340 « elle se lève avant le premier client réel » : {len(r2d340)}")

fc11 = trouve(B, r"FC-11 \(ARRÊTÉ\)\*\* — options : garder l'état \(recommandé, en écrivant la limite\)")
fp4 = trouve(B, r"FP-4 \(ARRÊTÉ\)\*\*[^.]*prémisse est fausse")
fp4o = trouve(B, r"Options : garder \(recommandé\)")
fp5 = trouve(B, r"FP-5 \(ARRÊTÉ\)\*\* — afficher les versions précédentes renverserait la décision A")
decA = trouve(TEXTES[AGENTS], r"DÉCISION A — le versionnement est CONSERVÉ")
v("2.11", "R-6 : lots ARRÊTÉS — FC-11 garder l'état et écrire la limite ; FP-4 garder l'état ; FP-5 rien (la décision A tient)", "✓" if fc11 and fp4 and fp4o and fp5 and decA else "✗",
  f"BILAN : FC-11 « garder l'état (recommandé, en écrivant la limite) » {len(fc11)} ; FP-4 « prémisse est fausse » {len(fp4)} et « Options : garder (recommandé) » {len(fp4o)} ; FP-5 « renverserait la décision A » {len(fp5)} ; AGENTS « DÉCISION A — le versionnement est CONSERVÉ » : {len(decA)}")

r7a = trouve(TEXTES[BACK], r"Retirer le repli `maxPriceCents` — \*\*échéance 19/11/2026\*\* \(3 mois\)\. Retirer aussi la clé de `SEARCH_VARIANT_PARAMS`")
seo = blob(SHA_BASE, "apps/client/src/lib/seo.ts")
tab = re.search(r"export const SEARCH_VARIANT_PARAMS = \[(.*?)\] as const", seo, re.S)
cles = re.findall(r'"(\w+)"', tab.group(1)) if tab else []
jamais = git("log", "--oneline", "-S", "maxPriceCents", SHA_BASE, "--", "apps/client/src/lib/seo.ts").strip()
r7b = trouve(TEXTES[CONT], r"⚠ `guide` \*\*et\*\* `maxPriceCents` entrent dans `isVariant` \(D216\)\. \*\*D231 —")
d230 = trouve(TEXTES[CONT], r"\*\*D230 — `\?guide=` porte l'ÉTAPE, pas un booléen\.\*\*")
v("2.11b", "R-7 : (a) l'entrée « Retirer le repli maxPriceCents … Retirer aussi la clé de SEARCH_VARIANT_PARAMS » porte une prémisse fausse (la clé n'y a jamais été) ; (b) la mention de maxPriceCents dans isVariant de D230 se barre", "✓" if r7a and "maxPriceCents" not in cles and "maxPrice" in cles and not jamais and r7b and d230 else "✗",
  f"(a) backlog : {len(r7a)} occurrence ; SEARCH_VARIANT_PARAMS@{SHA_BASE} = {len(cles)} clé(s) dont `maxPrice` {('maxPrice' in cles)} et `maxPriceCents` {('maxPriceCents' in cles)} ; `git log -S maxPriceCents -- seo.ts` : {len(jamais.splitlines())} commit (attendu 0, la clé n'y a JAMAIS été) ; "
  f"(b) {CONT} : « `guide` et `maxPriceCents` entrent dans `isVariant` (D216) » : {len(r7b)} occurrence, dans le bloc « D230 — ?guide= porte l'ÉTAPE » ({len(d230)} occurrence) — ⚠ la phrase cite « (D216) » alors qu'elle vit dans D230 : le barrage se fait à l'endroit où elle est écrite.")

ard_c = trouve(TEXTES[CONT], r"\(b\) dates et nombres en arabe en `ar-DZ`, catalogue et routes en `ar`, relevé navigateur d'abord, avant le lancement, à ordonner par Ko")
ard_b = trouve(TEXTES[BACK], r"Avant le lancement ; à ordonner par moi\. » Entrée « Les dates et les nombres en arabe se formatent en `ar-DZ` », « Reports du 04/10/2026 »")
qal = [f for f in git("grep", "-l", "QUOTE_AMOUNT_LOCALE", SHA_BRANCHE, "--", "apps", "packages").splitlines() if f.strip()]
pdf = blob(SHA_BASE, "apps/api/src/documents/quote-document.ts")
pdf_sans_locale = len(re.findall(r"formatDZD\(record\.\w+Cents\)", pdf))
pdf_avec_locale = len(re.findall(r"formatDZD\(record\.\w+Cents, ", pdf))
v("2.12", "R-8 : FC-6 « dates et nombres en ar-DZ » (arbitrage de Ko du 04/10/2026, « avant le lancement ») n'est tenu qu'en partie : les montants d'un devis restent en français à l'écran ET dans le PDF, ensemble (QUOTE_AMOUNT_LOCALE)",
  "✓" if ard_c and ard_b and qal and pdf_sans_locale >= 4 and pdf_avec_locale == 0 else "✗",
  f"arbitrage « avant le lancement » : {len(ard_c)} occurrence dans {CONT}, {len(ard_b)} dans {BACK} (la parole de Ko : « Avant le lancement ; à ordonner par moi ») ; QUOTE_AMOUNT_LOCALE dans {len(qal)} fichier(s) de la branche ({', '.join(f.split(':', 1)[1] for f in qal[:3])}…) ; "
  f"PDF (`apps/api/src/documents/quote-document.ts`) : {pdf_sans_locale} appel(s) `formatDZD(record.…Cents)` SANS locale, {pdf_avec_locale} avec — il imprime donc en français, comme l'écran (la branche ne touche pas `apps/api`)")

serv = blob(SHA_BRANCHE, "apps/pro/src/venues/services-section.tsx")
n_lab = len(re.findall(r"labelFr|unitNameFr", serv))
modifiee = len(re.findall(r"^\| (?:FC|FP)-\d+ \| `[\w.]+` \(\*\*modifiée\*\*\)", blob(SHA_BRANCHE, BILAN), re.M))
cles_lignes = len(re.findall(r"^\| (?:FC|FP)-\d+ \| `[\w.]+`", blob(SHA_BRANCHE, BILAN), re.M))
ancres = {
    "FP-3 (§ 5)": len(trouve(B, r"\*\*FP-3\*\* — une révision reprend la copie du nom")),
    "FP-2 : GET /quotes/:id (§ 5)": len(trouve(B, r"un `GET /quotes/:id` serait plus sobre")),
    "catalogue Pro en français (§ 6)": len(trouve(B, r"Le catalogue des prestations du \*\*Pro\*\* affiche les noms de palier et d'unité en français même en arabe")),
    "/salles sans JavaScript (§ 6)": len(trouve(B, r"`/salles` sans JavaScript reste sur son indicateur de chargement")),
    "hreflang/sitemap/robots (§ 6)": len(trouve(B, r"Pas de `hreflang`, de sitemap ni de `robots`")),
    "ancres CRLF en dur (§ 6)": len(trouve(B, r"Cinq anciens harnais écrivent des ancres en CRLF EN DUR")),
    "récapitulatif du comptoir (FP-4, § 5)": len(trouve(B, r"le récapitulatif du comptoir montrerait l'identifiant d'un créneau")),
    "16 clés neuves (§ 4)": len(trouve(B, r"Seize clés neuves et une modifiée")),
}
seo_d216 = trouve(TEXTES[AGENTS], r"RÈGLE SEO\*\* : une page de recherche portant le moindre paramètre est une VARIANTE")
v("2.13", "R-9 : huit entrées de backlog neuves, chacune ancrée dans le BILAN (FP-3 ; FP-2 ; catalogue Pro ; /salles sans JS ; hreflang/sitemap/robots ; ancres CRLF ; récapitulatif du comptoir ; relecture arabe des 16 clés + 1 modifiée) ; règle SEO de D216",
  "✓" if all(ancres.values()) and n_lab > 0 and cles_lignes == 17 and modifiee == 1 and seo_d216 else "✗",
  f"ancres dans le BILAN : {ancres} ; `services-section.tsx` porte `labelFr`/`unitNameFr` : {n_lab} occurrence(s) ; lignes de clé du § 4 parcourues : {cles_lignes} (attendu 17 = 16 neuves + 1 modifiée), dont « modifiée » : {modifiee} ; AGENTS « RÈGLE SEO » (D216) : {len(seo_d216)}")

outils = {p: existe(SHA_BRANCHE, p) for p in ("docs/preuves/front-client/outils/portes.sh", "docs/preuves/front-client/outils/controle-lot.py", "neutralisation/socle_front_client.py", "apps/client/src/test-setup-calibration.test.ts")}
v("2.14", "R-10 : outils/portes.sh, outils/controle-lot.py, neutralisation/socle_front_client.py et l'étalon test-setup-calibration.test.ts existent", "✓" if all(outils.values()) else "✗", f"existence à {SHA_BRANCHE} : {outils}")

b36 = trouve(B, r"un artefact de build périmé \(`apps/client/\.next/types`\) fait rougir `typecheck` après la suppression d'une page — `rm -rf apps/client/\.next/types`")
import os
v("2.15", "R-11 : un artefact `apps/client/.next/types` périmé fait rougir typecheck (BILAN § 3, point 6)", "✓" if b36 and os.path.isdir("apps/client/.next/types") and rc("check-ignore", "-q", "apps/client/.next/types") == 0 else "✗",
  f"BILAN § 3 point 6 : {len(b36)} occurrence ; le dossier existe sur ce poste : {os.path.isdir('apps/client/.next/types')} ; ignoré par git : {rc('check-ignore', '-q', 'apps/client/.next/types') == 0} (le supprimer ne modifie aucun fichier suivi)")

# ───────────────────────── 3. LE LOT ─────────────────────────
table = blob(SHA_TABLE, "docs/preuves/D342/table-ouverture.md")
bloc = re.search(r"## A\. .*?```\n(.*?)\n```", table, re.S)
dans_table = bloc.group(1).splitlines() if bloc else []
frais = diff_trois_points()
v("3.1", "§ 3 : la table liste « la sortie de `git diff --name-only origin/main...origin/front-client`, chemins complets, versée telle quelle »", "✓" if dans_table == frais and len(frais) == 440 else "✗",
  f"lignes du bloc de la table (commit {SHA_TABLE}) : {len(dans_table)} ; sortie fraîche du diff à trois points : {len(frais)} ; identiques, dans l'ordre : {dans_table == frais}")

int_noms = [f for f in frais if re.search(r"pro-clients\.int-spec|quote-numbering\.int-spec", f)]
v("3.2","§ 3 : « la branche ne l'a jamais eu vert (concurrence de pro-clients et quote-numbering, classe D265, fichiers non touchés) »", "✓" if trouve(B, r"`test:int` n'est vert dans aucun lot") and trouve(B, r"`pro-clients\.int-spec\.ts` MD-1 et `quote-numbering\.int-spec\.ts` F-1 à F-7") and not int_noms and trouve(TEXTES[AGENTS], r"\(D265\)") else "✗",
  f"BILAN § 3.1 « n'est vert dans aucun lot » + les deux fichiers nommés ; parmi les {len(frais)} fichiers du diff, ceux qui s'appellent pro-clients.int-spec / quote-numbering.int-spec : {len(int_noms)} (attendu 0) ; D265 dans AGENTS : {len(trouve(TEXTES[AGENTS], r'[(]D265[)]'))} occurrence(s)")

r6d339 = trouve(TEXTES[CONT], r"la règle du rejeu a été écrite et commitée AVANT le lancement \(`021b02e`\), le rejeu a eu lieu \*\*une seule fois\*\*")
cond14 = trouve(TEXTES[AGENTS], r"en rejouant le test fautif sur le commit de chaque lot")
v("3.3", "§ 3 : rouge hors de la branche → R-6 de D339 (un seul rejeu, règle écrite avant, les deux passes versées) ; rouge dans la branche → le lot fautif par la troisième condition de Ko du 14/10/2026", "✓" if r6d339 and cond14 else "✗",
  f"R-6 de D339 exécutée (« règle… commitée AVANT… rejeu… une seule fois ») : {len(r6d339)} occurrence dans {CONT} ; la troisième condition (« …en rejouant le test fautif sur le commit de chaque lot ») : {len(cond14)} dans {AGENTS}")

angle = trouve(TEXTES[CONT], r"l'angle mort du tri")
comp = [p for p in ("docs/preuves/D341/neutralisation/calculer-complement.py", "docs/preuves/D341/neutralisation/calculer-union.py", "docs/preuves/D341/neutralisation/jouer-union.py") if existe(SHA_BASE, p)]
lc = blob(SHA_BASE, "neutralisation/lancer-campagnes.py")
base_diff_head = len(trouve(lc, r'sortie\("diff", "--name-only", "HEAD"\)'))
opt_base = len(trouve(lc, r"--depuis|--base|--sha"))
v("3.4", "§ 3 : `python3 neutralisation/lancer-campagnes.py` « sur le diff de la fusion » (l'angle mort du tri de D341 compris)", "≈" if base_diff_head == 1 and opt_base == 0 and len(comp) == 3 and angle else "✗",
  f"le tri de `lancer-campagnes.py` croise `git diff --name-only HEAD` ({base_diff_head} occurrence) et n'a AUCUNE option de base ({opt_base}) : une fois la fusion COMMITÉE, ce diff est vide et aucune campagne n'est retenue (D341 l'a déjà vécu). "
  f"La parade existe : les trois outils de D341 {[p.split('/')[-1] for p in comp]} (base `<départ>..HEAD`, plus le complément pour les chemins relatifs) ; « l'angle mort du tri » : {len(angle)} occurrence(s) dans {CONT}. ⚠ Écrit pour ne pas se lire comme tenu : l'instrument n'est pas retouché (R-10), la liste se CALCULE et se VERSE avant de jouer.")

ps = blob(SHA_BASE if existe(SHA_BASE, "docs/preuves/D340/portes/passe-secteur.sh") else "HEAD", "docs/preuves/D340/portes/passe-secteur.sh")
portes = re.findall(r"^porte (\S+) ", ps, re.M)
refus = {k: bool(trouve(ps, p)) for k, p in (("batterie", r"refus \"le poste est sur BATTERIE"), ("docker", r"le démon Docker ne répond pas"), ("conteneur", r"zwadj-db n'est pas Up"), ("arbre propre", r"l'arbre n'est pas propre"), ("ports", r"un port d'e2e est occupé"))}
v("3.5", "§ 3 : « les six portes et l'e2e » par le pilote de D340 (passe-secteur.sh)", "≈" if len(portes) == 6 and all(refus.values()) else "✗",
  f"le pilote joue {len(portes)} porte(s) : {portes} — l'e2e est la SIXIÈME, pas une septième (« les six portes et l'e2e » ne veut pas dire sept) ; il REFUSE sur : {refus} ; ⚠ « l'arbre n'est pas propre » ⇒ toute pièce de D342 doit être COMMITÉE avant son lancement.")

# ───────────────────────── 4. EN ADVERSAIRE — CONTRE LE BILAN ET CONTRE LES FICHIERS D'AUTORITÉ ─────────────────────────
n_commits = int(git("rev-list", "--count", f"{MERGE_BASE}..{SHA_BRANCHE}").strip())
bil106 = trouve(B, r"106 commits")
bil_main = trouve(B, r"`main` n'a pas bougé\*\* \(`e40c141`")
bil_17 = len(lots_code)
b_aut = len([l for l in frais if re.search(r"(^|/)(AGENTS|CLAUDE)\.md$|ZWADJ_", l)])
v("4.1", "BILAN : « 106 commits » ; « `main` n'a pas bougé (e40c141) » ; aucun fichier d'autorité, aucun apps/api, aucune migration au diff", "≈" if (len(bil106) and n_commits == 107) or int(ecart_main) > 0 else "✓",
  f"commits de {MERGE_BASE}..{SHA_BRANCHE} : {n_commits} (le BILAN en annonce 106 ; explication probable — INFÉRENCE, non mesurée : le commit du BILAN, écrit avant d'exister, ne se compte pas lui-même) ; « main n'a pas bougé » : écrit au 06/11 et PÉRIMÉ depuis — main a {ecart_main} commits de plus (D341) ; "
  f"fichiers d'autorité au diff : {b_aut} (attendu 0), sous apps/api : {len(sans_api)} (attendu 0), migrations/.sql : {len([l for l in frais if 'migrations' in l or l.endswith('.sql')])} (attendu 0), package.json/pnpm-lock.yaml : {len([l for l in frais if l.endswith('package.json') or l.endswith('pnpm-lock.yaml')])} (attendu 0) sur {len(frais)} parcourus")

def cles(sha, lang):
    import json
    d = json.loads(blob(sha, f"packages/i18n/messages/{lang}.json"))
    def n(x): return sum(n(y) for y in x.values()) if isinstance(x, dict) else 1
    return n(d)
kfr, kar = cles(SHA_BRANCHE, "fr"), cles(SHA_BRANCHE, "ar")
v("4.2", "BILAN : parité FR/AR « 1 246 clés feuilles de chaque côté »", "✓" if kfr == kar == 1246 else "✗",
  f"clés feuilles parcourues à {SHA_BRANCHE} : fr {kfr}, ar {kar} (attendu 1246 = 1246) ; ⚠ vrai de la POINTE DE LA BRANCHE : `fr.json` et `ar.json` sont aussi modifiés par `main` (D341), le compte de la fusion sera plus grand — c'est la porte `test` (parité) qui le mesure")

entree_ok = trouve(B, r"api-client 59, api 1 096, client 386, pro 653 = 2 194 tests")
d340_pass = trouve(TEXTES[CONT], r"`test` 2 194 / 148")
v("4.3", "BILAN § 2 : entrée de la session = 2 194 tests (api-client 59, api 1 096, client 386, pro 653)", "✓" if entree_ok and d340_pass and 59 + 1096 + 386 + 653 == 2194 else "✗",
  f"59+1096+386+653 = {59 + 1096 + 386 + 653} ; le BILAN l'écrit {len(entree_ok)} fois ; la passe sur secteur de D340 (`test` 2 194 / 148, base du départ e40c141) : {len(d340_pass)} occurrence dans {CONT}")

dossiers = {}
for lot in ("FC-1", "FC-2", "FC-3", "FC-4", "FC-5", "FC-6", "FC-7", "FC-8", "FC-9", "FC-10", "FC-11", "FC-12", "FP-1", "FP-2", "FP-3", "FP-4", "FP-5"):
    f = git("ls-tree", "-r", "--name-only", SHA_BRANCHE, f"docs/preuves/front-client/{lot}/").splitlines()
    dossiers[lot] = (len(f), any("table-ouverture.md" in x for x in f), any("controle.txt" in x for x in f), any("rapport" in x for x in f))
sans_rapport = [l for l, (_, t, c, r) in dossiers.items() if not r]
sans_table_ou_controle = [l for l, (_, t, c, r) in dossiers.items() if not (t and c)]
fichiers_par_lot = {l: d[0] for l, d in dossiers.items()}
v("4.4", "BILAN : « chaque lot a son dossier (table d'ouverture, rouges, harnais, campagnes, portes, audit, contrôle, rapport) »", "≈" if not sans_table_ou_controle and sans_rapport else ("✓" if not sans_rapport else "✗"),
  f"17 dossiers parcourus ; table d'ouverture ET contrôle présents partout (manquants : {sans_table_ou_controle}) ; pas de fichier « rapport » dans : {sans_rapport} — les trois lots ARRÊTÉS, qui portent une pièce d'arrêt à la place (normal : un lot arrêté n'a ni code, ni portes, ni campagnes) ; fichiers par lot : {fichiers_par_lot}")

x_cloud = trouve(CC, r"Les numéros, les rangs et les écritures d'autorité se feront à l'INTÉGRATION, lot par lot")
v("4.5", "CONTRADICTION ? la consigne de la branche prévoit une intégration « lot par lot » (numéros, rangs, écritures d'autorité) ; la consigne du rang 45 intègre les dix-sept lots sous UN rang et UN numéro", "≈" if x_cloud else "✓",
  f"consigne de la branche § 0 c : « …se feront à l'INTÉGRATION, lot par lot, par une session sur le poste de Ko… » ({len(x_cloud)} occurrence) ; la consigne du rang 45 (§ 5) demande UNE section D342 qui liste les dix-sept lots. Pas un défaut : la consigne la plus récente prévaut, elle est adoptée par Ko, et « lot par lot » se tient DANS la section (un sous-bloc par lot, SHA de départ et de clôture). À dire dans D342.")

mod = trouve(TEXTES[CONT], r"rm -rf")
v("4.6", "CONTRADICTION ? « aucune ligne de code neuve » (§ 3) et R-11 (`rm -rf apps/client/.next/types`)", "✓",
  "R-11 supprime un artefact de build IGNORÉ par git (vérifié en 2.15) : ce n'est ni une ligne de code ni un fichier suivi ; aucune tension.")

v("4.7", "CONTRADICTION ? « Audits de secrets avant chaque versement » (§ 3) et une fusion qui verse 311 fichiers de `docs/preuves/front-client/` d'un seul commit", "≈",
  "l'audit de D298 parcourt le DISQUE (`os.walk docs/preuves`), pas l'index : pour couvrir ces 311 fichiers AVANT le commit de fusion, il faut les avoir sur disque — d'où l'audit « b », fait sur une COPIE DE TRAVAIL JETABLE (hors dépôt) où la fusion est faite sans être commitée, puis versé AVANT la fusion réelle. La table l'a déclaré à l'ouverture.")

v("4.8", "CONTRADICTION ? les « six portes » de chaque lot de la branche et « test:int n'est vert dans aucun lot » (BILAN § 2 et § 3.1)", "≈",
  "AGENTS : « chaque lot de code garde ses six portes vertes avant sa clôture » (D332, condition 2). La branche ne les a jamais eues toutes vertes (`test:int` rouge à chaque lot), mais ses lots sont dits « PRÊT À INTÉGRER, jamais CLOS » ; "
  "c'est CETTE intégration qui doit montrer `test:int` vert (consigne § 3). Rien à corriger : à écrire dans D342 que les quatorze lots ne sont CLOS qu'à cette condition.")

# ───────────────────────── 5. NON VÉRIFIABLES CONTRE LE DÉPÔT ─────────────────────────
v("5.1", "« origin/main = d44867a, origin/front-client = 43996e2 (vérifiés par le relecteur le 06/11/2026) »", "?", "la vérification du relecteur est dans le chat ; la session a refait la sienne (0.2, 0.3).")
v("5.2", "« adopté par Ko tel quel » / « Ko l'a collé »", "?", "la consigne s'écrit « par ADOPTION de ce message » ; l'adoption n'est pas une parole de Ko hors dépôt, et D342 l'écrira comme telle.")
v("5.3", "R-1 : « rejoué sur la fusion typecheck 0, lint 0, test 0 (2 601 tests…), build 0 » par le relecteur", "?", "mesure du relecteur, dans le chat ; la session ne la reprend PAS : elle rejoue les six portes après la fusion (2.3 ne vérifie que l'arithmétique).")
v("5.4", "§ 4 : « sur la base de dev de Ko, migrations appliquées par Ko (geste 0) » — la migration de D341 est-elle celle visée ?", "≈" if trouve(TEXTES[CONT], r"la migration n'y est pas appliquée \(S-129\)") and existe(SHA_BASE, "apps/api/prisma/migrations/20261104170000_staff_layer/migration.sql") else "✗",
  f"{CONT} : « la migration n'y est pas appliquée (S-129) » : {len(trouve(TEXTES[CONT], r'la migration n.y est pas appliquée \(S-129\)'))} occurrence ; `20261104170000_staff_layer/migration.sql` existe à {SHA_BASE} : {existe(SHA_BASE, 'apps/api/prisma/migrations/20261104170000_staff_layer/migration.sql')}. "
  "⚠ Inférence, non mesurée : AGENTS dit que le garde du personnel relit `pro_profiles.staff_layer_enabled_at` À CHAQUE requête d'un PRO — sans la migration, les gestes qui passent par l'application Pro ne pourraient pas s'ouvrir ; le geste 0 est donc le premier de la liste, et il est une écriture de Ko.")
v("5.5", "§ 5 : « RANG 46 : EN ATTENTE DE CADRAGE DU RELECTEUR » (candidat L36-3a-2, avec S-104 que D341 n'a pas codée)", "✓" if trouve(TEXTES[AGENTS], r"S-104 n'est PAS codée") else "✗",
  f"AGENTS « S-104 n'est PAS codée » : {len(trouve(TEXTES[AGENTS], r'S-104 n.est PAS codée'))} occurrence")

# ───────────────────────── SORTIE ─────────────────────────
ordre_v = {"✗": 0, "≈": 1, "?": 2, "✓": 3}
n = {k: sum(1 for r in R if r[0] == k) for k in "✓≈✗?"}
lignes = []
lignes.append(f"LECTURE ADVERSE DE LA CONSIGNE DU RANG 45 (INTÉGRATION DE front-client) — D342 — instrument confronter-consigne.py, SHA de base {SHA_BASE}, pointe de branche {SHA_BRANCHE}")
lignes.append("calibration (six cas, deux bras chacun, ABANDON si un cas manque son verdict) :" + " ; ".join(f"{nom} → vrai:{p} faux:{ng}" for nom, p, ng, ok in cal))
lignes.append("")
lignes.append("══ PREMIÈRE PARTIE — COURTE ══")
lignes.append(f"{len(R)} contrôles parcourus : {n['✓']} ✓ · {n['≈']} ≈ (imprécis ou en tension, sans arrêt) · {n['✗']} ✗ · {n['?']} ? non vérifiables (attendu : aucun ✗ ; chaque ≈ et chaque ? expliqué en seconde partie)")
lignes.append("")
lignes.append("══ SECONDE PARTIE — EN ENTIER ══")
for verdict, ident, enonce, detail in R:
    lignes.append(f"{verdict} [{ident}] {enonce}")
    lignes.append(f"     ↳ {detail}")
texte = "\n".join(lignes) + "\n"
print(texte, end="")
if "--sortie" in sys.argv:
    chemin = sys.argv[sys.argv.index("--sortie") + 1]
    with open(chemin, "w", encoding="utf-8", newline="\n") as f:
        f.write(texte)
sys.exit(1 if n["✗"] else 0)
