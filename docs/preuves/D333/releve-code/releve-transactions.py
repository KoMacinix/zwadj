"""D333 — le RELEVÉ du code actuel pour le cadrage de L35-3 (décision 1 du relecteur, (a)) : les transactions de création et de révision d'un devis, les verrous qu'elles prennent, ceux de l'acceptation
d'une réservation et de la création d'un blocage, les contraintes de base que ces écritures traversent, et les appelants à changer.

POURQUOI IL EXISTE. La décision 1 exige un cadrage « sur le code réel » AVANT la première ligne de code, avec une règle d'arrêt : si le relevé contredit une règle de R3, ou montre un mode de défaillance que le
cadrage ne sait pas garder, la session s'arrête sans coder. Un relevé écrit de mémoire (« la création ne prend aucun verrou ») est l'affirmation que cet instrument remplace par une lecture : chaque fait imprimé
est suivi du fichier et de la ligne d'où il vient.

USAGE, depuis la racine (bash, jamais une redirection PowerShell — D298) :
  python3 docs/preuves/D333/releve-code/releve-transactions.py > docs/preuves/D333/releve-code/releve-transactions-sortie.txt

LECTURE SEULE. Tout se lit par `git show HEAD:<chemin>` — l'état COMMITÉ, jamais l'arbre de travail. Aucune base n'est ouverte, aucune porte rejouée.

INSTRUMENTS ÉCARTÉS : un `grep FOR UPDATE` sur tout le dépôt (il rend des lignes de commentaires et de tests : D275) ; l'analyse de `pg_locks` d'une base vivante (elle mesure ce que fait un test, pas ce que le code PREND : c'est le rôle du
test de concurrence du lot). Ici : le corps de chaque méthode est extrait par son indentation, puis les lignes qui portent un jeton d'écriture ou de verrou sont listées dans l'ordre du texte.

CALIBRATION, deux bras par extracteur (D286), abandon si un seul manque : (1) le corps de `acceptUnderVenueLock` porte `FOR UPDATE` à la ligne 76 du fichier (fait relevé par grep avant l'écriture de cet instrument) et celui de
`creerTeteDeChaine` n'en porte pas ; (2) le détecteur de clé étrangère trouve `quotes.venue_id → venues` et ne trouve pas `quotes.chain_id → quotes`.
"""
import os
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.exists("pnpm-workspace.yaml"):
    sys.exit("à lancer depuis la racine du dépôt")


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, check=True).stdout.decode("utf-8", errors="replace").replace("\r\n", "\n")


def show(chemin):
    return git("show", f"HEAD:{chemin}")


JETONS = re.compile(r"\$transaction|FOR UPDATE|FOR SHARE|\.create\(|\.createMany\(|\.update\(|\.updateMany\(|\.upsert\(|\.delete\(|\.aggregate\(|\.findUniqueOrThrow\(|\.findFirst\(|\.findMany\(|\$queryRaw|verrouillerChaine\(|checkAndSet\(")


def corps(texte, nom):
    """Les lignes (numéro, texte) du corps de la méthode `nom` : de sa déclaration à la prochaine déclaration de même indentation. Retourne None si absente."""
    lignes = texte.split("\n")
    debut = None
    for i, l in enumerate(lignes):
        if re.match(rf"\s*(?:private |public |async |static )*(?:async )?{re.escape(nom)}\s*[<(]", l) and l.rstrip().endswith("{") or re.match(rf"\s*(?:private |public |async |static )*(?:async )?{re.escape(nom)}\s*\($", l):
            debut = i
            break
    if debut is None:
        return None
    indent = len(lignes[debut]) - len(lignes[debut].lstrip())
    out = []
    for j in range(debut, len(lignes)):
        out.append((j + 1, lignes[j]))
        if j > debut and lignes[j].rstrip() == " " * indent + "}":
            break
    return out


def jetons(corps_lignes):
    return [(n, " + ".join(m.group(0) for m in JETONS.finditer(l)), l.strip()) for n, l in corps_lignes if JETONS.search(l) and not l.strip().startswith(("//", "*", "/*"))]


def fk(sql, table, colonne, cible):
    """Vrai si le SQL contient une clé étrangère de `table.colonne` vers `cible` (ADD CONSTRAINT … FOREIGN KEY ("colonne") REFERENCES "cible", ou dans le CREATE TABLE)."""
    motif = rf'FOREIGN KEY \("{colonne}"\) REFERENCES "{cible}"'
    return re.search(motif, sql) is not None


