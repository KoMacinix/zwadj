"""D334 — SESSION ADVERSE de L35-3 : OUTILLAGE COMMUN des sondes SQL (écrit par la session adverse, à froid ; pièce versée, jamais promue en instrument — S-16/S-30).

POURQUOI IL EXISTE. La session adverse ne reprend aucun outil de la session qui a écrit L35-3 (`neutralize-r39.py`, les tests de `quote-numbering.int-spec.ts`). Elle parle à PostgreSQL 18.4 par
`docker exec -i zwadj-db psql` — des connexions SÉPARÉES, des processus séparés — et jamais par le client Prisma généré (D186 : la garde est celle de la base). Aucune donnée de la base de
développement `zwadj` n'est modifiée : les sondes travaillent sur des COPIES (`CREATE DATABASE … TEMPLATE zwadj`), supprimées en fin de passe.

CE QUE FAIT CE MODULE : exécuter du SQL (`sql`, `sql_json`), le lancer dans N sessions parallèles à un instant commun (`sessions_paralleles`), appliquer une migration du dépôt par le VRAI mécanisme
(`prisma migrate deploy`, mot de passe lu dans `apps/api/.env`, jamais imprimé), imprimer un verdict par sonde (`verdict`) avec l'attendu à côté du mesuré (D290).
"""
import json
import os
import re
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor

sys.stdout.reconfigure(encoding="utf-8", newline="\n")
if not os.path.exists("pnpm-workspace.yaml"):
    sys.exit("à lancer depuis la racine du dépôt")

CONTENEUR = "zwadj-db"
UTILISATEUR = "zwadj"
MIGRATIONS = "apps/api/prisma/migrations"
RESULTATS: list = []  # (id, ok, libelle)


def _psql(base: str, tx: bool, arret_sur_erreur: bool = True, verbeux: bool = False):
    cmd = ["docker", "exec", "-i", CONTENEUR, "psql", "-U", UTILISATEUR, "-d", base, "-X", "-q", "-A", "-t", "-F", "|"]
    if arret_sur_erreur:
        cmd += ["-v", "ON_ERROR_STOP=1"]
    if verbeux:
        cmd += ["-v", "VERBOSITY=verbose"]  # imprime le SQLSTATE : « ERROR:  40P01: deadlock detected »
    return cmd + (["-1"] if tx else [])


def sql(base: str, texte: str, tx: bool = False, timeout: int = 180):
    """(code, stdout, stderr) d'un script SQL passé sur l'entrée standard — jamais en argument (D289)."""
    r = subprocess.run(_psql(base, tx), input=texte.encode("utf-8"), capture_output=True, timeout=timeout)
    return r.returncode, r.stdout.decode("utf-8", errors="replace"), r.stderr.decode("utf-8", errors="replace")


def sql_ok(base: str, texte: str, tx: bool = False) -> str:
    code, out, err = sql(base, texte, tx)
    if code != 0:
        raise RuntimeError(f"SQL en échec (code {code}) sur {base} : {err.strip()[:500]}")
    return out


def sql_json(base: str, requete: str):
    """Une requête qui rend UNE valeur JSON (`SELECT json_agg(…)`) ; None si NULL."""
    out = sql_ok(base, requete).strip()
    return json.loads(out) if out else None


def valeur(base: str, requete: str):
    return sql_ok(base, requete).strip()


def creer_base(nom: str, modele: str | None = None) -> None:
    sql_ok("postgres", f'DROP DATABASE IF EXISTS "{nom}" WITH (FORCE);')
    sql_ok("postgres", f'CREATE DATABASE "{nom}"' + (f' TEMPLATE "{modele}"' if modele else "") + ";")


def supprimer_base(nom: str) -> None:
    sql("postgres", f'DROP DATABASE IF EXISTS "{nom}" WITH (FORCE);')


def migrations_du_depot() -> list:
    return sorted(d for d in os.listdir(MIGRATIONS) if os.path.isdir(os.path.join(MIGRATIONS, d)))


def appliquer_fichier(base: str, dossier: str, tx: bool = True):
    """Applique `migration.sql` d'un dossier : tout le fichier dans UNE transaction (comme le simple-query de `pg` et de Prisma)."""
    texte = open(os.path.join(MIGRATIONS, dossier, "migration.sql"), encoding="utf-8").read()
    return sql(base, texte, tx=tx)


