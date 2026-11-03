"""D339 — neutralisation À LA MAIN de la spec e2e `e2e/specs/r43-devis-brouillon.e2e.ts` pour le rang 43 : un TÉMOIN (aucune mutation), quatre mutations du code, et la mutation du FILTRE D'AUDIT de la spec
elle-même (note de Ko du 02/11/2026, point 4). Chaque spec ciblée est jouée dans un vrai navigateur, la SORTIE EST LUE, les fichiers sont restaurés à l'octet.
Adapté de `docs/preuves/D333/neutralisation/e2e-a-la-main.py` (une mutation PAR FICHIER) ; ajouts : le témoin, des mutations à PLUSIEURS remplacements, le comptage des tests EXÉCUTÉS (D144), et une lecture plus
stricte de la morsure. Procédure archivée comme PREUVE (D291), jamais promue en instrument. Aucune campagne ne mute le code pour une e2e : jsdom ne démarre ni l'API ni la base, ne télécharge rien.

POURQUOI LE FILTRE. L'e2e est passée de « lit TOUTES les lignes `audit_logs` d'un devis » à « lit celles de CE devis » (`AND entity_id = $1`) entre les rouges et le code. Le motif écrit au fichier — la base est partagée
par les parcours FR et AR — était une affirmation NON MESURÉE. E-5 la mesure : la spec est rejouée AVEC l'ancienne lecture (les deux remplacements défaits), les DEUX langues ; si le filtre est inutile, la spec
passe, et le filtre était un affaiblissement. Si le parcours AR voit la ligne du parcours FR, il rougit sur `toHaveLength(1)` : le filtre est NÉCESSAIRE, et la preuve est le compte lu (reçu 2, attendu 1).

LECTURE (D323). Une assertion Playwright web-first (`expect(...)`) qui expire après ses réessais EST un échec d'assertion si l'échec lu montre l'appel `expect` avec l'attendu et le reçu ; le délai d'une ACTION (`click`,
`goto`) ou d'un test N'EN EST PAS UN. Ici : la PREMIÈRE ligne d'erreur du bloc d'échec doit commencer par `Error: expect(` — sinon la mutation n'est pas comptée mordue. ET au moins un test doit avoir été EXÉCUTÉ
(D144 : « aucun test exécuté » ne se lit pas comme « tout va bien »).
Sauvegarde sur DISQUE avant toute mutation (`.e2e-main.sauvegarde/`) ; restaurée dans `finally` ET refusée au démarrage suivant ; empreintes comparées avant/après.
Usage, depuis la RACINE, bash : python3 docs/preuves/D339/neutralisation/e2e-a-la-main.py [--seulement E-5,...] > docs/preuves/D339/neutralisation/e2e-a-la-main.txt
Codes : 0 = témoin vert ET chaque mutation lue mordue ET tout restauré ; 1 = au moins une mutation ne mord pas, ou le témoin n'est pas vert ; 2 = abandon (pose, sauvegarde existante, arbre modifié).
"""
import hashlib
import os
import re
import shutil
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")
if not os.path.isfile("pnpm-workspace.yaml"):
    sys.exit("✗ À LANCER DEPUIS LA RACINE DU MONOREPO.")

SAUV = ".e2e-main.sauvegarde"
ANSI = re.compile(r"\x1b\[[0-9;]*m")
SPEC = "e2e/specs/r43-devis-brouillon.e2e.ts"
WK = "apps/pro/src/dashboard/walkin-journey.tsx"
MAGASIN = "apps/api/src/venues/quote-store.prisma.ts"
TYPES = "packages/types/src/quote.ts"
# ⛔ DÉFAUT D'INSTRUMENT de la première passe (D298 ; extension 8 de la table) : l'API de l'e2e charge `@zwadj/types` par son `main`, `packages/types/dist/index.js` — SEUL l'alias de Vite (app Pro) lit `src`.
# Muter `src` seul laissait E-4 inerte pour l'API (la spec lit la référence rendue par l'API) : « joué-et-rouge NON », et ce n'était pas la spec qui était aveugle. E-4 mute donc AUSSI le fichier COMPILÉ.
TYPES_DIST = "packages/types/dist/quote.js"
# ⚠ le motif contient une ESPACE : `subprocess.list2cmdline` n'entoure de guillemets que les arguments qui en portent, et `cmd.exe` lirait des parenthèses nues.
FR_SEUL = r"\(fr\) un brouillon"

