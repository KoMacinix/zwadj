"""D316 — LECTURE ADVERSE DE D315 : ses chiffres confrontés à SES pièces, au code à `ffd32e9` et au dépôt. Pièce jetable,
versée. N'écrit rien dans le dépôt : elle imprime. Patron : `docs/preuves/D315/lecture-adverse/confronter-d314.py` (non
importé). Chaque contrôle imprime l'attendu À CÔTÉ du mesuré (D290) et, quand il compte, ce qu'il a parcouru. Les attendus
sont ceux qu'ÉCRIVENT la section D315, le point d'entrée du rang 24, la ligne D315 de l'ordre et les reports de D315 au
backlog — recopiés de ces textes pour être confrontés, jamais de mémoire. Un constat sans chiffre écrit par D315 s'imprime
« · », il n'entre pas au compte des écarts.
Les outils de D315 sont REJOUÉS sur l'état qu'ils ont lu (`ffd32e9`) et leurs sorties comparées À L'OCTET aux sorties
versées ; `carte-routes.py` lit l'arbre de travail : il se rejoue dans un worktree détaché à `ffd32e9`, hors dépôt, dont
le chemin est le premier argument.
Usage, depuis la racine :  python docs/preuves/D316/lecture-adverse/confronter-d315.py <worktree à ffd32e9>
"""
import hashlib
import os
import re
import subprocess
import sys

for f in (sys.stdout, sys.stderr):
    f.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml") or len(sys.argv) < 2:
    print("✗ À LANCER DEPUIS LA RACINE, avec le chemin du worktree à ffd32e9.")
    sys.exit(2)
WT = sys.argv[1]
RACINE = os.getcwd()
D = "docs/preuves/D315"
DEPART, FIN = "ffd32e9", "a7c09fa"
AUTORITE = ["CLAUDE.md", "AGENTS.md", "ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md"]
ecarts, controles = 0, 0


def controle(nom: str, mesure, attendu, source: str = "section D315") -> None:
    global ecarts, controles
    controles += 1
    ok = mesure == attendu
    ecarts += 0 if ok else 1
    print(f"{'✓' if ok else '✗'} {nom} : mesuré {mesure!r} (attendu, {source} : {attendu!r})")


def constat(texte: str) -> None:
    print(f"  · {texte}")


def git(*args: str) -> str:
    return subprocess.run(["git", *args], capture_output=True, encoding="utf-8").stdout


def montre(sha: str, chemin: str) -> str:
    return subprocess.run(["git", "show", f"{sha}:{chemin}"], capture_output=True).stdout.decode("utf-8")


def sha256(octets: bytes) -> str:
    return hashlib.sha256(octets).hexdigest()


def plat(t: str) -> str:
    return re.sub(r"\s+", " ", t)


def rejouer(cmd: list[str], cwd: str) -> bytes:
    env = {**os.environ, "PYTHONIOENCODING": "utf-8"}
    return subprocess.run(cmd, cwd=cwd, capture_output=True, env=env).stdout


# ------------------------------------------------------------------ 1. provenance et périmètre
print("== 1. provenance et périmètre")
controle("parent du commit de D315", git("rev-parse", "--short=7", f"{FIN}^").strip(), DEPART, "« SHA de départ : ffd32e9 »")
n = len(re.findall("D315", subprocess.run(["git", "grep", "-h", "D315", DEPART], capture_output=True).stdout.decode("utf-8")))
controle("« D315 » dans les fichiers suivis à ffd32e9", n, 0, "« 0 occurrence … à ffd32e9 »")
changes = [l for l in git("diff", "--name-only", DEPART, FIN).splitlines() if l]
hors = [f for f in changes if f not in ("AGENTS.md", "ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md")
        and not f.startswith(f"{D}/") and f != "docs/preuves/D314/passe-d277/RECTIFICATION-D315.txt"]
