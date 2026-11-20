#!/usr/bin/env python3
"""Lecture adverse de la consigne du rang 57 contre le dépôt — D355.

MODE D'EMPLOI : depuis la RACINE, `python3 -I -X utf8 docs/preuves/D355/lecture-adverse/confronter-consigne.py [--sortie <chemin>]`.
Il lit des OBJETS GIT à SHA fixe (SHA_BASE = cc653dd, l'état de DÉPART du lot) ; seuls le dépôt vivant (`git status`, `git stash list`, `git rev-parse origin/main`) et `--sortie`, qu'il écrit lui-même
(UTF-8, LF : jamais par redirection du shell, D298), sont lus ou écrits hors de ces objets. Les arguments de `git` sont passés en LISTE (D289) : aucun texte ne traverse un interpréteur.

POURQUOI IL EXISTE : la consigne (§ 3) exige « lecture adverse de cette consigne contre le dépôt avant tout .md d'autorité ». Chaque affirmation VÉRIFIABLE devient un contrôle qui rend (verdict, détail) ;
le détail imprime CE QUI A ÉTÉ PARCOURU à côté de ce qui a été trouvé (D290), et l'attendu à côté du mesuré.

VERDICTS : ✓ vrai · ≈ vrai pour l'essentiel, IMPRÉCIS ou en TENSION sur un point (écrit, jamais tu) · ✗ FAUX · ? non vérifiable contre le dépôt (dit pourquoi).

INSTRUMENTS ÉCARTÉS : réutiliser `docs/preuves/D354/lecture-adverse/confronter-consigne.py` tel quel — collé aux affirmations du rang 56 et au cadrage de D340. Seuls ses PRINCIPES sont repris : objets git à SHA
fixe, texte APLATI avant toute recherche multi-mots (D277, D294), jamais un comptage par sous-chaîne sans contexte (D275), le compte de ce qui a été parcouru à côté du total (D290), la calibration à deux bras (D286).

CALIBRATION (D286, ABANDON si un cas manque son verdict) : pour chaque sorte de contrôle employée — motif dans un fichier d'un SHA, comptage de lignes, filiation git — un cas VRAI connu rend « présent / vrai » et
un cas FAUX connu « absent / faux ».
"""
import re
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

SHA_BASE = "cc653dd9b1a74b319ab3fe6e0f4a6e5df18d1f2a"
CONT, BACK, AGENTS, CLAUDE = "ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md", "AGENTS.md", "CLAUDE.md"
CADRAGE = "docs/preuves/D340/cadrage.md"
SCHEMA = "apps/api/prisma/schema.prisma"
MIGR = "apps/api/prisma/migrations/20261104170000_staff_layer/migration.sql"
STORE = "apps/api/src/staff/staff-store.prisma.ts"
STORE_T = "apps/api/src/staff/staff-store.types.ts"
SERVICE = "apps/api/src/staff/staff-session.service.ts"
ROWLOCK = "apps/api/test/int/row-lock.ts"
ADMAUDIT = "apps/api/test/int/admin-audit.int-spec.ts"
FICHE_STORE = "apps/api/src/clients/pro-client-store.prisma.ts"
QUOTE_STORE = "apps/api/src/venues/quote-store.prisma.ts"
QUOTES_SVC = "apps/api/src/venues/quotes.service.ts"

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


def lignes_commencant_par(texte: str, debut: str):
    return [l for l in texte.split("\n") if l.startswith(debut)]


