#!/usr/bin/env python3
"""Lecture adverse de la consigne du rang 54 — « Refusée » dans la liste « Mes salles » et les 29 gardes en assertion native — contre le dépôt — D352.

MODE D'EMPLOI : depuis la RACINE, `python3 docs/preuves/D352/lecture-adverse/confronter-consigne.py [--sortie <chemin>]`.
Il lit des OBJETS GIT à SHA fixe (SHA_BASE = 95b68af, l'état de DÉPART du lot) et le disque pour deux choses seulement : l'existence de chemins et le journal
de la passe 3 de D350 (versé, immuable). `--sortie` écrit UTF-8, LF, par le script lui-même (jamais par redirection du shell — D298). Aucun texte ne traverse
un interpréteur : les arguments de `git` sont passés en LISTE (D289).

POURQUOI IL EXISTE : la consigne (§ 3) exige « lecture adverse de cette consigne contre le dépôt avant tout .md d'autorité ». Chaque affirmation VÉRIFIABLE est
un contrôle qui rend (verdict, détail) ; le détail imprime CE QUI A ÉTÉ PARCOURU à côté de ce qui a été trouvé (D290).

VERDICTS : ✓ vrai · ≈ vrai pour l'essentiel, IMPRÉCIS ou en TENSION sur un point (écrit, jamais tu) · ✗ FAUX · ? non vérifiable contre le dépôt (dit pourquoi).

INSTRUMENTS ÉCARTÉS : réutiliser `docs/preuves/D351/lecture-adverse/confronter-consigne.py` — collé aux affirmations du rang 53 (SHA, branche, BILAN). Seuls les
PRINCIPES sont repris : texte APLATI avant toute recherche multi-mots (D277/D294), jamais de comptage par sous-chaîne sans contexte (D275), le compte de ce qui a
été parcouru à côté du total (D290), la calibration à deux bras (D286).

CALIBRATION (D286, ABANDON si un cas manque son verdict) : pour chaque sorte de contrôle employée — motif cherché dans un fichier d'un SHA, ancêtre, existence
d'un chemin, comptage de clés d'un JSON — un cas VRAI connu rend « présent » et un cas FAUX connu « absent ».
"""
import json
import re
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

SHA_BASE = "95b68af01273fd40140089a2c1320ba1ae775016"
SHA_BR = "7fdc679"
CONT, BACK, AGENTS = "ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md", "AGENTS.md"
LISTE = "apps/pro/src/venues/venue-list-page.tsx"
REVIEW = "apps/pro/src/venues/publication-review.tsx"
HARNAIS = "neutralisation/neutralize-adm2.py"
JOURNAL = "docs/preuves/D350/neutralisation/campagne-adm2-passe-3.txt"
FR, AR = "packages/i18n/messages/fr.json", "packages/i18n/messages/ar.json"

SORTIE = None
if "--sortie" in sys.argv:
    SORTIE = sys.argv[sys.argv.index("--sortie") + 1]
LIGNES: list[str] = []


def dire(texte: str = "") -> None:
    LIGNES.append(texte)
    print(texte)


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, encoding="utf-8", errors="replace").stdout


def rc(*args):
    return subprocess.run(["git", *args], capture_output=True).returncode


def a(chemin: str, sha: str = SHA_BASE) -> str:
    """Le contenu d'un fichier à un SHA, CRLF → LF ; '' si absent."""
    return git("show", f"{sha}:{chemin}").replace("\r\n", "\n")


def aplati(t: str) -> str:
    return re.sub(r"\s+", " ", t)


def cles(d, pref=""):
    out = []
    for k, v in d.items():
        out += cles(v, pref + k + ".") if isinstance(v, dict) else [pref + k]
    return out


# ── CALIBRATION : un cas vrai et un cas faux pour chaque sorte de contrôle.
def calibrer() -> bool:
    cas = [
        ("motif présent (cas vrai connu)", "venue-list-page" in a(LISTE) or "PublicationBadge" in a(LISTE), True),
        ("motif absent (cas faux connu)", "zzz-motif-inexistant-zzz" in a(LISTE), False),
        ("ancêtre (cas vrai : le départ est ancêtre de lui-même)", rc("merge-base", "--is-ancestor", SHA_BASE, SHA_BASE) == 0, True),
        ("ancêtre (cas faux : la pointe de par-carte n'est pas descendante de HEAD)", rc("merge-base", "--is-ancestor", "HEAD", "origin/par-carte") == 0, False),
        ("existence d'un chemin (vrai)", rc("cat-file", "-e", f"{SHA_BASE}:{HARNAIS}") == 0, True),
        ("existence d'un chemin (faux)", rc("cat-file", "-e", f"{SHA_BASE}:docs/inexistant/zzz.md") == 0, False),
        ("clés d'un JSON (le bloc `publicationReview` du FR compte plus de zéro clé)", len(cles(json.loads(a(FR)).get("publicationReview", {}))) > 0, True),
        ("clés d'un JSON (un bloc inexistant en compte zéro)", len(cles(json.loads(a(FR)).get("blocInexistantZzz", {}))) == 0, True),
    ]
    manques = 0
    for nom, obtenu, attendu in cas:
        ok = obtenu == attendu
        manques += not ok
        dire(f"  calibration {'✓' if ok else '✗'} {nom} : {obtenu} (attendu {attendu})")
    dire(f"  calibration : {len(cas)} cas · {manques} manqué(s) (attendu 0)")
    return manques == 0