controle("fichiers hors des trois .md, de docs/preuves/D315/ et de la rectification", hors, [], "« Documentaire : AGENTS.md, … docs/preuves/ »")
constat(f"parcouru : {len(changes)} fichiers au diff, dont {sum(f.startswith(D + '/') for f in changes)} sous {D}/")
d314 = [l.split("\t") for l in git("diff", "--name-status", DEPART, FIN, "--", "docs/preuves/D314").splitlines() if l]
controle("pièces de D314 : seul AJOUT, aucune retouche", d314, [["A", "docs/preuves/D314/passe-d277/RECTIFICATION-D315.txt"]],
         "« pièces non retouchées »")
controle("commit de D315 sur origin/main", "origin/main" in git("branch", "-r", "--contains", FIN), True, "clôture poussée")

# ------------------------------------------------------------------ 2. les outils de D315, rejoués à l'octet
print("== 2. les outils de D315 rejoués sur ffd32e9, sorties comparées à l'octet aux sorties versées")
controle("worktree à ffd32e9", subprocess.run(["git", "rev-parse", "--short=7", "HEAD"], cwd=WT, capture_output=True,
                                               text=True).stdout.strip(), DEPART, "worktree détaché")
O = f"{D}/etat-produit/outils"
paires = [
    ("carte-routes.py (dans le worktree)", [sys.executable, os.path.join(RACINE, O, "carte-routes.py")], WT,
     f"{D}/etat-produit/carte-routes-sortie.txt"),
    ("entrees-ouvertes.py ffd32e9", [sys.executable, f"{O}/entrees-ouvertes.py", DEPART], RACINE,
     f"{D}/etat-produit/entrees-ouvertes-sortie.txt"),
    ("compter-verdicts.py", [sys.executable, f"{O}/compter-verdicts.py"], RACINE, f"{D}/etat-produit/compter-verdicts-sortie.txt"),
    ("verifier-deploiement.py ffd32e9", [sys.executable, f"{O}/verifier-deploiement.py", DEPART], RACINE,
     f"{D}/etat-produit/verifier-deploiement-sortie.txt"),
    ("relecture-arabe.py ffd32e9", [sys.executable, f"{O}/relecture-arabe.py", DEPART], RACINE,
     f"{D}/etat-produit/relecture-arabe-sortie.txt"),
    ("corpus-apres-ecriture.py", [sys.executable, f"{D}/lecture-adverse/corpus-apres-ecriture.py"], RACINE,
     f"{D}/lecture-adverse/corpus-apres-ecriture-sortie.txt"),
]
for nom, cmd, cwd, verse in paires:
    sortie = rejouer(cmd, cwd)
    attendu = open(verse, "rb").read()
    # La sortie versée peut avoir été écrite en CRLF par une redirection Windows : on compare aussi sans les CR.
    identique = sortie == attendu or sortie.replace(b"\r\n", b"\n") == attendu.replace(b"\r\n", b"\n")
    controle(f"rejeu de {nom} = {verse.rsplit('/', 1)[1]}", (identique, len(sortie) > 0), (True, True), "sortie versée")