# ── CALIBRATION (deux bras) ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
dire("CALIBRATION (deux bras, D286)")
cal_ok = True
# 1. un motif présent dans un fichier d'un SHA : cas VRAI (la ligne MP-33 du cadrage) et cas FAUX (un jeton inventé)
vrai = "| MP-33 |" in a(CADRAGE)
faux = "jeton-qui-n-existe-nulle-part-d355" in a(CADRAGE)
dire(f"  motif dans un fichier d'un SHA : vrai connu → {vrai} (attendu True) ; faux connu → {faux} (attendu False)")
cal_ok &= vrai is True and faux is False
# 2. comptage de lignes : le cadrage compte exactement 44 lignes « | MP-nn | » ; un motif impossible en compte 0
n_mp = len(re.findall(r"^\| MP-\d+ \|", a(CADRAGE), re.M))
n_faux = len(re.findall(r"^\| ZZ-\d+ \|", a(CADRAGE), re.M))
dire(f"  comptage : lignes MP-nn du cadrage → {n_mp} (attendu 44) ; motif impossible → {n_faux} (attendu 0)")
cal_ok &= n_mp == 44 and n_faux == 0
# 3. filiation git : SHA_BASE est un ancêtre de HEAD (vrai connu) ; HEAD n'est PAS un ancêtre de SHA_BASE (faux connu, tant que le lot a au moins un commit)
anc_vrai = subprocess.run(["git", "merge-base", "--is-ancestor", SHA_BASE, "HEAD"], capture_output=True).returncode == 0
anc_faux = subprocess.run(["git", "merge-base", "--is-ancestor", "HEAD", SHA_BASE], capture_output=True).returncode == 0
tete = git("rev-parse", "HEAD").strip()
dire(f"  filiation : SHA_BASE ancêtre de HEAD → {anc_vrai} (attendu True) ; HEAD ancêtre de SHA_BASE → {anc_faux} (attendu False, HEAD = {tete[:7]} ≠ SHA_BASE {SHA_BASE[:7]})")
cal_ok &= anc_vrai is True and (anc_faux is False or tete == SHA_BASE)
if not cal_ok:
    dire("✗ CALIBRATION MANQUÉE : l'instrument ne sert pas.")
    sys.exit(2)
dire("  calibration : tous les cas ont rendu leur verdict attendu.")
dire()

# ── 1. LA REPRISE (consigne § 0) ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
dire("1. LA REPRISE (consigne § 0)")
origin = git("rev-parse", "origin/main").strip()
ctl("1.a", "✓" if (anc_vrai and origin == SHA_BASE) else "≈", "HEAD descend de SHA_BASE ; origin/main = cc653dd au départ",
    f"SHA_BASE ancêtre de HEAD : {anc_vrai} ; `git rev-parse origin/main` = {origin[:7]} (attendu {SHA_BASE[:7]}). « vérifié par le relecteur le 19/11/2026 » : ? — un fait sur la vérification d'un tiers, pas contre le dépôt.")
cont0 = a(CONT)
ordre = aplati(cont0)
r56 = "⇒ **RANG 56 : CLOS SUR LE CODE (D354, 19/11/2026)" in ordre
ctl("1.b", "✓" if r56 else "✗", "rang 56 CLOS (D354)", f"« ⇒ RANG 56 : CLOS SUR LE CODE (D354, 19/11/2026) » dans l'ordre des rangs de {CONT} à SHA_BASE : {r56} ({len(ordre)} caractères aplatis parcourus)")
l36 = lignes_commencant_par(cont0, "| compteur |")
cpt = [l for l in l36 if "TRENTE-SIX" in l and "POUR MÉMOIRE" in l]
ctl("1.c", "✓" if len(cpt) >= 1 else "✗", "compteur POUR MÉMOIRE TRENTE-SIX", f"{len(l36)} ligne(s) « | compteur | » examinée(s) ; {len(cpt)} portent « POUR MÉMOIRE » et « TRENTE-SIX » (attendu ≥ 1)")
r57 = "⇒ **RANG 57 : EN ATTENTE DE CADRAGE DU RELECTEUR.**" in ordre
pin = "L36-3b, le PIN" in ordre
ctl("1.d", "✓" if (r57 and pin) else "✗", "« RANG 57 : EN ATTENTE DE CADRAGE DU RELECTEUR », candidat L36-3b, le PIN", f"ligne de l'ordre : {r57} ; « L36-3b, le PIN » présent : {pin}")
st = git("status", "--porcelain", "--untracked-files=all").split("\n")
hors = [l for l in st if l and "docs/preuves/D355/" not in l]
stash = [l for l in git("stash", "list").split("\n") if l]
ctl("1.e", "✓" if (not hors and not stash) else "≈", "arbre propre (hors les pièces de ce lot), sans stash",
    f"{len([l for l in st if l])} ligne(s) de `git status` examinée(s) ; hors `docs/preuves/D355/` : {len(hors)} (attendu 0) ; stash : {len(stash)} (attendu 0)")
