"""D328 — ÉTAT DES LIEUX DU CODE pour le cadrage de la base clients (rang 35). LECTURE SEULE.

POURQUOI IL EXISTE
  Consigne du rang 35, point 1 : « où un téléphone est saisi aujourd'hui (inscription, profil, parcours sur place, visite) et s'il est normalisé ; ce qui existe d'une `Commission` (modèle, qui l'écrit, quand) ;
  l'origine d'une réservation ou d'un devis ; les noms ». Les colonnes et les doublons sont relevés dans la base par `sondes.py` (même dossier).

USAGE, depuis la racine (bash, jamais une redirection PowerShell — D298) :
  python3 docs/preuves/D328/etat-des-lieux/releve-code.py > docs/preuves/D328/etat-des-lieux/releve-code-sortie.txt

LECTURE SEULE. Les fichiers sont lus dans l'ARBRE DE TRAVAIL (aucun code n'est modifié par ce lot : l'arbre est celui de `ab8e6f6`, vérifié par la sonde de provenance imprimée en tête). Les fichiers de test (`*.test.*`, `*.spec.*`,
  `*.int-spec.*`), `node_modules`, `dist`, `generated` sont écartés des relevés de production, et on le dit.
INSTRUMENTS ÉCARTÉS : un `grep -rn` ligne à ligne sur des expressions qui enjambent une ligne (D275, D289) — les motifs de ce relevé sont tous SUR UNE LIGNE, et la calibration le prouve sur le dépôt (bras positif et négatif).
CALIBRATION, deux bras (D286) : (1) un motif que l'on SAIT présent (`class DevLoggerWhatsAppSender` dans `dev-logger.whatsapp.ts`) est trouvé ; (2) un motif forgé, absent par construction, rend 0 ; (3) l'écart des fichiers de test
  est vérifié : un fichier de test connu est écarté, un fichier de production connu est gardé. Chaque compte s'imprime avec le NOMBRE DE FICHIERS qu'il a parcourus (D290).

DÉFAUTS DE CET INSTRUMENT, vus en lisant la sortie brute du premier lancement (D275) et réparés AVANT de s'en servir (le lancement final est celui dont la sortie est versée) :
  1. « le CHECK `commissions_rate_range` vit dans les migrations : 0 occurrence » — FAUX : le relevé ne parcourait que `.ts .tsx .prisma .json`, aucune migration `.sql`. Un ZÉRO sur zéro fichier parcouru (D290) ; la base, elle, porte le CHECK
     (`sondes.py`). Les extensions `.sql` et `.example` sont ajoutées, et le contrôle imprime désormais le nombre de fichiers lus.
  2. « écritures de `source` : 1 » — le motif ne voyait pas la forme ternaire de `quotes.service.ts:331` ; or c'est LA ligne qui dit d'où vient `source`. Motif élargi ; le second site est rendu.
  3. « variables d'environnement WhatsApp : 10 » — le motif `WHATSAPP_\\w+` comptait le JETON D'INJECTION `WHATSAPP_SENDER`. Remplacé par une lecture des seuls fichiers d'environnement, avec le bras positif imprimé.
  4. « `clientId` dans quotes.service.ts : 0 » — `grep(sous=…)` attend des DOSSIERS : un chemin de fichier ne correspondait à rien. Rendu 4 après réparation (lignes 329, 331, 471, 527).
  5. Un caractère de contrôle (retour arrière, 0x08) était entré dans le script par un correctif passé en heredoc (`\\b` interprété) : le motif ressemblait à l'attendu à l'écran et ne trouvait rien. Vu parce que l'outil d'édition ne retrouvait pas la
     chaîne qu'il affichait. Balayage ajouté : aucun caractère de contrôle (hors tabulation et fins de ligne) dans les trois scripts du lot — 0 relevé.
"""
import os
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.exists("pnpm-workspace.yaml"):
    sys.exit("à lancer depuis la racine du dépôt")

