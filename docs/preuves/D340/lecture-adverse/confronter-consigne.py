#!/usr/bin/env python3
"""Lecture adverse de la consigne du rang 44 (L36-3) contre le dépôt — D340 (forme ALLÉGÉE).

MODE D'EMPLOI : depuis la RACINE, `python3 docs/preuves/D340/lecture-adverse/confronter-consigne.py [--sortie <chemin>]`.
Il ne lit que des OBJETS GIT à SHA fixe (SHA_BASE = ec44937, l'état d'ARRIVÉE du lot) et n'écrit rien d'autre que, si
`--sortie` est donné, le fichier de sortie (UTF-8, écrit par le script lui-même : jamais par redirection du shell).

POURQUOI IL EXISTE : la consigne demande une lecture adverse « contre le dépôt ». Chaque affirmation VÉRIFIABLE est ici
une fonction qui rend (verdict, détail), et le détail imprime CE QUI A ÉTÉ PARCOURU à côté de ce qui a été trouvé (D290).

VERDICTS : ✓ vrai · ✗ faux (la règle d'arrêt de la consigne joue) · ≈ vrai pour l'essentiel, IMPRÉCIS sur un point qui
n'engage aucune action (écrit en seconde partie, jamais tu) · ? non vérifiable contre le dépôt (dit pourquoi).

FORME ALLÉGÉE : les affirmations de la consigne uniquement (numéros de ligne, citations, état de départ, règles citées).
Les MESURES du cadrage (quelles routes un Pro appelle, quelles contraintes existent) vivent dans `docs/preuves/D340/cadrage.md`,
avec la sortie brute des commandes qui les ont produites — elles ne sont pas des affirmations de la consigne.

INSTRUMENTS ÉCARTÉS : réutiliser `docs/preuves/D338/lecture-adverse/confronter-consigne.py` tel quel — il est collé aux
affirmations de D338 (SHA, lignes, noms). Seuls les PRINCIPES sont repris : texte APLATI avant toute recherche multi-mots
(AGENTS.md, D277/D294), jamais de comptage par sous-chaîne sans contexte (D275), commentaires SQL retirés avant de chercher.

CALIBRATION (D286 : deux bras, et il ABANDONNE si un cas manque son verdict) : un cas VRAI connu doit rendre ✓, un cas FAUX
connu doit rendre ✗, pour CHAQUE sorte de test employée plus bas (ligne du registre, littéral dans un fichier nommé, ligne
numérotée, motif cherché par git grep) — avant toute affirmation de la consigne.
"""
import re
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

SHA_BASE = "ec44937"
SHA_TABLE = "e3c1890"

CONT = "ZWADJ_CONTINUITE.md"
BACK = "ZWADJ_BACKLOG.md"
AGENTS = "AGENTS.md"


def git(*args: str) -> str:
    r = subprocess.run(["git", *args], capture_output=True, encoding="utf-8", errors="replace")
    return r.stdout


def blob(path: str) -> str:
    return git("show", f"{SHA_BASE}:{path}")


def aplati(texte: str) -> str:
    return re.sub(r"\s+", " ", texte)


def lignes(path: str) -> list[str]:
    return blob(path).splitlines()


def presente_dans(path: str, motif: str) -> bool:
    return motif in aplati(blob(path))


def git_grep(motif: str, *chemins: str) -> list[str]:
    """Occurrences (fichier:ligne) du motif regex dans l'arbre de SHA_BASE, sur les chemins donnés (pathspecs git)."""
    sortie = git("grep", "-n", "-E", motif, SHA_BASE, "--", *chemins)
    return [l.split(":", 1)[1] if ":" in l else l for l in sortie.splitlines() if l.strip()]


RESULTATS: list[tuple[str, str, str, str]] = []  # (id, verdict, affirmation, détail)


def noter(ident: str, ok: bool | None, affirmation: str, detail: str, nuance: bool = False) -> None:
    verdict = "?" if ok is None else ("≈" if (ok and nuance) else ("✓" if ok else "✗"))
    RESULTATS.append((ident, verdict, affirmation, detail))


def ligne_commence(path: str, n: int, debut: str) -> tuple[bool, str]:
    ls = lignes(path)
    l = ls[n - 1] if 0 < n <= len(ls) else ""
    return l.startswith(debut), f"{len(ls)} lignes parcourues ; ligne {n} = « {l.strip()[:100]} »"


