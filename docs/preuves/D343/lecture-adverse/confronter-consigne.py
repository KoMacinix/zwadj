#!/usr/bin/env python3
"""Lecture adverse de la consigne « RANG 45 (SUITE) — nommer et réparer D265 dans le harnais e2e, puis clore l'intégration » contre le dépôt — D343.

MODE D'EMPLOI : depuis la RACINE, `python3 docs/preuves/D343/lecture-adverse/confronter-consigne.py [--sortie <chemin>]`.
Il ne lit que des OBJETS GIT à SHA fixe (SHA_DEPART = a1dc635, l'état de DÉPART du lot) et quelques fichiers de `docs/preuves/` déjà versés ;
il n'écrit rien, sauf `--sortie` (UTF-8, LF, écrit par le script lui-même : jamais par redirection du shell — D298). Les arguments de `git` sont
passés en LISTE (D289) : aucun texte ne traverse un interpréteur.

POURQUOI IL EXISTE : la consigne affirme des faits (HEAD, branches, compteur, numéros de décision, signature de la panne) et en suppose d'autres (le
`keepAliveTimeout` de l'API, la forme d'une reproduction). Chaque affirmation VÉRIFIABLE est un contrôle qui rend (verdict, détail), et le détail
imprime CE QUI A ÉTÉ PARCOURU à côté de ce qui a été trouvé (D290).

VERDICTS : ✓ vrai · ✗ faux (la règle d'arrêt joue) · ≈ vrai pour l'essentiel, IMPRÉCIS ou en TENSION sur un point (écrit, jamais tu) · ? non vérifiable
contre le dépôt (dit pourquoi).

⚠ DÉCLARATION D'ORDRE (à lire avant la section 4) : DES EXPLORATIONS JETABLES, HORS DÉPÔT, ONT PRÉCÉDÉ L'ÉCRITURE DE CETTE LECTURE. Elles ont servi à
savoir quoi demander à la lecture (la forme de la reproduction proposée par la consigne a-t-elle déjà été tentée ?). Elles ne sont PAS des pièces : la
reproduction qui compte est celle de `docs/preuves/D343/reproduction/`, rejouée proprement, avec ses empreintes. Ce que la lecture en tire (4.1, 4.2) est
marqué comme tel.

INSTRUMENTS ÉCARTÉS : réutiliser `docs/preuves/D342/lecture-adverse/confronter-consigne.py` — collé aux affirmations de D342 (BILAN de la branche, 440
fichiers). Seuls ses PRINCIPES sont repris : texte APLATI avant toute recherche multi-mots (D277/D294), jamais de comptage par sous-chaîne sans contexte
(D275), le compte de ce qui a été parcouru à côté du total (D290).

CALIBRATION (D286 : deux bras, ABANDON si un cas manque son verdict) : pour CHAQUE sorte de contrôle employée — ligne de registre, motif cherché dans un
fichier d'un SHA, ancêtre, existence d'un chemin, compte d'un `rev-list` — un cas VRAI connu doit rendre « présent » et un cas FAUX connu « absent ».
"""
import re
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

SHA_DEPART = "a1dc635"
SHA_TABLE = "7bbf122"
SHA_MAIN = "d44867a"
SHA_BRANCHE = "43996e2"

CONT = "ZWADJ_CONTINUITE.md"
BACK = "ZWADJ_BACKLOG.md"
AGENTS = "AGENTS.md"
CLAUDE = "CLAUDE.md"
HARNAIS = "e2e/fixtures/harness.ts"
CONFIG = "e2e/playwright.config.ts"


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


def ancetre(a, b):
    return rc("merge-base", "--is-ancestor", a, b) == 0


def lire(chemin):
    with open(chemin, encoding="utf-8", errors="replace", newline="") as f:
        return f.read()


# ───────────────────────── CALIBRATION, DEUX BRAS ─────────────────────────
TEXTES = {n: aplati(blob(SHA_DEPART, n)) for n in (CONT, BACK, AGENTS, CLAUDE)}
cal = []


def calibre(nom, positif, negatif):
    ok = (positif is True) and (negatif is False)
    cal.append((nom, positif, negatif, ok))
    if not ok:
        sys.exit(f"CALIBRATION RATÉE — {nom} : cas vrai → {positif} (attendu True), cas faux → {negatif} (attendu False). ABANDON, rien n'a été jugé.")


