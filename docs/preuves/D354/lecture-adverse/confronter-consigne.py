#!/usr/bin/env python3
"""Lecture adverse de la consigne du rang 56 ET du cadrage de D340 contre le dépôt — D354.

MODE D'EMPLOI : depuis la RACINE, `python3 -I -X utf8 docs/preuves/D354/lecture-adverse/confronter-consigne.py [--sortie <chemin>]`.
Il lit des OBJETS GIT à SHA fixe (SHA_BASE = 0423963, l'état de DÉPART du lot) ; aucun fichier du disque n'est lu, sauf `--sortie` qu'il écrit lui-même (UTF-8, LF : jamais par
redirection du shell, D298). Les arguments de `git` sont passés en LISTE (D289) : aucun texte ne traverse un interpréteur.

POURQUOI IL EXISTE : la consigne (§ 3) exige « lecture adverse de cette consigne ET du cadrage contre le dépôt avant tout .md d'autorité ». Chaque affirmation VÉRIFIABLE devient un
contrôle qui rend (verdict, détail) ; le détail imprime CE QUI A ÉTÉ PARCOURU à côté de ce qui a été trouvé (D290), et l'attendu à côté du mesuré.

VERDICTS : ✓ vrai · ≈ vrai pour l'essentiel, IMPRÉCIS ou en TENSION sur un point (écrit, jamais tu) · ✗ FAUX · ? non vérifiable contre le dépôt (dit pourquoi).

INSTRUMENTS ÉCARTÉS : réutiliser `docs/preuves/D353/lecture-adverse/confronter-consigne.py` tel quel — collé aux affirmations du rang 55. Seuls ses PRINCIPES sont repris : objets git à
SHA fixe, texte APLATI avant toute recherche multi-mots (D277, D294), jamais un comptage par sous-chaîne sans contexte (D275), le compte de ce qui a été parcouru à côté du total (D290),
la calibration à deux bras (D286).

CALIBRATION (D286, ABANDON si un cas manque son verdict) : pour chaque sorte de contrôle employée — motif cherché dans un fichier d'un SHA, comptage d'occurrences, extraction d'une
table — un cas VRAI connu rend « présent » et un cas FAUX connu « absent ».
"""
import re
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

SHA_BASE = "04239635cb09b20a06a0bf758531216c6b34b107"
CONT, BACK, AGENTS = "ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md", "AGENTS.md"
CADRAGE = "docs/preuves/D340/cadrage.md"
SCHEMA = "apps/api/prisma/schema.prisma"
MIGR = "apps/api/prisma/migrations/20261104170000_staff_layer/migration.sql"
STORE = "apps/api/src/staff/staff-store.prisma.ts"
GUARD = "apps/api/src/staff/staff-session.guard.ts"
APPMOD = "apps/api/src/app.module.ts"

SORTIE = sys.argv[sys.argv.index("--sortie") + 1] if "--sortie" in sys.argv else None
LIGNES: list[str] = []
VERDICTS: list[str] = []


def dire(t: str = "") -> None:
    LIGNES.append(t)
    print(t)


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, encoding="utf-8", errors="replace").stdout


def a(chemin: str, sha: str = SHA_BASE) -> str:
    return git("show", f"{sha}:{chemin}").replace("\r\n", "\n")


def aplati(t: str) -> str:
    return re.sub(r"\s+", " ", t)


def liste(dossier: str, sha: str = SHA_BASE):
    return [l for l in git("ls-tree", "-r", "--name-only", sha, dossier).split("\n") if l]


def ctl(ident: str, verdict: str, titre: str, detail: str) -> None:
    VERDICTS.append(verdict)
    dire(f"[{ident}] {verdict}  {titre}")
    dire(f"      {detail}")


# ── CALIBRATION (deux bras) ───────────────────────────────────────────────────────────────────────────────────────
dire("CALIBRATION (deux bras, D286)")
cal_ok = True
# 1. un motif présent dans un fichier d'un SHA : cas VRAI (la table des capacités du cadrage porte « annuaire ») et cas FAUX (un jeton inventé)
vrai = "`annuaire`" in a(CADRAGE)
faux = "jeton-qui-n-existe-nulle-part-d354" in a(CADRAGE)
dire(f"  motif dans un fichier d'un SHA : vrai connu → {vrai} (attendu True) ; faux connu → {faux} (attendu False)")
cal_ok &= vrai is True and faux is False
# 2. comptage d'occurrences : le cadrage compte exactement 44 lignes « | MP-nn | » ; un motif impossible en compte 0
n_mp = len(re.findall(r"^\| MP-\d+ \|", a(CADRAGE), re.M))
n_faux = len(re.findall(r"^\| ZZ-\d+ \|", a(CADRAGE), re.M))
dire(f"  comptage : lignes MP-nn du cadrage → {n_mp} (attendu 44) ; motif impossible → {n_faux} (attendu 0)")
cal_ok &= n_mp == 44 and n_faux == 0
# 3. extraction d'une table : la table des capacités a 11 lignes de données ; un en-tête inexistant en rend 0
lg = a(CADRAGE).split("\n")


