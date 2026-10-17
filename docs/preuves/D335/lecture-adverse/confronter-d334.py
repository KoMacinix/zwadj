"""D335 — lecture adverse de D334 (rang 40 : la session ADVERSE de L35-3 et l'étape 0 de la certification, passe tentée et NON démarrée), confrontée aux objets git à des SHA FIXÉS et aux pièces versées.

POURQUOI IL EXISTE
  Consigne de reprise du 17/10/2026 : « la lecture adverse depuis la clôture de D334, EN ENTIER, et EN ENTIER dans le rapport final : instrument versé ; objets git lus à des SHA fixés ; chaque extracteur calibré
  sur un cas vrai et un cas faux ; sortie versée avant toute écriture d'autorité ; contrôles, écarts, constats, et « non vérifiable » déclaré. En particulier : la session adverse de L35-3 (ses 54 mutations,
  52 mordues, 2 muettes classées ; ses cas joués ; la base de développement et le dépôt restés intacts) ; l'étape 0 (les trois règles de Ko dans l'outil de passe et leurs 12 bras ; les planchers, 26 repris
  prouvés par git, 7 mesurés) ; le protocole (6e78b23) commité et poussé avant la tentative ; la tentative arrêtée à la porte dure, ses neuf pièces brutes ; l'essai à blanc à barre abaissée n'a rien produit
  qui soit lu comme une mesure certifiante. Aucune porte ni campagne n'est rejouée pour cette lecture. »
  Le dernier commit de D334 est `b92dc7a` ; le seul commit qui le suit est la table d'ouverture de CE lot (`a9695c3`, qui ne contient qu'elle). Chaque affirmation de D334 qui se vérifie dans le dépôt est
  confrontée à sa SOURCE : les pièces versées, les objets git, le texte des fichiers d'autorité. Ce qui ne vit que dans le chat ou hors dépôt est déclaré NON VÉRIFIABLE.

USAGE, depuis la racine (bash, jamais une redirection PowerShell — D298) :
  python3 docs/preuves/D335/lecture-adverse/confronter-d334.py > docs/preuves/D335/lecture-adverse/confronter-sortie.txt

LECTURE SEULE. Tout se lit par `git show <sha>:<chemin>` aux SHA fixés ci-dessous — jamais l'arbre de travail, SAUF la famille X (état LIVE : `git status`, `stash`, `rev-parse`, les `.env` par l'outil de D330 — empreinte
  et classe d'hôte, AUCUNE valeur —, la RAM, la base de développement par un SELECT de lecture). AUCUN rejeu de porte ni de campagne ici ; les seules écritures sont un dossier temporaire (outil des `.env`, blobs du diff).

INSTRUMENTS ÉCARTÉS : rejouer `confronter-d333.py` (D334) — il juge D333 et ses SHA ; réutiliser `deriver-plancher.py` ou `lire-campagnes.py` de D334 comme preuve de leurs propres sorties — ce serait croire l'instrument
  qu'on juge : ici les harnais « à mesurer » sont RECALCULÉS par une autre voie (blobs de `neutralisation/neutralize-*.py` comparés entre deux SHA), les comptes de la session adverse sont RECOMPTÉS depuis les sorties
  brutes par des expressions écrites ici, la table recopiée est comparée à la table d'ouverture par ENSEMBLE de chemins, le protocole est comparé LIGNE À LIGNE entre deux SHA.

CALIBRATION, deux bras par extracteur (D286) : chacun est joué sur un cas où le fait est connu VRAI et sur un cas où il est connu FAUX ; abandon si un bras manque. Les comptes s'impriment avec ce qu'ils ont PARCOURU et leur
attendu à côté (D290), le total des contrôles avec sa ventilation par famille (D295). Un attendu est LU dans le texte de D334 ou dans une pièce brute — jamais écrit de mémoire (D275) ; quand un attendu est une valeur de la
forme de Ko ou du SHA de départ, il est dit tel.

FAMILLES : G (git : ordre des commits, provenance du code, déclaration des fichiers) · P (le protocole, ligne à ligne) · S (la session adverse) · K (l'étape 0 : règles, outil de passe, planchers, essais à blanc) · T (la
tentative de passe) · L (textes d'autorité) · X (état LIVE).
"""
import difflib
import os
import re
import subprocess
import sys
import tempfile
from datetime import datetime, timedelta, timezone

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.exists("pnpm-workspace.yaml"):
    sys.exit("à lancer depuis la racine du dépôt")

DEPART = "83929a6"     # dernier commit de D333 = SHA de départ de D334 (valeur de la forme de Ko)
FIN = "b92dc7a"        # dernier commit de D334 : la clôture de la session du 15/10/2026
OUV335 = "a9695c3"     # la table d'ouverture de CE lot (seule)
REPAR = "0342e94"      # dernier commit de D333 qui touche du code, une spec ou un harnais : les portes de D333 y ont tourné
D324, D329 = "257471d", "4202dd4"   # SHA lus dans `plancher/deriver-plancher-sortie.txt` (« D324 257471d · D329 4202dd4 »)
PROTOCOLE = "6e78b23"
CONT, AGENTS, BACKLOG = "ZWADJ_CONTINUITE.md", "AGENTS.md", "ZWADJ_BACKLOG.md"
AUTORITES = (AGENTS, BACKLOG, CONT)
PD = "docs/preuves/D334"
FUSEAU = timezone(timedelta(hours=-4))   # le poste est réglé sur America/Toronto (les dates git portent -04:00, sortie-4 : Intl=America/Toronto)
NBSP = "[\\s  ]"

controles, ecarts, constats, ecarts_live, non_verifiables = [], [], [], [], []
familles: dict = {}
bras_calibration = [0, 0]  # joués, manqués


def git(*args, check=True):
    return subprocess.run(["git", *args], capture_output=True, check=check).stdout


def show(sha, chemin):
    return git("show", f"{sha}:{chemin}").decode("utf-8", errors="replace").replace("\r\n", "\n")


def blob(sha, chemin):
    return subprocess.run(["git", "rev-parse", f"{sha}:{chemin}"], capture_output=True).stdout.decode().strip() or None


def noms_diff(a, b, *chemins):
    return [l for l in git("diff", "--name-only", a, b, *(["--", *chemins] if chemins else [])).decode("utf-8").split("\n") if l]


def noms_commit(sha):
    return [l for l in git("show", "--name-only", "--format=", sha).decode("utf-8").split("\n") if l]


def liste_arbre(sha, *prefixes):
    return [l for l in git("ls-tree", "-r", "--name-only", sha, *prefixes).decode("utf-8").split("\n") if l]


def complet(sha7):
    return git("rev-parse", sha7).decode().strip()


def est_code(n):
    return not (n.startswith("docs/preuves/") or n in AUTORITES)


def aplati(t):
    return re.sub(r"\s+", " ", t)


def ctl(ident, libelle, attendu, mesure):
    ok = attendu == mesure
    controles.append(ident)
    familles[ident[0]] = familles.get(ident[0], 0) + 1
    if not ok:
        (ecarts_live if ident[0] == "X" else ecarts).append(ident)
    print(f"{'✓' if ok else '✗'} {ident:9} {libelle} — attendu {attendu!r} · mesuré {mesure!r}")


def constat(ident, texte):
    constats.append(ident)
    print(f"· {ident:9} CONSTAT : {texte}")


def non_verifiable(ident, texte):
    non_verifiables.append(ident)
    print(f"? {ident:9} NON VÉRIFIABLE : {texte}")


def bras(libelle, attendu, mesure):
    bras_calibration[0] += 1
    ok = attendu == mesure
    if not ok:
        bras_calibration[1] += 1
    print(f"   {'✓' if ok else '✗'} calibration {libelle} : {mesure!r} (attendu {attendu!r})")


# ───────────────────────────── extracteurs, chacun calibré ─────────────────────────────

