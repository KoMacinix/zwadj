#!/usr/bin/env python3
"""Campagne de neutralisation — lot R4, le refus de devis rendait 500.

⚠ CE QUE CETTE CAMPAGNE PROUVE.
R4 corrige DEUX défauts empilés qui se manifestaient par le même 500 générique :
  1. `CANCELLED` n'existait pas dans le TYPE PostgreSQL `QuoteStatus` ;
  2. `quotes_sent_at_coherent` refusait un `CANCELLED` sans `sent_at`, donc la
     clôture d'un brouillon jamais remis.
Le rouge d'origine a été MESURÉ avant tout correctif : 11 tests d'intégration en
échec, dont 8 sur les devis. Cette campagne vérifie l'autre moitié — que les
gardes posées mordent encore si le correctif s'en va. Une correction dont on ne
peut pas faire rougir la garde n'est pas prouvée, elle est seulement constatée.

⚠ CES CIBLES MUTENT DES MIGRATIONS, PAS DU CODE. C'est voulu : les migrations
sont la SEULE autorité sur le schéma réel, et le défaut d'origine venait
précisément de ce que `schema.prisma` avançait sans elles. Neutraliser le
service n'aurait rien dit du schéma.

⚠ BASE RÉELLE OBLIGATOIRE — tout est en intégration. Sans PostgreSQL, cette
campagne ne s'exécute pas du tout : elle ne « passe » pas, elle n'a pas lieu.

Usage :
    python3 neutralize-r4.py            # les deux cibles
    python3 neutralize-r4.py 1 1        # une plage
Depuis : la racine du monorepo, base de développement lancée.
"""

import io
import os
import shutil
import subprocess
import sys

# ⛔ LA CONSOLE WINDOWS EST EN cp1252 : le premier « ✓ » imprimé fait LEVER ce
#   script (UnicodeEncodeError), APRÈS le pré-vol — donc après avoir payé la
#   mesure, et avec une trace Python qui ressemble à un défaut de harnais
#   alors que la campagne allait bien. Propagé aux 21 scripts le 30/08/2026
#   (D268) : avant lui, AUCUN harnais n'avait jamais tourné sur ce poste.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# ⛔ CE SCRIPT SE LANCE DEPUIS LA RACINE DU MONOREPO, jamais depuis son propre
#   dossier : tous ses chemins sont relatifs au DOSSIER COURANT. Sans cette
#   garde, un `cd neutralisation` produirait « ERREUR DE SCRIPT : 0
#   occurrence(s) » — un message qui envoie chercher un défaut de code là où il
#   n'y a qu'un dossier de travail.
if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO (pnpm-workspace.yaml introuvable).")
    print(f"  dossier courant : {os.getcwd()}")
    print(f"  → python3 neutralisation/{os.path.basename(__file__)}")
    sys.exit(2)

SAUVEGARDE = ".neutralisation-sauvegarde"
AJOUT_VALEUR = "apps/api/prisma/migrations/20260821000000_quote_status_cancelled/migration.sql"
BORNE = "apps/api/prisma/migrations/20260821000100_quote_cancel_without_delivery/migration.sql"


def _binaire(nom: str) -> str:
    """Windows : `pnpm` est un `.cmd`, que `CreateProcess` ne résout pas seul."""
    return shutil.which(nom) or nom


# ⚠ AUCUN `-t` : `vitest -t <motif>` sort en 0 quand rien ne correspond (D226).
def _mesure(fichier: str) -> list[str]:
    return ["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", "-c", "vitest.config.int.ts", fichier]


MESURES = {
    "migration": _mesure("test/int/migration-non-empty.int-spec.ts"),
    "devis": _mesure("test/int/quotes.int-spec.ts"),
}

CIBLES = [
    (
        "R4-1. ⚠ `CANCELLED` RESSORT DU TYPE — le 22P02 d'origine revient",
        AJOUT_VALEUR,
        "ALTER TYPE \"QuoteStatus\" ADD VALUE IF NOT EXISTS 'CANCELLED' BEFORE 'SUPERSEDED';",
        "SELECT 1;",
        1,
        ["migration", "devis"],
    ),
    (
        "R4-2. La borne redevient celle d'août : un brouillon jamais remis ne se clôt plus",
        BORNE,
        "CHECK (\"status\" IN ('DRAFT', 'CANCELLED') OR \"sent_at\" IS NOT NULL);",
        "CHECK (\"status\" = 'DRAFT' OR \"sent_at\" IS NOT NULL);",
        1,
        ["migration", "devis"],
    ),
]