TESTS = re.compile(r"\.(test|spec|int-spec|e2e)\.(ts|tsx)$|/node_modules/|/dist/|/generated/|/\.next/")
EXT = (".ts", ".tsx", ".prisma", ".json", ".sql", ".example")


def suivis():
    return [f for f in subprocess.run(["git", "ls-files"], capture_output=True).stdout.decode("utf-8").split("\n") if f.endswith(EXT)]


FICHIERS = suivis()
PROD = [f for f in FICHIERS if not TESTS.search("/" + f)]
_cache = {}


def lire(f):
    if f not in _cache:
        with open(f, encoding="utf-8", errors="replace") as fh:
            _cache[f] = fh.read().replace("\r\n", "\n").split("\n")
    return _cache[f]


def grep(motif, sous=("apps", "packages"), prod=True, exclure_commentaires=True):
    """[(fichier, ligne n°, ligne)] des lignes qui contiennent `motif` (regex) ; les lignes dont le premier jeton est un commentaire (`//`, `*`, `/*`) sont écartées si demandé."""
    res = []
    pool = PROD if prod else FICHIERS
    pat = re.compile(motif)
    for f in pool:
        if not f.startswith(tuple(s + "/" for s in sous)):
            continue
        for i, l in enumerate(lire(f), 1):
            if pat.search(l):
                if exclure_commentaires and re.match(r"^\s*(//|\*|/\*)", l):
                    continue
                res.append((f, i, l.strip()))
    return res


def montre(res, max_=40):
    for f, i, l in res[:max_]:
        print(f"      {f}:{i}  {l[:150]}")
    if len(res) > max_:
        print(f"      … {len(res) - max_} de plus")


def titre(t):
    print(f"\n== {t}")


# ══ CALIBRATION ══════════════════════════════════════════════════════════════════════════════════════════════════════
print("== CALIBRATION — deux bras, abandon si un seul manque")
cal = []
for nom, ok in (
    ("bras 1 — un motif connu présent (`class DevLoggerWhatsAppSender`) est trouvé", len(grep(r"class \w*WhatsApp\w* ", sous=("apps",))) >= 1),
    ("bras 2 — un motif forgé, absent par construction, rend 0", len(grep(r"ZZZ_INTROUVABLE_D328_QQQ")) == 0),
    ("bras 3a — un fichier de test connu est ÉCARTÉ des relevés de production", "apps/api/src/common/whatsapp/dev-logger.whatsapp.spec.ts" in FICHIERS and "apps/api/src/common/whatsapp/dev-logger.whatsapp.spec.ts" not in PROD),
    ("bras 3b — un fichier de production connu est GARDÉ", "apps/api/src/common/whatsapp/dev-logger.whatsapp.ts" in PROD),
):
    cal.append(ok)
    print(f"   {'✓' if ok else '✗'} {nom}")
if not all(cal):
    sys.exit("CALIBRATION : un bras manque — l'instrument ne juge pas")
print(f"== calibration : {len(cal)} bras, 0 manqué")
print(f"== fichiers suivis lus : {len(FICHIERS)} · dont production (hors tests, node_modules, dist, generated) : {len(PROD)}")
sha = subprocess.run(["git", "rev-parse", "--short", "HEAD"], capture_output=True).stdout.decode().strip()
diff_code = [l for l in subprocess.run(["git", "diff", "--name-only", "ab8e6f6", "HEAD"], capture_output=True).stdout.decode().split("\n") if l.strip() and re.match(r"^(apps|packages|e2e|neutralisation)/", l)]
print(f"== provenance : HEAD {sha} ; fichiers de code (apps/ packages/ e2e/ neutralisation/) modifiés depuis la clôture de D327 (`ab8e6f6`) : {len(diff_code)} (attendu 0) {diff_code}")

