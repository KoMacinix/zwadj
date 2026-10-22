"""D336 (reprise) — SECONDE lecture adverse : la consigne VERSION 2 du relecteur (22/10/2026, adoptée par Ko), confrontée au dépôt.

POURQUOI IL EXISTE
  Consigne v2, section 0, point 2 : « ta lecture adverse de CETTE version 2, contre le dépôt (ni contre ta mémoire, ni contre celle du relecteur) : tu reprends l'instrument de D336
  (confronter-d335-et-consigne.py), SHA fixés, et tu ne rejoues que ce qui change : sections 0, 1c, 2 b d f i j, 3 (DR3, DR5, DR9), 4 [L36-2], 6 e h, 8, 9. Sortie versée, puis restituée EN ENTIER
  dans ta réponse (forme allégée : première partie courte, seconde partie en entier). » Et : « Si une affirmation de cette version 2 est fausse contre le dépôt, tu t'arrêtes et tu le dis ; tu ne
  l'adaptes pas seul. » Cet instrument est donc, comme le premier, la RÈGLE D'ARRÊT du lot : son code de sortie dit si elle est déclenchée.

  PARTIE A (courte) — l'état que la version 2 décrit : la première session de D336 (table seule, lecture adverse, arrêt), l'extension 1 de cette reprise, l'état vivant.
  PARTIE B (en entier) — la version 2, section par section, SEULEMENT ce qui change par rapport à la consigne lue par la première session.

REPRISE DE L'INSTRUMENT DE LA PREMIÈRE LECTURE — PAR EXÉCUTION, JAMAIS PAR RECOPIE
  Un instrument et la pièce qu'il a produite se corrigent ensemble ou pas du tout (D295) : `confronter-d335-et-consigne.py` est une pièce versée (`feea423`), il n'est PAS retouché. Son PRÉFIXE —
  tout ce qui précède la ligne « # ── CONTRÔLES » : imports, constantes, extracteurs, calibration à deux bras — est LU dans l'objet git à `feea423`, son empreinte IMPRIMÉE et confrontée au fichier
  sur disque, puis EXÉCUTÉ tel quel : les 38 bras de la calibration se rejouent, et l'abandon (code 2) reste le sien. Seules les vérifications de la consigne v2 sont neuves.
  ⚠ Ses constantes restent les siennes : `FIX` = `b8ba85a` (l'état du dépôt que la consigne décrit — rien d'autre que `docs/preuves/D336/` n'a bougé depuis, contrôle R3), `TABLE336` = `77728a5`.

USAGE, depuis la racine (bash, jamais une redirection PowerShell — D298) :
  python3 docs/preuves/D336/lecture-adverse-v2/confronter-consigne-v2.py > docs/preuves/D336/lecture-adverse-v2/confronter-sortie-v2.txt
  Code de sortie : 0 = aucun écart · 1 = écart de l'état décrit ou vivant · 2 = calibration manquée (abandon) · 3 = écart de la consigne v2 : LA RÈGLE D'ARRÊT EST DÉCLENCHÉE.

LECTURE SEULE, comme la première : objets git à SHA fixés, sauf la famille X (état LIVE) ; un dossier temporaire pour la mesure de `normalizePhone` (extracteur repris).

INSTRUMENTS ÉCARTÉS : rejouer la première lecture en entier — la consigne ne le demande pas, et ses contrôles des sections inchangées sont déjà versés (`feea423`) ; RECOPIER ses extracteurs ici — deux copies
  divergent en silence ; l'exécution du préfixe lu dans git garantit que ce sont LES MÊMES octets.

CALIBRATION : celle du préfixe (38 bras), plus deux bras par extracteur NEUF. Les comptes s'impriment avec ce qu'ils ont parcouru et leur attendu (D290) ; le total avec sa ventilation par famille (D295).

FAMILLES : R (la première session et l'extension 1 : l'état décrit) · X (état LIVE) · V0, V1c, V2, V3, V4, V6, V8, V9 (la consigne v2, par section).
"""
import hashlib
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")

PREMIER = "docs/preuves/D336/lecture-adverse/confronter-d335-et-consigne.py"
SORTIE1 = "docs/preuves/D336/lecture-adverse/confronter-sortie.txt"
FIX2 = "feea423"      # la clôture de la première session de D336 = SHA de départ de la reprise (consigne v2, section 0)
EXT1 = "eacd079"      # l'extension 1 de la table, commitée SEULE avant cette lecture
MARQUE = "# ── CONTRÔLES"

print("D336 (reprise) — SECONDE lecture adverse : la consigne VERSION 2 du 22/10/2026 · SHA fixés : reprise " + FIX2 + ", extension 1 " + EXT1 + ", état décrit b8ba85a")
_blob = subprocess.run(["git", "show", f"{FIX2}:{PREMIER}"], capture_output=True, check=True).stdout
_disque = open(PREMIER, "rb").read()
_texte = _blob.decode("utf-8").replace("\r\n", "\n")
_n_marque = _texte.count(MARQUE)
print(f"PRÉFIXE REPRIS : `{PREMIER}` lu à {FIX2} — {len(_blob)} octets, sha256 {hashlib.sha256(_blob).hexdigest()} ; "
      f"le fichier sur disque est identique : {_blob == _disque} (attendu True) ; marque « {MARQUE} » : {_n_marque} occurrence (attendu 1)")
