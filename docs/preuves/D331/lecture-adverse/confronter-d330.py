"""D331 — lecture adverse de D330 (rang 36, reprise : la seconde passe `r36b-20261013-0106`, MARQUE POSÉE), confrontée aux objets git à des SHA FIXÉS et aux pièces versées.

POURQUOI IL EXISTE
  Forme de Ko pour le rang 37 : « la lecture adverse depuis la clôture de D330, EN ENTIER, et EN ENTIER dans ton rapport final ; instrument versé ; objets git lus à des SHA fixés ; chaque extracteur calibré sur un cas vrai
  et un cas faux ; sortie versée avant toute écriture d'autorité ; contrôles, écarts, constats, et « non vérifiable » déclaré. En particulier : le tableau « prédit / mesuré » de D330 contre ses pièces ; l'état des `.env`
  (empreintes et hôtes) à l'ouverture et à la clôture, contre ses pièces ; la RAM : le relevé sous la barre, les 248 échantillons, la clôture ; la table recopiée dans `ZWADJ_CONTINUITE.md`, identique à `table-ouverture.md`.
  Aucune porte ni campagne n'est rejouée pour cette lecture. »
  Le dernier commit de D330 est sa clôture (`afdfcb1`) ; aucun commit ne la suit sinon la table d'ouverture de CE lot (`edfe644`, qui ne contient qu'elle). Chaque affirmation de D330 qui se vérifie dans le dépôt est
  confrontée à sa SOURCE : les pièces versées, les objets git, le texte des fichiers d'autorité. Une affirmation qui ne vit que dans le chat, ou dans un journal hors dépôt, est déclarée NON VÉRIFIABLE, pas cochée.

USAGE, depuis la racine (bash, jamais une redirection PowerShell — D298) :
  python3 docs/preuves/D331/lecture-adverse/confronter-d330.py > docs/preuves/D331/lecture-adverse/confronter-sortie.txt

LECTURE SEULE. Tout se lit par `git show <sha>:<chemin>` aux SHA fixés ci-dessous — jamais l'arbre de travail, SAUF : (1) la famille X (état LIVE : `git status`, `stash`, `fetch`, `rev-parse`, reflog) ; (2) la famille E
  (état VIVANT des fichiers `.env` du poste : empreinte SHA-256, taille, date, et la CLASSE de l'hôte de chaque variable d'URL — AUCUNE valeur n'est imprimée, aucun hôte non local n'est imprimé : le dépôt est public) ;
  (3) le dossier `node_modules` pour une dépendance (famille D) ; (4) les fins de ligne des trois `.md` (famille Q), lues sur l'arbre. AUCUN rejeu de porte ni de campagne ici.

INSTRUMENTS ÉCARTÉS : rejouer `confronter-d329.py` (D330) — il juge D329 et ses SHA ; réutiliser `lire-campagnes.py`, `lire-portes.py` ou `lire-etat.py` comme preuve de D330 — ce serait croire l'instrument qu'on juge :
  les chiffres des pièces sont ici RECOMPTÉS PAR DES EXPRESSIONS ÉCRITES ICI (journaux relus en entier, ANSI retiré, `etat.csv` recompté ligne à ligne, 21 sondes recomptées). Les assistants (`ctl`, calibration à deux
  bras, textes aplatis) sont ceux de D330, RÉÉCRITS ici : aucun import, l'instrument de D330 reste une pièce.

CALIBRATION, deux bras par extracteur (D286) : chacun est joué sur un cas où le fait est connu VRAI et sur un cas où il est connu FAUX ; abandon si un bras manque. Les comptes s'impriment avec ce qu'ils ont PARCOURU et
  leur attendu à côté (D290), le total des contrôles avec sa ventilation par famille (D295). Un attendu est DÉRIVÉ d'une pièce brute ou du texte de D330 — jamais écrit de mémoire (D275).
"""
import csv
import difflib
import hashlib
import os
import re
import subprocess
import sys
from datetime import datetime

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.exists("pnpm-workspace.yaml"):
    sys.exit("à lancer depuis la racine du dépôt")

FIN = "afdfcb1"        # clôture de D330
DEPART = "8f53011"     # SHA de départ de D330 = clôture de D329
OUV330 = "12de7c2"     # la table d'ouverture de D330 (seule)
PROTO = "77de612"      # le protocole de D330 = le SHA de sa passe
PROTO329 = "4202dd4"   # le protocole de D329
OUV331 = "edfe644"     # la table d'ouverture de CE lot (seule)
D324 = "257471d"       # SHA de la passe de D324
PD = "docs/preuves/D330"
PASSE = PD + "/passe-r36b-20261013-0106"
PD329 = "docs/preuves/D329"
PASSE329 = PD329 + "/passe-r36a-20261012-1651"
CONT, AGENTS, BACKLOG = "ZWADJ_CONTINUITE.md", "AGENTS.md", "ZWADJ_BACKLOG.md"
AUTORITES = (AGENTS, BACKLOG, CONT)
ANSI = re.compile(r"\x1b\[[0-9;]*m")

controles, ecarts, constats, ecarts_live, non_verifiables = [], [], [], [], []
familles: dict = {}


def git(*args, check=True):
    return subprocess.run(["git", *args], capture_output=True, check=check).stdout


def show(sha, chemin):
    return git("show", f"{sha}:{chemin}").decode("utf-8", errors="replace").replace("\r\n", "\n")


def existe(sha, chemin):
    return subprocess.run(["git", "cat-file", "-e", f"{sha}:{chemin}"], capture_output=True).returncode == 0


def blob(sha, chemin):
    return git("rev-parse", f"{sha}:{chemin}").decode().strip()


def aplati(t):
    return re.sub(r"\s+", " ", t)


def norm(t):
    """Espaces insécables (U+00A0, U+202F) ramenés à l'espace simple — le texte écrit « 1 718 » avec l'un ou l'autre."""
    return t.replace(" ", " ").replace(" ", " ")


def sans_ansi(t):
    return ANSI.sub("", t)


def nettoyer(c):
    return c.replace("*", "").replace("`", "")


def ctl(ident, libelle, attendu, mesure):
    ok = attendu == mesure
    controles.append(ident)
    familles[ident[0]] = familles.get(ident[0], 0) + 1
    if not ok:
        (ecarts_live if ident[0] in "XE" else ecarts).append(ident)
    print(f"{'✓' if ok else '✗'} {ident:7} {libelle} — attendu {attendu!r} · mesuré {mesure!r}")


def constat(ident, texte):
    constats.append(ident)
    print(f"· {ident:7} CONSTAT : {texte}")


def non_verifiable(ident, texte):
    non_verifiables.append(ident)
    print(f"? {ident:7} NON VÉRIFIABLE : {texte}")


# ── Extracteurs (chacun calibré plus bas) ────────────────────────────────────────────────────────────────────────────
def chemins_table(texte):
    """Les chemins en tête de ligne d'un tableau Markdown : `| \\`chemin\\` | … |` (peut en citer plusieurs séparés par une virgule). Ordre d'apparition, sans doublon, SANS retouche
    (un retour chariot dans un chemin est CONSERVÉ : c'est ce que la lecture doit voir)."""
    sortie = []
    for l in texte.split("\n"):
        m = re.match(r"\|\s*((?:`[^`|]+`(?:,\s*)?)+)\s*\|", l)
        if m:
            for c in re.findall(r"`([^`]+)`", m[1]):
                if c not in sortie and ("/" in c or c.endswith(".md")):
                    sortie.append(c)
    return sortie


def lignes_de_table(texte):
    """Les lignes de tableau dont la première cellule est un chemin entre accents graves, ligne entière, ordre d'apparition (doublons conservés)."""
    return [l for l in texte.split("\n") if re.match(r"\|\s*`[^`|]+`", l)]


def bloc_entre(texte, debut, fin):
    i = texte.find(debut)
    if i < 0:
        return None
    j = texte.find(fin, i + len(debut))
    return texte[i : j if j >= 0 else len(texte)]


def entiers(s):
    """Les entiers d'un texte, espaces de milliers acceptés (« 5 099 » → 5099, « 1 718 / 136 » → 1718, 136), décimales à virgule ignorées (« 4,5 » ne donne pas 4 et 5 → on les retire d'abord)."""
    s = re.sub(r"\d{1,3}(?: \d{3})+,\d+|\d+,\d+", " ", norm(s))
    return [int(x.replace(" ", "")) for x in re.findall(r"\d{1,3}(?: \d{3})+(?!\d)|\d+", s)]


def bilans_vitest(t):
    """Chaque couple de lignes « Test Files … » / « Tests … » d'un journal vitest, dans l'ordre : ((fichiers passés, en échec, total), (tests passés, en échec, total))."""
    t = sans_ansi(t)
    fl = re.findall(r"^\s*Test Files\s+(.*)$", t, re.M)
    tl = re.findall(r"^\s*Tests\s+(.*)$", t, re.M)

    def lire(s):
        p, f, tot = re.search(r"(\d+) passed", s), re.search(r"(\d+) failed", s), re.search(r"\((\d+)\)", s)
        return (int(p[1]) if p else 0, int(f[1]) if f else 0, int(tot[1]) if tot else None)

    return [(lire(a), lire(b)) for a, b in zip(fl, tl)]


def compte_done(t):
    return len(re.findall(r"^.*: Done$", sans_ansi(t), re.M))


def erreurs_ts(t):
    return len(re.findall(r"error TS\d+", sans_ansi(t)))


def duree_code(t):
    """(secondes, code) de la ligne « fin … · N s · code C » d'un fichier .heures."""
    m = re.search(r"· (\d+) s · code (-?\d+)", t)
    return (int(m[1]), int(m[2])) if m else None


def resume_tout(t):
    """(mordues, muettes, non mesurées, campagnes, secondes) de la ligne « MESURÉ : … » du tri."""
    m = re.search(r"MESURÉ : (\d+) garde\(s\) mordue\(s\) · (\d+) muette\(s\)/erreur\(s\) · (\d+) non mesurée\(s\) · (\d+) campagne\(s\) · (\d+)s", sans_ansi(t))
    return tuple(int(x) for x in m.groups()) if m else None


def gardes_mordues(t):
    """(mordues, cibles) de la ligne « N garde(s) mordue(s) sur M cible… » d'un harnais."""
    m = re.search(r"^(\d+) garde\(s\) mordue\(s\) sur (\d+) cible", sans_ansi(t), re.M)
    return (int(m[1]), int(m[2])) if m else None


def comptes_inventaire(t):
    return {k: int(v) for k, v in re.findall(r"^COMPTE (\S+)=(\d+)", t, re.M)}


def champs_sonde(t):
    d = {}
    for k in ("RAM_MEDIANE_MO", "BARRE_D273_MO", "NODE", "CHROME", "ALIM_SOURCE"):
        m = re.search(rf"^{k}=(\S+)", t, re.M)
        d[k] = m[1] if m else None
    m = re.search(r"^RAM_BANDE_MO=(\d+)-(\d+)", t, re.M)
    d["BANDE"] = (int(m[1]), int(m[2])) if m else None
    return d


def sous_la_barre(champs):
    """Un relevé de sonde est SOUS la barre si sa médiane OU sa bande basse l'est (la porte dure d'ouverture exige les deux au-dessus)."""
    return float(champs["RAM_MEDIANE_MO"]) < float(champs["BARRE_D273_MO"]) or champs["BANDE"][0] < float(champs["BARRE_D273_MO"])


def tally_sortie(texte):
    """(✓ de contrôle, ✗, bras de calibration ✓, constats, non vérifiables) d'une sortie de lecture adverse."""
    return (
        len(re.findall(r"^✓ ", texte, flags=re.M)),
        len(re.findall(r"^✗ ", texte, flags=re.M)),
        len(re.findall(r"^   ✓ ", texte, flags=re.M)),
        len(re.findall(r"^· ", texte, flags=re.M)),
        len(re.findall(r"^\? ", texte, flags=re.M)),
    )


def numerotes(bloc):
    """Les marqueurs « (N) » d'un bloc, pris dans l'ordre et SEULEMENT s'ils se suivent 1, 2, 3… (les « (i) » ou « n° 17 » d'un texte ne sont pas des marqueurs)."""
    acc = []
    for n in re.findall(r"\((\d+)\) ", bloc or ""):
        if int(n) == len(acc) + 1:
            acc.append(int(n))
    return acc


def nombre_en_lettres(s):
    """Un nombre français de 1 à 99 écrit en toutes lettres (« DIX-NEUF » → 19, « treize » → 13, « VINGT-ET-UN » → 21), ou None s'il n'est pas reconnu."""
    u = {"UN": 1, "DEUX": 2, "TROIS": 3, "QUATRE": 4, "CINQ": 5, "SIX": 6, "SEPT": 7, "HUIT": 8, "NEUF": 9}
    ad = {"DIX": 10, "ONZE": 11, "DOUZE": 12, "TREIZE": 13, "QUATORZE": 14, "QUINZE": 15, "SEIZE": 16}
    d = {"VINGT": 20, "TRENTE": 30, "QUARANTE": 40, "CINQUANTE": 50, "SOIXANTE": 60}
    mots = [m for m in re.split(r"[-\s]+", s.strip().upper()) if m and m != "ET"]
    if len(mots) == 1:
        m = mots[0]
        return u.get(m) or ad.get(m) or d.get(m)
    if len(mots) == 2:
        a_, b_ = mots
        if a_ in d and b_ in u:
            return d[a_] + u[b_]
        if a_ == "DIX" and b_ in ("SEPT", "HUIT", "NEUF"):
            return 10 + u[b_]
    return None


def etat_env(texte):
    """Un relevé de l'état des `.env` : ([(fichier, sha256, [(variable, [classes d'hôte])])], (fichiers, variables d'URL, non locaux), porte)."""
    fichiers, cur = [], None
    for l in texte.split("\n"):
        m = re.match(r"^FICHIER (\S+) · octets (\d+) · SHA256 ([0-9a-f]{64}) ", l)
        if m:
            cur = (m[1], m[3], [])
            fichiers.append(cur)
            continue
        m = re.match(r"^   URL (\w+) : (.*)$", l)
        if m and cur is not None:
            cur[2].append((m[1], [x.strip() for x in m[2].split(",")]))
    mr = re.search(r"^RÉSUMÉ fichiers (\d+) · variables d'URL (\d+) · hôtes non locaux (\d+)", texte, re.M)
    mp = re.search(r"^PORTE : (\w+)", texte, re.M)
    return fichiers, (tuple(int(x) for x in mr.groups()) if mr else None), (mp[1] if mp else None)


def echantillons_csv(texte):
    """(en-têtes, lignes) d'un `etat.csv` à séparateur « ; » (BOM retiré)."""
    rows = list(csv.reader(texte.lstrip("\ufeff").splitlines(), delimiter=";"))
    return (rows[0], rows[1:]) if rows else ([], [])


# ── Les `.env` : classe de l'hôte, jamais l'hôte non local, jamais une valeur ────────────────────────────────────────
LOCAUX = {"localhost", "127.0.0.1", "[::1]", "::1", "0.0.0.0"}


def hote_de(jeton):
    """L'hôte (sans identifiants, sans port) d'un jeton « schéma://autorité/… », ou None si ce n'est pas une URL. Un `localhost@evil` a pour hôte `evil` : les identifiants sont retirés AVANT."""
    m = re.match(r"^[A-Za-z][A-Za-z0-9+.\-]*://([^/?#]*)", jeton)
    if not m:
        return None
    auth = m[1].rsplit("@", 1)[-1]
    if auth.startswith("["):
        h = auth[: auth.find("]") + 1]
    else:
        h = re.sub(r":\d*$", "", auth)
    return h.lower()


def classe_hote(h):
    return h if (h in LOCAUX or h.endswith(".localhost")) else "NON LOCAL"


def variables_url(octets):
    """[(nom, [classes d'hôte…])] des variables d'un fichier `.env` dont la valeur porte au moins une URL. Ne renvoie QUE le nom et la classe : un hôte non local n'est jamais conservé."""
    out = []
    for l in octets.decode("utf-8", errors="replace").splitlines():
        l = l.strip()
        if not l or l.startswith("#"):
            continue
        l = re.sub(r"^export\s+", "", l)
        m = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$", l)
        if not m:
            continue
        val = m[2].strip()
        if len(val) >= 2 and val[0] in "\"'" and val[-1] == val[0]:
            val = val[1:-1]
        else:
            val = re.sub(r"\s+#.*$", "", val)
        hotes = [hote_de(j) for j in re.split(r"[,\s;]+", val)]
        hotes = [h for h in hotes if h]
        if hotes:
            out.append((m[1], [classe_hote(h) for h in hotes]))
    return out


def empreinte(octets):
    return hashlib.sha256(octets).hexdigest()


def hunks(a, b):
    A, B = a.split("\n"), b.split("\n")
    sm = difflib.SequenceMatcher(None, A, B, autojunk=False)
    return [(t, A[i1:i2], B[j1:j2]) for t, i1, i2, j1, j2 in sm.get_opcodes() if t != "equal"]


