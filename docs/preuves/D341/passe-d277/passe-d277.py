#!/usr/bin/env python3
"""D341 — la passe D277 des DEUX SENS sur les trois fichiers d'autorité (texte APLATI, jamais ligne à ligne : D294).
Sens 1 : les affirmations que ce lot INVALIDE. Sens 2 (D287) : les PERMISSIONS dont la condition vient de changer.
Pour chaque motif : le NOMBRE d'occurrences par fichier et, pour chacune, 70 caractères de contexte de part et d'autre (D275 : jamais un compte sans son contexte).
Calibrage : un motif connu présent doit rendre > 0 ; un motif fabriqué doit rendre 0 — avant toute lecture (D286 : deux bras, ABANDON si un cas manque son verdict).
Usage : python3 docs/preuves/D341/passe-d277/passe-d277.py <fichier-sortie> (depuis la RACINE du dépôt)
Pièce D341 : jouée UNE fois AVANT les écritures de clôture (sortie-avant.txt) et UNE fois APRÈS (sortie-apres.txt).
Instrument d'origine : docs/preuves/D340/passe-d277/passe-d277.py (même squelette ; motifs propres à ce lot).
Archivé comme PREUVE (D291), jamais promu en instrument.
"""
import re
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

FICHIERS = ["ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md", "AGENTS.md"]
TEXTE = {f: re.sub(r"\s+", " ", open(f, encoding="utf-8", newline="").read()) for f in FICHIERS}

SENS1 = [
    ("« OUVERT, CADRAGE POUSSÉ, RÈGLE D'ARRÊT JOUÉE » (l'état du rang 44 : le rang est CLOS SUR LE CODE)", r"OUVERT, CADRAGE POUSSÉ, RÈGLE D'ARRÊT JOUÉE"),
    ("« aucun code, aucune migration » (rang 44, D340)", r"aucun code, aucune migration"),
    ("« compteur POUR MÉMOIRE TROIS » (TROIS → QUATRE à la clôture de D341)", r"compteur POUR MÉMOIRE (?:\*\*)?TROIS"),
    ("« SIG-1 … non corrigé » (réparé au premier commit de code de D341)", r"SIG-1[^.]{0,200}(?:non corrigé|NON corrigé|n'est pas corrigé|reste ouvert)"),
    ("« S-98 à S-112 » et « à ratifier » (ratification partielle par R-2 de D341 ; S-103 refusée)", r"S-98 à S-112[^.]{0,120}(?:à ratifier|A RATIFIER|À RATIFIER)"),
    ("« la découpe, S-98 à S-112, la nullabilité et les garanties de base viennent dans la consigne » (la consigne est venue)", r"nullabilité et les garanties de base viennent"),
    ("« L36-3 » et « pas de code » / « rien n'est codé » (la couche et son Manager le SONT, hors L36-3a-2 et L36-3b)", r"L36-3[^.]{0,160}(?:rien n'est codé|aucun code|pas de code)"),
    ("« les colonnes de PIN » / migration de [L36-3] « à écrire » ou « pas écrite »", r"(?:migration[^.]{0,120}L36-3[^.]{0,120}(?:à écrire|pas écrite|n'est pas écrite)|L36-3[^.]{0,120}migration[^.]{0,80}(?:à écrire|pas écrite))"),
    ("« la base de développement de Ko n'a PAS la migration » (périmé depuis D340 ; D341 n'applique PAS la sienne : S-129)", r"base de développement de Ko n'a PAS la migration"),
    ("« RANG 44 : OUVERT » / « rang 44 reste OUVERT »", r"[Rr]ang 44[^.]{0,40}(?:reste OUVERT|: OUVERT|est OUVERT)"),
    ("« SameSite » (la contrainte de mise en service est DITE par R-2 ; la nouvelle ligne doit la porter)", r"SameSite"),
]
SENS2 = [
    ("« un lot de code PEUT s'ouvrir »", r"un lot de code PEUT s'ouvrir"),
    ("« L36-3a-2 » et ouvrir / coder / consigne", r"L36-3a-2[^.]{0,160}(?:s'ouvre|peut s'ouvrir|ouvrable|coder|consigne|candidat)"),
    ("« L36-3b » et ouvrir / coder / consigne", r"L36-3b[^.]{0,160}(?:s'ouvre|peut s'ouvrir|ouvrable|coder|consigne|candidat)"),
    ("« RANG 45 » et ouvrir / arbitrer / cadrer", r"RANG 45[^.]{0,160}(?:ouvr|arbitr|cadr)"),
    ("« K-19 à K-23 » et coder / ratifier", r"K-19 à K-23[^.]{0,120}(?:coder|ratifi|code)"),
    ("« cinq lots de code non certifiés sont tenables »", r"cinq lots de code non certifiés sont tenables"),
    ("« K-14 à K-18 » et coder / ouvrir / à coder (la permission est CONSOMMÉE par D341)", r"K-14 à K-18[^.]{0,140}(?:à coder|coder|s'ouvre|ouvrable|attend)"),
    ("« L36-3a-1 » et ouvrir / consigne / candidat (la permission est CONSOMMÉE par D341)", r"L36-3a-1[^.]{0,160}(?:s'ouvre|peut s'ouvrir|ouvrable|consigne|candidat|à coder)"),
    ("« L'ARBITRAGE DU RANG APPARTIENT À KO » / « la session ne choisit donc pas le rang suivant » (délégation du 02/11)", r"(?:L'ARBITRAGE DU RANG APPARTIENT À KO|la session ne choisit donc pas le rang suivant)"),
    ("« recours administrateur » et coder / ouvrir (d'un Manager seul : MP-44)", r"[Rr]ecours (?:de l')?administrateur[^.]{0,140}(?:coder|ouvr|code)"),
    ("« la pause du paiement en ligne (E3 et R1) » et reprise / lever", r"pause du paiement en ligne \(E3 et R1\)[^.]{0,80}(?:levée|lever|reprise)"),
]


def contextes(fichier: str, motif: str):
    t = TEXTE[fichier]
    # IGNORECASE : la 1re version cherchait « cadr » dans « CADRAGE » (casse) et rendait 0 sur « RANG 45 … CADRAGE » — un zéro qui n'en était pas un (D295)
    return [(m.start(), t[max(0, m.start() - 70): m.end() + 70]) for m in re.finditer(motif, t, re.IGNORECASE)]


def main() -> None:
    sortie = sys.argv[1]
    out = []
    vrai = len(contextes("ZWADJ_CONTINUITE.md", r"RANG 44 : EN ATTENTE D'ARBITRAGE DE KO|RANG 45 : EN ATTENTE DE CADRAGE DU RELECTEUR"))
    faux = len(contextes("ZWADJ_CONTINUITE.md", r"RANG 9999 : EN ATTENTE D'ARBITRAGE DE KO"))
    if not (vrai > 0 and faux == 0):
        print(f"CALIBRAGE RATÉ : motif connu → {vrai} (attendu > 0), motif fabriqué → {faux} (attendu 0). ABANDON.")
        sys.exit(3)
    out.append(f"calibrage : motif connu « RANG 44/45 : EN ATTENTE… » → {vrai} (> 0 attendu) ; motif fabriqué « RANG 9999… » → {faux} (0 attendu) — les deux bras tiennent.")
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