# ------------------------------------------------------------------ 3. la carte et les verdicts, chiffres écrits
print("== 3. carte et verdicts : les chiffres écrits contre les sorties versées")
carte = open(f"{D}/etat-produit/carte-routes-sortie.txt", encoding="utf-8").read()
constat("fin de la carte versée : " + " | ".join(l.strip() for l in carte.strip().splitlines()[-4:]))
pages = [f for f in git("ls-tree", "-r", "--name-only", DEPART, "apps/client/src/app").splitlines() if f.endswith("/page.tsx")]
controle("client : fichiers page.tsx (recompte indépendant)", len(pages), 13, "« client 13 pages »")
ctrl = [f for f in git("ls-tree", "-r", "--name-only", DEPART, "apps/api/src").splitlines() if f.endswith(".controller.ts")]
avec = [f for f in ctrl if re.search(r"^@Controller\(", montre(DEPART, f), re.M)]
controle("API : fichiers *.controller.ts portant @Controller( en début de ligne", len(avec), 22, "« 22 contrôleurs »")
routes = sum(len(re.findall(r"^\s*@(Get|Post|Put|Patch|Delete)\(", montre(DEPART, f), re.M)) for f in avec)
controle("API : décorateurs de route dans ces contrôleurs", routes, 78, "« 78 routes »")
app = montre(DEPART, "apps/pro/src/App.tsx")
chemins = re.findall(r'<Route[^>]*\spath="([^"]+)"', app)
controle("pro : chemins de <Route> distincts", len(set(chemins)), 14, "« pro 14 routes »")
constat(f"pro : {len(chemins)} attributs path, dont {chemins.count('*')} « * »")
pay = [f for f in avec if re.search(r"pay|paiement|chargily", f, re.I)]
controle("API : contrôleur de paiement à ffd32e9", pay, [], "« aucune route de paiement »")
v = open(f"{D}/etat-produit/compter-verdicts-sortie.txt", encoding="utf-8").read()
# ⚠ DÉFAUT D'INSTRUMENT RÉPARÉ (D298) : la première version cherchait « réalisée », « partielle »… — les libellés
# de la sortie versée sont « RÉALISÉ », « PARTIEL » (ventilation en colonnes) ; trois « introuvable » non comptés.
vent = dict((k.strip(), int(n)) for k, n in re.findall(r"^  ([^\d\n]+?)\s{2,}(\d+)$", v, re.M))
controle("verdicts versés : ventilation (onze libellés)", vent,
         {"RÉALISÉ AUTREMENT": 2, "RÉALISÉ": 62, "PARTIEL": 25, "CASSÉ À L'ÉCRAN": 2, "ABSENT": 35, "PAUSE": 10, "BIENTÔT": 2,
          "ÉCARTÉ": 3, "DÉCISION OUVERTE": 2, "NON CONFRONTÉ": 2, "périmée": 1},
         "« 62 réalisées, 2 réalisées autrement, 25 partielles, 2 cassées … 1 périmée »")
tot = re.search(r"extraction : (\d+) renvois · table : (\d+) lignes, (\d+) renvois distincts", v)
controle("verdicts : extraction · table · distincts", tot.groups() if tot else None, ("146", "146", "146"), "« 146 entrées »")
somme = 62 + 2 + 25 + 2 + 35 + 10 + 2 + 3 + 2 + 2 + 1
controle("somme des onze verdicts écrits", somme, 146, "section D315, « Les 146 entrées ouvertes »")

# ------------------------------------------------------------------ 4. les captures
print("== 4. les captures")
imgs = sorted(os.listdir(f"{D}/captures/images"))
controle("nombre d'images", len(imgs), 46, "« 46 captures »")
tailles = {i: os.path.getsize(f"{D}/captures/images/{i}") for i in imgs}
controle("octets des images", sum(tailles.values()), 3_184_910, "« 3 184 910 octets »")
controle("sous 20 Mo", sum(tailles.values()) < 20 * 1024 * 1024, True, "« sous le seuil de 20 Mo donné par Ko »")
releve = open(f"{D}/captures/releve.txt", encoding="utf-8").read()
cap = re.findall(r"^CAPTURE (\S+) · .* · (\d+) octets$", releve, re.M)
controle("relevé : lignes CAPTURE, chaque taille = celle du fichier versé",
         (len(cap), all(tailles.get(n) == int(o) for n, o in cap)), (46, True), "releve.txt")
controle("relevé : « FIN · 46 capture(s) tentée(s) » et aucun « NE S'OUVRE PAS »",
         ("FIN · 46 capture(s) tentée(s)" in releve, "NE S'OUVRE PAS" in releve), (True, False), "releve.txt")
h12 = sha256(open(f"{D}/captures/images/12-client-fr-page-inconnue.jpg", "rb").read())
h25 = sha256(open(f"{D}/captures/images/25-client-fr-connexion-cible-du-bouton-reserver.jpg", "rb").read())
constat(f"capture 25 (cible du lien) et capture 12 (page inconnue) : octets identiques = {h12 == h25} — la cible rend la 404")
constat("« M2 » (backlog : « M1 et M2 de releve.txt ») : le relevé ne porte pas d'étiquette M2 — son résultat est la ligne "
        f"« CAPTURE 25 » ; le script définit M2 ({'M2 —' in open(f'{D}/captures/captures.spec.ts', encoding='utf-8').read()})")
