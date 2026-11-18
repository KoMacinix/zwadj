#!/usr/bin/env python3
"""Contrôle de la FUSION de `par-carte` dans `main` — D351 (consigne, §§ 1 et 3 ; R-1).

COPIE ADAPTÉE de `docs/preuves/D342/fusion/controle-fusion.py` (archivée comme PREUVE, jamais promue en instrument — D291). CE QUI CHANGE, et rien d'autre : les SHA (base commune,
départ de `main`, pointe de `par-carte`), la liste A (155 chemins au lieu de 440), les TROIS fichiers modifiés des deux côtés (`apps/client/src/lib/api.ts`, `fr.json`, `ar.json`), les SHA de clôture des six
lots, le compte de commits (21 + 1), et le contrôle A.4 : cette fusion apporte des fichiers sous `apps/api` (le code de la route de carte) et DEUX fichiers de dépendance (`packages/ui/package.json`,
`pnpm-lock.yaml`), et NI migration, NI fichier SQL, NI fichier d'autorité.

DEUX MODES, depuis la RACINE, lecture seule (aucun fichier suivi n'est écrit ; `git merge-tree --write-tree` écrit des OBJETS, jamais l'arbre de travail) :
  python3 docs/preuves/D351/fusion/controle-fusion.py --avant [--sortie <chemin>]   # AVANT la fusion : l'arbre PRÉDIT par `git merge-tree` entre HEAD et origin/par-carte (sortie : essai-fusion.txt)
  python3 docs/preuves/D351/fusion/controle-fusion.py --apres [--sortie <chemin>]   # APRÈS la fusion : HEAD est le commit de fusion ; on le confronte à ses deux parents (sortie : controle-fusion.txt)
`--sortie` : UTF-8, LF, écrit par le script lui-même (jamais par redirection du shell — D298). Aucun texte ne traverse un interpréteur : les arguments de `git` sont en LISTE (D289).

POURQUOI IL EXISTE : la fusion passe SANS CONFLIT TEXTUEL (`git merge-tree` code 0), mais trois fichiers sont modifiés des DEUX côtés : une fusion textuelle propre peut être fausse (une clé perdue, une
fonction dupliquée). Ce contrôle dit, pour ces trois fichiers, si le résultat contient TOUT ce que chaque côté a ajouté ou modifié et RIEN de ce qu'un côté a retiré — et, en mode `--apres`, que le commit de
fusion n'a reçu AUCUNE modification à la main (R-1 : « l'arbre fusionné est IDENTIQUE à celui que `git merge-tree` recalcule seul »).

CE QU'IL PROUVE, ET CE QU'IL NE PROUVE PAS : l'absence de perte et de doublon dans trois fichiers, et l'identité entre l'arbre de la fusion et l'arbre que `git` calcule seul. Il ne prouve PAS que le résultat
FONCTIONNE (c'est le rôle des six portes, après) ni l'absence de conflit SÉMANTIQUE ailleurs.

CALIBRATION (D286 : deux bras, ABANDON si un cas manque son verdict) : la vérification des feuilles JSON et celle des lignes d'un fichier TypeScript sont jouées sur les MÊMES données avec un résultat VRAI (le calcul de `git`) et deux
résultats FAUX connus (le côté `main` seul, qui perd les ajouts de la branche ; le côté branche seul, qui perd ceux de `main`) : le premier doit être accepté, les deux autres REFUSÉS.
"""
import json
import re
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

MODE = "--apres" if "--apres" in sys.argv else ("--avant" if "--avant" in sys.argv else None)
if MODE is None:
    sys.exit("usage : controle-fusion.py (--avant | --apres) [--sortie <chemin>]")

