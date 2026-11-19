#!/usr/bin/env python3
"""Passe D277 (deux sens, D287) du lot D352 — EN DEUX ÉTAPES dans CE fichier (l'étape 2, la classification par annotation, suit l'étape 1 après la ligne « ÉTAPE 2 ») : cherche, dans les QUATRE fichiers d'autorité, sur le texte APLATI (blancs fusionnés), les affirmations que le lot INVALIDE et les permissions qu'il REND PÉRIMÉES.
Chaque motif imprime : le nombre d'occurrences, puis une fenêtre de contexte par occurrence (numérotée) ; le total parcouru (caractères aplatis) est imprimé à côté (D290). Lecture seule.
Usage : python3 passe-d277.py [--motif N]   (sans argument : tous les motifs, comptes seuls ; avec --voir : les contextes)"""
import re
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
FICHIERS = ["ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md", "AGENTS.md", "CLAUDE.md"]
VOIR = "--voir" in sys.argv
MOTIFS = [
    # (sens, libellé, regex)
    ("INVALIDE", "la liste « Mes salles » dit encore « en attente » pour une salle refusée", r"(liste « Mes salles »[^.]{0,120}(dit encore|disait encore)|dit encore « en attente de publication par Zwadj »|Refusée\W{1,3}dans la liste)"),
    ("INVALIDE", "« Refusée » dans la liste, contrat d'API : s'arrêter et demander", r"contrat d'API\W{1,3}s'arrêter et demander"),
    ("INVALIDE", "S-192 (écart du harnais, à ratifier / refusée / les 29 gardes en erreur de requête)", r"S-192"),
    ("INVALIDE", "les 29 gardes (en erreur de requête de Testing Library)", r"29 gardes"),
    ("INVALIDE", "MORD-REQ / lue(s) en ERREUR DE REQUÊTE", r"(MORD-REQ|lues? en ERREUR DE REQUÊTE|morsure de PRÉSENCE)"),
    ("PERMET", "rang 54 en attente / candidat", r"RANG 54\W{1,3}(:|EN ATTENTE|OUVERT|CLOS)|candidat du rang 54|rang 54 : EN ATTENTE"),
    ("PERMET", "compteur TRENTE-TROIS (le chiffre courant)", r"TRENTE-TROIS"),
    ("PERMET", "RANG 55", r"RANG 55"),
    ("PERMET", "un lot de code PEUT s'ouvrir / aucune certification (la règle courante)", r"(limite de cinq (reste |est )?SUSPENDUE|aucune certification, aucune marque)"),
    ("INVALIDE", "venue-form.tsx n'est PAS modifié (la branche par-carte y écrit) / PublicationBadge reste ce qu'il est", r"(venue-form\.tsx. n'est PAS modifié|PublicationBadge. reste ce qu'il est)"),
    ("INVALIDE", "la carte de la liste / « Mes salles » ne lit pas le refus", r"(liste[^.]{0,80}ne lit (pas|aucun)[^.]{0,40}refus|aucun appel à `?GET /pro/venues/:id/publication)"),
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

print("== ÉTAPE 2 : classification par annotation (±450 caractères aplatis) ==")
FICHIERS = ["ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md", "AGENTS.md", "CLAUDE.md"]
MOTIFS = {"S-192": r"S-192", "29 gardes": r"29 gardes", "MORD-REQ": r"MORD-REQ|lues? en ERREUR DE REQUÊTE|morsure de PRÉSENCE",
          "liste dit encore en attente": r"liste « Mes salles »[^.]{0,120}(dit encore|disait encore)|dit encore « en attente de publication par Zwadj »"}
ANNOT = re.compile(r"REFUSÉE|refusée\b|FAIT|PÉRIMÉ|D352|barré|~~")
corpus = {f: re.sub(r"\s+", " ", open(f, encoding="utf-8").read()) for f in FICHIERS}
total_sans = 0
for nom, motif in MOTIFS.items():
    rx = re.compile(motif)
    examines = sans = 0
    for f, t in corpus.items():
        for m in rx.finditer(t):
            examines += 1
            fenetre = t[max(0, m.start() - 450): m.end() + 450]
            if not ANNOT.search(fenetre):
                sans += 1
                print(f"  SANS ANNOTATION · {nom} · {f} @ {m.start()} : …{t[max(0, m.start() - 160): m.end() + 200]}…")
    total_sans += sans
    print(f"[{nom}] occurrences examinées : {examines} · sans annotation dans ±450 caractères : {sans}")
print(f"TOTAL sans annotation : {total_sans}")