def chemins_declares(texte):
    """Les chemins COMPLETS déclarés par une table : chaque jeton entre accents graves qui ressemble à un chemin de fichier (une barre OU une extension connue)."""
    out = set()
    lignes_table = "\n".join(l for l in texte.split("\n") if l.startswith("|"))   # LIGNES DE TABLE seulement : un chemin cité dans la prose n'est pas un fichier déclaré
    for m in re.finditer(r"`([^`\n]+)`", lignes_table):
        for jeton in m.group(1).split(", "):
            jeton = jeton.strip()
            if re.fullmatch(r"[A-Za-z0-9_@.\-/\[\]]+\.[A-Za-z0-9]+", jeton) and ("/" in jeton or re.search(r"\.(md|py|ts|tsx|json|txt|sql|png|pdf|mjs|yml)$", jeton)):
                out.add(jeton)
    return out


def section(texte, debut):
    """Les lignes de la section dont le titre commence par `debut` (titre compris), jusqu'au titre `#`-niveau ≤ 3 suivant (exclu). [] si le titre manque."""
    lignes = texte.split("\n")
    idx = [i for i, l in enumerate(lignes) if l.startswith(debut)]
    if not idx:
        return []
    i = idx[0]
    j = len(lignes)
    for k in range(i + 1, len(lignes)):
        if re.match(r"#{1,3} ", lignes[k]):
            j = k
            break
    return lignes[i:j]


def ecarts_de_lignes(a, b):
    """[(opération, anciennes lignes, nouvelles lignes)] de tout ce qui n'est pas égal entre deux listes de lignes."""
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    return [(tag, a[i1:i2], b[j1:j2]) for tag, i1, i2, j1, j2 in sm.get_opcodes() if tag != "equal"]


def ajout_en_fin_seulement(op):
    """Vrai si l'écart est un REMPLACEMENT de lignes où chaque nouvelle ligne commence par l'ancienne (une annotation posée au bout, rien d'effacé)."""
    tag, anciennes, nouvelles = op
    return tag == "replace" and len(anciennes) == len(nouvelles) and all(n.startswith(o) and len(n) > len(o) for o, n in zip(anciennes, nouvelles))


def blocs_mutations(texte):
    """[(id, statut, intitulé, bloc)] des blocs « [MORD|MUETTE] <id> — <intitulé> » d'une sortie de la sonde 5 (début de ligne seulement)."""
    out = []
    ms = list(re.finditer(r"^\[(MORD|MUETTE)\] (\S+) — (.*)$", texte, re.M))
    for i, m in enumerate(ms):
        fin = ms[i + 1].start() if i + 1 < len(ms) else len(texte)
        out.append((m.group(2), m.group(1), m.group(3), texte[m.start():fin]))
    return out


def canaux(bloc):
    """[(canal, statut, ligne)] des lignes « · <canal>  <STATUT>  <n>s … » d'un bloc de mutation."""
    return [(m.group(1), m.group(2), m.group(0)) for m in re.finditer(r"^   · (\S+)\s+(MORD|MUETTE|ÉCHEC SANS ASSERTION)\s+\d+s .*$", bloc, re.M)]


def mord_par_assertion(ligne):
    """Une ligne de canal vitest (unit-api, int, pro) qui MORD par une `AssertionError` lue (D304)."""
    return "→ AssertionError" in ligne


def points_ok(texte):
    """(nombre de lignes « ✓ … » en début de ligne, nombre de lignes « ✗ … » en début de ligne) d'une sortie de sonde."""
    return (len(re.findall(r"^\s*✓ ", texte, re.M)), len(re.findall(r"^\s*✗ ", texte, re.M)))


def bilan(texte):
    """(ok, ko, constats) de la ligne « == BILAN : N ✓ · M ✗ [...] · K constat(s) [...] » ; None si elle manque."""
    m = re.search(r"^== BILAN : (\d+) ✓ · (\d+) ✗ \[[^\]]*\] · (\d+) constat", texte, re.M)
    return None if m is None else (int(m.group(1)), int(m.group(2)), int(m.group(3)))


def lignes_P(texte):
    """{harnais: (passe, plancher)} des lignes « P <harnais> <passe> <secondes> »."""
    return {m.group(1): (m.group(2), m.group(3)) for m in re.finditer(r"^P (\S+) (\S+) ([\d.]+)$", texte, re.M)}


def epoch_local(texte_date):
    """« 15/10/2026 13:16:44 » (heure locale du poste, UTC−4) → secondes epoch."""
    m = re.match(r"(\d\d)/(\d\d)/(\d{4}) (\d\d):(\d\d):(\d\d)", texte_date)
    d = datetime(int(m.group(3)), int(m.group(2)), int(m.group(1)), int(m.group(4)), int(m.group(5)), int(m.group(6)), tzinfo=FUSEAU)
    return int(d.timestamp())


def push_epochs(reflog):
    """{sha7: epoch} des lignes « <sha> refs/remotes/origin/main@{AAAA-MM-JJ hh:mm:ss -0400}: update by push »."""
    out = {}
    for m in re.finditer(r"^([0-9a-f]{7,}) refs/remotes/origin/main@\{(\d{4})-(\d\d)-(\d\d) (\d\d):(\d\d):(\d\d) ([+-])(\d\d)(\d\d)\}: update by push", reflog, re.M):
        sg = 1 if m.group(8) == "+" else -1
        tz = timezone(sg * timedelta(hours=int(m.group(9)), minutes=int(m.group(10))))
        out[m.group(1)[:7]] = int(datetime(int(m.group(2)), int(m.group(3)), int(m.group(4)), int(m.group(5)), int(m.group(6)), int(m.group(7)), tzinfo=tz).timestamp())
    return out


def numstat_blobs(a_octets, b_octets):
    """(ajoutées, retirées) de `git diff --no-index --numstat` entre deux contenus (fichiers temporaires)."""
    with tempfile.TemporaryDirectory() as d:
        pa, pb = os.path.join(d, "a"), os.path.join(d, "b")
        open(pa, "wb").write(a_octets)
        open(pb, "wb").write(b_octets)
        r = subprocess.run(["git", "diff", "--no-index", "--numstat", pa, pb], capture_output=True).stdout.decode()
    m = re.match(r"(\d+)\t(\d+)\t", r)
    return (0, 0) if m is None else (int(m.group(1)), int(m.group(2)))


def migrations_du_depot(sha):
    """Les DOSSIERS de migration de `apps/api/prisma/migrations` (jamais `migration_lock.toml`, défaut de l'instrument de D334)."""
    noms = set()
    for l in liste_arbre(sha, "apps/api/prisma/migrations"):
        parts = l.split("/")
        if len(parts) >= 6 and parts[4] != "migration_lock.toml":
            noms.add(parts[4])
    return noms


# ───────────────────────────── calibrations (deux bras par extracteur) ─────────────────────────────

