#!/usr/bin/env python3
"""
D327 — RANG 34, RELEVÉ n° 1 : MESURER LA MISE EN PAGE DES PDF RENDUS (pièce versée ; lot DOCUMENTAIRE, aucun code du dépôt n'est touché).

POURQUOI IL EXISTE : « les colonnes, l'alignement, les lignes présentes, la référence imprimée » ne se lisent pas sur un compte rendu — ils se MESURENT sur le PDF reçu. Il lit les POSITIONS des textes
écrites par `lire-pdf.mjs` (pdf.js 4.10.38, second lecteur indépendant : `<nom>.positions.json`, x en points depuis la GAUCHE de la page, yHaut depuis le HAUT ; une A4 = 595,28 × 841,89 pt) et imprime, par
ligne visuelle, chaque fragment avec son x de début et de fin.
INSTRUMENTS ÉCARTÉS : `pdftotext -bbox-layout` — MESURÉ ABSENT : le `pdftotext` du poste est un Xpdf 4.00 (« Glyph & Cog »), qui n'a ni `-bbox` ni `-bbox-layout` (`pdftotext -h`) ; lire les images à l'œil.

USAGE, depuis la RACINE : python3 docs/preuves/D327/releve/pdf/analyser-pdf.py > docs/preuves/D327/releve/pdf/analyse-pdf.txt   (bash, jamais une redirection PowerShell : UTF-16, D298)
LECTURE SEULE sur `pages/*.positions.json` et `temoins/*.positions.json`.

CALIBRATION, deux bras par extracteur, ABANDON si un seul manque (D286) : l'analyseur de lignes — positif : deux fragments à la même hauteur rendent UNE ligne triée par x ; négatif : une liste vide rend ZÉRO
ligne ; la recherche d'un libellé sur les PDF TÉMOINS de D326 (`temoins/`, dont les faits sont CONNUS) — positif : « Prestation » est à GAUCHE de « Montant » en français (page LTR) et « الخدمة » à DROITE de
« المبلغ » en arabe (page RTL) ; négatif : un libellé absent (« ZZZZ ») n'est pas trouvé. Chaque compte s'imprime avec ce qu'il a PARCOURU (D290).
"""
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    sys.exit("à lancer depuis la racine du dépôt")

ICI = "docs/preuves/D327/releve/pdf"


def charger(chemin):
    return json.load(open(chemin, encoding="utf-8"))["pages"]


def lignes(items, tolerance=2.0):
    """[(yHaut, [(texte, x0, x1), …] triés par x0)] — les fragments NON BLANCS regroupés par ligne visuelle (yHaut à `tolerance` pt près). ⚠ Les fragments d'espaces sont ÉCARTÉS : pdf.js leur donne la largeur de
    l'espace de mise en page (jusqu'à 250 pt), et la « fin de ligne » d'un montant se lisait alors à 592 pt, hors de la zone utile (555,3) — vu sur la sortie brute. Un caractère NUL rendu par pdf.js pour une ligature
    arabe est affiché « ␀ » (une pièce versée ne porte pas d'octet NUL)."""
    groupes = []
    for it in sorted((i for i in items if i["str"].strip() != ""), key=lambda i: (i["yHaut"], i["x"])):
        if groupes and abs(groupes[-1][0] - it["yHaut"]) <= tolerance:
            groupes[-1][1].append((it["str"].replace("\x00", "␀"), it["x"], it["x"] + it["w"]))
        else:
            groupes.append([it["yHaut"], [(it["str"].replace("\x00", "␀"), it["x"], it["x"] + it["w"])]])
    return [(y, sorted(g, key=lambda e: e[1])) for y, g in groupes]


def trouver(ls, libelle):
    """(yHaut, x0, x1) de l'étendue du libellé sur UNE ligne visuelle ; None s'il n'y est pas. pdf.js rend l'arabe MOT À MOT et le français parfois par phrase : un libellé est trouvé quand
    la ligne porte un fragment égal au libellé entier, OU un fragment pour CHACUN de ses mots (l'étendue est celle de ces fragments)."""
    mots = libelle.split()
    for y, g in ls:
        entier = [(x0, x1) for t, x0, x1 in g if t.strip() == libelle]
        if entier:
            return (round(y, 1), round(entier[0][0], 1), round(entier[0][1], 1))
        parts = [(x0, x1) for w in mots for t, x0, x1 in g if t.strip() == w][: len(mots)]
        if len(mots) > 1 and all(any(t.strip() == w for t, _, _ in g) for w in mots):
            xs = [(x0, x1) for t, x0, x1 in g if t.strip() in mots]
            return (round(y, 1), round(min(a for a, _ in xs), 1), round(max(b for _, b in xs), 1))
        if len(mots) == 1 and parts:
            return (round(y, 1), round(parts[0][0], 1), round(parts[0][1], 1))
    return None


