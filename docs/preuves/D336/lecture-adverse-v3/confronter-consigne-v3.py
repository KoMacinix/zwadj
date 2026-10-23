"""D336 (reprise) — TROISIÈME lecture adverse : la consigne VERSION 3 du relecteur (22/10/2026, adoptée par Ko), confrontée au dépôt.

POURQUOI IL EXISTE
  Consigne v3, section 0, point 2 : « ta TROISIÈME lecture adverse, de CETTE version 3, contre le dépôt (ni contre ta mémoire, ni contre celle du relecteur) : tu reprends l'instrument de la
  seconde (confronter-consigne-v2.py), son préfixe vérifié par empreinte comme la seconde l'a fait, et tu ne rejoues que ce qui change : sections 0, 2 b, 3 (en-tête et DR5), 6 e h, 9. Tu mesures
  aussi que rien d'autre n'a changé depuis la version 2 (comparaison au mot, espaces normalisés) ; si la version 2 n'est pas au dépôt sous une forme comparable, ce contrôle est « non vérifiable »,
  pas un motif d'arrêt. » Et : « Si une affirmation de cette version 3 est fausse contre le dépôt, tu t'arrêtes et tu le dis ; tu ne l'adaptes pas seul. » Comme les deux premiers, cet
  instrument est la RÈGLE D'ARRÊT du lot : son code de sortie dit si elle est déclenchée.

  PARTIE A (courte) — l'état que la version 3 décrit : les quatre commits de D336 depuis b8ba85a, la seconde sortie, l'extension 2, l'état vivant.
  PARTIE B (en entier) — la version 3, SEULEMENT ce qui change par rapport à la version 2.

REPRISE DE L'INSTRUMENT DE LA SECONDE LECTURE — PAR EXÉCUTION, JAMAIS PAR RECOPIE (D295)
  `confronter-consigne-v2.py` est une pièce versée (`9f85228`), il n'est PAS retouché. Son PRÉFIXE — tout ce qui précède la ligne qui COMMENCE par « # ── CONTRÔLES » — est lu dans l'objet git à
  `9f85228`, son empreinte imprimée et confrontée au fichier sur disque, puis EXÉCUTÉ tel quel ; ce préfixe exécute à son tour celui de la première lecture (lu à `feea423`), si bien que les 44 bras
  de calibration se rejouent dans l'ordre où ils ont été versés.
  ⚠ DÉFAUT DE FORME REPÉRÉ AVANT LA PREMIÈRE EXÉCUTION : le fichier de la seconde lecture porte la chaîne « # ── CONTRÔLES » TROIS fois — dans son en-tête (ligne 14, qui décrit le découpage),
  dans sa constante `MARQUE` (ligne 42) et en tête de sa section des contrôles (ligne 95) ; seule la dernière COMMENCE une ligne. Découper à la première occurrence couperait AVANT sa calibration.
  La marque est donc cherchée EN DÉBUT DE LIGNE, et son unicité y est exigée. (Cet en-tête disait « DEUX fois » jusqu'à la deuxième passe : défaut 3 de `defauts-instrument-v3.txt`.)

USAGE, depuis la racine (bash, jamais une redirection PowerShell — D298) :
  python3 docs/preuves/D336/lecture-adverse-v3/confronter-consigne-v3.py > docs/preuves/D336/lecture-adverse-v3/confronter-sortie-v3.txt
  Code de sortie : 0 = aucun écart · 1 = écart de l'état décrit ou vivant · 2 = calibration manquée (abandon) · 3 = écart de la consigne v3 : LA RÈGLE D'ARRÊT EST DÉCLENCHÉE.

LECTURE SEULE : objets git à SHA fixés, sauf la famille X (état LIVE) ; le dossier temporaire de la mesure de `normalizePhone` (extracteur repris).

FAMILLES : S (l'état décrit : D336 depuis b8ba85a, la seconde sortie, l'extension 2) · X (état LIVE) · W0, W2, W3, W6, W9 (la consigne v3, par section) · NV (la comparaison au mot avec la v2).
"""
import hashlib
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")

SECOND = "docs/preuves/D336/lecture-adverse-v2/confronter-consigne-v2.py"
SORTIE2 = "docs/preuves/D336/lecture-adverse-v2/confronter-sortie-v2.txt"
FIX3 = "9f85228"      # la clôture de la seconde lecture = SHA de départ de cette reprise (consigne v3, section 0)
EXT2 = "18d10b5"      # l'extension 2 de la table, commitée SEULE avant cette lecture