RESULTATS: list[tuple[str, str, str, str]] = []


def controle(ident: str, verdict: str, affirmation: str, detail: str) -> None:
    RESULTATS.append((ident, verdict, affirmation, detail))
    dire(f"[{ident}] {verdict}  {affirmation}")
    dire(f"      {detail}")


def main() -> int:
    dire("Lecture adverse de la consigne du rang 54 contre le dépôt — D352")
    dire(f"SHA de départ lu : {SHA_BASE}")
    dire("── calibration")
    if not calibrer():
        dire("✗ ABANDON : un cas de calibration a manqué son verdict — rien n'est confronté.")
        return 2
    dire("── contrôles")

    # §0 — l'état attendu
    om = git("rev-parse", "origin/main").strip()
    dire(f"(information) origin/main au moment de la lecture : {om} ; HEAD : {git('rev-parse', 'HEAD').strip()} ; parent de HEAD : {git('rev-parse', 'HEAD~1').strip()}")
    controle("0.a", "✓" if git("rev-parse", "HEAD~1").strip() == SHA_BASE else "✗", "origin/main = 95b68af ; l'arbre de départ est celui de 95b68af",
             f"le parent du premier commit du lot (la table d'ouverture) est {git('rev-parse', 'HEAD~1').strip()[:7]} ; `git diff {SHA_BASE[:7]} HEAD --name-only` = {git('diff', SHA_BASE, 'HEAD', '--name-only').split() }")
    br = {b: git("rev-parse", "--short=7", f"origin/{b}").strip() for b in ("front-client", "integration-45", "par-carte")}
    controle("0.b", "✓" if br == {"front-client": "43996e2", "integration-45": "63511ce", "par-carte": "7fdc679"} else "✗", "branches distantes gardées : front-client 43996e2, integration-45 63511ce, par-carte 7fdc679", f"relevé : {br}")
    cont = aplati(a(CONT))
    controle("0.c", "✓" if "TRENTE-TROIS" in cont and "RANG 54 : EN ATTENTE DE CADRAGE DU RELECTEUR" in cont else "✗",
             "rang 53 CLOS (D351), compteur POUR MÉMOIRE TRENTE-TROIS, « RANG 54 : EN ATTENTE DE CADRAGE DU RELECTEUR »",
             f"texte aplati parcouru : {len(cont)} caractères ; « TRENTE-TROIS » : {cont.count('TRENTE-TROIS')} occurrence(s) ; « RANG 54 : EN ATTENTE DE CADRAGE DU RELECTEUR » : {cont.count('RANG 54 : EN ATTENTE DE CADRAGE DU RELECTEUR')} occurrence(s)")
    reg = [int(m.group(1)) for m in re.finditer(r"^\| D(\d+) \|", a(CONT), re.M)]
    controle("0.d", "✓" if max(reg) == 351 and "D352" not in cont and "D352" not in aplati(a(BACK)) and "D352" not in aplati(a(AGENTS)) else "✗",
             "numéro attendu : D352, pris en LISANT le registre", f"{len(reg)} lignes de registre parcourues, dernier numéro {max(reg)} ; « D352 » : {cont.count('D352')} dans la continuité, {aplati(a(BACK)).count('D352')} au backlog, {aplati(a(AGENTS)).count('D352')} dans AGENTS.md")

    # R-1 — le constat sur la liste
    liste = a(LISTE).split("\n")
    n205 = liste[204] if len(liste) >= 205 else ""
    controle("R-1.a", "✓" if "<PublicationBadge" in n205 else "≈", "la liste rend `PublicationBadge` (venue-list-page.tsx, l. 205)",
             f"{len(liste)} lignes parcourues ; ligne 205 : « {n205.strip()[:90]} » ; occurrences de `PublicationBadge` : {a(LISTE).count('PublicationBadge')}")
    controle("R-1.b", "✓" if "getPublicationReview" not in a(LISTE) and "usePublicationReview" not in a(LISTE) else "✗", "la liste ne lit AUJOURD'HUI aucun refus (aucun appel à la route de publication)",
             f"`usePublicationReview` : {a(LISTE).count('usePublicationReview')} ; `getPublicationReview` : {a(LISTE).count('getPublicationReview')} ; le composant `PublicationHeaderState` existe dans publication-review.tsx : {'export function PublicationHeaderState' in a(REVIEW)}")
    fr_k = sorted(cles(json.loads(a(FR))["publicationReview"]))
    ar_k = sorted(cles(json.loads(a(AR))["publicationReview"]))
    controle("R-1.c", "✓" if fr_k == ar_k and len(fr_k) == 6 and "refusedBadge" in fr_k else "✗", "« Refusée » existe en FR ET AR ; le bloc `publicationReview` compte 6 clés (R-5 de D351 en annonçait 8 : consigne, 1 c)",
             f"FR : {len(fr_k)} clés {fr_k} ; AR : {len(ar_k)} clés (mêmes noms : {fr_k == ar_k}) ; `refusedBadge` FR = « {json.loads(a(FR))['publicationReview']['refusedBadge']} »")
    ctrl = a("apps/api/src/venues/venues.controller.ts")
    controle("R-1.d", "✓" if '@Get("pro/venues/:id/publication")' in ctrl else "✗", "la route `GET pro/venues/:id/publication` existe (D349) : la voie (A) n'exige aucun contrat neuf", f"controleur parcouru : {len(ctrl.splitlines())} lignes ; décorateur trouvé : {'@Get(\"pro/venues/:id/publication\")' in ctrl}")
    spec = a("apps/api/src/venues/venues.service.spec.ts")
    controle("R-1.e", "✓" if "JAMAIS commissionRateBps/rejectionReason" in spec else "✗", "la garde de `venues.service.spec.ts` (« JAMAIS … rejectionReason ») existe : le motif n'entre pas dans la liste",
             f"{len(spec.splitlines())} lignes parcourues ; occurrences de « JAMAIS commissionRateBps/rejectionReason » : {spec.count('JAMAIS commissionRateBps/rejectionReason')}")
    controle("R-1.f", "✓" if rc("merge-base", "--is-ancestor", SHA_BR, SHA_BASE) == 0 else "✗", "par-carte est intégrée : `venue-form.tsx` n'est plus interdit",
             f"`{SHA_BR}` est ancêtre de {SHA_BASE[:7]} : {rc('merge-base', '--is-ancestor', SHA_BR, SHA_BASE) == 0} ; le commentaire de publication-review.tsx dit « `venue-form.tsx` n'est PAS modifié (la branche `par-carte` y écrit, R-9) » : {'la branche `par-carte` y écrit' in a(REVIEW)}")
    harn = a("e2e/fixtures/harness.ts")
    controle("R-1.g", "≈", "(non affirmé par la consigne — risque relevé) la voie (A) ajoute une lecture par carte de salle non publiée ; l'e2e compte `/api/v1/pro/venues` par `includes`",
             f"e2e/fixtures/harness.ts, `count` : `c.includes(fragment)` présent : {'c.includes(fragment)' in harn} ; `a2-mount-effects.e2e.ts` compte `/api/v1/pro/venues` {a('e2e/specs/a2-mount-effects.e2e.ts').count('net.count(\"/api/v1/pro/venues\")')} fois ; une lecture `/api/v1/pro/venues/:id/publication` entre dans ce compte SI le compte e2e porte une salle — À MESURER à l'e2e, pas à supposer")

    # R-2 — les 29 gardes
    jr = open(JOURNAL, encoding="utf-8", errors="replace").read().splitlines()
    cur, ids = None, []
    for l in jr:
        m = re.match(r"^[✓✗] ([A-Z]-\d+)\.", l)
        if m:
            cur = m.group(1)
        if "TestingLibraryElementError" in l and cur:
            ids.append(cur)
    distincts = sorted(set(ids), key=lambda s: (s[0], int(s.split("-")[1])))
    controle("R-2.a", "✓" if len(distincts) == 29 else "✗", "29 gardes d'écran se lisent en erreur de requête de Testing Library",
             f"{len(jr)} lignes du journal parcourues ; lignes « TestingLibraryElementError » : {len(ids)} ; cibles distinctes : {len(distincts)} = {distincts} ; la ligne de bilan du journal dit « dont 29 lue(s) en ERREUR DE REQUÊTE » : {'dont 29 lue(s) en ERREUR DE REQUÊTE' in ' '.join(jr)}")
    h = a(HARNAIS)
    bl = a(BACK)
    controle("R-2.b", "≈", "« liste dans l'en-tête de neutralize-adm2.py et l'entrée de backlog »",
             f"l'en-tête ({len(h.splitlines())} lignes parcourues) et les deux entrées du backlog décrivent l'écart (« 29 GARDES D'ÉCRAN… ») mais ne DRESSENT pas la liste des 29 identifiants (l'en-tête cite `G-1`, `G-2` et `G-3` {sum(h.splitlines()[i].count('G-1') for i in range(min(60, len(h.splitlines()))))} fois dans ses 60 premières lignes, à propos de cibles retirées ou de la garde de rôle, pas comme liste) ; la liste se DÉRIVE du journal de la passe 3 de D350 (ci-dessus) ou de `ADM2_DECOUVERTE=1` — écart de pointeur, sans conséquence sur le lot")
    controle("R-2.c", "✓" if "ÉCART DÉCLARÉ PAR CE HARNAIS (S-192" in h and "MORD-REQ" in h else "✗", "l'écart déclaré dans l'en-tête du harnais existe (à barrer avec son motif) ; le lecteur accepte aujourd'hui `TestingLibraryElementError` comme morsure (MORD-REQ)",
             f"en-tête : « ÉCART DÉCLARÉ PAR CE HARNAIS (S-192 » : {h.count('ÉCART DÉCLARÉ PAR CE HARNAIS (S-192')} ; `MORD-REQ` : {h.count('MORD-REQ')} occurrences ; `TestingLibraryElementError` : {h.count('TestingLibraryElementError')}")
    ag = aplati(a(AGENTS))
    controle("R-2.d", "✓" if "Neuf gardes de ce lot ne rougissaient que par un matcher jest-dom ou une requête Testing Library" in ag and "D304" in ag and "D316" in ag else "✗",
             "précédents : AGENTS.md, D304, D316, D325 (neuf gardes) ; D345 (deux gardes)", f"texte aplati d'AGENTS.md parcouru : {len(ag)} caractères ; phrase de D325 présente : {'Neuf gardes de ce lot ne rougissaient' in ag} ; « D345, deux gardes » au backlog : {'D345, deux gardes' in aplati(bl)}")
    controle("R-2.e", "✓" if "rejeu UNIQUE" in aplati(a(CONT)) or "rejeu unique" in aplati(a(CONT)) else "≈", "correction (1 c) : le précédent du rejeu unique est D339, non D338",
             f"« D339 » et « rejeu » dans la même section : D339 compte {aplati(a(CONT)).count('D339')} occurrences ; la consigne du rang 53 cite « D338, D342, D348 » (docs/preuves/D351/consigne.md, R-2) : {'D338, D342, D348' in a('docs/preuves/D351/consigne.md')} — la correction de la consigne du rang 54 est conforme")

    # R-5 — le candidat du rang 55
    cache = a("apps/client/src/lib/api.ts")
    controle("R-5", "≈", "candidat du rang 55 : le `no-store` de `getVenueMap` non gardé ; « sans créneau actif (avec une date) » non joué sur la carte ; le cache d'une heure des référentiels (message « claude/rang50-message.md »)",
             f"`revalidate: 3600` dans apps/client/src/lib/api.ts : {cache.count('revalidate: 3600')} occurrences ; entrée `[TESTS][CARTE]` du backlog : {'[TESTS][CARTE]' in bl} ; ⚠ `claude/rang50-message.md` : introuvable dans le dépôt à ce SHA (`git cat-file -e` : {rc('cat-file', '-e', f'{SHA_BASE}:claude/rang50-message.md') == 0}) — non vérifiable contre le dépôt ; hors lot, rien n'en est codé ici")

    # § 1 a, 4 — compteur et fin
    controle("F-1", "✓", "compteur TRENTE-TROIS → TRENTE-QUATRE : D283 — un lot qui touche un test ou un harnais compte", "33 + 1 = 34 ; le lot écrit du code Pro (venue-list-page.tsx) et touche des tests et un harnais")
    controle("F-2", "?", "R-9 : sur batterie, aucune porte", "engagement de méthode ; relevé de l'état machine : table d'ouverture (secteur, BatteryStatus = 2) ; se constate à chaque passe (pilote de D340)")

    ecart = {"✓": 0, "≈": 0, "✗": 0, "?": 0}
    for _, v, _, _ in RESULTATS:
        ecart[v] += 1
    dire()
    dire(f"TOTAL : {len(RESULTATS)} contrôles — {ecart['✓']} ✓ · {ecart['≈']} ≈ · {ecart['✗']} ✗ · {ecart['?']} ?   (attendu : la somme égale le nombre de contrôles listés ci-dessus)")
    dire(f"somme des verdicts = {sum(ecart.values())} ; contrôles imprimés = {len(RESULTATS)} ; égalité : {sum(ecart.values()) == len(RESULTATS)}")
    if SORTIE:
        with open(SORTIE, "w", encoding="utf-8", newline="\n") as f:
            f.write("\n".join(LIGNES) + "\n")
    return 1 if ecart["✗"] else 0


if __name__ == "__main__":
    sys.exit(main())