BASE = "26ad5c77ec03a73d82e92368f7d97c4beac7556f"
MAIN_DEPART = "5951b2cbee9fad52cdec5ddcbecf52d96a4d5e35"
BRANCHE = "7fdc67961727a3280f8e2210594ba507a0fbfb97"
FR_JSON, AR_JSON, API_TS = "packages/i18n/messages/fr.json", "packages/i18n/messages/ar.json", "apps/client/src/lib/api.ts"
PARTAGES = (AR_JSON, FR_JSON, API_TS)
# les SHA de clôture des six lots, lus dans le BILAN de la branche (§ 1) : ab0a14e (CA-1), a86ad43 (CA-2), 7eecdfa (CA-3), e22c7e5 (CA-4), 9ab5cf2 (CA-5), 4a18f4a (CA-6)
SHA_LOTS = ("ab0a14e", "a86ad43", "7eecdfa", "e22c7e5", "9ab5cf2", "4a18f4a")
DEPENDANCES_ATTENDUES = ["packages/ui/package.json", "pnpm-lock.yaml"]
TABLE = "docs/preuves/D351/table-ouverture.md"


def git(*args):
    r = subprocess.run(["git", *args], capture_output=True, encoding="utf-8", errors="replace")
    return r.stdout


def rc(*args):
    return subprocess.run(["git", *args], capture_output=True).returncode


def show(rev, chemin):
    return git("show", f"{rev}:{chemin}")


ABSENT = object()


def feuilles(texte):
    """JSON → {chemin pointé : valeur de feuille}."""
    sortie = {}

    def marche(x, prefixe):
        if isinstance(x, dict):
            for k, v in x.items():
                marche(v, f"{prefixe}.{k}" if prefixe else k)
        else:
            sortie[prefixe] = x

    marche(json.loads(texte), "")
    return sortie


def verifier_json(base, cote_main, cote_branche, resultat):
    """Retourne (problèmes, compte-rendu). Règle : pour chaque feuille, si UN côté l'a changée (ajout, modification, retrait) par rapport à la base, le résultat porte la valeur de CE côté ;
    si les DEUX l'ont changée, elles doivent être identiques (sinon c'est un conflit sémantique que `git` aurait dû refuser) ; si aucun, la valeur de la base."""
    B, M, R, X = feuilles(base), feuilles(cote_main), feuilles(cote_branche), feuilles(resultat)
    problemes, vus = [], 0
    for p in sorted(set(B) | set(M) | set(R) | set(X)):
        vus += 1
        b, m, r, x = B.get(p, ABSENT), M.get(p, ABSENT), R.get(p, ABSENT), X.get(p, ABSENT)
        change_m, change_r = m != b, r != b
        if change_m and change_r and m != r:
            problemes.append((p, "CONFLIT SÉMANTIQUE (les deux côtés ont changé la feuille, différemment)"))
            continue
        attendu = m if change_m else (r if change_r else b)
        if x != attendu:
            problemes.append((p, f"résultat {'absent' if x is ABSENT else 'présent'} ≠ attendu {'absent' if attendu is ABSENT else 'présent'}"))
    cr = {
        "feuilles parcourues (union des quatre états)": vus,
        "base": len(B), "main": len(M), "branche": len(R), "résultat": len(X),
        "ajoutées par main": len(set(M) - set(B)), "ajoutées par la branche": len(set(R) - set(B)),
        "retirées par main": len(set(B) - set(M)), "retirées par la branche": len(set(B) - set(R)),
        "modifiées par main": sum(1 for p in B if p in M and M[p] != B[p]), "modifiées par la branche": sum(1 for p in B if p in R and R[p] != B[p]),
    }
    return problemes, cr


def lignes(texte):
    return [l.rstrip() for l in texte.splitlines() if l.strip()]


def verifier_ts(base, cote_main, cote_branche, resultat):
    B, M, R, X = lignes(base), lignes(cote_main), lignes(cote_branche), lignes(resultat)
    sB, sM, sR, sX = set(B), set(M), set(R), set(X)
    problemes = []
    for l in sorted((sM - sB) | (sR - sB)):
        if l not in sX:
            problemes.append((l[:90], "ligne AJOUTÉE par un côté, ABSENTE du résultat"))
    for l in sorted((sB - sM) | (sB - sR)):
        if l in sX:
            problemes.append((l[:90], "ligne RETIRÉE par un côté, PRÉSENTE dans le résultat"))
    # un doublon = une ligne qui n'existe qu'une fois dans chaque côté et plusieurs fois dans le résultat (les lignes courtes — accolades, `}` — se répètent légitimement)
    doublons = {l for l in X if len(l.strip()) > 24 and X.count(l) > max(B.count(l), M.count(l), R.count(l), 1)}
    for l in sorted(doublons):
        problemes.append((l[:90], f"ligne présente {X.count(l)} fois (plus que dans chaque côté : doublon)"))
    cr = {
        "lignes non vides parcourues (résultat)": len(X), "base": len(B), "main": len(M), "branche": len(R),
        "ajoutées par main": len(sM - sB), "ajoutées par la branche": len(sR - sB),
        "retirées par main": len(sB - sM), "retirées par la branche": len(sB - sR),
    }
    return problemes, cr