print("D336 (reprise) — TROISIÈME lecture adverse : la consigne VERSION 3 du 22/10/2026 · SHA fixés : reprise " + FIX3 + ", extension 2 " + EXT2 + ", état décrit b8ba85a")
_blob2 = subprocess.run(["git", "show", f"{FIX3}:{SECOND}"], capture_output=True, check=True).stdout
_disque2 = open(SECOND, "rb").read()
_texte2 = _blob2.decode("utf-8").replace("\r\n", "\n")
_debuts = [m.start() for m in re.finditer(r"^# ── CONTRÔLES", _texte2, re.M)]
print(f"PRÉFIXE REPRIS : `{SECOND}` lu à {FIX3} — {len(_blob2)} octets, sha256 {hashlib.sha256(_blob2).hexdigest()} ; le fichier sur disque est identique : {_blob2 == _disque2} (attendu True) ; "
      f"marque « # ── CONTRÔLES » EN DÉBUT DE LIGNE : {len(_debuts)} (attendu 1) ; dans tout le texte : {_texte2.count('# ── CONTRÔLES')} "
      f"(attendu 3 : l'en-tête qui décrit le découpage, la constante MARQUE, le titre de section)")
if _blob2 != _disque2 or len(_debuts) != 1:
    print("ABANDON : le préfixe repris n'est pas celui de la pièce versée.")
    sys.exit(2)
_prefixe2 = _texte2[: _debuts[0]]
print(f"  préfixe exécuté : {len(_prefixe2.encode('utf-8'))} octets, {_prefixe2.count(chr(10))} lignes, sha256 {hashlib.sha256(_prefixe2.encode('utf-8')).hexdigest()}")
print("── sortie du préfixe de la seconde lecture (qui exécute celui de la première) ──")
exec(compile(_prefixe2, SECOND + " (préfixe lu à " + FIX3 + ")", "exec"), globals())
print("── fin du préfixe de la seconde lecture ──")

# ── EXTRACTEUR NEUF, calibré à deux bras ────────────────────────────────────────────────────────────────────────────────────────────


def chemins_extension(t: str, titre: str):
    """Les chemins (première cellule des tables) d'UNE section d'extension, de son titre au titre d'extension suivant ; None si le titre n'est pas unique."""
    if t.count(titre) != 1:
        return None
    morceau = t.split(titre, 1)[1].split("\n#### Extension ", 1)[0]
    return chemins_de_table(morceau)


def attribue_hors_d336(sha: str, jeton: str) -> list:
    """[RÉPARATION, défaut 1] Les fichiers qui portent `jeton` HORS des pièces de lecture de ce lot (`docs/preuves/D336/`), qui citent la consigne sans rien attribuer."""
    return [f for f in git_grep_fichiers(sha, jeton, ".") if not f.startswith("docs/preuves/D336/")]


def sans_gras(t: str) -> str:
    """[RÉPARATION, défaut 2] Le texte sans les marques de gras Markdown (`**`), pour chercher une phrase que le texte met en gras."""
    return t.replace("**", "")


_t_ext2 = lire(EXT2, "docs/preuves/D336/table-ouverture.md") or ""
_e1 = chemins_extension(_t_ext2, "#### Extension 1 —")
calibrer("chemins_extension (borne une extension : la 1 ne voit pas les chemins de la 2)",
         _e1 is not None and "docs/preuves/D336/lecture-adverse-v2/confronter-consigne-v2.py" in _e1 and "docs/preuves/D336/lecture-adverse-v3/confronter-consigne-v3.py" not in _e1,
         chemins_extension(_t_ext2, "#### Extension 9 —") is not None)
calibrer("attribue_hors_d336 (un jeton attribué ailleurs ; un jeton qui ne vit que dans les pièces de D336)",
         CONT in attribue_hors_d336(FIX3, "D335"), attribue_hors_d336(FIX3, "confronter-consigne-v2") != [])
calibrer("sans_gras (une phrase mise en gras se retrouve ; une phrase absente ne se retrouve pas)",
         "homonymes des décisions" in sans_gras("— **homonymes** des décisions D1"), "homonymes des décisions" in sans_gras("— homonymes, des décisions D1"))