cfg = open(f"{D}/captures/captures.config.ts", encoding="utf-8").read()
controle("configuration des captures : importe la configuration e2e", 'from "../../../../e2e/playwright.config"' in cfg, True,
         "« script versé qui réutilise la configuration e2e »")

# ------------------------------------------------------------------ 5. les trois défauts, au code de ffd32e9 et aux mesures
print("== 5. les trois défauts")
P = "apps/client/src/components/venue/booking-request-panel.tsx"
panneau = montre(DEPART, P).splitlines()
controle(f"{P}:36", panneau[35].strip(), "const WINDOW_DAYS = 182;", "backlog, « booking-request-panel.tsx:36 »")
venue = montre(DEPART, "packages/types/src/venue.ts").splitlines()
controle("packages/types/src/venue.ts:988", venue[987].strip(), "export const AVAILABILITY_MAX_WINDOW_DAYS = 92;", "backlog")
mf = open(f"{D}/mesures/mesurer-fenetre-panneau-sortie.txt", encoding="utf-8").read()
p = re.search(r"\(P, fenêtre du panneau\).* (\d+) jours bornes incluses · statut (\d+) .*windowTooWide", mf)
t = re.search(r"\(T, témoin\).* (\d+) jours bornes incluses · statut (\d+) · (\d+) jour\(s\) rendus", mf)
controle("mesure du panneau : bras P (jours, statut)", p.groups() if p else None, ("182", "400"), "« 400 windowTooWide »")
controle("mesure du panneau : bras T (jours, statut, rendus)", t.groups() if t else None, ("92", "200", "92"), "« Témoin à 92 jours : 200 »")
controle(f"{P}:431", panneau[430].strip(), '<Link className="btn" href="/connexion">', "backlog, « booking-request-panel.tsx:431 »")
liens = []
for f in git("ls-tree", "-r", "--name-only", DEPART, "apps/client/src").splitlines():
    if f.endswith((".tsx", ".ts")) and not re.search(r"\.(test|spec)\.tsx?$", f):
        for m in re.finditer(r'href=\{?[`"]([^`"]*connexion[^`"]*)[`"]', montre(DEPART, f)):
            liens.append((f.rsplit("/", 1)[1], m.group(1)))
fautifs = [l for l in liens if "/auth/connexion" not in l[1]]
controle("client : liens vers « connexion » qui ne visent pas /auth/connexion", fautifs,
         [("booking-request-panel.tsx", "/connexion")], "« tous les autres liens de connexion du client … visent la bonne »")
constat(f"parcouru : {len(liens)} liens « connexion » dans le code du client (hors tests)")
premier = git("log", "--reverse", "--format=%h %ad", "--date=short", "-S", "const WINDOW_DAYS = 182", DEPART, "--", P).splitlines()
controle("premier commit portant WINDOW_DAYS = 182", premier[0] if premier else None, "909702a 2026-08-03", "« Depuis 909702a (03/08/2026) »")
m1 = re.search(r"^M1 · .*$", releve, re.M)
controle("M1 : le lien « demander » vise /fr/connexion, celui de la visite /fr/auth/connexion",
         ('"href":"/fr/connexion","texte":"Se connecter pour demander"' in (m1.group(0) if m1 else ""),
          '"href":"/fr/auth/connexion"' in (m1.group(0) if m1 else "")), (True, True), "backlog")