RE_NUMBER = re.compile(r"^\s+number\s", re.M)
RE_REFERENCE = re.compile(r"reference_|referenceYear|referenceNumber")

# ───────────────────────────── calibration ─────────────────────────────
print("== CALIBRATION (deux bras par extracteur, abandon si un seul manque)")
src_locks = show("apps/api/src/venues/booking-locks.prisma.ts")
src_store = show("apps/api/src/venues/quote-store.prisma.ts")
b_accept = corps(src_locks, "acceptUnderVenueLock")
b_tete = corps(src_store, "creerTeteDeChaine")
manques = 0
ok1 = b_accept is not None and any(n == 76 and "FOR UPDATE" in t for n, t, _ in jetons(b_accept))
ok2 = b_tete is not None and not any("FOR UPDATE" in t for _, t, _ in jetons(b_tete))
ok3 = any(fk(show(f"apps/api/prisma/migrations/{d}/migration.sql"), "quotes", "venue_id", "venues") for d in ("20260707000000_init",))
tous_sql = "\n".join(show(f"apps/api/prisma/migrations/{d}/migration.sql") for d in git("ls-tree", "--name-only", "HEAD", "apps/api/prisma/migrations/").replace("apps/api/prisma/migrations/", "").split("\n") if d and d != "migration_lock.toml")
ok4 = not fk(tous_sql, "quotes", "chain_id", "quotes")
ok5 = RE_REFERENCE.search("  referenceYear Int @map(\"reference_year\")") is not None and RE_NUMBER.search("  number Int") is not None
ok6 = RE_REFERENCE.search("  venue Venue @relation(fields: [venueId], references: [id])") is None and RE_NUMBER.search("  numberOfThings Int") is None
for libelle, ok in (("FOR UPDATE de l'acceptation à la ligne 76 (positif)", ok1), ("aucun FOR UPDATE dans la création d'une tête de chaîne (négatif)", ok2),
                    ("la clé étrangère quotes.venue_id → venues est trouvée (positif)", ok3), ("aucune clé étrangère quotes.chain_id → quotes n'est trouvée (négatif)", ok4),
                    ("les motifs `number` et `reference_*` se reconnaissent dans une déclaration (positif)", ok5), ("…et ne se confondent pas avec `references: [id]` ni `numberOfThings` (négatif)", ok6)):
    print(f"   {'✓' if ok else '✗'} calibration {libelle}")
    manques += 0 if ok else 1
print(f"   calibration : 6 bras, {manques} manqué(s)")
if manques:
    sys.exit("ABANDON : un bras de calibration a manqué — l'instrument ne se croit pas")

# ───────────────────────────── 1. les transactions du devis ─────────────────────────────
print("\n== 1. LES TRANSACTIONS DU DEVIS — apps/api/src/venues/quote-store.prisma.ts (état commité)")
for nom in ("verrouillerChaine", "checkAndSet", "creerTeteDeChaine", "creerRevision", "convertirEnDemande"):
    c = corps(src_store, nom)
    print(f"\n[{nom}] lignes {c[0][0]}–{c[-1][0]}")
    for n, t, l in jetons(c):
        print(f"   quote-store.prisma.ts:{n:<4} {t:<22} {l[:130]}")
print("\n   ⇒ appelants de production de `creerTeteDeChaine` / `creerRevision` (apps/api/src, hors specs) :")
for motif in ("creerTeteDeChaine", "creerRevision"):
    sortie = git("grep", "-n", motif, "HEAD", "--", "apps/api/src").split("\n")
    prod = [l for l in sortie if l and ".spec." not in l and "quote-store" not in l]
    for l in prod:
        print(f"      {l.split(':', 1)[1][:150]}")
    print(f"      → {motif} : {len(prod)} appelant(s) de production (attendu 1)")

# ───────────────────────────── 2. les verrous des autres transactions ─────────────────────────────
print("\n== 2. LES VERROUS QUE LE LOT NE DOIT PAS CROISER")
for fichier, nom in (("apps/api/src/venues/booking-locks.prisma.ts", "acceptUnderVenueLock"), ("apps/api/src/venues/availability-blocks.service.ts", "create")):
    t = show(fichier)
    c = corps(t, nom)
    print(f"\n[{fichier.rsplit('/', 1)[-1]} · {nom}] lignes {c[0][0]}–{c[-1][0]}")
    for n, tok, l in jetons(c):
        print(f"   {fichier.rsplit('/', 1)[-1]}:{n:<4} {tok:<22} {l[:130]}")