def calibrations():
    print("CALIBRATION DES EXTRACTEURS (deux bras chacun ; abandon si un bras manque)")
    bras("chemins_declares, faux — un chemin cité dans la PROSE (hors ligne de table) n'est pas un fichier déclaré", set(), chemins_declares("on ne reprend pas `neutralize-r39.py` ni `docs/x/y.py` dans ce paragraphe"))
    t = "| `a/b.py` | x |\n| `ZWADJ_CONTINUITE.md` | y |\n| `git` | z |\n| `docs/preuves/D1/c.txt, docs/preuves/D1/d.txt` | w |"
    bras("chemins_declares, vrai — 4 chemins dont deux dans un même jeton (« , »), `git` écarté", {"a/b.py", "ZWADJ_CONTINUITE.md", "docs/preuves/D1/c.txt", "docs/preuves/D1/d.txt"}, chemins_declares(t))
    bras("chemins_declares, faux — aucun chemin entre accents graves", set(), chemins_declares("a/b.py sans accents graves ; `git` ; `nom`"))
    s = "### A\nl1\nl2\n### B\nl3"
    bras("section, vrai — le titre A et ses deux lignes, B exclu", ["### A", "l1", "l2"], section(s, "### A"))
    bras("section, faux — un titre absent rend []", [], section(s, "### Z"))
    ops = ecarts_de_lignes(["a", "b", "c"], ["a", "b suite", "c"])
    bras("ajout_en_fin_seulement, vrai — « b » devient « b suite »", [True], [ajout_en_fin_seulement(o) for o in ops])
    ops = ecarts_de_lignes(["a", "b 482 mordues", "c"], ["a", "b 483 mordues", "c"])
    bras("ajout_en_fin_seulement, faux — un nombre changé n'est PAS un ajout en fin de ligne", [False], [ajout_en_fin_seulement(o) for o in ops])
    bras("ecarts_de_lignes, vrai — deux listes identiques : aucun écart", [], ecarts_de_lignes(["a", "b"], ["a", "b"]))
    sortie = ("ancres : 3 mutations\n\n[MORD] CAL+ — étalon\n   apps/x.ts  (restauré : empreinte identique)\n"
              "   · int         MORD                    41s  75 passés · 4 en échec · 1er : f.spec.ts > t → AssertionError: expected 1\n"
              "   · sondes      MUETTE                   5s  ok\n\n[MUETTE] S-2 — deux lectures\n   · unit-api    MUETTE                   5s  184 passés\n"
              "   · int         ÉCHEC SANS ASSERTION    40s  78 passés · 1 en échec · 1er : f > t → error: boom\n\nligne [MORD] X — au milieu d'une ligne, ne compte pas")
    bl = blocs_mutations(sortie)
    bras("blocs_mutations, vrai — deux blocs (CAL+ MORD, S-2 MUETTE) ; la mention au milieu d'une ligne ne compte pas", [("CAL+", "MORD"), ("S-2", "MUETTE")], [(b[0], b[1]) for b in bl])
    bras("blocs_mutations, faux — une sortie sans bloc rend []", [], blocs_mutations("== BILAN : 0 mutations\n"))
    bras("canaux, vrai — trois lignes de canal dans CAL+ et S-2, dont « ÉCHEC SANS ASSERTION »", [("int", "MORD"), ("sondes", "MUETTE")], [(c[0], c[1]) for c in canaux(bl[0][3])])
    bras("canaux, vrai — le statut ÉCHEC SANS ASSERTION est lu", [("unit-api", "MUETTE"), ("int", "ÉCHEC SANS ASSERTION")], [(c[0], c[1]) for c in canaux(bl[1][3])])
    bras("canaux, faux — un bloc sans ligne de canal rend []", [], canaux("[MORD] X — y\n   apps/x.ts  (restauré)\n"))
    bras("mord_par_assertion, vrai — « → AssertionError » lu", True, mord_par_assertion("… 1er : f > t → AssertionError: expected 1"))
    bras("mord_par_assertion, faux — « → error: boom » n'est pas une assertion", False, mord_par_assertion("… 1er : f > t → error: boom"))
    bras("points_ok, vrai — deux ✓ et un ✗ en début de ligne", (2, 1), points_ok("✓ A-1 x\n✓ A-2 y\n✗ A-3 z\ntexte ✓ au milieu\n"))
    bras("points_ok, faux — des ✓ au milieu d'une ligne ne comptent pas", (0, 0), points_ok("le bilan est ✓ ici ✗ là\n"))
    bras("bilan, vrai — « == BILAN : 29 ✓ · 0 ✗ [] · 0 constat(s) [] »", (29, 0, 0), bilan("x\n== BILAN : 29 ✓ · 0 ✗ [] · 0 constat(s) []"))
    bras("bilan, faux — une sortie sans bilan rend None", None, bilan("29 ✓ sans le mot BILAN"))
    bras("lignes_P, vrai — une ligne P bien formée", {"argon2": ("tout", "4.83")}, lignes_P("# commentaire\nP argon2 tout 4.83\n"))
    bras("lignes_P, faux — un commentaire seul rend {}", {}, lignes_P("# P argon2 tout 4.83\n"))
    bras("epoch_local, vrai — 13:16:44 (UTC−4) est 17:16:44 UTC", int(datetime(2026, 10, 15, 17, 16, 44, tzinfo=timezone.utc).timestamp()), epoch_local("15/10/2026 13:16:44"))
    bras("epoch_local, faux — 13:16:44 n'est PAS 13:16:44 UTC", False, epoch_local("15/10/2026 13:16:44") == int(datetime(2026, 10, 15, 13, 16, 44, tzinfo=timezone.utc).timestamp()))
    rl = "6e78b23 refs/remotes/origin/main@{2026-10-15 13:16:33 -0400}: update by push\n9999999 refs/remotes/origin/main@{2026-10-15 13:17:00 -0400}: fetch origin"
    bras("push_epochs, vrai — la ligne « update by push » est lue", {"6e78b23": int(datetime(2026, 10, 15, 17, 16, 33, tzinfo=timezone.utc).timestamp())}, push_epochs(rl))
    bras("push_epochs, faux — une ligne « fetch » n'est PAS une poussée", {}, push_epochs("9999999 refs/remotes/origin/main@{2026-10-15 13:17:00 -0400}: fetch origin"))
    bras("numstat_blobs, vrai — une ligne ajoutée, une retirée", (1, 1), numstat_blobs(b"a\nb\nc\n", b"a\nB\nc\n"))
    bras("numstat_blobs, faux — deux contenus identiques : (0, 0)", (0, 0), numstat_blobs(b"a\nb\n", b"a\nb\n"))
    bras("est_code, vrai — un fichier de l'application est du code", True, est_code("apps/api/src/venues/quote-reference.ts"))
    bras("est_code, faux — une pièce et un fichier d'autorité n'en sont pas", (False, False), (est_code("docs/preuves/D334/x.txt"), est_code(CONT)))
    bras("noms_diff, vrai — une plage qui change du code en rend", True, any(est_code(n) for n in noms_diff("2782be9", REPAR)))
    bras("noms_diff, faux — une plage vide (un SHA contre lui-même) rend []", [], noms_diff(DEPART, DEPART))
    ms = migrations_du_depot(FIN)
    bras("migrations_du_depot, faux — `migration_lock.toml` n'est PAS une migration", False, "migration_lock.toml" in ms)
    bras("migrations_du_depot, vrai — la migration A de L35-3 en est une", True, "20261015100000_venue_number" in ms)
    print(f"   calibration des extracteurs : {bras_calibration[0]} bras joués, {bras_calibration[1]} manqué(s)")
    if bras_calibration[1]:
        sys.exit("CALIBRATION MANQUÉE — la lecture s'arrête")
    print()


# ───────────────────────────── familles ─────────────────────────────