def ligne_contient(path: str, n: int, motif: str) -> tuple[bool, str]:
    ls = lignes(path)
    l = ls[n - 1] if 0 < n <= len(ls) else ""
    return motif in l, f"{len(ls)} lignes parcourues ; ligne {n} = « {l.strip()[:100]} »"


def calibrer() -> str:
    registre = aplati(blob(CONT))
    v1, f1 = "| D339 | A |" in registre, "| D999 | A |" in registre
    v2, f2 = presente_dans("e2e/playwright.config.ts", "zwadj_e2e"), presente_dans("e2e/playwright.config.ts", "zwadj_base_qui_n_existe_pas")
    v3 = ligne_contient("apps/api/src/app.module.ts", 71, "ThrottlerGuard")[0]
    f3 = ligne_contient("apps/api/src/app.module.ts", 71, "RolesGuard")[0]
    v4 = len(git_grep(r"class PasswordService", "apps/api/src/auth/password.service.ts")) == 1
    f4 = len(git_grep(r"class_qui_n_existe_nulle_part_xyz", "apps/api/src/auth/password.service.ts")) == 0
    cas = {"registre": (v1, f1), "littéral dans un fichier": (v2, f2), "ligne numérotée": (v3, f3), "git grep": (v4, f4)}
    for nom, (vrai, faux) in cas.items():
        # le bras « faux » doit rendre le verdict NÉGATIF : pour git grep, f4 est « 0 occurrence » = True veut dire « absent », le bon verdict.
        attendu_faux = (faux is True) if nom == "git grep" else (faux is False)
        if not (vrai is True and attendu_faux):
            print(f"CALIBRATION RATÉE ({nom}) : cas vrai → {vrai} (attendu True), cas faux → {faux}. ABANDON.")
            sys.exit(3)
    return ("calibration : registre (ligne D339 → ✓, ligne D999 → ✗) ; littéral dans un fichier nommé (`zwadj_e2e` → ✓, `zwadj_base_qui_n_existe_pas` → ✗) ; "
            "ligne numérotée (app.module.ts:71 contient ThrottlerGuard → ✓, contient RolesGuard → ✗) ; git grep (`class PasswordService` → 1 occurrence, motif inexistant → 0) — les huit bras tiennent.")


def a_depart() -> None:
    base = git("rev-parse", SHA_BASE).strip()
    parent = git("rev-parse", f"{SHA_TABLE}^").strip()
    noms = [n for n in git("show", "--name-only", "--format=", SHA_TABLE).splitlines() if n.strip()]
    noter("0.1", parent == base and noms == ["docs/preuves/D340/table-ouverture.md"],
          "le premier commit du lot (la table) a pour parent ec44937 et ne contient que table-ouverture.md",
          f"{SHA_BASE} → {base[:12]} ; parent de {SHA_TABLE} = {parent[:12]} ; fichiers du commit = {noms}")
    origin = git("rev-parse", "origin/main").strip()
    noter("0.2", origin == base, "origin/main = ec44937 au moment de la lecture (la consigne : « Si origin/main a bougé, tu t'arrêtes »)",
          f"origin/main = {origin[:12]} ; SHA de base = {base[:12]} (après `git fetch` fait par la session avant cette lecture)")
    noter("0.3", git("stash", "list").strip() == "", "aucun stash", f"`git stash list` = {git('stash', 'list').strip() or 'vide'}")
    reg = [l for l in lignes(CONT) if re.match(r"^\| D\d+ \|", l)]
    dernier = re.match(r"^\| (D\d+) \|", reg[-1]).group(1)
    noter("0.4", dernier == "D339", "le dernier numéro du registre est D339 (attendu D340 pour ce lot)", f"{len(reg)} lignes de registre parcourues ; dernière = {dernier}")
    occ = {p: len(re.findall(r"D340", blob(p))) for p in (CONT, BACK, AGENTS, "CLAUDE.md")}
    noter("0.5", all(v == 0 for v in occ.values()), "D340 n'est attribué dans aucun fichier d'autorité", f"4 fichiers parcourus ; occurrences de « D340 » = {occ}")
    noter("0.6", git("branch", "--show-current").strip() == "main", "branche main", f"branche = {git('branch', '--show-current').strip()}")
    noter("0.7", git("status", "--short", "--", ".", ":(exclude)docs/preuves/D340").strip() == "",
          "arbre propre à l'ouverture (hors les pièces D340 en cours d'écriture)", f"`git status --short` hors docs/preuves/D340 = {git('status', '--short', '--', '.', ':(exclude)docs/preuves/D340').strip() or 'vide'}")