# ══ CALIBRATION ══════════════════════════════════════════════════════════════════════════════════════════════════════
print("== CALIBRATION — deux bras par extracteur, abandon si un seul manque")
cal = []


def bras(nom, ok):
    cal.append(ok)
    print(f"   {'✓' if ok else '✗'} {nom}")


t_vrai = "| fichier | pour |\n|---|---|\n| `docs/a/b.md` | x |\n| `c.md`, `d/e.py` | y |\n| pas un chemin | z |\n"
bras("chemins_table, cas vrai : 3 chemins d'un tableau (dont une ligne à deux chemins)", chemins_table(t_vrai) == ["docs/a/b.md", "c.md", "d/e.py"])
bras("chemins_table, cas vrai : un retour chariot DANS un chemin est CONSERVÉ", chemins_table("| `docs/a/b.py\r` | x |") == ["docs/a/b.py\r"])
bras("chemins_table, cas faux : un texte sans tableau rend 0", chemins_table("rien ici `x/y` en ligne") == [])
bras("lignes_de_table, cas vrai : 2 lignes dont la 1ʳᵉ cellule est un chemin ; cas faux : un en-tête sans chemin rend 0", len(lignes_de_table(t_vrai)) == 2 and lignes_de_table("| fichier | pour |\n|---|---|\n") == [])
bras("bloc_entre, cas vrai : le texte entre deux repères ; cas faux : un début absent rend None", bloc_entre("aa DEBUT x y FIN bb", "DEBUT", "FIN") == "DEBUT x y " and bloc_entre("aa bb", "DEBUT", "FIN") is None)
bras("entiers, cas vrai : « 1 718 / 136 (88 s) » → [1718, 136, 88] et « 5 099 s » → [5099]", entiers("1 718 / 136 (88 s)") == [1718, 136, 88] and entiers("5 099 s") == [5099])
bras("entiers, cas faux : une décimale à virgule n'est PAS coupée en deux entiers ; un texte sans nombre rend []", entiers("RAM 4 897,5 Mo, 12") == [12] and entiers("aucun nombre") == [])
bras("bilans_vitest, cas vrai : un résumé avec échecs, en ANSI → ((36, 2, 38), (466, 2, 468))", bilans_vitest("\x1b[2m Test Files \x1b[22m 2 failed | 36 passed (38)\n      Tests  2 failed | 466 passed (468)") == [((36, 2, 38), (466, 2, 468))])
bras("bilans_vitest, cas faux : un texte sans résumé rend [] ; deux résumés → deux couples dans l'ordre", bilans_vitest("rien") == [] and len(bilans_vitest(" Test Files  5 passed (5)\n Tests  48 passed (48)\n Test Files  65 passed (65)\n Tests  791 passed (791)")) == 2)
bras("compte_done, cas vrai : 2 lignes « …: Done » ; cas faux : « Done with it » en milieu de ligne rend 0", compte_done("a typecheck: Done\nb typecheck: Done\nc typecheck: Running") == 2 and compte_done("Done with it") == 0)
bras("erreurs_ts, cas vrai : « error TS2304 » compté 1 ; cas faux : « 0 errors » rend 0", erreurs_ts("src/a.ts(1,1): error TS2304: Cannot find name") == 1 and erreurs_ts("Found 0 errors.") == 0)
bras("duree_code, cas vrai : « fin … · 359 s · code 1 » → (359, 1) ; cas faux : un texte sans durée rend None", duree_code("début x\nfin 12/10/2026 17:04:22 · 359 s · code 1\n") == (359, 1) and duree_code("rien") is None)
bras("resume_tout, cas vrai : la ligne MESURÉ du tri → (386, 0, 21, 34, 5099) ; cas faux : une ligne tronquée rend None", resume_tout("MESURÉ : 386 garde(s) mordue(s) · 0 muette(s)/erreur(s) · 21 non mesurée(s) · 34 campagne(s) · 5099s") == (386, 0, 21, 34, 5099) and resume_tout("MESURÉ : 386 garde(s) mordue(s)") is None)
bras("gardes_mordues, cas vrai : « 102 garde(s) mordue(s) sur 102 cible(s) jouée(s) » → (102, 102) ; cas faux : « 8 garde(s) muette(s) » rend None", gardes_mordues("\n102 garde(s) mordue(s) sur 102 cible(s) jouée(s) · 0 muette(s)") == (102, 102) and gardes_mordues("8 garde(s) muette(s) sur 8") is None)
bras("comptes_inventaire, cas vrai : deux noms comptés ; cas faux : un texte sans « COMPTE » rend {}", comptes_inventaire("COMPTE chrome=0\nCOMPTE msedge=5\n  msedge PID 1") == {"chrome": 0, "msedge": 5} and comptes_inventaire("rien") == {})
c_ok = champs_sonde("RAM_MEDIANE_MO=4897.5\nRAM_BANDE_MO=4880-4933\nBARRE_D273_MO=4579\nNODE=0\nCHROME=0\nALIM_SOURCE=SECTEUR\n")
c_bas = champs_sonde("RAM_MEDIANE_MO=4368.5\nRAM_BANDE_MO=4357-4376\nBARRE_D273_MO=4579\nNODE=0\nCHROME=0\nALIM_SOURCE=SECTEUR\n")
c_mix = champs_sonde("RAM_MEDIANE_MO=4600\nRAM_BANDE_MO=4500-4700\nBARRE_D273_MO=4579\nNODE=0\nCHROME=0\nALIM_SOURCE=SECTEUR\n")
bras("sous_la_barre, cas vrai : médiane et bande au-dessus → False ; cas faux (un creux) : médiane sous la barre → True ; bande basse sous la barre malgré une médiane au-dessus → True", sous_la_barre(c_ok) is False and sous_la_barre(c_bas) is True and sous_la_barre(c_mix) is True)
bras("tally_sortie, cas vrai : 2 ✓ de contrôle, 1 ✗, 1 bras, 1 constat, 1 non vérifiable ; cas faux : un texte vide rend cinq zéros", tally_sortie("   ✓ bras\n✓ A1 x\n✓ A2 y\n✗ A3 z\n· C1 c\n? N1 n\n") == (2, 1, 1, 1, 1) and tally_sortie("") == (0, 0, 0, 0, 0))
bras("aplati, cas vrai : les retours à la ligne et les espaces multiples deviennent UNE espace", aplati("a\n  b\t\tc") == "a b c")
bras("numerotes, cas vrai : « (1) a (2) b (3) c » → [1, 2, 3] ; cas faux : « (i) », « n° 17 » et un « (9) » hors suite ne comptent pas, un texte sans marqueur rend []", numerotes("(1) a (2) b (3) c") == [1, 2, 3] and numerotes("(1) a (i) x n° 17 (9) z (2) b") == [1, 2] and numerotes("rien") == [])
bras("nombre_en_lettres, cas vrai : « DIX-NEUF » → 19, « treize » → 13, « VINGT-ET-UN » → 21 ; cas faux : un mot inconnu et la chaîne vide rendent None", nombre_en_lettres("DIX-NEUF") == 19 and nombre_en_lettres("treize") == 13 and nombre_en_lettres("VINGT-ET-UN") == 21 and nombre_en_lettres("BANANE") is None and nombre_en_lettres("") is None)
S_SECRET, S_TUNNEL = "SENTINELLE_SECRET_ZW331", "zw331-tunnel.exemple-invalide"
t_local = f'CLIENT_URL=http://localhost:3000\nCORS_ORIGINS="http://localhost:3000,http://127.0.0.1:3100"\nexport DATABASE_URL=postgresql://u:{S_SECRET}@localhost:5432/db\n# COMMENT=https://{S_TUNNEL}\nSANS_URL=abc\n'
t_dist = (f"CLIENT_URL=https://{S_TUNNEL}\nCORS_ORIGINS=http://localhost:3000,https://{S_TUNNEL}\nA=http://localhost@{S_TUNNEL}/x\nB=http://localhost.{S_TUNNEL}\n"
          f"C=https://{S_TUNNEL}/?h=localhost\nD=http://[::1]:8080\nE=http://0.0.0.0:1\r\n")
r_local, r_dist = variables_url(t_local.encode()), variables_url(t_dist.encode())
bras("variables_url, cas vrai (tout local) : 3 variables d'URL (le commentaire et la variable sans URL ignorés), toutes classées locales ; l'identifiant secret n'est PAS dans le résultat",
     [n for n, _ in r_local] == ["CLIENT_URL", "CORS_ORIGINS", "DATABASE_URL"] and all(h != "NON LOCAL" for _, hs in r_local for h in hs) and S_SECRET not in repr(r_local) and S_TUNNEL not in repr(r_local))
bras("variables_url, cas faux (distant) : CLIENT_URL, l'un des deux hôtes de CORS_ORIGINS, `localhost@distant`, `localhost.distant` et `?h=localhost` sont NON LOCAL ; [::1] et 0.0.0.0 restent locaux ; l'hôte distant n'est PAS dans le résultat",
     dict(r_dist)["CLIENT_URL"] == ["NON LOCAL"] and dict(r_dist)["CORS_ORIGINS"] == ["localhost", "NON LOCAL"] and dict(r_dist)["A"] == ["NON LOCAL"] and dict(r_dist)["B"] == ["NON LOCAL"]
     and dict(r_dist)["C"] == ["NON LOCAL"] and dict(r_dist)["D"] == ["[::1]"] and dict(r_dist)["E"] == ["0.0.0.0"] and S_TUNNEL not in repr(r_dist))
bras("empreinte, cas vrai : mêmes octets → même empreinte ; cas faux : UN octet de plus (LF/CRLF compris) → empreinte différente", empreinte(b"A=1\n") == empreinte(b"A=1\n") and empreinte(b"A=1\n") != empreinte(b"A=1\r\n") and empreinte(b"A=1\n") != empreinte(b"A=2\n"))
t_env_ok = ("ÉTAT DES FICHIERS .env — relevé « x »\nFICHIER apps/api/.env · octets 10 · SHA256 " + "a" * 64 + " · modifié 2026-01-01 00:00:00 · 2 variable(s) dont 2 d'URL\n   URL A_URL : localhost\n   URL B_URL : localhost, 127.0.0.1\n"
            "FICHIER apps/pro/.env · octets 5 · SHA256 " + "b" * 64 + " · modifié 2026-01-01 00:00:00 · 0 variable(s) dont 0 d'URL\nRÉSUMÉ fichiers 2 · variables d'URL 2 · hôtes non locaux 0 (attendu 0) : []\nPORTE : VERTE\n")
bras("etat_env, cas vrai : deux fichiers, deux variables d'URL (dont une liste de deux hôtes), résumé (2, 2, 0), porte VERTE", etat_env(t_env_ok) == ([("apps/api/.env", "a" * 64, [("A_URL", ["localhost"]), ("B_URL", ["localhost", "127.0.0.1"])]), ("apps/pro/.env", "b" * 64, [])], (2, 2, 0), "VERTE"))
bras("etat_env, cas faux : un texte sans relevé rend aucun fichier, pas de résumé, pas de porte", etat_env("rien") == ([], None, None))
t_csv = "\ufeffhorodatage;ram_libre_mo;node\n2026-10-13 01:07:58;5152;0\n2026-10-13 01:08:30;4000;3\n"
bras("echantillons_csv, cas vrai : BOM retiré, 3 colonnes, 2 lignes ; cas faux : un texte vide rend ([], [])", echantillons_csv(t_csv) == (["horodatage", "ram_libre_mo", "node"], [["2026-10-13 01:07:58", "5152", "0"], ["2026-10-13 01:08:30", "4000", "3"]]) and echantillons_csv("") == ([], []))
bras("existe, cas vrai : la table d'ouverture de D330 existe à son commit ; cas faux : un chemin forgé n'existe pas", existe(OUV330, f"{PD}/table-ouverture.md") and not existe(OUV330, f"{PD}/ZZZ-forge.md"))
bras("hunks, cas vrai : « b » remplacé par « B » et « d » ajouté → [replace, insert] ; cas faux : deux textes identiques → []", [x[0] for x in hunks("a\nb\nc", "a\nB\nc\nd")] == ["replace", "insert"] and hunks("x\ny", "x\ny") == [])
if not all(cal):
    sys.exit(f"ABANDON : calibration manquée ({cal.count(False)} bras sur {len(cal)})")
print(f"== calibration : {len(cal)} bras, 0 manqué\n")

# ══ FAMILLE X — l'état LIVE du dépôt ═════════════════════════════════════════════════════════════════════════════════
print("== X — état LIVE (git status, stash, fetch, rev-parse)")
git("fetch", "--quiet", check=False)
head = git("rev-parse", "HEAD").decode().strip()
orig = git("rev-parse", "origin/main").decode().strip()
fin_complet = git("rev-parse", FIN).decode().strip()
statut = [l for l in git("status", "--short", "--untracked-files=all").decode().split("\n") if l.strip()]
stash = [l for l in git("stash", "list").decode().split("\n") if l.strip()]
branche = git("rev-parse", "--abbrev-ref", "HEAD").decode().strip()


def ancetre(a, b):
    return subprocess.run(["git", "merge-base", "--is-ancestor", a, b], capture_output=True).returncode == 0


ctl("X1", "`origin/main` (après `git fetch`) contient la clôture de D330 et est un ancêtre-ou-égal de `HEAD`", (True, True), (ancetre(fin_complet, orig), ancetre(orig, head)))
TABLE331 = "docs/preuves/D331/table-ouverture.md"
suite331 = git("rev-list", "--reverse", f"{OUV331}..HEAD").decode().split()
ctl("X2", "`HEAD` est la table d'ouverture de ce lot (`edfe644`) OU un commit qui la suit directement sans toucher autre chose que cette table (ses extensions), tous au sujet « docs(rang-37): D331 »", (True, True),
    (head[:7] == OUV331 or ancetre(OUV331, head), all(git("log", "-1", "--format=%s", c).decode().startswith("docs(rang-37): D331") for c in [OUV331] + suite331)))
ctl("X3", "le parent du commit d'ouverture (`edfe644`) est la clôture de D330 (`afdfcb1`)", FIN, git("rev-parse", f"{OUV331}^").decode().strip()[:7])
ctl("X4", "le commit d'ouverture ne contient QUE `docs/preuves/D331/table-ouverture.md` ; chaque commit qui le suit jusqu'à `HEAD` (les extensions) ne contient QUE cette table aussi", ([TABLE331], [[TABLE331]] * len(suite331)),
    ([l for l in git("show", "--name-only", "--format=", OUV331).decode().split("\n") if l.strip()], [[l for l in git("show", "--name-only", "--format=", c).decode().split("\n") if l.strip()] for c in suite331]))
print(f"   (parcouru : le commit d'ouverture + {len(suite331)} commit(s) qui le suivent jusqu'à HEAD : {[c[:7] for c in suite331]})")
ctl("X5", "aucun fichier SUIVI modifié ou ajouté à l'index", [], [l for l in statut if not l.startswith("??")])
ctl("X6", "tout fichier non suivi est sous `docs/preuves/D331/` (aucun fichier hors du lot)", [], [l for l in statut if l.startswith("??") and "docs/preuves/D331/" not in l])
ctl("X7", "aucun stash", [], stash)
ctl("X8", "branche `main`", "main", branche)
print(f"   (parcouru : {len(statut)} ligne(s) de statut dont {sum(1 for l in statut if l.startswith('??'))} non suivie(s) ; stash {len(stash)})")

# ══ FAMILLE E — les fichiers `.env` : l'état VIVANT et les PIÈCES de la passe (empreinte, classe d'hôte, AUCUNE valeur) ═══
print("\n== E — fichiers `.env` que lit une porte (empreinte, taille, date, classe d'hôte des variables d'URL ; aucune valeur, aucun hôte non local)")


def fichiers_env():
    """Les fichiers `.env` / `.env.*` (hors `.example`) à la racine et dans chaque dossier de premier niveau de apps/, packages/ et e2e/."""
    racines = ["."] + [f"apps/{d}" for d in sorted(os.listdir("apps"))] + [f"packages/{d}" for d in sorted(os.listdir("packages"))] + ["e2e"]
    out = []
    for r in racines:
        if not os.path.isdir(r):
            continue
        for n in sorted(os.listdir(r)):
            if (n == ".env" or n.startswith(".env.")) and not n.endswith(".example") and os.path.isfile(os.path.join(r, n)):
                out.append(os.path.normpath(os.path.join(r, n)).replace("\\", "/"))
    return out


