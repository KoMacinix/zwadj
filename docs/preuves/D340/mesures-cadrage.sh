#!/usr/bin/env bash
# D340 — rang 44 (L36-3) — LES MESURES DU CADRAGE.
#
# MODE D'EMPLOI : depuis la RACINE du dépôt, `bash docs/preuves/D340/mesures-cadrage.sh > docs/preuves/D340/mesures-cadrage.txt`.
# Chaque mesure imprime SA COMMANDE avant sa sortie brute (`$ …`). Le code lu l'est dans l'objet git du SHA de départ (ec44937), jamais dans l'arbre de
# travail : le résultat ne dépend pas de ce qu'on a édité depuis. Rien n'est écrit dans le dépôt par ce script.
#
# POURQUOI : `cadrage.md` cite des faits (lignes, comptes, inventaire de routes). « AUCUNE VALEUR ATTENDUE NE S'ÉCRIT DE MÉMOIRE » (AGENTS.md) : chacun vient d'ici.
#
# ⚠ DÉFAUTS D'INSTRUMENT RENCONTRÉS EN ÉCRIVANT M08 (l'extracteur de routes), tous trois attrapés par une confrontation à la SOURCE BRUTE et jamais par le
# contrôle qui était vert (D275, D290) :
#   1. le contrôle par COMPTE de routes (vert) ne regarde pas les rôles : dans un fichier à DEUX classes (un filtre d'exception, puis le contrôleur —
#      `venue-media.controller.ts`, `availability.controller.ts`), le `@Roles` de la seconde classe était attribué à la première route seulement :
#      4 routes sur 5 « sans @Roles » à tort ;
#   2. `@Public() // commentaire` n'était pas reconnu (regex ancrée sur la fin de ligne) : `/health` et `/media/:key` passaient pour « authentifiées » ;
#   3. conséquence : le comptage « sans @Roles » est passé de 13 (passe 1) à 9 (passe 2) puis à 7 (passe 3, celle versée ici).
#   Réparations : état de classe remis à zéro à CHAQUE `export class` ; commentaire de fin de ligne toléré ; QUATRE bras de calibration (dont un fictif à
#   deux classes, un fictif avec commentaire, un cas faux) ; et un compte indépendant des décorateurs `@Public` et `@Roles` (reconnus contre présents),
#   pas seulement des routes. Les passes 1 et 2 sont décrites ici, leur sortie n'est pas versée (elles n'ont jamais servi de mesure).
set -u
cd "$(git rev-parse --show-toplevel)" || exit 2
SHA=ec44937
run() { echo; echo "### $1"; echo "\$ $2"; bash -c "$2" 2>&1; echo "[code de sortie: $?]"; }

echo "D340 — mesures du cadrage de L36-3 — SHA de départ $(git rev-parse --short=7 $SHA) ($(git rev-parse $SHA))"

run "M01 — les trois gardes globaux et leur ordre (app.module.ts, lignes 65-74)" "git show $SHA:apps/api/src/app.module.ts | sed -n '65,74p' | cat -n"
run "M02 — les gardes globaux sont seulement ces trois-là (nombre d'occurrences de « provide: APP_GUARD »)" "git grep -c 'provide: APP_GUARD' $SHA -- apps/api/src"
run "M03 — les claims du jeton d'accès (auth.types.ts, lignes 11-21)" "git show $SHA:apps/api/src/auth/auth.types.ts | sed -n '11,21p' | cat -n"
run "M04 — JwtAuthGuard : l'identité vient du Bearer, jamais d'un cookie (extraction + ce que le garde pose sur request.user)" "git show $SHA:apps/api/src/auth/jwt-auth.guard.ts | sed -n '26,56p' | cat -n"
run "M05 — RolesGuard : 401 sans identité, 403 si le rôle manque (lignes 24-50)" "git show $SHA:apps/api/src/auth/roles.guard.ts | sed -n '24,50p' | cat -n"
run "M06 — jeton opaque et son hachage (token.service.ts, lignes 12-21)" "git show $SHA:apps/api/src/auth/token.service.ts | sed -n '12,21p' | cat -n"
run "M07 — le cookie de rafraîchissement : nom, chemin, attributs (auth.constants.ts:8-11 ; auth.controller.ts:215-230)" "git show $SHA:apps/api/src/auth/auth.constants.ts | sed -n '8,11p'; git show $SHA:apps/api/src/auth/auth.controller.ts | sed -n '215,230p'"

