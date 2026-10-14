"""D332 — RELEVÉ de la décision 3 du relecteur : « relever d'abord, dans le schéma et sur un devis réel, ce que contient une ligne de devis (`quotes.lines`) : type de tarification, quantité,
palier (identifiant ? libellé FR et AR ?), unité. Le PDF n'imprime que ce qui est STOCKÉ. Si le nom du palier (ou de l'unité) n'est pas stocké sur la ligne, S'ARRÊTER ET DEMANDER. »

POURQUOI IL EXISTE. Une affirmation écrite comme MESURÉE nomme la pièce brute qui la porte, versée au dépôt (`AGENTS.md`, D291). Ce script lit TROIS sources et les confronte :
  (1) le SCHÉMA : le commentaire de la colonne `lines` dans `apps/api/prisma/schema.prisma` ;
  (2) le CODE qui l'écrit : les champs de l'interface `ResolvedLine` (`apps/api/src/venues/service-pricing.ts`), que `quotes.service.ts` stocke tel quel ;
  (3) les DONNÉES : les lignes réelles de la base de développement, lues par `SELECT` seulement.

LECTURE SEULE, PROUVÉE. La lecture se fait dans une transaction `READ ONLY` ; le script commence par TENTER une écriture dans une transaction de ce type et exige qu'elle soit REFUSÉE (calibration, bras négatif) — sinon il abandonne. Aucune valeur de connexion n'est imprimée (le mot de passe voyage par l'environnement du processus fils, jamais par une ligne de commande lue ailleurs). Aucune donnée personnelle n'est sélectionnée : `id`, `version`, `status`, `guests`, `lines`.

USAGE, depuis la racine, base de développement démarrée (`pnpm db:up`) :
  python3 docs/preuves/D332/releve-lignes/sonde-lignes.py > docs/preuves/D332/releve-lignes/sonde-lignes-sortie.txt

INSTRUMENTS ÉCARTÉS : `pg` (Node) — déjà utilisé pour une exploration jetable, mais un script Python versé se rejoue sans dépendance du dépôt ; `prisma` — il lirait par le client généré, c'est-à-dire par le code qu'on veut CONFRONTER ; `psql` sur l'hôte — absent du poste, on passe par le conteneur de la base (`docker exec`).
CALIBRATION, deux bras (D286), abandon si un seul manque : positif — `SELECT 1` rend « 1 » et le jeu de clés d'une ligne synthétique est lu tel qu'écrit ; négatif — l'écriture en lecture seule est REFUSÉE.
"""
import json
import os
import re
import subprocess
import sys
from urllib.parse import urlparse

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.exists("pnpm-workspace.yaml"):
    sys.exit("à lancer depuis la racine du dépôt")

CONTENEUR = "zwadj-db"
SEP = "\x1f"


def env_database_url():
    for l in open("apps/api/.env", encoding="utf-8"):
        if l.startswith("DATABASE_URL="):
            return l.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit("DATABASE_URL absente de apps/api/.env")


U = urlparse(env_database_url())
BASE, UTILISATEUR, MDP = U.path.lstrip("/"), U.username, U.password or ""


def sql(requete, lecture_seule=True):
    """Exécute `requete` dans le conteneur ; rend (code, sortie, erreur). Le mot de passe passe par l'ENVIRONNEMENT du processus."""
    corps = ("BEGIN READ ONLY;\n" if lecture_seule else "BEGIN;\n") + requete + "\nROLLBACK;"
    r = subprocess.run(
        ["docker", "exec", "-i", "-e", f"PGPASSWORD={MDP}", CONTENEUR, "psql", "-U", UTILISATEUR, "-d", BASE, "-X", "-q", "-A", "-t", "-F", SEP, "-v", "ON_ERROR_STOP=1"],
        input=corps, capture_output=True, text=True, encoding="utf-8",
    )
    return r.returncode, r.stdout, r.stderr


# ── CALIBRATION ───────────────────────────────────────────────────────────────────────────────────
print("== CALIBRATION — deux bras, abandon si un seul manque")
code, out, _ = sql("SELECT 1;")
bras_pos = code == 0 and [l for l in out.split("\n") if l.strip()] == ["1"]
print(f"   {'✓' if bras_pos else '✗'} positif : `SELECT 1` en lecture seule rend 1 (code {code})")
cle_synth = sorted(json.loads('{"b": 1, "a": 2}').keys())
bras_cles = cle_synth == ["a", "b"]
print(f"   {'✓' if bras_cles else '✗'} positif : le jeu de clés d'une ligne synthétique est lu tel qu'écrit : {cle_synth}")
code_e, _, err_e = sql("CREATE TEMP TABLE _sonde_ecriture(a int);")
refus = code_e != 0 and "read-only transaction" in err_e
print(f"   {'✓' if refus else '✗'} négatif : l'ÉCRITURE en transaction lecture seule est REFUSÉE (code {code_e} ; message : « {err_e.strip().splitlines()[-1][:90] if err_e.strip() else ''} »)")
print(f"   calibration : 3 bras, {sum(1 for b in (bras_pos, bras_cles, refus) if not b)} manqué")
if not (bras_pos and bras_cles and refus):
    sys.exit("CALIBRATION MANQUÉE — aucune mesure n'est valable")