def table_apres(entete: str):
    out = []
    for i, l in enumerate(lg):
        if l.startswith(entete):
            for m in lg[i + 2 :]:
                if not m.startswith("|"):
                    break
                out.append(m)
            break
    return out


t_cap = table_apres("| capacité | MANAGER | EMPLOYEE |")
t_inex = table_apres("| entete-inexistant |")
dire(f"  extraction de table : capacités → {len(t_cap)} ligne(s) (attendu 11) ; en-tête inexistant → {len(t_inex)} (attendu 0)")
cal_ok &= len(t_cap) == 11 and len(t_inex) == 0
if not cal_ok:
    dire("✗ CALIBRATION MANQUÉE : l'instrument ne sert pas.")
    sys.exit(2)
dire("  calibration : tous les cas ont rendu leur verdict attendu.")
dire()

# ── 1. LA REPRISE (consigne § 0) ──────────────────────────────────────────────────────────────────────────────────
dire("1. LA REPRISE (consigne § 0)")
anc = subprocess.run(["git", "merge-base", "--is-ancestor", SHA_BASE, "HEAD"], capture_output=True).returncode == 0
parents = git("rev-list", "--parents", "-n", "1", "HEAD").split()
ctl("1.a", "✓" if anc else "✗", "origin/main = 0423963, le départ du lot : le SHA de base est ANCÊTRE de HEAD et le premier commit du lot l'a pour parent",
    f"ancêtre : {anc} ; HEAD a {len(parents) - 1} parent(s), le premier est {parents[1][:7] if len(parents) > 1 else '?'} (la table d'ouverture a été commitée seule avant ce script)")

cont = aplati(a(CONT))
back = aplati(a(BACK))
ag = aplati(a(AGENTS))
ok = all(
    x in cont
    for x in ("RANG 55 : CLOS SUR LE CODE (D353", "RANG 56 : EN ATTENTE DE CADRAGE DU RELECTEUR", "POUR MÉMOIRE **TRENTE-CINQ**")
)
ctl("1.b", "✓" if ok else "✗", "rang 55 CLOS (D353) ; compteur POUR MÉMOIRE TRENTE-CINQ ; « RANG 56 : EN ATTENTE DE CADRAGE DU RELECTEUR »",
    f"{len(cont):,} caractères aplatis parcourus ; les trois phrases : {ok}")

rows = re.findall(r"^\| D(\d+) \|", a(CONT), re.M)
mx = max(int(x) for x in rows)
n354 = [len(re.findall(r"\bD354\b", t)) for t in (cont, back, ag)]
ctl("1.c", "✓" if (mx == 353 and n354 == [0, 0, 0]) else "✗", "le dernier numéro du registre est 353 ; D354 est libre",
    f"{len(rows)} lignes de registre ; dernier = {mx} ; occurrences de D354 (continuité, backlog, AGENTS) = {n354} (attendu [0, 0, 0])")

dire()
# ── 2. CE QUE KO ADOPTE (consigne § 1) ────────────────────────────────────────────────────────────────────────────
dire("2. CE QUE KO ADOPTE (consigne § 1)")
cad = a(CADRAGE)
routes = {}
for m in re.finditer(r"^\| \*\*(K-\d+)\*\* \| `(\w+) ([^`]+)` \| ([^|]+) \| ([^|]+) \| (\w+) \|$", cad, re.M):
    routes[m.group(1)] = (m.group(2), m.group(3), m.group(4).strip(), m.group(6))
attendu = {"K-19": ("GET", "/pro/staff/members"), "K-20": ("POST", "/pro/staff/members"), "K-21": ("POST", "/pro/staff/members/:id/reset-password"), "K-22": ("POST", "/pro/staff/members/:id/disable")}
ok = all(routes.get(k, (None, None))[:2] == v and routes[k][3] == "2" for k, v in attendu.items())
ctl("2.a", "✓" if ok else "✗", "K-19 à K-22 : les quatre routes de la consigne sont celles du cadrage § 5.1, lot « 2 », « Manager »",
    f"{len(routes)} lignes K-nn lues dans le cadrage ; {[(k, routes[k][0], routes[k][1], routes[k][2], routes[k][3]) for k in attendu if k in routes]}")

cli = a("packages/api-client/src/staff-client.ts")
appels = re.findall(r'request<[^>]+>\("(/pro/staff/[^"]*)"', cli)
ctl("2.b", "✓" if len(appels) == 5 else "✗", "D182 : le client des K-14 à K-18 écrit chaque chemin en toutes lettres DANS l'appel `request(...)` — le patron que K-19 à K-22 suivront",
    f"`staff-client.ts` : {len(appels)} appel(s) à littéral : {appels} ; le test de contrat relève les chemins dans les SOURCES du client (`contract-api-client.int-spec.ts` : {'readFileSync' in a('apps/api/test/int/contract-api-client.int-spec.ts')})")

