#!/usr/bin/env python3
"""D342 — la passe D277 des DEUX SENS sur les trois fichiers d'autorité (texte APLATI, jamais ligne à ligne : D294).
Sens 1 : les affirmations que ce lot INVALIDE. Sens 2 (D287) : les PERMISSIONS dont la condition vient de changer.
Pour chaque motif : le NOMBRE d'occurrences par fichier et, pour chacune, 70 caractères de contexte de part et d'autre (D275 : jamais un compte sans son contexte).
Calibrage : un motif connu présent doit rendre > 0 ; un motif fabriqué doit rendre 0 — avant toute lecture (D286 : deux bras, ABANDON si un cas manque son verdict).
Usage : python3 docs/preuves/D342/passe-d277/passe-d277.py <fichier-sortie> (depuis la RACINE du dépôt)
Pièce D342 : jouée UNE fois AVANT les écritures de clôture (sortie-avant.txt) et UNE fois APRÈS (sortie-apres.txt).
Instrument d'origine : docs/preuves/D341/passe-d277/passe-d277.py (même squelette ; motifs propres à ce lot). Recherche INSENSIBLE À LA CASSE (le défaut n° 1 de D341).
Archivé comme PREUVE (D291), jamais promu en instrument.
"""
import re
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

FICHIERS = ["ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md", "AGENTS.md"]
TEXTE = {f: re.sub(r"\s+", " ", open(f, encoding="utf-8", newline="").read()) for f in FICHIERS}

SENS1 = [
    ("« RANG 45 : EN ATTENTE DE CADRAGE DU RELECTEUR » (le rang 45 est CLOS ; l'attente est celle du rang 46)", r"RANG 45 : EN ATTENTE DE CADRAGE DU RELECTEUR"),
    ("« compteur POUR MÉMOIRE QUATRE » (QUATRE → DIX-HUIT à la clôture de D342)", r"POUR MÉMOIRE (?:\*\*)?QUATRE"),
    ("« candidat désigné … L36-3a-2 » (du rang 45 hier, du rang 46 aujourd'hui)", r"candidat[^.]{0,60}désigné[^.]{0,80}L36-3a-2|L36-3a-2[^.]{0,80}candidat désigné"),
    ("R-7 (a) « Retirer aussi la clé de SEARCH_VARIANT_PARAMS » (prémisse fausse : la clé n'y a jamais été)", r"Retirer aussi la cl[ée] de `?SEARCH_VARIANT_PARAMS"),
    ("R-7 (b) « `guide` et `maxPriceCents` entrent dans `isVariant` » (D230 ; `maxPriceCents` n'y est jamais entré)", r"`guide` (?:\*\*)?et(?:\*\*)? `maxPriceCents` entrent dans `isVariant`"),
    ("« Lot ③ » non livré / non livrable (livré par FC-8)", r"Lot ③[^.]{0,140}(?:NON livr|non livr|NON LIVR)"),
    ("« D229 / D230 / D231 … NON LIVRÉ » (l'assistant en mode de /salles, ?guide= et l'accueil à trois champs sont livrés par FC-8)", r"D2(?:29|3[01]).{0,200}NON LIVRÉ"),
    ("« D228 … DÉFAUT ACTIF » ou « NON livré » (le repli maxPriceCents est retiré par FC-7)", r"D228[^.]{0,200}(?:DÉFAUT ACTIF|NON livré)"),
    ("« HTML initial … VIDE » des 404 (FC-11 : prémisse de « la correction connue » fausse, l'état est gardé)", r"HTML initial[^.]{0,140}VIDE"),
    ("« le week-end … DEUX fois » (FC-5 : une seule définition, dans @zwadj/types)", r"[Ww]eek-end[^.]{0,100}(?:DEUX fois|défini deux fois)"),
    ("« LA SUITE CLIENT ÉMET DES act(…) » (FC-9)", r"LA SUITE CLIENT ÉMET DES"),
    ("« la fiche salle FRANÇAISE déborde » à 360 px (FC-2)", r"fiche salle FRANÇAISE déborde"),
    ("« NE PEUT PAS CHOISIR UNE PRESTATION PER_UNIT NI TIERED » (FP-1)", r"NE PEUT PAS CHOISIR UNE PRESTATION PER_UNIT NI TIERED"),
    ("« Le jour déjà demandé (REQUESTED) » (FC-4 : sélectionnable avec un avis)", r"Le jour déjà demandé \(`?REQUESTED`?\)"),
    ("« se formatent en `ar-DZ` » (FC-6 : tenu en partie, les montants d'un devis restent en français — R-8)", r"se formatent en `ar-DZ`"),
    ("« Données structurées schema.org » (FC-10)", r"[Dd]onnées structurées schema\.org|schema\.org structured data"),
    ("« Magazine gallery (5 photos) + lightbox » (FC-12 : la visionneuse est faite, la mise en page à cinq photos non)", r"Magazine gallery"),
    ("« FP-1 … session adverse … due » (R-4 : elle n'est pas due, sessions B en pause)", r"session adverse[^.]{0,120}FP-1|FP-1[^.]{0,120}session adverse"),
]
SENS2 = [
    ("« L36-3a-2 » et ouvrir / coder / consigne", r"L36-3a-2[^.]{0,160}(?:s'ouvre|peut s'ouvrir|ouvrable|coder|consigne|candidat)"),
    ("« L36-3b » et ouvrir / coder / consigne", r"L36-3b[^.]{0,160}(?:s'ouvre|peut s'ouvrir|ouvrable|coder|consigne|candidat)"),
    ("« RANG 46 » et ouvrir / arbitrer / cadrer (écrit par D342)", r"RANG 46[^.]{0,160}(?:ouvr|arbitr|cadr)"),
    ("« PRÊT À INTÉGRER » / « l'intégration est à Ko » (la branche est intégrée par D342)", r"PRÊT À INTÉGRER|l'intégration est à Ko"),
    ("« un lot par session » et exception (celle de la session cloud est CONSOMMÉE — 1 b)", r"un lot par session[^.]{0,200}(?:exception|EXCEPTION)|(?:exception|EXCEPTION)[^.]{0,200}un lot par session"),
    ("« cinq lots de code non certifiés sont tenables » (limite SUSPENDUE ; le compteur est à DIX-HUIT pour mémoire)", r"cinq lots de code non certifiés sont tenables"),
    ("« branche front-client » et supprimer / supprimée (consigne § 5 : elle n'est pas supprimée dans cette session)", r"branche `?front-client`?[^.]{0,120}(?:supprim)"),
    ("« L'ARBITRAGE DU RANG APPARTIENT À KO » / « la session ne choisit donc pas le rang suivant » (délégation du 02/11)", r"(?:L'ARBITRAGE DU RANG APPARTIENT À KO|la session ne choisit donc pas le rang suivant)"),
]


