#!/usr/bin/env python3
"""D343 — la passe D277 des DEUX SENS sur les trois fichiers d'autorité (texte APLATI, jamais ligne à ligne : D294).
Sens 1 : les affirmations que ce lot INVALIDE. Sens 2 (D287) : les PERMISSIONS dont la condition vient de changer.
Pour chaque motif : le NOMBRE d'occurrences par fichier et, pour chacune, 70 caractères de contexte de part et d'autre (D275 : jamais un compte sans son contexte).
Calibrage : un motif connu présent doit rendre > 0 ; un motif fabriqué doit rendre 0 — avant toute lecture (D286 : deux bras, ABANDON si un cas manque son verdict).
Usage : python3 docs/preuves/D343/passe-d277/passe-d277.py <fichier-sortie> (depuis la RACINE du dépôt)
Pièce D343 : jouée UNE fois AVANT les écritures de clôture (sortie-avant.txt) et UNE fois APRÈS (sortie-apres.txt).
Instrument d'origine : docs/preuves/D342/passe-d277/passe-d277.py (même squelette ; motifs propres à ce lot). Recherche INSENSIBLE À LA CASSE.
Archivé comme PREUVE (D291), jamais promu en instrument.
"""
import re
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

FICHIERS = ["ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md", "AGENTS.md"]
TEXTE = {f: re.sub(r"\s+", " ", open(f, encoding="utf-8", newline="").read()) for f in FICHIERS}

SENS1 = [
    ("« RANG 45 : OUVERT » / « TOUJOURS OUVERT » (le rang 45 est CLOS par D343)", r"RANG 45 : (?:TOUJOURS )?OUVERT"),
    ("« FUSIONNÉE EN LOCAL, NON POUSSÉE » / « rien n'est poussé » (la fusion est poussée par D343)", r"FUSIONNÉE EN LOCAL, NON POUSSÉE|RIEN n'est poussé|rien n'est poussé sur `?main`?"),
    ("« compteur POUR MÉMOIRE QUATRE » (QUATRE → DIX-HUIT → DIX-NEUF à la clôture de D343)", r"POUR MÉMOIRE (?:\*\*)?QUATRE"),
    ("« DIX-HUIT » (le compteur arrive à DIX-NEUF avec D343)", r"DIX-HUIT"),
    ("« test:e2e ROUGE » / « ROUGE aux deux passes » (l'e2e est verte : deux passes consécutives, D343)", r"test:e2e\W{0,4}ROUGE|ROUGE aux deux passes"),
    ("« D265 … cause encore INCONNUE » / « DISPARU, PAS EXPLIQUÉ » / « la cause reste inconnue » (la cause est NOMMÉE par D343)", r"D265[^.]{0,200}(?:cause (?:encore )?INCONNUE|DISPARU, PAS EXPLIQUÉ|la cause reste inconnue)|fetch failed[^.]{0,120}(?:cause (?:encore )?INCONNUE|DISPARU)"),
    ("« ON NE CORRIGE PAS UNE PANNE QU'ON N'A PAS NOMMÉE » (le harnais ne le dit plus : elle est nommée)", r"ON NE CORRIGE PAS UNE PANNE QU'ON N'A PAS NOMM"),
    ("« L'enquête sur D265 sera un lot à part, avant le lancement. Elle bloque le retour de la spec » (l'enquête est faite)", r"enquête sur D265 sera un lot à part"),
    ("« son retour dans la suite attend la cause de D265 » (la cause est nommée)", r"retour[^.]{0,80}attend la cause de D265"),
    ("« HORS DE LA SUITE » pour la spec du rang 32 / du lien (elles peuvent revenir)", r"HORS DE LA SUITE"),
    ("« La suite livrée reste fragile sur r25-lien-connexion »", r"suite livrée reste fragile sur `?r25-lien-connexion"),
    ("« quatre décisions prises seul » (énumérées à la section D342 par D343)", r"quatre décisions prises seul"),
    ("« RANG 46 : EN ATTENTE » (écrit à la clôture de D343 ; compté pour contrôle)", r"RANG 46 : EN ATTENTE"),
    ("« D342 … PRIS … pas au registre » (D342 entre au registre avec D343)", r"D342[^.]{0,120}(?:n'est pas au registre|pas au registre|PRIS)"),
    ("« la fusion n'a pas eu lieu » (périmé dès D342 ; compté pour contrôle)", r"la fusion n'a pas eu lieu"),
]
SENS2 = [
    ("« L36-3a-2 » et ouvrir / coder / consigne / candidat (rang 46 : en attente de cadrage)", r"L36-3a-2[^.]{0,160}(?:s'ouvre|peut s'ouvrir|ouvrable|coder|consigne|candidat)"),
    ("« L36-3b » et ouvrir / coder / consigne", r"L36-3b[^.]{0,160}(?:s'ouvre|peut s'ouvrir|ouvrable|coder|consigne|candidat)"),
    ("« pousser » / « poussée » sur `main` et D270 / porte rouge (la poussée est faite par D343, sous des portes vertes)", r"(?:pousser|poussée)[^.]{0,120}(?:D270|porte rouge)"),
    ("« integration-45 » et supprim… (R-18 : elle n'est pas supprimée dans cette session)", r"integration-45[^.]{0,160}supprim|supprim[^.]{0,160}integration-45"),
    ("« branche front-client » et supprim… (R-18)", r"branche `?front-client`?[^.]{0,120}supprim"),
    ("« retour de la spec » / « remettre la spec » dans la suite (un lot que Ko ordonne)", r"retour de la spec|remettre la spec|La remettre"),
    ("« un lot de code PEUT s'ouvrir » / « aucun lot de code ne s'ouvre avant » (compteur DIX-NEUF pour mémoire, limite SUSPENDUE)", r"un lot de code PEUT s'ouvrir|aucun lot de code ne s'ouvre avant"),
    ("« cinq lots de code non certifiés sont tenables » (limite SUSPENDUE ; le compteur est à DIX-NEUF pour mémoire)", r"cinq lots de code non certifiés sont tenables"),
    ("« retries » et nouvelle tentative (D265 réparé : toujours AUCUNE nouvelle tentative)", r"nouvelle[s]? tentative[s]?[^.]{0,120}(?:harnais|fixture|connexion)"),
    ("« L'ARBITRAGE DU RANG APPARTIENT À KO » / « la session ne choisit donc pas le rang suivant » (délégation du 02/11)", r"(?:L'ARBITRAGE DU RANG APPARTIENT À KO|la session ne choisit donc pas le rang suivant)"),
]