def url_de(base: str) -> str:
    """L'URL de `apps/api/.env` avec une AUTRE base — passée à un sous-processus par l'environnement, jamais imprimée."""
    for l in open("apps/api/.env", encoding="utf-8"):
        if l.startswith("DATABASE_URL="):
            u = l.split("=", 1)[1].strip().strip('"').strip("'")
            return re.sub(r"(postgres(?:ql)?://[^/]+/)[^?]+", r"\1" + base, u)
    raise RuntimeError("DATABASE_URL absente de apps/api/.env")


def migrate_deploy(base: str):
    """`prisma migrate deploy` — le mécanisme de production — sur la base nommée. Rend (code, dernières lignes de sortie SANS l'URL)."""
    env = dict(os.environ, DATABASE_URL=url_de(base))
    r = subprocess.run(["pnpm", "--filter", "@zwadj/api", "run", "prisma:migrate"], env=env, capture_output=True, shell=(os.name == "nt"), timeout=600)
    sortie = (r.stdout + r.stderr).decode("utf-8", errors="replace")
    sortie = re.sub(r"postgres(?:ql)?://\S+", "postgresql://***", sortie)
    return r.returncode, sortie


def sessions_paralleles(base: str, scripts: list, delai_depart: float = 2.5, timeout: int = 300, arret_sur_erreur: bool = True, verbeux: bool = False):
    """Lance N scripts SQL dans N processus `psql` SÉPARÉS (donc N connexions) qui démarrent leur premier ordre au MÊME instant (horloge de la base). Rend [(code, out, err)]."""
    t0 = valeur(base, f"SELECT to_char(clock_timestamp() + interval '{delai_depart} seconds', 'YYYY-MM-DD HH24:MI:SS.US TZH');")
    barriere = f"SELECT pg_sleep(GREATEST(0, EXTRACT(EPOCH FROM (TIMESTAMPTZ '{t0}' - clock_timestamp()))));\n"
    procs = []
    for s in scripts:
        p = subprocess.Popen(_psql(base, False, arret_sur_erreur, verbeux), stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        procs.append(p)
        p.stdin.write((barriere + s).encode("utf-8"))
        p.stdin.close()
    sorties = []
    for p in procs:
        out = p.stdout.read().decode("utf-8", errors="replace")
        err = p.stderr.read().decode("utf-8", errors="replace")
        p.wait(timeout=timeout)
        sorties.append((p.returncode, out, err))
    return sorties


def _ab(x):
    """Abrège l'AFFICHAGE seulement (jamais la comparaison) : une suite d'entiers consécutifs s'écrit 1..N, un dictionnaire d'UUID garde ses 3 premières entrées."""
    if isinstance(x, (list, tuple)):
        if len(x) > 8 and all(isinstance(i, int) for i in x):
            if all(b - a == 1 for a, b in zip(x, x[1:])):
                return f"{type(x).__name__}[{x[0]}..{x[-1]}] ({len(x)} entiers consécutifs)"
            return f"{type(x).__name__}({len(x)} entiers : {list(x[:4])}…)"
        corps = ", ".join(_ab(i) for i in x)
        return "[" + corps + "]" if isinstance(x, list) else "(" + corps + ("," if len(x) == 1 else "") + ")"
    if isinstance(x, dict) and len(x) > 4:
        return "{" + ", ".join(f"{k!r}: {_ab(v)}" for k, v in list(x.items())[:3]) + f", … {len(x)} entrées}}"
    return repr(x)


def verdict(ident: str, libelle: str, attendu, mesure) -> bool:
    ok = attendu == mesure
    RESULTATS.append((ident, ok, libelle))
    print(f"{'✓' if ok else '✗'} {ident:10} {libelle} — attendu {_ab(attendu)} · mesuré {_ab(mesure)}")
    return ok


def constat(ident: str, texte: str) -> None:
    RESULTATS.append((ident, None, texte))
    print(f"· {ident:10} CONSTAT : {texte}")


def entete(titre: str) -> None:
    print(f"\n== {titre}")


def bilan() -> int:
    ko = [i for i, ok, _ in RESULTATS if ok is False]
    ok = [i for i, ok, _ in RESULTATS if ok is True]
    cons = [i for i, ok, _ in RESULTATS if ok is None]
    print(f"\n== BILAN : {len(ok)} ✓ · {len(ko)} ✗ {ko} · {len(cons)} constat(s) {cons}")
    return 1 if ko else 0