# (libellé, [(fichier, avant, après), …], filtre -g ou None = toute la spec)
MUTANTS = [
    ("E-1. le second bouton CRÉE un devis OFFICIEL (le drapeau `isOfficial: false` n'est pas envoyé) — la spec doit rougir sur l'état du devis créé",
     [(WK, "sansCoordonnees ? { ...body(), isOfficial: false as const } : body()", "{ ...body() }")], FR_SEUL),
    ("E-2. la remise ne met plus `isOfficial: true` DANS le WHERE (un brouillon se remet) — la spec doit rougir sur le refus de la remise",
     [(MAGASIN, "where: { id: quoteId, status: { in: [...statutsAdmis] }, ...(exigeOfficiel ? { isOfficial: true } : {}) },", "where: { id: quoteId, status: { in: [...statutsAdmis] } },")], FR_SEUL),
    ("E-3. la ligne d'audit de la promotion change d'ACTION — la spec doit rougir sur l'action lue en base",
     [(MAGASIN, 'action: "quote.promote",', 'action: "quote.promoted",')], FR_SEUL),
    ("E-4. la référence d'un brouillon porte le préfixe d'un devis OFFICIEL — la spec doit rougir sur la référence",
     [(TYPES, "const prefixe = parts.official === false ? QUOTE_REFERENCE_PREFIX.DRAFT : QUOTE_REFERENCE_PREFIX.OFFICIAL;", "const prefixe = QUOTE_REFERENCE_PREFIX.OFFICIAL;"),
      (TYPES_DIST, "const prefixe = parts.official === false ? exports.QUOTE_REFERENCE_PREFIX.DRAFT : exports.QUOTE_REFERENCE_PREFIX.OFFICIAL;", "const prefixe = exports.QUOTE_REFERENCE_PREFIX.OFFICIAL;")], FR_SEUL),
    ("E-5. LE FILTRE D'AUDIT de la spec est DÉFAIT (l'ancienne lecture : toutes les lignes `quote`, sans paramètre) — les DEUX parcours ; le parcours AR doit voir la ligne du parcours FR et rougir sur `toHaveLength(1)`",
     [(SPEC, "WHERE entity_type = 'quote' AND entity_id = $1`,", "WHERE entity_type = 'quote'`,"),
      (SPEC, "      [brouillon.id]\n    );\n    expect(audit).toHaveLength(1);", "      []\n    );\n    expect(audit).toHaveLength(1);")], None),
]

seulement = None
if "--seulement" in sys.argv:
    seulement = sys.argv[sys.argv.index("--seulement") + 1].split(",")

if os.path.exists(SAUV):
    print("✗ une sauvegarde d'une exécution interrompue existe (.e2e-main.sauvegarde) : à restaurer à la main avant de recommencer.")
    sys.exit(2)


def sha(p: str) -> str:
    return hashlib.sha256(open(p, "rb").read()).hexdigest()


def jouer(filtre: str | None) -> tuple[int, str]:
    cmd = ["pnpm", "--filter", "@zwadj/e2e", "exec", "playwright", "test", SPEC.replace("e2e/", "", 1), "--reporter=list"]
    if filtre:
        cmd += ["-g", filtre]
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", shell=(os.name == "nt"))
    return r.returncode, ANSI.sub("", (r.stdout or "") + "\n" + (r.stderr or ""))