dire()

# ── 2. LES CITATIONS DE LA CONSIGNE CONTRE LEURS SOURCES ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
dire("2. LES CITATIONS DE LA CONSIGNE CONTRE LEURS SOURCES")
dr5 = lignes_commencant_par(cont0, "- Journal : audit_logs.actor_member_id sur toute action de personnel")
cit = ["audit_logs.actor_member_id sur toute action de personnel (", "création et modification de fiche)."]
ok_dr5 = len(dr5) == 1 and all(c in dr5[0] for c in cit)
ctl("2.a", "✓" if ok_dr5 else "✗", "DR5 : « Journal : audit_logs.actor_member_id sur toute action de personnel (…, création et modification de fiche) »",
    f"{len(dr5)} ligne(s) « - Journal : audit_logs.actor_member_id… » (attendu 1) ; les deux fragments cités s'y trouvent : {ok_dr5} ; la ligne liste : {', '.join(re.findall(r'\(([^)]*)\)', dr5[0])) if dr5 else '—'}")
prop = "Proposées par le relecteur, adoptées par Ko tel quel le 22/10/2026" in aplati(cont0)
ctl("2.b", "✓" if prop else "✗", "DR5 « décision de Ko, ratifiée »", f"« Proposées par le relecteur, adoptées par Ko tel quel le 22/10/2026 » présent dans le bloc DR1-DR8 : {prop} — la décision est de Ko par ADOPTION, proposée par le relecteur : la consigne l'écrit « de Ko, ratifiée » (exact en substance)")
r8 = lignes_commencant_par(cont0, "- R-8. L'audit « création et modification de fiche » (DR5) et S-107 appartiennent à L36-3a-2")
ctl("2.c", "✓" if len(r8) == 1 else "✗", "R-8 de D341 a rangé ce point dans L36-3a-2", f"{len(r8)} ligne(s) « - R-8. L'audit « création et modification de fiche » (DR5) et S-107 appartiennent à L36-3a-2, pas à ce lot » (attendu 1)")
c354 = a("docs/preuves/D354/consigne.md")
r6 = lignes_commencant_par(c354, "- R-6.")
ok_r6 = len(r6) == 1 and "L'audit des fiches (DR5, S-108)" in r6[0] and "création, réinitialisation et désactivation" in r6[0]
ctl("2.d", "✓" if ok_r6 else "✗", "la consigne du rang 56 (R-6) a écrit « L'audit des fiches » puis décrit des actions du personnel",
    f"{len(r6)} ligne(s) « - R-6. » dans docs/preuves/D354/consigne.md ; « L'audit des fiches (DR5, S-108) » ET « création, réinitialisation et désactivation » dans la même ligne : {ok_r6} — « l'a mal lu en fiches du personnel » est une lecture que le texte porte")
cad = a(CADRAGE)
mp33 = lignes_commencant_par(cad, "| MP-33 |")
ok33 = len(mp33) == 1 and "actor_member_id" in mp33[0] and "même transaction" in mp33[0]
ctl("2.e", "✓" if ok33 else "✗", "cadrage § 4 — MP-33 : une ligne par action de personnel, `actor_member_id`, aucune donnée secrète, même transaction",
    f"{len([l for l in cad.split(chr(10)) if l.startswith('| MP-')])} lignes MP-nn parcourues ; MP-33 trouvée {len(mp33)} fois ; `actor_member_id` et « même transaction » dans la ligne : {ok33}")
c55 = lignes_commencant_par(cad, "| 2 | `apps/api/src/clients/pro-clients.service.ts` |")
c94 = lignes_commencant_par(cad, "4. **L'audit « création et modification de fiche »**")
ctl("2.f", "✓" if (len(c55) == 1 and len(c94) == 1) else "✗", "cadrage § 5.5 (ligne « 2 » : pro-clients.service.ts) et § 9 (point 4)",
    f"§ 5.5 : {len(c55)} ligne (attendu 1), dit « c'est du code du rang 41, déjà livré — à ratifier comme périmètre » : {bool(c55) and 'déjà livré' in c55[0]} ; § 9 : {len(c94)} ligne (attendu 1), dit « hors de L36-3 » pour l'annuaire : {bool(c94) and 'L36-5' in c94[0]}")