def a_code_cite() -> None:
    ok, d = ligne_contient("apps/api/src/app.module.ts", 71, "useClass: ThrottlerGuard")
    noter("1.1.a", ok, "app.module.ts:71 enregistre ThrottlerGuard", d)
    ok, d = ligne_contient("apps/api/src/app.module.ts", 72, "useClass: JwtAuthGuard")
    noter("1.1.b", ok, "app.module.ts:72 enregistre JwtAuthGuard", d)
    ok, d = ligne_contient("apps/api/src/app.module.ts", 73, "useClass: RolesGuard")
    noter("1.1.c", ok, "app.module.ts:73 enregistre RolesGuard", d)
    gardes = git_grep(r"provide: APP_GUARD", "apps/api/src")
    noter("1.1.d", len(gardes) == 3, "ces TROIS gardes sont les seuls gardes globaux (APP_GUARD) de l'API", f"occurrences de `provide: APP_GUARD` dans apps/api/src = {len(gardes)}")
    t = aplati(blob("apps/api/src/auth/auth.types.ts"))
    noter("1.2", "export interface AccessTokenPayload { sub: string; role: UserRole; }" in t,
          "les claims du jeton d'accès sont exactement { sub, role } (auth.types.ts)", f"{len(t)} caractères aplatis parcourus ; interface AccessTokenPayload = {{ sub: string; role: UserRole }} présente = {'export interface AccessTokenPayload { sub: string; role: UserRole; }' in t}")
    tk = blob("apps/api/src/auth/token.service.ts")
    noter("1.3.a", "randomBytes(32)" in tk and 'createHash("sha256")' in tk,
          "token.service.ts engendre le jeton opaque (256 bits d'aléa) et le hache en SHA-256", f"{len(tk.splitlines())} lignes parcourues ; randomBytes(32) = {'randomBytes(32)' in tk} ; sha256 = {'createHash(\"sha256\")' in tk}")
    cookie_tk = "cookie" in tk.lower()
    cook = git_grep(r"REFRESH_COOKIE_NAME", "apps/api/src/auth/auth.constants.ts", "apps/api/src/auth/auth.controller.ts")
    noter("1.3.b", len(cook) >= 2 and not cookie_tk,
          "le cookie du jeton de rafraîchissement vit dans token.service.ts (consigne 3 a : « le jeton de rafraîchissement et son cookie (token.service.ts) »)",
          f"token.service.ts mentionne « cookie » = {cookie_tk} ; le cookie est défini dans auth.constants.ts (nom, chemin) et posé par auth.controller.ts : {len(cook)} occurrences de REFRESH_COOKIE_NAME. "
          "Imprécision de localisation seulement : le jeton est bien dans token.service.ts, son cookie ailleurs ; la lecture de ces deux fichiers est faite dans le cadrage.", nuance=True)
    pw = blob("apps/api/src/auth/password.service.ts")
    noter("1.4", "verifyAgainstDummy" in pw and "(D5)" in pw and "argon2id" in pw,
          "password.service.ts porte le hachage argon2id et le coût factice du mot de passe (D5)", f"{len(pw.splitlines())} lignes parcourues ; verifyAgainstDummy = {'verifyAgainstDummy' in pw} ; « (D5) » = {'(D5)' in pw} ; argon2id = {'argon2id' in pw}")
    ok, d = ligne_contient("apps/api/src/config/env.ts", 150, "const PROD_REQUIRED_EXPLICIT")
    noter("1.5", ok, "PROD_REQUIRED_EXPLICIT est à env.ts:150", d)
    ok, d = ligne_commence("apps/api/prisma/schema.prisma", 1438, "model AuditLog {")
    noter("1.6.a", ok, "le modèle AuditLog est à schema.prisma:1438", d)
    ok, d = ligne_commence("apps/api/prisma/schema.prisma", 409, "model ProProfile {")
    noter("1.6.b", ok, "le modèle ProProfile est à schema.prisma:409", d)
    ecr = git_grep(r"auditLog\.(create|createMany|createManyAndReturn|upsert|update|updateMany)\(|INSERT INTO \"?audit_logs", "apps/api", ":(exclude)apps/api/src/generated", ":(exclude)*.spec.ts", ":(exclude)apps/api/test", ":(exclude)apps/api/prisma/migrations")
    noter("1.7.a", len(ecr) == 1 and "quote-store.prisma.ts" in ecr[0] and "auditLog.create" in ecr[0],
          "AuditLog a UN seul écrivain à ec44937 (hors client généré, specs, tests, migrations)", f"écritures trouvées par git grep (create/createMany/upsert/update/INSERT INTO) = {len(ecr)} : {[e.strip()[:90] for e in ecr]}")
    ok, d = ligne_contient("apps/api/src/venues/quote-store.prisma.ts", 322, "tx.auditLog.create")
    noter("1.7.b", ok, "cet écrivain est quote-store.prisma.ts:322 (la promotion de D339)", d)
    adm = git_grep(r"@Roles\(UserRole\.ADMIN\)", "apps/api/src")
    noter("1.8", len(adm) >= 2, "des routes ADMIN existent (que le lot ne touche pas)", f"occurrences de @Roles(UserRole.ADMIN) dans apps/api/src = {len(adm)} ({sorted({a.split(':')[0].split('/')[-1] for a in adm})})")
    e2e = git("ls-tree", "-r", "--name-only", SHA_BASE, "e2e/specs/").splitlines()
    noter("1.9", len(e2e) > 0, "la suite e2e existante (e2e/specs/) existe : c'est elle qui mesure « avant la première activation, l'app Pro marche comme aujourd'hui »", f"{len(e2e)} fichiers sous e2e/specs/")


