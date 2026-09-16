"""Relit les fichiers d'autorite et compte les JETONS attendus (D289 : on relit le fichier, pas le compte
rendu de l'outil). Les jetons sont dans CE fichier, ecrit par l'outil d'ecriture : rien ne traverse un
interpreteur. Chaque ligne imprime le compte vu, l'attendu, et le nombre de caracteres parcourus (D290).

Usage, depuis la racine : python docs/preuves/D293/outils/relire-jetons.py ETAPE
"""
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")

ETAPES = {
    "etape0": {
        "ZWADJ_CONTINUITE.md": [
            ("## Session du 14/09/2026 — D293 · CERTIFICATION (rang 15) : le rang 13 et l'incident D292", 1),
            ("| D293 | A | Session du 14/09/2026 — D293", 1),
            ("le rang 13 (D290, `251e82b`) et l'incident D292\n(`49f3ace`)", 1),
            ("`c2ac531:neutralisation/lancer-campagnes.py`", 1),
            ("`docs/preuves/D288/campagnes/`", 2),
            ("**182 · 0 · 13** (375 lignes parcourues)", 1),
            ("`neutralis..e\\(s\\)`", 1),
            ("### ⛔ LE PROTOCOLE DE LA PASSE — ÉCRIT ET COMMITÉ AVANT LE RELEVÉ D'OUVERTURE", 1),
            ("`a5-cold-reload-vs-spa.e2e.ts:190` (**D288 seul**", 1),
            ("~~**ÉTAT AU 14/09/2026 : ARBITRÉ, RIEN D'EXÉCUTÉ.**~~", 1),
            ("`.neutralisation-journaux/rang15-*`", 1),
            ("**34 occurrences vues sur 9 motifs**", 1),
            # BRAS NEGATIF (ajoute apres la premiere sortie, gardee sous relire-jetons-etape0.txt) :
            # la ligne d'etat NON barree doit avoir disparu, et un jeton absent doit rendre 0.
            ("⇒ **ÉTAT AU 14/09/2026 : ARBITRÉ, RIEN D'EXÉCUTÉ.**", 0),
            ("jeton-absent-de-calibration-d293", 0),
        ],
        "AGENTS.md": [
            ("⚠ **(D293, 14/09/2026) Portée ÉTENDUE aux 26 journaux de campagne attribués à D288 (rang 12)**", 1),
            ("`docs/preuves/D288/campagnes/`", 1),
        ],
        "ZWADJ_BACKLOG.md": [
            ("## Reports du 14/09/2026 — rang 15, certification (D293)", 1),
            ("`neutralis..e\\(s\\)`", 1),
            ("`docs/preuves/D293/versement-d288/verifier-decl.txt`", 1),
            ("`docs/preuves/D288/campagnes/`, 26 copies identiques sur 26", 1),
        ],
    },
}

ETAPES["refus"] = {
    "ZWADJ_CONTINUITE.md": [
        ("## Session du 14/09/2026 — D293 · CERTIFICATION (rang 15) : étape 0 faite, porte dure ROUGE sur `chrome`, passe NON lancée", 1),
        ("| D293 | A | Session du 14/09/2026 — D293 · CERTIFICATION (rang 15) : étape 0 faite, porte dure ROUGE sur `chrome`, passe NON lancée |", 1),
        ("### ⛔ ÉTAPE 1 — LA PORTE DURE EST ROUGE SUR LES DEUX RELEVÉS : RIEN N'EST LANCÉ, PAS DE MARQUE", 1),
        ("| **`chrome`** | **14** | **15** | **0 ⛔ ROUGE** |", 1),
        ("`C:\\Program Files\\Google\\Chrome\\`", 1),
        # ⚠ L'attendu etait 3, ecrit de memoire en fusionnant deux fichiers ; la sortie en ecart est gardee
        # (relire-jetons-refus.txt). Releve par recherche : 2 ici (point d'entree, etape 1), 1 au backlog.
        ("`657e9ba`", 2),
        ("**108 occurrences vues sur 7 motifs**", 1),
        ("⛔ Compteur de lots de code non certifiés : toujours DEUX", 0),
        ("⛔ **Compteur de lots de code non certifiés : toujours DEUX**", 1),
        # BRAS NEGATIF : le processus sans piece a ete retire, le titre non amende a disparu.
        ("01:49:06", 0),
        ("CERTIFICATION (rang 15) : le rang 13 et l'incident D292", 0),
    ],
    "ZWADJ_BACKLOG.md": [
        ("- **[MÉTHODE][P1]** ⛔ **LA CERTIFICATION DU RANG 15 N'A PAS ÉTÉ LANCÉE", 1),
        ("`docs/preuves/D293/ouverture/`", 1),
        ("`657e9ba`", 1),
    ],
}

