#!/usr/bin/env python3
"""Lecture adverse de la consigne du rang 58 ET du cadrage de D340 CONTRE LE DÉPÔT (D356) — contre les objets git du SHA de départ.

MODE D'EMPLOI : depuis la RACINE du dépôt, `python3 -I -X utf8 docs/preuves/D356/lecture-adverse/confronter-consigne.py`. Lecture seule : aucun fichier n'est écrit, aucun `.env` n'est lu.
POURQUOI : la consigne et le cadrage AFFIRMENT des faits sur le dépôt (« les colonnes existent », « le CAS conditionne le hachage », « K-23 n'existe pas ») et se contredisent peut-être entre eux (le verrou
`pin_locked_at` posé par la 3ᵉ RÉSERVATION contre « `pin_locked_at` nul à l'ouverture »). Chaque affirmation est confrontée à la SOURCE, jamais à un résumé (D275). Les fichiers d'autorité sont enveloppés à ~95
colonnes : toute expression de plus de quelques mots y est coupée — les recherches se font sur le texte APLATI (blancs comprimés), jamais sur les lignes (AGENTS.md, D294).
CE QUE L'INSTRUMENT RENDRE : un verdict par contrôle — ✓ (l'affirmation tient), ≈ (elle tient mais NE DIT PAS tout : une décision à prendre ou une imprécision), ✗ (elle est fausse contre le dépôt),
? (non mesurable ici) — et, à côté de chaque verdict, ce qu'il a EXAMINÉ (D290). Il ne corrige rien, ne conclut rien : le tri des ≈ et des ✗ s'écrit à la main dans lecture-adverse.md.
CALIBRATION (D286) : trois cas à DEUX bras (un cas dont la réponse est connue, dans les deux sens), jouée AVANT tout contrôle ; l'instrument ABANDONNE (code 2) si un seul bras manque son verdict.
PIÈCE, jamais promue en instrument.
"""
import re
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

SHA = "b54e383d31e763adbdbb4bf46fff4250c992af65"  # SHA de départ (clôture de D355)
CONT = "ZWADJ_CONTINUITE.md"
CADRAGE = "docs/preuves/D340/cadrage.md"
CONSIGNE = "docs/preuves/D356/consigne.md"  # versée dans le commit de cette lecture (le seul fichier lu hors du SHA de départ)

_cache = {}


def git(*args):
    r = subprocess.run(["git", *args], capture_output=True)
    if r.returncode != 0:
        raise RuntimeError(f"git {' '.join(args)} : code {r.returncode} : {r.stderr.decode('utf-8', 'replace')[:200]}")
    return r.stdout.decode("utf-8")


def source(chemin):
    """Le fichier TEL QU'IL ÉTAIT au SHA de départ (git show), fins de ligne ramenées en LF. La consigne, elle, vit dans l'arbre de travail."""
    if chemin not in _cache:
        if chemin == CONSIGNE:
            t = open(chemin, encoding="utf-8", newline="").read()
        else:
            t = git("show", f"{SHA}:{chemin}")
        _cache[chemin] = t.replace("\r\n", "\n")
    return _cache[chemin]


def aplati(t):
    return re.sub(r"\s+", " ", t)


def compter(chemin, motif, brut=False):
    """Nombre d'occurrences de `motif` (sous-chaîne littérale) dans le fichier APLATI (ou brut), ET ce qui a été examiné (caractères)."""
    t = source(chemin) if brut else aplati(source(chemin))
    return t.count(motif), len(t)


def lignes_commencant_par(chemin, debut):
    ls = source(chemin).split("\n")
    return [l for l in ls if l.startswith(debut)], len(ls)


