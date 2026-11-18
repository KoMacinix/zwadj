#!/usr/bin/env python3
"""D351 — la passe D277 des DEUX SENS sur les trois fichiers d'autorité (texte APLATI, jamais ligne à ligne : D294).
Sens 1 : les affirmations que ce lot INVALIDE. Sens 2 (D287) : les PERMISSIONS dont la condition vient de changer.
Pour chaque motif : le NOMBRE d'occurrences par fichier et, pour chacune, 70 caractères de contexte de part et d'autre (D275 : jamais un compte sans son contexte).
Calibrage : un motif connu présent doit rendre > 0 ; un motif fabriqué doit rendre 0 — avant toute lecture (D286 : deux bras, ABANDON si un cas manque son verdict).
Usage : python3 docs/preuves/D351/passe-d277/passe-d277.py <fichier-sortie> (depuis la RACINE du dépôt)
Pièce D351 : jouée UNE fois AVANT les écritures d'autorité de clôture (sortie-avant.txt) et UNE fois APRÈS (sortie-apres.txt).
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
    ("« RANG 53 : EN ATTENTE DE CADRAGE DU RELECTEUR » (le rang 53 est CLOS ; l'attente est celle du rang 54)", r"RANG 53 : EN ATTENTE DE CADRAGE DU RELECTEUR"),
    ("« compteur POUR MÉMOIRE VINGT-SIX » (VINGT-SIX → TRENTE-DEUX ou TRENTE-TROIS à la clôture de D351)", r"POUR MÉMOIRE (?:\*\*)?VINGT-SIX"),
    ("« `par-carte` s'intègre APRÈS » / « l'intégration de la branche `par-carte` » comme à venir (D350, R-9 : c'est fait)", r"`?par-carte`? s'intègre APRÈS|intégration de la branche `?par-carte`?"),
    ("« la ratification de S-192 à S-204 » / « S-192 … à ratifier » (S-193 à S-204 ratifiées, S-192 refusée — 1 c, R-8)", r"S-192[^.]{0,60}(?:à ratifier|ratif)|ratification de S-192"),
    ("« la liste Mes salles … en attente » pour une salle refusée (Ko : elle doit dire « Refusée » — 1 d, rang 54)", r"liste[^.]{0,120}(?:Mes salles|des salles)[^.]{0,200}(?:encore|toujours)[^.]{0,40}(?:en attente|En attente)"),
    ("« Carte interactive : reportée post-MVP » / « placeholder » (décision produit n° 2 : la carte est réelle)", r"Carte interactive[^.]{0,40}reportée post-MVP"),
    ("« Carte à venir » / « Map placeholder » (la carte de l'accueil et de la recherche est la vraie)", r"Carte à venir|Map placeholder|coming soon"),
    ("« Maps: deferred from MVP » / « real interactive map (Leaflet + tile provider decision) » (Leaflet est livré ; le fournisseur de production reste à décider)", r"Maps:\*\*? deferred from MVP|real interactive map|Real Leaflet"),
    ("« Map pin-drop + reverse geocoding during venue creation » (le pin-drop est livré par CA-5 ; le géocodage inverse non)", r"Map pin-drop"),
    ("« Circuit breakers + timeouts on … maps calls » (sans objet côté serveur à ce jour : seul le navigateur parle au fournisseur de tuiles)", r"Circuit breakers[^.]{0,80}maps"),
    ("« index géo sur les coordonnées » (la route de points lit au plus 500 lignes, aucun besoin mesuré)", r"index géo sur les coordonnées|Add index on `?Venue`? coords"),
    ("« search.map.title » / « search.map.soon » / « home.map.soon » (clés mortes depuis CA-2 et CA-3)", r"search\.map\.(?:title|soon)|home\.map\.soon"),
    ("« PRÊT À INTÉGRER » / « réserve » de la branche (la réserve est levée ICI par R-2 ou pas du tout)", r"PRÊT À INTÉGRER|la réserve du BILAN"),
    ("« Aucune écriture … carte » / « la carte n'a jamais été vue » (geste de Ko : regarder le fond de carte)", r"personne n'a encore VU la carte|jamais vu la carte"),
]
SENS2 = [
    ("« RANG 54 » et ouvrir / arbitrer / cadrer (écrit par D351)", r"RANG 54[^.]{0,160}(?:ouvr|arbitr|cadr)"),
    ("« L36-3a-2 » et ouvrir / coder / consigne / candidat", r"L36-3a-2[^.]{0,160}(?:s'ouvre|peut s'ouvrir|ouvrable|coder|consigne|candidat)"),
    ("« un lot de code PEUT s'ouvrir » / « cinq lots de code non certifiés sont tenables » (limite SUSPENDUE ; le compteur est tenu POUR MÉMOIRE)", r"un lot de code PEUT s'ouvrir|cinq lots de code non certifiés sont tenables"),
    ("« branche `par-carte` » et supprimer / supprimée (consigne § 4 : elle est GARDÉE)", r"branche `?par-carte`?[^.]{0,120}(?:supprim)"),
    ("« fr.json » / « ar.json » et « par-carte » et retouche (D350 : « une retouche s'ajoute au rang 53 »)", r"une retouche s'ajoute au rang 53"),
    ("« un lot par session » et exception (la session cloud : aucune nouvelle exception)", r"un lot par session[^.]{0,200}(?:exception|EXCEPTION)|(?:exception|EXCEPTION)[^.]{0,200}un lot par session"),
    ("« L'ARBITRAGE DU RANG APPARTIENT À KO » / « la session ne choisit donc pas le rang suivant » (délégation du 02/11)", r"(?:L'ARBITRAGE DU RANG APPARTIENT À KO|la session ne choisit donc pas le rang suivant)"),
    ("« fournisseur » des tuiles / « BLOQUE le lancement » (décision de Ko, ouverte — rien ne la tranche)", r"fournisseur[^.]{0,60}(?:tuiles|fond de carte)[^.]{0,200}(?:tranch|décid|choisi)"),
]


def contextes(fichier: str, motif: str):
    t = TEXTE[fichier]
    return [(m.start(), t[max(0, m.start() - 70): m.end() + 70]) for m in re.finditer(motif, t, re.IGNORECASE)]


def main() -> None:
    sortie = sys.argv[1]
    out = []
    vrai = len(contextes("ZWADJ_CONTINUITE.md", r"RANG 52 : CLOS SUR LE CODE|RANG 53 : EN ATTENTE DE CADRAGE DU RELECTEUR|RANG 53 : CLOS"))
    faux = len(contextes("ZWADJ_CONTINUITE.md", r"RANG 9999 : EN ATTENTE DE CADRAGE DU RELECTEUR"))
    vrai2 = len(contextes("AGENTS.md", r"POUR MÉMOIRE (?:\*\*)?VINGT-"))
    if not (vrai > 0 and faux == 0 and vrai2 > 0):
        print(f"CALIBRAGE RATÉ : motif connu → {vrai} (attendu > 0), motif connu dans AGENTS → {vrai2} (attendu > 0), motif fabriqué → {faux} (attendu 0). ABANDON.")
        sys.exit(3)
    out.append(f"calibrage : motif connu « RANG 52/53… » → {vrai} dans ZWADJ_CONTINUITE.md et « POUR MÉMOIRE VINGT- » → {vrai2} dans AGENTS.md (> 0 attendu) ; motif fabriqué « RANG 9999… » → {faux} (0 attendu) — les deux bras tiennent.")
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
