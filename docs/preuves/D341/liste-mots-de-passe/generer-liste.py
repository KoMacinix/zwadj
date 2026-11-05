#!/usr/bin/env python3
"""D341 — GÉNÉRATEUR de `apps/api/src/staff/staff-common-passwords.ts` à partir de la liste VERSÉE (R-5 (D341)). Procédure archivée comme PREUVE (D291), jamais promue en instrument.

USAGE, depuis la RACINE du monorepo : python3 docs/preuves/D341/liste-mots-de-passe/generer-liste.py

CE QU'IL FAIT : relit `docs/preuves/D341/liste-mots-de-passe/10k-most-common.txt` (octets), REFUSE de produire quoi que ce soit si son sha256 n'est pas celui que la table d'ouverture écrit, relit l'avis de
licence versé à côté, et écrit le module TypeScript : l'avis MIT en tête (condition de la licence : « The above copyright notice and this permission notice shall be included in all copies »), la liste
(une entrée par ligne, dans l'ordre du fichier, écrite comme un littéral de chaîne JSON — ASCII seul, aucun caractère à échapper à la main), et la provenance sous forme de DONNÉE.

POURQUOI UN MODULE GÉNÉRÉ ET PAS UN FICHIER LU À L'EXÉCUTION : `nest build` ne copie que le code compilé ; lire un fichier de données au démarrage demanderait une configuration d'actifs de build
et un chemin qui diffère entre `src/` (vitest) et `dist/` (production). Un module TypeScript voyage avec le code ; `staff-password-policy.spec.ts` confronte le module à sa source, ligne à ligne.
"""
import hashlib
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO (pnpm-workspace.yaml introuvable).")
    sys.exit(2)

DOSSIER = "docs/preuves/D341/liste-mots-de-passe"
SORTIE = "apps/api/src/staff/staff-common-passwords.ts"
SHA_ATTENDU = "68782d6a4a19a4768d5f15dd66bd534e7a33055cc755411e33f16d18c50fdcce"  # celui de la table d'ouverture (ed30944)
SHA_LICENCE = "3dbdc93d5f8829de0941744841730a09c106d0732e5ae0e98ca1d77be7ded66c"
COMMIT = "4afe4d3de0a5d227c59ae2f162d22b93b4c27bfd"
DEPOT = "https://github.com/danielmiessler/SecLists"
CHEMIN = "Passwords/Common-Credentials/10k-most-common.txt"

source = open(f"{DOSSIER}/10k-most-common.txt", "rb").read()
licence = open(f"{DOSSIER}/LICENSE-SecLists-MIT.txt", "rb").read()
if hashlib.sha256(source).hexdigest() != SHA_ATTENDU:
    print("✗ ABANDON : le sha256 du fichier source n'est pas celui de la table d'ouverture — rien n'est écrit.")
    sys.exit(3)
if hashlib.sha256(licence).hexdigest() != SHA_LICENCE:
    print("✗ ABANDON : le sha256 de l'avis de licence n'est pas celui de la table d'ouverture — rien n'est écrit.")
    sys.exit(3)

entrees = [l for l in source.decode("utf-8").split("\n") if l != ""]
assert len(entrees) == 10_001, len(entrees)
assert len(set(entrees)) == len(entrees)
assert all(e == e.strip() and e.isascii() and "\r" not in e for e in entrees)

avis = licence.decode("utf-8").rstrip("\n").split("\n")
en_tete = [
    "// ⛔ MODULE GÉNÉRÉ — NE PAS ÉDITER À LA MAIN. Rang 44, L36-3a-1 (D341, R-5 (D341)).",
    "// Généré par `docs/preuves/D341/liste-mots-de-passe/generer-liste.py` à partir de la liste versée `docs/preuves/D341/liste-mots-de-passe/10k-most-common.txt` (octets vérifiés par sha256 avant toute écriture).",
    f"// Source : {DEPOT} — `{CHEMIN}`, commit {COMMIT}.",
    f"// sha256 de la source : {SHA_ATTENDU} — {len(source)} octets, {len(entrees)} entrées distinctes (la table d'ouverture `docs/preuves/D341/table-ouverture.md` écrit la même empreinte).",
    "// Comparaison : après mise en minuscules (`staff-password-policy.ts`). ⚠ La licence est celle du DÉPÔT ; elle ne documente pas l'origine des mots de ce fichier.",
    "//",
    "// ─── Avis de licence, reproduit comme la licence l'exige (« shall be included in all copies or substantial portions ») ───",
    "//",
    *[("// " + l).rstrip() for l in avis],
    "//"
]
corps = ["export const STAFF_COMMON_PASSWORDS: readonly string[] = ["]
corps += [f"  {json.dumps(e, ensure_ascii=True)}{',' if i < len(entrees) - 1 else ''}" for i, e in enumerate(entrees)]
corps += ["];", ""]
corps += [
    "/** La provenance de la liste, en DONNÉE : `staff-password-policy.spec.ts` la confronte au fichier versé et à la table d'ouverture. */",
    "export const STAFF_COMMON_PASSWORDS_SOURCE = {",
    f'  repository: "{DEPOT}",',
    f'  path: "{CHEMIN}",',
    f'  commit: "{COMMIT}",',
    f'  sha256: "{SHA_ATTENDU}",',
    '  license: "MIT",',
    f"  entries: {len(entrees)}",
    "} as const;",
    ""
]
texte = "\n".join(en_tete + [""] + corps)
open(SORTIE, "w", encoding="utf-8", newline="\n").write(texte)
relu = open(SORTIE, "rb").read()
print(f"✓ {SORTIE} : {len(relu)} octets, {len(entrees)} entrées, sha256 du module {hashlib.sha256(relu).hexdigest()}")