def contextes(fichier: str, motif: str):
    t = TEXTE[fichier]
    return [(m.start(), t[max(0, m.start() - 70): m.end() + 70]) for m in re.finditer(motif, t, re.IGNORECASE)]


def main() -> None:
    sortie = sys.argv[1]
    out = []
    vrai = len(contextes("ZWADJ_CONTINUITE.md", r"RANG 44 : EN ATTENTE D'ARBITRAGE DE KO|RANG 45 : (?:TOUJOURS )?OUVERT"))
    faux = len(contextes("ZWADJ_CONTINUITE.md", r"RANG 9999 : (?:TOUJOURS )?OUVERT"))
    vrai2 = len(contextes("AGENTS.md", r"POUR MÉMOIRE (?:\*\*)?QUATRE|POUR MÉMOIRE TROIS → QUATRE"))
    if not (vrai > 0 and faux == 0 and vrai2 > 0):
        print(f"CALIBRAGE RATÉ : motif connu → {vrai} (attendu > 0), motif connu dans AGENTS → {vrai2} (attendu > 0), motif fabriqué → {faux} (attendu 0). ABANDON.")
        sys.exit(3)
    out.append(f"calibrage : motif connu « RANG 44/45 : … OUVERT » → {vrai} dans ZWADJ_CONTINUITE.md et « POUR MÉMOIRE … QUATRE » → {vrai2} dans AGENTS.md (> 0 attendu) ; motif fabriqué « RANG 9999… » → {faux} (0 attendu) — les deux bras tiennent.")
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