caps = {}
for l in t_cap:
    c = [x.strip() for x in l.strip().strip("|").split("|")]
    caps[c[0].strip("`")] = (c[1], c[2], c[3])
vue = {"agenda": "✓", "demandes": "✓", "devis": "✓", "clients": "✓", "reservations": "✓", "annuaire": "✓", "salle": "lecture seule", "prix": "lecture seule", "prestations": "lecture seule", "personnel": "—", "compte": "—"}
ok = all(caps.get(k, (None, None))[1] == v for k, v in vue.items()) and all(caps[k][0] == "✓" for k in caps)
ctl("2.c", "✓" if ok else "✗", "la table des capacités (consigne § 1 c) est celle du cadrage § 5.4 : l'employé ✓ sur cinq (+ annuaire), « lecture seule » sur trois, « — » sur deux ; le Manager ✓ partout",
    f"{len(caps)} capacités lues ; colonne EMPLOYEE : {[(k, v[1]) for k, v in caps.items()]}")

visites = "visit-availabilities" in caps.get("salle", ("", "", ""))[2]
ctl("2.d", "✓" if visites else "✗", "« les plages de VISITE (`visit-availabilities`) sont du côté « salle » » : la ligne `salle` du cadrage les porte",
    f"routes de la ligne `salle` : « {caps.get('salle', ('', '', ''))[2]} » ; `visit-availabilities` dedans : {visites}")

sec353 = a(CONT)
i = sec353.find("## Session du 19/11/2026 — D353")
j = sec353.find("\n## Session du", i + 10)
sec353 = sec353[i : j if j > 0 else len(sec353)]
defs = [n for n in range(231, 239) if re.search(rf"\*\*S-{n}\*\*", sec353)]
ctl("2.e", "✓" if defs == list(range(231, 239)) else "≈", "S-231 à S-238 (D353) existent, au statut « à ratifier » — la consigne § 1 d les ratifie par adoption",
    f"section D353 : {len(sec353):,} caractères parcourus ; S-nnn définies : {defs} ; consigne § 1 d : ratification par adoption (aucune écriture à faire d'ici que le .md d'autorité le consigne)")

ent = [l for l in a(BACK).split("\n") if "LE COÛT DE LA RELECTURE D'UNE RÉPONSE VIDE N'EST PAS MESURÉ" in l]
ctl("2.f", "✓" if len(ent) == 1 else "✗", "l'entrée [CLIENT][PERF] à ANNOTER (consigne § 1 e) existe, une fois, ouverte, et sa dernière phrase est « à ordonner par Ko »",
    f"{len(a(BACK).split(chr(10))):,} lignes de backlog parcourues ; occurrences : {len(ent)} ; ouverte « - [ ] » : {ent[0].startswith('- [ ]') if ent else None} ; « À ORDONNER PAR KO » : {'À ORDONNER PAR KO' in ent[0] if ent else None}")

dire()
# ── 3. LES CONSTATS DU RELECTEUR (consigne § 2) ───────────────────────────────────────────────────────────────────
dire("3. LES CONSTATS DU RELECTEUR (consigne § 2) — à RE-MESURER")
sch = a(SCHEMA)
bloc = re.search(r"^model ProStaffMember \{.*?^\}", sch, re.M | re.S)
bloc = bloc.group(0) if bloc else ""
cols_schema = ["role", "status", "disabledAt", "passwordExpiresAt", "mustChangePassword", "createdByMemberId", "passwordFailedCount", "passwordLockedUntil"]
manq_s = [c for c in cols_schema if not re.search(rf"^\s+{c}\s", bloc, re.M)]
mig = a(MIGR)
cols_sql = ["role", "status", "disabled_at", "password_expires_at", "must_change_password", "created_by_member_id", "password_failed_count", "password_locked_until"]
manq_m = [c for c in cols_sql if not re.search(rf'"{c}"', mig)]
ctl("3.a", "✓" if not manq_s and not manq_m else "✗", "R-1 : `ProStaffMember` porte déjà les colonnes nécessaires — dans le SCHÉMA ET dans la MIGRATION (D186 : l'autorité sur les garanties de la base est la migration) ; aucune migration n'est nécessaire",
    f"schéma : {len(cols_schema)} colonnes cherchées, manquantes {manq_s} ; migration `20261104170000_staff_layer` ({len(mig.splitlines())} lignes) : {len(cols_sql)} colonnes cherchées, manquantes {manq_m} ; ⚠ colonne « temporaire » : AUCUNE (le seul marqueur d'un mot de passe temporaire est `must_change_password`)")