def lire(sortie: str) -> dict:
    """Ce que la sortie dit — jamais déduit du code de sortie."""
    lignes = sortie.splitlines()
    resultats = [l for l in lignes if re.match(r"^\s*\S+\s+\d+ \[chromium\] › ", l)]
    entetes = [i for i, l in enumerate(lignes) if re.match(r"^\s+\d+\) \[chromium\] › ", l)]
    resume = [l.strip() for l in lignes if re.match(r"^\s*\d+ (passed|failed|flaky|skipped|did not run)", l)]
    erreurs = []
    for i in entetes:
        bloc = lignes[i + 1:i + 22]
        premiere = next((x.strip() for x in bloc if x.strip().startswith("Error:") or x.strip().startswith("TimeoutError:")), "")
        recu = [x.strip() for x in bloc if re.match(r"^\s*(Expected|Received)", x)]
        # Une assertion AVEC message personnalisé imprime ce message en première ligne, puis l'appel `expect(...)` : on lit le BLOC, pas seulement sa première ligne.
        est_assertion = bool(re.search(r"expect\((received|locator)\)", "\n".join(bloc))) and not re.search(r"(locator|page|frame)\.[A-Za-z]+: Timeout|^\s*TimeoutError", "\n".join(bloc), re.M)
        erreurs.append((lignes[i].strip(), premiere, recu, est_assertion))
    return {"executes": len(resultats), "echecs": len(entetes), "resume": resume, "erreurs": erreurs, "resultats": [l.strip() for l in resultats]}


def poser(libelle: str, remplacements: list[tuple[str, str, str]]) -> dict[str, bytes]:
    """Applique TOUS les remplacements en mémoire (ancre 1→0, marqueur n→n+1 par remplacement) ; rend les originaux par fichier."""
    originaux: dict[str, bytes] = {}
    textes: dict[str, str] = {}
    for fichier, avant, apres in remplacements:
        if fichier not in originaux:
            originaux[fichier] = open(fichier, "rb").read()
            textes[fichier] = originaux[fichier].decode("utf-8")
        crlf = b"\r\n" in originaux[fichier]
        a, b = (avant.replace("\n", "\r\n"), apres.replace("\n", "\r\n")) if crlf else (avant, apres)
        n_avant, n_marque = textes[fichier].count(a), textes[fichier].count(b)
        assert n_avant == 1, f"{libelle[:4]} : ancre ×{n_avant} dans {fichier}"
        assert b not in a, f"{libelle[:4]} : le remplacement est une sous-chaîne de son ancre ({fichier}) — il ne se prouverait pas posé"
        muté = textes[fichier].replace(a, b)
        assert (muté.count(a), muté.count(b)) == (0, n_marque + 1), f"{libelle[:4]} : mutation non posée dans {fichier}"
        textes[fichier] = muté
        print(f"   pose · {fichier} · ancre 1→0 · marqueur {n_marque}→{n_marque + 1} · fins de ligne {'CRLF' if crlf else 'LF'}")
    os.makedirs(SAUV)
    for fichier, brut in originaux.items():
        open(os.path.join(SAUV, fichier.replace("/", "__")), "wb").write(brut)
    for fichier, texte in textes.items():
        open(fichier, "wb").write(texte.encode("utf-8"))
    return originaux


def restaurer(originaux: dict[str, bytes]) -> None:
    for fichier, brut in originaux.items():
        open(fichier, "wb").write(brut)
    shutil.rmtree(SAUV, ignore_errors=True)


# ── CALIBRATION du lecteur (deux bras, rejouée à chaque lancement ; abandon si un seul manque) : des sorties de FORME CONNUE, écrites ici, jamais relevées d'une mutation.
_ENTETE = "  1) [chromium] › specs\\r43-devis-brouillon.e2e.ts:99:5 › ⛔ (fr) un brouillon créé ──────────"
_ECHANTILLONS = [
    ("positif : assertion de locator (`expect(locator)`, Expected/Received)", f"{_ENTETE}\n\n    Error: expect(locator).toBeVisible() failed\n\n    Locator: getByText('x')\n    Expected: visible\n    Received: <element(s) not found>\n    Timeout: 7000ms\n", True),
    ("positif : assertion AVEC message personnalisé (le message d'abord, l'appel `expect(received)` ensuite)", f"{_ENTETE}\n\n    Error: la ligne d'audit ne porte ni le nom ni le numéro\n\n    expect(received).toBe(expected) // Object.is equality\n\n    Expected: false\n    Received: true\n", True),
    ("positif : `toHaveLength` (reçu 2, attendu 1)", f"{_ENTETE}\n\n    Error: expect(received).toHaveLength(expected)\n\n    Expected length: 1\n    Received length: 2\n", True),
    ("négatif : délai d'ACTION (`locator.click: Timeout`) — jamais une morsure (D323)", f"{_ENTETE}\n\n    Error: locator.click: Timeout 30000ms exceeded.\n    Call log:\n      - waiting for getByRole('button')\n", False),
    ("négatif : délai du TEST entier", f"{_ENTETE}\n\n    Test timeout of 90000ms exceeded.\n", False),
]
_cal = []
for _nom, _texte, _attendu in _ECHANTILLONS:
    _lu = lire(_texte)
    _obtenu = any(est for *_, est in _lu["erreurs"])
    _cal.append((_nom, _lu["echecs"] == 1 and _obtenu == _attendu))