d354 = cont0
s248 = lignes_commencant_par(d354, "- **S-248** — **Le défaut croisé")
ok248 = len(s248) == 1 and "RAPPORTÉ, pas corrigé" in s248[0]
ctl("2.g", "✓" if ok248 else "✗", "S-248 « rapporté, pas corrigé »", f"{len(s248)} ligne S-248 (attendu 1), « MESURÉ et RAPPORTÉ, pas corrigé » dans le texte : {ok248} (la consigne cite en minuscules : même sens)")
# ⚠ PORTÉE (défaut de la première passe, `confronter-sortie-passe-1.txt`) : la première version cherchait les lignes « - **S-2nn** — » dans TOUT le fichier et attrapait aussi S-230 à S-238 (D353) — 22
# numéros au lieu de 13. Confronté à la source avant d'être cru (D275) : le § 5 de D354 porte bien treize décisions. La recherche est bornée au § 5 de D354 (de son titre au « ### 6. » suivant).
deb5 = cont0.index("### 5. Décisions prises par la session seule — **S-239 à S-251")
fin5 = cont0.index("### 6.", deb5)
bloc5 = cont0[deb5:fin5]
s_nums = sorted({int(m) for m in re.findall(r"^- \*\*S-(\d+)\*\* —", bloc5, re.M)})
ctl("2.h", "✓" if (s_nums == list(range(239, 252))) else "✗", "S-239 à S-251 (les décisions de D354)",
    f"§ 5 de D354 : {len(bloc5.split(chr(10)))} lignes parcourues ; lignes « - **S-nnn** — » : {len(s_nums)} numéros distincts, de {min(s_nums) if s_nums else '—'} à {max(s_nums) if s_nums else '—'} (attendu 13 : 239 à 251, consécutifs)")
bk = a(BACK)
ent = [l for l in bk.split("\n") if l.startswith("- [ ] **[API][IDENTITÉ][À ORDONNER PAR KO]**") and "UNE CONNEXION DONT LE MOT DE PASSE A ÉTÉ VÉRIFIÉ AVANT UNE RÉINITIALISATION" in l]
ctl("2.i", "✓" if len(ent) == 1 else "✗", "l'entrée [API][IDENTITÉ] du backlog (le défaut croisé de D354)", f"{len(bk.split(chr(10)))} lignes du backlog parcourues ; entrée trouvée {len(ent)} fois (attendu 1)")
dire()

# ── 3. LE DÉFAUT CROISÉ (R-1) ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
dire("3. LE DÉFAUT CROISÉ (R-1)")
piece = a("docs/preuves/D354/mesures/course-connexion-reinitialisation.int-spec.ts")
mesure = a("docs/preuves/D354/mesures/mesure-course.txt")
ok_p = "openSession après la réinitialisation → ok=" in piece and "sessions vivantes après =" in piece and "ok=true ; sessions vivantes après = 1" in mesure
ctl("3.a", "✓" if ok_p else "✗", "la pièce de D354 et sa sortie : « openSession après la réinitialisation → ok=true ; sessions vivantes après = 1 »",
    f"pièce : {len(piece.split(chr(10)))} lignes ; sortie : {len(mesure.split(chr(10)))} lignes ; la ligne de sortie porte « ok=true ; sessions vivantes après = 1 » : {'ok=true ; sessions vivantes après = 1' in mesure}")
store = a(STORE)
i0 = store.index("async openSession(")
i1 = store.index("// ⛔ LE GARDE (MP-13", i0)
corps_open = store[i0:i1]
i2 = store.index("async changePassword(")
i3 = store.index("// Les membres RECONNUS", i2)
corps_chg = store[i2:i3]
ok_cas = ("password_hash" not in corps_open) and ("password_hash = ${input.expectedPasswordHash}" in corps_chg)
ctl("3.b", "✓" if ok_cas else "✗", "le CAS d'`openSession` ne conditionne PAS le hachage ; celui de `changePassword` si",
    f"corps d'`openSession` : {len(corps_open.split(chr(10)))} lignes, occurrences de `password_hash` : {corps_open.count('password_hash')} (attendu 0) ; corps de `changePassword` : {len(corps_chg.split(chr(10)))} lignes, `password_hash = ${{input.expectedPasswordHash}}` : {corps_chg.count('password_hash = ${input.expectedPasswordHash}')} (attendu 1)")