ctrls = [f for f in liste("apps/api/src/staff") if f.endswith(".controller.ts")]
ROUTES_STAFF = re.findall(r'@(Post|Get)\("(\w+)"\)', a("apps/api/src/staff/staff-session.controller.ts"))
ctl("3.b", "✓" if ctrls == ["apps/api/src/staff/staff-session.controller.ts"] else "✗", "`apps/api/src/staff/` n'a qu'UN contrôleur : `staff-session.controller.ts` (activate, login, session, logout, password)",
    f"{len(liste('apps/api/src/staff'))} fichiers parcourus ; contrôleurs : {ctrls} ; routes : {ROUTES_STAFF}")

fouille = []
for dossier in ("packages/types/src", "apps/api/src"):
    for f in liste(dossier):
        if f.endswith(".ts") and re.search(r"STAFF_CAPABILIT|StaffCapabilit|\bpeut\(", a(f)):
            fouille.append(f)
n_fich = sum(len([f for f in liste(d) if f.endswith('.ts')]) for d in ("packages/types/src", "apps/api/src"))
ctl("3.c", "✓" if not fouille else "✗", "AUCUNE table de capacités n'existe (ni dans packages/types, ni dans apps/api)",
    f"{n_fich} fichiers .ts parcourus ; motifs `STAFF_CAPABILIT`, `StaffCapabilit`, `peut(` : {len(fouille)} fichier(s) {fouille}")

sept = {
    "availability-blocks": "apps/api/src/venues/availability-blocks.controller.ts",
    "availability": "apps/api/src/venues/availability.controller.ts",
    "bookings-pro": "apps/api/src/venues/bookings-pro.controller.ts",
    "visit-bookings": "apps/api/src/venues/visit-bookings.controller.ts",
    "quotes": "apps/api/src/venues/quotes.controller.ts",
    "quote-document": "apps/api/src/documents/quote-document.controller.ts",
    "pro-clients": "apps/api/src/clients/pro-clients.controller.ts",
}
etat = {}
for nom, f in sept.items():
    s = a(f)
    niv_classe = bool(re.search(r"^@Roles\(UserRole\.PRO\)", s, re.M))
    niv_methode = len(re.findall(r"^\s{2}@Roles\(UserRole\.PRO\)", s, re.M))
    classes = len(re.findall(r"^export class ", s, re.M))
    etat[nom] = (s != "", niv_classe, niv_methode, classes)
absents = [n for n, v in etat.items() if not v[0]]
mixtes = [n for n, v in etat.items() if not v[1]]
ctl("3.d", "≈" if not absents and mixtes else ("✓" if not absents else "✗"),
    "les sept contrôleurs nommés par le cadrage existent sous ces noms — MAIS deux ne sont pas des classes `@Roles(PRO)` pures : `availability.controller.ts` porte DEUX classes (la publique, `@Public()`, et `pro/venues` dont le seul handler PRO l'est au niveau de la MÉTHODE) ; `visit-bookings.controller.ts` est `@Roles(CLIENT)` avec deux handlers `@Roles(PRO)`",
    f"fichiers absents : {absents} ; (classe PRO ?, handlers PRO au niveau méthode, classes) : {etat} ⇒ une déclaration posée au niveau de la CLASSE s'applique aussi aux handlers CLIENT et publics de ces fichiers : INOFFENSIF (le garde sort pour tout rôle ≠ PRO et pour toute route `@Public()`), et c'est ce que le test dérivé du routeur doit mesurer")

ven = a("apps/api/src/venues/venues.controller.ts")
ctl("3.e", "✓" if re.search(r'@Get\("pro/venues/:id/publication"\)', ven) else "✗", "`venues.controller.ts` porte `GET pro/venues/:id/publication` (D349), une LECTURE",
    f"{len(ven.splitlines())} lignes parcourues ; route trouvée : {bool(re.search(r'@Get..pro/venues/:id/publication..', ven))}")

dire()
# ── 4. R-2 : LES CAPACITÉS ET LE GARDE ────────────────────────────────────────────────────────────────────────────
dire("4. R-2 — LES CAPACITÉS ET LE GARDE (consigne § 2, cadrage § 5.4)")
g = a(GUARD)
lit = [l.strip() for l in re.sub(r"//.*", "", g).split("\n") if re.search(r"mustChangePassword|passwordExpires|password_expires|\.method\b", l)]
ctl("4.a", "✓" if len(lit) == 1 and lit[0].startswith("mustChangePassword: touched.session.mustChangePassword") else "✗", "le garde de D341 ne lit AUJOURD'HUI ni la méthode HTTP ni l'expiration d'un mot de passe (la seule mention de `mustChangePassword` recopie le champ dans le contexte)",
    f"{len(g.splitlines())} lignes parcourues ; LIGNES hors commentaires qui portent `mustChangePassword`, `passwordExpires` ou `.method` : {len(lit)} {lit}")