print(f"  calibration totale (préfixes repris + neuve) : {bras[0]} bras joués, {bras[1]} manqué(s) (attendu 0)")
if bras[1]:
    print("ABANDON : un bras de calibration manque — aucun contrôle n'est joué (D286).")
    sys.exit(2)

# ── CONTRÔLES ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
controles3: list = []
ecarts_etat3: list = []
ecarts_v3: list = []
constats3: list = []
nv3: list = []
familles3: dict = {}


def controle3(cid: str, famille: str, libelle: str, attendu, mesure, ok: bool, parcouru: str = "") -> None:
    familles3.setdefault(famille, [0, 0])
    familles3[famille][0] += 1
    if not ok:
        familles3[famille][1] += 1
        (ecarts_v3 if famille.startswith("W") else ecarts_etat3).append(cid)
    suffixe = f" — parcouru : {parcouru}" if parcouru else ""
    controles3.append(f"| {cid} | {libelle} | attendu : {attendu} · mesuré : {mesure}{suffixe} | {'✓' if ok else '✗'} |")


def constat3(cid: str, texte: str) -> None:
    constats3.append(f"- **{cid}** — {texte}")


def nv_3(cid: str, texte: str) -> None:
    nv3.append(f"- **{cid}** — {texte}")


# PARTIE A — l'état décrit ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
_c = rev_list(FIX, FIX3)
_d = noms_diff(FIX, FIX3)
controle3("S1", "S", "D336 depuis b8ba85a = quatre commits — table seule (77728a5), première lecture (feea423), extension 1 (eacd079), seconde lecture (9f85228) — et rien hors `docs/preuves/D336/`",
          "[77728a5, feea423, eacd079, 9f85228] · 0 hors D336", f"{_c} · {len([p for p in _d if not p.startswith('docs/preuves/D336/')])} hors D336",
          _c == ["77728a5", "feea423", "eacd079", "9f85228"] and all(p.startswith("docs/preuves/D336/") for p in _d), f"{len(_d)} fichiers")
_s2 = lire(FIX3, SORTIE2) or ""
_ec2 = re.search(r"^ÉCARTS DE LA CONSIGNE V2 \(affirmations fausses contre le dépôt\) : 1 \['V3-DR5'\]$", _s2, re.M) is not None
_c2 = re.findall(r"^- \*\*(C2-\d+)\*\* —", _s2, re.M)
_nv2 = re.findall(r"^- \*\*(NV2-\d+)\*\* —", _s2, re.M)
controle3("S2", "S", "la sortie de la seconde lecture (9f85228) porte UN écart (V3-DR5), cinq constats C2-1 à C2-5, deux non vérifiables, et l'arrêt", "1 · C2-1…C2-5 · NV2-1, NV2-2 · arrêt",
          f"{_ec2} · {_c2} · {_nv2} · {'RÈGLE D' + chr(39) + 'ARRÊT DÉCLENCHÉE' in _s2}",
          _ec2 and _c2 == [f"C2-{i}" for i in range(1, 6)] and _nv2 == ["NV2-1", "NV2-2"] and "RÈGLE D'ARRÊT DÉCLENCHÉE" in _s2)
_ns2 = numstat(EXT2)
_e2 = chemins_extension(_t_ext2, "#### Extension 2 —") or set()
_v3_decl = all(p in _e2 for p in ("docs/preuves/D336/lecture-adverse-v3/confronter-consigne-v3.py", "docs/preuves/D336/lecture-adverse-v3/confronter-sortie-v3.txt",
                                  "docs/preuves/D336/audit-secrets-d336c.txt", "docs/preuves/D336/tri-audit-d336c.txt"))
_par2 = git("rev-parse", "--short=7", EXT2 + "^").decode().strip()
controle3("S3", "S", "l'extension 2 (18d10b5) est SEULE dans son commit, n'efface rien, posée sur 9f85228, et déclare la troisième lecture, l'audit « c » et son tri", "table seule, 0 retirée, déclarés",
          f"{_ns2} · parent {_par2} · déclarés {_v3_decl}", len(_ns2) == 1 and _ns2[0][1] == 0 and _ns2[0][2] == "docs/preuves/D336/table-ouverture.md" and _par2 == FIX3 and _v3_decl)