types = a(STORE_T)
j0 = types.index("export interface OpenSessionInput")
j1 = types.index("export type OpenSessionResult", j0)
j2 = types.index("export interface ChangePasswordInput")
j3 = types.index("export type ChangePasswordResult", j2)
ctl("3.c", "✓" if ("PasswordHash" not in types[j0:j1] and "expectedPasswordHash" in types[j2:j3]) else "✗", "`OpenSessionInput` ne porte aucun hachage ; `ChangePasswordInput` porte `expectedPasswordHash`",
    f"OpenSessionInput : {types[j0:j1].count(chr(10))} lignes, « PasswordHash » : {types[j0:j1].count('PasswordHash')} (attendu 0) ; ChangePasswordInput : « expectedPasswordHash » : {types[j2:j3].count('expectedPasswordHash')} (attendu 1)")
mg = a(MIGR)
colonne = re.search(r'"password_changed_at"\s+timestamptz\(6\)\s+NOT NULL', mg) is not None
ctl("3.d", "≈" if colonne else "✗", "`password_changed_at` existe — le « par exemple » de la consigne",
    f"colonne `password_changed_at timestamptz(6) NOT NULL` dans la migration de la tranche : {colonne} ({len(mg.split(chr(10)))} lignes parcourues). TENSION écrite : la colonne a la résolution de la MICROSECONDE et un `Date` de Node celle de la milliseconde — comparer l'égalité d'un `Date` lu à une colonne relue perdrait les microsecondes ; le hachage lu par la réservation (`reservePasswordAttempt` le rend déjà) est exact. La consigne dit « par exemple » : le choix est libre, il s'écrit en décision.")
pos_m = corps_open.index("UPDATE pro_staff_members")
pos_d = corps_open.index("pro_staff_devices")
pos_s = corps_open.index("INSERT INTO pro_staff_sessions")
ctl("3.e", "✓" if pos_m < pos_d < pos_s else "✗", "l'ordre des verrous (S-101) dans `openSession` : membre (L2) < appareil (L3) < session (L4)",
    f"positions dans le corps de la méthode : `UPDATE pro_staff_members` {pos_m} < `pro_staff_devices` {pos_d} < `INSERT INTO pro_staff_sessions` {pos_s} : {pos_m < pos_d < pos_s}")
ctl("3.f", "≈" if "AND status = 'ACTIVE'" in corps_open else "✗", "« connexion ‖ désactivation » : le CAS d'`openSession` porte DÉJÀ `status = 'ACTIVE'`",
    f"occurrences de `status = 'ACTIVE'` dans le corps d'`openSession` : {corps_open.count(chr(39) + 'ACTIVE' + chr(39))} (attendu ≥ 1). ÉCRIT : la propriété que la consigne veut « mesurée aussi » TIENT peut-être déjà — ce qui manque est sa mesure SOUS COURSE ; ce n'est pas un défaut à corriger mais une garde à poser et à neutraliser.")
svc = a(SERVICE)
r3 = "R-3 (D341)" in svc
r3t = [l for l in cont0.split("\n") if l.startswith("- R-3. S-103 est REFUSÉE.")]
ctl("3.g", "≈" if (r3 and len(r3t) == 1) else "✗", "« le même coût qu'un mauvais mot de passe (R-3 de D341 : aucune fuite d'état) »",
    f"le service cite « R-3 (D341) » : {r3} ; le texte de R-3 (D341) trouvé {len(r3t)} fois : il dit « Pendant la pause de 15 minutes, la réponse est la même que pour un mauvais mot de passe ou un compte inconnu, au même coût (argon2 factice, D5) » — il porte sur la PAUSE (S-103 refusée), pas sur l'ouverture. TENSION écrite : la consigne l'applique par ANALOGIE (même famille : aucun refus ne dit pourquoi) ; le code l'invoque déjà pour ses trois autres refus. Le « coût » est UN `argon2` : le refus d'ouverture en a déjà payé un (la vérification du vrai hachage).")