ctl("4.b", "≈", "R-2 : « une fonction pure `peut(role, capacité)` » — DEUX arguments ne disent pas « lecture seule » : la table du cadrage a trois états par rôle (✓, lecture seule, —)",
    f"colonne EMPLOYEE du cadrage : {sorted(set(v[1] for v in caps.values()))} ⇒ une fonction à deux arguments ne distingue pas lire de écrire. LECTURE DE LA SESSION (S-239, à ratifier) : `peut(role, capacité, acte)` où `acte` ∈ {{lire, écrire}} ; la table reste UNE donnée dans `packages/types`")

acc = a("apps/api/src/account/account.controller.ts")
rt = re.findall(r"@(Get|Post|Patch|Delete)\(\"([^\"]+)\"\)", acc)
roles_acc = re.findall(r"^@Roles\(", acc, re.M)
ctl("4.c", "✓" if len(rt) == 6 and not roles_acc else "✗", "« le compte commun (`/me/*`) : MANAGER seul » exige une DÉCLARATION — `account.controller.ts` n'a aucun `@Roles` et porte six routes, dont une LECTURE (`GET deletion-request`) que la règle par défaut S-107 (« lectures à tous ») laisserait à l'employé",
    f"{len(acc.splitlines())} lignes parcourues ; routes : {rt} ; `@Roles` : {len(roles_acc)} ⇒ la déclaration `compte` sur cette classe n'est PAS un ajout de la session : R-2 l'exige")

pro_ctrl = []
for f in liste("apps/api/src"):
    if f.endswith(".controller.ts") and re.search(r"@Roles\(UserRole\.PRO\)", a(f)):
        pro_ctrl.append(f.split("/")[-1].replace(".controller.ts", ""))
non_sept = sorted(set(pro_ctrl) - set(sept) - {"staff-session"})
ctl("4.d", "≈", "R-2 : « les déclarations d'EMPLOYÉ posées AU NIVEAU DE LA CLASSE sur les sept contrôleurs » — six AUTRES contrôleurs `@Roles(PRO)` existent ; sans déclaration, la ligne `salle`, `prix` ou `prestations` de la table serait une donnée INERTE",
    f"{len(pro_ctrl)} contrôleurs `@Roles(PRO)` parcourus : {sorted(pro_ctrl)} ; hors les sept et hors la session du personnel : {non_sept} ⇒ LECTURE DE LA SESSION (S-239, à ratifier) : ils DÉCLARENT aussi leur capacité (`salle`, `prix`, `prestations`) — aucun comportement ne change (l'employé lit, n'écrit pas : c'est déjà la règle par défaut) ; ce qui change, c'est que « changer d'avis = changer UNE ligne » devient VRAI de ces trois lignes")

ctl("4.e", "≈", "cadrage § 5.4 : deux capacités (`demandes`, `reservations`) pour UN contrôleur (`bookings-pro`) et une (`annuaire`) sans route — une déclaration de CLASSE n'en porte qu'une",
    f"routes de la table : demandes = « {caps['demandes'][2]} », reservations = « {caps['reservations'][2]} », annuaire = « {caps['annuaire'][2]} » ⇒ LECTURE (S-239) : `bookings-pro` déclare `demandes` ; `reservations` et `annuaire` restent des LIGNES DE DONNÉES sans déclarant (même décision de table pour les deux, ✓ pour les deux rôles) ; la garde de source le dit au lieu de l'ignorer")

dire()
# ── 5. R-3 : S-104 ────────────────────────────────────────────────────────────────────────────────────────────────
dire("5. R-3 — S-104 : LE MOT DE PASSE EXPIRÉ (consigne § 2, cadrage MP-14 et MP-25)")
sql_files = [f for f in liste("apps/api/src") if f.endswith(".ts") and ".spec." not in f]
w_true = [f for f in sql_files if re.search(r"must_change_password\s*=\s*true", a(f), re.I)]
n_exp = {f: len(re.findall(r"password_expires_at", a(f))) for f in sql_files if "password_expires_at" in a(f)}
cmp_exp = [f for f in sql_files if re.search(r"password_expires_at\s*(<=|>=|<|>)|(<=|>=|<|>)\s*[\w.]*password_expires_at", a(f))]
ctl("5.a", "✓" if not w_true and not cmp_exp else "✗", "S-104 N'EST PAS CODÉE : rien n'écrit `must_change_password = true` et aucun refus ne lit `password_expires_at` (AGENTS.md, D341)",
    f"{len(sql_files)} sources parcourues ; écritures `must_change_password = true` : {w_true} ; fichiers qui mentionnent `password_expires_at` : {n_exp} ; comparaisons : {cmp_exp}")

patr = aplati(a(CONT))
ctl("5.b", "✓" if "Fonction pure `etatDuCompte(membre, maintenant)`" in patr and not any("etatDuCompte" in a(f) for f in sql_files) else "✗", "`etatDuCompte(membre, maintenant)` est nommée par la rubrique « Patrons » de D340 et N'EXISTE PAS dans le code",
    f"rubrique trouvée dans la continuité : {'Fonction pure `etatDuCompte(membre, maintenant)`' in patr} ; fichiers de `apps/api/src` qui la définissent : {[f for f in sql_files if 'etatDuCompte' in a(f)]}")