calibre("ligne du registre (D341 présente, D999 absente)", len(trouve(TEXTES[CONT], r"\| D341 \| A \| D341")) == 1, len(trouve(TEXTES[CONT], r"\| D999 \| A \| D999")) > 0)
calibre("motif dans un fichier d'un SHA (« retries: 0 » présent dans la config, « retries: 7 » absent)", "retries: 0" in blob(SHA_DEPART, CONFIG), "retries: 7" in blob(SHA_DEPART, CONFIG))
calibre("ancêtre (a1dc635 l'est de HEAD, HEAD ne l'est pas de a1dc635)", ancetre(SHA_DEPART, "HEAD"), ancetre("HEAD", SHA_DEPART))
calibre("existence d'un chemin à un SHA (harness.ts oui, un fichier inventé non)", existe(SHA_DEPART, HARNAIS), existe(SHA_DEPART, "e2e/fixtures/inexistant-zzz.ts"))
n_main_depart = int(git("rev-list", "--count", f"{SHA_MAIN}..{SHA_DEPART}").strip() or "-1")
n_zero = int(git("rev-list", "--count", f"{SHA_DEPART}..{SHA_DEPART}").strip() or "-1")
calibre("compte d'un rev-list (main..départ compte des commits, départ..départ n'en compte aucun)", n_main_depart > 0, n_zero > 0)

R = []


def v(ident, enonce, verdict, detail):
    R.append((verdict, ident, enonce, detail))


# ───────────────────────── 0. REPRISE ET SAUVEGARDE ─────────────────────────
parents_table = git("log", "-1", "--format=%P", SHA_TABLE).split()
fichiers_table = [l for l in git("show", "--name-only", "--format=", SHA_TABLE).splitlines() if l.strip()]
v("0.1", "le premier commit du lot (la table) a pour parent a1dc635 et ne contient que table-ouverture.md",
  "✓" if parents_table == [git("rev-parse", SHA_DEPART).strip()] and fichiers_table == ["docs/preuves/D343/table-ouverture.md"] else "✗",
  f"parent de {SHA_TABLE} = {[p[:7] for p in parents_table]} ; fichiers du commit = {fichiers_table}")

om, ofc, oi = (git("rev-parse", r).strip() for r in ("origin/main", "origin/front-client", "origin/integration-45"))
v("0.2", "origin/main = d44867a, origin/front-client = 43996e2, origin/integration-45 = a1dc635 (la sauvegarde du § 0)",
  "✓" if om.startswith(SHA_MAIN) and ofc.startswith(SHA_BRANCHE) and oi.startswith(SHA_DEPART) else "✗",
  f"origin/main = {om[:7]} (attendu {SHA_MAIN}) ; origin/front-client = {ofc[:7]} (attendu {SHA_BRANCHE}) ; origin/integration-45 = {oi[:7]} (attendu {SHA_DEPART}) — relevés de suivi après `git fetch` et `git push` de la session")

stash = [l for l in git("stash", "list").splitlines() if l.strip()]
etat = [l for l in git("status", "--short").splitlines() if l.strip()]
hors = [l for l in etat if "docs/preuves/D343/" not in l]
v("0.3", "arbre propre et aucun stash", "✓" if not stash and not hors else "✗",
  f"stash : {len(stash)} ligne(s) ; `git status --short` : {len(etat)} ligne(s), dont {len(hors)} hors docs/preuves/D343/ (les pièces de CE lot, pas encore commitées, sont les seules attendues)")

titre45 = trouve(TEXTES[CONT], r"PROCHAIN LOT — rang 45 · `\[CODE\]` \*\*L'intégration de la branche `front-client` dans `main`\*\* ⛔ \*\*OUVERT LE 07/11/2026 \(D342\)")
non_poussee = trouve(TEXTES[CONT], r"FUSIONNÉE EN LOCAL, NON POUSSÉE")
v("0.4", "rang 45 OUVERT, fusion faite en local, rien poussé", "✓" if titre45 and non_poussee else "✗",
  f"titre du rang 45 « OUVERT LE 07/11/2026 (D342) » : {len(titre45)} occurrence(s) ; « FUSIONNÉE EN LOCAL, NON POUSSÉE » : {len(non_poussee)} occurrence(s) dans {CONT}@{SHA_DEPART}")

