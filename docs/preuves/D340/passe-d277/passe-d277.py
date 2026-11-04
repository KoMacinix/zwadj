#!/usr/bin/env python3
"""D340 — la passe D277 des DEUX SENS sur les trois fichiers d'autorité (texte APLATI, jamais ligne à ligne : D294).
Sens 1 : les affirmations que ce lot INVALIDE. Sens 2 (D287) : les PERMISSIONS dont la condition vient de changer.
Pour chaque motif : le NOMBRE d'occurrences par fichier et, pour chacune, 70 caractères de contexte de part et d'autre (D275 : jamais un compte sans son contexte).
Calibrage : un motif connu présent doit rendre > 0 ; un motif fabriqué doit rendre 0 — avant toute lecture.
Usage : python3 docs/preuves/D340/passe-d277/passe-d277.py <fichier-sortie> (depuis la RACINE du dépôt)
Pièce D340 : jouée UNE fois AVANT les écritures de clôture (sortie-avant.txt) et UNE fois APRÈS (sortie-apres.txt).
Instrument d'origine : docs/preuves/D338/passe-d277/passe-d277.py (même squelette ; motifs propres à ce lot).
"""
import re
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

FICHIERS = ["ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md", "AGENTS.md"]
TEXTE = {f: re.sub(r"\s+", " ", open(f, encoding="utf-8", newline="").read()) for f in FICHIERS}

SENS1 = [
    ("« RANG 44 : EN ATTENTE D'ARBITRAGE DE KO »", r"RANG 44 : EN ATTENTE D'ARBITRAGE DE KO"),
    ("L36-3 « pas arbitré » / « candidat proposé »", r"(?:L36-3[^.]{0,200}pas arbitré|candidat[^.]{0,120}L36-3)"),
    ("S-83 à S-97 « à ratifier » (S-83 à S-96 ratifiées, S-97 confirmée)", r"S-83 à S-9[67][^.]{0,80}(?:à ratifier|A RATIFIER|à RATIFIER|À RATIFIER)"),
    ("« la condition de clôture du rang 43 est OUVERTE » (levée)", r"condition de clôture du rang 43[^.]{0,40}(?:OUVERTE|ouverte)"),
    ("« la base de développement de Ko n'a PAS la migration » (Ko a joué le geste 0)", r"base de développement de Ko n'a PAS la migration"),
    ("« à confirmer par Ko (S-97) » (S-97 confirmée par R-2) — défaut de la 1re version : le motif cherchait S-97 AVANT « à confirmer », la phrase les écrit dans l'autre ordre", r"à confirmer par Ko \(S-97\)"),
    ("« les six gestes de Ko … » du rang 43 « à jouer »", r"(?:six|7|sept) gestes de Ko[^.]{0,120}(?:à jouer|restent à jouer|OUVERTE)"),
    ("« aucun lot ne s'ouvre sans l'arbitrage de Ko »", r"[Aa]ucun lot ne s'ouvre sans l'arbitrage de Ko"),
    ("« rang suivant : en attente d'arbitrage de Ko » (forme de D284)", r"rang suivant : en attente d'arbitrage de Ko"),
]
SENS2 = [
    ("« un lot de code PEUT s'ouvrir »", r"un lot de code PEUT s'ouvrir"),
    ("« rang 44 » et ouverture / arbitrage", r"[Rr]ang 44[^.]{0,120}(?:ouvr|arbitr)"),
    ("« L36-3 » et ouvrir / démarrer / coder", r"L36-3[^.]{0,120}(?:s'ouvre|peut s'ouvrir|ouvrable|coder|démarr)"),
    ("« cinq lots de code non certifiés sont tenables »", r"cinq lots de code non certifiés sont tenables"),
    ("« L'ARBITRAGE DU RANG APPARTIENT À KO » / « la session ne choisit donc pas le rang suivant » (changé par la délégation du 02/11)", r"(?:L'ARBITRAGE DU RANG APPARTIENT À KO|la session ne choisit donc pas le rang suivant)"),
    ("« chaque lot appartient à un rang que Ko arbitre » (D302)", r"[Cc]haque lot appartient à un rang que Ko arbitre"),
    ("« quatre écritures de cet ordre, aucune par une session »", r"quatre écritures de cet ordre, aucune par une session"),
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