# ══ 1. OÙ UN TÉLÉPHONE EST SAISI ═════════════════════════════════════════════════════════════════════════════════════
titre("1. OÙ UN TÉLÉPHONE EST SAISI AUJOURD'HUI (composant partagé `<PhoneField`)")
r = grep(r"<PhoneField\b", sous=("apps", "packages"))
print(f"   {len(r)} usage(s) de `<PhoneField` dans {len({f for f, _, _ in r})} fichier(s) de production :")
montre(r)
r2 = grep(r"type=\"tel\"", sous=("apps", "packages"))
print(f"   `type=\"tel\"` dans la production : {len(r2)} (attendu 1 : le champ partagé) → {[f'{f}:{i}' for f, i, _ in r2]}")

# ══ 2. COMMENT IL EST NORMALISÉ ══════════════════════════════════════════════════════════════════════════════════════
titre("2. COMMENT IL EST NORMALISÉ (contrat partagé), et OÙ le contrat l'exige")
r = [x for x in grep(r"dzPhoneSchema", sous=("packages", "apps")) if not x[0].endswith(".sql")]
print(f"   `dzPhoneSchema` : {len(r)} ligne(s) dans {len({f for f, _, _ in r})} fichier(s) :")
montre(r)
r = grep(r"normalizeDzPhone|normalizePhone\(", sous=("apps/api",))
print(f"   normalisation DANS un service de l'API (`normalizeDzPhone` / `normalizePhone(`) : {len(r)} ligne(s) — attendu 0 (la normalisation vit dans le contrat Zod, pas dans les services) : {r}")
r = grep(r"phone\b.*\.optional\(\)|phone2\b.*dzPhoneSchema", sous=("packages",))
print(f"   champs `phone` facultatifs dans les contrats : {len(r)} :")
montre(r)

# ══ 3. QUI ÉCRIT UN TÉLÉPHONE EN BASE ═════════════════════════════════════════════════════════════════════════════════
titre("3. QUI ÉCRIT UN TÉLÉPHONE EN BASE (services de l'API, production)")
r = grep(r"\b(phone2?|contactPhone)\s*[:=]|data\.(phone|phone2)\s*=", sous=("apps/api/src",))
r = [x for x in r if "select" not in x[2] and "true" not in x[2].split(":")[-1][:8]]
print(f"   {len(r)} ligne(s) d'écriture probable, dans {len({f for f, _, _ in r})} fichier(s) :")
montre(r)
r = grep(r"where:\s*\{[^}]*\bphone\b|\bphone:\s*\{ (equals|in)", sous=("apps/api/src",))
print(f"   RECHERCHE par téléphone (`where: {{ … phone … }}`) dans l'API : {len(r)} (attendu 0 — aucune route ne retrouve quelqu'un par son numéro) : {r}")
r = grep(r"input\.phone\s*\?\?\s*client\.phone", sous=("apps/api/src",))
print(f"   visite : le numéro de la VISITE retombe sur celui du COMPTE (`input.phone ?? client.phone`) : {len(r)} ligne(s) → {[f'{f}:{i}' for f, i, _ in r]}")
r = grep(r"if \(input\.phone !== undefined\) data\.phone = input\.phone", sous=("apps/api/src",))
print(f"   profil : le numéro du compte se modifie par `PATCH /me` SANS code de vérification : {len(r)} site(s) d'écriture directe → {[f'{f}:{i}' for f, i, _ in r]}")
r = grep(r"phoneVerif|phone_verif|verifiedPhone|otp|OtpCode", sous=("apps", "packages"), exclure_commentaires=True)
print(f"   vérification d'un numéro (`phoneVerif…`, `otp`) : {len(r)} ligne(s) — attendu 0 : {r[:5]}")