cpt = trouve(TEXTES[CONT], r"POUR MÉMOIRE \*\*QUATRE\*\*, inchangé")
v("0.5", "compteur QUATRE", "✓" if cpt else "✗", f"« POUR MÉMOIRE **QUATRE**, inchangé » : {len(cpt)} occurrence(s) dans {CONT}@{SHA_DEPART} (le bloc d'arrêt de D342)")

lignes_reg = re.findall(r"^\| (D\d+) \|", blob(SHA_DEPART, CONT), re.M)
compte = {n: (len(trouve(t, r"\bD343\b")), len(trouve(t, r"\bD342\b"))) for n, t in TEXTES.items()}
v("0.6", "la dernière ligne du registre est D341 ; D343 est libre ; D342 est PRIS mais pas au registre",
  "✓" if lignes_reg and lignes_reg[-1] == "D341" and all(c[0] == 0 for c in compte.values()) and "D342" not in lignes_reg else "✗",
  f"{len(lignes_reg)} ligne(s) de registre parcourue(s), la dernière = {lignes_reg[-1] if lignes_reg else None}, « D342 » au registre : {'oui' if 'D342' in lignes_reg else 'non'} ; (D343, D342) par fichier : {compte}")

n117 = int(git("rev-list", "--count", f"origin/main..{SHA_DEPART}").strip())
n117_hors_branche = int(git("rev-list", "--count", f"origin/main..{SHA_DEPART}", "--not", "origin/front-client").strip())
v("0.7", "« 117 commits n'existent que sur le poste de Ko » (avant la sauvegarde)", "✓" if n117 == 117 else "≈",
  f"`git rev-list --count origin/main..{SHA_DEPART}` = {n117} (attendu 117) ; dont {n117_hors_branche} absents AUSSI de origin/front-client (les commits de D342 et la fusion) — le reste vit déjà sur la branche distante. ⚠ La phrase « n'existent que sur le poste » est exacte pour ces {n117_hors_branche} commits ; les {n117 - n117_hors_branche} autres sont déjà sur `front-client`.")

fusion = git("rev-list", "--parents", "-n", "1", "2b79355").split()
v("0.8", "la fusion 2b79355 est un commit de fusion (deux parents), ancêtre du départ, et origin/front-client en est ancêtre",
  "✓" if len(fusion) == 3 and ancetre("2b79355", SHA_DEPART) and ancetre("origin/front-client", SHA_DEPART) else "✗",
  f"parents de 2b79355 : {[p[:7] for p in fusion[1:]]} ; 2b79355 ancêtre de {SHA_DEPART} : {ancetre('2b79355', SHA_DEPART)} ; origin/front-client ancêtre : {ancetre('origin/front-client', SHA_DEPART)}")

# ───────────────────────── 1. CE QUE KO ARBITRE OU ADOPTE ─────────────────────────
d342 = {c: existe(SHA_DEPART, c) for c in ("docs/preuves/D342/portes/masquer-jetons.py", "docs/preuves/D342/portes/regle-rejeu.md", "docs/preuves/D342/tri-audit-d342b.txt")}
arb_avant = ancetre("499d1bf", "2b79355")
copie_jetable = trouve(TEXTES[CONT], r"fait sur une copie de travail jetable")  # écrit dans le bloc d'arrêt de ZWADJ_CONTINUITE.md, PAS dans le tri (défaut n° 2 de la passe 1)
decisions_ecrites = trouve(TEXTES[CONT], r"quatre décisions prises seul")
v("1.1", "1 b : les quatre décisions de D342 prises seul (arbitrages avant la fusion ; audit sur copie jetable ; rejeu unique des deux rouges ; sortie e2e masquée) sont TRAÇABLES",
  "≈" if arb_avant and all(d342.values()) and not decisions_ecrites else ("✓" if arb_avant and all(d342.values()) else "✗"),
  f"(i) 499d1bf ancêtre de la fusion 2b79355 : {arb_avant} ; (ii) {CONT} écrit « fait sur une copie de travail jetable » : {len(copie_jetable)} occurrence(s) ; (iii)(iv) pièces présentes : {d342}. "
  f"⚠ Leur ÉNUMÉRATION comme « quatre décisions prises seul » n'est dans AUCUN fichier d'autorité à {SHA_DEPART} (« quatre décisions prises seul » : {len(decisions_ecrites)} occurrence(s)) — elle a vécu dans le rapport de fin de session de D342. À écrire dans la section D342 (consigne § 1 b : ratifiées par adoption).")