envs = fichiers_env()
print(f"   fichiers `.env` trouvés : {len(envs)} → {envs}")
ctl("E1", "les fichiers `.env` d'une porte sont ceux des applications de `apps/` (un `.env` chacune ; aucun à la racine, aucun `.env.local` ou `.env.test`)", [f"apps/{d}/.env" for d in sorted(os.listdir("apps"))], envs)
p_ouv, p_clo, p_cmp = show(FIN, f"{PASSE}/etat-env-ouverture.txt"), show(FIN, f"{PASSE}/etat-env-cloture.txt"), show(FIN, f"{PASSE}/etat-env-comparaison.txt")
f_ouv, r_ouv, porte_ouv = etat_env(p_ouv)
f_clo, r_clo, porte_clo = etat_env(p_clo)
sha_clo = {f: s for f, s, _ in f_clo}
for i, f in enumerate(envs):
    b = open(f, "rb").read()
    ign = subprocess.run(["git", "check-ignore", "-q", f], capture_output=True).returncode == 0
    suivi = subprocess.run(["git", "ls-files", "--error-unmatch", f], capture_output=True).returncode == 0
    vu = variables_url(b)
    mtime = datetime.fromtimestamp(os.path.getmtime(f)).strftime("%Y-%m-%d %H:%M:%S")
    print(f"   {f} : {len(b)} octets · modifié {mtime} · SHA-256 {empreinte(b)} · {sum(1 for l in b.decode('utf-8','replace').splitlines() if re.match(r'^\s*[A-Za-z_]\w*\s*=', l))} variable(s) dont {len(vu)} d'URL : "
          + " ; ".join(f"{n}={'+'.join(h)}" for n, h in vu))
    ctl(f"E2{i}", f"`{f}` est ignoré par git et non suivi", (True, False), (ign, suivi))
    ctl(f"E3{i}", f"`{f}` : aucune variable d'URL n'a un hôte non local (état VIVANT)", [], [n for n, hs in vu if "NON LOCAL" in hs])
    ctl(f"E4{i}", f"`{f}` : l'empreinte VIVANTE est celle du relevé de CLÔTURE de la passe de D330 (le poste n'a pas bougé depuis) — variation de l'état vivant sinon", sha_clo.get(f), empreinte(b))
# les pièces de la passe
ctl("E5", "relevé d'OUVERTURE de la passe : 3 fichiers, 8 variables d'URL, 0 hôte non local, porte VERTE — chiffres du RÉSUMÉ = fichiers et lignes « URL » recomptés", ((3, 8, 0), "VERTE", (3, 8, 0)), (r_ouv, porte_ouv, (len(f_ouv), sum(len(v) for _, _, v in f_ouv), sum(1 for _, _, v in f_ouv for _, hs in v if "NON LOCAL" in hs))))
ctl("E6", "relevé de CLÔTURE : mêmes chiffres que l'ouverture, porte VERTE", (r_ouv, "VERTE", (3, 8, 0)), (r_clo, porte_clo, (len(f_clo), sum(len(v) for _, _, v in f_clo), sum(1 for _, _, v in f_clo for _, hs in v if "NON LOCAL" in hs))))
ctl("E7", "ouverture et clôture : MÊMES fichiers, MÊMES empreintes (recomparées octet à octet, sans l'outil de D330), mêmes variables d'URL et mêmes classes d'hôte", True, [(f, s, v) for f, s, v in f_ouv] == [(f, s, v) for f, s, v in f_clo] and len(f_ouv) == 3)
ctl("E8", "la pièce de comparaison dit IDENTIQUE (et son code de sortie n'est pas une différence)", True, "COMPARAISON : IDENTIQUE" in p_cmp and "DIFFÉRENCE" not in p_cmp)
ctl("E9", "AUCUNE VALEUR dans les trois pièces des `.env` : ni « :// », ni « @ », ni un nom de tunnel — seules des classes d'hôte (« localhost ») figurent", [], [n for n, t in (("ouverture", p_ouv), ("cloture", p_clo), ("comparaison", p_cmp)) if re.search(r"://|@|devtunnels|ngrok|trycloudflare|loca\.lt", t)])
txt_etape0 = nettoyer(bloc_entre(norm(show(FIN, CONT)), "### D330 — étape 0 : ce qui a été fait avant le protocole", "### D330 — RÉSULTAT") or "")
pref_texte = sorted(set(re.findall(r"([0-9a-f]{8})…", txt_etape0)))
ctl("E10", "les trois empreintes que le texte de D330 cite (8 premiers caractères, « relevées indépendamment par la lecture adverse ») sont celles des pièces d'ouverture", sorted(f[1][:8] for f in f_ouv), pref_texte)
ts_ouv = re.search(r"HORODATAGE (\d\d/\d\d/\d{4} \d\d:\d\d:\d\d)", p_ouv)
ts_clo = re.search(r"HORODATAGE (\d\d/\d\d/\d{4} \d\d:\d\d:\d\d)", p_clo)
prog_e = [l for l in show(FIN, f"{PASSE}/progression.txt").split("\n") if l.strip()]
d_e0 = datetime.strptime(prog_e[0][:19], "%d/%m/%Y %H:%M:%S")
d_e1 = datetime.strptime(prog_e[-1][:19], "%d/%m/%Y %H:%M:%S")
t_e0 = datetime.strptime(ts_ouv[1], "%d/%m/%Y %H:%M:%S") if ts_ouv else None
t_e1 = datetime.strptime(ts_clo[1], "%d/%m/%Y %H:%M:%S") if ts_clo else None
ctl("E11", "les deux relevés des `.env` sont BIEN aux deux bouts de la passe : l'ouverture est horodatée dans les 60 s du premier horodatage de `progression.txt`, la clôture dans les 60 s du dernier ; et les deux horodatages sont séparés d'au moins 160 minutes (la fenêtre entière)",
    (True, True, True), (t_e0 is not None and abs((t_e0 - d_e0).total_seconds()) <= 60, t_e1 is not None and abs((t_e1 - d_e1).total_seconds()) <= 60, t_e0 is not None and t_e1 is not None and (t_e1 - t_e0).total_seconds() >= 160 * 60))
print(f"   (parcouru : ouverture {len(f_ouv)} fichier(s) {sum(len(v) for _, _, v in f_ouv)} variable(s) d'URL ; clôture {len(f_clo)} fichier(s) ; {len(envs)} fichier(s) `.env` vivants ; relevés horodatés {ts_ouv[1] if ts_ouv else None} et {ts_clo[1] if ts_clo else None})")
non_verifiable("N1", "que les fichiers `.env` n'aient pas changé ENTRE les relevés de la passe : les deux pièces portent la même empreinte à l'ouverture (01:06) et à la clôture (03:52) — un fichier modifié puis remis octet pour octet n'est pas vu ; et l'ENVIRONNEMENT du shell n'est pas un fichier (limite écrite par D330)")

# ══ FAMILLE P — provenance et ordre des commits de D330 ══════════════════════════════════════════════════════════════
print("\n== P — provenance et ordre des commits de D330 (objets git)")
chaine = git("rev-list", "--reverse", f"{DEPART}..{FIN}").decode().split()
sujets = {c: git("log", "-1", "--format=%s", c).decode().strip() for c in chaine}
ctl("P1", "tout commit entre la clôture de D329 et celle de D330 porte « docs(rang-36): D330 » dans son sujet", len(chaine), sum(1 for s in sujets.values() if s.startswith("docs(rang-36): D330")))
print(f"   (parcouru : {len(chaine)} commit(s) : " + " ".join(c[:7] for c in chaine) + ")")


def noms_du_commit(sha):
    return [l for l in git("show", "--name-only", "--format=", sha).decode().split("\n") if l.strip()]


ctl("P2", "le premier commit de D330 est la table d'ouverture, et il ne contient QUE `table-ouverture.md`", ([OUV330], [f"{PD}/table-ouverture.md"]), ([chaine[0][:7]], noms_du_commit(chaine[0])))
ctl("P3", "le parent du premier commit de D330 est la clôture de D329", DEPART, git("rev-parse", f"{chaine[0]}^").decode().strip()[:7])
diff_fichiers = [l for l in git("diff", "--name-only", DEPART, FIN).decode().split("\n") if l.strip()]
hors_doc = [f for f in diff_fichiers if not (f in AUTORITES or f.startswith("docs/preuves/"))]
ctl("P4", "le diff de D330 ne contient AUCUN fichier de code, de test, de harnais, de migration ni `docker-compose.yml` (les trois `.md` et `docs/preuves/` seulement)", [], hors_doc)
print(f"   (parcouru : {len(diff_fichiers)} fichier(s) du diff DEPART..FIN dont {sum(1 for f in diff_fichiers if f in AUTORITES)} `.md` d'autorité et {sum(1 for f in diff_fichiers if f.startswith('docs/preuves/D330/'))} sous `docs/preuves/D330/`)")
versions_table = [c for c in chaine if f"{PD}/table-ouverture.md" in noms_du_commit(c)]
table_fin_brut = git("show", f"{FIN}:{PD}/table-ouverture.md").decode("utf-8", errors="replace")
decl_fin = chemins_table(table_fin_brut)
decl_set = set(decl_fin)
cond_bloc = bloc_entre(table_fin_brut, "### Fichiers CONDITIONNELS", "### Fichiers à déclarer PAR EXTENSION") or ""
cond_set = set(chemins_table(cond_bloc))
non_declares = sorted(f for f in diff_fichiers if f not in decl_set)
absents = sorted(c for c in decl_set if not existe(FIN, c))
ctl("P5", "le diff est inclus dans la table, en chemins COMPLETS (0 fichier du diff non déclaré)", [], non_declares)
ctl("P6", "tout fichier déclaré mais absent de l'arbre à la clôture est un fichier CONDITIONNEL (la table le dit : « créé seulement si le cas se produit »)", [], sorted(set(absents) - cond_set))
print(f"   (déclarés absents : {absents} ; conditionnels déclarés : {len(cond_set)})")
ctl("P7", "aucun chemin déclaré ne finit par « / » (aucun préfixe) et aucun ne porte de caractère de contrôle (le défaut de D329 : un retour chariot)", [], sorted(c for c in decl_set if c.endswith("/") or re.search(r"[\x00-\x1f]", c)))
print(f"   (parcouru : {len(decl_fin)} chemin(s) déclaré(s) à la clôture ; {len(diff_fichiers)} fichier(s) du diff ; les trois `.md` y sont déclarés : {all(a in decl_set for a in AUTORITES)})")
ajout: dict = {}
modif: dict = {}
courant = None
for l in git("log", "--reverse", "--name-status", "--format=@@%H", f"{DEPART}..{FIN}").decode("utf-8", errors="replace").split("\n"):
    if l.startswith("@@"):
        courant = chaine.index(l[2:])
    elif l.strip() and courant is not None:
        st, _, chemin = l.partition("\t")
        if st.startswith("A"):
            ajout.setdefault(chemin, courant)
        modif.setdefault(chemin, []).append(courant)
decl_exact: dict = {}
for c in versions_table:
    for p in chemins_table(git("show", f"{c}:{PD}/table-ouverture.md").decode("utf-8", errors="replace")):
        decl_exact.setdefault(p, chaine.index(c))
tardifs = sorted(f for f in diff_fichiers if f != f"{PD}/table-ouverture.md" and f in ajout and not decl_exact.get(f, 10**9) < ajout[f])
ctl("P8", "chaque fichier est déclaré dans la table, À L'OCTET, par un commit STRICTEMENT antérieur à celui qui l'ajoute (hors la table elle-même)", [], tardifs)
print(f"   (parcouru : {len(versions_table)} version(s) de la table : " + " ".join(c[:7] for c in versions_table) + f" ; {len(ajout)} fichier(s) ajouté(s))")
idx_lect = ajout.get(f"{PD}/lecture-adverse/confronter-sortie.txt")
idx_d277 = ajout.get(f"{PD}/passe-d277/balayage-1-AVANT-ECRITURE.txt")
idx_md = min(modif[a][0] for a in AUTORITES if a in modif)
ctl("P9", "la sortie de la lecture adverse ET la première passe D277 entrent dans des commits antérieurs à tout `.md` d'autorité", (True, True), (idx_lect is not None and idx_lect < idx_md, idx_d277 is not None and idx_d277 < idx_md))
arb = chaine[idx_md]
ctl("P10", "le premier commit qui touche un `.md` d'autorité ne touche QUE `ZWADJ_CONTINUITE.md` (les arbitrages de Ko, seuls dans leur commit)", [CONT], noms_du_commit(arb))
ajoutees = [l[1:] for l in git("show", "--format=", "-U0", arb).decode("utf-8", errors="replace").split("\n") if l.startswith("+") and not l.startswith("+++")]
txt_ajoute = "\n".join(ajoutees)
cont_fin_brut = show(FIN, CONT)
mot_ko = "option (a). J'ai remis"
ctl("P11", "ce commit apporte les premiers mots de Ko du 12/10 pour la reprise (« option (a). J'ai remis `CLIENT_URL` et `CORS_ORIGINS` à leur valeur locale »)", True, mot_ko in txt_ajoute)
lignes_ko = [l for l in ajoutees if l.strip()]
lignes_fin = set(cont_fin_brut.split("\n"))
retrouvees_ko = [l for l in lignes_ko if l in lignes_fin]
ctl("P12", "le texte de Ko (les lignes non vides que le premier commit d'autorité AJOUTE) se retrouve MOT POUR MOT, ligne à ligne, à la clôture (non retouché depuis)", len(lignes_ko), len(retrouvees_ko))
print(f"   (parcouru : {len(ajoutees)} ligne(s) ajoutée(s) par ce commit dont {len(lignes_ko)} non vide(s) ; {sum(len(l) for l in lignes_ko)} caractère(s) ; retrouvées {len(retrouvees_ko)})")
proto_c = git("log", "-1", "--format=%cI", PROTO).decode().strip()
prog = show(FIN, f"{PASSE}/progression.txt")
m0 = re.match(r"(\d\d)/(\d\d)/(\d{4}) (\d\d:\d\d:\d\d) PASSE", prog)
debut_passe = f"{m0[3]}-{m0[2]}-{m0[1]}T{m0[4]}"
ctl("P13", "le protocole (`77de612`) est commité AVANT le premier horodatage du journal de la passe (même fuseau local)", True, proto_c[:19] < debut_passe)
print(f"   (commit {proto_c} · début de la passe {debut_passe})")
reflog = git("reflog", "show", "origin/main", "--date=iso", check=False).decode("utf-8", errors="replace")
mr = re.search(rf"^{PROTO}\S* refs/remotes/origin/main@\{{(\d{{4}}-\d\d-\d\d) (\d\d:\d\d:\d\d) [+-]\d{{4}}\}}: update by push", reflog, re.M)
ctl("P14", "le reflog LOCAL de `origin/main` date la poussée de `77de612` AVANT le début de la passe", True, bool(mr) and f"{mr[1]}T{mr[2]}" < debut_passe)
print(f"   (reflog : {mr[1] + ' ' + mr[2] if mr else 'absent'})")
non_verifiable("N2", "que la poussée de `77de612` ait eu lieu à l'heure du reflog : le reflog est LOCAL et modifiable ; seul le distant le dirait, et il ne date pas ses mises à jour de référence")
# le tableau « l'ordre des commits » de D330, lu dans son texte
cont_fin = norm(cont_fin_brut)
tab_ordre = bloc_entre(cont_fin, "| ordre | commit | contenu |", "\n\n") or ""
rangs_ordre = [(int(m[1]), m[2]) for m in re.finditer(r"^\| (\d+) \| `?([0-9a-f]{7})`? \|", tab_ordre, re.M)]
sha_cit = [s for _, s in rangs_ordre]
pos = [next((i for i, c in enumerate(chaine) if c.startswith(s)), None) for s in sha_cit]
ctl("P15", "les commits que le tableau « l'ordre des commits » de D330 cite existent TOUS dans la chaîne, dans l'ordre croissant (le douzième, « (le suivant) », n'a pas de SHA dans le texte)", (True, True), (all(p is not None for p in pos), pos == sorted(pos)))
print(f"   (parcouru : {len(rangs_ordre)} ligne(s) du tableau avec un SHA : {sha_cit} ; positions {pos})")
ctl("P16", "le dernier commit de la chaîne (la clôture, `afdfcb1`) est le « (le suivant) » du tableau : il apporte `balayage-final.txt` et `audit-secrets-d330b.txt`", (True, True), (f"{PD}/passe-d277/balayage-final.txt" in noms_du_commit(chaine[-1]), f"{PD}/audit-secrets-d330b.txt" in noms_du_commit(chaine[-1])))
ctl("P17", "les 3 premiers commits du tableau sont dans l'ordre que le texte annonce : (1) la table seule, (2) la lecture adverse, (3) la première passe D277 ; (4) les mots de Ko, seuls dans leur commit `ZWADJ_CONTINUITE.md`", ([OUV330, True, True], [CONT]), ([sha_cit[0], f"{PD}/lecture-adverse/confronter-sortie.txt" in noms_du_commit(chaine[pos[1]]), f"{PD}/passe-d277/balayage-1-AVANT-ECRITURE.txt" in noms_du_commit(chaine[pos[2]])], noms_du_commit(chaine[pos[3]])))
txt_220 = re.search(r"(\d+) fichiers au diff depuis `?4202dd4`?, (\d+) hors", nettoyer(cont_fin))
diff_depuis = lambda fin_: [l for l in git("diff", "--name-only", PROTO329, fin_).decode().split("\n") if l.strip()]
d_passe, d_fin = diff_depuis(PROTO), diff_depuis(FIN)
ho = lambda L: [f for f in L if not (f in AUTORITES or f.startswith("docs/preuves/"))]
ctl("P18", "« 230 fichiers au diff depuis 4202dd4, 0 hors docs/preuves et les trois .md » (texte, « <SHA de la passe> » = `77de612`) = `git diff 4202dd4 77de612` recompté ; et à la CLÔTURE aucun fichier hors `docs/preuves/` et les trois `.md` non plus", ((int(txt_220[1]), int(txt_220[2])) if txt_220 else None, 0), ((len(d_passe), len(ho(d_passe))), len(ho(d_fin))))
print(f"   (le diff 4202dd4..77de612 = {len(d_passe)} fichier(s) ; 4202dd4..afdfcb1 = {len(d_fin)} fichier(s), {len(ho(d_fin))} hors docs/preuves et les trois .md)")
etat_fin = nettoyer(bloc_entre(cont_fin, "### ⛔ ÉTAT DE FIN DE SESSION DU 13/10/2026 (D330)", "### ⛔ REPRISE DU 13/10/2026 (D330)") or "")
m_etat = re.search(r"Aucune ligne de code n'a été touchée \((\d+) fichiers au diff depuis (\w+), (\d+) hors", etat_fin)
ctl("P19", "« Aucune ligne de code n'a été touchée (230 fichiers au diff depuis 4202dd4, 0 hors … ) » — la phrase du bloc « ÉTAT DE FIN DE SESSION » (celui qu'une reprise lit EN PREMIER), prise à la lettre, sans SHA de fin : `git diff 4202dd4 HEAD` à la clôture compte le même nombre de fichiers, dont le même nombre hors",
    (int(m_etat[1]), int(m_etat[3])) if m_etat else None, (len(d_fin), len(ho(d_fin))))