if _blob != _disque or _n_marque != 1:
    print("ABANDON : le préfixe repris n'est pas celui de la pièce versée.")
    sys.exit(2)
_prefixe = _texte.split(MARQUE, 1)[0]
print(f"  préfixe exécuté : {len(_prefixe.encode('utf-8'))} octets, {_prefixe.count(chr(10))} lignes, sha256 {hashlib.sha256(_prefixe.encode('utf-8')).hexdigest()}")
print("── sortie du préfixe (en-tête et calibration de la première lecture, rejoués) ──")
exec(compile(_prefixe, PREMIER + " (préfixe lu à " + FIX2 + ")", "exec"), globals())
print("── fin du préfixe ──")

# ── EXTRACTEURS NEUFS, calibrés à deux bras ─────────────────────────────────────────────────────────────────────────────────────────


def lignes_numerotees(t: str, *mots: str) -> list:
    """(numéro de ligne, ligne) des lignes qui contiennent TOUS les mots — numéros comptés depuis 1, sur le texte LF."""
    return [(i + 1, l) for i, l in enumerate(t.split("\n")) if all(m in l for m in mots)]


def hors_prefixe(lignes: list, prefixe: str) -> list:
    """Les lignes de `git grep -n` dont le chemin ne commence PAS par `prefixe`."""
    return [l for l in lignes if not l.startswith(prefixe)]


MOTS_DU_JETON = ("jeton", "JWT", "claim", "sub,", "{ sub", "rôle")


def parle_du_jeton(texte: str) -> bool:
    """Un texte parle-t-il des claims du jeton d'accès ? Par mots, calibré sur une ligne connue de chaque sorte."""
    return any(m in texte for m in MOTS_DU_JETON)


_cal_ln = lignes_numerotees(C_FIX, "| D335 | A |")
calibrer("lignes_numerotees", len(_cal_ln) == 1 and _cal_ln[0][1].startswith("| D335 | A |") and C_FIX.split("\n")[_cal_ln[0][0] - 1] == _cal_ln[0][1],
         len(lignes_numerotees(C_FIX, "| D335 | A |", "mot-qui-n-y-est-pas")) > 0)
calibrer("hors_prefixe", hors_prefixe(["docs/preuves/D336/x:1:a", "apps/y:2:b"], "docs/preuves/D336/") == ["apps/y:2:b"],
         hors_prefixe(["docs/preuves/D336/x:1:a"], "docs/preuves/D336/") != [])
_cal_jeton = ligne_qui_commence(C_FIX, "- **D4 — le rôle est une claim du jeton d'accès**") or ""
_cal_d3 = (re.search(r"^\| D3 \? \| [AFCS] \| (.*) \|$", _reg, re.M) or [None, ""])[1]
calibrer("parle_du_jeton (une ligne connue du jeton ; la ligne D3 du registre)", parle_du_jeton(_cal_jeton) and _cal_jeton != "",
         _cal_d3 == "" or parle_du_jeton(_cal_d3))
print(f"  calibration totale (préfixe + neuve) : {bras[0]} bras joués, {bras[1]} manqué(s) (attendu 0)")
if bras[1]:
    print("ABANDON : un bras de calibration manque — aucun contrôle n'est joué (D286).")
    sys.exit(2)

# ── CONTRÔLES ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
controles2: list = []
ecarts_etat: list = []
ecarts_v2: list = []
constats2: list = []
nv2: list = []
familles2: dict = {}


def controle2(cid: str, famille: str, libelle: str, attendu, mesure, ok: bool, parcouru: str = "") -> None:
    familles2.setdefault(famille, [0, 0])
    familles2[famille][0] += 1
    if not ok:
        familles2[famille][1] += 1
        (ecarts_v2 if famille.startswith("V") else ecarts_etat).append(cid)
    suffixe = f" — parcouru : {parcouru}" if parcouru else ""
    controles2.append(f"| {cid} | {libelle} | attendu : {attendu} · mesuré : {mesure}{suffixe} | {'✓' if ok else '✗'} |")


def constat2(cid: str, texte: str) -> None:
    constats2.append(f"- **{cid}** — {texte}")


def nv(cid: str, texte: str) -> None:
    nv2.append(f"- **{cid}** — {texte}")


# PARTIE A — l'état décrit : la première session de D336, l'extension 1, l'état vivant ─────────────────────────────────────────────────
_c1 = rev_list(FIX, FIX2)
controle2("R1", "R", "la première session de D336 = deux commits sur b8ba85a : la table SEULE (77728a5), puis la lecture adverse (feea423)", "[77728a5, feea423] · table seule",
          f"{_c1} · {fichiers_du_commit('77728a5')}", _c1 == ["77728a5", "feea423"] and fichiers_du_commit("77728a5") == ["docs/preuves/D336/table-ouverture.md"])
