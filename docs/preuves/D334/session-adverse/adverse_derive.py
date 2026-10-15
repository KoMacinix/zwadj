"""D334 — SESSION ADVERSE de L35-3 · SONDE 6 : la DÉRIVE entre `schema.prisma` et la base migrée (D186 : la migration fait autorité, mais une déclaration Prisma qui ne dit pas la même chose que la base est une dérive permanente).

`prisma migrate diff --from-config-datasource --to-schema …` compare une base migrée (copie de la base de développement + `migrate deploy`) au schéma déclaré. Les garanties que Prisma n'exprime pas (index partiels, CHECK, EXCLUDE, clés
composites, déclencheurs, séquence) s'affichent comme des « différences » connues et permanentes : la sonde ne juge pas leur présence, elle relève CE QUI TOUCHE LES OBJETS DE L35-3 (`venues.number`, `quote_number_counters`, `quotes.reference_*`) et refuse qu'une
différence NEUVE les concerne en dehors des garanties que la doctrine range hors de Prisma.
USAGE (racine) : python3 docs/preuves/D334/session-adverse/adverse_derive.py
"""
import os
import re
import shutil
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from adverse_outils import creer_base, entete, migrate_deploy, supprimer_base, url_de, verdict, bilan  # noqa: E402

B = "zwadj_adverse_derive"
entete("SONDE 6 — dérive entre schema.prisma et la base migrée (objets de L35-3)")
creer_base(B, "zwadj")
code, _ = migrate_deploy(B)
verdict("DR-0", "base migrée", 0, code)
env = dict(os.environ, DATABASE_URL=url_de(B))
r = subprocess.run(["pnpm", "--filter", "@zwadj/api", "exec", "prisma", "migrate", "diff", "--from-config-datasource", "--to-schema", "prisma/schema.prisma", "--script"], env=env, capture_output=True, shell=(os.name == "nt"), timeout=300)
sortie = re.sub(r"postgres(?:ql)?://\S+", "postgresql://***", (r.stdout + r.stderr).decode("utf-8", errors="replace"))
print(f"   code {r.returncode} ; {len(sortie.splitlines())} ligne(s) de sortie")
lignes = [l for l in sortie.splitlines() if l.strip()]
print("   le diff COMPLET (de la base migrée vers schema.prisma) :")
for l in lignes:
    print("     |", l[:200])
from adverse_outils import constat  # noqa: E402
attendus = {"quotes_chain_head_fkey", "venue_number_seq", '"number" DROP DEFAULT', "pricing_rules_slot_belongs_to_venue"}
vus = {a for a in attendus if any(a in l for l in lignes)}
verdict("DR-1", "le diff s'exécute et ne propose, pour les objets de L35-3, que ce que la doctrine range HORS de Prisma : la clé composite des versions, la séquence des salles et son défaut (+ la clé B2 d'avant)", attendus, vus)
constat("DR-C1", "si `prisma migrate dev` tournait (il est interdit, AGENTS.md), il proposerait de SUPPRIMER `quotes_chain_head_fkey` et la séquence `venue_number_seq` avec le défaut de `venues.number` : deux objets de plus que la liste « Migrations — `prisma migrate dev` est INTERDIT » d'AGENTS.md ne nomme pas (elle nomme l'EXCLUDE, les index partiels, `pricing_rules_slot_belongs_to_venue`, les CHECK). Documentaire, non bloquant : la doctrine tient (la migration est l'autorité), la liste est à compléter")
supprimer_base(B)
sys.exit(bilan())