constat("P-C1", f"ÉCART D'EXACTITUDE DE D330 (P19) : le bloc « ÉTAT DE FIN DE SESSION » écrit « 230 fichiers au diff depuis 4202dd4, 0 hors » SANS nommer le SHA de fin ; le diff `4202dd4`..`77de612` (le SHA de la passe, nommé par la section D330) vaut bien 230, mais `4202dd4`..HEAD vaut {len(d_fin)} à la clôture — "
                "une reprise qui rejoue la commande telle qu'écrite lit un autre nombre. La CONCLUSION (« aucune ligne de code touchée ») est vraie aux deux SHA : 0 fichier hors `docs/preuves/` et les trois `.md`. Imprécision d'une borne, sans effet sur une porte.")
# le premier commit de D330 a été réécrit (git commit --amend) avant toute poussée (faute n° 1 de D330) : le reflog local et l'objet d'origine le disent
reflog_main = git("reflog", "show", "main", "--date=iso", check=False).decode("utf-8", errors="replace")
m_am = re.search(rf"^{OUV330}\S* main@\{{(\d{{4}}-\d\d-\d\d \d\d:\d\d:\d\d) [+-]\d{{4}}\}}: commit \(amend\)", reflog_main, re.M)
m_or = re.search(r"^(0b74877)\S* main@\{(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d) [+-]\d{4}\}: commit: docs\(rang-36\): D330 — table d'ouverture", reflog_main, re.M)
if m_am and m_or and existe("0b74877", f"{PD}/table-ouverture.md"):
    anc_t, anc_l = show("0b74877", f"{PD}/table-ouverture.md"), [l for l in show("0b74877", f"{PD}/table-ouverture.md").split("\n") if re.match(r"\|\s*`[^`|]+/`", l)]
    ctl("P20", "faute n° 1 de D330 : « le premier commit a été RÉÉCRIT (`git commit --amend`) AVANT toute poussée » = le reflog LOCAL date la version d'origine (`0b74877`) AVANT la réécriture (`12de7c2`), la version d'origine a le MÊME parent (la clôture de D329) et ne contient que la table, et `0b74877` n'a JAMAIS été dans `origin/main`",
        (True, DEPART, [f"{PD}/table-ouverture.md"], 0), (m_or[2] < m_am[1], git("rev-parse", "0b74877^").decode().strip()[:7], noms_du_commit("0b74877"), git("reflog", "show", "origin/main", check=False).decode("utf-8", errors="replace").count("0b74877")))
    ctl("P21", "la ligne de RÉPERTOIRE (un préfixe, interdit par la règle de D328) que la faute n° 1 décrit est dans la version d'origine (exactement une) et n'est plus dans la version amendée", (1, 0), (len(anc_l), len([l for l in show(OUV330, f"{PD}/table-ouverture.md").split("\n") if re.match(r"\|\s*`[^`|]+/`", l)])))
    constat("P-C2", "D330 écrit, à sa faute n° 1, « ce qui prouvait la faute n'existe plus dans `git` ». C'est vrai de l'HISTOIRE (la branche) et du DISTANT ; c'est FAUX de la base d'objets LOCALE tant que le reflog la retient : le commit d'origine `0b74877` existe (`git cat-file -t` → commit), avec la ligne de répertoire à la ligne 36 de la table. "
                    "Il disparaîtra au ramasse-miettes (le reflog expire) : la lecture en VERSE une copie ici, par extension de la table, pour qu'elle ne dépende plus d'un reflog.")
else:
    non_verifiable("N9", "la réécriture du premier commit de D330 (faute n° 1) : le reflog local ne la porte plus, ou l'objet d'origine a disparu")

# ══ FAMILLE T — la table d'ouverture recopiée dans un .md d'autorité (règle 3 de D328) ═══════════════════════════════════
print("\n== T — la table recopiée « à l'identique » dans un `.md` d'autorité (AGENTS.md, ordre des commits, point 3)")
table_ouv = show(FIN, f"{PD}/table-ouverture.md")
bloc_attendus = bloc_entre(table_ouv, "## Fichiers attendus", "### Fichiers CONDITIONNELS") or ""
bloc_cond = bloc_entre(table_ouv, "### Fichiers CONDITIONNELS", "### Fichiers à déclarer PAR EXTENSION") or ""
rangees = lignes_de_table(bloc_attendus)
rangees_c = lignes_de_table(bloc_cond)
textes_md = {a: show(FIN, a) for a in AUTORITES}
lignes_md = {a: set(textes_md[a].split("\n")) for a in AUTORITES}
retrouvees = [r for r in rangees if any(r in lignes_md[a] for a in AUTORITES)]
retrouvees_c = [r for r in rangees_c if any(r in lignes_md[a] for a in AUTORITES)]
ctl("T1", "chaque ligne du tableau « Fichiers attendus » de la table d'ouverture de D330 (état à la clôture) se retrouve, mot pour mot, dans l'un des trois `.md` d'autorité", len(rangees), len(retrouvees))
ctl("T1b", "idem pour le tableau « Fichiers CONDITIONNELS »", len(rangees_c), len(retrouvees_c))
print(f"   (parcouru : {len(rangees)} ligne(s) du tableau « attendus » et {len(rangees_c)} du tableau « conditionnels » ; retrouvées {len(retrouvees)} et {len(retrouvees_c)})")
# le bloc recopié dans le point d'entrée du rang 36 : identique, ligne à ligne, à celui de la table (au tableau près)
bloc_cont = bloc_entre(cont_fin_brut, "#### Fichiers attendus — chemins COMPLETS", "##### Extensions de la table") or ""
l_cont = lignes_de_table(bloc_cont)
ctl("T2", "le bloc « Fichiers attendus — chemins COMPLETS » du point d'entrée du rang 36 porte les MÊMES lignes de tableau, dans le MÊME ordre, que la table (attendus puis conditionnels, à la clôture)", rangees + rangees_c, l_cont)
print(f"   (parcouru : {len(l_cont)} ligne(s) de tableau dans `ZWADJ_CONTINUITE.md` ; {len(rangees) + len(rangees_c)} dans la table)")
# la table de l'OUVERTURE (premier commit) : ses lignes sont-elles les mêmes que celles de la clôture, sauf ce que la table dit avoir modifié ?
table_ouv0 = show(OUV330, f"{PD}/table-ouverture.md")
r0 = lignes_de_table(bloc_entre(table_ouv0, "## Fichiers attendus", "### Fichiers CONDITIONNELS") or "")
r0c = lignes_de_table(bloc_entre(table_ouv0, "### Fichiers CONDITIONNELS", "### Fichiers à déclarer PAR EXTENSION") or "")
ctl("T3", "les tableaux « attendus » et « conditionnels » de la table n'ont PAS changé entre son premier commit (`12de7c2`) et la clôture : les extensions s'ajoutent à la section « extensions », pas aux tableaux de base", (r0, r0c), (rangees, rangees_c))
rang_328 = lignes_de_table(bloc_entre(show("ab8e6f6", "docs/preuves/D328/table-ouverture.md") if existe("ab8e6f6", "docs/preuves/D328/table-ouverture.md") else show(DEPART, "docs/preuves/D328/table-ouverture.md"), "## Fichiers attendus", "###") or "")
rec_328 = [r for r in rang_328 if r in lignes_md[CONT]]
ctl("T4", "CONTRE-ÉPREUVE : la table d'ouverture de D328 était, elle, recopiée mot pour mot dans `ZWADJ_CONTINUITE.md` (toutes ses lignes s'y retrouvent) — l'extracteur trouve ce qui est là", len(rang_328), len(rec_328))
fausse = "| `docs/preuves/D330/ZZZ-ligne-forgee.md` | x |"
ctl("T5", "CONTRE-ÉPREUVE NÉGATIVE : une ligne de tableau forgée n'est retrouvée dans AUCUN `.md` — l'extracteur ne trouve pas ce qui n'y est pas", False, any(fausse in lignes_md[a] for a in AUTORITES))

# ══ FAMILLE R — chaque chiffre du tableau « prédit / mesuré » de D330 contre ses pièces (et contre les prédictions du protocole) ═
print("\n== R — le tableau « prédit / mesuré » de D330 (« RÉSULTAT DE LA PASSE »), ligne par ligne, contre les pièces versées et contre le protocole")
print("   (RÈGLE de cette famille : tout ATTENDU est lu dans le TEXTE de D330 ou du protocole, puis confronté à la PIÈCE ; aucun attendu n'est tapé ici)")
arbre_fin = [f for f in git("ls-tree", "-r", "--name-only", FIN, "--", PASSE).decode().split("\n") if f.strip()]


def piece(nom):
    return show(FIN, f"{PASSE}/{nom}")


txt_prop = nettoyer(cont_fin)
sect_res = cont_fin[cont_fin.find("### D330 — RÉSULTAT DE LA PASSE"):]
bloc_tab = bloc_entre(sect_res, "| mesure | code RÉEL | chiffres", "\n\n") or ""
lignes_tab = [l for l in bloc_tab.split("\n") if l.startswith("|") and not l.startswith("|---") and not l.startswith("| mesure")]
LIG = {}
for l in lignes_tab:
    cellules = [nettoyer(c.strip()) for c in l.strip().strip("|").split(" | ")]
    LIG[cellules[0]] = cellules


def ligne_tab(prefixe):
    """La ligne dont l'étiquette est EXACTEMENT `prefixe`, sinon la seule dont l'étiquette le COMMENCE (« test » commence « test:int » et « test:e2e » : l'exact l'emporte)."""
    exact = [k for k in LIG if k == prefixe]
    if len(exact) == 1:
        return LIG[exact[0]]
    trouvees = [k for k in LIG if k.startswith(prefixe)]
    return LIG[trouvees[0]] if len(trouvees) == 1 else None


ctl("R0", "le tableau de D330 a 5 cellules par ligne", [5] * len(lignes_tab), [len(c) for c in LIG.values()])
print(f"   (parcouru : {len(lignes_tab)} ligne(s) de tableau : " + " | ".join(k[:22] for k in LIG) + ")")

# ── Les prédictions du protocole (point d'entrée du rang 36 À 77de612) : extraites du TEXTE du protocole
cont_proto = norm(show(PROTO, CONT))
pred_bloc = nettoyer(bloc_entre(cont_proto, "**PRÉDICTIONS, DÉRIVÉES et non critères** — celles de D329", "**Limites écrites d'avance**") or "")
pred = {}
m = re.search(r"test (\d+)/(\d+) · (\d+)/(\d+) · (\d+)/(\d+) · (\d+)/(\d+) = ([\d ]+) / (\d+)", pred_bloc)
pred["test"] = (sorted((int(m[i]), int(m[i + 1])) for i in (1, 3, 5, 7)), (int(m[9].replace(" ", "")), int(m[10]))) if m else None
m = re.search(r"test:int (\d+)/(\d+)", pred_bloc)
pred["testint"] = (int(m[1]), int(m[2])) if m else None
m = re.search(r"test:e2e (\d+) passés · (\d+) ignoré \((\d+)\)", pred_bloc)
pred["e2e"] = tuple(int(x) for x in m.groups()) if m else None
m = re.search(r"\((\d+) campagnes\) : (\d+) campagnes · (\d+) mordues · (\d+) muette · (\d+) non mesurées", pred_bloc)
pred["tout"] = (int(m[2]), int(m[3]), int(m[4]), int(m[5])) if m else None
seg = re.search(r"--int ×8 : (.*?) = (\d+) ;", pred_bloc)
pred["int_valeurs"] = [int(k) for _, k in re.findall(r"([a-z0-9\-]+) (\d+)(?= \(|,| =)", seg[1] + " =")] if seg else None
pred["int_somme"] = int(seg[2]) if seg else None
m = re.search(r"--e2e ×1 \(r26 seul\) : (\d+)", pred_bloc)
pred["r26"] = int(m[1]) if m else None
m = re.search(r"CERTIFIANT : (\d+) mordues · (\d+) muette · (\d+) non mesurée, (\d+) campagnes sur (\d+)", pred_bloc)
pred["certifiant"] = tuple(int(x) for x in m.groups()) if m else None
m = re.search(r"lue au chemin (\d+) · lue hors du chemin (\d+) · code de sortie seul, non prouvée \(R1\) (\d+) · code de sortie seul, non classée (\d+)", pred_bloc)
pred["etiq"] = tuple(int(x) for x in m.groups()) if m else None
m = re.search(r"(\d+) / (\d+) / (\d+) « Done »", pred_bloc)
pred["done"] = [int(x) for x in m.groups()] if m else None
cles = ("test", "testint", "e2e", "tout", "int_valeurs", "r26", "certifiant", "etiq", "done")
ctl("R1", "les prédictions du protocole (`77de612`) sont extraites du texte du protocole : neuf clés (portes, test:int, e2e, --tout, --int, r26, certifiant, étiquettes, « Done »)", [True] * 9, [bool(pred.get(k)) for k in cles])
print(f"   (prédictions lues : {pred})")
ctl("R1b", "le protocole prédit HUIT valeurs `--int` (une par harnais verrouillé) dont la somme est celle qu'il écrit", (8, pred["int_somme"]), (len(pred["int_valeurs"] or []), sum(pred["int_valeurs"] or [])))

for ident, nom in (("R2", "typecheck"), ("R3", "lint"), ("R4", "build")):
    cel = ligne_tab(nom)
    log, code, hrs = piece(f"{nom}.log"), piece(f"{nom}.code").strip(), duree_code(piece(f"{nom}.heures"))
    txt = entiers(cel[2])
    mesure = [compte_done(log)] + ([erreurs_ts(log)] if nom == "typecheck" else []) + [hrs[0]]
    ctl(ident, f"`{nom}` : le texte {txt} = « Done » / error TS / durée recomptés dans `{nom}.log` et `{nom}.heures` ; le code du texte = `{nom}.code`", (txt, cel[1]), (mesure, code))
ctl("R5", "les « Done » du texte sont ceux que le protocole prédit (« 8 / 8 / 4 « Done » »)", pred["done"], [entiers(ligne_tab(n)[2])[0] for n in ("typecheck", "lint", "build")])

cel = ligne_tab("test")
txt = entiers(cel[2])
bil = bilans_vitest(piece("test.log"))
paires_piece = sorted((b[1][0], b[0][0]) for b in bil)
paires_txt = sorted((txt[i], txt[i + 1]) for i in range(0, 8, 2))
tot_piece = (sum(b[1][0] for b in bil), sum(b[0][0] for b in bil))
ctl("R6", "`test` : les quatre couples tests/fichiers du texte = ceux des quatre résumés vitest de `test.log` ; leur somme et la durée = `test.log` et `test.heures`", (paires_txt, (txt[8], txt[9]), txt[10]), (paires_piece, tot_piece, duree_code(piece("test.heures"))[0]))
ctl("R7", "`test` : aucun test en échec dans les quatre résumés ; le mesuré (couples, somme) est ce que le protocole prédit, et le tableau le marque « ✓ exact »", (0, pred["test"], True), (sum(b[1][1] + b[0][1] for b in bil), (paires_piece, tot_piece), cel[3].replace("✓ ", "").strip() == "exact"))
ctl("R8", "`test` : le code RÉEL du tableau = `test.code`", cel[1], piece("test.code").strip())

