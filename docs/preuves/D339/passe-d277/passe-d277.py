#!/usr/bin/env python3
"""D339 — la passe D277 des DEUX SENS sur les trois fichiers d'autorité (texte APLATI, jamais ligne à ligne : D294).
Sens 1 : les affirmations que ce lot INVALIDE. Sens 2 (D287) : les PERMISSIONS dont la condition vient de changer.
Pour chaque motif : le NOMBRE d'occurrences par fichier et, pour chacune, 70 caractères de contexte de part et d'autre (D275 : jamais un compte sans son contexte) ;
les motifs à ZÉRO sont imprimés sous un intitulé qui les nomme (D295 : un zéro est une hypothèse à vérifier, jamais une absence constatée).
Calibrage : un motif connu présent doit rendre > 0 ; un motif fabriqué doit rendre 0 — avant toute lecture.
Usage : python3 docs/preuves/D339/passe-d277/passe-d277.py <fichier-sortie> (depuis la RACINE du dépôt)
Pièce D339 : jouée UNE fois AVANT les écritures de clôture (sortie-avant.txt) et UNE fois APRÈS (sortie-apres.txt). Procédure archivée comme PREUVE, jamais promue en instrument (D291) ;
dérivée de docs/preuves/D338/passe-d277/passe-d277.py : seuls les motifs, le motif de calibrage et l'intitulé des motifs à zéro changent.
"""
import re
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

FICHIERS = ["ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md", "AGENTS.md"]
TEXTE = {f: re.sub(r"\s+", " ", open(f, encoding="utf-8", newline="").read()) for f in FICHIERS}

SENS1 = [
    ("« RANG 43 : OUVERT »", r"RANG 43 : OUVERT"),
    ("« EN ATTENTE DES RÉPONSES DE KO »", r"EN ATTENTE DES RÉPONSES DE KO"),
    ("« aucun code de L36-2 ne s'ouvre » (avant les réponses)", r"aucun code de L36-2 ne s'ouvre"),
    ("« CADRAGE COMMITÉ, AUCUN CODE » / « règle d'arrêt a JOUÉ »", r"(?:CADRAGE COMMITÉ, AUCUN CODE|règle d'arrêt[^.]{0,60}(?:a joué|A JOUÉ))"),
    ("« RANG 44 : EN ATTENTE D'ARBITRAGE DE KO » (promesse de l'écrire à la clôture)", r"RANG 44 : EN ATTENTE D'ARBITRAGE DE KO"),
    ("compteur « POUR MÉMOIRE DEUX » (à lire un par un : daté, ou courant ?)", r"POUR MÉMOIRE \*{0,2}DEUX"),
    ("S-76 à S-82 « à ratifier »", r"S-76 à S-82[^.]{0,80}(?:à ratifier|À RATIFIER|A RATIFIER)"),
    ("D265 « la spec reste hors de la suite » / « hors de la suite »", r"hors de la suite"),
    ("« le lot est clos sur le code, pas sur ce regard » (condition de clôture)", r"clos \*{0,2}sur le code\*{0,2}[^.]{0,40}pas sur ce regard"),
]
SENS2 = [
    ("« un lot de code PEUT s'ouvrir »", r"un lot de code PEUT s'ouvrir"),
    ("« rang 44 » et ouvrir / arbitrer / candidat", r"[Rr]ang 44[^.]{0,120}(?:ouvr|arbitr|candidat)"),
    ("« L36-3 » et ouvrir / coder / arbitrer", r"L36-3[^.]{0,120}(?:s'ouvre|peut s'ouvrir|ouvrable|coder|arbitr)"),
    ("« TROIS » … « aucun lot de code ne s'ouvre »", r"TROIS[^.]{0,200}aucun lot de code ne s'ouvre"),
    ("« cinq lots de code non certifiés sont tenables »", r"cinq lots de code non certifiés sont tenables"),
    ("« certification immédiate » (lot d'un chemin d'identité)", r"certification immédiate"),
]


def contextes(fichier: str, motif: str):
    t = TEXTE[fichier]
    return [(m.start(), t[max(0, m.start() - 70): m.end() + 70]) for m in re.finditer(motif, t)]


def main() -> None:
    sortie = sys.argv[1]
    out = []
    # CALIBRAGE : un motif connu présent (la clôture du rang 42), un motif fabriqué absent.
    vrai = len(contextes("ZWADJ_CONTINUITE.md", r"RANG 42 : CLOS SUR LE CODE"))
    faux = len(contextes("ZWADJ_CONTINUITE.md", r"RANG 9999 : CLOS SUR LE CODE"))
    if not (vrai > 0 and faux == 0):
        print(f"CALIBRAGE RATÉ : motif connu → {vrai} (attendu > 0), motif fabriqué → {faux} (attendu 0). ABANDON.")
        sys.exit(3)
    out.append(f"calibrage : motif connu « RANG 42 : CLOS SUR LE CODE » → {vrai} (> 0 attendu) ; motif fabriqué « RANG 9999… » → {faux} (0 attendu) — les deux bras tiennent.")
    out.append("fichiers aplatis parcourus : " + " · ".join(f"{f} ({len(TEXTE[f])} caractères)" for f in FICHIERS))
    zeros = []
    for titre, groupe in (("SENS 1 — ce que le lot INVALIDE", SENS1), ("SENS 2 (D287) — ce que le lot REND PERMIS, ou dont la condition change", SENS2)):
        out.append("")
        out.append(f"══ {titre}")
        for nom, motif in groupe:
            par_fichier = {f: contextes(f, motif) for f in FICHIERS}
            total = sum(len(v) for v in par_fichier.values())
            if total == 0:
                zeros.append(nom)
            out.append(f"· {nom} — {total} occurrence(s) : " + ", ".join(f"{f.split('.')[0]}={len(v)}" for f, v in par_fichier.items()))
            for f, lst in par_fichier.items():
                for i, (pos, ctx) in enumerate(lst, 1):
                    out.append(f"    [{f.split('.')[0]} #{i} @{pos}] …{ctx}…")
    out.append("")
    out.append(f"══ MOTIFS À ZÉRO — une hypothèse à vérifier, pas une absence constatée (D295) : {len(zeros)}")
    for nom in zeros:
        out.append(f"  · {nom}")
    texte = "\n".join(out) + "\n"
    open(sortie, "w", encoding="utf-8", newline="\n").write(texte)
    print(f"écrit : {sortie} ({len(texte)} caractères, {len(out)} lignes · {len(SENS1) + len(SENS2)} motifs dont {len(zeros)} à zéro)")


if __name__ == "__main__":
    main()