_h = git("rev-parse", "--short=7", "HEAD").decode().strip()
_o = git("rev-parse", "--short=7", "origin/main").decode().strip()
controle3("X1", "X", "« origin/main = 9f85228 » (relu après `git fetch`) ; HEAD = l'extension 2, non encore poussée", f"origin {FIX3} · HEAD {EXT2}", f"origin {_o} · HEAD {_h}", _o == FIX3 and _h == EXT2)
_st3 = [l for l in git("status", "--porcelain=v1").decode("utf-8").split("\n") if l.strip()]
_st3_mal = [l for l in _st3 if not (l.startswith("?? ") and l[3:].startswith("docs/preuves/D336/lecture-adverse-v3/"))]
_stash3 = [l for l in git("stash", "list").decode("utf-8").split("\n") if l.strip()]
controle3("X2", "X", "arbre : rien de suivi modifié ; seuls des fichiers NON SUIVIS sous `docs/preuves/D336/lecture-adverse-v3/` ; aucun stash", "0 · 0", f"{len(_st3_mal)} · {len(_stash3)}",
          not _st3_mal and not _stash3, f"{len(_st3)} ligne(s) de `git status`")

# PARTIE B — la consigne v3, ce qui change ──────────────────────────────────────────────────────────────────────────────────────────────
C3 = lire(FIX3, CONT)
_reg3 = section(C3, "## Registre des décisions")
_dern3 = re.findall(r"^\| (D\d+) \| [AFCS] \|", _reg3, re.M)
_d337_tout = git_grep_fichiers(FIX3, "D337", ".")
_d337 = attribue_hors_d336(FIX3, "D337")
controle3("W0-1", "W0", "§ 0 « LE LOT RESTE D336. Tu ne prends PAS D337 » : le registre finit toujours à D335, « D337 » n'est nulle part hors des pièces de lecture de ce lot (qui citent la consigne)",
          "D335 · 0", f"{_dern3[-1]} · {len(_d337)} (citations dans docs/preuves/D336/ : {len(_d337_tout) - len(_d337)})",
          _dern3[-1] == "D335" and not _d337, f"{len(_dern3)} lignes de registre")
controle3("W0-2", "W0", "§ 0 « origin/main = 9f85228 (table 77728a5 ; première lecture adverse feea423 ; extension 1 eacd079 ; seconde lecture 9f85228 ; tout sous docs/preuves/D336/) » et « rien d'autorité ni de code n'a été écrit »",
          "S1 et X1 vrais", f"S1 {'S1' not in ecarts_etat3}, X1 {'X1' not in ecarts_etat3}", "S1" not in ecarts_etat3 and "X1" not in ecarts_etat3)
controle3("W0-3", "W0", "§ 0 « la seule affirmation fausse que ta seconde lecture a relevée (V3-DR5, section 3 DR5) … ses cinq constats »", "S2 vrai", f"S2 {'S2' not in ecarts_etat3}", "S2" not in ecarts_etat3)
_e1_3 = chemins_extension(_t_ext2, "#### Extension 1 —") or set()
_cond1 = _t_ext2.split("#### Extension 1 —", 1)[1].split("##### Fichiers CONDITIONNELS de l'extension 1", 1)
_cert1 = chemins_de_table(_cond1[0])
_condl = chemins_de_table(_cond1[1].split("\n#### Extension ", 1)[0]) if len(_cond1) == 2 else set()
_ouv = chemins_de_table(lire("77728a5", "docs/preuves/D336/table-ouverture.md") or "")
_defaut = {p for p in _condl if "AVANT-CORRECTIFS" in p or "defauts-instrument" in p}
_code = _condl - _defaut - _ouv
controle3("W0-4", "W0", "§ 0, 1) « à vérifier contre ses 54 chemins » : l'extension 1 compte 54 chemins sous la définition de la seconde réponse (« la seconde lecture et son audit, et le code de L35-4 »)",
          "4 + 50 = 54", f"{len(_cert1)} + {len(_code)} = {len(_cert1) + len(_code)} (cités en tout : {len(_e1_3)} ; conditionnels de défaut d'instrument : {len(_defaut)} ; `.md` déjà déclarés à l'ouverture : {len(_condl & _ouv)})",
          len(_cert1) + len(_code) == 54)
