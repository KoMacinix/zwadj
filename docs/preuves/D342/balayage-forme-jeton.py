#!/usr/bin/env python3
"""Balayage de la FORME d'un jeton réel sur les fichiers qu'une fusion apporte — D342 (consigne § 3 : « l'audit couvre tout docs/preuves/front-client/ »).

MODE D'EMPLOI, depuis la RACINE, lecture seule :
  python3 -I docs/preuves/D342/balayage-forme-jeton.py <rev-du-contenu> <diff> [--sortie <chemin>]
  · les fichiers = `git diff --name-only <diff>` (UN seul argument : `A...B` ou `A..B`) ; le contenu de chacun = `git show <rev-du-contenu>:<chemin>`.
  · AVANT la fusion : `… origin/front-client origin/main...origin/front-client`  (le contenu de la branche, les 440 fichiers de la liste A)
  · APRÈS la fusion : `… HEAD HEAD^1..HEAD`
  python3 -I docs/preuves/D342/balayage-forme-jeton.py --historique <plage> [--sortie <chemin>]     # ex. `e40c141..origin/front-client`
  · MODE HISTORIQUE : lit les lignes AJOUTÉES (`+`) de chaque patch de `git log -p <plage>` — ce que la fusion importe dans l'HISTOIRE de `main`, états intermédiaires compris (le premier mode ne lit
    que l'état final de chaque fichier).
`--sortie` : UTF-8, LF, écrit par le script lui-même (jamais par redirection du shell — D298). Aucun texte ne traverse un interpréteur (D289). **Aucune valeur n'est imprimée** : seules la position
(chemin:ligne ou commit) et la TAILLE de la suite trouvée s'impriment, avec la ligne dont la suite est remplacée par `<N car.>`.

POURQUOI IL EXISTE : `neutralisation/audit-secrets.py` (D298) trouve les formes `token=…` et onze autres ; sa sortie TRIE les alertes au contexte, ce qui repose sur le jugement de qui lit. Ce balayage est
l'AUTRE regard, mécanique : la forme exacte d'un jeton opaque de ce dépôt — 43 caractères base64url mêlant minuscules, majuscules et chiffres (`TokenService.generate`, 256 bits ; la même que
`docs/preuves/D341/portes/masquer-jetons.py`) — cherchée dans CHAQUE fichier texte, qu'elle soit précédée de `token=` ou non, et la forme `token=` suivie de 16 caractères ou plus. Un jeton réel collé sans
son `token=` (dans une capture, un en-tête, une URL tronquée) échappe au motif de l'audit et pas à celui-ci.
⚠ CE QU'IL NE PROUVE PAS : l'absence de la FORME, pas l'absence de TOUT secret (une clé d'un autre format, un mot de passe en clair) — c'est le travail des onze motifs de l'audit. Et le contrôle dédié « 0 valeur
réelle » (D299) cherche des VALEURS d'un journal nommé : les journaux bruts de la branche (sur la machine cloud) n'existent pas sur ce poste, il ne peut donc pas les chercher ; ce balayage est ce qui reste.

CALIBRATION (D286 : deux bras, ABANDON si un cas manque son verdict) : (positif) un texte fabriqué portant une suite de forme jeton ET un `token=` suivi de 43 caractères est VU ; (négatif) une suite de 42
caractères, une suite de 43 sans chiffre, une de 43 sans majuscule, et un `token=` suivi de 8 caractères NE SONT PAS vus. Mode historique, en plus : dans un patch fabriqué, la suite AJOUTÉE (`+`) est vue,
la suite RETIRÉE (`-`) et celle en contexte (espace) ne le sont pas — une suite retirée n'entre pas dans l'histoire de `main`.
"""
import re
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

JETON = re.compile(r"(?<![A-Za-z0-9_-])[A-Za-z0-9_-]{43}(?![A-Za-z0-9_-])")
TOKEN_EGAL = re.compile(r"token=([A-Za-z0-9_-]{16,})")