echo; echo "### M08 — INVENTAIRE DES ROUTES de l'API (extrait des sources des contrôleurs ; extracteur embarqué, calibré, abandon si un bras manque)"
echo "\$ python3 <extracteur embarqué> (lit apps/api/src/**/*.controller.ts à l'état de l'arbre de travail = ec44937 + pièces de docs/preuves/D340 seulement)"
TMPPY="$(mktemp -d)/inventaire-routes.py"
cat > "$TMPPY" <<'PY'
import re
import sys
from collections import Counter
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

FIN = r"\s*(?://.*)?$"
HTTP = re.compile(r"^\s*@(Get|Post|Put|Patch|Delete)\((.*?)\)" + FIN)
ROLES = re.compile(r"^\s*@Roles\((.*?)\)" + FIN)
PUBLIC = re.compile(r"^\s*@Public\(\)" + FIN)
CONTROLLER = re.compile(r"^\s*@Controller\((.*?)\)" + FIN)
CLASS = re.compile(r"^\s*export class (\w+)")
METHOD = re.compile(r"^\s{2}(?:async\s+)?(\w+)\s*\(")
STR = re.compile(r"[\"'`]([^\"'`]*)[\"'`]")


def analyser(texte):
    """Décorateurs SANS indentation = ceux de la classe qui suit ; indentés de deux espaces = ceux d'une méthode."""
    cls_ctrl, cls_public, cls_roles = None, False, None
    cur_public, cur_roles = False, None
    classe, prefixe, controleur = None, "", False
    pend_http, pend_public, pend_roles = [], False, None
    routes = []
    for l in texte.splitlines():
        if not l.startswith("  "):
            if CONTROLLER.match(l):
                m = STR.search(CONTROLLER.match(l).group(1))
                cls_ctrl = m.group(1) if m else ""
            elif PUBLIC.match(l):
                cls_public = True
            elif ROLES.match(l):
                cls_roles = ROLES.match(l).group(1)
            elif CLASS.match(l):
                classe = CLASS.match(l).group(1)
                controleur = cls_ctrl is not None
                prefixe = cls_ctrl or ""
                cur_public, cur_roles = cls_public, cls_roles
                cls_ctrl, cls_public, cls_roles = None, False, None
                pend_http, pend_public, pend_roles = [], False, None
            continue
        if not controleur:
            continue
        if HTTP.match(l):
            verbe, arg = HTTP.match(l).groups()
            m = STR.search(arg)
            pend_http.append((verbe.upper(), m.group(1) if m else ""))
        elif PUBLIC.match(l):
            pend_public = True
        elif ROLES.match(l):
            pend_roles = ROLES.match(l).group(1)
        elif METHOD.match(l) and pend_http and not l.strip().startswith(("if", "for", "return", "const", "throw")):
            for verbe, chemin in pend_http:
                routes.append({"verbe": verbe, "chemin": "/".join(x for x in (prefixe, chemin) if x), "public": pend_public or cur_public,
                               "roles": pend_roles if pend_roles is not None else cur_roles, "methode": METHOD.match(l).group(1), "classe": classe})
            pend_http, pend_public, pend_roles = [], False, None
    return routes