def famille_G():
    print("FAMILLE G — git : l'ordre des commits, la provenance du code, la déclaration des fichiers")
    cont = show(FIN, CONT)
    zone_ordre = cont[cont.find("#### Ordre des commits de ce lot"):cont.find("#### Fichiers attendus — table recopiée")]   # la table d'ordre SEULE : le registre a d'autres lignes « | N | `sha` | »
    sha_texte = re.findall(r"^\| (\d+) \| `([0-9a-f]{7})` \|", zone_ordre, re.M)
    attendus = [s for _, s in sha_texte]
    reels = [complet_s[:7] for complet_s in git("rev-list", "--reverse", f"{DEPART}..{FIN}").decode().split("\n") if complet_s]
    ctl("G1", f"les commits de D334 (rev-list {DEPART}..{FIN}) = les 12 SHA de la table « ordre des commits » du point d'entrée + le 13ᵉ « (celui-ci) » = {FIN} — {len(reels)} commits parcourus, {len(attendus)} lignes de table lues", attendus + [FIN], reels)
    ordre = {s: i for i, s in enumerate(reels)}
    ouv, lect, d277, ko1, dec, ext1, adv, ext2, etape0, prot, ext3, tent = ("91528f5", "11b3879", "245cf70", "ca882e8", "c8222d4", "ed5a87e", "ce1a5f1", "fc797f7", "d6d376a", PROTOCOLE, "a642123", "2385da7")
    ctl("G2", "le PREMIER commit de D334 ne contient que `docs/preuves/D334/table-ouverture.md`", [f"{PD}/table-ouverture.md"], noms_commit(ouv))
    avant_ko1 = reels[: ordre[ko1]]
    touche_autorite = [c for c in avant_ko1 if any(n in AUTORITES for n in noms_commit(c))]
    ctl("G3", f"avant la première écriture d'autorité ({ko1}), aucun des {len(avant_ko1)} commits ({', '.join(avant_ko1)}) ne touche un `.md` d'autorité ; la lecture adverse ({lect}) et la première passe D277 ({d277}) y sont", ([], True, True), (touche_autorite, ordre[lect] < ordre[ko1], ordre[d277] < ordre[ko1]))
    ctl("G4", "la première écriture d'autorité (ca882e8) ne contient que `ZWADJ_CONTINUITE.md`", [CONT], noms_commit(ko1))
    num = git("show", "--numstat", "--format=", ko1).decode().split("\n")[0].split("\t")
    ctl("G5", "ca882e8 n'efface RIEN (0 ligne retirée) : c'est un ajout seul", "0", num[1])
    arb_ko1 = aplati(show(ko1, CONT))
    arb_fin = aplati(show(FIN, CONT))
    m = re.search(r"« 1\. J'ai joué les six scénarios.{0,700}?4\. Rang 40 : la session adverse de L35-3, puis la certification qui couvre D331, D332 et D333\. »", arb_ko1)
    ctl("G6", "le texte de Ko (quatre points) écrit par ca882e8 est présent, MOT POUR MOT, à la clôture (b92dc7a) — texte comparé aplati", (True, True), (m is not None, m is not None and m.group(0) in arb_fin))
    tables = {c: chemins_declares(show(c, f"{PD}/table-ouverture.md")) for c in (ouv, ext1, ext2, ext3, FIN)}
    for ext_c, piece_c, libelle in ((ext1, adv, "la session adverse"), (ext2, etape0, "l'étape 0"), (ext3, tent, "la tentative de passe")):
        fichiers = noms_commit(piece_c)
        non_decl = [n for n in fichiers if n not in tables[ext_c]]
        ctl(f"G7{'abc'[(ext1, ext2, ext3).index(ext_c)]}", f"l'extension {ext_c} précède le commit {piece_c} ({libelle}) et déclare ses {len(fichiers)} fichiers en chemins complets", (True, []), (ordre[ext_c] < ordre[piece_c], non_decl))
    for c, base in ((lect, ouv), (d277, ouv)):
        fichiers = noms_commit(c)
        non_decl = [n for n in fichiers if n not in tables[base]]
        ctl(f"G8{'ab'[(lect, d277).index(c)]}", f"les {len(fichiers)} fichiers du commit {c} sont déclarés par la table d'ouverture (premier commit)", [], non_decl)
    tous = noms_diff(DEPART, FIN)
    non_decl_total = [n for n in tous if n not in AUTORITES and n not in tables[FIN]]
    ctl("G9", f"TOUT le diff {DEPART}..{FIN} ({len(tous)} fichiers parcourus) = les trois `.md` d'autorité + des chemins déclarés par la table finale (extensions comprises)", [], non_decl_total)
    code = [n for n in tous if est_code(n)]
    ctl("G10", f"le code mesuré est celui de {DEPART} : le diff {DEPART}..{FIN} ({len(tous)} fichiers parcourus) ne contient, hors `docs/preuves/`, que les trois `.md` d'autorité", [], code)
    tous2 = noms_diff(REPAR, FIN)
    ctl("G11", f"…et celui de {REPAR} (dernier commit de D333 qui touche du code) : le diff {REPAR}..{FIN} ({len(tous2)} fichiers parcourus) ne contient aucun fichier de code", [], [n for n in tous2 if est_code(n)])
    tous3 = noms_diff(PROTOCOLE, OUV335)
    ctl("G12", f"« HEAD aura avancé de commits de documentation seulement » : le diff {PROTOCOLE}..{OUV335} ({len(tous3)} fichiers parcourus) ne contient aucun fichier de code ni de harnais", [], [n for n in tous3 if est_code(n)])
    # le protocole est commité et poussé AVANT la tentative
    reflog = git("reflog", "show", "origin/main", "--date=iso").decode()
    pushs = push_epochs(reflog)
    commit_epoch = int(git("log", "-1", "--format=%ct", PROTOCOLE).decode().strip())
    prog = show(FIN, f"{PD}/passe-NON-DEMARREE-r40-20261015-1316/progression.txt")
    debut = epoch_local(prog.split("\n")[0])
    ctl("G13", "le protocole (6e78b23) est commité avant la tentative (heure du commit < première ligne de la progression de la passe)", True, commit_epoch < debut)
    ctl("G14", "…et POUSSÉ avant la tentative (reflog de `origin/main` : « update by push » de 6e78b23 antérieur à la première ligne de la progression)", True, PROTOCOLE in pushs and pushs[PROTOCOLE] < debut)
    print(f"             (commit {commit_epoch - debut:+d} s, poussée {pushs.get(PROTOCOLE, 0) - debut:+d} s par rapport à la première ligne de la progression ; heures locales du poste, UTC−4)")
    ctl("G15", "les pièces de la tentative (2385da7) ne sont pas antérieures à la poussée du protocole", True, ordre[tent] > ordre[prot])
    print()


def famille_P():
    print("FAMILLE P — le protocole de la certification, comparé LIGNE À LIGNE entre le commit qui l'a posé et la clôture")
    titre = "### ⛔ LA CERTIFICATION QUI COUVRE D331, D332 ET D333 (D334)"
    avant = section(show(PROTOCOLE, CONT), titre)
    apres = section(show(FIN, CONT), titre)
    ctl("P1", f"la section du protocole existe aux deux SHA — lignes parcourues : {len(avant)} (à 6e78b23) et {len(apres)} (à b92dc7a)", (True, True), (len(avant) > 30, len(apres) > 30))
    ops = ecarts_de_lignes(avant, apres)
    ctl("P2", f"TOUT écart de la section entre 6e78b23 et b92dc7a est un AJOUT EN FIN DE LIGNE (une annotation) — {len(ops)} écart(s) trouvé(s) sur {len(avant)} lignes comparées", [True] * len(ops), [ajout_en_fin_seulement(o) for o in ops])
    for k, (tag, anc, nouv) in enumerate(ops):
        reste = nouv[0][len(anc[0]):] if anc and nouv else ""
        print(f"             écart {k + 1} : {tag}, ligne ancienne {anc[0][:70]!r}… ; texte ajouté : {reste.strip()[:150]!r}…")
    chiffres = ("482 mordues", "527 mordues", "1 871 / 141", "493/39", "55 passés", "197", "37 campagnes")   # « 4 579 » est volontairement HORS de la liste : l'annotation ajoutée à la clôture le cite (c'est elle, l'écart de P2)
    manquants = [c for c in chiffres if aplati("\n".join(avant)).count(c) != aplati("\n".join(apres)).count(c)]
    ctl("P3", "les prédictions chiffrées (482 mordues, 527 mordues, 1 871 / 141, 493/39, 55 passés, 197, 37 campagnes) ont le MÊME nombre d'occurrences aux deux SHA", [], manquants)
    base = "\n".join(avant)
    sans = [c for c in chiffres + ("4 579",) if c not in aplati(base)]
    ctl("P4", "…et chacun existe bien dans la section (un chiffre absent des deux rendrait P3 vrai pour rien) ; « 4 579 » (la barre) aussi", [], sans)
    print()