# ───────────────────────── 2. LES DÉCISIONS DU RELECTEUR ─────────────────────────
arret_d340 = lire("docs/preuves/D340/portes/arret-portes.md")
arret_d339 = lire("docs/preuves/D339/portes/arret-e2e-r41.md")
rejeu_d342 = lire("docs/preuves/D342/portes/rejeu-resultat.md")
reset_d340, reset_d339, reset_d342 = ("ECONNRESET" in arret_d340, "ECONNRESET" in arret_d339, "ECONNRESET" in rejeu_d342)
autres_classes_d340 = trouve(aplati(arret_d340), r"Timed out 7000ms waiting for expect\(locator\)\.toHaveURL")
v("2.1", "R-12 : « D265 a coûté un rejeu à la clôture de D339, de D340 et de D342 »", "≈" if reset_d339 and reset_d340 and reset_d342 and autres_classes_d340 else ("✓" if reset_d339 and reset_d340 and reset_d342 else "✗"),
  f"« ECONNRESET » dans la pièce de D339 : {reset_d339} ; de D340 : {reset_d340} ; du rejeu de D342 : {reset_d342}. "
  f"⚠ MAIS le rouge de D340 n'était PAS que D265 : la même pièce relève {len(autres_classes_d340)} occurrence(s) de « Timed out 7000ms waiting for expect(locator).toHaveURL » (une autre classe, de lenteur de route non préchauffée, D127). "
  "Réparer D265 ne garantit donc pas une e2e verte : si une seconde classe reparaît, ce n'est pas D265.")

h = blob(SHA_DEPART, HARNAIS)
trois = [("ECONNREFUSED", "ECONNREFUSED" in h), ("ECONNRESET / UND_ERR_SOCKET", "ECONNRESET" in h and "UND_ERR_SOCKET" in h), ("UND_ERR_HEADERS_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT" in h)]
v("2.2", "R-13 : le harnais nomme déjà les trois causes possibles (commentaire de postJson)", "✓" if all(x[1] for x in trois) else "✗", f"{HARNAIS}@{SHA_DEPART} : {trois}")

def echecs_de(chemin):
    t = lire(chemin)
    return re.findall(r"POST (\S+) a échoué après (\d+) ms", t)

e1, e2 = echecs_de("docs/preuves/D342/portes/test-e2e.txt"), echecs_de("docs/preuves/D342/portes/rejeu-test-e2e.txt")
tous = e1 + e2
v("2.3", "R-13 : la signature relevée = ECONNRESET en quelques ms, au PREMIER appel du fixture, POST /auth/register", "✓" if tous and all(u.endswith("/api/v1/auth/register") and int(ms) < 10 for u, ms in tous) else "✗",
  f"échecs lus dans les deux sorties de D342 : {len(e1)} (passe) + {len(e2)} (rejeu) = {len(tous)} ; durées en ms : {[ms for _, ms in tous]} ; toutes sur /api/v1/auth/register : {all(u.endswith('/api/v1/auth/register') for u, _ in tous)}")

specs_en_echec = ["fc2-debordement-360", "r43-devis-brouillon", "r26-parcours-reservation"]
beforeall_seed = {}
for s in specs_en_echec:
    t = blob(SHA_DEPART, f"e2e/specs/{s}.e2e.ts")
    beforeall_seed[s] = bool(re.search(r"test\.beforeAll\([^)]*\)\s*=>\s*\{[^}]*seedReferentials\(\)", t, re.S))
v("2.4", "ORIENTATION (non affirmée par la consigne) : chacun des trois tests en échec de D342 suit un `seedReferentials()` — un `execFileSync` synchrone — dans le `beforeAll` de sa spec", "✓" if all(beforeall_seed.values()) else "≈",
  f"`beforeAll(… seedReferentials() …)` présent dans : {beforeall_seed} (3 specs parcourues). C'est ce qui oriente la reproduction vers un BLOCAGE SYNCHRONE de la boucle du worker — pas une preuve : la cause se MESURE (R-13).")