def calibrer():
    un = "@Controller('x')\n@Roles(UserRole.PRO)\nexport class X {\n  @Get('a')\n  @Public()\n  async a() {}\n  @Post('b')\n  async b() {}\n}\n"
    r = analyser(un)
    if not (len(r) == 2 and sum(1 for x in r if x["public"]) == 1 and r[1]["roles"] == "UserRole.PRO" and r[0]["chemin"] == "x/a"):
        print("CALIBRATION RATÉE (cas fictif 1) :", r)
        sys.exit(3)
    deux = ("@Catch(E)\nexport class F implements ExceptionFilter {\n  catch() {}\n}\n@Controller()\n@Roles(UserRole.PRO)\nexport class C {\n"
            "  @Post('p')\n  async p() {}\n  @Patch('q')\n  async q() {}\n  @Delete('r')\n  async r() {}\n}\n")
    r2 = analyser(deux)
    if not (len(r2) == 3 and all(x["roles"] == "UserRole.PRO" for x in r2) and all(x["classe"] == "C" for x in r2)):
        print("CALIBRATION RATÉE (cas fictif 2 : filtre puis contrôleur) :", r2)
        sys.exit(3)
    r3 = analyser(deux.replace("@Roles(UserRole.PRO)\n", ""))
    if not (len(r3) == 3 and all(x["roles"] is None for x in r3)):
        print("CALIBRATION RATÉE (cas faux : @Roles retiré) :", r3)
        sys.exit(3)
    com = "@Public() // sonde de vivacité\n@Controller('h')\nexport class H {\n  @Get()\n  async h() {}\n}\n"
    r4 = analyser(com)
    if not (len(r4) == 1 and r4[0]["public"] is True and r4[0]["chemin"] == "h"):
        print("CALIBRATION RATÉE (cas fictif 3 : décorateur suivi d'un commentaire) :", r4)
        sys.exit(3)
    return ("calibration : cas fictif 1 (préfixe, @Public, rôle de classe hérité) ✓ · cas fictif 2 (filtre puis contrôleur dans le même fichier : "
            "3 routes héritent @Roles(PRO)) ✓ · cas faux (@Roles de classe retiré : 0 rôle) ✓ · cas fictif 3 (@Public() suivi d'un commentaire) ✓")


def main():
    fichiers = sorted(p for p in Path("apps/api/src").rglob("*.controller.ts") if ".spec." not in p.name and "generated" not in p.parts)
    print(calibrer())
    total, ecarts, sortie = 0, [], []
    for p in fichiers:
        texte = p.read_text(encoding="utf-8")
        r = analyser(texte)
        lignes = texte.splitlines()
        indep = sum(1 for l in lignes if re.match(r"^\s*@(Get|Post|Put|Patch|Delete)\(", l))
        if len(r) != indep:
            ecarts.append((str(p), "routes", len(r), indep))
        for nom, motif, lu in (("@Public", r"^\s*@Public\(", PUBLIC), ("@Roles", r"^\s*@Roles\(", ROLES)):
            vus = sum(1 for l in lignes if lu.match(l))
            vrais = sum(1 for l in lignes if re.match(motif, l))
            if vus != vrais:
                ecarts.append((str(p), nom + " reconnus/présents", vus, vrais))
        total += len(r)
        sortie += [(p.name, x) for x in r]
    print(f"{len(fichiers)} contrôleurs parcourus · {total} routes extraites · compte indépendant (routes, @Public, @Roles) : {len(ecarts)} écart(s) {ecarts} (attendu 0)")
    if ecarts:
        print("CALIBRATION RATÉE (compte indépendant)")
        sys.exit(3)

    def categorie(x):
        if x["public"]:
            return "public"
        if not x["roles"]:
            return "authentifiée, sans @Roles"
        return "@Roles(" + x["roles"].replace("UserRole.", "") + ")"

    print("--- ventilation par catégorie :")
    for k, v in sorted(Counter(categorie(x) for _, x in sortie).items(), key=lambda kv: -kv[1]):
        print(f"  {v:>3}  {k}")
    pro = [(f, x) for f, x in sortie if not x["public"] and (not x["roles"] or "PRO" in x["roles"])]
    print(f"--- routes ATTEIGNABLES par un compte PRO (authentifiées, @Roles contenant PRO ou sans @Roles) : {len(pro)}")
    print(f"    lectures (GET) : {sum(1 for _, x in pro if x['verbe'] == 'GET')} · écritures (POST/PUT/PATCH/DELETE) : {sum(1 for _, x in pro if x['verbe'] != 'GET')}")
    for f, n in sorted(Counter(f for f, _ in pro).items(), key=lambda kv: -kv[1]):
        ecr = sum(1 for g, x in pro if g == f and x["verbe"] != "GET")
        sr = sum(1 for g, x in pro if g == f and not x["roles"])
        print(f"  {n:>3} routes ({ecr} écritures, {sr} sans @Roles)  {f}")
    print("--- routes authentifiées SANS @Roles (la liste blanche de D119) :")
    for f, x in sortie:
        if not x["public"] and not x["roles"]:
            print(f"  {x['verbe']:<6} /{x['chemin']}   [{f} · {x['methode']}]")
    print("--- routes @Roles(CLIENT) / @Roles(ADMIN) (hors du périmètre d'un Pro) :")
    for f, x in sortie:
        if not x["public"] and x["roles"] and "PRO" not in x["roles"]:
            print(f"  {x['verbe']:<6} /{x['chemin']}   [{f}] {x['roles'].replace('UserRole.', '')}")
    print("--- routes @Roles(PRO) qui ÉCRIVENT :")
    for f, x in sortie:
        if not x["public"] and x["roles"] and "PRO" in x["roles"] and x["verbe"] != "GET":
            print(f"  {x['verbe']:<6} /{x['chemin']}   [{f}]")