def famille_S():
    print("FAMILLE S — la session adverse de L35-3 (rapport, six sorties, 54 mutations)")
    rapport = show(FIN, f"{PD}/session-adverse/RAPPORT.txt")
    sorties = {n: show(FIN, f"{PD}/session-adverse/sortie-{n}.txt") for n in ("1-migrations", "2-gardes-de-base", "3-concurrence", "4-api", "5-mutations", "6-derive")}
    for ident, n, att in (("S1", "1-migrations", (29, 0, 0)), ("S2", "2-gardes-de-base", (37, 0, 5)), ("S3", "3-concurrence", (18, 0, 0)), ("S4", "6-derive", (2, 0, 1))):
        b = bilan(sorties[n])
        po = points_ok(sorties[n])
        ctl(ident, f"sortie {n} : le BILAN dit {att[0]} ✓ · {att[1]} ✗ · {att[2]} constat(s) ; les lignes « ✓ » recomptées dans la sortie = le bilan — {po[0]} ✓ et {po[1]} ✗ parcourus", (att, att[0], att[1]), (b, po[0], po[1]))
    s4 = sorties["4-api"]
    hotes = re.findall(r"^HOTE\|TZ=([^|]*)\|Intl=([^|]*)\|", s4, re.M)
    passes = re.findall(r"^\s+Tests\s+(\d+) passed \((\d+)\)", s4, re.M)
    ctl("S5", f"sortie 4-api : six fuseaux d'hôte, quinze tests chacun, tous passés — {len(hotes)} hôtes et {len(passes)} résumés « Tests … passed » parcourus", (6, [("15", "15")] * 6, 6, 0), (len(hotes), passes, len(passes), len(re.findall(r"failed", s4))))
    ctl("S5b", "sortie 4-api : les six fuseaux sont six fuseaux DISTINCTS (le natif Toronto compris)", 6, len({i for _, i in hotes}))
    s5 = sorties["5-mutations"]
    bl = blocs_mutations(s5)
    m_anc = re.search(r"^ancres : (\d+) mutations, (\d+) ancre\(s\) fausse\(s\)", s5, re.M)
    rep = re.search(r"^   répartition : \{'MORD': (\d+), 'MUETTE': (\d+)\}", s5, re.M)
    ctl("S6", f"sortie 5 : 54 blocs de mutation, 0 ancre fausse ; la répartition imprimée = le recompte des blocs — {len(bl)} blocs parcourus", (54, 0, (52, 2), (52, 2)), (len(bl), int(m_anc.group(2)) if m_anc else None, (int(rep.group(1)), int(rep.group(2))) if rep else None, (sum(1 for b in bl if b[1] == "MORD"), sum(1 for b in bl if b[1] == "MUETTE"))))
    muettes = sorted(b[0] for b in bl if b[1] == "MUETTE")
    ctl("S7", "les deux muettes sont l'étalon négatif CAL- (DOIT rester muet) et S-2 (équivalente, NB-7)", ["CAL-", "S-2"], muettes)
    propres = [b for b in bl if b[0] not in ("CAL+", "CAL-")]
    propres_mordues = [b for b in propres if b[1] == "MORD"]
    ctl("S8", f"mutations PROPRES = 54 − 2 étalons = 52 ; mordues parmi elles = 51 (CAL+ est l'étalon POSITIF) — {len(propres)} propres parcourues", (52, 51), (len(propres), len(propres_mordues)))
    constat("S8-C1", "D334 écrit « 52 mutations propres mordues sur 54 (2 muettes : 1 étalon, 1 équivalente) » (RAPPORT, section D334, point d'entrée) : les 52 mordues INCLUENT l'étalon positif CAL+. Le recompte exact est 51 mutations PROPRES mordues sur 52, plus 2 étalons (CAL+ mord, CAL− reste muet comme exigé) ; S-2 est la seule propre muette. Imprécision de formulation, pas de fond.")
    # restauration à l'octet
    avec_fichier = [b for b in bl if re.search(r"^   \S+\.(ts|tsx|sql|py|json)\s+\(restauré : empreinte identique\)", b[3], re.M)]
    sans_restauration = [b[0] for b in bl if re.search(r"^   \S+\.(ts|tsx|sql|py|json)\s+\(", b[3], re.M) and "(restauré : empreinte identique)" not in b[3]]
    ctl("S9", f"chaque mutation qui touche un fichier le dit « restauré : empreinte identique » — {len(avec_fichier)} blocs avec fichier restauré sur {len(bl)}", [], sans_restauration)
    fin = re.search(r"arbre à la fin : fichiers suivis modifiés = \[(.*?)\] \(attendu \[\]\)", s5)
    ctl("S10", "sortie 5 : l'arbre à la fin n'a aucun fichier suivi modifié", "", fin.group(1) if fin else None)
    # par quel canal chaque mordue mord
    sans_natif, sans_assertion = [], []
    for ident, st, _, bloc in bl:
        if st != "MORD" or ident == "CAL+":
            continue
        cs = canaux(bloc)
        natifs = [c for c in cs if c[0] in ("unit-api", "int", "pro") and c[1] == "MORD"]
        if not natifs:
            sans_natif.append(ident)
        elif not any(mord_par_assertion(c[2]) for c in natifs):
            sans_assertion.append(ident)
    ctl("S11", f"toute mutation propre mordue PAR UN CANAL VITEST (unit-api, int, pro) l'est en `AssertionError` lue — {len(propres_mordues)} mordues parcourues", [], sans_assertion)
    if sans_natif:
        constat("S11-C1", f"{len(sans_natif)} mutations propres ne sont mordues QUE par un canal qui n'est pas une suite du dépôt (les sondes SQL et Python de la session adverse, ou un échec sans assertion) : {', '.join(sans_natif)}. Elles prouvent que la garde mord quand on la sonde ; elles ne prouvent pas qu'une suite du dépôt rougirait (la suite du dépôt, elle, relève de `neutralize-r39.py`, joué par la passe). La décision 1 du relecteur demandait « lis chaque échec (assertion native) » ; D334 ne dit « mordue par une sonde seule » que de MB-9 (NB-7) — les autres ne sont pas nommées. Entrée de backlog, non bloquante.")
    echec_sans = sorted({b[0] for b in bl for c in canaux(b[3]) if c[1] == "ÉCHEC SANS ASSERTION"})
    if echec_sans:
        constat("S11-C2", f"le canal `int` a rendu « ÉCHEC SANS ASSERTION » (un échec dont la 1ʳᵉ ligne n'est pas une `AssertionError`, D304) pour : {', '.join(echec_sans)} ; la sortie les classe tout de même MORD (par un autre canal). Lecture à D304 : seul le canal assertion fait foi.")
    # cohérence rapport / sorties
    ctl("S12", "le RAPPORT annonce les mêmes totaux que les sorties (29 ✓, 37 ✓, 18 ✓, 15/15 six fois, 52 mordues · 2 muettes, 2 ✓ · 1 constat, 120 sessions, 54 mutations)", True, all(t in rapport for t in ("29 ✓ · 0 ✗", "37 ✓ · 0 ✗ · 5 constats", "18 ✓ · 0 ✗", "15/15 six fois", "52 mordues · 2 muettes", "2 ✓ · 1 constat", "120 sessions PostgreSQL séparées", "54 mutations propres")))
    cas = {"23 h 59 à Alger le 31/12": "F-3", "deux salles créées en même temps": "A-3", "restauration de sauvegarde": "F-6", "révision d'une révision": "F-4", "suppression d'une salle qui a des devis": "A-8", "migration B sur copie de la base de développement": "F-5"}
    manque = [k for k, v in cas.items() if not re.search(rf"{re.escape(v)}", rapport)]
    ctl("S13", "les six cas demandés par le relecteur (23 h 59 à Alger le 31/12, deux salles simultanées, restauration, révision d'une révision, suppression avec devis, migration B sur copie) ont chacun leur mode (F-3, A-3, F-6, F-4, A-8, F-5) dans le rapport", [], manque)
    titres_s4 = set(re.findall(r"\b(A-\d+)\b", s4))
    ctl("S14", "sortie 4 : les tests A-3 (deux salles) et A-4 (23 h 59) et A-8 (suppression d'une salle avec devis) sont nommés dans la sortie vitest", (True, True, True), ("A-3" in titres_s4, "A-4" in titres_s4, "A-8" in titres_s4))
    # le dépôt est resté intact : pas de pièce d'adverse dans les sources, pas de fichier hors docs/preuves
    suivis = liste_arbre(FIN)
    adverses = [n for n in suivis if re.search(r"adverse", n, re.I) and not n.startswith("docs/preuves/")]
    ctl("S15", f"le dépôt à {FIN} ne porte AUCUNE pièce « adverse » hors `docs/preuves/` (la sonde TypeScript a été retirée) — {len(suivis)} fichiers suivis parcourus", [], adverses)
    nb = show(FIN, BACKLOG)
    zone = nb[nb.find("Reports du 15/10/2026"):] if "Reports du 15/10/2026" in nb else ""
    ids = [f"NB-{i}" for i in range(1, 10)]
    ctl("S16", "le backlog à la clôture porte NB-1 à NB-9 sous « Reports du 15/10/2026 — rang 40 »", [], [i for i in ids if i not in zone])
    non_verifiable("S17", "« 120 sessions PostgreSQL séparées » : somme de processus psql lancés par la session adverse ; les sorties 2 et 3 en montrent une partie, le total n'est pas recomptable depuis elles")
    non_verifiable("S18", "« la base de développement `zwadj` est intacte (27 migrations, 8 salles, 20 devis, avant comme après) » : ce fait vivait dans la base de Ko ; ni sa copie avant, ni sa copie après ne sont versées, et Ko a appliqué les migrations depuis (arbitrage du 17/10) — l'état d'alors ne se relit plus")
    non_verifiable("S19", "« les bases jetables sont supprimées » : l'état du serveur PostgreSQL après la session adverse n'est pas une pièce versée (voir X5 pour l'état vivant)")
    print()