# ══ CALIBRATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════
print("== CALIBRATION — deux bras par extracteur, abandon si un seul manque")
cal = []


def bras(nom, mesure, attendu):
    ok = mesure == attendu
    cal.append(ok)
    print(f"   {'✓' if ok else '✗'} {nom} : {mesure!r} (attendu {attendu!r})")


bras("analyseur de lignes, positif : deux fragments à la même hauteur → UNE ligne triée par x",
     [[t for t, _, _ in g] for _, g in lignes([{"str": "Bonjour", "x": 200, "yHaut": 100, "w": 50}, {"str": "Allo", "x": 100, "yHaut": 100.5, "w": 40}])], [["Allo", "Bonjour"]])
bras("analyseur de lignes, négatif : aucune entrée → aucune ligne", lignes([]), [])
bras("analyseur de lignes, négatif : un fragment d'ESPACES (largeur 250) n'est pas du texte", lignes([{"str": "Total", "x": 100, "yHaut": 10, "w": 30}, {"str": "   ", "x": 130, "yHaut": 10, "w": 250}]), [(10, [("Total", 100, 130)])])
bras("analyseur de lignes, positif : un NUL de ligature est rendu « ␀ »", [[t for t, _, _ in g] for _, g in lignes([{"str": "\x00", "x": 1, "yHaut": 1, "w": 2}])], [["␀"]])
T_FR = lignes(charger(f"{ICI}/temoins/devis-fr-avec-police.positions.json")[0]["items"])
T_AR = lignes(charger(f"{ICI}/temoins/devis-ar-avec-police.positions.json")[0]["items"])
p, m = trouver(T_FR, "Prestation"), trouver(T_FR, "Montant")
bras("témoin D326 FR (page LTR) : « Prestation » à GAUCHE de « Montant »", p is not None and m is not None and p[1] < m[1], True)
p, m = trouver(T_AR, "الخدمة"), trouver(T_AR, "المبلغ")
bras("témoin D326 AR (page RTL) : « الخدمة » à DROITE de « المبلغ »", p is not None and m is not None and p[1] > m[1], True)
bras("négatif : « ZZZZ » est absent du témoin", trouver(T_FR, "ZZZZ"), None)
if not all(cal):
    sys.exit(f"CALIBRATION : {cal.count(False)} bras manqué(s) — l'instrument ne juge pas")
print(f"== calibration : {len(cal)} bras, 0 manqué\n")

# ══ LES LIBELLÉS : lus dans les catalogues (l'autorité), jamais recopiés ═══════════════════════════════════════════════
CAT = {l: json.load(open(f"packages/i18n/messages/{l}.json", encoding="utf-8"))["quote"]["document"] for l in ("fr", "ar")}