def a_decisions_citees() -> None:
    dr5 = aplati("\n".join(l for l in lignes(CONT)[2104:2117]))
    motifs = ["Le jeton d'accès reste { sub, role }", "second jeton opaque (session de personnel)", "stocké haché", "révocable à l'instant",
              "vérifié à CHAQUE requête Pro par un garde global", "pro_profiles.staff_layer_enabled_at", "Le garde ne s'applique pas à ADMIN",
              "4 chiffres tirés par un générateur cryptographique", "PIN triviaux refusés", "HMAC-SHA-256 avec un secret serveur HORS base",
              "PROD_REQUIRED_EXPLICIT", "Cache-Control: no-store", "jeton d'APPAREIL (cookie HttpOnly", "3 essais : compteur ATOMIQUE en base (UPDATE … RETURNING)",
              "exactement 3 comptés", "pin_locked_at", "mot de passe 90 jours et PIN 90 jours", "7 jours, changement obligatoire",
              "révoque sessions, appareils et PIN", "10 minutes CÔTÉ SERVEUR (last_activity_at)", "plafond absolu de session 12 h",
              "5 échecs consécutifs = pause de 15 minutes par membre", "réponse identique pour compte inconnu et mauvais mot de passe",
              "désactivés, jamais supprimés", "jamais zéro Manager actif (service, verrou de ligne sur pro_profiles)", "nom de compte unique par salle",
              "MANAGER = tout", "Une table de capacités par rôle, lue par un garde", "audit_logs.actor_member_id"]
    manque = [m for m in motifs if m not in dr5]
    noter("2.1", not manque, "DR5 (ZWADJ_CONTINUITE.md:2105-2117) dit tout ce que la consigne en cite : jeton, garde global, PIN HMAC, appareil, 3 essais atomiques, expirations, inactivité, 5 échecs/15 min, jamais zéro Manager, capacités, audit",
          f"{len(motifs)} motifs cherchés dans les 13 lignes de DR5 aplaties ({len(dr5)} caractères) ; manquants = {manque}")
    ok, d = ligne_commence(CONT, 2105, "DR5. PERSONNEL")
    noter("2.2", ok, "DR5 est à ZWADJ_CONTINUITE.md:2105", d)
    tr = lignes(CONT)[2128:2133]
    noter("2.3", len(tr) == 5 and all(l.startswith("[L36-3]") for l in tr), "la tranche [L36-3] tient en cinq lignes (2129-2133) : pro_profiles, pro_staff_members, pro_staff_devices, pro_staff_sessions, audit_logs",
          f"lignes 2129-2133 lues ; débuts = {[l[:36] for l in tr]}")
    tra = aplati(" ".join(tr))
    motifs2 = ["staff_layer_enabled_at NULLABLE", "pro_staff_members", "account_name_key (normalisé)", "StaffRole (MANAGER, EMPLOYEE)", "StaffStatus (ACTIVE, DISABLED)",
               "pin_failed_count (CHECK entre 0 et 3)", "UNIQUE (pro_profile_id, account_name_key)", "pro_staff_devices", "token_hash UNIQUE", "jamais au-delà de pin_expires_at",
               "pro_staff_sessions", "plafond absolu 12 h", "end_reason enum (IDLE, LOGOUT, DISABLED, PASSWORD_CHANGED, PIN_LOCKED)", "actor_member_id NULLABLE, FK → pro_staff_members ON DELETE SET NULL"]
    manque2 = [m for m in motifs2 if m not in tra]
    noter("2.4", not manque2, "la tranche [L36-3] porte les colonnes, énumérations, CHECK et UNIQUE que la consigne suppose", f"{len(motifs2)} motifs cherchés dans les 5 lignes aplaties ({len(tra)} caractères) ; manquants = {manque2}")
    ordre = lignes(CONT)
    l44 = [i + 1 for i, l in enumerate(ordre) if l.startswith("44 L36-3 — personnel et PIN, serveur · chemin d'identité")]
    l45 = [i + 1 for i, l in enumerate(ordre) if l.startswith("45 L36-4 — personnel et PIN, écrans")]
    pil = [i + 1 for i, l in enumerate(ordre) if l.startswith("Pilote minimum : 41 à 45")]
    titre = [i + 1 for i, l in enumerate(ordre) if "ORDRE PROPOSÉ DES LOTS (aucune certification)" in l]
    noter("2.5", len(l44) == 1 and len(l45) == 1 and len(pil) == 1 and len(titre) == 1,
          "la section 5 de la consigne v3 porte « 44 L36-3 — personnel et PIN, serveur · chemin d'identité », « 45 L36-4 », « Pilote minimum : 41 à 45 » et le titre « ORDRE PROPOSÉ DES LOTS (aucune certification) »",
          f"{len(ordre)} lignes parcourues ; lignes 44 = {l44}, 45 = {l45}, pilote = {pil}, titre = {titre}")
    dr1 = aplati(next((l for l in ordre if l.startswith("DR1. ")), ""))
    noter("2.6", "En pause : passes de certification au repos" in dr1 and "sessions B d'attaque à froid" in dr1 and "les tests rouges d'abord quand la méthode est RENFORCÉE" in dr1 and "la lecture adverse d'ouverture" in dr1 and "le contrôle de fin de lot" in dr1,
          "DR1 : en pause, les passes de certification et les sessions B ; conservés, les tests rouges d'abord (RENFORCÉE), la lecture adverse d'ouverture, le contrôle de fin de lot", f"ligne DR1 aplatie : {len(dr1)} caractères parcourus")
    dr8 = aplati(next((l for l in ordre if l.startswith("DR8. ")), ""))
    noter("2.7", "Tout schéma est ratifié par Ko avant sa migration" in dr8 and "s'arrête et présente l'écart" in dr8,
          "DR8 : tout schéma est ratifié avant sa migration ; une session qui doit s'en écarter s'arrête et présente l'écart", f"ligne DR8 aplatie : {len(dr8)} caractères parcourus")
    dr9 = aplati(next((l for l in ordre if l.startswith("DR9. ")), ""))
    noter("2.8", "MS-6 : relecture extérieure (forme D de D330) des chemins d'identité (personnel et PIN, annuaire) avant le premier vrai client" in dr9,
          "DR9 / MS-6 : la relecture extérieure des chemins d'identité reste dans la liste de mise en service", f"ligne DR9 aplatie : {len(dr9)} caractères parcourus")
    noter("2.9", "(Défaut du relecteur ; à confirmer avec les instructions de la salle pilote, Q7.)" in dr5, "Q7 : le défaut de la table des capacités est celui du relecteur, à confirmer par la salle pilote", "motif cherché dans DR5 aplatie")