print("\n   ⇒ toutes les lignes de `apps/api/src` (hors specs) qui prennent un verrou de ligne (`FOR UPDATE`, `FOR SHARE`) :")
for l in git("grep", "-n", "-E", "FOR UPDATE|FOR SHARE", "HEAD", "--", "apps/api/src").split("\n"):
    if l and ".spec." not in l:
        _sha, chemin, no, texte = l.split(":", 3)
        if not texte.strip().startswith(("//", "*", "/*")) and "$queryRaw" in texte:
            print(f"      {chemin}:{no} {texte.strip()[:120]}")

# ───────────────────────────── 3. les contraintes que ces écritures traversent ─────────────────────────────
print("\n== 3. LES CONTRAINTES DE BASE (migrations, état commité — la migration est l'autorité, D186)")
migs = sorted(d for d in git("ls-tree", "--name-only", "HEAD", "apps/api/prisma/migrations/").replace("apps/api/prisma/migrations/", "").split("\n") if d and d != "migration_lock.toml")
print(f"   {len(migs)} migrations parcourues ; la dernière : {migs[-1]}")
for table, col, cible in (("quotes", "venue_id", "venues"), ("quotes", "chain_id", "quotes"), ("quotes", "parent_quote_id", "quotes"), ("bookings", "quote_id", "quotes"), ("bookings", "venue_id", "venues")):
    trouve = [d for d in migs if fk(show(f"apps/api/prisma/migrations/{d}/migration.sql"), table, col, cible)]
    print(f"   clé étrangère {table}.{col} → {cible} : {'OUI, posée par ' + trouve[0] if trouve else 'AUCUNE'}")
for motif in (r'CREATE UNIQUE INDEX "quotes_[a-z_]+" ON "quotes"\([^)]*\)[^;]*', r'ALTER TABLE "quotes" ADD CONSTRAINT "[a-z_]+"[^;]*'):
    for d in migs:
        for m in re.finditer(motif, show(f"apps/api/prisma/migrations/{d}/migration.sql")):
            print(f"   {d}: {m.group(0)[:150]}")
sch = show("apps/api/prisma/schema.prisma")
bloc = lambda nom: re.search(rf"^model {nom} \{{.*?^\}}", sch, re.S | re.M).group(0)
print(f"   colonne `number` dans le modèle Venue : {'OUI' if RE_NUMBER.search(bloc('Venue')) else 'NON'} ; colonnes `reference_*` dans le modèle Quote : {'OUI' if RE_REFERENCE.search(bloc('Quote')) else 'NON'}")
print(f"   `created_at` dans le modèle Venue (l'ordre de la numérotation des salles existantes) : {'OUI' if re.search(r'created_at', bloc('Venue')) else 'NON'}")
print(f"   modèle de compteurs dans schema.prisma : {'OUI' if re.search(r'^model QuoteNumberCounter', sch, re.M) else 'NON'}")

# ───────────────────────────── 4. ce qui crée une salle, ce qui lit la référence ─────────────────────────────
print("\n== 4. LES SITES À CHANGER")
print("   création d'une salle en production (apps/api/src, hors specs) :")
for l in git("grep", "-n", "-E", r"venue\.create\(", "HEAD", "--", "apps/api/src").split("\n"):
    if l and ".spec." not in l:
        print(f"      {l.split(':', 1)[1][:150]}")
print("   la référence imprimée et le nom de fichier du PDF (production, tous paquets) :")
for motif in (r"quoteReference\(", r"quoteDocumentFilename\(", r"slice\(0, ?8\)"):
    n = 0
    for l in git("grep", "-n", "-E", motif, "HEAD", "--", "apps", "packages", "e2e").split("\n"):
        if l and ".spec." not in l and ".test." not in l and ".e2e." not in l and ".int-spec." not in l and "/generated/" not in l:
            chemin = l.split(":", 2)[1] + ":" + l.split(":", 3)[2]
            if "harness.ts" in chemin or "client-doubles" in chemin:
                continue
            n += 1
            print(f"      [{motif}] {chemin} {l.split(':', 3)[3].strip()[:100]}")
    print(f"      → {motif} : {n} site(s) de production")
print("\n== FIN DU RELEVÉ (aucune base ouverte, aucune porte rejouée)")
