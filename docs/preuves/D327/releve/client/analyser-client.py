#!/usr/bin/env python3
"""
D327 — RANG 34, RELEVÉ n° 2 : QUE LIT LE PDF POUR LE NOM DU CLIENT ? (pièce versée ; lot DOCUMENTAIRE).

Il lit les positions des textes de `pages/*.positions.json` (pdf.js 4.10.38, `docs/preuves/D327/releve/pdf/lire-pdf.mjs`) et imprime la VALEUR du champ « Client » de chaque PDF : le fragment placé sous le libellé
« Client » (« الزبون » en arabe), dans la même colonne. Les six PDF sont ceux du parcours sur place joué dans un navigateur (`walkin-flux.capture.ts`) : deux PDF téléchargés À LA REMISE, avant toute
conclusion, et les quatre PDF relus APRÈS la conclusion (le contact est alors enregistré sur la réservation).

USAGE, depuis la RACINE : python3 docs/preuves/D327/releve/client/analyser-client.py > docs/preuves/D327/releve/client/analyse-client.txt   (bash, jamais PowerShell : D298)

CALIBRATION, deux bras, ABANDON si un seul manque (D286) : POSITIF — le PDF TÉMOIN de D326 (`docs/preuves/D327/releve/pdf/temoins/devis-fr-avec-police.positions.json`), dont le client est un compte réel au nom
arabe : l'extracteur doit y lire UN NOM (une valeur qui n'est pas « — ») ; NÉGATIF — le même extracteur sur un devis SANS client du relevé n° 1 (`pdf/pages/devis-A-fr.positions.json`) doit y lire « — ».
Chaque lecture s'imprime avec le nombre de fragments parcourus (D290).
"""
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    sys.exit("à lancer depuis la racine du dépôt")
AR_LABEL = json.load(open("packages/i18n/messages/ar.json", encoding="utf-8"))["quote"]["document"]["client"]
FR_LABEL = json.load(open("packages/i18n/messages/fr.json", encoding="utf-8"))["quote"]["document"]["client"]


def champ_client(chemin, etiquette):
    page = json.load(open(chemin, encoding="utf-8"))["pages"][0]
    items = page["items"]
    lab = next((i for i in items if i["str"].strip() == etiquette), None)
    if lab is None:
        return None, len(items)
    rtl = etiquette == AR_LABEL
    valeurs = [i["str"].strip() for i in sorted(items, key=lambda i: i["x"]) if 8 < i["yHaut"] - lab["yHaut"] < 24 and ((i["x"] > 290) if rtl else (i["x"] < 290))]
    return " ".join(v for v in valeurs if v), len(items)


print("== CALIBRATION")
t_pos, n1 = champ_client("docs/preuves/D327/releve/pdf/temoins/devis-fr-avec-police.positions.json", FR_LABEL)
t_neg, n2 = champ_client("docs/preuves/D327/releve/pdf/pages/devis-A-fr.positions.json", FR_LABEL)
cal = [(t_pos is not None and t_pos != "—" and t_pos != "", f"positif · le PDF témoin de D326 porte un NOM ({n1} fragments parcourus)"), (t_neg == "—", f"négatif · un devis sans client lit « — » ({n2} fragments parcourus)")]
for ok, nom in cal:
    print(f"   {'✓' if ok else '✗'} {nom}")
if not all(ok for ok, _ in cal):
    sys.exit("CALIBRATION : un bras manqué — l'instrument ne juge pas")
print("== calibration : 2 bras, 0 manqué\n")

D = "docs/preuves/D327/releve/client/pages"
total = 0
for nom, lab in (
    ("pdf-telecharge-PRINT-standby-avant-conclusion", FR_LABEL),
    ("pdf-apres-conclusion-PRINT-standby-fr", FR_LABEL),
    ("pdf-apres-conclusion-PRINT-standby-ar", AR_LABEL),
    ("pdf-telecharge-SMS-lock-avant-conclusion", FR_LABEL),
    ("pdf-apres-conclusion-SMS-lock-fr", FR_LABEL),
    ("pdf-apres-conclusion-SMS-lock-ar", AR_LABEL),
):
    valeur, n = champ_client(f"{D}/{nom}.positions.json", lab)
    total += 1
    print(f"{nom} : champ « {lab} » = « {valeur} » ({n} fragments parcourus)")
print(f"\n== PDF lus : {total} (attendu 6)")