for _nom, _ok in _cal:
    print(f"   {'✓' if _ok else '✗'} calibration du lecteur — {_nom}")
if not all(ok for _, ok in _cal):
    sys.exit("✗ ABANDON : calibration du lecteur manquée")
print(f"   calibration du lecteur : {len(_cal)} bras, 0 manqué")

bilan = []

# ── TÉMOIN : aucune mutation. Il prouve que la spec s'EXÉCUTE et passe — sans lui, « rouge » ne dit pas ce que la mutation a changé.
if seulement is None:
    print("\n■ TÉMOIN. aucune mutation — la spec entière (FR et AR)")
    code, sortie = jouer(None)
    t = lire(sortie)
    print(f"   code {code} · tests exécutés : {t['executes']} · en échec : {t['echecs']} · résumé Playwright : {t['resume']}")
    for l in t["resultats"]:
        print(f"      {l[:200]}")
    temoin_ok = code == 0 and t["executes"] >= 2 and t["echecs"] == 0
    print(f"   témoin vert : {temoin_ok} (attendu : code 0, ≥ 2 tests exécutés — un par langue —, 0 en échec)")
    bilan.append(("TÉMOIN", t["executes"], t["echecs"], code, True, temoin_ok, True))

for libelle, remplacements, filtre in MUTANTS:
    if seulement is not None and libelle[:3] not in seulement:
        continue
    print(f"\n■ {libelle}")
    empreintes = {f: sha(f) for f in {r[0] for r in remplacements}}
    originaux = poser(libelle, remplacements)
    try:
        code, sortie = jouer(filtre)
    finally:
        restaurer(originaux)
    restauree = all(sha(f) == e for f, e in empreintes.items())
    t = lire(sortie)
    print(f"   filtre -g : {filtre or '— (toute la spec)'} · code {code} · tests exécutés : {t['executes']} · en échec : {t['echecs']} · résumé : {t['resume']} · empreintes restaurées : {'identiques' if restauree else 'DIFFÉRENTES'}")
    for l in t["resultats"]:
        print(f"      {l[:200]}")
    for entete, premiere, recu, est_assertion in t["erreurs"]:
        print(f"   échec lu : {entete[:170]}")
        print(f"      première ligne d'erreur : {premiere[:200]} · appel `expect(` dans le bloc et pas un délai d'action : {est_assertion}")
        for x in recu[:4]:
            print(f"      {x[:200]}")
    # une MORSURE : au moins un test EXÉCUTÉ, au moins un échec dont le bloc porte l'appel `expect(...)` avec l'attendu et le reçu — jamais un délai d'ACTION (D323)
    assertion = any(est for _, _, _, est in t["erreurs"])
    bilan.append((libelle[:3], t["executes"], t["echecs"], code, restauree, t["executes"] >= 1 and t["echecs"] >= 1 and code != 0, assertion))

print("\nBILAN :")
for nom, ex, ec, code, restauree, joue, assertion in bilan:
    print(f"   {nom:7} exécutés {ex} · échecs {ec} · code {code} · restauré {'oui' if restauree else 'NON'} · joué-et-rouge {'oui' if joue else 'NON'} · assertion lue {'oui' if assertion else 'NON'}")
ok = all(restauree and joue and assertion for nom, ex, ec, code, restauree, joue, assertion in bilan if nom != "TÉMOIN")
temoin = [b for b in bilan if b[0] == "TÉMOIN"]
ok = ok and (not temoin or temoin[0][5])
print("(attendu : témoin vert avec ≥ 2 exécutés ; chaque mutation : ≥ 1 exécuté, ≥ 1 échec, code ≠ 0, restaurée, assertion `expect(` lue)")
sys.exit(0 if ok else 1)