ctl("5.c", "≈", "`etatDuCompte(membre, MAINTENANT)` face à S-101 et MP-41 : « aucun `new Date()` dans les services du personnel, l'heure est celle de la BASE » — d'où vient `maintenant` ?",
    "le module pur reçoit `maintenant` en PARAMÈTRE (S-109 : « l'heure vient de la base ou d'un paramètre ») ; LECTURE (S-241, à ratifier) : le MAGASIN le rend, lu par `now()` dans l'instruction même qui lit le membre — la règle a UNE copie, le temps reste celui de la base ; la garde de source (aucun `new Date`) reste vraie")

ctl("5.d", "≈", "R-3 : « un mot de passe TEMPORAIRE de 7 jours expiré : la connexion est REFUSÉE » — quel refus ? et « aucune autre route ne passe » (état « à changer ») — quel code ?",
    "ni la consigne ni le cadrage ne nomment de code. LECTURES (S-242, à ratifier) : (i) un temporaire expiré = le MÊME 401 `STAFF_INVALID_CREDENTIALS`, sans réservation d'essai, un argon2 factice — l'invariant « aucun refus ne dit pourquoi » (D341) ne se perce pas ; (ii) une route hors changement de mot de passe et déconnexion, dans l'état « à changer » = 403 `STAFF_CAPABILITY_DENIED` (le code ratifié par S-100, que D341 R-2 a laissé à ce lot) — AUCUN code neuf ; coût : le message est générique")

ctl("5.e", "≈", "« temporaire » n'est pas une colonne : la distinction entre un mot de passe de 90 jours et un TEMPORAIRE de 7 jours repose sur `must_change_password`",
    "DR5 : « création ou réinitialisation : généré par défaut, 7 jours, changement obligatoire » ⇒ `must_change_password = true` ET `password_expires_at = now() + 7 jours` ; un mot de passe ordinaire : `false` et 90 jours. LECTURE (S-241) : `must_change_password` vaut « temporaire » ; la migration ne change pas (R-1, DR8)")

dire()
# ── 6. R-4 : JAMAIS ZÉRO MANAGER ──────────────────────────────────────────────────────────────────────────────────
dire("6. R-4 — « JAMAIS ZÉRO MANAGER » (consigne § 2, cadrage § 3 et MP-6, MP-31)")
st = a(STORE)
for_up = [(i + 1, l.strip()[:80]) for i, l in enumerate(st.split("\n")) if "FOR UPDATE" in re.sub(r"//.*", "", l)]
ctl("6.a", "✓" if len(for_up) == 2 else "≈", "l'ordre des verrous S-101 : L1 (le profil) < L2 (les membres) < L3 (les appareils) < L4 (les sessions) ; le magasin de D341 ne prend L1 que par l'`UPDATE` de l'activation",
    f"{len(st.splitlines())} lignes parcourues ; `FOR UPDATE` HORS commentaires : {for_up} (attendu 2 : le CTE de la réservation et le verrou de `changePassword`, tous deux sur les membres) ; `UPDATE pro_profiles` : {len(re.findall(r'UPDATE pro_profiles', st))} (l'activation) ⇒ la désactivation prend le verrou de L1 par un `SELECT … FOR UPDATE` NEUF")

trig = re.findall(r"CREATE\s+(?:OR REPLACE\s+)?(?:CONSTRAINT\s+)?TRIGGER", mig, re.I)
ctl("6.b", "✓" if not trig else "✗", "« aucun déclencheur en base » (cadrage § 3.2) : la migration de la tranche n'en porte aucun",
    f"{len(mig.splitlines())} lignes parcourues ; `CREATE TRIGGER` : {len(trig)}")

rl = a("apps/api/test/int/row-lock.ts")
EXPORTS_RL = re.findall(r"export (?:async )?(?:function|const|class) (\w+)", rl)
ctl("6.c", "✓" if "export" in rl and len(rl) > 200 else "✗", "R-4 « comme les courses de D350 » : l'aide qui FORCE un entrelacement par un verrou de ligne tenu hors du service existe",
    f"`row-lock.ts` : {len(rl.splitlines())} lignes ; exports : {EXPORTS_RL}")

ctl("6.d", "?", "cadrage MP-6 : « 2 requêtes simultanées répétées 30 fois ; invariant : TOUJOURS 1 Manager actif » — la répétition n'est pas un entrelacement forcé",
    "une répétition aléatoire peut ne JAMAIS entrelacer. LECTURE (S-243, à ratifier) : en plus des 30 répétitions, un entrelacement FORCÉ par `row-lock.ts` (la seconde désactivation attend le verrou de L1 tenu hors du service), et l'ordre inverse — rouge d'abord, comme D350. Non vérifiable ici : se mesure sur PostgreSQL réel")