def forme_jeton(s):
    return any(c.islower() for c in s) and any(c.isupper() for c in s) and any(c.isdigit() for c in s)


def chercher(texte):
    """→ liste de (numéro de ligne, taille, ligne masquée, sorte)."""
    trouves = []
    for n, ligne in enumerate(texte.split("\n"), start=1):
        masque = ligne
        hits = []
        for m in JETON.finditer(ligne):
            if forme_jeton(m.group(0)):
                hits.append((m.start(), m.end(), "forme-43"))
        for m in TOKEN_EGAL.finditer(ligne):
            hits.append((m.start(1), m.end(1), "token=16+"))
        for a, b, sorte in sorted(hits, reverse=True):
            masque = masque[:a] + f"<{b - a} car.>" + masque[b:]
        for a, b, sorte in hits:
            trouves.append((n, b - a, masque.strip()[:200], sorte))
    return trouves


def git_octets(*args):
    return subprocess.run(["git", *args], capture_output=True).stdout


# ───────────────────────── CALIBRATION ─────────────────────────
vrai = "aB3" + "x" * 40
cas_positif = chercher(f"une ligne {vrai} fin\nlien http://h/?token={vrai} fin")
cas_neg = chercher("a" * 42 + "\n" + "aBc" + "x" * 40 + "\n" + "abc" + "1" * 40 + "\n" + "token=abcdefgh")
if not (len([t for t in cas_positif if t[3] == "forme-43"]) == 2 and len([t for t in cas_positif if t[3] == "token=16+"]) == 1 and not cas_neg):
    sys.exit(f"CALIBRATION RATÉE — positif {[(t[0], t[1], t[3]) for t in cas_positif]} (attendu 2 forme-43 et 1 token=16+), négatif {[(t[0], t[1], t[3]) for t in cas_neg]} (attendu aucun). ABANDON, rien n'a été balayé.")


def sortir(lignes_texte):
    texte = "\n".join(lignes_texte) + "\n"
    print(texte, end="")
    if "--sortie" in sys.argv:
        with open(sys.argv[sys.argv.index("--sortie") + 1], "w", encoding="utf-8", newline="\n") as f:
            f.write(texte)


# ───────────────────────── MODE HISTORIQUE ─────────────────────────
def balayer_patch(sortie):
    """Lit les lignes AJOUTÉES d'une sortie `git log -p --format="@@COMMIT %H"` → (commits vus, lignes ajoutées, trouvailles)."""
    commit, n_ajout, trouves, commits = None, 0, [], set()
    for ligne in sortie.split("\n"):
        if ligne.startswith("@@COMMIT "):
            commit = ligne[9:].strip()
            commits.add(commit)
            continue
        if ligne.startswith("+") and not ligne.startswith("+++"):
            n_ajout += 1
            for (_, taille, masque, sorte) in chercher(ligne[1:]):
                trouves.append((commit, taille, masque, sorte))
    return commits, n_ajout, trouves