# ───────────────────────── CALIBRATION, DEUX BRAS ─────────────────────────
cal = []


def calibre(nom, accepte_vrai, refuse_faux1, refuse_faux2):
    ok = accepte_vrai and refuse_faux1 and refuse_faux2
    cal.append((nom, accepte_vrai, refuse_faux1, refuse_faux2, ok))
    if not ok:
        sys.exit(f"CALIBRATION RATÉE — {nom} : résultat vrai accepté={accepte_vrai} (attendu True), côté-main-seul refusé={refuse_faux1} (attendu True), côté-branche-seul refusé={refuse_faux2} (attendu True). ABANDON, rien n'a été jugé.")


# prédiction de git, via merge-tree entre le départ de main et la pointe de la branche (un état qui ne dépend pas de HEAD)
mt0 = subprocess.run(["git", "merge-tree", "--write-tree", MAIN_DEPART, BRANCHE], capture_output=True, encoding="utf-8", errors="replace")
arbre0 = mt0.stdout.splitlines()[0] if mt0.stdout.strip() else ""
if mt0.returncode != 0 or len(arbre0) != 40:
    sys.exit(f"git merge-tree (départ de main, branche) a rendu le code {mt0.returncode} : conflit ou erreur, rien n'est jugé.")
B_, M_, R_, X0 = show(BASE, AR_JSON), show(MAIN_DEPART, AR_JSON), show(BRANCHE, AR_JSON), show(arbre0, AR_JSON)
calibre("feuilles JSON (ar.json)", not verifier_json(B_, M_, R_, X0)[0], bool(verifier_json(B_, M_, R_, M_)[0]), bool(verifier_json(B_, M_, R_, R_)[0]))
Bt, Mt, Rt, Xt = show(BASE, API_TS), show(MAIN_DEPART, API_TS), show(BRANCHE, API_TS), show(arbre0, API_TS)
calibre("lignes de api.ts", not verifier_ts(Bt, Mt, Rt, Xt)[0], bool(verifier_ts(Bt, Mt, Rt, Mt)[0]), bool(verifier_ts(Bt, Mt, Rt, Rt)[0]))

# ───────────────────────── LE CONTRÔLE ─────────────────────────
L = []
verdict = []


def ligne(txt=""):
    L.append(txt)


def v(ident, enonce, ok, detail):
    verdict.append((ident, ok))
    ligne(f"{'✓' if ok else '✗'} [{ident}] {enonce}")
    ligne(f"     ↳ {detail}")


tete = git("rev-parse", "HEAD").strip()
t = show("HEAD", TABLE)
m = re.search(r"## A\. .*?```\n(.*?)\n```", t, re.S)
liste_table = m.group(1).splitlines() if m else []

if MODE == "--avant":
    parent1, parent2 = tete, BRANCHE
    mt = subprocess.run(["git", "merge-tree", "--write-tree", parent1, parent2], capture_output=True, encoding="utf-8", errors="replace")
    arbre = mt.stdout.splitlines()[0] if mt.stdout.strip() else ""
    resultat_rev = arbre
    titre = f"AVANT la fusion — HEAD = {tete[:12]} (premier parent), {BRANCHE[:12]} (second parent)"
    v("A.1", "`git merge-tree --write-tree HEAD origin/par-carte` rend le code 0 (aucun conflit textuel) et un arbre", mt.returncode == 0 and len(arbre) == 40,
      f"code {mt.returncode}, arbre prédit {arbre[:12]}, lignes après l'arbre : {len(mt.stdout.splitlines()) - 1} (aucune ligne de conflit attendue)")
    seul_main = set(git("diff", "--name-only", BASE, tete).splitlines())
    diff_fusion = set(git("diff", "--name-only", tete, arbre).splitlines())