def contextes(fichier: str, motif: str):
    t = TEXTE[fichier]
    return [(m.start(), t[max(0, m.start() - 70): m.end() + 70]) for m in re.finditer(motif, t, re.IGNORECASE)]


def main() -> None:
    sortie = sys.argv[1]
    out = []
    vrai = len(contextes("ZWADJ_CONTINUITE.md", r"RANG 44 : EN ATTENTE D'ARBITRAGE DE KO|RANG 45 : EN ATTENTE DE CADRAGE DU RELECTEUR"))
    faux = len(contextes("ZWADJ_CONTINUITE.md", r"RANG 9999 : EN ATTENTE DE CADRAGE DU RELECTEUR"))
    vrai2 = len(contextes("AGENTS.md", r"RANG 45 : EN ATTENTE DE CADRAGE DU RELECTEUR"))
    if not (vrai > 0 and faux == 0 and vrai2 > 0):
        print(f"CALIBRAGE RATÉ : motif connu → {vrai} (attendu > 0), motif connu dans AGENTS → {vrai2} (attendu > 0), motif fabriqué → {faux} (attendu 0). ABANDON.")
        sys.exit(3)
    out.append(f"calibrage : motif connu « RANG 44/45 : EN ATTENTE… » → {vrai} dans ZWADJ_CONTINUITE.md et {vrai2} dans AGENTS.md (> 0 attendu) ; motif fabriqué « RANG 9999… » → {faux} (0 attendu) — les deux bras tiennent.")
    out.append("fichiers aplatis parcourus : " + " · ".join(f"{f} ({len(TEXTE[f])} caractères)" for f in FICHIERS))
    for titre, groupe in (("SENS 1 — ce que le lot INVALIDE", SENS1), ("SENS 2 (D287) — ce que le lot REND PERMIS, ou dont la condition change", SENS2)):
        out.append("")
        out.append(f"══ {titre}")
        for nom, motif in groupe:
            par_fichier = {f: contextes(f, motif) for f in FICHIERS}
            total = sum(len(v) for v in par_fichier.values())
            out.append(f"· {nom} — {total} occurrence(s) : " + ", ".join(f"{f.split('.')[0]}={len(v)}" for f, v in par_fichier.items()))
            for f, lst in par_fichier.items():
                for i, (pos, ctx) in enumerate(lst, 1):
                    out.append(f"    [{f.split('.')[0]} #{i} @{pos}] …{ctx}…")
    out.append("")
    out.append("══ MOTIFS À ZÉRO (D295 : un motif à zéro est une HYPOTHÈSE à vérifier, jamais une absence constatée) — et motifs au compte invraisemblablement haut (>= 40)")
    for titre, groupe in (("sens 1", SENS1), ("sens 2", SENS2)):
        for nom, motif in groupe:
            total = sum(len(contextes(f, motif)) for f in FICHIERS)
            if total == 0 or total >= 40:
                out.append(f"· [{titre}] {total} occurrence(s) — {nom}")
    texte = "\n".join(out) + "\n"
    open(sortie, "w", encoding="utf-8", newline="\n").write(texte)
    print(f"écrit : {sortie} ({len(texte)} caractères, {len(out)} lignes)")


if __name__ == "__main__":
    main()