ETAPES["refus2"] = {
    "ZWADJ_CONTINUITE.md": [
        ("### ⛔ ÉTAPE 1, SECONDE TENTATIVE (16/09/2026) — `chrome` EST À 0, ET C'EST LA **RAM** QUI REFUSE", 1),
        ("| **RAM médiane · bande** | **3 073,5 · 3 053-3 085 Mo** | **3 077,5 · 3 068-3 087 Mo** | ≥ barre ⛔ **ROUGE** |", 1),
        # ⚠ Attendu 2 ecrit de memoire, RECIDIVE de l'ecart de l'etape « refus » : le chemin complet
        # n'apparait qu'UNE fois ; la seconde mention est le dossier nu. Releve : 1 complet, 2 nus.
        # ⚠ Et RE-RELEVE apres la derniere ecriture : la note de faute cite elle-meme le chemin.
        # Un attendu releve AVANT la derniere modification est perime (D218, porte a un compteur de jetons).
        ("`docs/preuves/D293/ouverture-16-09/`", 2),
        ("ouverture-16-09/", 3),
        ("**54,86 Mio**", 1),
        ("⛔ **NON ÉTABLI, ET JE NE L'ÉCRIS PAS COMME UN FAIT**", 1),
        ("**Fermer Chrome était nécessaire, pas suffisant.**", 1),
        # BRAS NEGATIF : rien ne doit presenter la passe comme lancee ou la barre comme redefinie.
        ("la barre est redéfinie", 0),
        ("jeton-absent-de-calibration-d293", 0),
    ],
    "ZWADJ_BACKLOG.md": [
        ("✅ **`chrome` RÉGLÉ LE 16/09/2026**", 1),
        ("REFUSÉE UNE SECONDE FOIS, SUR LA RAM (16/09/2026)", 1),
    ],
}

ETAPES["critere"] = {
    "ZWADJ_CONTINUITE.md": [
        ("⛔ **ET LA JUSTIFICATION LA PLUS FORTE EST VENUE APRÈS COUP", 1),
        ("UNE PORTE DURE À UNE SEULE QUANTITÉ AURAIT LAISSÉ PASSER UNE DES DEUX FENÊTRES", 1),
        ("⛔ **RATIFIÉ ET GRAVÉ AU CRITÈRE PAR KO LE 16/09/2026**", 1),
        ("jeton-absent-de-calibration-d293", 0),
    ],
}

ETAPES["marque"] = {
    # Attendus RELEVES par recherche apres la derniere ecriture (lecon des etapes « refus » et « refus2 »),
    # et sur des chaines qui n'enjambent aucun retour a la ligne.
    "ZWADJ_CONTINUITE.md": [
        ("Portes vertes AU REPOS le 16/09/2026", 1),
        ("195 mordues", 3),
        ("zwadj_zwadj_pgdata", 1),
        ("rang15-e2e-EXTRAIT.txt", 1),
        ("CLOS LE 16/09/2026 : D293 — MARQUE POSÉE", 1),
        ("passe NON lancée", 0),
        ("jeton-absent-de-calibration-d293", 0),
    ],
}

etape = sys.argv[1] if len(sys.argv) > 1 else ""
if etape not in ETAPES:
    sys.exit(f"ABANDON : etape inconnue {etape!r}")
manques = 0
for f, jetons in ETAPES[etape].items():
    t = open(f, "rb").read().decode("utf-8").replace("\r\n", "\n")
    for j, att in jetons:
        vu = t.count(j)
        manques += vu != att
        print(f"{'✓' if vu == att else '✗'} {f} : {vu} (attendu {att}) · {j[:90]!r}")
    print(f"  {f} : {len(t)} caracteres parcourus, {len(jetons)} jetons")
print(f"jetons en ecart : {manques} (attendu 0)")
sys.exit(1 if manques else 0)