c25 = re.search(r"^CAPTURE 25-\S+ · demandé (\S+) · statut (\d+)", releve, re.M)
controle("capture 25 : /fr/connexion, statut", c25.groups() if c25 else None, ("http://localhost:3100/fr/connexion", "404"), "« rend 404 »")
auth = montre(DEPART, "packages/api-client/src/auth-client.ts").splitlines()
constat("auth-client.ts:155-156 à ffd32e9 : " + " ⏎ ".join(l.strip() for l in auth[154:156]))
controle("auth-client.ts:155-156 : 204 toléré, puis res.json()", ("204" in auth[154], "res.json()" in auth[155]), (True, True),
         "backlog, « auth-client.ts:155-156 »")
md = open(f"{D}/mesures/mesurer-deletion-request-sortie.txt", encoding="utf-8").read()
a = re.search(r"\(A, sans demande\) GET /me/deletion-request : statut (\d+) · Content-Type (\S+) · Content-Length '(\d+)'", md)
controle("mesure suppression : bras A (statut, type, longueur)", a.groups() if a else None, ("200", "None", "0"), "« 200 avec un corps vide »")
controle("mesure suppression : bras B, corps JSON avec status ; C : A lève, B non",
         ("(B, avec demande) GET /me/deletion-request : statut 200" in md, "décodage JSON du corps A : LÈVE" in md,
          "décodage JSON du corps B : ne lève pas" in md and "clé status présente" in md), (True, True, True), "« deux bras »")
tests_ac = [f for f in git("ls-tree", "-r", "--name-only", DEPART, "packages/api-client").splitlines() if "account-client" in f]
controle("api-client : fichiers « account-client »", tests_ac, ["packages/api-client/src/account-client.ts"], "« Aucun test de account-client.ts »")
test_panneau = montre(DEPART, "apps/client/src/components/venue/booking-request-panel.test.tsx")
constat("booking-request-panel.test.tsx, doubles de fetch : "
        + " | ".join(sorted(set(re.findall(r"(?:vi\.fn|stubGlobal|mockResolvedValue)[^\n]{0,70}", test_panneau)))[:4]))
specs = {f: montre(DEPART, f) for f in git("ls-tree", "-r", "--name-only", DEPART, "e2e/specs").splitlines()}
visite = {f.rsplit("/", 1)[1] for f, s in specs.items() if re.search(r"goto\([^)]*/salles/", s)}
constat(f"e2e : specs qui naviguent vers /salles/<slug> : {sorted(visite) or 'aucune'} (D315 : « aucune spec e2e ne charge la fiche salle »)")
a5 = specs.get("e2e/specs/a5-cold-reload-vs-spa.e2e.ts", "")
controle("A5 : test.skip « nécessite une salle de fixture »", bool(re.search(r"test\.skip[\s\S]{0,400}salle de fixture", a5)), True, "backlog")
pl = "\n".join(panneau)
controle("panneau : <label · <input · <textarea · placeholder= · aria-label=",
         (pl.count("<label"), pl.count("<input"), pl.count("<textarea"), pl.count("placeholder="), pl.count("aria-label=")),
         (1, 7, 1, 6, 8), "« 1 <label> pour 8 champs — 7 <input>, 1 <textarea>, 6 placeholder, 8 aria-label »")
connus = {m: sum(plat(montre(DEPART, f)).count(m) for f in AUTORITE[1:]) for m in ("WINDOW_DAYS", 'href="/connexion"', "deletion-request")}
constat(f"à ffd32e9, dans les trois fichiers d'autorité (aplatis) : {connus} — « aucun n'était connu » se lit à leurs contextes")
bl = montre(DEPART, "ZWADJ_BACKLOG.md").splitlines()
controle("B:571 « pg-boss (already installed » · B:781 « aucune méthode pour les visites » · B:1325 « DÉFAUT B »",
         ("already installed" in bl[570], "aucune** méthode pour les visites" in bl[780], "DÉFAUT B" in bl[1324]), (True, True, True), "backlog")
pgb = subprocess.run(["git", "grep", "-l", "pg-boss", DEPART, "--", "*package.json"], capture_output=True, text=True).stdout.strip()
controle("pg-boss dans un package.json à ffd32e9", pgb, "", "« absent de tous les package.json »")
controle("visit-bookings-client existe à ffd32e9", "packages/api-client/src/visit-bookings-client.ts" in git("ls-tree", "-r", "--name-only", DEPART),
         True, "« visit-bookings-client existe »")