constat3("C3-1", f"§ 0, 1) « ses 54 chemins » : le chiffre vient de la réponse de la seconde session, qui ne disait pas sa définition. Mesuré : l'extension 1 CITE {len(_e1_3)} chemins ; 54 = les "
         f"{len(_cert1)} de la seconde lecture et de son audit + les {len(_code)} du code et des pièces du lot ; restent hors du compte les {len(_defaut)} fichiers conditionnels d'un défaut d'instrument et les "
         f"{len(_condl & _ouv)} `.md` déjà déclarés à l'ouverture. Faute de la session (un chiffre sans sa définition, D290), sans incidence : la vérification de 6 e porte sur les chemins, pas sur leur nombre.")
nv_3("NV3-1", "§ 0, 2) « rien d'autre n'a changé depuis la version 2 (comparaison au mot, espaces normalisés) » : NI la version 2 NI la version 3 ne sont au dépôt (les deux vivent dans le chat) ; "
     "les deux premières lectures n'en ont versé que de COURTS EXTRAITS, dans les libellés de leurs contrôles. Comparer au mot exigerait de lire le chat, c'est-à-dire la « mémoire » que la consigne exclut. "
     "Non vérifiable, et — par la consigne — pas un motif d'arrêt.")
_l1912 = C_FIX.split("\n")[1911]
_v2b3 = re.search(r"^\| V2b-3 \|.*\(\[1912\]\).*\| ✓ \|$", _s2, re.M) is not None
controle3("W2b-1", "W2", "§ 2 b) « la ligne qui ÉCRIT la cinquième révision de D-10 : la ligne 1912 (numéro relevé par ta seconde lecture, avant tes annotations ; C2-2) »",
          "la seconde lecture l'a relevée · la ligne 1912 à b8ba85a l'écrit", f"{_v2b3} · {'l' + chr(39) + '**ordre des rangs est révisé** (**D-10, cinquième révision**)' in _l1912}",
          _v2b3 and "l'**ordre des rangs est révisé** (**D-10, cinquième révision**)" in _l1912)
_dr_t = git_grep_lignes(FIX3, r"(^|[^A-Za-z0-9-])DR-1([^0-9]|$)", ".")
_dr_t_hors = [l for l in _dr_t if not l.startswith("docs/preuves/D336/")]
controle3("W3-0", "W3", "§ 3, en-tête « « DR-1 », avec un tiret, est déjà un identifiant de contrôle dans les pièces de D334 (C2-3) »", "pièces de D334 seulement (hors les lectures de D336 qui le citent)",
          f"{len(_dr_t_hors)} ligne(s), toutes sous docs/preuves/D334/ : {all(l.startswith('docs/preuves/D334/') for l in _dr_t_hors)}",
          bool(_dr_t_hors) and all(l.startswith("docs/preuves/D334/") for l in _dr_t_hors))
_at4 = (lire(FIX, "apps/api/src/auth/auth.types.ts") or "").split("\n")[3]
_d4r = re.search(r"^\| D4 \| [AFCS] \| (.*) \|$", _reg, re.M)
_hom = present(C_FIX, "dans le code, « (D4) » désigne les claims du jeton (tranche Auth)")
_c24 = (re.search(r"^- \*\*C2-4\*\* — (.*)$", _s2, re.M) or [None, ""])[1]
_forme_c24 = (re.search(r"Forme que le dépôt soutient : « (.*) »\.$", _c24) or [None, None])[1]   # EXTRAITE de la sortie versée, jamais recopiée
_dr5_v3 = "(D4 de la tranche Auth — les claims du jeton, `auth.types.ts:4` ; homonyme de D4 du registre, « Passes UI »)"   # le texte de la consigne v3, DR5, recopié de la consigne
controle3("W3-DR5", "W3", "§ 3 DR5 « Le jeton d'accès reste { sub, role } (D4 de la tranche Auth — les claims du jeton, `auth.types.ts:4` ; homonyme de D4 du registre, « Passes UI ») »",
          "ligne 4 = les claims (D4) · registre D4 = « Passes UI… » · « tranche Auth » écrit au dépôt",
          f"ligne 4 : « {_at4.strip()[:48]}… » · registre : « {(_d4r.group(1) if _d4r else '?')[:30]}… » · « tranche Auth » : {_hom}",
          "Claims du JWT d'accès (D4)" in _at4 and bool(_d4r) and _d4r.group(1).startswith("Passes UI") and _hom)
controle3("W3-DR5b", "W3", "§ 3 DR5 et § 9 « dans la forme que tu as proposée » : le texte de DR5 = la forme proposée par le constat C2-4 de la seconde lecture (extraite de la sortie versée)", "identiques",
          f"forme extraite : {_forme_c24 is not None} · égale au texte de la v3 : {_dr5_v3 == _forme_c24}", _forme_c24 is not None and _dr5_v3 == _forme_c24)