dire()
# ── 7. R-5 : LE TEMPORAIRE ET LE JOURNAL ──────────────────────────────────────────────────────────────────────────
dire("7. R-5 — K-21, LE TEMPORAIRE, LE JOURNAL (consigne § 2, S-105, S-112)")
am = a(APPMOD)
red = re.search(r"^\s*redact:\s*(\[.*\])\s*,?\s*$", am, re.M)  # la LIGNE : le tableau contient `]` DANS une chaîne (un motif `[^\]]*` coupait au premier)
ctl("7.a", "✓" if red and 'res.headers["set-cookie"]' in red.group(1) else "✗", "le journal des requêtes masque DÉJÀ `set-cookie` (S-112, SIG-1, D341) — la consigne le rappelle « comme `password` »",
    f"`app.module.ts` : {len(am.splitlines())} lignes ; `redact` = {red.group(1).strip() if red else None}")

ctl("7.b", "≈", "R-5 : « `set-cookie` comme `password` masqués au journal » — `password` n'est dans AUCUN chemin de `redact`, et aucun corps de requête ou de réponse n'est journalisé par `pino-http`",
    "le temporaire voyage dans le CORPS de la réponse : ce qui le garde hors du journal n'est pas un masque mais l'ABSENCE de journalisation des corps. LECTURE (S-244, à ratifier) : une garde qui lit la SORTIE RÉELLE du journal (patron `log-set-cookie.int-spec.ts`) pendant K-20 et K-21 ; `app.module.ts` n'est modifié QUE si cette lecture trouve le temporaire (déclaré conditionnel dans la table)")

enum_end = re.search(r"enum StaffSessionEndReason \{([^}]*)\}", sch)
ctl("7.c", "✓" if enum_end and "PASSWORD_CHANGED" in enum_end.group(1) else "✗", "S-105 : la réinitialisation met fin à TOUTES les sessions — la fin à écrire existe dans l'énumération ratifiée (aucune valeur « RESET » : DR8 interdit d'en ajouter)",
    f"valeurs : {[x.strip() for x in enum_end.group(1).split() if x.strip()] if enum_end else None} ⇒ LECTURE (S-245) : la fin d'une session révoquée par une réinitialisation est `PASSWORD_CHANGED`, celle d'une désactivation `DISABLED` (cadrage MP-30)")

pin_ecrit = [f for f in sql_files if re.search(r"pin_hash\s*=|pin_failed_count\s*=|pin_locked_at\s*=|INSERT[^;]*pin_hash", a(f), re.I)]
ctl("7.d", "✓" if not pin_ecrit else "✗", "R-5 : « le PIN n'existe pas encore (3b) : rien à révoquer de ce côté » — aucune source n'écrit une colonne `pin_*`",
    f"{len(sql_files)} sources parcourues ; sources qui écrivent `pin_hash`, `pin_failed_count` ou `pin_locked_at` : {pin_ecrit} ⇒ la réinitialisation ne touche aucune colonne de PIN ; **le lot 3b devra l'ajouter** (report de backlog)")

dire()
# ── 8. R-6 : L'AUDIT ──────────────────────────────────────────────────────────────────────────────────────────────
dire("8. R-6 — L'AUDIT (consigne § 2, DR5, S-108, patron de D349)")
types_store = a("apps/api/src/staff/staff-store.types.ts")
entries = re.findall(r'action: "([a-z_.|" ]+)"', types_store[types_store.find("export type StaffAuditEntry") :])  # SEULE l'union (le type d'entrée d'un échec porte aussi un `action:`)
site = len(re.findall(r"auditLog\s*\.\s*create\s*\(", st))
ctl("8.a", "✓" if site == 1 else "✗", "l'audit du personnel n'a QU'UN site d'écriture (`ecrireAudit`), à charge utile fermée : les trois actions de gestion se déclarent dans la même union",
    f"`staff-store.types.ts` : `StaffAuditEntry` déclare {len(entries)} forme(s) d'action {entries} ; `auditLog.create` dans l'adaptateur : {site} occurrence")

dr5 = aplati(a(CONT))
i5 = dr5.find("Journal : audit_logs.actor_member_id sur toute action de personnel")
extrait = dr5[i5 : i5 + 330]
r8 = re.search(r"R-8\. L'audit « création et modification de fiche » \(DR5\) et S-107 appartiennent à L36-3a-2", dr5)
cad_f = [l for l in cad.split("\n") if l.startswith("| 2 | `apps/api/src/clients/pro-clients.service.ts`")]
ctl("8.b", "≈", "R-6 : « L'AUDIT DES FICHES (DR5, S-108) » — puis des actions du PERSONNEL (« chaque création, réinitialisation et désactivation, acteur = le membre Manager ») : deux sens de « fiche »",
    f"DR5 : « {extrait[:200]}… » ; D341 R-8 : « l'audit « création et modification de fiche » (DR5) … appartient à L36-3a-2 » (trouvé : {bool(r8)}) ; cadrage § 5.5 : ligne « lot 2 » sur `pro-clients.service.ts` « à ratifier comme périmètre » (trouvée : {len(cad_f) == 1}) ⇒ LECTURE (S-240, à ratifier — OBJET DE LA QUESTION UNIQUE) : l'audit livré est celui des trois actions de gestion du personnel (le corps de R-6 ne parle que de celles-là, et « acteur = le membre Manager » ne vaut pas d'une fiche modifiée par un employé) ; l'audit des FICHES CLIENT n'est pas écrit — le faire modifierait du code du rang 41 sans demande explicite (`CLAUDE.md`)")