def restaurer_si_interrompu() -> None:
    """Un `finally` ne s'exécute PAS quand le processus est tué (D223). La
    sauvegarde disque est le seul filet — et ici l'enjeu est plus lourd
    qu'ailleurs : un fichier de MIGRATION laissé muté se propagerait à toute
    base recréée ensuite."""
    if not os.path.isdir(SAUVEGARDE):
        return
    for marque in os.listdir(SAUVEGARDE):
        chemin = marque.replace("__", "/")
        contenu = io.open(os.path.join(SAUVEGARDE, marque), encoding="utf-8", newline="").read()
        io.open(chemin, "w", encoding="utf-8", newline="").write(contenu)
        print(f"↩ RESTAURÉ après interruption : {chemin}")
    shutil.rmtree(SAUVEGARDE)


def sauver(chemin: str, contenu: str) -> str:
    os.makedirs(SAUVEGARDE, exist_ok=True)
    marque = os.path.join(SAUVEGARDE, chemin.replace("/", "__"))
    io.open(marque, "w", encoding="utf-8", newline="").write(contenu)
    return marque


def lancer(nom: str) -> int:
    env = {**os.environ, "ALLOW_PG_LT18_POLYFILL": os.environ.get("ALLOW_PG_LT18_POLYFILL", "")}
    commande = MESURES[nom]
    return subprocess.run(
        [_binaire(commande[0]), *commande[1:]],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        env=env,
    ).returncode


def main(argv: list[str]) -> int:
    rangs = [a for a in argv if a.isdigit()]
    depuis = int(rangs[0]) if rangs else 1
    jusqua = int(rangs[1]) if len(rangs) > 1 else 99

    restaurer_si_interrompu()

    # ── Pré-vol : une mesure DÉJÀ rouge rendrait toute la campagne illisible.
    for nom in MESURES:
        if lancer(nom) != 0:
            print(f"✗ PRÉ-VOL : « {nom} » est DÉJÀ ROUGE avant mutation. Campagne abandonnée.")
            print("  (base lancée ? ALLOW_PG_LT18_POLYFILL requis sous PostgreSQL < 18.)")
            return 2
    print(f"✓ Pré-vol : {len(MESURES)} mesure(s) verte(s) — {', '.join(MESURES)}\n")

    mordu, muettes = 0, []
    for rang, (libelle, chemin, avant, apres, attendu, mesures) in enumerate(CIBLES, start=1):
        if not (depuis <= rang <= jusqua):
            continue
        source = io.open(chemin, encoding="utf-8", newline="").read()
        avant = avant.replace("\n", "\r\n")
        apres = apres.replace("\n", "\r\n")
        vus = source.count(avant)
        if vus != attendu:
            print(f"✗ {libelle}\n   ERREUR DE SCRIPT : {vus} occurrence(s), {attendu} attendue(s) dans {chemin}")
            return 2

        marque = sauver(chemin, source)
        io.open(chemin, "w", encoding="utf-8", newline="").write(source.replace(avant, apres))
        try:
            codes = {m: lancer(m) for m in mesures}
        finally:
            io.open(chemin, "w", encoding="utf-8", newline="").write(source)
            os.remove(marque)

        verts = [m for m, code in codes.items() if code == 0]
        if verts:
            muettes.append(f"{libelle} (vert dans : {', '.join(verts)})")
            print(f"✗ {libelle}\n   VERT dans {verts} malgré la neutralisation.")
        else:
            mordu += 1
            print(f"✓ {libelle}  [{', '.join(codes)}]")

    if os.path.isdir(SAUVEGARDE) and not os.listdir(SAUVEGARDE):
        os.rmdir(SAUVEGARDE)

    print(f"\n{mordu} garde(s) neutralisée(s) et ROUGE(s) sur la plage demandée.")
    for m in muettes:
        print(f"  muette : {m}")
    return 0 if not muettes else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
