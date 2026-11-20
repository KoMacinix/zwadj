#!/usr/bin/env python3
"""Passe D277 (deux sens, D287) du lot D355 — EN DEUX ÉTAPES dans CE fichier (l'étape 2, la classification par annotation, suit l'étape 1) : cherche, dans les QUATRE fichiers d'autorité, sur le texte APLATI (ces fichiers sont enveloppés à ~95 colonnes : une expression de plus de quelques mots y est coupée au moins une fois — D294), (A) ce que ce lot INVALIDE — des affirmations devenues fausses — et (B) ce que ce lot REND PERMIS — des phrases qui disent qu'un lot, un rang ou un code peut s'ouvrir, dont la CONDITION vient de changer. Chaque motif imprime : le nombre d'occurrences par fichier ; avec `--voir`, une fenêtre de contexte par occurrence. Le total parcouru (caractères aplatis) est imprimé à côté (D290). Lecture seule. Usage, depuis la RACINE : python3 -I -X utf8 docs/preuves/D355/passe-d277.py [--voir]
CODE LU dans `docs/preuves/D354/passe-d277.py` (structure : deux étapes, aplatissement, classification par annotation) ; seuls les motifs changent. NE FAIT PAS FOI SUR LES AFFIRMATIONS : il LISTE ce que les fichiers disent ; c'est la lecture du contexte (`passe-d277.md`) qui tranche, occurrence par occurrence."""
import re
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
FICHIERS = ["ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md", "AGENTS.md", "CLAUDE.md"]
VOIR = "--voir" in sys.argv
MOTIFS = [
    # (sens, libellé, regex)
    ("INVALIDE", "« RANG 57 : EN ATTENTE DE CADRAGE DU RELECTEUR »", r"RANG 57\W{1,3}EN ATTENTE"),
    ("INVALIDE", "le défaut croisé « connexion ‖ réinitialisation » « non corrigé » / « ouvre une session APRÈS elle »", r"(défaut croisé[^.]{0,260}(non corrigé|pas corrigé|NON corrigé|MESURÉ et RAPPORTÉ)|ouvre une session APRÈS elle|ouvre alors une session)"),
    ("INVALIDE", "« l'audit des FICHES client n'est PAS écrit » (S-240)", r"(audit des FICHES client n'est PAS écrit|AUDIT DES FICHES CLIENT N'EST PAS ÉCRIT|l'audit des FICHES client N'EST PAS écrit)"),
    ("INVALIDE", "« la question du rapport de D354 » (S-240) encore posée", r"(question du rapport de D354|QUESTION DU RAPPORT DE D354|faut-il aussi auditer la création et la modification d'une FICHE)"),
    ("INVALIDE", "compteur TRENTE-SIX (le chiffre courant)", r"TRENTE-SIX"),
    ("INVALIDE", "S-239 à S-251 « à ratifier »", r"S-239 à S-251[^.]{0,90}(à ratifier|restent à ratifier|sont à ratifier)"),
    ("INVALIDE", "dernier numéro attribué : D354 / « D355 » n'existe pas", r"(dernier numéro attribué\W{1,4}\W{0,3}D354|D354 est au registre)"),
    ("INVALIDE", "« l'audit livré est celui des trois actions du personnel » (S-240)", r"l'audit livré est celui des trois actions"),
    ("PERMET", "L36-3b (le PIN) : candidat du rang 57 / « RANG 58 »", r"(L36-3b[^.]{0,120}(candidat|pas arbitré|à cadrer)|RANG 58)"),
    ("PERMET", "un lot de code PEUT s'ouvrir / limite de cinq suspendue (la règle courante)", r"(limite de cinq (reste |est )?SUSPENDUE|un lot de code PEUT s'ouvrir)"),
    ("PERMET", "L36-4 (les écrans) « attend » le personnel côté serveur", r"(L36-4[^.]{0,120}(attend|après L36-3|dépend de L36-3)|écrans[^.]{0,80}L36-3a-2)"),
]


def aplati(t: str) -> str:
    return re.sub(r"\s+", " ", t)