adm = a("apps/api/test/int/admin-audit.int-spec.ts")
N_TRIG_ADM = len(re.findall(r"CREATE\s+(?:CONSTRAINT\s+)?TRIGGER", adm, re.I))
ctl("8.c", "✓" if "TRIGGER" in adm.upper() and "DEFERRABLE" in adm.upper() else "≈", "R-6 : « se mesure par un échec forcé dans la transaction (patron de D349) » — le patron existe : un déclencheur d'insertion refuse l'action, puis un déclencheur DIFFÉRÉ refuse le commit",
    f"`admin-audit.int-spec.ts` : {len(adm.splitlines())} lignes ; `CREATE TRIGGER` : {N_TRIG_ADM} ; `DEFERRABLE` : {adm.upper().count('DEFERRABLE')}")

dire()
# ── 9. R-7, R-8, § 3 ET LE CADRAGE LUI-MÊME ──────────────────────────────────────────────────────────────────────
dire("9. R-7, R-8, § 3 ET LE CADRAGE LUI-MÊME")
outils = {
    "docs/preuves/D352/neutralisation/lancer-touchees.py": "lancer-touchees.py",
    "docs/preuves/D352/portes/masquer-jetons.py": "masquer-jetons.py",
    "docs/preuves/D340/portes/passe-secteur.sh": "passe-secteur.sh",
    "neutralisation/neutralize-r44.py": "le harnais de D341",
    "neutralisation/audit-secrets.py": "l'audit de secrets (D298)",
}
manq = [v for k, v in outils.items() if not a(k)]
ctl("9.a", "✓" if not manq else "✗", "les outils de la forme existent (lancer-touchees.py, masquer-jetons.py, le pilote des portes, `neutralize-r44.py`, l'audit de secrets)",
    f"{len(outils)} chemins cherchés ; manquants : {manq} ; ⚠ `lancer-touchees.py` et `masquer-jetons.py` sont des PIÈCES VERSÉES (D352), pas des fichiers de `neutralisation/` : copiés tels quels dans D354")

GARDES_APP = re.findall(r"useClass: (\w+)", a(APPMOD))
ctl("9.b", "≈", "cadrage § 1 : « gardes globaux : exactement TROIS » ; § 4 MP-20 ; § 5.1 « exemptée : cinq routes »",
    f"PÉRIMÉ depuis D341 : le garde du personnel est le QUATRIÈME garde global ({GARDES_APP}) ; quatre routes exemptées (la cinquième, `pin-login`, est de 3b) ; le cadrage est d'avant D341 — sa photo de départ n'est plus l'état du code, ses modes de défaillance § 4 restent la liste de ce lot")

ctl("9.c", "≈", "cadrage § 1 : « routes : un compte PRO en atteint 55 » — d'avant D341 (cinq routes du personnel) et D349 (`GET …/publication`)",
    "le plancher « au moins 55 » de `staff-session-guard.int-spec.ts` reste vrai ; K-19 à K-22 portent le nombre de routes d'un PRO de quatre de plus ; aucune liste n'est recopiée : le test dérive du routeur (D119)")

ctl("9.d", "?", "R-7 : « AUCUN écran : rien dans apps/pro ni apps/client » ; consigne § 4 « Gestes de Ko : aucun »",
    "se constate sur le DIFF DE FIN DE LOT (aucun fichier de `apps/pro` ni de `apps/client`) ; la table d'ouverture n'en déclare aucun")

dire()
tot = len(VERDICTS)
c = {k: VERDICTS.count(k) for k in ("✓", "≈", "✗", "?")}
dire(f"TOTAL : {tot} contrôles — {c['✓']} ✓ · {c['≈']} ≈ · {c['✗']} ✗ · {c['?']} ?   (attendu : la somme égale le nombre de contrôles listés ci-dessus)")
dire(f"somme des verdicts = {sum(c.values())} ; contrôles imprimés = {tot} ; égalité : {sum(c.values()) == tot}")
if SORTIE:
    with open(SORTIE, "w", encoding="utf-8", newline="") as f:
        f.write("\n".join(LIGNES) + "\n")
sys.exit(0 if c["✗"] == 0 else 1)
