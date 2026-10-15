"""Fabrique docs/preuves/D334/outils/lire-campagnes.py (copie de celui de D330) et docs/preuves/D334/outils/verser.py (copie de celui de D330) : modifications DÉCLARÉES et COMPTÉES."""
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
compte: dict = {}


def appliquer(s, cle, old, new, count=1):
    assert s.count(old) == count, (cle, s.count(old), old[:100])
    compte[cle] = compte.get(cle, 0) + count
    return s.replace(old, new)


# ───────────────────────────── lire-campagnes.py
s = open("docs/preuves/D330/outils/lire-campagnes.py", encoding="utf-8", newline="").read()
assert "\r" not in s
ENTETE = '''"""D334 — LECTURE DES CAMPAGNES DE LA CERTIFICATION QUI COUVRE D331, D332 ET D333 (rang 40). COPIE de `docs/preuves/D330/outils/lire-campagnes.py`, MODIFICATIONS DÉCLARÉES, chacune comptée à la fabrication (`fab-lire.py`, assertions avant ET après) :
  (1) LE FICHIER DES PLANCHERS est `docs/preuves/D334/plancher/plancher.txt` (33 planchers : 26 REPRIS de D324/D329 — blob du harnais identique, prouvé par `git` —, 7 MESURÉS à D334 : act-plafonds, horloge, r33, s10b, r37, r38, r39) ;
  (2) `r32`, `r33`, `r37`, `r38`, `r39` : `declarees.py` rend `n = None` (cibles construites par une fonction) ; leur NOMBRE DE CIBLES est lu en IMPORTANT le module (gardes `__main__` vérifiées) ; `r33` ET `r39` sont VERROUILLÉS par `--int`
      (`"--int" in sys.argv`), leur journal qui certifie est `int-<nom>.log` ; pas de crochets de mesures (format propre) ;
  (3) LA TABLE DE NON-DÉMARRAGE SIMULÉ compose celle de D324, de D329 et de D334 (la dernière l'emporte pour les sept harnais mesurés) ; la calibration « chacun refusé à son propre non-démarrage » porte sur 33 harnais, plus sur 30 ;
  (4) LES BRAS DE CALIBRATION sur `r33` sont REPRIS sur le journal réel de D333 (95 cibles — le journal de D326 en comptait 102, avant les retraits de D332) ; SIX bras de plus : `r37` (journal réel de D332, 21), `r38` (D333, 46) et `r39` (D333, 51), chacun accepté tel quel et refusé amputé
      d'une ligne « ✓ » ; le contrôle final « déclaré » dit r33 = 95, r37 = 21, r38 = 46, r39 = 51 ;
  (5) ÉTIQUETTES : `r37`, `r38` et `r39` ne sont dans aucune liste du chemin de l'argent (`tri.txt` de D307) ni dans aucune exception par cible : « non classées », comme `r32` et `r33` (D313) — écart nommé au protocole.
Les en-têtes suivants sont ceux de D330, intacts.
"""
'''
s = ENTETE + s
compte["entete"] = 1
s = appliquer(s, "(1)", 'open("docs/preuves/D330/plancher/plancher.txt", encoding="utf-8")', 'open("docs/preuves/D334/plancher/plancher.txt", encoding="utf-8")')
s = appliquer(s, "(2)", 'for _nom in ("r32", "r33"):', 'for _nom in ("r32", "r33", "r37", "r38", "r39"):')
s = appliquer(s, "(2)", '"verrou": _nom == "r33"}', '"verrou": _nom in ("r33", "r39")}')
s = appliquer(s, "(3)", 'for fichier_sim in ("docs/preuves/D324/plancher/simulation-sortie.txt", "docs/preuves/D329/plancher/simulation-sortie.txt"):', 'for fichier_sim in ("docs/preuves/D324/plancher/simulation-sortie.txt", "docs/preuves/D329/plancher/simulation-sortie.txt", "docs/preuves/D334/plancher/simulation-sortie.txt"):')
s = appliquer(s, "(3)", "b4 = len(sim) == 30 and sorted(refuses) == sorted(sim)", "b4 = len(sim) == 33 and sorted(refuses) == sorted(sim)")
s = appliquer(s, "(3)", "chacun des {len(sim)} harnais (attendu 30)", "chacun des {len(sim)} harnais (attendu 33)")
s = appliquer(s, "(4)", 'r33_reel = lire("docs/preuves/D326/neutralisation/campagne-r33-finale.txt")', 'r33_reel = lire("docs/preuves/D333/neutralisation/r33.txt")')
s = appliquer(s, "(4)", "b8 = ok33 is True and n33 == 102", "b8 = ok33 is True and n33 == 95")
s = appliquer(s, "(4)", "lignes ✓ {n33} (attendu 102)", "lignes ✓ {n33} (attendu 95)")
s = appliquer(s, "(4)", "positif D326 : journal réel de `neutralize-r33.py --int`", "positif D333 : journal réel de `neutralize-r33.py --int`")
s = appliquer(s, "(4)", "b9 = ok33n is False and n33n == 101", "b9 = ok33n is False and n33n == 94")
s = appliquer(s, "(4)", "négatif D326 : même journal sans sa première ligne « ✓ » ⇒ {'REFUSÉ' if not ok33n else 'ACCEPTÉ'} (attendu REFUSÉ) — lignes ✓ {n33n} (attendu 101)", "négatif D333 : même journal sans sa première ligne « ✓ » ⇒ {'REFUSÉ' if not ok33n else 'ACCEPTÉ'} (attendu REFUSÉ) — lignes ✓ {n33n} (attendu 94)")
s = appliquer(s, "(4)", 'b12 = HARNAIS["r33"]["verrou"] is True and HARNAIS["r32"]["verrou"] is False and HARNAIS["r33"]["n"] == 102 and HARNAIS["r32"]["n"] == 65',
              'b12 = HARNAIS["r33"]["verrou"] is True and HARNAIS["r32"]["verrou"] is False and HARNAIS["r33"]["n"] == 95 and HARNAIS["r32"]["n"] == 65')