# ══ 4. LA COMMISSION ═════════════════════════════════════════════════════════════════════════════════════════════════
titre("4. LA COMMISSION : MODÈLE, ÉCRITURE")
r = grep(r"\bcommission\.(create|createMany|upsert|update|updateMany)\b|tx\.commission\b|prisma\.commission\b|this\.prisma\.commission\b", sous=("apps/api/src",))
print(f"   écritures du modèle `Commission` dans la production de l'API : {len(r)} — {r}")
r_pos = grep(r"commissionRateBps", sous=("apps/api/src",))
print(f"   (bras positif : `commissionRateBps` — le taux de la SALLE — apparaît {len(r_pos)} fois dans {len({f for f, _, _ in r_pos})} fichier(s) : le taux existe, la ligne `Commission` n'est écrite par personne)")
r = grep(r"cashbackClaim\.(create|update)|tx\.cashbackClaim|prisma\.cashbackClaim", sous=("apps/api/src",))
print(f"   écritures de `CashbackClaim` : {len(r)} (attendu 0 aussi : le flux de remboursement n'est pas écrit)")
r = grep(r"rate_bps >= 100|commissions_rate_range", sous=("apps/api",), prod=False)
print(f"   (le CHECK `commissions_rate_range` 100–500 pb vit dans les migrations : {len([x for x in r if 'migration' in x[0]])} occurrence(s) ; un taux de 0 n'est donc PAS représentable : « pas de commission » = pas de ligne)")

# ══ 5. L'ORIGINE D'UNE RÉSERVATION / D'UN DEVIS ═══════════════════════════════════════════════════════════════════════
titre("5. L'ORIGINE : CE QUI DIT QU'UNE DEMANDE VIENT DE ZWADJ")
r = grep(r"source:.*\"(CLIENT|WALK_IN)\"|BookingSource\.(CLIENT|WALK_IN)", sous=("apps/api/src",))
print(f"   écritures de `source` (CLIENT | WALK_IN) : {len(r)} ligne(s) dans {len({f for f, _, _ in r})} fichier(s) :")
montre(r)
r = grep(r"clientId === null \? \"WALK_IN\" : \"CLIENT\"", sous=("apps/api/src",))
print(f"   ⚠ `source` est DÉRIVÉE de `quote.clientId` (nul ⇒ WALK_IN, non nul ⇒ CLIENT) : {len(r)} site(s) → {[f'{f}:{i}' for f, i, _ in r]} — un devis rattaché à un compte devient `CLIENT` même si la relation est née chez le pro")
r = [x for x in grep(r"clientId", sous=("apps/api/src/venues",)) if x[0].endswith("/quotes.service.ts")]
print(f"   `clientId` dans quotes.service.ts : {len(r)} ligne(s) → {[i for _, i, _ in r]} — aucune ne vérifie le rôle du compte ni un lien avec la salle (seule la clé étrangère de la base garantit l'existence)")
r = grep(r"clientId:\s*(userId|input\.clientId|row\.clientId|null)", sous=("apps/api/src",))
print(f"   affectations de `clientId` dans la production de l'API : {len(r)} :")
montre(r, 20)
r = grep(r"create\(userId: string, slug: string", sous=("apps/api/src",))
print(f"   `POST /venues/:slug/bookings` (la demande venue du client, Zwadj) exige un utilisateur connecté : {len(r)} signature(s) `create(userId: string, slug…` → {[f'{f}:{i}' for f, i, _ in r]}")

# ══ 6. LES NOMS ═════════════════════════════════════════════════════════════════════════════════════════════════════
titre("6. LES NOMS")
r = grep(r"PERSON_NAME_PATTERN", sous=("packages", "apps"))
print(f"   `PERSON_NAME_PATTERN` : {len(r)} ligne(s) dans {len({f for f, _, _ in r})} fichier(s) :")
montre(r, 12)
r = grep(r"contactFirstName|contactLastName", sous=("packages/types",))
print(f"   contrats portant un nom de contact : {len(r)} ligne(s) → {sorted({f for f, _, _ in r})}")
r = grep(r"firstName|lastName", sous=("packages/types/src",))
print(f"   contrats portant `firstName` / `lastName` (comptes) : {len(r)} ligne(s) → {sorted({f for f, _, _ in r})}")
r = grep(r"\bnameFr\b|\bnameAr\b", sous=("packages/types/src",))
print(f"   précédent d'une PAIRE FR/AR dans les contrats : `nameFr`/`nameAr` : {len(r)} ligne(s) → {sorted({f for f, _, _ in r})}")
r = grep(r"slotNameFr|slotNameAr", sous=("apps/api/src",))
print(f"   précédent d'une COPIE (snapshot) d'un nom sur une réservation : `slotNameFr/Ar` écrits dans {len({f for f, _, _ in r})} fichier(s)")

