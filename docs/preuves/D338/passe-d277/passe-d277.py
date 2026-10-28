#!/usr/bin/env python3
"""D338 — la passe D277 des DEUX SENS sur les trois fichiers d'autorité (texte APLATI, jamais ligne à ligne : D294).
Sens 1 : les affirmations que ce lot INVALIDE. Sens 2 (D287) : les PERMISSIONS dont la condition vient de changer.
Pour chaque motif : le NOMBRE d'occurrences par fichier et, pour chacune, 70 caractères de contexte de part et d'autre (D275 : jamais un compte sans son contexte).
Calibrage : un motif connu présent doit rendre > 0 ; un motif fabriqué doit rendre 0 — avant toute lecture.
Usage : python3 docs/preuves/D338/passe-d277/passe-d277.py <fichier-sortie> (depuis la RACINE du dépôt)
Pièce D338 : jouée UNE fois AVANT les écritures de clôture (sortie-avant.txt) et UNE fois APRÈS (sortie-apres.txt) ; le motif « NB-6 … si Ko le place là » a été ajouté avant les deux.
"""
import re
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

FICHIERS = ["ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md", "AGENTS.md"]
TEXTE = {f: re.sub(r"\s+", " ", open(f, encoding="utf-8", newline="").read()) for f in FICHIERS}

SENS1 = [
    ("RANG 43 : EN ATTENTE D'ARBITRAGE DE KO", r"RANG 43 : EN ATTENTE D'ARBITRAGE DE KO"),
    ("L36-2 « pas arbitré » / « candidat proposé »", r"(?:L36-2[^.]{0,200}pas arbitré|candidat[^.]{0,80}L36-2)"),
    ("S-68 à S-75 « à ratifier »", r"S-68 à S-75[^.]{0,60}(?:à ratifier|A RATIFIER|à RATIFIER)"),
    ("les gestes de Ko pour L36-1 « restent à jouer »", r"gestes de Ko[^.]{0,120}(?:restent à jouer|à jouer)"),
    ("« NB-6 y entre si Ko le place là » (DR4, section 5, entrée L36-2)", r"NB-6[^.]{0,40}si Ko le place là"),
    ("« le lot est clos sur le code, pas sur ce regard » (rang 42)", r"clos \*{0,2}sur le code\*{0,2}[^.]{0,40}pas sur ce regard"),
]
SENS2 = [
    ("« un lot de code PEUT s'ouvrir »", r"un lot de code PEUT s'ouvrir"),
    ("« rang 43 » et ouverture / arbitrage", r"[Rr]ang 43[^.]{0,120}(?:ouvr|arbitr)"),
    ("« L36-2 » et ouvrir / démarrer / coder", r"L36-2[^.]{0,120}(?:s'ouvre|peut s'ouvrir|ouvrable|coder)"),
    ("« cinq lots de code non certifiés sont tenables »", r"cinq lots de code non certifiés sont tenables"),
]


def contextes(fichier: str, motif: str):
    t = TEXTE[fichier]
    return [(m.start(), t[max(0, m.start() - 70): m.end() + 70]) for m in re.finditer(motif, t)]


def main() -> None:
    sortie = sys.argv[1]
    out = []
    # CALIBRAGE
    vrai = len(contextes("ZWADJ_CONTINUITE.md", r"RANG 43 : EN ATTENTE D'ARBITRAGE DE KO"))
    faux = len(contextes("ZWADJ_CONTINUITE.md", r"RANG 9999 : EN ATTENTE D'ARBITRAGE DE KO"))
    if not (vrai > 0 and faux == 0):
        print(f"CALIBRAGE RATÉ : motif connu → {vrai} (attendu > 0), motif fabriqué → {faux} (attendu 0). ABANDON.")
        sys.exit(3)
    out.append(f"calibrage : motif connu « RANG 43 : EN ATTENTE… » → {vrai} (> 0 attendu) ; motif fabriqué « RANG 9999… » → {faux} (0 attendu) — les deux bras tiennent.")
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
    texte = "\n".join(out) + "\n"
    open(sortie, "w", encoding="utf-8", newline="\n").write(texte)
    print(f"écrit : {sortie} ({len(texte)} caractères, {len(out)} lignes)")


if __name__ == "__main__":
    main()