cel = ligne_tab("test:int")
bil = bilans_vitest(piece("testint.log"))
mes_i = [bil[0][1][0], bil[0][1][2], bil[0][0][0], bil[0][0][2], duree_code(piece("testint.heures"))[0]]
ctl("R9", "`test:int` : (468 passés sur 468 ; 38 fichiers sur 38 ; 310 s) du texte = le résumé de `testint.log` (aucun échec) et `testint.heures` ; le code du tableau = `testint.code`", (entiers(cel[2])[:5], cel[1]), (mes_i, piece("testint.code").strip()))
ctl("R10", "`test:int` : la prédiction du protocole (468 tests, 38 fichiers) = le mesuré, aucun échec ; le tableau le marque « ✓ exact »", (pred["testint"], 0, True), ((mes_i[0], mes_i[2]), bil[0][1][1] + bil[0][0][1], "exact" in cel[3]))

cel = ligne_tab("test:e2e")
ex = piece("e2e-EXTRAIT.txt")
mr = re.search(r"Running : \[(\d+)\] · résumé : \{(.*?)\}", ex)
res = {k: int(v) for k, v in re.findall(r"'(\w+)': (\d+)", mr[2])} if mr else {}
mt = re.match(r"(\d+) passés · (\d+) ignoré sur (\d+) \((\d+) s\)", cel[2])
mes_e = [res.get("passed"), res.get("skipped"), int(mr[1]) if mr else None, duree_code(piece("e2e.heures"))[0]]
ctl("R11", "`test:e2e` : le texte (48 passés · 1 ignoré sur 49, 163 s) = le résumé de `e2e-EXTRAIT.txt` et `e2e.heures` ; le code du tableau = `e2e.code`", ([int(x) for x in mt.groups()] if mt else None, cel[1]), (mes_e, piece("e2e.code").strip()))
ctl("R12", "`test:e2e` : la prédiction du protocole (passés · ignoré · total) = le mesuré", pred["e2e"], tuple(mes_e[:3]))
mp = re.search(r"lignes parcourues : (\d+) \(attendu (\d+).*?gardées : (\d+)", ex)
mt2 = re.search(r"\((\d[\d ]*) lignes parcourues, attendu (\d[\d ]*) ; (\d+) gardées", cel[4])
ctl("R13", "`test:e2e` : « 1 478 lignes parcourues, attendu 1 478 ; 52 gardées » (colonne pièces du tableau) = l'en-tête de l'extrait", [int(mt2[1].replace(" ", "")), int(mt2[2].replace(" ", "")), int(mt2[3])] if mt2 else None, [int(mp[1]), int(mp[2]), int(mp[3])] if mp else None)
m49 = re.search(r"(\d+) jetons dans la source, (\d+) dans l'extrait", txt_prop)
non_verifiable("N3", f"« {m49[1] if m49 else '?'} jetons dans la source, {m49[2] if m49 else '?'} dans l'extrait » (e2e) : la source est le journal brut de l'e2e, HORS dépôt (il porte des jetons) ; D330 le dit « imprimé par l'outil, rapporté, non versé »")

cel = ligne_tab("--tout")
mt = re.match(r"(\d+) campagnes · (\d+) mordues · (\d+) muette · (\d+) non mesurées, ([\d ]+) s ; (\d+) journaux de CETTE passe copiés, (\d+) antérieur", cel[2])
rt = resume_tout(piece("campagnes-tout.log"))
n_camp = sum(1 for f in arbre_fin if f.startswith(f"{PASSE}/campagnes/"))
n_r23 = sum(1 for f in arbre_fin if f.startswith(f"{PASSE}/rang23/"))
n_aoa = sum(1 for f in arbre_fin if f.startswith(f"{PASSE}/available-on-api/"))
n_ant = sum(1 for f in arbre_fin if "ANTERIEUR-A-LA-PASSE" in f)
txt_tout = [int(mt[1]), int(mt[2]), int(mt[3]), int(mt[4]), int(mt[5].replace(" ", "")), int(mt[6]), int(mt[7])] if mt else None
ctl("R14", "`--tout` : (campagnes, mordues, muettes, non mesurées, secondes, journaux copiés, antérieurs) du texte = la ligne MESURÉ de `campagnes-tout.log`, `campagnes-tout.heures` et les fichiers de la passe", txt_tout, [rt[3], rt[0], rt[1], rt[2], duree_code(piece("campagnes-tout.heures"))[0], n_camp + n_r23 + n_aoa, n_ant])
ctl("R15", "`--tout` : le code RÉEL du tableau (« 1 (attendu) ») = `campagnes-tout.code`", entiers(cel[1])[0], int(piece("campagnes-tout.code").strip()))
ctl("R16", "`--tout` : la prédiction du protocole (campagnes · mordues · muette · non mesurées) = le mesuré", pred["tout"], (rt[3], rt[0], rt[1], rt[2]))
print(f"   (parcouru : campagnes/ {n_camp} · rang23/ {n_r23} · available-on-api/ {n_aoa} · « ANTERIEUR-A-LA-PASSE » {n_ant})")

cel = ligne_tab("--int")
paires_txt = re.findall(r"(-?[\w]+(?:-[\w]+)*) (\d+) \(([\d ]+) s", cel[2])
noms_int = sorted(re.match(rf"{re.escape(PASSE)}/int-(.+)\.log$", f)[1] for f in arbre_fin if re.match(rf"{re.escape(PASSE)}/int-(.+)\.log$", f))
mesure_int = {}
for n in noms_int:
    g = gardes_mordues(piece(f"int-{n}.log"))
    h = duree_code(piece(f"int-{n}.heures"))
    mesure_int[n] = (g[0], g[1], h[0], h[1], piece(f"int-{n}.code").strip())
dev, prec = [], ""
for n, k, s in paires_txt:
    if n.startswith("-"):
        n = prec + n
    else:
        prec = n.split("-")[0] if n.startswith("solid") else prec
    dev.append((n, int(k), int(s.replace(" ", ""))))
ctl("R17", "`--int` ×8 : les huit couples (harnais, gardes mordues, secondes) du texte = ceux des `int-<harnais>.log` / `.heures` (les noms « -s2 », « -s3 », « -s6 » complétés par « solid »)", sorted(dev), sorted((n, v[0], v[2]) for n, v in mesure_int.items()))
n_code = int(re.search(r"×(\d+)", cel[1])[1])
ctl("R18", "`--int` ×8 : mordues = cibles jouées pour chaque harnais ; le code du tableau (« 0 ×8 ») = les huit `int-<harnais>.code`", (True, ["0"] * n_code), (all(v[0] == v[1] for v in mesure_int.values()), [v[4] for v in mesure_int.values()]))
mtot = re.search(r"= (\d+)$", cel[2].strip())
ctl("R19", "`--int` ×8 : la somme du texte = la somme des mesurées ; les valeurs prédites par le protocole, une à une, sont les mesurées", (int(mtot[1]), pred["int_valeurs"]), (sum(v[0] for v in mesure_int.values()), [mesure_int[n][0] for n in noms_int]))
print(f"   (parcouru : {len(noms_int)} harnais --int : {noms_int})")

cel = ligne_tab("--e2e")
g = gardes_mordues(piece("e2e-r26.log"))
mt = re.match(r"(\d+) \((\d+) s\)", cel[2])
ctl("R20", "`--e2e` ×1 (r26) : « 4 (457 s) » = `e2e-r26.log` (mordues = cibles) et `e2e-r26.heures` ; le code du tableau = `e2e-r26.code` ; la prédiction du protocole = le mesuré", ([int(mt[1]), int(mt[2]), cel[1], pred["r26"]]) if mt else None, [g[0], duree_code(piece("e2e-r26.heures"))[0], piece("e2e-r26.code").strip(), g[0]])
ctl("R20b", "`--e2e` ×1 (r26) : les gardes mordues sont les cibles jouées", g[0], g[1])
cel = ligne_tab("contre-épreuve")
g = gardes_mordues(piece("contre-epreuve.log"))
mt = re.match(r"(\d+) mordues sur (\d+) \((\d+) s\)", cel[2])
ctl("R21", "contre-épreuve : « 5 mordues sur 5 (3 s) » = `contre-epreuve.log` et `.heures` ; le code du tableau = `contre-epreuve.code`", ([int(x) for x in mt.groups()] + [cel[1]]) if mt else None, [g[0], g[1], duree_code(piece("contre-epreuve.heures"))[0], piece("contre-epreuve.code").strip()])

cel = ligne_tab("lecture de rang23")
r23 = piece("lecture-rang23.txt")
m = re.search(r"MESURES LUES : (\d+) · MORSURES LUES : (\d+) · DÉMARRÉES \(exécutés > 0\) : (\d+)", r23)
ctl("R22", "lecture de `rang23` : « 13 mesures : MORSURES LUES 13 · DÉMARRÉES 13 » = la dernière ligne de `lecture-rang23.txt`", entiers(cel[2]), [int(x) for x in m.groups()] if m else None)
cel = ligne_tab("lecture d'available-on-api")
aoa = piece("lecture-available-on-api.txt")
m = re.search(r"journaux lus : (\d+).*?pré-vol (\d+).*?écarts (\d+)", aoa)
ctl("R23", "lecture d'`available-on-api` : « 30 journaux · 12 pré-vols · 0 écart » = `lecture-available-on-api.txt` ; autant de fichiers que de journaux lus dans `available-on-api/`", (entiers(cel[2]), entiers(cel[2])[0]), ([int(x) for x in m.groups()] if m else None, n_aoa))
lc = piece("lecture-campagnes.txt")
m = re.search(r"CERTIFIANT : (\d+) mordues · (\d+) muettes · (\d+) non mesurées · (\d+) campagnes qui COMPTENT sur (\d+) \(attendu (\d+)\) · déclarées (\d+)", lc)
rangees_lc = [l for l in lc.split("\n") if re.match(r"^\S+\s+(--tout|--int|--e2e)\s+\d+\s+\d+", l)]
au_dessus = sum(1 for l in rangees_lc if "≥ plancher" in l)
lues = sum(1 for l in rangees_lc if re.search(r"\sLUE\s", l))
oui = sum(1 for l in rangees_lc if re.search(r"\sOUI\s", l))
der329 = show(FIN, f"{PD329}/plancher/deriver-plancher-sortie.txt")
repris, mesures = len(re.findall(r"REPRIS de D324", der329)), len(re.findall(r"MESURÉ à D329", der329))
lignes_p = lambda t: [l for l in t.split("\n") if l.startswith("P ")]
plancher_identique = lignes_p(show(FIN, f"{PD}/plancher/plancher.txt")) == lignes_p(show(FIN, f"{PD329}/plancher/plancher.txt")) and len(lignes_p(show(FIN, f"{PD}/plancher/plancher.txt"))) == repris + mesures
cal12 = len(re.findall(r"^  ✓", show(FIN, f"{PD}/outils/lire-campagnes-calibration.txt"), re.M))
cel = ligne_tab("lecture des campagnes")
mt = re.match(r"(\d+) mordues · (\d+) muettes · (\d+) non mesurées, (\d+) campagnes sur (\d+) qui COMPTENT ; point 12 : (\d+) au-dessus de leur plancher \((\d+) repris, (\d+) mesurés\), (\d+) LUES ; calibration (\d+) bras sur (\d+)", cel[2])
tg = [int(x) for x in mt.groups()] if mt else None
ctl("R24", "lecture des campagnes : « 416 mordues · 0 muettes · 0 non mesurées, 34 campagnes sur 34 qui COMPTENT » = la ligne CERTIFIANT de `lecture-campagnes.txt` ; le protocole prédit la même chose", (tg[:5], tg[4], tg[0], pred["certifiant"]) if tg else None, ([int(m[1]), int(m[2]), int(m[3]), int(m[4]), int(m[5])], int(m[6]), int(m[7]), tuple(int(m[i]) for i in (1, 2, 3, 4, 5))) if m else None)
ctl("R25", "lecture des campagnes : « point 12 : 30 au-dessus de leur plancher (26 repris, 4 mesurés), 4 LUES ; calibration 12 bras sur 12 » = lignes « ≥ plancher » de la lecture ; REPRIS / MESURÉ recomptés dans la dérivation de D329 (D330 REPREND ses 30 planchers) ; LUE ; bras ✓", tg[5:9] + [tg[9]] if tg else None, [au_dessus, repris, mesures, lues, cal12])
ctl("R25b", "le `plancher.txt` de D330 porte les 30 lignes « P … » IDENTIQUES, ligne pour ligne, à celles de D329 (« 30 planchers REPRIS de D329, sans retouche d'un chiffre »)", (True, 30), (plancher_identique, len(lignes_p(show(FIN, f"{PD}/plancher/plancher.txt")))))
ctl("R26", "lecture des campagnes : les lignes de campagne du tableau de lecture sont au nombre des « campagnes sur N » du texte, et toutes « OUI » (elles comptent)", (tg[4], tg[4]) if tg else None, (len(rangees_lc), oui))
print(f"   (parcouru : {len(lc.splitlines())} ligne(s) de `lecture-campagnes.txt`, dont {len(rangees_lc)} de campagne)")
tot_et = {"lue chemin": 0, "lue hors chemin": 0, "non prouvée (R1)": 0, "non classée": 0}
for l in rangees_lc:
    fin_l = l.split(" OUI ", 1)[1] if " OUI " in l else ""
    for lib, n in re.findall(r"(lue chemin|lue hors chemin|non prouvée \(R1\)|non classée) (\d+)", fin_l):
        tot_et[lib] += int(n)
m = re.search(r"ÉTIQUETTES : lue chemin (\d+) · lue hors chemin (\d+) · non prouvée \(R1\) (\d+) · non classée (\d+) · somme (\d+)", lc)
cel = ligne_tab("étiquettes")
mt = re.search(r"lue chemin (\d+) · lue hors chemin (\d+) · non prouvée \(R1\) (\d+) · non classée (\d+) ; somme (\d+)", cel[2])
txt_et = [int(x) for x in mt.groups()] if mt else None
ctl("R27", "étiquettes : le texte (13 · 27 · 81 · 295, somme 416) = la ligne ÉTIQUETTES de la pièce = la somme RECOMPTÉE sur les 34 lignes de campagne ; les quatre premières valeurs = la prédiction du protocole",
    (txt_et, txt_et, list(pred["etiq"]) if pred["etiq"] else None), ([int(x) for x in m.groups()] if m else None, list(tot_et.values()) + [sum(tot_et.values())], (txt_et[:4] if txt_et else None)))
ctl("R27b", "étiquettes : la somme des étiquettes = les mordues certifiantes", tg[0] if tg else None, sum(tot_et.values()))

cel = ligne_tab("lecture à la main")
lm = piece("lecture-main-r26.txt")
motifs_r2 = [r"Test timeout of", r"Test ended", r"locator\.(click|fill|press)", r"page\.(goto|waitFor)", r"Timeout \d+ms exceeded", r"exceeded while"]
comptes_r2 = {}
for k in range(1, 5):
    ex_r = [f for f in arbre_fin if f.endswith(f"/lecture-r26/R26-{k}.txt")]
    comptes_r2[k] = [len(re.findall(p, show(FIN, ex_r[0]) if ex_r else "", re.I)) for p in motifs_r2]
n_sig = int(re.search(r"(\d+) signature de la règle 2", cel[2])[1])
ctl("R28", "lecture à la main de R26 : « 0 signature de la règle 2 sur les quatre extraits » — les quatre extraits existent et les six motifs (délai de test, d'action) comptent 0 chacun, RECOMPTÉ ici", ([[n_sig] * 6] * 4, 4), ([comptes_r2[k] for k in range(1, 5)], len([f for f in arbre_fin if "/lecture-r26/R26-" in f])))
ctl("R29", "lecture à la main de R26 : la pièce dit « règle 1 satisfaite » et des comptes nuls pour chacun des quatre extraits", (True, True), ("La règle 1 est satisfaite" in lm, "0, 0, 0, 0, 0, 0" in lm))

# ── .env : la ligne du tableau
cel = ligne_tab("état des .env")
ctl("R30", "état des `.env` : « ouverture : 3 fichiers, 8 variables d'URL, 0 hôte non local, VERTE ; clôture : IDENTIQUE » (texte) = les chiffres des pièces (famille E) et le code de sortie du tableau",
    ((3, 8, 0), "VERTE", "IDENTIQUE", "0"), (r_ouv, porte_ouv, "IDENTIQUE" if "COMPARAISON : IDENTIQUE" in p_cmp else "AUTRE", cel[1]))
m_env = re.search(r"ouverture : (\d+) fichiers, (\d+) variables d'URL, (\d+) hôte non local", cel[2])
ctl("R30b", "état des `.env` : les trois entiers du texte de la cellule = le résumé de la pièce d'ouverture", tuple(int(x) for x in m_env.groups()) if m_env else None, r_ouv)