def a_etat_et_sources() -> None:
    cont = blob(CONT)
    ls = cont.splitlines()
    idx = [i for i, l in enumerate(ls[:2420]) if re.search(r"⇒ \*\*RANG \d+", l)]
    derniere = ls[idx[-1]] if idx else ""
    noter("3.1", "RANG 44" in derniere and "EN ATTENTE D'ARBITRAGE DE KO" in derniere,
          "la dernière ligne « ⇒ RANG » de l'ordre des rangs est « RANG 44 : EN ATTENTE D'ARBITRAGE DE KO » (le rang que cette session ouvre)",
          f"{len(ls[:2420])} lignes parcourues ; {len(idx)} lignes « ⇒ RANG » ; dernière = ligne {idx[-1] + 1 if idx else '?'} : « {derniere[:80]} »")
    sec = aplati(cont)
    noter("3.2", "POUR MÉMOIRE DEUX → TROIS" in sec and "POUR MÉMOIRE DEUX → TROIS" in aplati(blob(AGENTS)),
          "le compteur pour mémoire est à TROIS à la clôture du rang 43 (dans ZWADJ_CONTINUITE.md et dans AGENTS.md)", f"texte aplati de {len(sec)} caractères ; motif présent dans CONTINUITE = {'POUR MÉMOIRE DEUX → TROIS' in sec} ; dans AGENTS = {'POUR MÉMOIRE DEUX → TROIS' in aplati(blob(AGENTS))}")
    manque = [f"S-{n}" for n in range(83, 98) if not re.search(rf"^- \*\*S-{n}\*\*", cont, re.M)]
    noter("3.3", not manque, "S-83 à S-97 existent dans la section D339", f"15 identifiants cherchés sous la forme `- **S-nn**` ; manquants = {manque}")
    s97 = aplati(next((l for l in ls if l.startswith("- **S-97**")), ""))
    noter("3.4", "la pause des certifications couvre aussi la « certification immédiate »" in s97, "S-97 dit ce que la consigne confirme (R-2) : la pause couvre la certification immédiate d'un lot d'identité", f"ligne S-97 aplatie : {len(s97)} caractères parcourus")
    sc = blob("docs/preuves/D339/scenarios-ko.md")
    numerotes = sorted(set(re.findall(r"^([1-9])\. \*\*", sc, re.M)))
    amorce = "pnpm --filter @zwadj/api run prisma:migrate" in sc
    noter("3.5", numerotes == ["1", "2", "3", "4", "5", "6"] and amorce,
          "docs/preuves/D339/scenarios-ko.md porte « sept gestes (0 à 6) » dont le geste 0 = la migration appliquée à la base de développement",
          f"{len(sc.splitlines())} lignes parcourues ; gestes NUMÉROTÉS = {numerotes} (six) ; la commande de migration est dans la phrase d'introduction, non numérotée = {amorce}. "
          "Imprécision de forme seulement : « geste 0 » n'est pas un item du fichier mais sa phrase d'introduction ; le fond (la migration est à faire par Ko avant les six gestes) est exact.", nuance=True)
    # ⚠ Défaut d'instrument de la PASSE 1 (docs/preuves/D340/lecture-adverse/defauts-instrument.txt) : R-6 s'étend sur PLUSIEURS lignes ;
    # l'extracteur n'en lisait que la première (148 caractères) et rendait ✗ sur un texte qu'il n'avait pas lu. Le bloc va de « - R-6. » à « - R-7. ».
    debut6 = next((i for i, l in enumerate(ls) if l.startswith("- R-6. L'e2e de clôture se rejoue EN ENTIER, UNE fois")), None)
    fin6 = next((i for i, l in enumerate(ls) if debut6 is not None and i > debut6 and l.startswith("- R-7.")), None)
    r6 = aplati(" ".join(ls[debut6:fin6])) if debut6 is not None and fin6 is not None else ""
    r8 = aplati(next((l for l in ls if l.startswith("- R-8.")), ""))
    ok6 = "UNE fois, à la main" in r6 and "tu écris cette règle" in r6 and "côte à côte" in r6 and "pas de deuxième rejeu" in r6
    machine_dans_r6 = "état machine" in r6.lower()
    machine_dans_r8 = "L'état machine se relève PENDANT le rejeu" in r8
    precis = ok6 and machine_dans_r6
    noter("3.6", ok6 and (machine_dans_r6 or machine_dans_r8),
          "R-6 de D339 : un seul rejeu complet à la main, sa règle écrite avant, les deux passes versées côte à côte, l'état machine relevé pendant",
          f"bloc R-6 lu en entier : lignes {debut6 + 1 if debut6 is not None else '?'}-{fin6 if fin6 is not None else '?'} ({len(r6)} caractères aplatis) ; rejeu unique à la main, règle écrite avant, passes côte à côte, pas de deuxième rejeu = {ok6} ; "
          f"« état machine » dans le bloc R-6 = {machine_dans_r6} ; « L'état machine se relève PENDANT le rejeu » dans R-8 = {machine_dans_r8}"
          + ("" if precis else ". Imprécision de numéro seulement : le relevé de l'état machine est la décision R-8 de D339, pas R-6 ; la règle appliquée sera R-6 ET R-8."),
          nuance=not precis)
    back = [l for l in lignes(BACK) if "L36-3" in l and "LE PERSONNEL ET LE PIN, CÔTÉ SERVEUR" in l]
    noter("3.7", len(back) == 1, "l'entrée L36-3 du backlog existe, ouverte, et sera mise à jour (pas dupliquée)", f"{len(lignes(BACK))} lignes du backlog parcourues ; entrées « L36-3 … CÔTÉ SERVEUR » = {len(back)}")
    rang44 = [l for l in lignes(BACK) if re.search(r"rang 44|RANG 44", l)]
    noter("3.8", None, "« aucune entrée ouverte du backlog n'est placée avant lui » (R-1)",
          f"NON VÉRIFIABLE mécaniquement : le backlog ne porte pas de rang (D302). Relevé seulement : {len(rang44)} lignes du backlog nomment « rang 44 ».")