rl = a(ROWLOCK)
lock = re.search(r"type LockableTable = ([^;]+);", rl)
ctl("3.h", "≈" if (lock and "pro_staff_members" not in lock.group(1)) else "✗", "patron S-243 : l'entrelacement forcé par un verrou de ligne tenu hors du service",
    f"`row-lock.ts` : {len(rl.split(chr(10)))} lignes ; `type LockableTable = {lock.group(1) if lock else '—'}` — `pro_staff_members` n'y est PAS : l'aide doit être étendue d'une valeur d'union pour tenir le verrou du MEMBRE (fichier de code de test, déclaré dans la table d'ouverture).")
dire()

# ── 4. LE JOURNAL DES FICHES (R-2) ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
dire("4. LE JOURNAL DES FICHES (R-2)")
fichiers = [f for f in liste("apps/api/src") if f.endswith(".ts") and not f.endswith(".spec.ts") and "/generated/" not in f]
motifs = [r"INSERT\s+INTO\s+pro_client_records", r"UPDATE\s+pro_client_records", r"DELETE\s+FROM\s+pro_client_records", r"proClientRecord\.(?:create|createMany|update|updateMany|upsert|delete|deleteMany)\b"]
sites: dict[str, int] = {}
for f in fichiers:
    t = a(f)
    n = sum(len(re.findall(m, t, re.I)) for m in motifs)
    if n:
        sites[f] = n
total = sum(sites.values())
ctl("4.a", "✓" if (total == 4 and len(sites) == 2) else "≈", "les écritures de la table des fiches : QUATRE sites, DEUX fichiers",
    f"{len(fichiers)} fichiers .ts (hors specs et code généré) parcourus, 4 motifs d'écriture cherchés ; sites trouvés : {total} dans {len(sites)} fichier(s) : " + "; ".join(f"{f.split('/')[-1]}={n}" for f, n in sorted(sites.items())) + " (attendu : pro-client-store.prisma.ts=3, quote-store.prisma.ts=1)")
qs = a(QUOTES_SVC)
qst = a(QUOTE_STORE)
k0 = qst.index("async completerNomDuClient(")
ecrit_hors_k5 = sum(len(re.findall(m, qst[:k0], re.I)) for m in motifs)
ecrit_svc = sum(len(re.findall(m, qs, re.I)) for m in motifs)
c0 = qs.index("async convert(")
c1 = qs.index("async cancel(", c0)
ctl("4.b", "≈" if (ecrit_hors_k5 == 0 and ecrit_svc == 0) else "✗", "la conversion d'un devis N'écrit AUCUNE fiche (la consigne la nomme parmi les chemins)",
    f"quotes.service.ts : {len(qs.split(chr(10)))} lignes, écritures de fiche : {ecrit_svc} (attendu 0) ; `convert` : {len(qs[c0:c1].split(chr(10)))} lignes, elle écrit une réservation (`convertirEnDemande`) et recopie le contact de son CORPS ; quote-store.prisma.ts avant `completerNomDuClient` : {ecrit_hors_k5} écriture de fiche (attendu 0). IMPRÉCISION de la consigne, écrite : la conversion n'a donc PAS de ligne de journal de fiche à porter, et R-4 (« la conversion n'est touchée que pour sa ligne de journal ») ne s'applique pas — elle n'est PAS touchée.")
ctrls = [f for f in liste("apps/api/src") if f.endswith(".controller.ts")]
walk = [f for f in ctrls if re.search(r'@(?:Post|Patch|Put|Get|Delete)\(\s*"[^"]*(?:walk|sur-place)', a(f), re.I)]
ctl("4.c", "≈" if not walk else "✗", "le parcours sur place n'écrit aucune fiche côté serveur : il n'existe que par K-1 à K-5",
    f"{len(ctrls)} contrôleurs parcourus, route dont le chemin contient « walk » ou « sur-place » : {len(walk)} (attendu 0) ; `WALK_IN` n'est que la valeur de `source` d'une réservation (`convert`). La consigne le nomme parmi les chemins : ce n'est pas un chemin d'écriture de fiche DISTINCT.")