controle("B:843–844 (en-têtes) · B:853 (limiteur) · B:1548 (date)",
         ("HSTS" in bl[842] and "secure headers" in bl[843], "rate limiting" in bl[852], "DATE" in bl[1547]), (True, True, True),
         "fautes n° 4 de D315")
main = montre(DEPART, "apps/api/src/main.ts").splitlines()
controle("apps/api/src/main.ts:33", main[32].strip(), 'SwaggerModule.setup("api/docs", app, document);', "« main.ts:33 »")

# ------------------------------------------------------------------ 6. passe D277 de D315 et le contrôle « après écriture »
print("== 6. passe D277 de D315")
b = open(f"{D}/passe-d277/balayage.py", "rb").read()
controle("balayage.py : empreinte (préfixe)", sha256(b)[:8], "24802faf", "« copie à l'octet … (24802faf…) »")
corpus = sum(len(plat(montre(FIN, f))) for f in AUTORITE)
tetes = {n: open(f"{D}/passe-d277/{n}", encoding="utf-8").readline() for n in ("balayage-1.txt", "balayage-apres-ecriture.txt", "balayage-controle.txt")}
arbre = {n: int(re.search(r"arbre (\d+) car", h).group(1)) for n, h in tetes.items()}
controle("balayage-après : arbre = corpus commité à a7c09fa", (arbre["balayage-apres-ecriture.txt"], corpus), (corpus, corpus),
         "« pris après la dernière écriture de texte » (l'écart que D315 a trouvé chez D314)")
ap = open(f"{D}/passe-d277/balayage-apres-ecriture.txt", encoding="utf-8").read()
co = open(f"{D}/passe-d277/balayage-controle.txt", encoding="utf-8").read()
controle("balayage-contrôle = balayage-après (mêmes comptes)", co == ap, True, "« doit rendre les mêmes comptes »")
controle("balayage-1 : pris après la seule première écriture (arbre > HEAD)", arbre["balayage-1.txt"] > 1793451, True, "« après la seule première écriture »")

# ------------------------------------------------------------------ 7. audit de secrets et contrôles « 0 valeur réelle »
print("== 7. audit de secrets")
for n in ("audit-secrets-d315.txt", "audit-secrets-final.txt"):
    o = open(f"{D}/{n}", "rb").read()
    corps, _, der = o.rstrip(b"\n").rpartition(b"\n")
    m = re.search(rb"SCEAU sha256:([0-9a-f]{64})", der)
    controle(f"{n} : sceau couvre les octets qui le précèdent", bool(m) and m.group(1).decode() == sha256(corps + b"\n"), True, "sortie scellée (D298)")
    al = re.search(rb"alertes : (\d+) \(attendu 0\)", o)
    controle(f"{n} : alertes", int(al.group(1)) if al else None, 127, "commit de D315, « audit 127 »")
tri = open(f"{D}/controles/tri-audit-d315.txt", encoding="utf-8").read()
controle("tri : neuves", re.search(r"alertes ABSENTES de la précédente : (\d+)", tri).group(1), "3", "« 3 neuves triées (des mots) »")
for n, motif in (("aucune-valeur-reelle.txt", r"porteurs : (\d+) \(attendu 0\)"), ("aucun-cookie-reel.txt", r"porteurs : (\d+) \(attendu 0\)"),
                 ("controle-forme-chargily-sortie.txt", r"porteurs : (\d+) \(attendu 0\)")):
    m = re.search(motif, open(f"{D}/controles/{n}", encoding="utf-8").read())
    controle(f"{n} : porteurs", int(m.group(1)) if m else None, 0, "« 0 porteur »")