def famille_K():
    print("FAMILLE K — l'étape 0 : les trois règles dans l'outil de passe, les planchers, les essais à blanc")
    cal = show(FIN, f"{PD}/etat/regles-calibration.txt")
    po = points_ok(cal)
    m = re.search(r"calibration des règles : (\d+) bras, (\d+) manqué", cal)
    regles = show(FIN, f"{PD}/outils/regles.py")
    appels = len(re.findall(r"^\s+bras\(\"", regles, re.M))
    ctl("K1", f"les trois règles : la calibration versée compte 12 bras tous ✓, 0 manqué ; le code de `regles.py` appelle `bras(` 12 fois — {po[0]} ✓ et {po[1]} ✗ parcourus", (12, 0, (12, 0), 12), (po[0], po[1], (int(m.group(1)), int(m.group(2))) if m else None, appels))
    passe = show(FIN, f"{PD}/outils/passe.py")
    tags = sorted(set(re.findall(r"\[D334 \((\d)\)\]", passe)))
    ctl("K2", "`passe.py` porte les cinq modifications déclarées, chacune marquée [D334 (n)] dans son code", ["1", "2", "3", "4", "5"], tags)
    p330 = git("show", f"{FIN}:docs/preuves/D330/outils/passe.py")
    p334 = git("show", f"{FIN}:{PD}/outils/passe.py")
    ns = numstat_blobs(p330, p334)
    ctl("K3", "`passe.py` de D334 contre celui de D330 : 52 lignes ajoutées et 10 retirées (le comptage de D334, recompté ici par `git diff --no-index --numstat`)", (52, 10), ns)
    ctl("K4", "`passe.py` applique la RAM d'ouverture par `regles.juger_ram_ouverture` et la clôture par `regles.juger_ram_cloture` ; `headless_shell` est compté par `regles` (porte dure)", (True, True, True), ("regles.juger_ram_ouverture" in passe, "regles.juger_ram_cloture" in passe, "regles.juger_navigateurs" in passe))
    # planchers
    pl = lignes_P(show(FIN, f"{PD}/plancher/plancher.txt"))
    der = show(FIN, f"{PD}/plancher/deriver-plancher-sortie.txt")
    mesures_decl = sorted(re.findall(r"^\s+(\S+)\s+MESURÉ\s+P ", der, re.M))
    reprises_decl = sorted(re.findall(r"^\s+(\S+)\s+REPRIS\s+P ", der, re.M))
    ctl("K5", f"plancher.txt : 33 lignes P, dont 26 REPRIS et 7 MESURÉS selon la sortie de dérivation — {len(pl)} lignes P lues, {len(reprises_decl)} REPRIS et {len(mesures_decl)} MESURÉS lus", (33, 26, 7), (len(pl), len(reprises_decl), len(mesures_decl)))
    harn_fin = {re.match(r"neutralisation/neutralize-(.+)\.py$", n).group(1) for n in liste_arbre(FIN, "neutralisation") if re.match(r"neutralisation/neutralize-.+\.py$", n)}
    harn_329 = {re.match(r"neutralisation/neutralize-(.+)\.py$", n).group(1) for n in liste_arbre(D329, "neutralisation") if re.match(r"neutralisation/neutralize-.+\.py$", n)}
    changes = sorted(h for h in harn_fin if h not in harn_329 or blob(FIN, f"neutralisation/neutralize-{h}.py") != blob(D329, f"neutralisation/neutralize-{h}.py"))
    ctl("K6", f"RECALCUL indépendant : les harnais neufs ou dont le blob a changé entre {D329} (D329) et {FIN} = les 7 à MESURER — {len(harn_fin)} harnais à {FIN}, {len(harn_329)} à {D329}", mesures_decl, changes)
    ctl("K7", "…et les 26 REPRIS sont exactement les autres harnais qui ont un plancher (ni mesurés, ni sans plancher)", sorted(h for h in pl if h not in mesures_decl), reprises_decl)
    sans_plancher = sorted(h for h in harn_fin if h not in pl)
    ctl("K8", "les harnais SANS plancher sont ceux dont le point 12 est une preuve LUE (rang23, available-on-api, r25, r26) — ni plus, ni moins", ["available-on-api", "r25", "r26", "rang23"], sans_plancher)
    pl329 = lignes_P(show(D329, "docs/preuves/D329/plancher/plancher.txt")) if blob(D329, "docs/preuves/D329/plancher/plancher.txt") else {}
    diff_repris = [h for h in reprises_decl if h in pl329 and pl329[h] != pl[h]]
    absents = [h for h in reprises_decl if h not in pl329]
    ctl("K9", f"chaque plancher REPRIS porte la valeur et la passe du plancher de D329 — {len(reprises_decl)} repris comparés à {len(pl329)} lignes de D329", ([], []), (diff_repris, absents))
    autres = [n for n in noms_diff(D324, FIN, "neutralisation") if not re.match(r"neutralisation/neutralize-.+\.py$", n)]
    ctl("K10", f"les pièces de `neutralisation/` qui ne sont pas des harnais n'ont pas changé depuis D324 ({D324}) — l'argument « les outils que les harnais lisent n'ont pas bougé » des planchers repris", [], autres)
    # essais à blanc
    e1 = show(FIN, f"{PD}/etat/essai-a-blanc-sortie.txt")
    e2 = show(FIN, f"{PD}/etat/essai-a-blanc-2-sortie.txt")
    ctl("K11", "le premier essai à blanc : arrêté sur la porte dure RAM (3 572,5 puis 3 597,5 Mo contre 4 579), rien lancé", (True, True, True), ("PORTE DURE ROUGE — RIEN N'EST LANCÉ" in e1, "médiane 3572.5 / bas de bande 3561" in e1, "barre 4579" in e1))
    ctl("K12", "le second essai à blanc se déclare « barre d'ouverture abaissée à 3 000 Mo POUR L'ESSAI SEUL » et diagnostic non certifiant ; il juge la clôture « SOUS LA BARRE : LA MARQUE EST REFUSÉE », sortie 6", (True, True, True), ("abaissée à 3 000 Mo POUR L'ESSAI SEUL" in e2, bool(re.search(r"non certifiant|NON CERTIFIANT", e2)), "SOUS LA BARRE : LA MARQUE EST REFUSÉE" in e2 and "code de sortie de la passe de fumée : 6 (attendu 6)" in e2))
    ctl("K13", "le second essai à blanc porte l'identifiant `fumee2-d334`, jamais un identifiant de passe `r40-…` ; il ne contient ni « MARQUE POSÉE » ni « Portes vertes AU REPOS »", (True, False, False), ("PASSE fumee2-d334" in e2, bool(re.search(r"MARQUE POSÉE|marque posée", e2)), "Portes vertes AU REPOS" in e2))
    dossiers = sorted({n.split("/")[3] for n in liste_arbre(FIN, PD) if n.split("/")[3].startswith("passe-")})
    ctl("K14", "à la clôture de D334, aucun dossier `passe-<ID>/` ne se donne pour une passe JOUÉE : seul `passe-NON-DEMARREE-…` (et `passe-d277`, la passe D277 des textes) existe", ["passe-NON-DEMARREE-r40-20261015-1316", "passe-d277"], dossiers)
    ctl("K15", "les deux essais à blanc vivent sous `etat/` (diagnostics), jamais sous un dossier de passe", (True, True), (f"{PD}/etat/essai-a-blanc-sortie.txt" in liste_arbre(FIN, PD), f"{PD}/etat/essai-a-blanc-2-sortie.txt" in liste_arbre(FIN, PD)))
    # aucun texte d'autorité ne cite un essai à blanc comme une MESURE : on cherche, dans le paragraphe qui les nomme, leur qualification
    cont = aplati(show(FIN, CONT))
    cites = [m.start() for m in re.finditer(r"essais? à blanc", cont)]
    sans_qualif = [i for i in cites if not re.search(r"non certifiant|NON CERTIFIANT|diagnostic", cont[max(0, i - 400): i + 600])]
    comme_marque = [i for i in cites if re.search(r"marque (est )?pos[ée]e|Portes vertes AU REPOS le 15/10", cont[max(0, i - 200): i + 300])]
    ctl("K16", f"AUCUNE des {len(cites)} mentions d'un « essai à blanc » dans `ZWADJ_CONTINUITE.md` (à {FIN}) n'est à moins de 200 caractères avant / 300 après d'une « marque posée » (aucun essai n'est lu comme une mesure certifiante)", [], comme_marque)
    constat("K16-C1", f"{len(sans_qualif)} de ces {len(cites)} mentions ne portent pas le mot « diagnostic » / « non certifiant » dans leurs 400 caractères d'avant et 600 d'après : " + " | ".join(repr(cont[max(0, i - 70): i + 90]) for i in sans_qualif) + " — à trier à la main : ce sont des descriptions, pas des affirmations de mesure.")
    print()