# ───────────────────────────── CALIBRATION : trois cas, deux bras chacun ─────────────────────────────
def calibrer():
    echecs = []
    # cas 1 — un jeton présent / un jeton impossible, dans le texte APLATI d'un fichier source
    pos, _ = compter("apps/api/src/config/env.ts", "JWT_ACCESS_SECRET")
    neg, _ = compter("apps/api/src/config/env.ts", "ZZ_JETON_IMPOSSIBLE_ZZ")
    if not (pos >= 1 and neg == 0):
        echecs.append(f"cas 1 (jeton présent/absent) : positif {pos} (attendu ≥ 1), négatif {neg} (attendu 0)")
    # cas 2 — une expression qui ENJAMBE un retour à la ligne : trouvée dans le texte aplati, introuvable ligne à ligne (la leçon d'AGENTS.md, D294)
    ls = source("CLAUDE.md").split("\n")
    jonction = None
    for i in range(len(ls) - 1):
        a, b = ls[i].split(), ls[i + 1].split()
        if len(a) >= 2 and len(b) >= 2 and len(ls[i]) > 60:
            jonction = " ".join(a[-2:] + b[:2])
            break
    if jonction is None:
        echecs.append("cas 2 : aucune jonction de lignes trouvée dans CLAUDE.md pour calibrer")
    else:
        dans_aplati, _ = compter("CLAUDE.md", jonction)
        dans_brut, _ = compter("CLAUDE.md", jonction, brut=True)
        if not (dans_aplati >= 1 and dans_brut == 0):
            echecs.append(f"cas 2 (jonction {jonction!r}) : aplati {dans_aplati} (attendu ≥ 1), brut {dans_brut} (attendu 0)")
    # cas 3 — la recherche d'une ligne par son DÉBUT : `| MP-1 |` n'est PAS `| MP-10 |` ; `| MP-99 |` n'existe pas
    un, _ = lignes_commencant_par(CADRAGE, "| MP-1 |")
    dix, _ = lignes_commencant_par(CADRAGE, "| MP-10 |")
    nul, _ = lignes_commencant_par(CADRAGE, "| MP-99 |")
    if not (len(un) == 1 and len(dix) == 1 and un[0] != dix[0] and len(nul) == 0):
        echecs.append(f"cas 3 (début de ligne) : MP-1 {len(un)}, MP-10 {len(dix)}, MP-99 {len(nul)} (attendu 1, 1, 0)")
    if echecs:
        print("✗ CALIBRATION MANQUÉE — l'instrument ABANDONNE :")
        for e in echecs:
            print("   ", e)
        sys.exit(2)
    print("calibration : 3 cas, 6 bras, 0 manqué (jeton présent/absent · expression enjambant une ligne · début de ligne MP-1 ≠ MP-10 ≠ MP-99)")


# ───────────────────────────── LES CONTRÔLES ─────────────────────────────
resultats = []


def controle(ident, affirmation, verdict, examine, note):
    resultats.append((ident, affirmation, verdict, examine, note))