# ══ L'ANALYSE ══════════════════════════════════════════════════════════════════════════════════════════════════════════
parcourus, fragments = 0, 0
print("RÉSUMÉ (x en points ; début = x0 du fragment, fin = x1) — le détail ligne à ligne suit, par PDF\n")
details = []
resume = []
for cas, nb_lignes_attendu in (("A", 0), ("B", 2), ("C", 3)):
    for lang in ("fr", "ar"):
        chemin = f"{ICI}/pages/devis-{cas}-{lang}.positions.json"
        pages = charger(chemin)
        assert len(pages) == 1, f"{chemin} : {len(pages)} pages (attendu 1)"
        pg = pages[0]
        parcourus += 1
        fragments += len(pg["items"])
        L = CAT[lang]
        ls = lignes(pg["items"])
        details.append(f"══ devis {cas} · {lang} · {chemin} — 1 page, {pg['largeur']} × {pg['hauteur']} pt, {len(pg['items'])} fragments, {len(ls)} lignes visuelles")
        for y, g in ls:
            details.append(f"   y={y:7.1f} │ " + " ".join(f"[{t} {x0:.0f}–{x1:.0f}]" for t, x0, x1 in g))
        details.append("")
        en = {k: trouver(ls, L[c]) for k, c in (("Prestation", "service"), ("Qté", "quantity"), ("Montant", "amount"))}
        rec = {k: trouver(ls, L[c]) for k, c in (("Location", "basePrice"), ("Prestations", "servicesTotal"), ("Total", "total"), ("Acompte", "deposit"))}
        assert all(v is not None for v in en.values()), f"{chemin} : en-tête introuvable {en}"
        assert all(v is not None for v in rec.values()), f"{chemin} : libellé de récapitulatif introuvable {rec}"
        y_en, y_rec = en["Prestation"][0], rec["Location"][0]
        corps = [(y, g) for y, g in ls if y_en + 2 < y < y_rec - 2]
        # La référence : le fragment qui contient « -v » dans la ligne du sous-titre.
        ref = next((t for y, g in ls for t, _, _ in g if "-v" in t and any(ch.isdigit() for ch in t)), None)
        # Les quantités de la table : le fragment de chaque ligne du corps le plus proche de l'en-tête « Qté ».
        qtes = []
        for y, g in corps:
            c = min(g, key=lambda e: abs((e[1] + e[2]) / 2 - (en["Qté"][1] + en["Qté"][2]) / 2))
            qtes.append((c[0].strip(), round(c[1], 1), round(c[2], 1)))
        montants_corps = []
        for y, g in corps:
            c = min(g, key=lambda e: abs((e[1] + e[2]) / 2 - (en["Montant"][1] + en["Montant"][2]) / 2))
            montants_corps.append((c[0].strip(), round(c[1], 1), round(c[2], 1)))
        # Le récapitulatif : début et fin de chaque ligne (libellé + montant).
        recap_lignes = {}
        for k in rec:
            y = rec[k][0]
            g = next(gg for yy, gg in ls if abs(yy - y) <= 2)
            recap_lignes[k] = (round(min(x0 for _, x0, _ in g), 1), round(max(x1 for _, _, x1 in g), 1))
        stocke = json.load(open(f"{ICI}/sortie/devis-{cas}.stocke.json", encoding="utf-8"))
        imprimes = {}
        for k, cle in (("Location", "basePriceCents"), ("Prestations", "servicesTotalCents"), ("Total", "totalCents"), ("Acompte", "depositCents")):
            y = rec[k][0]
            g = next(gg for yy, gg in ls if abs(yy - y) <= 2)
            etendue = {t for t, a, b in g if rec[k][1] - 0.5 <= a and b <= rec[k][2] + 0.5}
            chiffres = "".join(re.findall(r"\d", "".join(t for t, _, _ in g if t not in etendue)))
            imprimes[k] = (chiffres, str(stocke[cle] // 100), chiffres == str(stocke[cle] // 100))
        assert all(v[2] for v in imprimes.values()), f"{chemin} : un montant imprimé n'est pas la valeur stockée : {imprimes}"
        resume.append(
            f"devis {cas} · {lang} : montants imprimés (chiffres) = valeurs STOCKÉES en dinars (centimes / 100) : " + " · ".join(f"{k} {v[0]}" for k, v in imprimes.items()) + " (4 sur 4 égaux) ; "
            f"{len(corps)} ligne(s) de table (attendu {nb_lignes_attendu}) · en-têtes x0–x1 : "
            + " · ".join(f"{k} {v[1]}–{v[2]}" for k, v in en.items())
            + f" · quantités (texte, x0, x1) : {qtes} · montants de la table : {montants_corps}"
            + f" · récapitulatif (début–fin de ligne) : {recap_lignes} · référence imprimée : « {ref} »"
        )
        assert len(corps) == nb_lignes_attendu, f"{chemin} : {len(corps)} lignes de table au lieu de {nb_lignes_attendu} : l'extraction ne dit pas ce qu'on croit"
for r in resume:
    print(r)
    print()
print("\n== DÉTAIL, PDF par PDF\n")
print("\n".join(details))
print(f"== PDF parcourus : {parcourus} (attendu 6) · fragments parcourus : {fragments}")
if parcourus != 6:
    sys.exit("un compte de PDF qui n'est pas celui attendu : l'instrument ne conclut pas")