# ── échantillonneur : recomptage ligne à ligne de etat.csv
h, data = echantillons_csv(piece("etat.csv"))
ix = {n: h.index(n) for n in h}
ts = [datetime.strptime(r[ix["horodatage"]], "%Y-%m-%d %H:%M:%S") for r in data]
ecarts_s = [(ts[i + 1] - ts[i]).total_seconds() for i in range(len(ts) - 1)]
fenetre_min = round((ts[-1] - ts[0]).total_seconds() / 60, 1)
perf100 = sum(1 for r in data if float(r[ix["perf_pct"]]) > 100)
cel = ligne_tab("échantillonneur")
m1 = re.search(r"(\d+) échantillons sur ([\d,]+) min, (\d+) échec-instrument, (\d+) transition, (\d+) trou, (\w+) seul, chrome max (\d+), écarts (\d+)-(\d+) s ; PERF > 100 sur (\d+) échantillons sur (\d+)", cel[2])
txt_s = ([int(m1[1]), float(m1[2].replace(",", ".")), [m1[6]], int(m1[7]), int(m1[8]), int(m1[9]), int(m1[10]), int(m1[11])]) if m1 else None
ctl("R31", "échantillonneur : « 312 échantillons sur 164 min », SECTEUR seul, `chrome` max 0, écarts 31-34 s, `PERF` > 100 sur 287 sur 312 = `etat.csv` RECOMPTÉ ligne à ligne (pas le résumé)", txt_s,
    [len(data), fenetre_min, sorted(set(r[ix["alim"]] for r in data)), max(int(r[ix["chrome"]]) for r in data), int(min(ecarts_s)), int(max(ecarts_s)), perf100, len(data)])
er = piece("etat-resume.txt")
ctl("R32", "échantillonneur : « 0 échec-instrument, 0 transition, 0 trou » (texte) = `etat-resume.txt` ; l'effectif = ECHANTILLONS ; aucun écart entre deux échantillons au-delà de 60 s (recomptage)",
    ([int(m1[1]), int(m1[3]), int(m1[4]), int(m1[5]), 0]) if m1 else None, [int(re.search(r"ECHANTILLONS=(\d+)", er)[1]), int(re.search(r"ECHEC-INSTRUMENT=(\d+)", er)[1]), int(re.search(r"TRANSITIONS_ALIMENTATION=(\d+)", er)[1]), int(re.search(r"TROUS_DANS_LA_SERIE=(\d+)", er)[1]), sum(1 for e in ecarts_s if e > 60)])
prog_l = [l for l in prog.split("\n") if l.strip()]
t_ouv = datetime.strptime(prog_l[0][:19], "%d/%m/%Y %H:%M:%S")
t_clo = datetime.strptime(prog_l[-1][:19], "%d/%m/%Y %H:%M:%S")
m3 = re.search(r"Passe r36b-20261013-0106, (\d\d:\d\d:\d\d) → (\d\d:\d\d:\d\d) \(([\d,]+) min\)", txt_prop)
ctl("R33", "la passe : « 01:06:24 → 03:52:04 (165,7 min) » = premier et dernier horodatages de `progression.txt`", (m3[1], m3[2], float(m3[3].replace(",", "."))) if m3 else None, (t_ouv.strftime("%H:%M:%S"), t_clo.strftime("%H:%M:%S"), round((t_clo - t_ouv).total_seconds() / 60, 1)))

cel = ligne_tab("arbre")
marbre = re.match(r"immobile sur (\w+) aux (\w+) contrôles, (\d+) ligne de statut à chacun", cel[2])
nb_mots = {"SIX": 6}
arbres = []
for k in range(1, 7):
    t = piece(f"arbre-{k}.txt")
    corps = t.split("--- git status --porcelain (vide exigé)\n", 1)[1].split("--- fin")[0] if "--- git status" in t else None
    arbres.append((re.search(r"^HEAD (\w+)", t, re.M)[1][:7], len(corps.strip().splitlines()) if corps is not None else None))
ctl("R34", "arbre : « immobile sur 77de612 aux SIX contrôles, 0 ligne de statut à chacun » = `arbre-1.txt` à `arbre-6.txt` (HEAD et statut)", [(marbre[1], int(marbre[3]))] * nb_mots[marbre[2]] if marbre else None, arbres)
ctl("R35", "arbre : aucun fichier « …-NON-CONFORME » dans la passe", [], [f for f in arbre_fin if "NON-CONFORME" in f])
print(f"   (parcouru : {len(arbre_fin)} fichier(s) de la passe ; {sum(1 for f in arbre_fin if re.search(r'/arbre-\d\.txt$', f))} fichier(s) `arbre-N.txt`)")

av, ac = show(FIN, f"{PD}/aucune-valeur-reelle.txt"), show(FIN, f"{PD}/aucun-cookie-reel.txt")
mv = re.search(r"valeurs cherchées : (\d+) \((\d+) journal.*?parcourus : (\d+) fichiers.*?porteurs : (\d+)", av, re.S)
mc = re.search(r"valeurs cherchées : (\d+) \((\d+) journal.*?parcourus : (\d+) fichiers.*?porteurs : (\d+)", ac, re.S)
cel = ligne_tab("« 0 valeur réelle »")
m4 = re.search(r"(\d+) valeurs cherchées \((\d+) journaux avec jetons\), ([\d ]+) fichiers, (\d+) porteur ; contrôle cookie : (\d+) valeurs \((\d+) journaux\), ([\d ]+) fichiers, (\d+) porteur", cel[2])
ctl("R36", "« 0 valeur réelle » : (valeurs, journaux, fichiers, porteurs) du texte = les deux pièces (jetons, puis cookies)", ([int(m4[1]), int(m4[2]), int(m4[3].replace(" ", "")), int(m4[4]), int(m4[5]), int(m4[6]), int(m4[7].replace(" ", "")), int(m4[8])]) if m4 else None, ([int(x) for x in mv.groups()] + [int(x) for x in mc.groups()]) if mv and mc else None)

rj1, rj2 = show(FIN, f"{PD}/rejeu-specs/r32-nouvelle-reservation-EXTRAIT.txt"), show(FIN, f"{PD}/rejeu-specs/r30-lien-calendrier-pro-EXTRAIT.txt")
a1, a2 = re.search(r"(\d+) passed \(([\d.]+)s\)", rj1), re.search(r"(\d+) passed \(([\d.]+)s\)", rj2)
cel = ligne_tab("rejeu")
m5 = re.search(r"r32-nouvelle-reservation : (\d+) passés \(([\d,]+) s\) ; spec du lien : (\d+) passés \(([\d,]+) s", cel[2])
ctl("R37", "rejeu des deux specs : « 5 passés (58,5 s) » et « 2 passés (57,1 s) » = les `N passed (…s)` des deux extraits", ([int(m5[1]), float(m5[2].replace(",", ".")), int(m5[3]), float(m5[4].replace(",", "."))]) if m5 else None, [int(a1[1]), float(a1[2]), int(a2[1]), float(a2[2])] if a1 and a2 else None)

inv = {}
for nom, chemin in (("ouverture", f"{PASSE}/inventaire-ouverture.txt"), ("après e2e", f"{PASSE}/inventaire-apres-e2e.txt"), ("clôture", f"{PASSE}/inventaire-cloture.txt"),
                    ("avant rejeu", f"{PD}/rejeu-specs/inventaire-avant-rejeu.txt"), ("après rejeu", f"{PD}/rejeu-specs/inventaire-apres-rejeu.txt")):
    inv[nom] = comptes_inventaire(show(FIN, chemin))
cel = ligne_tab("inventaires")
m6 = re.search(r"chrome (\d+) et headless_shell (\d+) .*?node (\d+) à chacun ; msedge (\d+)", cel[2])
ctl("R38", "inventaires : « chrome 0 et headless_shell 0 … node 0 à chacun ; msedge 5 » = les cinq relevés (ouverture, après e2e, clôture, avant et après le rejeu)", [tuple(int(m6[i]) for i in (1, 2, 3, 4))] * 5 if m6 else None, [(v.get("chrome"), v.get("headless_shell"), v.get("node"), v.get("msedge")) for v in inv.values()])

m_dur = re.search(r"`--tout` : ([\d ]+) s \(contre ([\d ]+) s à D329, ([\d ]+) s à D324\)", cont_fin) or re.search(r"--tout`? : \*?\*?([\d ]+) s\*?\*? \(contre ([\d ]+) s à D329, ([\d ]+) s à D324\)", cont_fin)
d324_tout = [f for f in git("ls-tree", "-r", "--name-only", FIN, "--", "docs/preuves/D324").decode().split("\n") if f.endswith("campagnes-tout.heures")]
ctl("R39", "« --tout : 5 099 s (contre 5 504 s à D329, 3 313 s à D324) » (texte, « Au-delà de la prédiction ») = les `campagnes-tout.heures` des trois passes", [int(m_dur[i].replace(" ", "")) for i in (1, 2, 3)] if m_dur else None,
    [duree_code(piece("campagnes-tout.heures"))[0], duree_code(show(FIN, f"{PASSE329}/campagnes-tout.heures"))[0], duree_code(show(FIN, d324_tout[0]))[0] if len(d324_tout) == 1 else None])

# ══ FAMILLE M — la RAM : le relevé sous la barre, les échantillons sous la barre, la clôture (Ko : « la RAM : le relevé sous la barre, les 248 échantillons, la clôture ») ═
print("\n== M — la RAM de la passe de D330 (porte dure d'ouverture, 21 relevés de sonde, 312 échantillons, clôture) ; et la règle que Ko vient d'écrire")
s1, s2, sc = champs_sonde(piece("sonde-ouverture-1.txt")), champs_sonde(piece("sonde-ouverture-2.txt")), champs_sonde(piece("sonde-cloture.txt"))
fl = lambda s: float(s.replace(" ", "").replace(",", "."))
m6 = re.search(r"RAM ([\d ]+(?:,\d)?) \(bande ([\d ]+)-([\d ]+)\) puis ([\d ]+(?:,\d)?) \(([\d ]+)-([\d ]+)\), barre imprimée ([\d ]+)", txt_prop)
ctl("M1", "porte dure à l'ouverture : « RAM 4 949 (4 928-4 962) puis 5 090,5 (4 962-5 112), barre 4 579 » = `sonde-ouverture-1/2.txt` ; `porte-dure.txt` = VERTE ; `chrome` 0, `node` 0, SECTEUR aux deux relevés",
    ([fl(m6[i]) for i in range(1, 8)], "VERTE", ("0", "0", "SECTEUR"), ("0", "0", "SECTEUR")) if m6 else None,
    ([float(s1["RAM_MEDIANE_MO"]), s1["BANDE"][0], s1["BANDE"][1], float(s2["RAM_MEDIANE_MO"]), s2["BANDE"][0], s2["BANDE"][1], float(s1["BARRE_D273_MO"])], piece("porte-dure.txt").strip(), (s1["CHROME"], s1["NODE"], s1["ALIM_SOURCE"]), (s2["CHROME"], s2["NODE"], s2["ALIM_SOURCE"])))
noms_sondes = sorted(f for f in arbre_fin if re.search(r"/sonde-[^/]+\.txt$", f))
sous = [f for f in noms_sondes if sous_la_barre(champs_sonde(show(FIN, f)))]
barre_val = float(s1["BARRE_D273_MO"])
sous_csv = [r for r in data if float(r[ix["ram_libre_mo"]]) < barre_val]
node0 = [r for r in data if r[ix["node"]] == "0"]
node0_sous = [r for r in node0 if float(r[ix["ram_libre_mo"]]) < barre_val]
chrome_pos = [r for r in data if int(r[ix["chrome"]]) > 0]
txt_m = nettoyer(bloc_entre(cont_fin, "#### ⛔ CE QUE LA MARQUE DIT DE L'AMBIANT", "#### ⛔ CE QUE LA MARQUE EST") or "")
m7 = re.search(r"(Un|\d+) relevés? de sonde sur (\d+) est sous la barre : ([\w\-.]+) \((\d\d:\d\d:\d\d)\) — RAM médiane ([\d ]+,\d), bande ([\d ]+)-([\d ]+), contre la barre ([\d ]+)", txt_m)
ctl("M2a", "le texte de D330 nomme UN relevé de sonde sous la barre (extraction du texte, une correspondance)", True, bool(m7))
sonde_nom = m7[3]
s_bas = champs_sonde(show(FIN, f"{PASSE}/{sonde_nom}"))
ctl("M2", "le relevé de sonde sous la barre : « 1 sur 21 … sonde-avant-int-solid-s2.txt (03:27:49) — RAM médiane 4 559,5, bande 4 551-4 567, contre la barre 4 579 » = la pièce nommée ; ET c'est le SEUL relevé que `sous_la_barre` retient parmi les relevés de la passe",
    (1 if m7[1] == "Un" else int(m7[1]), [sonde_nom], int(m7[2]), (fl(m7[5]), float(fl(m7[6])), float(fl(m7[7])), fl(m7[8]))),
    (len(sous), [os.path.basename(f) for f in sous], len(noms_sondes), (float(s_bas["RAM_MEDIANE_MO"]), float(s_bas["BANDE"][0]), float(s_bas["BANDE"][1]), float(s_bas["BARRE_D273_MO"]))))
ctl("M2b", "ce relevé : `SECTEUR`, `node` 0, `chrome` 0 (texte) = la pièce ; l'horodatage du texte (03:27:49) est dans la pièce", ("SECTEUR", "0", "0", True), (s_bas["ALIM_SOURCE"], s_bas["NODE"], s_bas["CHROME"], m7[4] in show(FIN, f"{PASSE}/{sonde_nom}")))
m_cl = re.search(r"dont la clôture \(([\d ]+(?:,\d)?), bande ([\d ]+)-([\d ]+)\)", txt_m)
ctl("M3", "la clôture est AU-DESSUS de la barre (médiane ET bande basse) et `chrome` y vaut 0 : `sonde-cloture.txt`", (True, "0"), (not sous_la_barre(sc), sc["CHROME"]))
ctl("M3b", "la clôture du texte (« 4 671, bande 4 614-4 678 ») = la pièce `sonde-cloture.txt`", (fl(m_cl[1]), fl(m_cl[2]), fl(m_cl[3])) if m_cl else None, (float(sc["RAM_MEDIANE_MO"]), float(sc["BANDE"][0]), float(sc["BANDE"][1])))
m8 = re.search(r"(\d+) échantillons sur (\d+) sont sous la barre \(min ([\d ]+?) Mo\), (\d+) avec des node de la mesure, (\d+) à node = 0 \(([^)]*)\)", txt_m)
ctl("M4", "« 248 échantillons sur 312 sont sous la barre (min 2 454 Mo) » (texte) = `etat.csv` RECOMPTÉ avec la barre des sondes (4 579)", (int(m8[1]), int(m8[2]), fl(m8[3])) if m8 else None, (len(sous_csv), len(data), min(float(r[ix["ram_libre_mo"]]) for r in data)))
ctl("M5", "« 246 avec des node de la mesure, 2 à node = 0 » = `etat.csv` recompté (sous la barre avec node > 0 / avec node = 0)", (int(m8[4]), int(m8[5])) if m8 else None, (len(sous_csv) - len(node0_sous), len(node0_sous)))
heures_n0 = re.findall(r"(\d\d:\d\d:\d\d) : ([\d ]+?)(?= ;|$| —)", m8[6]) if m8 else []
ctl("M6", "les deux échantillons à `node` = 0 que le texte date (03:27:41 : 4 560 ; 03:31:53 : 4 220) sont dans `etat.csv` à ces heures, à ces valeurs, sous la barre", sorted((h_, fl(v)) for h_, v in heures_n0),
    sorted((r[ix["horodatage"]][11:], float(r[ix["ram_libre_mo"]])) for r in node0_sous))
ctl("M7", "`chrome` est à 0 aux 312 échantillons (texte) = `etat.csv` recompté ; ET `headless_shell` n'est pas dans le CSV (le CSV ne porte pas ce nom) — c'est l'inventaire qui le relève", (0, 312), (len(chrome_pos), len(data)))
ctl("M8", "D329 (texte de D330) : « 11 sondes sur 21 et 310 échantillons sur 326, dont 12 à node = 0 » = les pièces de la passe de D329, recomptées avec LEUR barre",
    (11, 21, 310, 326, 12), (lambda ss, dd: (sum(1 for f in ss if sous_la_barre(champs_sonde(show(FIN, f)))), len(ss), sum(1 for r in dd[1] if float(r[dd[0].index("ram_libre_mo")]) < barre_val), len(dd[1]), sum(1 for r in dd[1] if r[dd[0].index("node")] == "0" and float(r[dd[0].index("ram_libre_mo")]) < barre_val)))(
        sorted(f for f in git("ls-tree", "-r", "--name-only", FIN, "--", PASSE329).decode().split("\n") if re.search(r"/sonde-[^/]+\.txt$", f)), echantillons_csv(show(FIN, f"{PASSE329}/etat.csv"))))