sch = a(SCHEMA)
am = re.search(r'actorMemberId\s+String\?\s+@map\("actor_member_id"\)', sch) is not None
dec = a("apps/api/src/staff/staff-decorators.ts")
ctl("4.d", "✓" if (am and "export const CurrentStaff" in dec) else "✗", "`audit_logs.actor_member_id` existe ; le contexte du membre est lisible par un contrôleur",
    f"colonne `actorMemberId String? @map(\"actor_member_id\")` dans le modèle AuditLog : {am} ; `export const CurrentStaff` dans staff-decorators.ts : {'export const CurrentStaff' in dec}")
fs = a(FICHE_STORE)
m0 = fs.index("async creerSiAbsente(")
m1 = fs.index("// ⛔ MD-7", m0)
corps_k2 = fs[m0:m1]
ctl("4.e", "≈" if "$transaction" not in corps_k2 else "✓", "K-2 (`creerSiAbsente`) n'est PAS dans une transaction aujourd'hui — « dans la MÊME transaction que l'écriture » l'exige",
    f"corps de `creerSiAbsente` : {len(corps_k2.split(chr(10)))} lignes ; `$transaction` : {corps_k2.count('$transaction')} (attendu 0 aujourd'hui) ; `$queryRaw` : {corps_k2.count('$queryRaw')}. ÉCRIT : envelopper l'INSERT dans une transaction est un changement du CHEMIN d'écriture que la consigne exige (R-2), pas un changement de comportement ; il s'écrit en décision et se mesure (dix créations simultanées : une fiche, une ligne).")
aa = a(ADMAUDIT)
fa = "async function forceAuditFailure(" in aa
fc = re.search(r"async function forceCommitFailure\(table: ([^)]+)\)", aa)
ctl("4.f", "≈" if (fa and fc and "pro_client_records" not in fc.group(1)) else "✗", "le patron de D349 (échec forcé) : un déclencheur d'insertion, puis un déclencheur DIFFÉRÉ",
    f"`forceAuditFailure` présent : {fa} ; `forceCommitFailure(table: {fc.group(1) if fc else '—'})` : ne connaît pas `pro_client_records` ni `quotes` — le patron se REPRODUIT dans un fichier neuf, il ne se réutilise pas tel quel ({len(aa.split(chr(10)))} lignes parcourues).")
qpromote = 'action: "quote.promote"' in qst
ctl("4.g", "≈" if qpromote else "?", "les autres lignes d'audit écrites par une route Pro ne portent pas `actorMemberId` (`quote.promote`)",
    f"`action: \"quote.promote\"` dans quote-store.prisma.ts : {qpromote} ; `actorMemberId` dans ce fichier : {qst.count('actorMemberId')} (attendu 0) — HORS de la liste de DR5 (la promotion n'y figure pas) : relevé dans la carte du journal, RAPPORTÉ au backlog, non corrigé ici.")
dire()

# ── 5. LA FORME (consigne § 3) ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
dire("5. LA FORME (consigne § 3)")
neut = liste("neutralisation")
ctl("5.a", "✓" if "neutralisation/neutralize-r57.py" not in neut else "✗", "`neutralisation/neutralize-r57.py` est libre, au motif `neutralize-<lot>.py` (D272)",
    f"{len(neut)} fichiers de `neutralisation/` parcourus ; `neutralize-r57.py` présent : {'neutralisation/neutralize-r57.py' in neut} (attendu False) ; le dernier harnais de rang : {sorted(f for f in neut if re.search(r'neutralize-r\d+\.py$', f))[-1]}")
touchees = "neutralisation/lancer-touchees.py" in neut
masquer = "neutralisation/masquer-jetons.py" in neut
p_t = a("docs/preuves/D354/neutralisation/lancer-touchees.py") != ""
p_m = a("docs/preuves/D354/neutralisation/masquer-jetons.py") != ""
ctl("5.b", "≈" if (not touchees and not masquer and p_t and p_m) else "?", "« lancer-touchees.py » et « masquer-jetons.py » : des PIÈCES versées, pas des fichiers de `neutralisation/`",
    f"dans `neutralisation/` : lancer-touchees.py {touchees}, masquer-jetons.py {masquer} (attendu False, False) ; pièces versées de D354 : lancer-touchees.py {p_t}, masquer-jetons.py {p_m} (attendu True, True). Nom court de la consigne = les copies de D354.")