else:
    if len(git("rev-list", "--parents", "-n", "1", "HEAD").split()) != 3:
        sys.exit("HEAD n'est pas un commit de fusion à deux parents : ce mode se joue APRÈS la fusion.")
    _, parent1, parent2 = git("rev-list", "--parents", "-n", "1", "HEAD").split()
    resultat_rev = "HEAD"
    titre = f"APRÈS la fusion — HEAD = {tete[:12]}, parents {parent1[:12]} et {parent2[:12]}"
    v("A.1", "HEAD est un commit de fusion à DEUX parents, le second est la pointe de `par-carte` (7fdc679…), le premier descend du départ de `main` (5951b2c…)", parent2 == BRANCHE and rc("merge-base", "--is-ancestor", MAIN_DEPART, parent1) == 0,
      f"premier parent {parent1[:12]} (descendant de {MAIN_DEPART[:7]} : {rc('merge-base', '--is-ancestor', MAIN_DEPART, parent1) == 0}), second parent {parent2[:12]} (attendu {BRANCHE[:12]})")
    rejoue = subprocess.run(["git", "merge-tree", "--write-tree", parent1, parent2], capture_output=True, encoding="utf-8", errors="replace")
    arbre_rejoue = rejoue.stdout.splitlines()[0] if rejoue.stdout.strip() else ""
    arbre_head = git("rev-parse", "HEAD^{tree}").strip()
    v("A.2", "AUCUNE MODIFICATION À LA MAIN : l'arbre du commit de fusion = l'arbre que `git merge-tree` recalcule seul entre ses deux parents (R-1)", arbre_rejoue == arbre_head and rejoue.returncode == 0,
      f"arbre de HEAD {arbre_head[:12]} ; arbre rejoué {arbre_rejoue[:12]} (code {rejoue.returncode}) ; identiques : {arbre_rejoue == arbre_head}")
    seul_main = set(git("diff", "--name-only", BASE, parent1).splitlines())
    diff_fusion = set(git("diff", "--name-only", parent1, "HEAD").splitlines())

# fichiers : ce que la fusion apporte à main = la liste A de la table
nom_liste = set(liste_table)
v("A.3", "les fichiers que la fusion apporte à main (diff entre le premier parent et le résultat) sont EXACTEMENT les 155 de la liste A de la table", diff_fusion == nom_liste and len(nom_liste) == 155,
  f"liste A de la table : {len(nom_liste)} chemins ; diff premier parent → résultat : {len(diff_fusion)} chemins ; dans le diff et pas dans la liste : {sorted(diff_fusion - nom_liste)[:5]} ; dans la liste et pas dans le diff : {sorted(nom_liste - diff_fusion)[:5]}")

autorite = sorted(f for f in diff_fusion if re.search(r"(^|/)(AGENTS|CLAUDE)\.md$|ZWADJ_", f))
migrations = sorted(f for f in diff_fusion if f.startswith("apps/api/prisma") or "migrations" in f or f.endswith(".sql"))
dependances = sorted(f for f in diff_fusion if f.endswith("package.json") or f.endswith("pnpm-lock.yaml"))
v("A.4", "la fusion n'apporte AUCUN fichier d'autorité, AUCUNE migration, AUCUN fichier SQL, et EXACTEMENT deux fichiers de dépendance (`packages/ui/package.json`, `pnpm-lock.yaml`)", not autorite and not migrations and dependances == DEPENDANCES_ATTENDUES,
  f"{len(diff_fusion)} chemins parcourus ; d'autorité : {autorite} ; migration/sql : {migrations} ; dépendances : {dependances} (attendu {DEPENDANCES_ATTENDUES})")

# les fichiers modifiés des deux côtés
deux_cotes = sorted(seul_main & nom_liste)
v("A.5", "les fichiers modifiés des DEUX côtés (par `main` depuis la base ET par la branche) sont exactement les trois attendus", deux_cotes == sorted(PARTAGES),
  f"intersection mesurée ({len(seul_main)} fichiers de main depuis la base ∩ {len(nom_liste)} de la branche) : {deux_cotes}")