_c25 = (re.search(r"^- \*\*C2-5\*\* — (.*)$", _s2, re.M) or [None, ""])[1]
controle3("W6e-1", "W6", "§ 6 e) « Découpage du nom (C2-5 ; proposé par ta seconde lecture …) : … celle de la langue de l'interface … la coupe au PREMIER espace ; les deux champs restent modifiables » : "
          "c'est la proposition de C2-5", "C2-5 propose la langue de l'interface, le premier espace, modifiable",
          f"{'langue de' in _c25 and 'interface' in _c25} · {'premier espace' in _c25} · {'MODIFIABLE' in _c25}", "interface" in _c25 and "premier espace" in _c25 and "MODIFIABLE" in _c25)
_qts3 = lire(FIX, "packages/types/src/quote.ts") or ""
_qconv3 = re.findall(r"^\s{4}(\w+):", bloc(_qts3, "export const quoteConvertSchema", "\nexport ") or "", re.M)
_route = '@Post("quotes/:id/convert")' in (lire(FIX, "apps/api/src/venues/quotes.controller.ts") or "")
_requis = "contactFirstName: contactName," in (bloc(_qts3, "export const quoteConvertSchema", "\nexport ") or "") and present(_qts3, 'const contactName = personNameSchema({ required: "quote.validation.required"')
controle3("W6e-2", "W6", "§ 6 e) « le contrat POST /quotes/:id/convert (quoteConvertSchema : contactFirstName, contactLastName, contactPhone, contactEmail, paymentMethod) est INCHANGÉ » ; « sans espace … le prénom reste vide, à saisir » : "
          "la route existe, la liste est exacte, le prénom est EXIGÉ par le contrat", "route · 5 champs · prénom requis", f"{_route} · {_qconv3} · {_requis}",
          _route and _qconv3 == ["contactFirstName", "contactLastName", "contactPhone", "contactEmail", "paymentMethod"] and _requis)
controle3("W6e-3", "W6", "§ 6 e) « 24 en base de développement d'après D335 »", "présent", present(C_FIX, "la base de développement `zwadj` compte aujourd'hui **8 salles et 24 devis**"),
          present(C_FIX, "la base de développement `zwadj` compte aujourd'hui **8 salles et 24 devis**"))
_m3 = normaliser_telephones(FIX, {"fixe": "021234567", "etranger": "+33612345678",
                                   "arabo_indien": "٠٥٥٥١٢٣٤٥٦", "mixte": "٠555123456"})
controle3("W6h-1", "W6", "§ 6 h) « numéro fixe ou étranger refusé, et numéro écrit TOUT en chiffres arabo-indiens refusé … ; un MÉLANGE … accepté aujourd'hui (« ٠555123456 » rend +213555123456) » — mesuré",
          "null · null · null · +213555123456", f"{_m3['fixe']} · {_m3['etranger']} · {_m3['arabo_indien']} · {_m3['mixte']}",
          _m3["fixe"] is None and _m3["etranger"] is None and _m3["arabo_indien"] is None and _m3["mixte"] == "+213555123456")
constat3("C3-2", "§ 6 h) le mode de défaillance neuf (« prénom composé — « Abd El Kader », « عبد القادر » — ou nom écrit avant le prénom : corrigé à la main ») ne porte AUCUNE affirmation sur le dépôt : "
         "c'est une exigence de test (les deux champs modifiables, l'envoi porte la valeur de l'écran), écrite avant le code.")
_s1b = lire(FIX3, "docs/preuves/D336/lecture-adverse/confronter-sortie.txt") or ""
_ok_ec1 = re.search(r"^ÉCARTS DE LA CONSIGNE \(affirmations fausses contre le dépôt\) : 3 \['B2i-1', 'B4-3', 'B6-4'\]$", _s1b, re.M) is not None
_marq1 = {"C-1": "§ 1c", "C-2": "§ 2 b)", "C-3": "§ 2 f)", "C-4": "§ 2 i)", "C-5": "§ 1c contre § 2 j)", "C-6": "§ 3 D3", "C-7": "§ 3 :", "C-8": "§ 4 [L36-2]",
          "C-9": "§ 8", "C-10": "§ 6 e)", "C-11": "§ 6 h)", "C-12": "§ 2 d)"}