_f1 = fichiers_du_commit("feea423")
controle2("R2", "R", "le commit de la lecture adverse (feea423) ne verse que sous `docs/preuves/D336/` : instrument, sortie, audit « a », tri « a »", "4 fichiers sous docs/preuves/D336/",
          f"{len(_f1)} fichier(s), hors D336 : {[p for p in _f1 if not p.startswith('docs/preuves/D336/')]}", len(_f1) == 4 and all(p.startswith("docs/preuves/D336/") for p in _f1))
_d1 = noms_diff(FIX, FIX2)
_hors1 = [p for p in _d1 if not p.startswith("docs/preuves/D336/")]
controle2("R3", "R", "« rien d'autorité ni de code n'a été écrit » : le diff b8ba85a..feea423 ne sort pas de `docs/preuves/D336/`", "0 hors D336", f"{len(_hors1)} hors D336",
          not _hors1, f"{len(_d1)} fichiers")
_s1 = lire(FIX2, SORTIE1) or ""
_ec1 = re.search(r"^ÉCARTS DE LA CONSIGNE \(affirmations fausses contre le dépôt\) : 3 \['B2i-1', 'B4-3', 'B6-4'\]$", _s1, re.M) is not None
_c_ids = re.findall(r"^- \*\*(C-\d+)\*\* —", _s1, re.M)
controle2("R4", "R", "la sortie de la première lecture (feea423) porte les trois écarts B2i-1, B4-3, B6-4, douze constats C-1 à C-12, et l'arrêt", "3 écarts · C-1…C-12 · arrêt",
          f"écarts {_ec1} · {len(_c_ids)} constats ({_c_ids[0] if _c_ids else '-'}…{_c_ids[-1] if _c_ids else '-'}) · arrêt {'RÈGLE D' + chr(39) + 'ARRÊT DÉCLENCHÉE' in _s1}",
          _ec1 and _c_ids == [f"C-{i}" for i in range(1, 13)] and "RÈGLE D'ARRÊT DÉCLENCHÉE" in _s1)
_ns_ext = numstat(EXT1)
_t_ext = lire(EXT1, "docs/preuves/D336/table-ouverture.md") or ""
_decl_v2 = all(p in chemins_de_table(_t_ext) for p in ("docs/preuves/D336/lecture-adverse-v2/confronter-consigne-v2.py", "docs/preuves/D336/lecture-adverse-v2/confronter-sortie-v2.txt",
                                                          "docs/preuves/D336/audit-secrets-d336b.txt", "docs/preuves/D336/tri-audit-d336b.txt"))
controle2("R5", "R", "l'extension 1 (eacd079) est SEULE dans son commit, n'efface rien, posée sur feea423, et déclare la seconde lecture, l'audit « b » et son tri", "table seule, 0 ligne retirée, déclarés",
          f"{_ns_ext} · parent {git('rev-parse', '--short=7', EXT1 + '^').decode().strip()} · déclarés {_decl_v2}",
          len(_ns_ext) == 1 and _ns_ext[0][1] == 0 and _ns_ext[0][2] == "docs/preuves/D336/table-ouverture.md" and _decl_v2
          and git("rev-parse", "--short=7", EXT1 + "^").decode().strip() == FIX2)
_head = git("rev-parse", "--short=7", "HEAD").decode().strip()
_origin = git("rev-parse", "--short=7", "origin/main").decode().strip()
controle2("X1", "X", "« origin/main = feea423 » (relu après `git fetch`) ; HEAD = l'extension 1, non encore poussée", f"origin {FIX2} · HEAD {EXT1}", f"origin {_origin} · HEAD {_head}",
          _origin == FIX2 and _head == EXT1)
_st = [l for l in git("status", "--porcelain=v1").decode("utf-8").split("\n") if l.strip()]
_st_mal = [l for l in _st if not (l.startswith("?? ") and l[3:].startswith("docs/preuves/D336/lecture-adverse-v2/"))]
controle2("X2", "X", "arbre : rien de suivi modifié ; seuls des fichiers NON SUIVIS sous `docs/preuves/D336/lecture-adverse-v2/` ; aucun stash", "0 · 0",
          f"{len(_st_mal)} · {len([l for l in git('stash', 'list').decode('utf-8').split(chr(10)) if l.strip()])}",
          not _st_mal and not [l for l in git("stash", "list").decode("utf-8").split("\n") if l.strip()], f"{len(_st)} ligne(s) de `git status`")

# PARTIE B — la consigne v2, sections qui changent ─────────────────────────────────────────────────────────────────────────────────────
C2 = lire(FIX2, CONT)
B2_ = lire(FIX2, BACKLOG)
_reg2 = section(C2, "## Registre des décisions")
_dern2 = re.findall(r"^\| (D\d+) \| [AFCS] \|", _reg2, re.M)
_d337 = git_grep_fichiers(FIX2, "D337", ".")
controle2("V0-1", "V0", "§ 0 « LE LOT RESTE D336. Tu ne prends PAS D337 » : le registre finit toujours à D335 (D336 n'y est pas encore inscrit), « D337 » n'est nulle part", "D335 · 0 fichier",
          f"{_dern2[-1]} · {len(_d337)} fichier(s)", _dern2[-1] == "D335" and not _d337, f"{len(_dern2)} lignes de registre")