def famille_T():
    print("FAMILLE T — la tentative de passe r40-20261015-1316 (porte dure rouge, rien lancé)")
    d = f"{PD}/passe-NON-DEMARREE-r40-20261015-1316"
    fichiers = sorted(n.split("/")[-1] for n in liste_arbre(FIN, d))
    ctl("T1", f"le dossier de la tentative contient exactement les NEUF pièces brutes de l'extension 3 — {len(fichiers)} fichiers parcourus", sorted(["etat-env-ouverture.txt", "inventaire-ouverture.txt", "pg-ouverture.txt", "porte-dure.txt", "ports-ouverture.txt", "progression.txt", "sonde-ouverture-1.txt", "sonde-ouverture-2.txt", "sortie-standard.txt"]), fichiers)
    pd_ = show(FIN, f"{d}/porte-dure.txt")
    s1, s2 = show(FIN, f"{d}/sonde-ouverture-1.txt"), show(FIN, f"{d}/sonde-ouverture-2.txt")

    def val(t, cle):
        m = re.search(rf"^{cle}=(.*)$", t, re.M)
        return m.group(1).strip() if m else None
    mesures = (val(s1, "RAM_MEDIANE_MO"), val(s1, "RAM_BANDE_MO"), val(s2, "RAM_MEDIANE_MO"), val(s2, "RAM_BANDE_MO"))
    ctl("T2", "les deux sondes d'ouverture brutes portent 3 662 (3 649-3 667) puis 3 756,5 (3 660-3 862) Mo — les chiffres du texte de D334", ("3662", "3649-3667", "3756.5", "3660-3862"), mesures)
    barre = re.findall(r"barre (\d+)", pd_)
    ctl("T3", "porte-dure.txt : ROUGE, la barre est 4 579 Mo aux deux ouvertures, et chaque médiane ET chaque bas de bande est sous elle", (True, ["4579", "4579"], True), (pd_.startswith("ROUGE"), barre, all(float(v) < 4579 for v in (3662, 3649, 3756.5, 3660))))
    deficit = (int(4579 - 3756.5 + 0.5), 4579 - 3649)   # 822,5 → 823 : arrondi au plus proche, demi vers le haut (le round() de Python arrondit au pair : 822)
    ctl("T4", "le « déficit de 823 à 930 Mo » du texte = 4 579 − 3 756,5 (arrondi) et 4 579 − 3 649", (823, 930), deficit)
    prog = show(FIN, f"{d}/progression.txt")
    lancees = [l for l in prog.split("\n") if re.search(r"typecheck|lint|pnpm|test:int|test:e2e|build|--tout|campagne\b|arbre-1", l, re.I) and "calibration" not in l and "harnais" not in l]
    ctl("T5", f"la progression ne montre AUCUNE porte, AUCUNE campagne, AUCUN arbre lancés — {len(prog.splitlines())} lignes parcourues", [], lancees)
    ctl("T6", "…et se termine par « PORTE DURE ROUGE — RIEN N'EST LANCÉ »", True, prog.rstrip().split("\n")[-1].find("PORTE DURE ROUGE — RIEN N'EST LANCÉ") >= 0)
    ctl("T7", "les 12 bras de calibration des règles ont été joués par la tentative elle-même (« 12 bras, 0 manqué(s) »)", True, "calibration des règles : 12 bras, 0 manqué(s)" in prog)
    env = show(FIN, f"{d}/etat-env-ouverture.txt")
    inv = show(FIN, f"{d}/inventaire-ouverture.txt")
    ctl("T8", "à l'ouverture de la tentative : `.env` VERT (3 fichiers, 8 variables, 0 hôte non local) et `chrome` = 0, `headless_shell` = 0, `node` = 0", (True, True, True, True, True), ("PORTE : VERTE" in env, "fichiers 3 · variables d'URL 8 · hôtes non locaux 0" in env, "COMPTE chrome=0" in inv, "COMPTE headless_shell=0" in inv, "COMPTE node=0" in inv))
    out = show(FIN, f"{d}/sortie-standard.txt")
    ctl("T9", "sortie standard : la passe ne rapporte aucune marque ni aucun résultat de porte", (False, False), (bool(re.search(r"MARQUE POSÉE|Portes vertes AU REPOS", out)), bool(re.search(r"\b\d+ passed\b|Tests +\d+ passed", out))))
    # le nom du dossier dit ce qu'il est
    ctl("T10", "le dossier s'appelle `passe-NON-DEMARREE-…` et NON `passe-r40-…` (S-39) : aucun outil de lecture (`verser.py`, `lire-*.py`) ne cible ce dossier par son nom", True, "NON-DEMARREE" in d and not re.search(r"passe-r40-\d{8}-\d{4}$", d))
    non_verifiable("T11", "« les consommateurs de mémoire sont des processus de la machine de Ko, aucun n'est de cette session » : l'inventaire de la tentative ne nomme que `chrome`, `headless_shell`, `node`, `msedge` ; ce qui occupait ~1 Go en plus ne s'y lit pas (le texte le dit, comme limite)")
    print()