# ══ 7. WHATSAPP, E-MAIL, JOBS, LIMITES ═══════════════════════════════════════════════════════════════════════════════
titre("7. LES PORTS ET L'INFRASTRUCTURE DONT DÉPENDENT LA VÉRIFICATION ET LA FUSION")
r = grep(r"implements WhatsAppSender", sous=("apps/api/src",))
print(f"   adaptateurs du port WhatsApp : {len(r)} → {[f'{f}:{i}' for f, i, _ in r]} (attendu 1 : le logueur de développement)")
fichiers_env = [f for f in PROD if f.endswith(("/env.ts", ".env.example"))]
r = [(f, i, l) for f in fichiers_env for i, l in enumerate(lire(f), 1) if "WHATSAPP" in l.upper()]
print(f"   variables d'environnement WhatsApp : {len(r)} ligne(s) dans {len(fichiers_env)} fichier(s) d'environnement parcouru(s) {fichiers_env} (attendu 0 : aucun fournisseur réel, D63) {r}")
r_jeton = grep(r"WHATSAPP_SENDER", sous=("apps/api/src",))
print(f"   (bras positif : le jeton d'injection `WHATSAPP_SENDER` n'est PAS une variable d'environnement et apparaît {len(r_jeton)} fois — c'est ce qu'un motif trop large comptait)")
r = grep(r"class EmailVerificationToken|model EmailVerificationToken|emailVerificationToken\.(create|update)", sous=("apps/api",), prod=True)
print(f"   jetons de vérification d'e-mail (modèle + écritures) : {len(r)} → {sorted({f for f, _, _ in r})}")
r = grep(r"from \"pg-boss\"|new PgBoss|PgBoss\(", sous=("apps/api/src",))
print(f"   pg-boss importé ou instancié dans la production de l'API : {len(r)} ligne(s) (attendu 0) · dépendance déclarée dans `apps/api/package.json` : {len(grep(r'\"pg-boss\"', sous=('apps/api',), prod=True))} (attendu 0 : AGENTS.md le prescrit, le dépôt ne l'a pas encore)")
r = grep(r"export const (AUTH_THROTTLE|DEFAULT_THROTTLE|\w*THROTTLE\w*)", sous=("apps/api/src",))
print(f"   limiteurs nommés : {len(r)} → {[l[:90] for _, _, l in r[:8]]}")

# ══ 8. SUPPRESSION D'UN COMPTE ═══════════════════════════════════════════════════════════════════════════════════════
titre("8. CE QUE LA SUPPRESSION D'UN COMPTE FAIT AUX COORDONNÉES COPIÉES (D37)")
svc = "apps/api/src/account/account-deletion.service.ts"
lignes_ = [l for l in lire(svc) if not re.match(r"^\s*(//|\*|/\*)", l)]
touche_bookings = [l.strip() for l in lignes_ if re.search(r"\bbooking\b|tx\.booking|contactPhone|contactFirstName|contactEmail|visitBooking|quote\b", l)]
print(f"   {svc} : {len(lignes_)} ligne(s) de code parcourue(s) · lignes touchant une réservation, un contact copié, une visite ou un devis : {len(touche_bookings)} (attendu 0 si l'anonymisation ne les traite pas) {touche_bookings[:4]}")
ano = [l.strip() for l in lignes_ if re.search(r"phone:\s*null|phone:\s*\"\"|firstName:\s*null|lastName:\s*null", l)]
print(f"   champs de coordonnées effacés (compte + profil pro) : {len(ano)} → {ano}")

# ══ 9. SEMIS ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
titre("9. LE SEMIS DE DÉMONSTRATION")
r = grep(r"\+213\d{9}|phone:", sous=("apps/api/prisma",), prod=True)
print(f"   numéros / champs `phone:` du semis : {len(r)} ligne(s) → {sorted({f for f, _, _ in r})}")