controle2("V0-2", "V0", "§ 0 « origin/main = feea423 (table 77728a5, lecture adverse feea423 : docs/preuves/D336/) » et « rien d'autorité ni de code n'a été écrit »", "X1, R1, R2, R3 vrais",
          f"X1 {'X1' not in ecarts_etat}, R1 {'R1' not in ecarts_etat}, R2 {'R2' not in ecarts_etat}, R3 {'R3' not in ecarts_etat}",
          not any(c in ecarts_etat for c in ("X1", "R1", "R2", "R3")))
_lib = {cid: (re.search(r"^\| " + re.escape(cid) + r" \| ([^|]*)\|", _s1, re.M) or [None, ""])[1] for cid in ("B2i-1", "B4-3", "B6-4")}
_sujets = {"B2i-1": "J-8 à J-13", "B4-3": "statuts écrits aujourd'hui", "B6-4": "K-12"}
controle2("V0-3", "V0", "§ 0 et § 9 « elle corrige les trois affirmations fausses (J-8 à J-13, K-12, « statuts écrits aujourd'hui ») » : les trois écarts de la première lecture portent bien ces sujets",
          "3 sujets retrouvés", ", ".join(f"{c} {_sujets[c] in _lib[c]}" for c in _lib), all(_sujets[c] in _lib[c] for c in _lib))
nv("NV2-1", "§ 1c « la liste de décisions du relecteur du 21/10/2026, qui vit dans le chat et non au dépôt » — une absence au dépôt, conforme à NV-2 de la première lecture ; le texte des questions Q3, Q4, Q5 "
   "n'est pas au dépôt (la ligne que la consigne demande d'écrire le dit elle-même).")
constat2("C2-1", "§ 1c contre § 2 j) : la tension relevée par C-5 est levée — 1c garde S-40 à S-47 parmi Q9 à Q12 « sans réponse de Ko », 2 j) écrit « ratifiées par ADOPTION de ce message … jamais comme une parole de Ko ».")

_pe = [l for l in C_FIX.split("\n") if re.match(r"^## .*rang 41\b", l)]
controle2("V2b-1", "V2", "§ 2 b) « CRÉER le point d'entrée du rang 41 (il n'existe pas à b8ba85a) »", "0 titre « ## … rang 41 »", f"{len(_pe)}", not _pe)
_ordre = section(C_FIX, "## ORDRE DES RANGS") or ""
_debut_ordre = C_FIX.split("\n").index(_ordre.split("\n")[0]) + 1
_l41 = [(n + _debut_ordre - 1, l) for n, l in lignes_numerotees(_ordre, "⇒ **RANG 41 : EN ATTENTE D'ARBITRAGE DE KO**")]
controle2("V2b-2", "V2", "§ 2 b) « annoter la ligne « ⇒ RANG 41 : EN ATTENTE D'ARBITRAGE DE KO » » : une seule ligne de l'ordre des rangs la porte", "1 ligne", f"{len(_l41)} ligne(s) : {[n for n, _ in _l41]}",
          len(_l41) == 1)
_l5 = [(n + _debut_ordre - 1, l) for n, l in lignes_numerotees(_ordre, "D-10", "cinquième révision")]
_l5_def = [n for n, l in _l5 if "l'**ordre des rangs est révisé** (**D-10, cinquième révision**)" in l]
controle2("V2b-3", "V2", "§ 2 b) « la ligne de la cinquième révision de D-10 » : une ligne de l'ordre des rangs ÉCRIT cette révision", "≥ 1 ligne qui l'écrit",
          f"{len(_l5_def)} ligne qui l'écrit ({_l5_def}) ; {len(_l5)} lignes qui la citent ({[n for n, _ in _l5]})", len(_l5_def) >= 1)
constat2("C2-2", f"§ 2 b) « la ligne de la cinquième révision de D-10 » est au singulier, et **{len(_l5)} lignes** de l'ordre des rangs la citent ({', '.join(str(n) for n, _ in _l5)}). "
         f"Une seule l'ÉCRIT comme une décision : la ligne {_l5_def[0] if _l5_def else '?'} (« (e) l'ordre des rangs est révisé (D-10, cinquième révision) », arbitrages de D332) — "
         "c'est elle que la session annoterait ; les autres la citent. À confirmer en une phrase.")
_k1b = ligne_qui_commence(C_FIX, "- **K-1** ") or ""
controle2("V2d-1", "V2", "§ 2 d) « la PROPRIÉTÉ de K-1 (écran identique pour tout identifiant) reste inchangée ; son ENTRÉE s'élargit à { phone } OU { email } » : K-1 aujourd'hui = `{ phone }`, réponse de forme identique",
          "{ phone } · forme identique", f"{'`{ phone }`' in _k1b} · {'forme identique' in _k1b}", "`{ phone }`" in _k1b and "forme identique" in _k1b and "email" not in _k1b.split("—")[0])
