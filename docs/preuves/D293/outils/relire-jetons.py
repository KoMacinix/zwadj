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