s = appliquer(s, "(4)", "r33 {HARNAIS['r33']['n']} cibles (attendu 102), verrouillé par --int", "r33 {HARNAIS['r33']['n']} cibles (attendu 95), verrouillé par --int")
NOUVEAUX = '''
# [D334 (4)] six bras de plus : r37, r38, r39 — un journal RÉEL accepté, le même amputé d'une ligne « ✓ » refusé.
bras_neufs = []
for _nom, _chemin, _n in (("r37", "docs/preuves/D332/neutralisation/r37.txt", 21), ("r38", "docs/preuves/D333/neutralisation/r38.txt", 46), ("r39", "docs/preuves/D333/neutralisation/r39.txt", 51)):
    _reel = lire(_chemin)
    _ok, _nj, _ko, _nm = lecture_generique(_nom, _reel)
    _b_pos = _ok is True and _nj == _n and HARNAIS[_nom]["n"] == _n
    print(f"  {'✓' if _b_pos else '✗'} positif {_chemin.split('/')[2]} : journal réel de `neutralize-{_nom}.py` ⇒ {'ACCEPTÉ' if _ok else 'REFUSÉ'} (attendu ACCEPTÉ) — lignes ✓ {_nj} (attendu {_n}), cibles déclarées {HARNAIS[_nom]['n']}, ✗ {_ko}, non mesurées {_nm}")
    _lignes = _reel.splitlines()
    _i = next(i for i, l in enumerate(_lignes) if l.startswith("✓ "))
    _ok_n, _nj_n, _k, _m = lecture_generique(_nom, "\\n".join(_lignes[:_i] + _lignes[_i + 1:]))
    _b_neg = _ok_n is False and _nj_n == _n - 1
    print(f"  {'✓' if _b_neg else '✗'} négatif {_chemin.split('/')[2]} : même journal sans sa première ligne « ✓ » ⇒ {'REFUSÉ' if not _ok_n else 'ACCEPTÉ'} (attendu REFUSÉ) — lignes ✓ {_nj_n} (attendu {_n - 1})")
    bras_neufs += [_b_pos, _b_neg]
b13 = all(bras_neufs) and len(bras_neufs) == 6 and HARNAIS["r39"]["verrou"] is True and HARNAIS["r37"]["verrou"] is False and HARNAIS["r38"]["verrou"] is False
print(f"  {'✓' if b13 else '✗'} déclaré : r37 {HARNAIS['r37']['n']} (attendu 21), r38 {HARNAIS['r38']['n']} (attendu 46), r39 {HARNAIS['r39']['n']} (attendu 51, verrouillé par --int)")
'''
s = appliquer(s, "(4)", "if not all((b1, b2, b3, b4, b5, b6, b7, b8, b9, b10, b11, b12)):", NOUVEAUX.lstrip("\n") + "if not all((b1, b2, b3, b4, b5, b6, b7, b8, b9, b10, b11, b12, b13)):")
open("docs/preuves/D334/outils/lire-campagnes.py", "w", encoding="utf-8", newline="\n").write(s)
compile(s, "lire-campagnes.py", "exec")
print("lire-campagnes.py :", compte)

# ───────────────────────────── verser.py
v = open("docs/preuves/D330/outils/verser.py", encoding="utf-8", newline="").read()
assert "\r" not in v
n_d330 = len(re.findall(r"D330", v))
print("verser.py : occurrences de D330 avant :", n_d330, [m.start() for m in re.finditer("D330", v)][:10])