controle2("V2f-1", "V2", "§ 2 f) « C-C1 (erratum écrit le 13/10/2026 par D330, décision du relecteur déléguée par Ko le 12/10) »", "2 présents",
          f"{present(C_FIX, 'DÉCISIONS DU RELECTEUR (chat), DÉLÉGUÉES PAR KO LE 12/10/2026 (D330)')}, {present(C_FIX, '(D330, 13/10/2026 : **ERRATUM DU RELECTEUR**')}",
          present(C_FIX, "DÉCISIONS DU RELECTEUR (chat), DÉLÉGUÉES PAR KO LE 12/10/2026 (D330)") and present(C_FIX, "(D330, 13/10/2026 : **ERRATUM DU RELECTEUR**")
          and present(C_FIX, "**1. ERRATUM DU RELECTEUR (C-C1).**"))
_jur = section(C_FIX, "### 7. Les questions pour le juriste", "### ") or ""
_jdef = [int(x) for x in re.findall(r"^- \*\*J-(\d+)\*\* —", _jur, re.M)]
controle2("V2i-1", "V2", "§ 2 i) « J-1 à J-7 (dépôt) inchangées »", "J-1 … J-7", f"{_jdef}", _jdef == list(range(1, 8)))
_jocc = git_grep_lignes(FIX, r"(^|[^A-Za-z0-9-])J-(8|9|1[0-3])([^0-9]|$)", CONT, AGENTS, BACKLOG)
_jdef8 = sum(f"**J-{n}**" in lire(FIX, f) for f in AUTORITES for n in range(8, 14))
controle2("V2i-2", "V2", "§ 2 i) « J-8 à J-13 … n'existent que dans le chat, et leurs numéros se heurtent à des cibles de harnais (r33 et voisins) » — repris de la première lecture (B2i-1, B2i-2)",
          "0 définition · occurrences = cibles", f"{_jdef8} définition · {len(_jocc)} lignes à jeton, classées par B2i-2 de la première lecture : 12 sur 12 en contexte de harnais",
          _jdef8 == 0 and len(_jocc) == 9 and "| B2i-2 |" in _s1 and re.search(r"^\| B2i-2 \|.*\| ✓ \|$", _s1, re.M) is not None)
_ms = git_grep_lignes(FIX2, r"(^|[^A-Za-z0-9-])MS-[1-6]([^0-9]|$)", ".")
controle2("V2i-3", "V2", "§ 2 i) et § 3 DR9 « MS-1 à MS-6 » : identifiants libres dans tout l'arbre (aucune collision, contrairement à J-8…J-13)", "0 ligne", f"{len(_ms)} ligne(s)", not _ms)
_sd335 = section(C_FIX, "## Session du 17/10/2026 — D335") or ""
_sids = [int(x) for x in re.findall(r"^- \*\*S-(\d+)\*\* —", bloc(_sd335, "**Décisions de la session, À RATIFIER PAR KO**", "**Ce que la session a remarqué") or "", re.M)]
controle2("V2j-1", "V2", "§ 2 j) « S-40 à S-47 (D335) » : ce sont les décisions de la session D335 écrites « À RATIFIER PAR KO »", list(range(40, 48)), _sids, _sids == list(range(40, 48)))

# § 3
_dr = git_grep_lignes(FIX2, r"(^|[^A-Za-z0-9-])DR[1-9]([^0-9]|$)", ".")
_dr_tiret = git_grep_lignes(FIX2, r"(^|[^A-Za-z0-9-])DR-[1-9]([^0-9]|$)", ".")
controle2("V3-0", "V3", "§ 3 « Numérotées DR1 à DR9 (« décision du relecteur », D336) » : « DR1 » à « DR9 » ne sont pris nulle part", "0 ligne", f"{len(_dr)} ligne(s)", not _dr)
constat2("C2-3", f"§ 3 : « DR1 » à « DR9 » sont libres, mais **« DR-1 »** (avec un tiret) existe déjà : un identifiant de contrôle de la session adverse de D334 ({len(_dr_tiret)} ligne(s) : "
         f"{', '.join(l.split(':')[0] + ':' + l.split(':')[1] for l in _dr_tiret)}). Homonymie faible, dans des pièces ; à écrire « DR1 (D336) » à la première occurrence suffit.")
_cp2 = [f for f in git_grep_fichiers(FIX, "contactPhone|contact_phone", "apps", "packages") if est_production(f)]
_schema_cp = "contact_phone" in (lire(FIX, "apps/api/prisma/schema.prisma") or "")
controle2("V3-DR3", "V3", "§ 3 DR3 « 15 fichiers TypeScript de production — dont visit-bookings.service.ts, qui vise visit_bookings, hors lot — et dans schema.prisma »", "15 · visit-bookings dedans · schema.prisma porte le champ",
          f"{len(_cp2)} · {'apps/api/src/venues/visit-bookings.service.ts' in _cp2} · {_schema_cp}", len(_cp2) == 15 and "apps/api/src/venues/visit-bookings.service.ts" in _cp2 and _schema_cp)