# ------------------------------------------------------------------ 8. écritures de D315, relues à a7c09fa
print("== 8. écritures de D315 relues à a7c09fa")
cont = montre(FIN, "ZWADJ_CONTINUITE.md")
controle("registre : dernière ligne D315", cont.rstrip().splitlines()[-1].startswith("| D315 |"), True, "registre")
controle("titre du rang 24 : CLOS LE 26/09/2026 : D315", "rang 24 · `[DOC]` **l'état du produit, parcours par parcours** ⛔ ~~**OUVERT LE 26/09/2026 : D315**~~ ⛔ **CLOS LE 26/09/2026 : D315**" in cont, True, "point d'entrée")
fin_ordre = cont[cont.index("## ORDRE DES RANGS"):cont.index("## ~~PROCHAIN LOT~~ — rang 24")]
lignes_rang = re.findall(r"^⇒ \*\*RANG (\d+) : EN ATTENTE", fin_ordre, re.M)
controle("ordre des rangs : dernière ligne « ⇒ RANG N » non barrée", lignes_rang[-1] if lignes_rang else None, "25", "« RANG 25 : EN ATTENTE »")
ag = montre(FIN, "AGENTS.md")
controle("AGENTS.md : annotation D315 (règle de D270) et pointeur « pièce datée »",
         ("(D315, 26/09/2026 : rang 24 **arbitré par Ko — documentaire**" in ag, "docs/preuves/D315/etat-produit/ETAT-PRODUIT.md" in ag), (True, True), "« AGENTS.md ×2 »")
blg = montre(FIN, "ZWADJ_BACKLOG.md")
sec = blg[blg.index("## Reports du 26/09/2026 — rang 24 CLOS"):blg.index("## Reports du 26/09/2026 — rang 23 CLOS")]
entrees = re.split(r"\n(?=- \[ \] )", sec)[1:]


def forme_d302(e: str) -> bool:
    # ⚠ DÉFAUT D'INSTRUMENT RÉPARÉ (D298) : la première version cherchait sur le texte BRUT ; l'entrée [DOC] porte
    # « À ordonner⏎  par Ko », coupé par l'enveloppe à ~120 colonnes — faux ✗. On cherche sur le texte APLATI (D294).
    p = plat(e)
    return ("BLOQUE" in p or "ordonner par Ko" in p) and "COÛT" in p


controle("calibration forme D302, bras négatif : entrée sans COÛT", forme_d302("- [ ] x ⇒ **BLOQUE** : y"), False, "cas connu")
controle("calibration forme D302, bras positif : « ordonner⏎  par Ko » coupé", forme_d302("- [ ] ⇒ **À ordonner\n  par Ko**. ⇒ **COÛT** : z"), True, "cas connu")
controle("reports de D315 : entrées ouvertes, chacune (BLOQUE ou « à ordonner par Ko ») et COÛT, texte aplati",
         (len(entrees), [forme_d302(e) for e in entrees]), (7, [True] * 7), "forme de D302")
diff = git("diff", "-U0", DEPART, FIN, "--", "ZWADJ_BACKLOG.md")
controle("backlog : aucune entrée cochée ni barrée par D315",
         (len(re.findall(r"^\+- \[x\]", diff, re.M)), len(re.findall(r"^-- \[ \]", diff, re.M))), (0, 0), "« Aucune entrée n'a été cochée ni barrée »")
supp = [l[1:] for l in git("diff", "-U0", DEPART, FIN, "--", "AGENTS.md", "ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md").splitlines()
        if l.startswith("-") and not l.startswith("---")]
constat(f"parcouru : {len(supp)} lignes supprimées par D315 dans les trois .md")
perdus = []
for l in supp:
    mots = [m for m in re.findall(r"[\wÀ-ÿ]{4,}", re.sub(r"~~", "", l))]
    if any(plat(cont + ag + blg).count(m) == 0 for m in mots):
        perdus.append(l[:80])
controle("lignes supprimées dont un mot (≥ 4 lettres) a disparu des trois fichiers", perdus, [], "D276 : barré, pas effacé")

print(f"\n{controles} contrôles · {ecarts} écart(s) (attendu : ce que la lecture trouve — chaque ✗ se lit à son contexte)")