main()
PY
python3 "$TMPPY"; echo "[code de sortie: $?]"

run "M09 — le collecteur de routes DÉRIVÉ DU ROUTEUR existe déjà (D119) : fichiers qui parcourent ModulesContainer" "git grep -l 'ModulesContainer' $SHA -- apps/api/test | sed 's/^[^:]*://'"
run "M10 — transport côté client : credentials, Bearer en mémoire, et SEULE réaction à un 401 (auth-client.ts:144-147 et :200-204)" "git show $SHA:packages/api-client/src/auth-client.ts | sed -n '142,148p;196,204p' | cat -n"
run "M11 — CORS : origine restreinte + credentials, aucun allowedHeaders (main.ts:21-23)" "git show $SHA:apps/api/src/main.ts | sed -n '21,23p'"
run "M12 — les limites de débit des routes d'auth : un seul levier de test (D128) — clés d'AUTH_THROTTLE" "git show $SHA:apps/api/src/auth/auth.throttle.ts | grep -n -E '^  [a-zA-Z]+: \\{ limit' | cut -c1-110"
run "M13 — PasswordService : hachage argon2id, vérification, coût factice (lignes 11-41)" "git show $SHA:apps/api/src/auth/password.service.ts | sed -n '11,41p' | cat -n"
run "M14 — passwordSchema actuel (packages/types/src/auth.ts:12-18)" "git show $SHA:packages/types/src/auth.ts | sed -n '12,18p'"
run "M15 — normaliseurs existants dans packages/types (aucun pour un nom de compte ni pour l'arabe) ; TÉMOIN POSITIF : NFKC est bien trouvé dans contact.ts" "git grep -n -E 'export function (normalize|canonical)\w*' $SHA -- packages/types/src | grep -v -E 'test|spec' | sed 's/^[^:]*://'; echo '--- témoin positif (fichiers de packages/types/src qui mentionnent NFKC):'; git grep -c NFKC $SHA -- packages/types/src | sed 's/^[^:]*://'; echo '--- script arabe (plages \u0600-\u06FF, Script=Arabic, tatweel) dans packages/types/src et apps/api/src, hors tests et client généré:'; git grep -c -i -E 'u0600|u06FF|Script=Arabic|tatweel' $SHA -- packages/types/src apps/api/src ':(exclude)apps/api/src/generated' ':(exclude)*.spec.ts' ':(exclude)*.test.ts' || echo '(aucune occurrence)'"
run "M16 — ports Clock / Random / PinHasher : existants ? TÉMOIN POSITIF : TokenService est bien trouvé" "echo -n 'témoin positif (fichiers mentionnant TokenService): '; git grep -c TokenService $SHA -- apps/api/src ':(exclude)apps/api/src/generated' | wc -l; echo -n 'cible (fichiers mentionnant Clock/PinHasher/Random en port): '; git grep -c -E 'interface Clock|CLOCK|PinHasher|interface Random|RANDOM_' $SHA -- apps/api/src ':(exclude)apps/api/src/generated' | wc -l"
run "M17 — les variables d'environnement actuellement exigées en production (env.ts:150-161) et la forme du secret JWT (env.ts:21)" "git show $SHA:apps/api/src/config/env.ts | sed -n '21p;150,161p'"
run "M18 — AuditLog : le modèle (schema.prisma:1438-1456) et ses ÉCRIVAINS à ec44937 (hors client généré, specs, tests, migrations)" "git show $SHA:apps/api/prisma/schema.prisma | sed -n '1438,1456p'; echo '--- écrivains:'; git grep -n -E 'auditLog\\.(create|createMany|upsert|update)\\(' $SHA -- apps/api ':(exclude)apps/api/src/generated' ':(exclude)*.spec.ts' ':(exclude)apps/api/test' | sed 's/^[^:]*://'"
run "M19 — ProProfile (schema.prisma:409-436) : la clé de rattachement d'un compte à sa salle est user_id UNIQUE" "git show $SHA:apps/api/prisma/schema.prisma | sed -n '409,436p'"
run "M20 — précédent d'une écriture atomique « INSERT … ON CONFLICT … RETURNING » dans le code (compteur de devis, D333)" "git grep -n -E 'ON CONFLICT|RETURNING' $SHA -- apps/api/src ':(exclude)apps/api/src/generated' ':(exclude)*.spec.ts' | sed 's/^[^:]*://' | cut -c1-170"
run "M21 — numéros K déjà attribués dans les fichiers d'autorité et les cadrages (le plus grand détermine les numéros neufs)" "git show $SHA:ZWADJ_CONTINUITE.md $SHA:ZWADJ_BACKLOG.md | grep -ohE '\\bK-[0-9]+[a-z]?\\b' | sort -t- -k2 -n -u | tr '\\n' ' '"
run "M22 — migrations : les trois dernières (le nom de la migration de L36-3 se place après la dernière)" "git ls-tree --name-only $SHA apps/api/prisma/migrations/ | sed 's#apps/api/prisma/migrations/##' | grep -v lock | tail -3"
run "M23 — la suite e2e existante : nombre de specs ; TÉMOIN POSITIF (playwright) puis cible (le personnel : staff, pin en mot entier)" "echo -n 'specs: '; git ls-tree -r --name-only $SHA e2e/specs/ | wc -l; echo -n 'témoin positif (fichiers de e2e/ mentionnant playwright): '; git grep -c -i playwright $SHA -- e2e | wc -l; echo -n 'cible (fichiers de e2e/ mentionnant staff ou pin en mot entier): '; git grep -c -i -w -E 'staff|pin' $SHA -- e2e | wc -l"
run "M24 — taille de RÉFÉRENCE : le lot L36-2 (D339), code de d703117 à ec44937 (apps, packages, e2e, neutralisation)" "git diff --shortstat d703117 ec44937 -- apps packages e2e neutralisation; echo \"ajoutés: \$(git diff --diff-filter=A --name-only d703117 ec44937 -- apps packages e2e neutralisation | wc -l) · modifiés: \$(git diff --diff-filter=M --name-only d703117 ec44937 -- apps packages e2e neutralisation | wc -l) · fichiers de test: \$(git diff --name-only d703117 ec44937 -- apps packages e2e | grep -c -E '\\.(spec|test|int-spec|e2e)\\.tsx?\$')\"; git diff --numstat d703117 ec44937 -- apps packages | awk '{ if (\$3 ~ /\\.(spec|test|int-spec|e2e)\\.tsx?\$/) t+=\$1; else p+=\$1 } END { print \"insertions production+config:\", p, \" insertions tests:\", t }'"
echo; echo "### M25 — la même référence : tests avant et après D339, SOMMÉS sur tous les paquets du pnpm test racine (défaut de la première version : tail -2 prenait le DERNIER paquet seulement) ; avant = le REJEU vert de D338 (sa première passe était rouge), après = la passe de D339"
somme_vitest() { sed 's/\x1b\[[0-9;]*m//g' "$1" | awk -v f="$1" '/^ *Test Files +[0-9]+ passed/ {tf+=$3; n1++} /^ *Tests +[0-9]+ passed/ {t+=$2; n2++} END {print f ": fichiers=" tf " (" n1 " résumés) tests=" t " (" n2 " résumés)"}'; }
echo '$ somme_vitest docs/preuves/D338/portes/test-rejeu-1.txt ; somme_vitest docs/preuves/D339/portes/test.txt   # awk : somme des lignes « Test Files N passed » et « Tests N passed »'
somme_vitest docs/preuves/D338/portes/test-rejeu-1.txt
somme_vitest docs/preuves/D339/portes/test.txt
echo '--- attendu, lu dans la section D339 de ZWADJ_CONTINUITE.md (clôture du rang 43) :'
git show $SHA:ZWADJ_CONTINUITE.md | grep -o -E 'test` 2 194 / 148' | head -1
echo '--- test:int avant / après (un seul paquet, pas de somme) :'
for f in docs/preuves/D338/portes/test-int.txt docs/preuves/D339/portes/test-int.txt; do echo -n "$f : "; sed 's/\x1b\[[0-9;]*m//g' "$f" | grep -E '^ *Tests +[0-9]+ passed' | tail -1; done
run "M26 — la migration de référence : sa taille (D339, une colonne, une CHECK, un déclencheur)" "wc -l apps/api/prisma/migrations/20261028100000_quote_unofficial_draft/migration.sql"