def famille_L():
    print("FAMILLE L — textes d'autorité")
    cont = show(FIN, CONT)
    reg = re.findall(r"^\| (D\d+) \|", cont, re.M)
    ctl("L1", f"la dernière ligne du registre de `ZWADJ_CONTINUITE.md` à {FIN} est D334, et D335 n'y figure pas — {len(reg)} lignes de registre parcourues", ("D334", False), (reg[-1] if reg else None, "D335" in reg))
    txt = aplati(cont)
    ctl("L2", "le point d'entrée du rang 40 dit « compteur TROIS » inchangé, « RANG 41 » non écrit, et n'a aucune marque", (True, True, False), ("TROIS INCHANGÉ" in txt or "TROIS, inchangé" in txt or "compteur **TROIS, inchangé" in txt, bool(re.search(r"« ?RANG 41 » n'est PAS écrit|« ?RANG 41 » non écrit|RANG 41 : EN ATTENTE D'ARBITRAGE DE KO\*\* n'est PAS écrit|« RANG 41 » n'est PAS écrit", txt)), "Portes vertes AU REPOS le 15/10/2026" in txt))
    ag = aplati(show(FIN, AGENTS))
    ctl("L3", "`AGENTS.md` porte la fin de session de D334 : la passe NON démarrée, rien certifié, compteur TROIS", (True, True), ("A EU LIEU" not in ag[ag.find("D334, fin de session"):ag.find("D334, fin de session") + 1500], "TROIS INCHANGÉ" in ag[ag.find("D334, fin de session"):ag.find("D334, fin de session") + 1500]))
    # la table recopiée dans le point d'entrée
    zone = "\n".join(l for l in cont.split("\n"))
    debut = zone.find("#### Fichiers attendus — table recopiée")
    fin = zone.find("### ⛔ LA CERTIFICATION QUI COUVRE D331, D332 ET D333")
    recopiee = chemins_declares(zone[debut:fin])
    table = chemins_declares(show(FIN, f"{PD}/table-ouverture.md"))
    ctl("L4", f"la table recopiée dans le point d'entrée = la table d'ouverture finale, comme ENSEMBLE de chemins complets (extensions comprises) — {len(recopiee)} chemins recopiés, {len(table)} dans la table", ([], []), (sorted(table - recopiee), sorted(recopiee - table)))
    ini = chemins_declares(show("91528f5", f"{PD}/table-ouverture.md"))
    ctl("L5", f"la table d'ouverture initiale (91528f5) est un SOUS-ENSEMBLE de la table finale : rien de ce qu'elle déclarait n'a été retiré — {len(ini)} chemins initiaux", [], sorted(ini - table))
    non_verifiable("L6", "les arbitrages de Ko du 15/10 (mot pour mot) : le texte du chat n'est pas dans le dépôt ; G6 prouve seulement que le texte écrit par ca882e8 est resté inchangé")
    print()


def famille_X():
    print("FAMILLE X — état LIVE (ce que dit le poste maintenant ; ne se rejoue pas)")
    st = git("status", "--porcelain").decode().split("\n")
    st = [l for l in st if l]
    hors = [l for l in st if not l.startswith("?? docs/preuves/D335/")]
    ctl("X1", f"arbre : seuls des fichiers NON SUIVIS sous `docs/preuves/D335/` (cette lecture) — {len(st)} lignes de `git status` parcourues", [], hors)
    ctl("X2", "aucun stash", "", git("stash", "list").decode().strip())
    head, orig = complet("HEAD"), complet("origin/main")
    ctl("X3", "HEAD = origin/main (après le `git fetch` du début de session)", orig, head)
    print(f"             HEAD = {head}")
    # .env
    with tempfile.TemporaryDirectory() as d:
        r = subprocess.run([sys.executable, "docs/preuves/D330/outils/etat-env.py", "relever", "lecture-d335", d], capture_output=True)
        f = os.path.join(d, "etat-env-lecture-d335.txt")
        texte = open(f, encoding="utf-8").read() if os.path.exists(f) else ""
    ancien = show(FIN, f"{PD}/etat/etat-env-avant-protocole.txt")
    emp = lambda t: sorted(re.findall(r"FICHIER (\S+) · octets \d+ · SHA256 ([0-9a-f]{64})", t))
    ctl("X4", f"les `.env` : porte VERTE (code 0, 0 hôte non local), et les trois empreintes SHA-256 sont IDENTIQUES à celles de l'étape 0 de D334 — {len(emp(texte))} fichiers relevés, aucune valeur lue", (0, 3, emp(ancien), True), (r.returncode, len(emp(texte)), emp(texte), "PORTE : VERTE" in texte))
    # base de développement (lecture seule)
    attendu_migs = len(migrations_du_depot(FIN))
    cmd = ["docker", "exec", "-i", "zwadj-db", "psql", "-U", "zwadj", "-d", "zwadj", "-X", "-q", "-A", "-t", "-F", "|", "-c", "select count(*), count(finished_at) from _prisma_migrations"]
    r = subprocess.run(cmd, capture_output=True, timeout=60)
    sortie = r.stdout.decode().strip()
    ctl("X5", f"base de développement `zwadj` : les {attendu_migs} migrations du dépôt (calculées depuis `git`) sont appliquées ET terminées (arbitrage de Ko, point 1 : « j'ai appliqué les migrations ») — SELECT de lecture seule", f"{attendu_migs}|{attendu_migs}", sortie)
    cmd2 = cmd[:-1] + ["select (select count(*) from venues), (select count(*) from quotes)"]
    r2 = subprocess.run(cmd2, capture_output=True, timeout=60)
    constat("X5-C1", f"base de développement, état d'aujourd'hui (salles | devis) : {r2.stdout.decode().strip()} — D334 relevait 8 salles et 20 devis ; Ko a rejoué des scénarios depuis (arbitrage du 17/10), l'écart n'est donc pas un défaut")
    # machine
    ps = subprocess.run(["powershell", "-NoProfile", "-Command",
                         "$o=Get-CimInstance Win32_OperatingSystem; 'RAM_LIBRE_MO=' + [math]::Round($o.FreePhysicalMemory/1024,1); "
                         "foreach($n in 'node','chrome','headless_shell','chromium'){ 'COMPTE '+$n+'='+(@(Get-Process -Name $n -ErrorAction SilentlyContinue)).Count }"], capture_output=True)
    sortie_ps = ps.stdout.decode("utf-8", errors="replace")
    ram = re.search(r"RAM_LIBRE_MO=([\d.,]+)", sortie_ps)
    comptes = dict(re.findall(r"COMPTE (\w+)=(\d+)", sortie_ps))
    ctl("X6", "aucun `node`, `chrome`, `headless_shell`, `chromium` vivant (relevé, pas une porte : la porte est celle de la passe)", {"node": "0", "chrome": "0", "headless_shell": "0", "chromium": "0"}, comptes)
    constat("X6-C1", f"RAM libre du poste à cet instant : {ram.group(1) if ram else '?'} Mo (la barre de la passe est celle que la sonde imprime — 4 579 Mo le 15/10 ; la porte dure est jugée par la passe, pas ici)")
    print()


def main():
    print("D335 — LECTURE ADVERSE DE D334 · instrument : docs/preuves/D335/lecture-adverse/confronter-d334.py")
    print(f"SHA fixés : départ {DEPART} · clôture de D334 {FIN} · table d'ouverture de ce lot {OUV335} · protocole {PROTOCOLE} · harnais D324 {D324} / D329 {D329}")
    print()
    calibrations()
    for nom, f in (("G", famille_G), ("P", famille_P), ("S", famille_S), ("K", famille_K), ("T", famille_T), ("L", famille_L), ("X", famille_X)):
        try:
            f()
        except Exception as e:  # une famille qui plante est un ÉCART, jamais un silence
            import traceback
            controles.append(nom + "-ERR")
            familles[nom] = familles.get(nom, 0) + 1
            (ecarts_live if nom == "X" else ecarts).append(nom + "-ERR")
            print(f"✗ {nom}-ERR    la famille {nom} a LEVÉ : {e!r}")
            traceback.print_exc(file=sys.stdout)
    print("=" * 100)
    print(f"BILAN : {len(controles)} contrôles · {len(controles) - len(ecarts) - len(ecarts_live)} ✓ · écarts de D334 : {len(ecarts)} {ecarts} · écarts de l'état vivant : {len(ecarts_live)} {ecarts_live}")
    print(f"        ventilation par famille : {dict(sorted(familles.items()))}")
    print(f"        constats : {len(constats)} {constats}")
    print(f"        non vérifiables : {len(non_verifiables)} {non_verifiables}")
    print(f"        calibration : {bras_calibration[0]} bras joués, {bras_calibration[1]} manqué(s) (attendu 0)")
    zeros = [k for k in "GPSKTLX" if familles.get(k, 0) == 0]
    print(f"        familles à zéro contrôle : {zeros} (attendu [])")
    sys.exit(1 if ecarts or ecarts_live or bras_calibration[1] else 0)


main()