_t1 = dict(re.findall(r"^- \*\*(C-\d+)\*\* — (.*)$", _s1b, re.M))
_ok_m1 = all(_t1.get(c, "").startswith(m) for c, m in _marq1.items())
controle3("W9-1", "W9", "§ 9, première lecture (feea423) : les écarts B2i-1, B4-3, B6-4 et la correspondance des douze constats aux sections — inchangée depuis la v2", "3 écarts · 12 sur 12",
          f"{_ok_ec1} · {sum(_t1.get(c, '').startswith(m) for c, m in _marq1.items())} sur 12", _ok_ec1 and _ok_m1)
_marq2 = {"C2-1": "§ 1c contre § 2 j)", "C2-2": "§ 2 b)", "C2-3": "§ 3 :", "C2-4": "§ 3 DR5", "C2-5": "§ 6 e)"}
_t2 = dict(re.findall(r"^- \*\*(C2-\d+)\*\* — (.*)$", _s2, re.M))
_ok_m2 = all(_t2.get(c, "").startswith(m) for c, m in _marq2.items())
controle3("W9-2", "W9", "§ 9, seconde lecture (9f85228) : « C2-1 : rien à faire. C2-2 : section 2 b. C2-3 : en-tête de la section 3. C2-4 : couvert par V3-DR5. C2-5 : sections 6 e et 6 h. NV2-1 et NV2-2 : inchangés » "
          "— chaque constat vise bien la section citée", "5 sur 5 · NV2-1, NV2-2", f"{sum(_t2.get(c, '').startswith(m) for c, m in _marq2.items())} sur 5 · {_nv2}", _ok_m2 and _nv2 == ["NV2-1", "NV2-2"])
_c7 = sans_gras(_t1.get("C-7", ""))
controle3("W9-3", "W9", "§ 9 « il a écrit « décision D4 du registre » d'après la formulation de C-7 » : C-7 porte bien la formulation ambiguë (« D4 » cité au sens des claims, à côté de « du registre »)",
          "présente", f"{'« D4 » y est même cité au sens des claims du jeton' in _c7} · {'homonymes des décisions D1 à D8 du registre' in _c7}",
          "« D4 » y est même cité au sens des claims du jeton" in _c7 and "homonymes des décisions D1 à D8 du registre" in _c7)

# ── SORTIE ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
print()
print("CONTRÔLES")
print("| id | ce qui est contrôlé | attendu (lu) · mesuré | résultat |")
print("|---|---|---|---|")
for l in controles3:
    print(l)
print()
_tot = sum(v[0] for v in familles3.values())
_nko = sum(v[1] for v in familles3.values())
print("VENTILATION PAR FAMILLE : " + " · ".join(f"{f} {v[0]} ({v[1]} ✗)" for f, v in sorted(familles3.items())) + f" — aucune famille à zéro : {all(v[0] for v in familles3.values())}")
print()
print(f"ÉCARTS DE L'ÉTAT DÉCRIT OU VIVANT : {len(ecarts_etat3)} {ecarts_etat3}")
print(f"ÉCARTS DE LA CONSIGNE V3 (affirmations fausses contre le dépôt) : {len(ecarts_v3)} {ecarts_v3}")
print()
print(f"CONSTATS ({len(constats3)})")
for l in constats3:
    print(l)
print()
print(f"NON VÉRIFIABLES ({len(nv3)})")
for l in nv3:
    print(l)
print()
print(f"BILAN : {_tot} contrôles — {_tot - _nko} ✓ · {_nko} ✗ (état {len(ecarts_etat3)} · consigne v3 {len(ecarts_v3)}) · {len(constats3)} constats · {len(nv3)} non vérifiable(s) · "
      f"calibration {bras[0]} bras (préfixes repris + neuf), {bras[1]} manqué")
if ecarts_v3:
    print("RÈGLE D'ARRÊT DÉCLENCHÉE (consigne v3, section 0) : « Si une affirmation de cette version 3 est fausse contre le dépôt, tu t'arrêtes et tu le dis ; tu ne l'adaptes pas seul. »")
    sys.exit(3)
if ecarts_etat3:
    sys.exit(1)
print("RÈGLE D'ARRÊT NON DÉCLENCHÉE : aucune affirmation de la version 3 n'est démentie par le dépôt ; le lot continue (section 1 en première écriture d'autorité).")
sys.exit(0)