print(f"   (parcouru : {len(noms_sondes)} relevés de sonde de D330 ; {len(data)} échantillons de D330 ; barre {barre_val})")
# la règle que Ko vient d'écrire (arbitrage 2 du 13/10) APPLIQUÉE à cette passe — une OBSERVATION dérivée, pas un contrôle du texte de D330
ouvertures_ok = (not sous_la_barre(s1)) and (not sous_la_barre(s2))
cloture_ok = not sous_la_barre(sc)
headless_zero = all(v.get("headless_shell") == 0 for v in inv.values())
ctl("M9", "LA RÈGLE DE KO (13/10, point 2) appliquée à la passe de D330 : ouverture ET clôture au-dessus de la barre, `chrome` = 0 à tous les relevés — la fenêtre n'est pas disqualifiée ; ET (point 4) `headless_shell` = 0 aux cinq inventaires", (True, True, 0, True), (ouvertures_ok, cloture_ok, len(chrome_pos), headless_zero))
h_sonde = datetime.strptime("2026-10-13 " + m7[4], "%Y-%m-%d %H:%M:%S")
proche = min(data, key=lambda r: abs((datetime.strptime(r[ix["horodatage"]], "%Y-%m-%d %H:%M:%S") - h_sonde).total_seconds()))
ecart_proche = abs((datetime.strptime(proche[ix["horodatage"]], "%Y-%m-%d %H:%M:%S") - h_sonde).total_seconds())
constat("M-C1", f"un seul relevé intermédiaire sur 21 est sous la barre (`{sonde_nom}`, médiane {s_bas['RAM_MEDIANE_MO']} contre {s_bas['BARRE_D273_MO']}) : la règle que Ko vient d'écrire (« un relevé intermédiaire sous la barre est noté, il ne disqualifie pas ») le NOTE — il est noté ici et dans D330. "
                f"L'échantillon de `etat.csv` le plus proche ({proche[ix['horodatage']][11:]}, à {int(ecart_proche)} s) dit la même chose : {proche[ix['ram_libre_mo']]} Mo, `node` = {proche[ix['node']]} — le creux est réel, il tombe entre deux rejeux `--int` (le même que M6), et il n'est pas un défaut de sonde.")

# ══ FAMILLE O — les copies d'outillage de D330 : différences comptées et classées ═════════════════════════════════════════
print("\n== O — les copies d'outillage de D330 contre leurs originaux (différences comptées)")
orig_p, copie_p = show(FIN, f"{PD329}/outils/passe.py"), show(FIN, f"{PD}/outils/passe.py")
hp = hunks(orig_p, copie_p)
ajoutees_p = sum(len(b) for t, a, b in hp)
retirees_p = sum(len(a) for t, a, b in hp)
m_p = re.search(r"\*\*(\d+) lignes ajoutées, (\d+) retirée\*\*", txt_prop) or re.search(r"(\d+) lignes ajoutées, (\d+) retirée", txt_prop)
ctl("O1", "`passe.py` (D330) contre D329 : « 36 lignes ajoutées, 1 retirée » (texte) = les morceaux de différence recomptés (lignes ajoutées, lignes retirées)", (int(m_p[1]), int(m_p[2])) if m_p else None, (ajoutees_p, retirees_p))
def classe_passe30(a, b):
    corps = "\n".join(a + b)
    if b and b[0].startswith('"""D330'):
        return "en-tête"
    marques = re.findall(r"\(([123])\)", " ".join(re.findall(r"\[D330 ([^\]]*)\]", corps)))
    return "(" + marques[0] + ")" if marques else "NON CLASSÉ"


cl30 = [classe_passe30(a, b) for t_, a, b in hp]
ctl("O1b", "`passe.py` : chaque morceau est l'en-tête ou porte la marque `[D330 (n)]` de l'une des trois modifications déclarées ; les trois sont présentes ; aucun morceau non classé", (['(1)', '(2)', '(3)'], 0), (sorted(set(c for c in cl30 if c.startswith("("))), cl30.count("NON CLASSÉ")))
print(f"   (passe.py : {len(orig_p.splitlines())} → {len(copie_p.splitlines())} ligne(s) ; {len(hp)} morceau(x))")
lc_o, lc_c = show(FIN, f"{PD329}/outils/lire-campagnes.py"), show(FIN, f"{PD}/outils/lire-campagnes.py")
hl = hunks(lc_o, lc_c)
code_l = [(t, a, b) for t, a, b in hl if not (b and b[0].startswith('"""D330'))]
ctl("O2", "`lire-campagnes.py` (D330) contre D329 : « UNE MODIFICATION DÉCLARÉE… une occurrence de code » = hors l'en-tête, UN seul morceau, d'une ligne, qui change `D329` en `D330` dans le chemin du plancher", (1, 1, 1, True), (len(code_l), sum(len(a) for _, a, _ in code_l), sum(len(b) for _, _, b in code_l), all(b[0] == a[0].replace("D329", "D330") for _, a, b in code_l if len(a) == 1 and len(b) == 1)))
ver_o, ver_c = show(FIN, f"{PD329}/outils/verser.py"), show(FIN, f"{PD}/outils/verser.py")
hv = hunks(ver_o, ver_c)
dst_o = [l for l in ver_o.split("\n") if l.startswith("DST = ")]
dst_c = [l for l in ver_c.split("\n") if l.startswith("DST = ")]
ctl("O3", "`verser.py` (D330) contre D329 : l'en-tête et la ligne `DST` sont les seuls morceaux ; `DST` ne diffère que par `D329` → `D330`, et cette ligne est la SEULE occurrence de code", (["DST", "en-tête"], True), (sorted("DST" if (a and a[0].startswith("DST = ")) else "en-tête" for t, a, b in hv), len(dst_o) == len(dst_c) == 1 and dst_c[0] == dst_o[0].replace("D329", "D330")))
ctl("O4", "`balayage.py` (D330) est la copie à l'OCTET de celui de D329 (même objet git)", blob(FIN, f"{PD329}/passe-d277/balayage.py"), blob(FIN, f"{PD}/passe-d277/balayage.py"))
bout = show(FIN, f"{PD}/etat/etat-env-bout-en-bout.txt")
codes = re.findall(r"^code=(\d+) \(attendu (\d+)\)", bout, re.M)
ctl("O5", "`etat-env.py` joué BOUT EN BOUT (texte : « tout local → 0 ; un tunnel → 3 ; comparaison identique → 0, un octet de plus → 4 ; `apps/api/.env` absent → 2 ») : la pièce porte 5 codes, chacun égal à l'attendu qu'elle imprime", (["0", "3", "0", "4", "2"], True), ([c for c, _ in codes], all(c == a for c, a in codes)))
ctl("O6", "`etat-env.py` : le cas du TUNNEL ne laisse ni l'hôte ni le secret dans la sortie (« 0 partout » dans la pièce)", True, "(attendu 0 partout)" in bout and re.search(r":0 .*:0 .*:0 .*:0 \(attendu 0 partout\)", bout.replace("\n", " ")) is not None)
b0, b1 = {}, {}
for sha, dst in ((D324, b0), (FIN, b1)):
    for l in git("ls-tree", "-r", sha, "--", "neutralisation").decode().splitlines():
        meta, chemin = l.split("\t")
        dst[chemin] = meta.split()[2]
est_h = lambda c: c.startswith("neutralisation/neutralize-") and c.endswith(".py")
nom_h = lambda c: c[len("neutralisation/neutralize-"):-3]
H0 = {nom_h(c): b for c, b in b0.items() if est_h(c)}
H1 = {nom_h(c): b for c, b in b1.items() if est_h(c)}
inch = sorted(n for n in H0 if n in H1 and H0[n] == H1[n])
chg = sorted(n for n in H0 if n in H1 and H0[n] != H1[n])
neufs = sorted(n for n in H1 if n not in H0)
sortie_der = show(FIN, f"{PD}/plancher/deriver-plancher-sortie.txt")
mi = re.search(r"planchers lus : (\d+) \(attendu \d+\) · origine connue pour \d+ \(attendu \d+\) · REPRIS de D324 : (\d+) \(attendu \d+\) · MESURÉS à D329 : (\d+) → (\[.*?\])", sortie_der)
noms_mesures = sorted(re.findall(r"'([\w\-]+)'", mi[4])) if mi else None
planchers_30 = [l.split()[1] for l in show(FIN, f"{PD}/plancher/plancher.txt").split("\n") if l.startswith("P ")]
ctl("O7", "la dérivation des planchers de D330 : (planchers lus, repris de D324, mesurés à D329, noms des mesurés) de `deriver-plancher-sortie.txt` = RECALCULÉS sur les objets git (harnais changés ou neufs entre D324 et la clôture) et sur `plancher.txt`",
    (int(mi[1]), int(mi[2]), int(mi[3]), noms_mesures) if mi else None, (len(planchers_30), len([n for n in planchers_30 if n not in noms_mesures]), len([n for n in planchers_30 if n in noms_mesures]), sorted(set(chg) | set(neufs))))
b329 = {}
for l in git("ls-tree", "-r", PROTO329, "--", "neutralisation").decode().splitlines():
    meta, chemin = l.split("\t")
    b329[chemin] = meta.split()[2]
H329 = {nom_h(c): b for c, b in b329.items() if est_h(c)}
mi8 = re.search(r"harnais à HEAD : (\d+) \(attendu \d+\) · changés ou neufs depuis D329 : (\d+)", sortie_der)
ctl("O8", "« les 34 harnais identiques à D329, 0 changé, 0 neuf » : (harnais, changés ou neufs) de la pièce = les blobs de `neutralisation/` à D329 (`4202dd4`) comparés à ceux de la clôture, recalculés sur les objets git", (int(mi8[1]), int(mi8[2])) if mi8 else None, (len(H1), sum(1 for n in H1 if H329.get(n) != H1[n]) + sum(1 for n in H329 if n not in H1)))
print(f"   (parcouru : {len(H0)} harnais à D324 · {len(H1)} à la clôture de D330 ; {len(codes)} cas bout en bout)")

# ══ FAMILLE Q — les textes de D330 ═════════════════════════════════════════════════════════════════════════════════════════
print("\n== Q — les textes de D330 (les trois `.md` à la clôture) et ses pièces")
reg = [l for l in cont_fin_brut.split("\n") if re.match(r"^\| D3\d\d \|", l)]
titre_session = re.search(r"^## Session du \d\d/\d\d/\d{4} — (D\d+)", cont_fin_brut, re.M)[1]
ctl("Q1", "la dernière ligne du registre est la dernière session datée du fichier (D330) ; « D331 » n'existe dans aucun des trois `.md` à la clôture", (titre_session, [0, 0, 0]), (re.match(r"^\| (D\d+) \|", reg[-1])[1], [show(FIN, a).count("D331") for a in AUTORITES]))
bl_dec = bloc_entre(cont_fin_brut, "**Décisions de la session, À RATIFIER PAR KO** :", "**La dernière passe D277**") or ""
bl_f = bloc_entre(cont_fin_brut, "**Fautes de la session** :", "**Limites** :") or ""
ctl("Q2", "les décisions de la session D330 « à ratifier » sont numérotées de 1 à N sans trou (Ko : « les quatorze décisions de la session D330 » — N doit valoir 14)", list(range(1, 15)), numerotes(bl_dec))
ctl("Q3", "les fautes de la session sont numérotées de 1 à N sans trou (le texte annonce cinq)", list(range(1, 6)), numerotes(bl_f))
defauts = show(FIN, f"{PD}/lecture-adverse/defauts-instrument.txt")
num_def = [int(x) for x in re.findall(r"^(\d+)\. ", defauts, re.M)]
mt13 = re.search(r"Défauts de MON instrument — ([\w\-]+)", txt_prop)
nb_def = nombre_en_lettres(mt13[1]) if mt13 else None
ctl("Q4", "les défauts de l'instrument de la lecture adverse de D330 : leur nombre écrit en toutes lettres dans le texte (« DIX-NEUF ») = les entrées numérotées de `defauts-instrument.txt`", list(range(1, nb_def + 1)) if nb_def else None, num_def)
so = show(FIN, f"{PD}/lecture-adverse/confronter-sortie.txt")
tl = tally_sortie(so)
ids = re.findall(r"^[✓✗] ([A-Z])\d", so, re.M)
vent = {k: ids.count(k) for k in sorted(set(ids))}
mq5 = re.search(r"(\d+) contrôles · (\d+) écarts de D329 · (\d+) variation de l'état vivant · (\d+) constats · (\d+) non vérifiables", txt_prop)
mv5 = re.search(r"ventilation : C (\d+) · D (\d+) · E (\d+) · O (\d+) · P (\d+) · Q (\d+) · R (\d+) · S (\d+) · T (\d+) · X (\d+)", txt_prop)
mb5 = re.findall(r"^calibration : (\d+) bras, 0 manqué", so, re.M)
mb5t = re.search(r"calibration : (\d+) bras, 0 manqué", txt_prop)
ctl("Q5", "la sortie de la lecture adverse de D330 : (contrôles, écarts + variations, constats, non vérifiables) et la ventilation par famille = ce que le texte annonce",
    ([int(mq5[1]), int(mq5[2]) + int(mq5[3]), int(mq5[4]), int(mq5[5])], dict(zip("CDEOPQRSTX", (int(x) for x in mv5.groups())))) if mq5 and mv5 else None,
    ([tl[0] + tl[1], tl[1], tl[3], tl[4]], vent))
ctl("Q5b", "le nombre de bras de calibration que le texte annonce (« calibration : 23 bras, 0 manqué ») est celui que le BILAN (dernière ligne) de la sortie de D330 imprime ; l'en-tête de la calibration en annonçait un de moins (le bras des morceaux de différence vient après)", (int(mb5t[1]), True) if mb5t else None, (int(mb5[-1]), int(re.findall(r"^== calibration : (\d+) bras", so, re.M)[0]) == int(mb5[-1]) - 1))
b1_ = show(FIN, f"{PD}/passe-d277/balayage-1-AVANT-ECRITURE.txt")
bf_ = show(FIN, f"{PD}/passe-d277/balayage-final.txt")
mp1 = re.search(r"OCCURRENCES DANS L'ARBRE : (\d+) · motifs examinés (\d+)\nMOTIFS À ZÉRO \(HEAD et arbre\) : (\d+)", b1_)
mpf = re.search(r"OCCURRENCES DANS L'ARBRE : (\d+) · motifs examinés (\d+)\nMOTIFS À ZÉRO \(HEAD et arbre\) : (\d+)", bf_)
mt1 = re.search(r"(\d+(?: \d{3})*) occurrences, (\d+) motifs examinés, (\d+) motifs à zéro", txt_prop)
sujet_fin = sujets[chaine[-1]]
mtf = re.search(r"passe D277 finale \((\d+) occurrences, (\d+) motif à zéro\)", sujet_fin)
ctl("Q6", "la passe D277 de D330 : (occurrences, motifs à zéro) de la première passe (texte : 1 040 · 52 · 2) et de la dernière (sujet du commit de clôture : 1284 · 0) = les dernières lignes des deux sorties", ([int(mt1[1].replace(" ", "")), int(mt1[2]), int(mt1[3])], int(mtf[1]), int(mtf[2])) if mt1 and mtf else None,
    ([int(x) for x in mp1.groups()], int(mpf[1]), int(mpf[3])) if mp1 and mpf else None)
