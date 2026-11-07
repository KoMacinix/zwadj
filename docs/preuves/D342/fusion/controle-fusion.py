#!/usr/bin/env python3
"""Contrôle de la FUSION de `front-client` dans `main` — D342 (consigne, §§ 3 et 5 ; R-3).

DEUX MODES, depuis la RACINE, lecture seule (aucun fichier suivi n'est écrit ; `git merge-tree --write-tree` écrit des OBJETS, jamais l'arbre de travail) :
  python3 docs/preuves/D342/fusion/controle-fusion.py --avant [--sortie <chemin>]   # AVANT la fusion : l'arbre PRÉDIT par `git merge-tree` entre HEAD et origin/front-client
  python3 docs/preuves/D342/fusion/controle-fusion.py --apres [--sortie <chemin>]   # APRÈS la fusion : HEAD est le commit de fusion ; on le confronte à ses deux parents
`--sortie` : UTF-8, LF, écrit par le script lui-même (jamais par redirection du shell — D298). Aucun texte ne traverse un interpréteur : les arguments de `git` sont en LISTE (D289).

POURQUOI IL EXISTE : la fusion passe SANS CONFLIT TEXTUEL (`git merge-tree` code 0), mais trois fichiers sont modifiés des DEUX côtés (`packages/i18n/messages/ar.json`, `fr.json`,
`packages/types/src/index.ts`) : une fusion textuelle propre peut être fausse (une clé perdue, un export qui vise un module absent). Ce contrôle dit, pour ces trois fichiers, si le résultat contient
TOUT ce que chaque côté a ajouté ou modifié et RIEN de ce qu'un côté a retiré — et, en mode `--apres`, que le commit de fusion n'a reçu AUCUNE modification à la main (« aucune ligne de code neuve »).

CE QU'IL PROUVE, ET CE QU'IL NE PROUVE PAS : il prouve l'absence de perte et de doublon dans trois fichiers, et l'identité entre l'arbre de la fusion et l'arbre que `git` calcule seul. Il ne prouve PAS
que le résultat FONCTIONNE (c'est le rôle des six portes, après) ni que la fusion soit sans conflit SÉMANTIQUE ailleurs (un renommage d'un côté, un usage de l'ancien nom de l'autre : les portes).

CALIBRATION (D286 : deux bras, ABANDON si un cas manque son verdict) : la vérification des feuilles JSON et celle des lignes de `index.ts` sont jouées sur les MÊMES données avec un résultat VRAI
(le calcul de `git`) et deux résultats FAUX connus (le côté `main` seul, qui perd les ajouts de la branche ; le côté branche seul, qui perd ceux de `main`) : le premier doit être accepté, les deux autres REFUSÉS.
Sans cela « 0 problème » serait vrai de n'importe quel résultat (un zéro sur zéro élément parcouru, D290).
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

BASE = "e40c14150881716448afc0a94334556370641716"
MAIN_DEPART = "d44867a94f90e9544c5e7fe6b6a56c0c91caea36"
BRANCHE = "43996e279f49bff19792b4e27cfec4bb59b66177"
PARTAGES = ("packages/i18n/messages/ar.json", "packages/i18n/messages/fr.json", "packages/types/src/index.ts")
SHA_BILAN = ("1e6426f", "5f95ba3", "7113356", "470dfe1", "e537bb1", "b595bde", "06261c3", "a2d96f0", "f4c9256", "669cdae", "eb98ee7", "01f3c25", "aec8141", "8fb0296", "8432070", "bcb51fd", "fd9dac0", "73919ff")
TABLE = "docs/preuves/D342/table-ouverture.md"


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
            attendu = "CONFLIT SÉMANTIQUE (les deux côtés ont changé la feuille, différemment)"
            problemes.append((p, attendu))
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
    doubles = {l for l in X if X.count(l) > 1}
    for l in sorted(doubles):
        problemes.append((l[:90], f"ligne présente {X.count(l)} fois (doublon)"))
    cr = {
        "lignes non vides parcourues (résultat)": len(X), "base": len(B), "main": len(M), "branche": len(R),
        "ajoutées par main": len(sM - sB), "ajoutées par la branche": len(sR - sB),
        "retirées par main": len(sB - sM), "retirées par la branche": len(sB - sR),
    }
    return problemes, cr


# ───────────────────────── CALIBRATION, DEUX BRAS ─────────────────────────
B_ = show(BASE, PARTAGES[0])
M_ = show(MAIN_DEPART, PARTAGES[0])
R_ = show(BRANCHE, PARTAGES[0])
cal = []


def calibre(nom, accepte_vrai, refuse_faux1, refuse_faux2):
    ok = accepte_vrai and refuse_faux1 and refuse_faux2
    cal.append((nom, accepte_vrai, refuse_faux1, refuse_faux2, ok))
    if not ok:
        sys.exit(f"CALIBRATION RATÉE — {nom} : résultat vrai accepté={accepte_vrai} (attendu True), côté-main-seul refusé={refuse_faux1} (attendu True), côté-branche-seul refusé={refuse_faux2} (attendu True). ABANDON, rien n'a été jugé.")


# prédiction de git pour le fichier de calibration, via merge-tree entre le départ de main et la pointe de la branche (un état qui ne dépend pas de HEAD)
mt0 = subprocess.run(["git", "merge-tree", "--write-tree", MAIN_DEPART, BRANCHE], capture_output=True, encoding="utf-8", errors="replace")
arbre0 = mt0.stdout.splitlines()[0] if mt0.stdout.strip() else ""
if mt0.returncode != 0 or len(arbre0) != 40:
    sys.exit(f"git merge-tree (départ de main, branche) a rendu le code {mt0.returncode} : conflit ou erreur, rien n'est jugé.")
X0_json = show(arbre0, PARTAGES[0])
calibre("feuilles JSON (ar.json)", not verifier_json(B_, M_, R_, X0_json)[0], bool(verifier_json(B_, M_, R_, M_)[0]), bool(verifier_json(B_, M_, R_, R_)[0]))
Bt, Mt, Rt = show(BASE, PARTAGES[2]), show(MAIN_DEPART, PARTAGES[2]), show(BRANCHE, PARTAGES[2])
X0_ts = show(arbre0, PARTAGES[2])
calibre("lignes de index.ts", not verifier_ts(Bt, Mt, Rt, X0_ts)[0], bool(verifier_ts(Bt, Mt, Rt, Mt)[0]), bool(verifier_ts(Bt, Mt, Rt, Rt)[0]))

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
liste_table = None
t = show("HEAD", TABLE)
m = re.search(r"## A\. .*?```\n(.*?)\n```", t, re.S)
liste_table = m.group(1).splitlines() if m else []

if MODE == "--avant":
    parent1, parent2 = tete, BRANCHE
    mt = subprocess.run(["git", "merge-tree", "--write-tree", parent1, parent2], capture_output=True, encoding="utf-8", errors="replace")
    arbre = mt.stdout.splitlines()[0] if mt.stdout.strip() else ""
    resultat_rev = arbre
    titre = f"AVANT la fusion — HEAD = {tete[:12]} (premier parent), {BRANCHE[:12]} (second parent)"
    v("A.1", "`git merge-tree --write-tree HEAD origin/front-client` rend le code 0 (aucun conflit textuel) et un arbre", mt.returncode == 0 and len(arbre) == 40,
      f"code {mt.returncode}, arbre prédit {arbre[:12]}, lignes après l'arbre : {len(mt.stdout.splitlines()) - 1} (aucune ligne de conflit attendue)")
    seul_main = set(git("diff", "--name-only", BASE, tete).splitlines())
    diff_fusion = set(git("diff", "--name-only", tete, arbre).splitlines())
else:
    if len(git("rev-list", "--parents", "-n", "1", "HEAD").split()) != 3:
        sys.exit("HEAD n'est pas un commit de fusion à deux parents : ce mode se joue APRÈS la fusion.")
    _, parent1, parent2 = git("rev-list", "--parents", "-n", "1", "HEAD").split()
    resultat_rev = "HEAD"
    titre = f"APRÈS la fusion — HEAD = {tete[:12]}, parents {parent1[:12]} et {parent2[:12]}"
    v("A.1", "HEAD est un commit de fusion à DEUX parents, le second est la pointe de `front-client` (43996e2…), le premier le dernier commit de `main` du lot", parent2 == BRANCHE and rc("merge-base", "--is-ancestor", MAIN_DEPART, parent1) == 0,
      f"premier parent {parent1[:12]} (descendant de {MAIN_DEPART[:7]} : {rc('merge-base', '--is-ancestor', MAIN_DEPART, parent1) == 0}), second parent {parent2[:12]} (attendu {BRANCHE[:12]})")
    rejoue = subprocess.run(["git", "merge-tree", "--write-tree", parent1, parent2], capture_output=True, encoding="utf-8", errors="replace")
    arbre_rejoue = rejoue.stdout.splitlines()[0] if rejoue.stdout.strip() else ""
    arbre_head = git("rev-parse", "HEAD^{tree}").strip()
    v("A.2", "AUCUNE MODIFICATION À LA MAIN : l'arbre du commit de fusion = l'arbre que `git merge-tree` recalcule seul entre ses deux parents", arbre_rejoue == arbre_head and rejoue.returncode == 0,
      f"arbre de HEAD {arbre_head[:12]} ; arbre rejoué {arbre_rejoue[:12]} (code {rejoue.returncode}) ; identiques : {arbre_rejoue == arbre_head} — la fusion n'a reçu aucune ligne écrite à la main (consigne § 3 : « aucune ligne de code neuve »)")
    seul_main = set(git("diff", "--name-only", BASE, parent1).splitlines())
    diff_fusion = set(git("diff", "--name-only", parent1, "HEAD").splitlines())

# fichiers : ce que la fusion apporte à main = la liste A de la table
nom_liste = set(liste_table)
v("A.3", "les fichiers que la fusion apporte à main (diff entre le premier parent et le résultat) sont EXACTEMENT les 440 de la liste A de la table", diff_fusion == nom_liste and len(nom_liste) == 440,
  f"liste A de la table : {len(nom_liste)} chemins ; diff premier parent → résultat : {len(diff_fusion)} chemins ; dans le diff et pas dans la liste : {sorted(diff_fusion - nom_liste)[:5]} ; dans la liste et pas dans le diff : {sorted(nom_liste - diff_fusion)[:5]}")

autorite = [f for f in diff_fusion if re.search(r"(^|/)(AGENTS|CLAUDE)\.md$|ZWADJ_", f)]
sans_api = [f for f in diff_fusion if f.startswith("apps/api/") or "migrations" in f or f.endswith(".sql") or f.endswith("package.json") or f.endswith("pnpm-lock.yaml")]
v("A.4", "la fusion n'apporte AUCUN fichier d'autorité, d'`apps/api`, de migration, de SQL ni de dépendance", not autorite and not sans_api,
  f"{len(diff_fusion)} chemins parcourus ; d'autorité : {autorite} ; api/migration/sql/dépendance : {sans_api}")

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
        modules = re.findall(r'from\s+"\./([\w./-]+)"', x)
        absents = [mod for mod in modules if rc("cat-file", "-e", f"{resultat_rev}:packages/types/src/{mod}.ts") != 0 and rc("cat-file", "-e", f"{resultat_rev}:packages/types/src/{mod}/index.ts") != 0]
        v(f"B.{i}", f"`{chemin}` : le résultat porte TOUT ce que chaque côté a ajouté, RIEN de ce qu'un côté a retiré, aucun doublon, et chaque module exporté existe", not pb and not absents,
          f"{cr} ; problèmes : {len(pb)} (attendu 0) ; modules `from \"./…\"` du résultat : {len(modules)} parcourus, absents du résultat : {absents} (attendu []); " + (f"premiers problèmes : {pb[:3]}" if pb else ""))

# parité FR/AR sur le résultat
fr, ar = feuilles(show(resultat_rev, PARTAGES[1])), feuilles(show(resultat_rev, PARTAGES[0]))
v("B.4", "parité FR/AR du résultat : les mêmes feuilles de chaque côté", set(fr) == set(ar),
  f"feuilles fr : {len(fr)}, ar : {len(ar)} ; dans fr et pas dans ar : {sorted(set(fr) - set(ar))[:3]} ; dans ar et pas dans fr : {sorted(set(ar) - set(fr))[:3]}")

if MODE == "--apres":
    ancetres = {s: rc("merge-base", "--is-ancestor", s, "HEAD") == 0 for s in SHA_BILAN + (BRANCHE[:7],)}
    v("C.1", "la fusion GARDE les SHA de la branche : les 18 SHA du BILAN et la pointe sont tous ancêtres de HEAD (R-3 : ni rebase ni squash)", all(ancetres.values()),
      f"{sum(ancetres.values())} ancêtres sur {len(ancetres)} SHA testés ; non ancêtres : {[s for s, ok in ancetres.items() if not ok]}")
    nouveaux = int(git("rev-list", "--count", f"{parent1}..HEAD").strip())
    v("C.2", "la fusion apporte à main EXACTEMENT les 107 commits de la branche, plus le commit de fusion", nouveaux == 108,
      f"`git rev-list --count {parent1[:7]}..HEAD` = {nouveaux} (attendu 107 + 1 = 108)")
    v("C.3", "la pointe de la branche n'a pas bougé (origin/front-client = 43996e2…), la branche n'est pas supprimée", git("rev-parse", "origin/front-client").strip() == BRANCHE,
      f"origin/front-client = {git('rev-parse', 'origin/front-client').strip()[:12]}")

ligne()
ok_tout = all(ok for _, ok in verdict)
entete = [
    f"CONTRÔLE DE LA FUSION — D342 — {titre}",
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