api_ka = [l for l in git("grep", "-n", "-i", "-E", "keepAliveTimeout|headersTimeout|requestTimeout", SHA_DEPART, "--", "apps/api/src").splitlines() if l.strip()]
n_api_src = len([l for l in git("ls-tree", "-r", "--name-only", SHA_DEPART, "apps/api/src").splitlines() if l.strip()])
v("2.5", "R-13 : « le keepAliveTimeout RÉEL du serveur d'API (relevé, jamais supposé) »", "?",
  f"l'API ne le fixe NULLE PART : `git grep` de keepAliveTimeout/headersTimeout/requestTimeout sur {n_api_src} fichier(s) de apps/api/src → {len(api_ka)} ligne(s) (attendu 0). Le serveur retombe donc sur le défaut de Node, qui se RELÈVE sur le serveur qui tourne — c'est la première pièce de reproduction (`reproduction/mesure-keepalive-sortie.txt`). "
  "Non vérifiable contre le dépôt : c'est une propriété de l'exécution (version de Node comprise).")

cfg = blob(SHA_DEPART, CONFIG)
retries_zero = bool(re.search(r"retries:\s*0\b", cfg))  # UN seul calcul : le verdict ET le détail lisent CE booléen (défaut n° 1 de la passe 1)
v("2.6", "R-14 : `retries` reste à 0 dans playwright.config.ts (arbitrage de Ko du 04/10/2026 : « aucune nouvelle tentative automatique »)", "✓" if retries_zero else "✗",
  f"{CONFIG}@{SHA_DEPART} : `retries: 0` présent : {retries_zero} ; l'arbitrage de Ko est cité dans le backlog : {len(trouve(TEXTES[BACK], r'aucune nouvelle tentative automatique'))} occurrence(s)")

sites_fetch = {}
for chemin in git("ls-tree", "-r", "--name-only", SHA_DEPART, "e2e").splitlines():
    if chemin.endswith(".ts") and "node_modules" not in chemin:
        n = len(re.findall(r"(?<![\w.])fetch\(", blob(SHA_DEPART, chemin)))
        if n:
            sites_fetch[chemin] = n
n_ts = len([c for c in git("ls-tree", "-r", "--name-only", SHA_DEPART, "e2e").splitlines() if c.endswith(".ts") and "node_modules" not in c])
ctx_req = len(re.findall(r"context\.request\.", h))
v("2.7", "R-14 : « pour les appels de préparation » — combien de sites appellent le `fetch` global ?", "≈",
  f"{n_ts} fichier(s) .ts de e2e/ parcouru(s) ; sites `fetch(` : {sites_fetch}. Il y en a DEUX dans le harnais (`postJson` et `apiCall`), pas un : la consigne parle « des appels de préparation » au pluriel, et corriger `postJson` seul laisserait `apiCall` exposé. "
  f"Le troisième chemin (`loginContext`) passe par `context.request` de Playwright ({ctx_req} appel(s)), un autre client HTTP — hors de ce lot sauf si la mesure l'y rattache.")

# ───────────────────────── 3. LA SUITE DE LA CONSIGNE ─────────────────────────
r17a = trouve(aplati(lire("docs/preuves/D342/consigne.md")), r"R-3 de D340 \(réponse et coût identiques, DR5\)")
r3_340 = trouve(aplati(lire("docs/preuves/D340/consigne.md")), r"R-3\. Méthode RENFORCÉE")
r3_341 = trouve(aplati(lire("docs/preuves/D341/consigne.md")), r"R-3\. S-103 est REFUSÉE[^.]*\. Pendant la pause de 15 minutes, la réponse est la même")
v("3.1", "R-17 (a) : la R-2 du rang 45 cite « R-3 de D340 » pour « réponse et coût identiques » — c'est la R-3 de la consigne de D341", "✓" if r17a and r3_340 and r3_341 else "✗",
  f"consigne de D342, R-2 : « R-3 de D340 (réponse et coût identiques, DR5) » : {len(r17a)} ; la R-3 de la consigne de D340 est « Méthode RENFORCÉE » : {len(r3_340)} ; la R-3 de la consigne de D341 est la réponse identique, au même coût : {len(r3_341)}")

r1 = trouve(aplati(lire("docs/preuves/D342/consigne.md")), r"le relecteur a fusionné origin/front-client dans origin/main \(d44867a\) sans aucun conflit")
parents_main = git("rev-list", "--parents", "-n", "1", SHA_MAIN).split()
v("3.2", "R-17 (b) : « fusionné dans origin/main » — l'essai du relecteur était local, origin/main ne contenait pas la branche", "✓" if r1 and len(parents_main) == 2 and not ancetre(SHA_BRANCHE, SHA_MAIN) else "✗",
  f"R-1 de D342 : « …a fusionné origin/front-client dans origin/main (d44867a) sans aucun conflit » : {len(r1)} ; d44867a a {len(parents_main) - 1} parent (donc n'est PAS une fusion) ; origin/front-client est ancêtre de d44867a : {ancetre(SHA_BRANCHE, SHA_MAIN)}")

