#!/usr/bin/env python3
"""D340 (phase du 04/11/2026) — la passe D277 des DEUX SENS sur les trois fichiers d'autorité (texte APLATI, jamais ligne à ligne : D294).
Sens 1 : les affirmations que la passe sur SECTEUR (tout vert) et la décision R-7 (les passes du 03/11 sont non certifiantes) INVALIDENT.
Sens 2 (D287) : les PERMISSIONS ou INTERDICTIONS dont la condition vient de changer (le push de la clôture, la lecture des portes).
Pour chaque motif : le NOMBRE d'occurrences par fichier et, pour chacune, 70 caractères de contexte de part et d'autre (D275).
Calibrage : un motif connu présent doit rendre > 0 ; un motif fabriqué doit rendre 0 — avant toute lecture.
Usage : python3 docs/preuves/D340/passe-d277-secteur/passe-d277-secteur.py <fichier-sortie> (depuis la RACINE du dépôt)
Pièce D340 : jouée UNE fois AVANT les annotations (sortie-avant.txt) et UNE fois APRÈS (sortie-apres.txt).
Instrument d'origine : docs/preuves/D340/passe-d277/passe-d277.py (même squelette ; motifs propres à cette phase).
"""
import re
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

FICHIERS = ["ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md", "AGENTS.md"]
TEXTE = {f: re.sub(r"\s+", " ", open(f, encoding="utf-8", newline="").read()) for f in FICHIERS}

SENS1 = [
    ("« Portes ROUGES » / « PORTES … ROUGES » / « DEUX ROUGES » / « DEUX PORTES ROUGES »", r"(?:Portes ROUGES|PORTES `test` ET `test:e2e` ROUGES|DEUX ROUGES|DEUX PORTES ROUGES|`test` ROUGE|portes `test` et `test:e2e` ROUGES|portes `test` et `test:e2e` rouges|deux sont rouges|LES DEUX portes sont ROUGES|les deux portes sont ROUGES)"),
    ("« NON POUSSÉE » / « commitée en LOCAL » / « commitée localement » / « en local seulement »", r"(?:NON POUSSÉE|non poussée|commitée en LOCAL|commitée en local|commitée localement|COMMITÉE LOCALEMENT|en local seulement)"),
    ("« possible régression à instruire »", r"possible régression à instruire"),
    ("« deux sur deux n'est plus un aléa »", r"deux sur deux n'est plus un aléa"),
    ("« git push » à la parole de Ko / décision de pousser", r"(?:`git push`|git push origin main)[^.]{0,80}(?:parole de Ko|Ko)|pousser \(`git push`\)"),
    ("« la règle du rejeu » citée comme décisive (49cd9f9)", r"règle du rejeu[^.]{0,120}(?:donne|commitée avant lui|écrite et commitée avant)"),
    ("« rouge » d'un lot qui interdit le push (D270) dit de CE lot", r"aucun lot ne part dans `?main`? sous une porte rouge[^.]{0,200}(?:sur batterie|ce lot|cette clôture|la clôture)"),
]
SENS2 = [
    ("« ne pas pousser » / « n'est pas poussée » / « ne pousse pas »", r"(?:ne pousse pas|n'est pas poussée|NE LA POUSSE PAS|ne la pousse pas|ne se pousse pas)"),
    ("« la clôture se pousse » / « se pousse » (R-8, branche tout vert)", r"la clôture se pousse|clôture[^.]{0,40}se pousse"),
    ("« rien n'est certifié, rien n'est poussé »", r"rien n'est certifié, rien n'est poussé"),
    ("« aucun lot de code ne s'ouvre » + L36-3 (inchangé : la note, point 3)", r"aucune ligne de code de L36-3 ne s'ouvre"),
]


def contextes(fichier: str, motif: str):
    t = TEXTE[fichier]
    return [(m.start(), t[max(0, m.start() - 70): m.end() + 70]) for m in re.finditer(motif, t)]


def main() -> None:
    sortie = sys.argv[1]
    out = []
    vrai = len(contextes("ZWADJ_CONTINUITE.md", r"RANG 43 : EN ATTENTE D'ARBITRAGE DE KO"))
    faux = len(contextes("ZWADJ_CONTINUITE.md", r"RANG 9999 : EN ATTENTE D'ARBITRAGE DE KO"))
    if not (vrai > 0 and faux == 0):
        print(f"CALIBRAGE RATÉ : motif connu → {vrai} (attendu > 0), motif fabriqué → {faux} (attendu 0). ABANDON.")
        sys.exit(3)
    out.append(f"calibrage : motif connu « RANG 43 : EN ATTENTE… » → {vrai} (> 0 attendu) ; motif fabriqué « RANG 9999… » → {faux} (0 attendu) — les deux bras tiennent.")
    out.append("fichiers aplatis parcourus : " + " · ".join(f"{f} ({len(TEXTE[f])} caractères)" for f in FICHIERS))
    for titre, groupe in (("SENS 1 — ce que la passe sur secteur et R-7 INVALIDENT", SENS1), ("SENS 2 (D287) — ce dont la condition CHANGE", SENS2)):
        out.append("")
        out.append(f"══ {titre}")
        for nom, motif in groupe:
            par_fichier = {f: contextes(f, motif) for f in FICHIERS}
            total = sum(len(v) for v in par_fichier.values())
            out.append(f"· {nom} — {total} occurrence(s) : " + ", ".join(f"{f.split('.')[0]}={len(v)}" for f, v in par_fichier.items()))
            for f, lst in par_fichier.items():
                for i, (pos, ctx) in enumerate(lst, 1):
                    out.append(f"    [{f.split('.')[0]} #{i} @{pos}] …{ctx}…")
    texte = "\n".join(out) + "\n"
    open(sortie, "w", encoding="utf-8", newline="\n").write(texte)
    print(f"écrit : {sortie} ({len(texte)} caractères, {len(out)} lignes)")


if __name__ == "__main__":
    main()