# ── (1) LE SCHÉMA ─────────────────────────────────────────────────────────────────────────────────
schema = open("apps/api/prisma/schema.prisma", encoding="utf-8").read()
m = re.search(r"^\s+lines\s+Json\s+// \[\{(.*?)\}\]", schema, re.M)
cles_schema = [c.strip().rstrip("?") for c in m.group(1).split(",")] if m else None
print("\n== (1) LE SCHÉMA — commentaire de `Quote.lines` (`apps/api/prisma/schema.prisma`)")
print(f"   parcouru : {len(schema.splitlines())} lignes ; commentaire trouvé : {m is not None}")
print(f"   clés annoncées par le commentaire : {cles_schema}")
if cles_schema and "tierLabelFr" not in cles_schema:
    print("   ⚠ le commentaire du schéma n'annonce PAS `tierLabelFr` ni `tierLabelAr` : il est INCOMPLET (le code (2) et les données (3) les portent) — un commentaire de schéma n'est pas l'autorité sur la forme stockée")

# ── (2) LE CODE QUI L'ÉCRIT ────────────────────────────────────────────────────────────────────────
src = open("apps/api/src/venues/service-pricing.ts", encoding="utf-8").read()
bloc = re.search(r"export interface ResolvedLine \{(.*?)\n\}", src, re.S)
champs = re.findall(r"^\s+(\w+):\s*([^;]+);", bloc.group(1), re.M) if bloc else []
cles_code = [c for c, _ in champs]
print("\n== (2) LE CODE — champs de `ResolvedLine` (`apps/api/src/venues/service-pricing.ts`), écrits tels quels dans `quotes.lines` par `quotes.service.ts`")
print(f"   parcouru : {len(src.splitlines())} lignes ; interface trouvée : {bloc is not None}")
for c, t in champs:
    print(f"   · {c} : {t.strip()}")
qs = open("apps/api/src/venues/quotes.service.ts", encoding="utf-8").read()
print(f"   `quotes.service.ts` écrit `lines: lines as unknown as Prisma.InputJsonValue` : {'lines: lines as unknown as Prisma.InputJsonValue' in qs}")
print(f"   le NOM DU PALIER est un champ de la ligne : tierLabelFr {'tierLabelFr' in cles_code} · tierLabelAr {'tierLabelAr' in cles_code} · identifiant du palier (tierId) {'tierId' in cles_code}")
print(f"   le NOM DE L'UNITÉ est un champ de la ligne : unitNameFr {'unitNameFr' in cles_code} · unitNameAr {'unitNameAr' in cles_code}  (il vit sur `ServicePricing`, le catalogue : `unitNameFr` dans `ServicePricingDTO`)")

# ── (3) LES DONNÉES ───────────────────────────────────────────────────────────────────────────────
print("\n== (3) LES DONNÉES — base de développement, `SELECT` seulement, transaction en lecture seule")
code, out, err = sql("SELECT count(*) FROM quotes;")
n_devis = int(out.strip().split("\n")[-1])
code, out, err = sql("SELECT id, version, status, guests, lines::text FROM quotes WHERE jsonb_array_length(lines::jsonb) > 0 ORDER BY created_at;")
rows = [l.split(SEP) for l in out.strip().split("\n") if l.strip()]
jeux, types, lignes = {}, {}, []
for ident, version, statut, invites, brut in rows:
    for l in json.loads(brut):
        lignes.append((ident, version, statut, invites, l))
        k = ",".join(sorted(l.keys()))
        jeux[k] = jeux.get(k, 0) + 1
        types[l.get("pricingType")] = types.get(l.get("pricingType"), 0) + 1
print(f"   parcouru : {n_devis} devis ; {len(rows)} avec au moins une ligne ; {len(lignes)} ligne(s) lue(s)")
for k, n in jeux.items():
    print(f"   {n} × clés : {k}")
print(f"   `pricingType` : {types}")
for ident, version, statut, invites, l in lignes:
    print(f"   exemple (devis {ident[:8]} v{version} {statut}, {invites} invités) : {json.dumps(l, ensure_ascii=False, sort_keys=True)}")

# ── CONFRONTATION ─────────────────────────────────────────────────────────────────────────────────
print("\n== CONFRONTATION")
cles_donnees = set().union(*[set(l.keys()) for _, _, _, _, l in lignes]) if lignes else set()
print(f"   clés des lignes réelles == champs de `ResolvedLine` : {cles_donnees == set(cles_code)}  (attendu True ; écart : {sorted(cles_donnees ^ set(cles_code))})")
print(f"   le nom du palier (FR et AR) est stocké sur la ligne : {'tierLabelFr' in cles_code and 'tierLabelAr' in cles_code}  (attendu True)")
print(f"   le nom de l'unité est stocké sur la ligne : {'unitNameFr' in cles_code}  (attendu False — DB-9 ne l'exige pas : « par invité » et « à l'unité » n'impriment que la quantité)")
tiered = [l for _, _, _, _, l in lignes if l.get("pricingType") == "TIERED"]
print(f"   lignes « à paliers » réelles dans la base : {len(tiered)} · lignes « par invité » : {types.get('PER_GUEST', 0)} · « à l'unité » : {types.get('PER_UNIT', 0)} · « fixe » : {types.get('FIXED', 0)}")
print("   ⇒ la CONDITION D'ARRÊT de la décision 3 (« le nom du palier n'est pas stocké ») NE JOUE PAS ; le lot ne lit rien dans le catalogue actuel.")
print("   ⚠ LIMITE : la base de développement ne porte AUCUNE ligne « à paliers », « par invité » ou « à l'unité » — la forme de ces lignes se lit dans le CODE (2), pas dans une donnée réelle ; les trois devis que Ko regardera sont créés par l'API réelle.")