# ══ 10. COÛT RELEVÉ PAR LOT PRESSENTI (comptes de fichiers qui TOUCHENT l'objet — pas une estimation de durée) ═══════════
titre("10. COÛT RELEVÉ DES LOTS PRESSENTIS : fichiers de production, de test, e2e, harnais qui nomment l'objet")


def cout(nom, symboles, harnais_chemins):
    motif = re.compile("|".join(symboles))
    prod = sorted(f for f in PROD if f.startswith(("apps/", "packages/")) and any(motif.search(l) for l in lire(f)))
    tests = sorted(f for f in FICHIERS if TESTS.search("/" + f) and re.search(r"\.(test|spec|int-spec)\.(ts|tsx)$", f) and f.startswith(("apps/", "packages/")) and any(motif.search(l) for l in lire(f)))
    e2e = sorted(f for f in FICHIERS if f.startswith("e2e/specs/") and any(motif.search(l) for l in lire(f)))
    harn = sorted(f for f in subprocess.run(["git", "ls-files", "neutralisation"], capture_output=True).stdout.decode().split("\n") if re.search(r"neutralize-[\w-]+\.py$", f) and any(h in "\n".join(lire_py(f)) for h in harnais_chemins))
    print(f"   {nom} : {len(prod)} fichier(s) de production · {len(tests)} fichier(s) de test · {len(e2e)} spec(s) e2e · {len(harn)} harnais de neutralisation citant ses fichiers")
    for f in prod:
        print(f"      prod  {f}")
    if e2e:
        print(f"      e2e   {', '.join(e2e)}")
    if harn:
        print(f"      harn  {', '.join(h.split('/')[-1] for h in harn)}")
    return prod


def lire_py(f):
    with open(f, encoding="utf-8", errors="replace") as fh:
        return fh.read().replace("\r\n", "\n").split("\n")


# calibration : un symbole connu rend au moins trois fichiers de production (`quoteDocumentFilename`), un symbole forgé zéro
cal_cout = len(grep(r"quoteDocumentFilename")) >= 3 and len(grep(r"ZZZ_INTROUVABLE_D328_QQQ")) == 0
print(f"   calibration du compteur de coût : {'✓' if cal_cout else '✗'} (symbole connu ≥ 3 fichiers ; symbole forgé 0)")
if not cal_cout:
    sys.exit("CALIBRATION : le compteur de coût ne juge pas")
cout("LC-A numérotation + référence + nom de fichier", [r"quoteReference", r"quoteDocumentFilename", r"creerTeteDeChaine", r"creerRevision", r"QuoteDTO\b"], ["quote-document.ts", "quote-store.prisma.ts", "walkin-journey.tsx", "quotes.service.ts"])
cout("LC-B tableau du PDF + boîte de langue", [r"quoteDocument", r"\bsaveBlob\b", r"document\?locale", r"QuoteDocumentRecord"], ["quote-document.ts", "walkin-journey.tsx", "remittance.ts"])
cout("LC-C fiche client + nom sur le devis (contacts copiés aujourd'hui)", [r"contactFirstName", r"contactLastName", r"contactEmail", r"contact_first_name"], ["walkin-journey.tsx", "quotes.service.ts", "quote-store.prisma.ts", "bookings.service.ts"])
cout("LC-D vérification du téléphone du compte (écrit/lu aujourd'hui sans code)", [r"data\.phone\s*=", r"input\.phone", r"AuthUserDTO", r"\bphone2?:\s*dzPhoneSchema"], ["auth.service.ts", "account.service.ts"])
cout("LC-G « Ma salle » (liste des salles du fournisseur)", [r"useProVenues", r"ProVenuesProvider", r"pro-venues-context"], ["create-venue-page.tsx", "edit-venue-page.tsx", "venue-list-page.tsx", "pro-venues-context.tsx"])