corpus = {f: aplati(open(f, encoding="utf-8").read()) for f in FICHIERS}
print("caractères aplatis parcourus :", {f: len(t) for f, t in corpus.items()}, "· total", sum(len(t) for t in corpus.values()))
for i, (sens, libelle, motif) in enumerate(MOTIFS, 1):
    rx = re.compile(motif)
    comptes = {f: len(rx.findall(t)) for f, t in corpus.items()}
    print(f"[{i:02d}] {sens:8s} {libelle}\n       comptes : {comptes} · total {sum(comptes.values())}  ({'motif à zéro = HYPOTHÈSE à vérifier' if sum(comptes.values()) == 0 else 'à traiter'})")
    if VOIR:
        for f, t in corpus.items():
            for j, m in enumerate(rx.finditer(t), 1):
                a, b = max(0, m.start() - 110), min(len(t), m.end() + 130)
                print(f"       ({f} #{j} @ {m.start()}) …{t[a:b]}…")

print("== ÉTAPE 2 : classification par annotation (±450 caractères aplatis) — D354 = annoté par CE lot ; ~~ = barré ; PÉRIMÉ = annoté par un lot ANTÉRIEUR ; SANS = à traiter ==")
MOTIFS2 = {
    "RANG 57 en attente": r"RANG 57\W{1,3}EN ATTENTE",
    "défaut croisé non corrigé": r"(défaut croisé[^.]{0,260}(non corrigé|pas corrigé|NON corrigé|MESURÉ et RAPPORTÉ)|ouvre une session APRÈS elle|ouvre alors une session)",
    "audit des fiches pas écrit": r"(audit des FICHES client n'est PAS écrit|AUDIT DES FICHES CLIENT N'EST PAS ÉCRIT|l'audit des FICHES client N'EST PAS écrit)",
    "question du rapport de D354": r"(question du rapport de D354|QUESTION DU RAPPORT DE D354|faut-il aussi auditer la création et la modification d'une FICHE)",
    "TRENTE-SIX": r"TRENTE-SIX",
    "S-239 à S-251 à ratifier": r"S-239 à S-251[^.]{0,90}(à ratifier|restent à ratifier|sont à ratifier)",
    "dernier numéro D354": r"(dernier numéro attribué\W{1,4}\W{0,3}D354|D354 est au registre)",
    "audit livré : trois actions": r"l'audit livré est celui des trois actions",
    "L36-3b candidat (PERMET)": r"(L36-3b[^.]{0,120}(candidat|pas arbitré|à cadrer)|RANG 58)",
    "L36-4 attend (PERMET)": r"(L36-4[^.]{0,120}(attend|après L36-3|dépend de L36-3)|écrans[^.]{0,80}L36-3a-2)",
}
SANS_TOTAL = 0
for nom, motif in MOTIFS2.items():
    rx = re.compile(motif)
    examines = {"D355": 0, "~~": 0, "PÉRIMÉ": 0, "SANS": 0}
    for f, t in corpus.items():
        for m in rx.finditer(t):
            fenetre = t[max(0, m.start() - 450): m.end() + 450]
            cle = "D355" if "D355" in fenetre else ("~~" if "~~" in fenetre else ("PÉRIMÉ" if re.search(r"PÉRIMÉ|périmé", fenetre) else "SANS"))
            examines[cle] += 1
            if cle == "SANS":
                h = max(t.rfind(" ## ", 0, m.start()), t.rfind(" ### ", 0, m.start()), t.rfind(" #### ", 0, m.start()))
                section = t[h + 1: h + 112] if h >= 0 else "(avant tout titre)"
                print(f"  SANS ANNOTATION · {nom} · {f} @ {m.start()} · SECTION : {section} · …{t[max(0, m.start() - 120): m.end() + 120]}…")
    SANS_TOTAL += examines["SANS"]
    print(f"[{nom}] occurrences examinées : {sum(examines.values())} · annotées D355 : {examines['D355']} · barrées ~~ : {examines['~~']} · PÉRIMÉ antérieur : {examines['PÉRIMÉ']} · SANS : {examines['SANS']}")
print(f"TOTAL SANS annotation : {SANS_TOTAL} (attendu 0 une fois les `.md` écrits)")