_qts = lire(FIX, "packages/types/src/quote.ts") or ""
_qconv = re.findall(r"^\s{4}(\w+):", bloc(_qts, "export const quoteConvertSchema", "\nexport ") or "", re.M)
controle2("V3-DR3b", "V3", "§ 3 DR3 « la conversion d'un devis marche COMME AUJOURD'HUI (contrat POST /quotes/:id/convert inchangé) » : le contrat d'aujourd'hui exige le téléphone", "contactPhone exigé (dzPhoneSchema)",
          f"champs {_qconv} ; `contactPhone: dzPhoneSchema,` {'contactPhone: dzPhoneSchema,' in (bloc(_qts, 'export const quoteConvertSchema', chr(10) + 'export ') or '')}",
          "contactPhone: dzPhoneSchema," in (bloc(_qts, "export const quoteConvertSchema", "\nexport ") or ""))
_d4_reg = re.search(r"^\| D4 \| ([AFCS]) \| (.*) \|$", _reg, re.M)
_d4_texte = _d4_reg.group(2) if _d4_reg else ""
_d4_jeton = parle_du_jeton(_d4_texte)
_homonymie = present(C_FIX, "⚠ **Homonymie relevée** : au registre, « D4 » est « Passes UI (D1 → D4) » ; dans le code, « (D4) » désigne les claims du jeton (tranche Auth).")
_entree_backlog = present(B_FIX, "**« D4 » désigne deux décisions différentes**")
_code_d4 = "Claims du JWT d'accès (D4)" in (lire(FIX, "apps/api/src/auth/auth.types.ts") or "")
controle2("V3-DR5", "V3", "§ 3 DR5 « Le jeton d'accès reste { sub, role } (décision D4 du registre) » : la ligne D4 du REGISTRE est la décision des claims du jeton",
          "la ligne D4 du registre parle du jeton",
          f"ligne du registre « | D4 | {_d4_reg.group(1) if _d4_reg else '?'} | {_d4_texte} | » — parle du jeton : {_d4_jeton} ; homonymie déjà relevée dans `ZWADJ_CONTINUITE.md` : {_homonymie} ; "
          f"entrée ouverte du backlog « « D4 » désigne deux décisions différentes » : {_entree_backlog} ; le « (D4) » des claims vient du code de l'auth (`auth.types.ts`) : {_code_d4}",
          _d4_jeton, f"{len(re.findall(r'^\| D4 \|', _reg, re.M))} ligne D4 au registre")
constat2("C2-4", "§ 3 DR5 — **FAUTE DE LA SESSION, À L'ORIGINE PROBABLE DE CET ÉCART** : le constat C-7 de la première lecture écrivait « homonymes des décisions D1 à D8 du registre (« D4 » y est même "
         "cité au sens des claims du jeton, D5) » — sans dire que la ligne D4 **du registre** est « Passes UI (D1 → D4) ». La phrase se lisait comme si le registre portait les claims. "
         "Forme que le dépôt soutient : « (D4 de la tranche Auth — les claims du jeton, `auth.types.ts:4` ; homonyme de D4 du registre, « Passes UI ») ».")
_pre = "PROD_REQUIRED_EXPLICIT" in (lire(FIX, "apps/api/src/config/env.ts") or "")
_pws = "export const passwordSchema" in (lire(FIX, "packages/types/src/auth.ts") or "")
_atp = re.findall(r"^\s+(\w+):", bloc(lire(FIX, "apps/api/src/auth/auth.types.ts") or "", "export interface AccessTokenPayload {", "}") or "", re.M)
controle2("V3-DR5b", "V3", "§ 3 DR5, le reste de ce qui se vérifie : claims `{ sub, role }`, `PROD_REQUIRED_EXPLICIT`, `passwordSchema`, ADM-2", "[sub, role] · 3 × vrai",
          f"{_atp} · {_pre}, {_pws}, {compter(C_FIX, 'ADM-2') >= 1}", _atp == ["sub", "role"] and _pre and _pws and compter(C_FIX, "ADM-2") >= 1)
_formeD = present(C_FIX, "- **D** *(proposition du relecteur, adoptée par Ko le 12/10/2026)* : un relecteur humain extérieur")
_j6 = present(C_FIX, "- **J-6** — **le transport WhatsApp**")
_audit = '@@map("audit_logs")' in (modele(SCHEMA, "AuditLog") or "")
controle2("V3-DR9", "V3", "§ 3 DR9 « MS-6 : relecture extérieure (forme D de D330) », « MS-5 … (rejoint J-6) », « MS-3 … les lignes d'audit des lots » : D, J-6 et `audit_logs` existent", "3 × vrai",
          f"{_formeD}, {_j6}, {_audit}", _formeD and _j6 and _audit)
nv("NV2-2", "§ 3 DR9 : la loi 18-07 (art. 12 à 21, 44), la loi 25-11 (art. 41 bis, 41 bis 2, 41 bis 3) — hors dépôt, comme NV-3 de la première lecture.")