def a_non_verifiables() -> None:
    noter("4.1", None, "« origin/main = ec44937 (vérifié par le relecteur le 03/11/2026) »", "la vérification du relecteur est dans le chat ; la session a refait la sienne (0.2).")
    noter("4.2", None, "la citation de Ko du 02/11/2026 (1 a) : « je prends que les descision … »", "dite dans le chat du relecteur, hors dépôt : recopiée mot pour mot dans le premier fichier d'autorité, sans pouvoir être confrontée.")
    noter("4.3", None, "« joués par Ko avant l'envoi de ce message » (1 b : les gestes du rang 43)", "déclaration de Ko ; aucun fichier du dépôt ne peut la confirmer. Elle s'écrira comme déclarée.")
    noter("4.4", None, "« Ko l'a collé » / « adopté par Ko tel quel » (en-tête, 1)", "la consigne s'écrit « par ADOPTION de ce message » (sa propre instruction) ; l'adoption n'est pas une parole de Ko.")


def main() -> None:
    sortie = None
    if "--sortie" in sys.argv:
        sortie = sys.argv[sys.argv.index("--sortie") + 1]
    cal = calibrer()
    a_depart()
    a_code_cite()
    a_decisions_citees()
    a_etat_et_sources()
    a_non_verifiables()
    n = len(RESULTATS)
    cpt = {v: sum(1 for r in RESULTATS if r[1] == v) for v in ("✓", "≈", "✗", "?")}
    out = [f"LECTURE ADVERSE DE LA CONSIGNE DU RANG 44 (D340) — instrument confronter-consigne.py, SHA de base {SHA_BASE}", cal, "",
           "══ PREMIÈRE PARTIE — COURTE ══",
           f"{n} contrôles parcourus : {cpt['✓']} ✓ · {cpt['≈']} ≈ (imprécis, sans action) · {cpt['✗']} ✗ · {cpt['?']} ? non vérifiables (attendu : aucun ✗ ; chaque ≈ et chaque ? expliqué en seconde partie)", "",
           "══ SECONDE PARTIE — EN ENTIER ══"]
    for ident, verdict, affirmation, detail in RESULTATS:
        out.append(f"{verdict} [{ident}] {affirmation}")
        out.append(f"     ↳ {detail}")
    texte = "\n".join(out) + "\n"
    print(texte, end="")
    if sortie:
        with open(sortie, "w", encoding="utf-8", newline="\n") as f:
            f.write(texte)
    sys.exit(0 if cpt["✗"] == 0 else 1)


if __name__ == "__main__":
    main()