echo; echo "### M27 — LE JOURNAL DES REQUÊTES MASQUE-T-IL LES COOKIES ? (pino-http avec la configuration EXACTE d'app.module.ts:30, puis avec « res.headers[set-cookie] » ajouté)"
echo '$ node <script embarqué> (résolution de pino-http depuis apps/api, serveur http local, une requête portant cookie + Authorization, une réponse posant un Set-Cookie ; rien n'"'"'est écrit dans le dépôt)'
echo "--- configuration lue dans le dépôt :"; git show $SHA:apps/api/src/app.module.ts | sed -n '30p'
TMPJS="$(mktemp -d)/cookies-journal.cjs"
cat > "$TMPJS" <<'JS'
const path = require("path");
const http = require("http");
const pinoHttp = require(require.resolve("pino-http", { paths: [path.resolve("apps/api")] }));
const version = require(require.resolve("pino-http/package.json", { paths: [path.resolve("apps/api")] })).version;
const CONFIG_ACTUELLE = ["req.headers.authorization", "req.headers.cookie"];
const CONFIG_CORRIGEE = ["req.headers.authorization", "req.headers.cookie", 'res.headers["set-cookie"]'];
function essai(nom, redact) {
  return new Promise((resolve) => {
    const lignes = [];
    const logger = pinoHttp({ level: "info", redact, stream: { write: (s) => lignes.push(s) } });
    const srv = http.createServer((req, res) => {
      logger(req, res);
      res.setHeader("Set-Cookie", "zwadj_rt=VALEUR_TEMOIN_SORTANTE_123; HttpOnly; Path=/api/v1/auth");
      res.end("ok");
    });
    srv.listen(0, () => {
      http.get({ port: srv.address().port, path: "/x", headers: { cookie: "zwadj_rt=COOKIE_ENTRANT_456", authorization: "Bearer JETON_ENTRANT_789" } }, (r) => {
        r.resume();
        r.on("end", () => setTimeout(() => {
          const tout = lignes.join("");
          console.log(`${nom} — lignes de journal: ${lignes.length} · cookie ENTRANT visible: ${tout.includes("COOKIE_ENTRANT_456")} · Authorization ENTRANT visible: ${tout.includes("JETON_ENTRANT_789")} · Set-Cookie SORTANT visible: ${tout.includes("VALEUR_TEMOIN_SORTANTE_123")}`);
          srv.close(resolve);
        }, 200));
      });
    });
  });
}
(async () => {
  console.log(`pino-http ${version}`);
  await essai("configuration ACTUELLE (app.module.ts:30)  ", CONFIG_ACTUELLE);
  await essai("configuration + res.headers[set-cookie]    ", CONFIG_CORRIGEE);
})();
JS
node "$TMPJS"; echo "[code de sortie: $?]"
echo "--- lecture : les deux premières colonnes à « false » prouvent que la rédaction MARCHE là où elle est déclarée (bras de contrôle) ; « Set-Cookie SORTANT visible: true » avec la configuration actuelle est le défaut ; « false » avec la configuration corrigée prouve que le remède agit."
echo "--- limite écrite : mesuré au niveau de pino-http (la bibliothèque que nestjs-pino enveloppe), pas à travers l'application Nest démarrée."