# § 4 [L36-2]
_writ = re.findall(r"QuoteStatus\.(\w+)", bloc(_qts, "export const QUOTE_WRITABLE_STATUSES", "] as const") or "")
_leg = re.findall(r"QuoteStatus\.(\w+)", bloc(_qts, "export const QUOTE_LEGACY_STATUSES", "] as const") or "")
_tr = lire(FIX, "apps/api/src/venues/quote-transitions.ts") or ""
_cib = sorted(set(re.findall(r"to: (null|QuoteStatus\.\w+)", bloc(_tr, "export const QUOTE_TRANSITIONS", "};") or "")))
_acc2 = [l for l in git_grep_lignes(FIX, r"QuoteStatus\.ACCEPTED", "apps/api/src") if est_production(l.split(":", 1)[0])]
_acc2_ecr = [l for l in _acc2 if not re.search(r"(===|!==)\s*QuoteStatus\.ACCEPTED|^\S+:\d+:\s*(\*|//)", l)]
_r2 = present(C_FIX, "Le statut `ACCEPTED` d'un devis ne sera écrit que par le paiement en ligne (E3).")
controle2("V4-1", "V4", "§ 4 [L36-2] « QUOTE_WRITABLE_STATUSES … : DRAFT, ACCEPTED, CANCELLED ; aujourd'hui seuls DRAFT (création) et CANCELLED sont ÉCRITS, ACCEPTED n'a pas d'écrivain avant E3 (R2) ; SENT, SUPERSEDED et DECLINED sont LEGACY »",
          "inscriptibles [DRAFT, ACCEPTED, CANCELLED] · cibles {CANCELLED, null} · 0 écriture d'ACCEPTED · R2 · legacy [SENT, SUPERSEDED, DECLINED]",
          f"{_writ} · {_cib} · {len(_acc2_ecr)} écriture sur {len(_acc2)} occurrences · R2 {_r2} · {_leg}",
          _writ == ["DRAFT", "ACCEPTED", "CANCELLED"] and _cib == ["QuoteStatus.CANCELLED", "null"] and not _acc2_ecr and _r2 and _leg == ["SENT", "SUPERSEDED", "DECLINED"])

# § 6 e et h
_contrats = bloc(C_FIX, "**Contrats d'API NEUFS — chacun nommé**", "**L'écran du pro (le minimum visible, R4).**") or ""
_kids = [int(x) for x in re.findall(r"^- \*\*K-(\d+)\*\*", _contrats, re.M)]
_k12_tout = git_grep_lignes(FIX2, r"(^|[^A-Za-z0-9-])K-12([^0-9]|$)", ".")
_k12_hors = hors_prefixe(_k12_tout, "docs/preuves/D336/")
controle2("V6e-1", "V6", "§ 6 e) « K-12 NEUF, À NOMMER dans la table des contrats » : K-12 n'est défini nulle part (les seules mentions sont celles de la première lecture de ce lot)", "K-1…K-11 · 0 hors D336",
          f"K-{min(_kids)}…K-{max(_kids)} · {len(_k12_hors)} hors D336 ({len(_k12_tout) - len(_k12_hors)} dans docs/preuves/D336/)", 12 not in _kids and not _k12_hors)
controle2("V6e-2", "V6", "§ 6 e) « quoteConvertSchema : contactFirstName, contactLastName, contactPhone, contactEmail, paymentMethod » — la liste exacte, dans cet ordre",
          "[contactFirstName, contactLastName, contactPhone, contactEmail, paymentMethod]", _qconv, _qconv == ["contactFirstName", "contactLastName", "contactPhone", "contactEmail", "paymentMethod"])
controle2("V6e-3", "V6", "§ 6 e) « tous les devis existants, 24 en base de développement d'après D335 » : le constat X5-C1 de D335 le dit", "présent",
          present(C_FIX, "la base de développement `zwadj` compte aujourd'hui **8 salles et 24 devis**"), present(C_FIX, "la base de développement `zwadj` compte aujourd'hui **8 salles et 24 devis**"))
constat2("C2-5", "§ 6 e) — à trancher au code, sans contredire la consigne : l'écran PRÉREMPLIT `contactFirstName` et `contactLastName` (DEUX champs) depuis la copie du nom du devis, qui en a UN "
         "par écriture (`client_name_ar`, `client_name_latin`, DB-3). Le découpage d'un nom complet en prénom et nom n'est écrit nulle part ; la session préremplirait le nom de la langue de "
         "l'interface, découpé au premier espace, MODIFIABLE à l'écran (aucune écriture serveur n'en dépend).")
_m2 = normaliser_telephones(FIX, {"fixe": "021234567", "etranger": "+33612345678",
                                   "arabo_indien": "٠٥٥٥١٢٣٤٥٦", "mixte": "٠555123456"})
controle2("V6h-1", "V6", "§ 6 h) « numéro fixe ou étranger refusé, et numéro écrit TOUT en chiffres arabo-indiens refusé (mesuré) » — `normalizePhone` exécuté à b8ba85a",
          "null · null · null", f"{_m2['fixe']} · {_m2['etranger']} · {_m2['arabo_indien']}", _m2["fixe"] is None and _m2["etranger"] is None and _m2["arabo_indien"] is None)
controle2("V6h-2", "V6", "§ 6 h) « un MÉLANGE … accepté aujourd'hui (« ٠555123456 » rend +213555123456) » — mesuré", "+213555123456", _m2["mixte"], _m2["mixte"] == "+213555123456")