def jouer():
    # ── § 0 de la consigne : la reprise ──
    head = git("rev-parse", "HEAD").strip()
    parent = git("rev-parse", "HEAD~1").strip() if head != SHA else SHA
    origin = git("rev-parse", "origin/main").strip()
    controle("0.1", "origin/main = b54e383", "✓" if origin == SHA else "✗", "1 SHA", f"origin/main = {origin[:7]} ; HEAD = {head[:7]} ; parent de HEAD = {parent[:7]} (le commit de la table d'ouverture)")
    branche = git("branch", "--show-current").strip()
    stash = len([l for l in git("stash", "list").split("\n") if l.strip()])
    controle("0.2", "sur `main`, sans stash", "✓" if (branche == "main" and stash == 0) else "✗", "1 branche, 1 liste", f"branche {branche}, {stash} stash")
    n58, c = compter(CONT, "RANG 58 : EN ATTENTE DE CADRAGE DU RELECTEUR")
    controle("0.3", "« RANG 58 : EN ATTENTE DE CADRAGE DU RELECTEUR » (candidat L36-3b)", "✓" if n58 >= 1 else "✗", f"{c} caractères aplatis", f"{n58} occurrence(s)")
    n37, c = compter(CONT, "POUR MÉMOIRE **TRENTE-SEPT**")
    controle("0.4", "compteur POUR MÉMOIRE TRENTE-SEPT", "✓" if n37 >= 1 else "✗", f"{c} caractères aplatis", f"{n37} occurrence(s) de « POUR MÉMOIRE **TRENTE-SEPT** »")
    registre = [int(m.group(1)) for l in source(CONT).split("\n") for m in [re.match(r"^\| D(\d+) \|", l)] if m]
    controle("0.5", "dernier numéro du registre = D355 ; D356 libre", "✓" if (max(registre) == 355) else "✗", f"{len(registre)} lignes de registre", f"plus grand = D{max(registre)}")

    # ── § 2 : « constats du relecteur au dépôt » ──
    mig = "apps/api/prisma/migrations/20261104170000_staff_layer/migration.sql"
    colonnes = ["pin_hash", "pin_generated_at", "pin_expires_at", "pin_failed_count", "pin_locked_at"]
    manquantes = [k for k in colonnes if compter(mig, f'"{k}"')[0] < 1]
    controle("2.1", "les colonnes pin_hash, pin_generated_at, pin_expires_at, pin_failed_count, pin_locked_at existent (migration de D341)", "✓" if not manquantes else "✗", f"{len(colonnes)} colonnes", f"manquantes : {manquantes or 'aucune'}")
    chk1, _ = compter(mig, 'CHECK ("pin_failed_count" BETWEEN 0 AND 3)')
    chk2, _ = compter(mig, 'CHECK (("pin_hash" IS NULL) = ("pin_generated_at" IS NULL) AND ("pin_hash" IS NULL) = ("pin_expires_at" IS NULL))')
    controle("2.2", "CHECK pin_failed_count BETWEEN 0 AND 3 ; CHECK des trois colonnes du PIN nulles ou non nulles ensemble", "✓" if (chk1 == 1 and chk2 == 1) else "✗", "1 migration", f"compte 0..3 : {chk1} ; triple cohérent : {chk2}")
    prisma = "apps/api/prisma/schema.prisma"
    champs = ["pinHash", "pinGeneratedAt", "pinExpiresAt", "pinFailedCount", "pinLockedAt"]
    absents = [k for k in champs if compter(prisma, k)[0] < 1]
    controle("2.3", "schema.prisma déclare les cinq champs du PIN (donc aucun `prisma generate` à refaire pour de nouvelles colonnes)", "✓" if not absents else "✗", f"{len(champs)} champs", f"absents : {absents or 'aucun'}")
    env = "apps/api/src/config/env.ts"
    jwt, _ = compter(env, 'JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET doit faire au moins 32 caractères")')
    pre, _ = compter(env, "PROD_REQUIRED_EXPLICIT")
    pin_env = compter(env, "STAFF_PIN")[0]
    controle("2.4", "env.ts : le secret JWT est `z.string().min(32)` sans défaut ; `PROD_REQUIRED_EXPLICIT` existe ; aucune variable du secret du PIN n'existe", "✓" if (jwt == 1 and pre >= 1 and pin_env == 0) else "✗", "1 fichier", f"JWT min(32) sans défaut : {jwt} ; PROD_REQUIRED_EXPLICIT : {pre} occurrence(s) ; « STAFF_PIN » : {pin_env}")
    jwt_dans_liste = compter(env, '"CLIENT_URL", "PRO_URL", "AUTH_COOKIE_SECURE", "GOOGLE_CLIENT_ID",')[0]
    controle("2.5", "« le secret JWT comme précédent » : il est dans `PROD_REQUIRED_EXPLICIT`", "≈", "1 liste", f"NON : `JWT_ACCESS_SECRET` n'est PAS dans la liste (son commentaire dit « n'a jamais eu de défaut, le schéma l'exige déjà partout ») ; la liste porte CLIENT_URL, PRO_URL, AUTH_COOKIE_SECURE, GOOGLE_CLIENT_ID, PAYMENTS_ENABLED (liste lue : {jwt_dans_liste}). R-2 demande les DEUX (schéma `min(32)` sans défaut ET liste) : plus strict que le précédent, sans contradiction.")
    store = "apps/api/src/staff/staff-store.prisma.ts"
    cas, _ = compter(store, "AND password_hash = ${input.expectedPasswordHash}")
    controle("2.6", "l'ouverture de session est conditionnée au hachage lu à la réservation (D355)", "✓" if cas >= 1 else "✗", "1 fichier", f"{cas} occurrence(s) de « AND password_hash = ${{input.expectedPasswordHash}} »")

    # ── 1 b : les contrats ──
    k23 = sum(compter(p, "pin-login")[0] for p in ["apps/api/src/staff/staff-session.controller.ts", "packages/api-client/src/staff-client.ts", "packages/types/src/staff.ts"])
    controle("1b.1", "K-23 (`POST /pro/staff/pin-login`) n'existe pas encore", "✓" if k23 == 0 else "✗", "3 fichiers", f"« pin-login » : {k23} occurrence(s) dans le contrôleur, le client d'API et les types")
    ligne15 = lignes_commencant_par(CADRAGE, "| **K-15** |")[0][0]
    ligne14 = lignes_commencant_par(CADRAGE, "| **K-14** |")[0][0]
    ligne18 = lignes_commencant_par(CADRAGE, "| **K-18** |")[0][0]
    ligne63 = lignes_commencant_par(CADRAGE, "| **L36-3b · « le PIN »**")[0][0]
    pin14, pin15, pin18, pin63 = ("PIN" in ligne14), ("PIN" in ligne15), ("PIN" in ligne18), ("K-18" in ligne63)
    controle("1b.2", "K-18 « si le cadrage le dit » : le cadrage amende-t-il K-18 ?", "≈" if (pin63 and not pin18) else ("✓" if pin18 else "✗"), "3 lignes du § 5.1, 1 ligne du § 6.3",
             f"§ 5.1 K-14 cite le PIN : {pin14} ; K-15 : {pin15} ; K-18 : {pin18} ; § 6.3 nomme K-18 dans « amendement des réponses de K-14, K-15, K-18 » : {pin63}. Le cadrage le dit en UN endroit (§ 6.3), sans dire QUAND K-18 rend un PIN : à décider (une règle, la même que K-15).")
    # 1 b : K-21 et K-22 effacent le PIN
    reset = compter("apps/api/src/staff/staff-store.prisma.ts", "Aucune colonne de PIN n'est touchée")[0]
    controle("1b.3", "K-21 n'efface aucun PIN aujourd'hui (« il n'existe pas encore »), K-22 non plus", "✓" if reset >= 1 else "?", "1 fichier", f"{reset} commentaire(s) « Aucune colonne de PIN n'est touchée » dans `resetMemberPassword` ; `disableMember` : aucune colonne `pin_` écrite (lue : {compter(store, 'SET status = ' + chr(39) + 'DISABLED' + chr(39))[0]} UPDATE de statut, sans `pin_`)")

    # ── 1 d : quote.promote ──
    qs = "apps/api/src/venues/quote-store.prisma.ts"
    brut = source(qs)
    sites = [m.start() for m in re.finditer(r"auditLog\.create", brut)]
    detail = []
    for s in sites:
        bloc = brut[s : s + 700]
        if "ficheAuditEntry(" in bloc.split("})")[0]:
            detail.append("ligne de fiche (bâtie par `ficheAuditEntry`, module pur qui porte `actorMemberId`)")
            continue
        action = re.search(r'action:\s*([^,\n]+)', bloc)
        detail.append(f"{(action.group(1).strip() if action else '?')[:46]} → actorMemberId : {'actorMemberId' in bloc.split('})')[0]}")
    controle("1d.1", "`quote.promote` n'écrit pas `actor_member_id` ; c'est la seule ligne EXISTANTE qu'une action de personnel écrive sans lui", "✓" if any("quote.promote" in d and d.endswith("False") for d in detail) else "✗", f"{len(sites)} site(s) `auditLog.create` dans quote-store.prisma.ts", " | ".join(detail))
    autres = []
    for p in ["apps/api/src/venues/venues-admin.service.ts", "apps/api/src/account/account-deletion.service.ts", "apps/api/src/admin/first-admin.ts", "apps/api/src/clients/pro-client-store.prisma.ts", "apps/api/src/staff/staff-store.prisma.ts"]:
        try:
            t = source(p)
            autres.append(f"{p.split('/')[-1]}: {len(re.findall(r'auditLog\.create', t))} site(s), actorMemberId {len(re.findall('actorMemberId', t))} fois, ficheAuditEntry( {t.count('ficheAuditEntry(')} fois")
        except RuntimeError:
            autres.append(f"{p.split('/')[-1]}: introuvable au SHA")
    controle("1d.2", "les autres écrivains de `audit_logs` : ADMIN (hors couche), fiches (D355, `actorMemberId` porté), personnel (porté)", "≈", "5 fichiers", "; ".join(autres) + f" ; `client-record-audit.ts` porte `actorMemberId` {source('apps/api/src/clients/client-record-audit.ts').count('actorMemberId')} fois — la liste complète des sites est relevée par la carte du journal (R-5).")

    # ── R-3 et le cadrage : le verrou ──
    mp1 = lignes_commencant_par(CADRAGE, "| MP-1 |")[0][0]
    mp15 = lignes_commencant_par(CADRAGE, "| MP-15 |")[0][0]
    cons = aplati(source(CONSIGNE))
    r3 = "`pin_locked_at` nul" in cons
    pose = "posé par la réservation n° 3" in mp15  # MP-1 ne dit pas qui pose le verrou : il pose la CONDITION de la réservation (confronté à la source brute, passe 1)
    condition_mp1 = "pin_locked_at IS NULL AND pin_failed_count < 3" in mp1
    controle("R3.1", "MP-15 (le verrou `pin_locked_at` est posé par la RÉSERVATION n° 3) et R-3 (l'ouverture exige `pin_locked_at` nul) tiennent ENSEMBLE", "≈" if (pose and r3) else "?", "2 lignes du cadrage, 1 consigne",
             f"MP-15 pose le verrou à la réservation n° 3 : {pose} (MP-1 ne dit que la CONDITION de la réservation, `pin_locked_at IS NULL AND pin_failed_count < 3` : {condition_mp1}) ; R-3 exige `pin_locked_at` nul à l'ouverture : {r3}. Pris à la lettre ensemble, le TROISIÈME essai, même JUSTE, trouverait le verrou posé par sa propre réservation et serait refusé : « trois essais » deviendrait deux. DÉCISION À PRENDRE (S-269).")
    mdp = "password_locked_until = NULL"
    analog, _ = compter(store, mdp)
    controle("R3.2", "l'analogue D341 (mot de passe) : la pause est posée par la 5ᵉ réservation ET une 5ᵉ tentative juste ouvre la session", "✓" if analog >= 2 else "?", "1 fichier", f"« {mdp} » : {analog} occurrence(s) — l'ouverture REMET le verrou à NULL au lieu de l'exiger nul : le précédent ne refuse pas la dernière tentative juste.")
    controle("R3.3", "MP-2 : « PIN correct sans cookie → refus, compteur INCHANGÉ »", "≈", "1 ligne du cadrage", "oblige à vérifier l'appareil AVANT de réserver (un PIN sans appareil ne consomme aucun essai : sinon un porteur du seul Bearer verrouillerait un membre). Précisé en design, pas contredit.")
    # ── R-6 de D341 et le cadrage MP-27 : l'échéance de l'appareil ──
    dev, _ = compter(store, "now() + make_interval(days => ${STAFF_LIMITS.PIN_VALIDITY_DAYS}::int)")
    controle("R6.1", "R-6 (D341) : l'échéance d'un appareil est la durée du PIN ; L36-3b la ramène sous `pin_expires_at`", "≈" if dev >= 2 else "?", "1 fichier", f"{dev} insertion(s) d'appareil à `now() + PIN_VALIDITY_DAYS` (activation, connexion). Un appareil créé APRÈS un PIN existant dépasserait `pin_expires_at` : à ramener par `LEAST(…, pin_expires_at)` dans l'ouverture (MP-27 : inexprimable en SQL entre deux tables, donc applicatif).")

    # ── R-4 : « lue par le garde » ──
    garde = source("apps/api/src/staff/staff-session.guard.ts")
    lit = "etatDuCompte" in garde
    controle("R4.1", "R-4 : l'état du compte est « lu par le garde, la connexion par mot de passe et la connexion par PIN »", "≈", "1 fichier", f"le garde lit `etatDuCompte` ({lit}) ; AUCUNE décision du garde ne dépend du PIN (le verrouillage met fin aux sessions à la base ; une session ne se refuse pas parce que le PIN a expiré). « Lue par le garde » ne se prend pas à la lettre pour l'état du PIN : à écrire en décision.")

    # ── R-5 / journal ──
    pin_audit = compter("apps/api/src/staff/staff-store.types.ts", '"staff.pin_')[0]
    controle("R5.1", "aucune ligne d'audit du PIN n'existe encore (connexion, échec, verrouillage, déblocage)", "✓" if pin_audit == 0 else "✗", "1 fichier (l'union fermée `StaffAuditEntry`)", f"« staff.pin_ » : {pin_audit} occurrence(s)")
    # ── R-7 : le message du refus ──
    import json
    fr = json.loads(source("packages/i18n/messages/fr.json"))
    mot = fr["staff"]["errors"]["invalidCredentials"]  # la clé de `staff`, pas la première « invalidCredentials » du fichier (celle de `auth` : défaut d'instrument de la passe 1)
    controle("R7.1", "R-7 : « aucun code d'erreur neuf » — le refus de K-23 est donc `STAFF_INVALID_CREDENTIALS`", "≈", "1 catalogue", f"son message FR (`staff.errors.invalidCredentials`) est « {mot} » : il parle de NOM DE COMPTE, de MOT DE PASSE et d'une pause de 15 minutes. Après un mauvais PIN l'écran devra dire autre chose (L36-4 écrit son texte) ; le code et le corps restent ceux de K-15 (aucune fuite d'état, R-3).")
    # ── les tests EXISTANTS qui comptent ce que le lot change (la leçon de S-264) ──
    comptent = {}
    for p in ["apps/api/src/staff/staff-source-guards.spec.ts", "apps/api/test/int/staff-session-guard.int-spec.ts", "apps/api/test/int/throttle.int-spec.ts", "apps/api/test/int/rbac-all-routes.int-spec.ts", "apps/api/test/int/staff-capabilities.int-spec.ts"]:
        t = source(p)
        comptent[p.split("/")[-1]] = len(re.findall(r"StaffExempt|exempt|EXEMPT", t)) + len(re.findall(r"staffLogin|staffActivate|STAFF_LOGIN|STAFF_ACTIVATE", t))
    controle("S264.1", "les tests EXISTANTS qui comptent les routes exemptées ou les clés de débit du personnel (ils changeront avec K-23)", "≈", "5 fichiers de test", "occurrences de « exempt » / clés de débit : " + ", ".join(f"{k}={v}" for k, v in comptent.items()))
    audit_count = {}
    for p in ["apps/api/test/int/staff-activation.int-spec.ts", "apps/api/test/int/staff-login.int-spec.ts", "apps/api/test/int/staff-password.int-spec.ts", "apps/api/test/int/staff-members.int-spec.ts", "apps/api/test/int/log-temporary-password.int-spec.ts"]:
        t = source(p)
        audit_count[p.split("/")[-1]] = (len(re.findall(r"audit_logs|auditLog", t)), len(re.findall(r"toEqual\(\{\s*member", t)))
    controle("S264.2", "les tests EXISTANTS qui comptent des lignes d'`audit_logs` ou comparent la FORME d'une réponse de K-14, K-15 ou K-18 (le corps gagne la clé `pin`)", "≈", "5 fichiers de test", ", ".join(f"{k}: audit={a} forme={f}" for k, (a, f) in audit_count.items()))
    # ── l'environnement des tests et de l'e2e ──
    setup = source("apps/api/test/int/setup-env.ts")
    pw = source("e2e/playwright.config.ts")
    controle("R2.1", "R-2 : « les tests posent leur propre valeur jetable » — état d'aujourd'hui", "≈", "setup-env.ts, playwright.config.ts",
             f"`setup-env.ts` lit `apps/api/.env` par `import \"dotenv/config\"` ({'dotenv/config' in setup}) et ne pose AUCUN secret ({compter('apps/api/test/int/setup-env.ts', 'JWT_ACCESS_SECRET')[0]} occurrence de JWT_ACCESS_SECRET : il vient du `.env` de Ko) ; le serveur d'API de l'e2e reçoit un bloc `env:` sans secret ({compter('e2e/playwright.config.ts', 'JWT_ACCESS_SECRET')[0]} occurrence). Sans la valeur jetable posée par ce lot, `test:int` et `test:e2e` refuseraient de démarrer APRÈS le lot.")
    ex = source("apps/api/.env.example")
    controle("R2.2", "R-2 / D200 : `.env.example` reçoit le NOM seul", "≈", "1 fichier", f"l'exemple porte déjà `JWT_ACCESS_SECRET=dev-only-secret-change-me-in-production-0123456789` (un MARQUEUR de développement, pas une valeur réelle) ; la variable du PIN y entrera SANS valeur. Le précédent n'est pas suivi à la lettre ici, comme R-2 le veut.")
    # ── la limite de débit et le levier ──
    thr = compter("apps/api/src/auth/auth.throttle.ts", "staffPin")[0]
    controle("MP36.1", "MP-36 : la clé `staffPin` du débit n'existe pas encore ; le levier est unique (D128)", "✓" if thr == 0 else "✗", "1 fichier", f"« staffPin » : {thr} occurrence(s) ; clés neuves attendues dans `AUTH_THROTTLE`, relâchées par `THROTTLE_STAFF_PIN_LIMIT` de `setup-env.ts`")
    # ── le levier des durées et des essais ──
    lim = source("packages/types/src/staff.ts")
    controle("MP43.1", "« longueur = paramètre », « 3 essais » : le levier `STAFF_LIMITS` porte-t-il la longueur et le nombre d'essais ?", "≈", "1 fichier", f"`PIN_VALIDITY_DAYS` : {lim.count('PIN_VALIDITY_DAYS')} occurrence(s) ; `PIN_LENGTH` : {lim.count('PIN_LENGTH')} ; `PIN_MAX_FAILURES` : {lim.count('PIN_MAX_FAILURES')}. Deux clés à ajouter ; le plafond de 3 est AUSSI écrit dans la `CHECK` de la base (la constante ne peut pas dépasser 3 sans la migration : à garder par un test).")


def main():
    calibrer()
    jouer()
    n = {"✓": 0, "≈": 0, "✗": 0, "?": 0}
    print()
    for ident, aff, v, ex, note in resultats:
        n[v] += 1
        print(f"[{ident:6s}] {v}  {aff}")
        print(f"          examiné : {ex}")
        print(f"          {note}")
    total = len(resultats)
    print()
    print(f"RÉSUMÉ : {total} contrôles : {n['✓']} ✓ · {n['≈']} ≈ · {n['✗']} ✗ · {n['?']} ?   (SHA de départ {SHA[:7]} ; attendu : aucun ✗ — un ✗ ARRÊTE le lot)")
    sys.exit(1 if n["✗"] else 0)


main()