if "--historique" in sys.argv:
    plage = sys.argv[sys.argv.index("--historique") + 1]
    faux_patch = "@@COMMIT c1\n+ligne avec " + vrai + " ajoutée\n-ligne avec " + vrai + " retirée\n ligne avec " + vrai + " en contexte\n+++ b/fichier\n"
    c0, a0, t0 = balayer_patch(faux_patch)
    if not (a0 == 1 and len(t0) == 1 and t0[0][3] == "forme-43" and c0 == {"c1"}):
        sys.exit(f"CALIBRATION DU MODE HISTORIQUE RATÉE — lignes ajoutées {a0} (attendu 1), trouvailles {[(t[1], t[3]) for t in t0]} (attendu 1 forme-43). ABANDON, rien n'a été balayé.")
    nb_commits = len([l for l in git_octets("rev-list", plage).decode("utf-8", errors="replace").splitlines() if l.strip()])
    sortie = git_octets("log", "-p", "--no-color", "--format=@@COMMIT %H", plage).decode("utf-8", errors="replace")
    commits, n_ajout, trouves = balayer_patch(sortie)
    L = [
        f"BALAYAGE DE LA FORME D'UN JETON, MODE HISTORIQUE — D342 — lignes AJOUTÉES des patchs de `git log -p {plage}`",
        "calibration (mode historique : dans un patch fabriqué, la suite AJOUTÉE est VUE, la suite RETIRÉE et celle en contexte NE SONT PAS vues ; forme : mêmes deux bras que le premier mode) tenue",
        f"PARCOURU : {nb_commits} commits dans la plage · {len(commits)} commits lus dans la sortie de `git log -p` · {n_ajout} lignes ajoutées · {len(sortie)} caractères de patch",
        f"TROUVÉ : {len(trouves)} occurrence(s) dans {len({c for c, *_ in trouves})} commit(s)  (attendu : 0)",
    ]
    for c, taille, masque, sorte in trouves[:20]:
        L.append(f"  [{sorte}] commit {c[:12]} ({taille} car.) : {masque}")
    sortir(L)
    sys.exit(0 if not trouves and nb_commits == len(commits) else 1)

# ───────────────────────── MODE ÉTAT FINAL ─────────────────────────
if len(sys.argv) < 3:
    sys.exit("usage : balayage-forme-jeton.py <rev-du-contenu> <diff> [--sortie <chemin>]  |  balayage-forme-jeton.py --historique <plage> [--sortie <chemin>]")
rev_contenu, spec_diff = sys.argv[1], sys.argv[2]

fichiers = [l for l in git_octets("diff", "--name-only", spec_diff).decode("utf-8", errors="replace").splitlines() if l.strip()]
texte_n = binaires = octets = 0
par_fichier = {}
for chemin in fichiers:
    brut = git_octets("show", f"{rev_contenu}:{chemin}")
    if not brut and subprocess.run(["git", "cat-file", "-e", f"{rev_contenu}:{chemin}"], capture_output=True).returncode != 0:
        continue  # fichier supprimé par la fusion : rien à lire
    if b"\x00" in brut[:8000]:
        binaires += 1
        continue
    texte_n += 1
    octets += len(brut)
    t = chercher(brut.decode("utf-8", errors="replace"))
    if t:
        par_fichier[chemin] = t

occ = sum(len(v) for v in par_fichier.values())
f43 = sum(1 for v in par_fichier.values() for t in v if t[3] == "forme-43")
ft = sum(1 for v in par_fichier.values() for t in v if t[3] == "token=16+")
L = [
    f"BALAYAGE DE LA FORME D'UN JETON — D342 — contenu lu à {rev_contenu} ; fichiers = `git diff --name-only {spec_diff}`",
    "calibration (deux bras, abandon si un cas manque son verdict) : positif — 2 suites de forme jeton et 1 `token=` de 43 caractères VUS ; négatif — 42 caractères, 43 sans chiffre, 43 sans majuscule, `token=` de 8 caractères : 0 vu",
    f"PARCOURU : {len(fichiers)} chemins du diff · {texte_n} fichiers texte lus ({octets} octets) · {binaires} binaires sautés · {len(fichiers) - texte_n - binaires} absents du contenu (supprimés par la fusion)",
    f"TROUVÉ : {occ} occurrence(s) dans {len(par_fichier)} fichier(s) — forme 43 caractères mixtes : {f43} · `token=` + 16 caractères ou plus : {ft}  (attendu : 0 · 0)",
]
for chemin, v in sorted(par_fichier.items()):
    for n, taille, ligne, sorte in v[:5]:
        L.append(f"  [{sorte}] {chemin}:{n} ({taille} car.) : {ligne}")
sortir(L)
sys.exit(0 if occ == 0 else 1)