# § 8
_bl = B_FIX.split("\n")
_l38, _l2606, _l1132 = _bl[37], _bl[2605], _bl[1131]
controle2("V8-1", "V8", "§ 8 « DÉJÀ au backlog (à b8ba85a) : … (ligne 38), … (ligne 2606), … (ligne 1132) » — les trois lignes, à leur numéro", "3 × vrai",
          f"38 {'Create the transactional email provider account' in _l38}, 2606 {'LE COMPTE FOURNISSEUR WHATSAPP — TÂCHE DE KO' in _l2606}, 1132 {'Maintain data-processing register (Law 18-07)' in _l1132}",
          "Create the transactional email provider account" in _l38 and "LE COMPTE FOURNISSEUR WHATSAPP — TÂCHE DE KO" in _l2606 and "Maintain data-processing register (Law 18-07)" in _l1132,
          f"{len(_bl)} lignes de backlog")
_neuves = {m: compter(B_FIX, m) for m in ("déclaration à l'autorité", "délégué à la protection des données", "noms réels", "salle pilote", "MS-1")}
controle2("V8-2", "V8", "§ 8 « les tâches de Ko NEUVES : déclaration à l'autorité, délégué à la protection des données, ~50 noms réels, rôles de la salle pilote, liste MS-1 à MS-6 » : aucune n'est déjà au backlog",
          "0 partout", _neuves, not any(_neuves.values()))

# § 9
_marques = {"C-1": "§ 1c", "C-2": "§ 2 b)", "C-3": "§ 2 f)", "C-4": "§ 2 i)", "C-5": "§ 1c contre § 2 j)", "C-6": "§ 3 D3", "C-7": "§ 3 :", "C-8": "§ 4 [L36-2]",
            "C-9": "§ 8", "C-10": "§ 6 e)", "C-11": "§ 6 h)", "C-12": "§ 2 d)"}
_textes = dict(re.findall(r"^- \*\*(C-\d+)\*\* — (.*)$", _s1, re.M))
_ok9 = {c: _textes.get(c, "").startswith(m) for c, m in _marques.items()}
controle2("V9-1", "V9", "§ 9 la correspondance des 12 constats aux sections (C-1 : 1c ; C-2 : 2 b ; C-3 : 2 f ; C-4 : loi 25-11 ; C-5 : 2 j ; C-6 : DR3 ; C-7 : DR1 à DR9 ; C-8 : 4 ; C-9 : 8 ; C-10 : 6 e ; C-11 : 6 h ; C-12 : 2 d) "
          "= la section que chaque constat visait", "12 sur 12", f"{sum(_ok9.values())} sur 12 ; manquées : {[c for c, v in _ok9.items() if not v]}", all(_ok9.values()), "les 12 constats de la première sortie")
controle2("V9-2", "V9", "§ 9 « Écart B2i-1 … corrigé (2 i, DR9) ; B4-3 … corrigé (4 [L36-2]) ; B6-4 … corrigé (6 e) » : les corrections se lisent dans les contrôles V2i, V4-1 et V6e de cette lecture",
          "V2i-1, V2i-2, V2i-3, V4-1, V6e-1, V6e-2 vrais", f"{[c for c in ('V2i-1', 'V2i-2', 'V2i-3', 'V4-1', 'V6e-1', 'V6e-2') if c in ecarts_v2]} en écart",
          not any(c in ecarts_v2 for c in ("V2i-1", "V2i-2", "V2i-3", "V4-1", "V6e-1", "V6e-2")))

# ── SORTIE ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
print()
print("CONTRÔLES")
print("| id | ce qui est contrôlé | attendu (lu) · mesuré | résultat |")
print("|---|---|---|---|")
for l in controles2:
    print(l)
print()
_total = sum(v[0] for v in familles2.values())
_ko = sum(v[1] for v in familles2.values())
print("VENTILATION PAR FAMILLE : " + " · ".join(f"{f} {v[0]} ({v[1]} ✗)" for f, v in sorted(familles2.items())) + f" — aucune famille à zéro : {all(v[0] for v in familles2.values())}")
print()
print(f"ÉCARTS DE L'ÉTAT DÉCRIT OU VIVANT : {len(ecarts_etat)} {ecarts_etat}")
print(f"ÉCARTS DE LA CONSIGNE V2 (affirmations fausses contre le dépôt) : {len(ecarts_v2)} {ecarts_v2}")
print()
print(f"CONSTATS ({len(constats2)})")
for l in constats2:
    print(l)
print()
print(f"NON VÉRIFIABLES ({len(nv2)})")
for l in nv2:
    print(l)
print()
print(f"BILAN : {_total} contrôles — {_total - _ko} ✓ · {_ko} ✗ (état {len(ecarts_etat)} · consigne v2 {len(ecarts_v2)}) · {len(constats2)} constats · {len(nv2)} non vérifiables · "
      f"calibration {bras[0]} bras (préfixe repris + neufs), {bras[1]} manqué")
if ecarts_v2:
    print("RÈGLE D'ARRÊT DÉCLENCHÉE (consigne v2, section 0) : « Si une affirmation de cette version 2 est fausse contre le dépôt, tu t'arrêtes et tu le dis ; tu ne l'adaptes pas seul. »")
    sys.exit(3)
sys.exit(1 if ecarts_etat else 0)