r15 = [l for l in cont0.split("\n") if "R-15" in l and "D343" in l]
ctl("5.c", "✓" if r15 else "✗", "R-15 de D343 : deux passes e2e vertes de suite", f"{len(r15)} ligne(s) du fichier de continuité citent « R-15 » et « D343 » (attendu ≥ 1)")
outils = {"neutralisation/audit-secrets.py": "neutralisation/audit-secrets.py" in neut, "docs/preuves/D299/outils/alertes-nouvelles.py": a("docs/preuves/D299/outils/alertes-nouvelles.py") != "", "docs/preuves/D354/controle-fin-de-lot.py": a("docs/preuves/D354/controle-fin-de-lot.py") != ""}
ctl("5.d", "✓" if all(outils.values()) else "✗", "les instruments de l'audit de secrets (D298, D299) et du contrôle de fin de lot (D288, D328)", " ; ".join(f"{k} : {v}" for k, v in outils.items()))
reg = a("docs/preuves/D354/regle-portes.md")
apres = "**Après les portes, jamais en parallèle d'une porte**" in reg
ctl("5.e", "≈" if apres else "?", "campagnes « AVANT les six portes ou après elles, mais sur le MÊME arbre, dit » (consigne § 3) contre la règle de D354 (« après les portes »)",
    f"la règle de D354 (regle-portes.md § 4.1) dit « Après les portes, jamais en parallèle d'une porte » : {apres} ; la consigne du rang 57 LÈVE cette contrainte d'ordre (S-251 de D354 l'avait relevée comme écart) à condition que l'arbre soit le MÊME — la règle des portes de D355 le reprend telle que la consigne l'écrit.")
dire()

# ── 6. LA FIN (consigne § 4) ET LES NUMÉROS ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
dire("6. LA FIN (consigne § 4) ET LES NUMÉROS")
forme = "RANG 45 : EN ATTENTE DE CADRAGE DU RELECTEUR" in aplati(cont0)
ctl("6.a", "✓" if forme else "✗", "la forme « EN ATTENTE DE CADRAGE DU RELECTEUR » existe (D340) : elle servira pour le rang 58", f"« RANG 45 : EN ATTENTE DE CADRAGE DU RELECTEUR » dans le texte aplati de {CONT} : {forme}")
textes = {f: aplati(a(f)) for f in (CONT, BACK, AGENTS, CLAUDE)}
d355 = {f: len(re.findall(r"D355(?!\d)", t)) for f, t in textes.items()}
s252 = {f: len(re.findall(r"\bS-252(?!\d)", t)) for f, t in textes.items()}
reg_nums = [int(n) for n in re.findall(r"^\| D(\d+) \|", cont0, re.M)]
ctl("6.b", "✓" if (sum(d355.values()) == 0 and sum(s252.values()) == 0 and max(reg_nums) == 354) else "✗", "D355 et S-252 sont libres ; le registre s'arrête à D354",
    f"{len(reg_nums)} lignes `| Dnnn |` du registre parcourues, dernier = D{max(reg_nums)} (attendu 354) ; « D355 » dans les quatre fichiers : {list(d355.values())} (attendu 0,0,0,0) ; « S-252 » : {list(s252.values())} (attendu 0,0,0,0) ; {sum(len(t) for t in textes.values())} caractères aplatis examinés")
dire()

# ── BILAN ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
compte = {v: VERDICTS.count(v) for v in ("✓", "≈", "✗", "?")}
dire(f"BILAN : {len(VERDICTS)} contrôles — ✓ {compte['✓']} · ≈ {compte['≈']} · ✗ {compte['✗']} · ? {compte['?']} (calibrés sur 3 sortes de contrôle à deux bras, 0 manqué)")
if SORTIE:
    open(SORTIE, "w", encoding="utf-8", newline="\n").write("\n".join(LIGNES) + "\n")
    print(f"(sortie écrite : {SORTIE})")
sys.exit(1 if compte["✗"] else 0)