r5 = trouve(aplati(lire("docs/preuves/D342/consigne.md")), r"les quatorze lots de code de la branche comptent[^.]*: QUATRE → DIX-HUIT")
d283 = trouve(TEXTES[AGENTS], r"Un lot qui touche un harnais, un test, un script ou une migration COMPTE")
v("3.3", "R-16 : compteur QUATRE → DIX-HUIT (R-5) → DIX-NEUF (D343 touche du code de test : il compte, D283)", "≈" if r5 and d283 else "✗",
  f"R-5 de D342 : {len(r5)} ; règle D283 « un lot qui touche un harnais, un test, un script ou une migration COMPTE » : {len(d283)}. "
  "⚠ Le DIX-NEUF est CONDITIONNEL : il suppose que du code de test soit écrit. Si la reproduction échoue (R-13) ou si la correction exige `apps/api` (R-14), D343 est documentaire, ne compte pas, et l'intégration n'est pas close — le compteur reste QUATRE, rien n'est poussé sur main.")

v("3.4", "R-18 : integration-45 et front-client existent et ne sont pas supprimées", "✓" if rc("rev-parse", "--verify", "origin/integration-45") == 0 and rc("rev-parse", "--verify", "origin/front-client") == 0 else "✗",
  f"origin/integration-45 = {oi[:7]} ; origin/front-client = {ofc[:7]}")

v("3.5", "§ 4 : « Gestes de Ko : ceux de docs/preuves/D342/scenarios-ko.md » existent", "✓" if existe(SHA_DEPART, "docs/preuves/D342/scenarios-ko.md") else "✗",
  f"docs/preuves/D342/scenarios-ko.md à {SHA_DEPART} : {existe(SHA_DEPART, 'docs/preuves/D342/scenarios-ko.md')}")

# ───────────────────────── 4. EN ADVERSAIRE ─────────────────────────
d325 = lire("docs/preuves/D325/enquete-d265/sonde-d265-v2-sortie.txt")
d322 = lire("docs/preuves/D322/mesures/repro-keepalive-fenetre.txt")
succes_d325 = sum(int(x) for x in re.findall(r"échecs : 0 · succès : (\d+)", d325))
essais_d322 = re.search(r"(\d+) essais parcourus · (\d+) échec", d322)
v("4.1", "CONTRADICTION ? la reproduction que la consigne SUGGÈRE (« un appel, une attente au-delà du keepAliveTimeout, puis l'appel du fixture sur la même connexion ») a DÉJÀ été tentée deux fois, et elle a été NÉGATIVE", "≈",
  f"D325 (`sonde-d265-v2-sortie.txt`) : {succes_d325} succès, 0 échec, sur trois bras dont un blocage de 6 500 ms ; D322 (`repro-keepalive-fenetre.txt`) : {essais_d322.group(1) if essais_d322 else '?'} essais, {essais_d322.group(2) if essais_d322 else '?'} échec. "
  "⇒ Rejouer cette FORME seule échouerait à reproduire et, selon R-13, arrêterait le lot sur une panne qu'on n'aurait pas cherchée assez loin. Les deux montages n'avaient qu'UNE connexion dans le pool du client (appel, blocage, appel) ; "
  "l'exploration jetable de cette session (hors dépôt, déclarée en tête) montre qu'avec DEUX connexions ou plus le résultat change — voir la reproduction versée, qui reconstruit l'état du pool avec les vraies fonctions du fixture. À confirmer par elle, pas par cette ligne.")

v("4.2", "CONTRADICTION ? « les deux montages antérieurs ne l'ont pas écartée » (table d'ouverture) vs « la forme de R-13 reproduit »", "?",
  "ne se juge pas ici : la table d'ouverture dit seulement que ces deux montages n'ont rien reproduit, donc n'ont rien écarté ; si la reproduction versée réussit, la raison de leur échec (état du pool) sera écrite dans la section D343, avec sa pièce.")