for i, chemin in enumerate(PARTAGES, start=1):
    b, mm, r, x = show(BASE, chemin), show(MAIN_DEPART, chemin), show(BRANCHE, chemin), show(resultat_rev, chemin)
    if chemin.endswith(".json"):
        pb, cr = verifier_json(b, mm, r, x)
        v(f"B.{i}", f"`{chemin}` : le résultat porte TOUT ce que chaque côté a ajouté ou modifié et RIEN de ce qu'un côté a retiré", not pb,
          f"{cr} ; problèmes : {len(pb)} (attendu 0)" + (f" — premiers : {pb[:3]}" if pb else ""))
    else:
        pb, cr = verifier_ts(b, mm, r, x)
        v(f"B.{i}", f"`{chemin}` : le résultat porte TOUT ce que chaque côté a ajouté, RIEN de ce qu'un côté a retiré, et aucun doublon", not pb,
          f"{cr} ; problèmes : {len(pb)} (attendu 0)" + (f" — premiers : {pb[:3]}" if pb else ""))

# parité FR/AR sur le résultat, et le total attendu : main + les ajouts de la branche
fr, ar = feuilles(show(resultat_rev, FR_JSON)), feuilles(show(resultat_rev, AR_JSON))
fr_main, fr_branche, fr_base = feuilles(show(MAIN_DEPART, FR_JSON)), feuilles(show(BRANCHE, FR_JSON)), feuilles(show(BASE, FR_JSON))
attendu_total = len(fr_main) + len(set(fr_branche) - set(fr_base))
v("B.4", "parité FR/AR du résultat : les mêmes feuilles de chaque côté, et un total égal à celui de `main` plus les ajouts de la branche", set(fr) == set(ar) and len(fr) == attendu_total,
  f"feuilles fr : {len(fr)}, ar : {len(ar)} ; attendu = {len(fr_main)} (main) + {len(set(fr_branche) - set(fr_base))} (ajoutées par la branche) = {attendu_total} ; dans fr et pas dans ar : {sorted(set(fr) - set(ar))[:3]} ; dans ar et pas dans fr : {sorted(set(ar) - set(fr))[:3]}")

if MODE == "--apres":
    ancetres = {s: rc("merge-base", "--is-ancestor", s, "HEAD") == 0 for s in SHA_LOTS + (BRANCHE[:7],)}
    v("C.1", "la fusion GARDE les SHA de la branche : les six SHA de clôture des lots et la pointe sont tous ancêtres de HEAD (R-1 : ni rebase ni squash)", all(ancetres.values()),
      f"{sum(ancetres.values())} ancêtres sur {len(ancetres)} SHA testés ; non ancêtres : {[s for s, ok in ancetres.items() if not ok]}")
    nouveaux = int(git("rev-list", "--count", f"{parent1}..HEAD").strip())
    v("C.2", "la fusion apporte à main EXACTEMENT les 21 commits de la branche, plus le commit de fusion", nouveaux == 22,
      f"`git rev-list --count {parent1[:7]}..HEAD` = {nouveaux} (attendu 21 + 1 = 22)")
    v("C.3", "la pointe de la branche n'a pas bougé (origin/par-carte = 7fdc679…) : la branche est GARDÉE, pas supprimée", git("rev-parse", "origin/par-carte").strip() == BRANCHE,
      f"origin/par-carte = {git('rev-parse', 'origin/par-carte').strip()[:12]}")

ligne()
ok_tout = all(ok for _, ok in verdict)
entete = [
    f"CONTRÔLE DE LA FUSION — D351 — {titre}",
    "calibration (deux bras par vérification, abandon si un cas manque son verdict) : " + " ; ".join(f"{nom} → vrai accepté:{a} · main seul refusé:{b} · branche seule refusée:{c}" for nom, a, b, c, _ in cal),
    f"{len(verdict)} contrôles parcourus : {sum(1 for _, ok in verdict if ok)} ✓ · {sum(1 for _, ok in verdict if not ok)} ✗ (attendu : 0 ✗)",
    "",
]
texte = "\n".join(entete + L) + "\n"
print(texte, end="")
if "--sortie" in sys.argv:
    with open(sys.argv[sys.argv.index("--sortie") + 1], "w", encoding="utf-8", newline="\n") as f:
        f.write(texte)
sys.exit(0 if ok_tout else 1)