section_rangs = bloc_entre(cont_fin_brut, "## ORDRE DES RANGS", "\n## PROCHAIN LOT") or ""
ordre_dern = [l for l in section_rangs.split("\n") if l.startswith("⇒ **RANG 3")]
ctl("Q7", "l'ordre des rangs à la clôture : la dernière ligne « ⇒ RANG N » est « RANG 37 : EN ATTENTE D'ARBITRAGE DE KO » ; AUCUNE ligne de rang 38 n'est écrite", (True, 0), (ordre_dern[-1].startswith("⇒ **RANG 37 : EN ATTENTE D'ARBITRAGE DE KO**") if ordre_dern else False, sum(1 for l in section_rangs.split("\n") if l.startswith("⇒ **RANG 38"))))
print(f"   (parcouru : {len(section_rangs.splitlines())} ligne(s) de la section « ORDRE DES RANGS » ; {len(ordre_dern)} ligne(s) « ⇒ RANG 3x »)")
ag = show(FIN, AGENTS)
ctl("Q8", "`AGENTS.md` à la clôture porte l'annotation de D330 « LA MARQUE EST POSÉE », la marque mot pour mot, et le compteur « ZÉRO »", (True, True), ("Portes vertes AU REPOS le 13/10/2026, et D325 et D326 en font partie" in ag, "compteur DEUX → ZÉRO" in ag))
ctl("Q8b", "`ZWADJ_CONTINUITE.md` porte la marque mot pour mot (au moins une fois)", True, "Portes vertes AU REPOS le 13/10/2026, et D325 et D326 en font partie" in cont_fin_brut)
mp9 = re.search(r"(\d+) pièces \((\d+) versées par outils/verser.py et RELUES identiques par SHA-256 : (\d+) parcourues, (\d+) refusée", nettoyer(sect_res))
ctl("Q9", "les pièces de la passe : « 194 pièces (188 versées … 189 parcourues, 1 refusée) » (texte) = les fichiers de `passe-r36b-20261013-0106/` ; 188 versées + 1 extrait e2e + 1 lecture de R26 + 4 extraits = le total du texte ; 189 parcourues − 1 refusée = 188 versées", (int(mp9[1]), int(mp9[1])) if mp9 else None, (len(arbre_fin), (int(mp9[2]) + 1 + 1 + 4) if mp9 else None))
ctl("Q9b", "« 189 parcourues, 1 refusée » : parcourues − refusées = versées (arithmétique du texte)", int(mp9[2]) if mp9 else None, (int(mp9[3]) - int(mp9[4])) if mp9 else None)
tous_d330 = [f for f in git("ls-tree", "-r", "--name-only", FIN, "--", PD).decode().split("\n") if f.strip()]
ctl("Q10", "le journal brut de l'e2e N'EST PAS dans le dépôt (aucun `e2e.log` sous `docs/preuves/D330/`) ; le journal brut de `test:int`, lui, y EST (`testint.log`, porte verte — D330 le dit)", ([], True), ([f for f in tous_d330 if re.search(r"/e2e\.log$", f)], any(f.endswith("passe-r36b-20261013-0106/testint.log") for f in tous_d330)))
print(f"   (parcouru : {len(tous_d330)} fichier(s) sous `{PD}/`)")
tri_b = show(FIN, f"{PD}/tri-audit-d330b.txt")
mtri = re.search(r"alertes ABSENTES de la précédente : (\d+)", tri_b)
msuj = re.search(r"\((\d+) alertes triées au contexte\)", sujet_fin)
ctl("Q11", "le dernier audit scellé de D330 : « 7 alertes triées au contexte » (sujet du commit de clôture) = la ligne du tri différentiel ; le tri versé en cite autant (une ligne `[…] chemin — contexte`)", (int(msuj[1]) if msuj else None, True), (int(mtri[1]) if mtri else None, len(re.findall(r"^   \[[^\]]+\] .* — contexte : ligne \d+ de ", tri_b, re.M)) == (int(mtri[1]) if mtri else -1)))
dec9 = "ne pas rendre l'état des `.env` règle permanente"
ctl("Q12", "la décision (9) de la session D330 (« ne pas rendre l'état des `.env` règle permanente ») est écrite UNE fois dans la section D330 ; le point 3 de Ko du 13/10 la REMPLACE — c'est le site à annoter", 1, bl_dec.count(dec9))
ctl("Q13", "le critère du rang 9, point 7 (« seul un échantillon avec `chrome` > 0 disqualifie la fenêtre ») est cité par D330 : le point 2 de Ko l'ANNOTE — le site existe dans le fichier", True, "seul un échantillon avec `chrome` > 0 disqualifie la fenêtre" in cont_fin_brut)
inv_hs = [l for l in cont_fin_brut.split("\n") if "headless_shell" in l and ("relevé, pas une porte" in l or "n'arrête rien" in l or "est un relevé" in l)]
ctl("Q14", "`headless_shell` est écrit « relevé, pas une porte » à au moins UN endroit des trois `.md` : le point 4 de Ko (porte dure) le renverse — les sites à annoter (recensés, pas encore annotés)", True, len(inv_hs) >= 1 or any("headless_shell" in l and "relevé" in l for l in ag.split("\n")))
print(f"   (sites « headless_shell … relevé » dans ZWADJ_CONTINUITE.md : {len(inv_hs)} ligne(s) ; dans AGENTS.md : {sum(1 for l in ag.split(chr(10)) if 'headless_shell' in l and 'relevé' in l)})")
rang36_lignes = [l for l in section_rangs.split("\n") if l.startswith("⇒ **RANG 36 : OUVERT")]
ctl("Q15", "chaque ligne « ⇒ RANG 36 : OUVERT, NON CLOS » de l'ordre des rangs (périmée par la marque) porte son annotation « PÉRIMÉ » : aucune ne se lit comme courante (il y en a au moins une)", (True, True), (len(rang36_lignes) >= 1, all("PÉRIMÉ" in l for l in rang36_lignes)))
print(f"   (parcouru : {len(rang36_lignes)} ligne(s) « ⇒ RANG 36 : OUVERT… » dans la section de l'ordre des rangs)")
tri_a = show(FIN, f"{PD}/tri-audit-d330a.txt")
m_tri = re.search(r"alertes ABSENTES de la précédente : (\d+)", tri_a)
cat_a = {k: len(re.findall(rf"^   \[{re.escape(k)}\] ", tri_a, re.M)) for k in ("url-avec-identifiants", "jeton")}
m_a = re.search(r"(\d+) alertes absentes de la précédente, toutes triées au contexte — (\d+) « url-avec-identifiants » et (\d+) « jeton »", nettoyer(show(FIN, CONT)))
ctl("Q16", "l'audit scellé « a » de D330 : « 12 alertes absentes de la précédente, toutes triées au contexte — 7 « url-avec-identifiants » et 5 « jeton » » (texte) = la ligne du tri différentiel et les catégories recomptées ligne à ligne", ((int(m_a[1]), int(m_a[2]), int(m_a[3])) if m_a else None), ((int(m_tri[1]), cat_a["url-avec-identifiants"], cat_a["jeton"]) if m_tri else None))

SCEAU_RE = re.compile(rb"== SCEAU sha256:([0-9a-f]{64}) \xe2\x80\x94 neutralisation/audit-secrets\.py : cette sortie s'exclut de l'audit tant que ce sceau couvre ses octets ==")


def sceau_valide(octets):
    """Vrai si la DERNIÈRE ligne est un sceau dont le condensé est celui de TOUT ce qui la précède (recalculé ici, sans l'outil d'audit)."""
    lignes = octets.rstrip(b"\n").split(b"\n")
    m = SCEAU_RE.fullmatch(lignes[-1]) if lignes else None
    corps = octets[: octets.rstrip(b"\n").rfind(b"\n") + 1] if len(lignes) > 1 else b""
    return bool(m) and hashlib.sha256(corps).hexdigest() == m[1].decode()


corps_t = b"alerte 1\nalerte 2\n"
sceau_t = ("== SCEAU sha256:" + hashlib.sha256(corps_t).hexdigest() + " — neutralisation/audit-secrets.py : cette sortie s'exclut de l'audit tant que ce sceau couvre ses octets ==\n").encode("utf-8")
bras("sceau_valide, cas vrai : un corps suivi de son sceau recalculé → vrai ; cas faux : un octet du corps changé, ou un texte sans sceau → faux", sceau_valide(corps_t + sceau_t) and not sceau_valide(b"alerte 1\nalerte 3\n" + sceau_t) and not sceau_valide(b"rien\n"))
sc_a, sc_b = git("show", f"{FIN}:{PD}/audit-secrets-d330a.txt"), git("show", f"{FIN}:{PD}/audit-secrets-d330b.txt")
ctl("Q17", "les deux audits de secrets scellés de D330 (`a` et `b`) portent un SCEAU qui couvre EXACTEMENT leurs octets (condensé recalculé ici, sans l'outil d'audit) ; la contre-épreuve : un octet changé casse le sceau", (True, True, False), (sceau_valide(sc_a), sceau_valide(sc_b), sceau_valide(sc_b.replace(b"jeton", b"jetoN", 1))))
print(f"   (parcouru : {len(sc_a)} + {len(sc_b)} octets d'audit scellé)")
if not all(cal):
    sys.exit("ABANDON : calibration manquée (bras de la famille Q)")

# ══ FAMILLE K — les SITES que les arbitrages de Ko du 13/10 (points 2, 3 et 4) rendent à écrire : ils existent, une fois chacun, tels que D330 les a laissés ═
print("\n== K — les sites d'autorité que les arbitrages de Ko du 13/10 touchent (existence, une fois chacun, ouverts) — la passe D277 les traitera")
bk, cc = show(FIN, BACKLOG), show(FIN, CONT)
ent = lambda debut: [l for l in bk.split("\n") if l.startswith("- [ ] ") and debut in l]
ctl("K1", "l'entrée « LA MARQUE DU 13/10/2026 EST POSÉE MALGRÉ UNE RAM SOUS LA BARRE EN COURS DE FENÊTRE — DÉCISION DE KO » est ouverte, UNE fois (point 1 de Ko : la marque est gardée)", 1, len([l for l in bk.split("\n") if l.startswith("- [ ] **[MÉTHODE][CERTIFICATION]** **LA MARQUE DU 13/10/2026 EST POSÉE MALGRÉ UNE RAM SOUS LA BARRE")]))
ctl("K2", "l'entrée « L'AMBIANT A PASSÉ SOUS LA BARRE ENTRE LES MESURES » est ouverte, UNE fois (point 2 de Ko la ferme avec renvoi)", 1, len(ent("**L'AMBIANT A PASSÉ SOUS LA BARRE ENTRE LES MESURES**")))
ctl("K3", "l'entrée « L'ARBRE IMMOBILE NE VOIT PAS UN FICHIER IGNORÉ PAR GIT… » est ouverte, UNE fois (point 3 de Ko : la règle devient permanente)", 1, len(ent("**L'ARBRE IMMOBILE NE VOIT PAS UN FICHIER IGNORÉ PAR GIT")))
ctl("K4", "`AGENTS.md` porte l'écart sur les `.env` de D330 « UN ÉCART NOMMÉ À LA SECONDE PASSE DU RANG 36 » UNE fois, avec sa réserve « à ratifier par Ko » (point 3 de Ko la ratifie et l'étend)", (1, True), (ag.count("UN ÉCART NOMMÉ À LA SECONDE PASSE DU RANG 36"), "à ratifier par Ko" in (bloc_entre(ag, "UN ÉCART NOMMÉ À LA SECONDE PASSE DU RANG 36", "\n\n") or "")))
ctl("K5", "le critère du rang 9, point 7 (« seul un échantillon avec `chrome` > 0 disqualifie la fenêtre ») est écrit dans `ZWADJ_CONTINUITE.md` et nulle part ailleurs (point 2 de Ko l'ANNOTE, il ne le réécrit pas)", (2, 0, 0), (cc.count("seul un échantillon avec `chrome` > 0 disqualifie la fenêtre"), ag.count("seul un échantillon avec `chrome` > 0 disqualifie la fenêtre"), bk.count("seul un échantillon avec `chrome` > 0 disqualifie la fenêtre")))
ctl("K6", "la décision (9) de la session D330 (« ne pas rendre l'état des `.env` règle permanente ») est la SEULE formulation du refus de la permanence dans `ZWADJ_CONTINUITE.md` (le point 3 de Ko la remplace, annotée)", 1, cc.count("ne pas rendre l'état des `.env` règle permanente"))
ma_salle_ouvertes = [l for l in bk.split("\n") if l.startswith("- [ ] ") and re.search(r"\*\*(L35-1 — « MA SALLE »|« MA SALLE » N'EST PAS RÉPARÉE|LA LISTE DES SALLES N'EST RELUE QU'À LA CRÉATION)", l)]
ctl("K7", "le backlog porte TROIS entrées OUVERTES sur la même liste « Ma salle » (L35-1 ; « N'EST PAS RÉPARÉE » ; « N'EST RELUE QU'À LA CRÉATION ») : ce lot les referme TOUTES, chacune avec renvoi — un défaut, trois entrées (relevé du backlog à la clôture de D330)", 3, len(ma_salle_ouvertes))
print(f"   (parcouru : {len(bk.splitlines())} ligne(s) du backlog, {len(ag.splitlines())} d'`AGENTS.md`, {len(cc.splitlines())} de `ZWADJ_CONTINUITE.md`)")

# ══ FAMILLE S — fuites ═══════════════════════════════════════════════════════════════════════════════════════════════════
print("\n== S — fuites : un hôte de tunnel, un jeton, dans les pièces et les `.md` de D330")
tunnels = re.compile(r"[A-Za-z0-9-]+\.(?:[A-Za-z0-9-]+\.)*(?:devtunnels\.ms|ngrok(?:-free)?\.(?:app|io|dev)|trycloudflare\.com|loca\.lt|serveo\.net|localtunnel\.me|tunnelmole\.net)")
fichiers_d330 = [f for f in tous_d330] + list(AUTORITES)
hotes_tunnel, hits_tok = set(), []
for f in fichiers_d330:
    t = git("show", f"{FIN}:{f}").decode("utf-8", errors="replace")
    hotes_tunnel |= {m.group(0) for m in tunnels.finditer(t)}
    if re.search(r"token=[A-Za-z0-9_-]{43}", t):
        hits_tok.append(f)
sentinelle = set(re.findall(r"https://([\w\-.]+)/fr/auth/verification-email", show(FIN, f"{PD329}/outils/extraire-testint.py")))
ctl("S1", "les seuls hôtes de tunnel présents dans les pièces de D330 et les trois `.md` sont la SENTINELLE de calibration de `extraire-testint.py` (D329, `https://…/fr/auth/verification-email` construit dans le script, et ses échos : audits scellés, sortie de la lecture adverse de D330) — aucun hôte réel", sorted(sentinelle), sorted(hotes_tunnel))
ctl("S2", "aucun jeton de vérification (`token=` suivi de 43 caractères) dans les pièces de D330 ni dans les trois `.md`", [], hits_tok)
print(f"   (parcouru : {len(fichiers_d330)} fichier(s))")

# ══ CE QUE LA LECTURE NE PEUT PAS DIRE, ET CE QU'ELLE N'A PAS LU ══════════════════════════════════════════════════════════
print("\n== CE QUE LA LECTURE NE PEUT PAS DIRE")
non_verifiable("N4", "que les trois textes de Ko du 12/10 et ses deux messages du 13/10 (dont le texte à écrire mot pour mot dans ce lot) soient reproduits à l'identique dans les fichiers de D330 : ils n'existent que dans le chat ; la lecture ne vérifie que ce que D330 a écrit (P11, P12)")
non_verifiable("N5", "que le dernier audit de secrets de D330 (`d330b`) ait couvert les octets FINAUX des trois `.md` : D330 le déclare lui-même (même limite que A-N1 de D327, C-N1 de D328, D329) ; sa sortie est scellée, pas l'état final des fichiers")
non_verifiable("N6", "que la durée des harnais repris de D324 (26 planchers) soit encore celle d'un démarrage sur ce poste : D330 l'écrit comme limite (« le plancher des 26 harnais repris suppose que `pnpm` et `vitest` démarrent comme le 04/10 »)")
non_verifiable("N7", "que la sortie de la lecture adverse de D329 par D330 soit « stable (deux lancements, mêmes octets) » comme D330 l'écrit : rejouer `confronter-d329.py` aujourd'hui lirait un état VIVANT (famille X : `HEAD`, statut) qui n'est plus celui de D330 — l'octet ne se retrouve pas ; le fait ne se vérifie que par l'identité de l'objet versé")
non_verifiable("N8", "ce qui tournait SUR LA MACHINE pendant la fenêtre en dehors de `chrome` et des `node` de la mesure : l'échantillonneur ne mesure que `chrome`, `node` et la RAM libre ; les processus étrangers (l'IDE de Ko compris) ne sont vus que par les relevés de sonde ponctuels (limite déclarée par D330)")
print("   (la base de développement n'est PAS lue : aucune affirmation de D330 n'en dépend ; aucune porte, aucune campagne n'est rejouée)")
constat("V-C1", "l'ordre des commits de D330 est prouvé par `git` (P1 à P18) et la table est recopiée dans un `.md` d'autorité (T1 à T3) : le constat T-C1 de D329 (0 ligne sur 17) est RÉPARÉ pour D330. "
                "Reste ce que la lettre de la règle ne dit pas : la table recopiée est celle de l'OUVERTURE ; les extensions (14 pièces de l'étape 0, 198 de la passe) ne figurent que dans `table-ouverture.md` — "
                "ce n'est pas une infraction (la règle recopie la table, pas ses extensions), c'est la raison pour laquelle T2 compare les DEUX tableaux de base seulement.")
constat("V-C2", "la porte dure de l'ouverture (RAM) et la règle que Ko vient d'écrire (ouverture ET clôture au-dessus de la barre) sont satisfaites par la passe de D330 (M9) : la question que D330 laissait à Ko (« une barre tenue à l'ouverture seulement suffit-elle ? ») "
                "reçoit la réponse de Ko du 13/10 (point 2) ; la marque de D330 n'est donc pas à retirer au titre de la RAM.")

# ══ BILAN ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
print("\n== BILAN")
n_ctl = len(controles)
n_ok = n_ctl - len(ecarts) - len(ecarts_live)
print(f"{n_ctl} contrôles ({n_ok} ✓) · {len(ecarts)} écart(s) de D330 : {ecarts} · {len(ecarts_live)} variation(s) de l'état vivant : {ecarts_live} · {len(constats)} constat(s) : {constats} · {len(non_verifiables)} non vérifiable(s) : {non_verifiables}")
print("ventilation : " + " · ".join(f"{k} {v}" for k, v in sorted(familles.items())) + f" (somme {sum(familles.values())}) — aucune famille à zéro : {all(familles.get(k, 0) > 0 for k in 'XEPTRMOQS')}")
print(f"calibration : {len(cal)} bras, 0 manqué")