v("4.3", "R-15 : « l'e2e complète DEUX fois de suite » et R-16 : « les six portes après la dernière modification » — combien de fois l'e2e est-elle jouée ?", "≈",
  "TROIS fois au moins (les deux passes de R-15, puis celle de la passe des six portes de clôture, où `test:e2e` est la sixième porte). Ce n'est pas une contradiction mais un coût, et une règle à écrire avant la première : un rouge à N'IMPORTE LAQUELLE des trois arrête (D270). "
  "La règle des deux passes (`portes/regle-deux-passes.md`) le dit, commitée avant elles.")

v("4.4", "CONTRADICTION ? R-16 demande les campagnes de neutralisation de D342 ; la pause de Ko (DR1 de D336) suspend « les campagnes `--tout` »", "✓" if len(trouve(TEXTES[AGENTS], r"les campagnes `--tout`")) > 0 else "≈",
  f"DR1 (AGENTS) : « les campagnes `--tout` » en pause : {len(trouve(TEXTES[AGENTS], r'les campagnes `--tout`'))} occurrence(s). L'UNION de D342 (35 campagnes sur 55, calculées sur le diff de la fusion) n'est PAS `--tout`, et « les harnais du lot » sont CONSERVÉS par DR1 : pas de contradiction. "
  "À ne pas déborder : `--tout` n'est pas joué par ce lot.")

v("4.5", "CONTRADICTION ? D342 a déclaré « aucune ligne de code neuve » ; D343 en écrit (si la cause est nommée)", "✓",
  "ce sont deux lots : la table de D342 l'écrit pour D342 seul ; celle de D343 déclare ses fichiers de code comme CONDITIONNELS à la cause nommée. Le diff final de D343 se compare à SA table.")

# ───────────────────────── 5. NON VÉRIFIABLES CONTRE LE DÉPÔT ─────────────────────────
v("5.1", "« adopté par Ko tel quel » / R-12 à R-18 « DÉCISIONS DU RELECTEUR (chat), DÉLÉGUÉES PAR KO »", "?",
  "l'adoption est dans le chat ; la consigne s'écrit « par ADOPTION de ce message » : D343 l'écrira comme telle, jamais comme une parole de Ko hors dépôt (et la délégation du 02/11/2026 est écrite dans AGENTS.md, annotation de la règle D284).")
d265_d339 = trouve(aplati(arret_d339), r"même classe D265|D265 a mordu une spec DANS la suite")
v("5.2", "« D265 a coûté un rejeu à la clôture de D339 » — la pièce de D339 range-t-elle ce rouge sous D265 ?", "✓" if reset_d339 and d265_d339 else "≈",
  f"la pièce de D339 contient « ECONNRESET » ({reset_d339}) ET range ce rouge sous D265 en toutes lettres (« même classe D265… », « D265 a mordu une spec DANS la suite (r41, premier appel du fixture, après 3 ms) ») : {len(d265_d339)} occurrence(s) de ces deux tournures sur {len(trouve(aplati(arret_d339), 'D265'))} mention(s) de D265 (défaut n° 3 de la passe 1 : le texte disait l'inverse de son propre compte).")

# ───────────────────────── SORTIE ─────────────────────────
n = {k: sum(1 for r in R if r[0] == k) for k in "✓≈✗?"}
lignes = []
lignes.append(f"LECTURE ADVERSE DE LA CONSIGNE « RANG 45 (SUITE) — D265 DANS LE HARNAIS E2E, PUIS CLORE L'INTÉGRATION » — D343 — instrument confronter-consigne.py, SHA de départ {SHA_DEPART}, commit de la table {SHA_TABLE}")
lignes.append("calibration (cinq cas, deux bras chacun, ABANDON si un cas manque son verdict) : " + " ; ".join(f"{nom} → vrai:{p} faux:{ng}" for nom, p, ng, ok in cal))
lignes.append("⚠ des explorations jetables, hors dépôt, ont PRÉCÉDÉ cette lecture (déclaré dans l'en-tête de l'instrument) ; la reproduction qui compte est celle de docs/preuves/D343/reproduction/")
lignes.append("")
lignes.append("══ PREMIÈRE PARTIE — COURTE ══")
lignes.append(f"{len(R)} contrôles parcourus : {n['✓']} ✓ · {n['≈']} ≈ (imprécis ou en tension, sans arrêt) · {n['✗']} ✗ · {n['?']} ? non vérifiables (attendu : aucun ✗ ; chaque ≈ et chaque ? est détaillé ci-dessous)")
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
