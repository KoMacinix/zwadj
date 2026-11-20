# Re-ancre SIX cibles de trois harnais existants dont l'ancre est périmée par le lot du rang 57 (D355) : r44 (S-24, A-31, A-53), r41 (A-4, A-5), r43 (A-17).
# Chaque remplacement : le fragment ancien doit exister EXACTEMENT une fois (octets) AVANT d'écrire ; le fragment neuf doit exister exactement une fois APRÈS ; l'empreinte sha256 avant / après est imprimée.
# Aucun texte ne traverse un interpréteur : les fragments sont des littéraux BRUTS de ce fichier (D289).
import hashlib
import sys

RACINE_OK = __import__("os").path.isfile("pnpm-workspace.yaml")
if not RACINE_OK:
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO.")
    sys.exit(2)

EDITS = [
    # ── r44 : S-24 — la ligne de K-18 (`changePassword`) n'est plus unique : la connexion porte maintenant la même ligne. On la prend avec la ligne qui la précède, propre à K-18.
    (
        "neutralisation/neutralize-r44.py",
        r'''      "      expectedPasswordHash: reservation.passwordHash,", "      expectedPasswordHash: newPasswordHash,", ["service", "int-mdp"])''',
        r'''      "      currentSessionId: staff.sessionId,\n      expectedPasswordHash: reservation.passwordHash,", "      currentSessionId: staff.sessionId,\n      expectedPasswordHash: newPasswordHash,", ["service", "int-mdp"])''',
    ),
    # ── r44 : A-31 — le motif du refus d'ouverture change de nom (`memberInactive` → `memberChanged`) : la mutation reste « un CAS refusé n'arrête plus la connexion ».
    (
        "neutralisation/neutralize-r44.py",
        r'''      '      if (membre === undefined) return { ok: false, reason: "memberInactive" };', '      if (false) return { ok: false, reason: "memberInactive" };', ["magasin"])''',
        r'''      '      if (membre === undefined) return { ok: false, reason: "memberChanged" };', '      if (false) return { ok: false, reason: "memberChanged" };', ["magasin"])''',
    ),
    # ── r44 : A-53 — la condition `password_hash = ${input.expectedPasswordHash}` existe maintenant DEUX fois (K-18 et la connexion) : on prend la ligne de K-18 avec ses voisins (« AND status = 'ACTIVE' » à droite).
    (
        "neutralisation/neutralize-r44.py",
        r'''      "password_hash = ${input.expectedPasswordHash}", "password_hash IS NOT NULL", ["magasin", "int-mdp"])''',
        r'''      "AND password_hash = ${input.expectedPasswordHash} AND status = 'ACTIVE'", "AND password_hash IS NOT NULL AND status = 'ACTIVE'", ["magasin", "int-mdp"])''',
    ),
    # ── r41 : A-4 et A-5 — `completerNoms` s'écrit maintenant DANS une transaction : son `where` est indenté de deux espaces de plus.
    (
        "neutralisation/neutralize-r41.py",
        r'''      "        linkedUserId: null,\n        ...(noms.nameAr !== undefined ? { nameAr: null } : {}),", "        linkedUserId: undefined,\n        ...(noms.nameAr !== undefined ? { nameAr: null } : {}),",''',
        r'''      "          linkedUserId: null,\n          ...(noms.nameAr !== undefined ? { nameAr: null } : {}),", "          linkedUserId: undefined,\n          ...(noms.nameAr !== undefined ? { nameAr: null } : {}),",''',
    ),
    (
        "neutralisation/neutralize-r41.py",
        r'''      "        ...(noms.nameAr !== undefined ? { nameAr: null } : {}),\n        ...(noms.nameLatin !== undefined ? { nameLatin: null } : {})\n      },", "        ...{}\n      },",''',
        r'''      "          ...(noms.nameAr !== undefined ? { nameAr: null } : {}),\n          ...(noms.nameLatin !== undefined ? { nameLatin: null } : {})\n        },", "          ...{}\n        },",''',
    ),
    # ── r43 : A-17 — `await tx.auditLog.create({` existe maintenant deux fois dans `quote-store.prisma.ts` (la promotion, indentée de 6 espaces, et la boîte de langue, de 14) : on prend la ligne de la promotion avec son indentation.
    (
        "neutralisation/neutralize-r43.py",
        r'''      "await tx.auditLog.create({", "await this.prisma.auditLog.create({",''',
        r'''      "\n      await tx.auditLog.create({", "\n      await this.prisma.auditLog.create({",''',
    ),
]

par_fichier: dict[str, bytes] = {}
avant_sha: dict[str, str] = {}
for chemin, ancien, neuf in EDITS:
    if chemin not in par_fichier:
        brut = open(chemin, "rb").read()
        par_fichier[chemin] = brut
        avant_sha[chemin] = hashlib.sha256(brut).hexdigest()
    crlf = b"\r\n" in par_fichier[chemin]
    a = ancien.encode("utf-8")
    n = neuf.encode("utf-8")
    c = par_fichier[chemin].count(a)
    assert c == 1, (chemin, "fragment ancien : occurrences", c, ancien[:90])
    par_fichier[chemin] = par_fichier[chemin].replace(a, n)
    assert par_fichier[chemin].count(n) == 1, (chemin, "fragment neuf : occurrences", par_fichier[chemin].count(n))
    assert (b"\r\n" in par_fichier[chemin]) == crlf, "la fin de ligne du fichier a changé"
    print(f"✓ {chemin} · ancien ×1 → neuf ×1 · {ancien.strip()[:70]}…")

for chemin, brut in par_fichier.items():
    open(chemin, "wb").write(brut)
    apres = hashlib.sha256(open(chemin, "rb").read()).hexdigest()
    print(f"{chemin}\n   AVANT {avant_sha[chemin]}\n   APRÈS {apres}")
