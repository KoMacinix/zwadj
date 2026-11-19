#!/usr/bin/env python3
"""Passe D277 (deux sens, D287) du lot D354 — EN DEUX ÉTAPES dans CE fichier (l'étape 2, la classification par annotation, suit l'étape 1) : cherche, dans les QUATRE fichiers d'autorité, sur le texte APLATI (ces
fichiers sont enveloppés à ~95 colonnes : une expression de plus de quelques mots y est coupée au moins une fois — D294), (A) ce que ce lot INVALIDE — des affirmations devenues fausses — et (B) ce que ce lot REND
PERMIS — des phrases qui disent qu'un lot, un rang ou un code peut s'ouvrir, dont la CONDITION vient de changer. Chaque motif imprime : le nombre d'occurrences par fichier ; avec `--voir`, une fenêtre de contexte par
occurrence. Le total parcouru (caractères aplatis) est imprimé à côté (D290). Lecture seule. Usage, depuis la RACINE : python3 -I -X utf8 docs/preuves/D354/passe-d277.py [--voir]
INSTRUMENT ÉCARTÉ : `docs/preuves/D353/passe-d277.py` tel quel — ses motifs visent le rang 55. Sa STRUCTURE (deux étapes, aplatissement, classification par annotation) est reprise.
NE FAIT PAS FOI SUR LES AFFIRMATIONS : il LISTE ce que les fichiers disent ; c'est la lecture du contexte (`passe-d277.md`) qui tranche, occurrence par occurrence."""
import re
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
FICHIERS = ["ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md", "AGENTS.md", "CLAUDE.md"]
VOIR = "--voir" in sys.argv
MOTIFS = [
    # (sens, libellé, regex)
    ("INVALIDE", "« RANG 56 : EN ATTENTE DE CADRAGE DU RELECTEUR »", r"RANG 56\W{1,3}EN ATTENTE"),
    ("INVALIDE", "L36-3a-2 = candidat « pas arbitré »", r"L36-3a-2[^.]{0,260}(Pas arbitré|pas arbitré|PAS arbitré)"),
    ("INVALIDE", "« S-104 n'est PAS codée » / « jamais codée »", r"S-104[^.]{0,80}(n'est PAS codée|jamais codée|PAS CODÉE|non codée)"),
    ("INVALIDE", "« `mustChangePassword` voyage mais rien ne l'écrit à `true` »", r"rien ne l'écrit à `?true`?"),
    ("INVALIDE", "« aucun refus ne le lit » (`password_expires_at`) / « un mot de passe expiré ouvre une session »", r"(aucun refus ne le lit|un mot de passe expiré ouvre une session|ouvre encore une session)"),
    ("INVALIDE", "K-19 à K-23 « ne sont pas ratifiés » / à ratifier avant leur code", r"K-19 à K-2[23][^.]{0,120}(ne sont pas ratifiés|à ratifier|pas ratifiés)"),
    ("INVALIDE", "« aucune table de capacités » / les capacités « ne sont pas codées »", r"(aucune table de capacités|AUCUNE table de capacités|les capacités[^.]{0,60}ne sont pas codées|S-107[^.]{0,60}(n'est pas codée|à L36-3a-2|appartiennent à L36-3a-2))"),
    ("INVALIDE", "compteur TRENTE-CINQ (le chiffre courant)", r"TRENTE-CINQ"),
    ("INVALIDE", "S-231 à S-238 « à ratifier »", r"S-231 à S-238[^.]{0,90}(à ratifier|restent à ratifier|sont à ratifier)"),
    ("INVALIDE", "dernier numéro attribué : D353 / « D354 » n'existe pas", r"(dernier numéro attribué\W{1,4}\W{0,3}D353|D353 est au registre)"),
    ("INVALIDE", "« le recours d'un Manager seul » (SQL manuel) ou « la gestion du personnel n'existe pas »", r"(aucune route de gestion du personnel|ne crée, ne liste, ne réinitialise ni ne désactive)"),
    ("PERMET", "L36-3a-2 « peut s'ouvrir » / le candidat du rang 56", r"(L36-3a-2[^.]{0,120}(peut s'ouvrir|PEUT s'ouvrir|s'ouvre)|candidat[^.]{0,80}L36-3a-2)"),
    ("PERMET", "L36-3b (le PIN) : « sans rang », candidat du rang 57", r"(L36-3b[^.]{0,120}(sans rang|n'a pas de rang|à cadrer|PEUT s'ouvrir)|RANG 57)"),
    ("PERMET", "un lot de code PEUT s'ouvrir / limite de cinq suspendue (la règle courante)", r"(limite de cinq (reste |est )?SUSPENDUE|un lot de code PEUT s'ouvrir)"),
    ("PERMET", "L36-4 (les écrans) « attend » la gestion du personnel côté serveur", r"(L36-4[^.]{0,120}(attend|après L36-3|dépend de L36-3)|écrans[^.]{0,80}L36-3a-2)"),
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
    "RANG 56 en attente": r"RANG 56\W{1,3}EN ATTENTE",
    "L36-3a-2 candidat pas arbitré": r"L36-3a-2[^.]{0,260}(Pas arbitré|pas arbitré|PAS arbitré)",
    "S-104 non codée": r"S-104[^.]{0,80}(n'est PAS codée|jamais codée|PAS CODÉE|non codée)",
    "rien ne l'écrit à true": r"rien ne l'écrit à `?true`?",
    "aucun refus ne le lit": r"(aucun refus ne le lit|un mot de passe expiré ouvre une session|ouvre encore une session)",
    "K-19 à K-23 pas ratifiés": r"K-19 à K-2[23][^.]{0,120}(ne sont pas ratifiés|à ratifier|pas ratifiés)",
    "aucune table de capacités": r"(aucune table de capacités|AUCUNE table de capacités|S-107[^.]{0,60}(n'est pas codée|à L36-3a-2|appartiennent à L36-3a-2))",
    "TRENTE-CINQ": r"TRENTE-CINQ",
    "S-231 à S-238 à ratifier": r"S-231 à S-238[^.]{0,90}(à ratifier|restent à ratifier|sont à ratifier)",
    "dernier numéro D353": r"(dernier numéro attribué\W{1,4}\W{0,3}D353|D353 est au registre)",
    "L36-3a-2 candidat (PERMET)": r"(L36-3a-2[^.]{0,120}(peut s'ouvrir|PEUT s'ouvrir|s'ouvre)|candidat[^.]{0,80}L36-3a-2)",
    "L36-4 attend (PERMET)": r"(L36-4[^.]{0,120}(attend|après L36-3|dépend de L36-3)|écrans[^.]{0,80}L36-3a-2)",
}
SANS_TOTAL = 0
for nom, motif in MOTIFS2.items():
    rx = re.compile(motif)
    examines = {"D354": 0, "~~": 0, "PÉRIMÉ": 0, "SANS": 0}
    for f, t in corpus.items():
        for m in rx.finditer(t):
            fenetre = t[max(0, m.start() - 450): m.end() + 450]
            cle = "D354" if "D354" in fenetre else ("~~" if "~~" in fenetre else ("PÉRIMÉ" if re.search(r"PÉRIMÉ|périmé", fenetre) else "SANS"))
            examines[cle] += 1
            if cle == "SANS":
                h = max(t.rfind(" ## ", 0, m.start()), t.rfind(" ### ", 0, m.start()), t.rfind(" #### ", 0, m.start()))
                section = t[h + 1: h + 112] if h >= 0 else "(avant tout titre)"
                print(f"  SANS ANNOTATION · {nom} · {f} @ {m.start()} · SECTION : {section} · …{t[max(0, m.start() - 120): m.end() + 120]}…")
    SANS_TOTAL += examines["SANS"]
    print(f"[{nom}] occurrences examinées : {sum(examines.values())} · annotées D354 : {examines['D354']} · barrées ~~ : {examines['~~']} · PÉRIMÉ antérieur : {examines['PÉRIMÉ']} · SANS : {examines['SANS']}")
print(f"TOTAL SANS annotation : {SANS_TOTAL} (attendu 0 une fois les `.md` écrits)")
