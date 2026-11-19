#!/usr/bin/env python3
"""Passe D277 (deux sens, D287) du lot D353 — EN DEUX ÉTAPES dans CE fichier (l'étape 2, la classification par annotation, suit l'étape 1) : cherche, dans les QUATRE fichiers d'autorité, sur le texte APLATI (blancs fusionnés : ces fichiers sont enveloppés
à ~95 colonnes, une expression de plus de quelques mots y est coupée au moins une fois — D294), (A) ce que ce lot INVALIDE — des affirmations devenues fausses — et (B) ce que ce lot REND PERMIS ou CHANGE de condition — des phrases qui autorisaient, ou refusaient, à bon droit hier.
Chaque motif imprime : le nombre d'occurrences par fichier ; avec `--voir`, une fenêtre de contexte par occurrence (numérotée). Le total parcouru (caractères aplatis) est imprimé à côté (D290). Un motif à zéro est une HYPOTHÈSE à vérifier, jamais une absence constatée (D295) ; un motif au compte invraisemblablement haut aussi.
Lecture seule. Usage, depuis la RACINE : python3 -I -X utf8 docs/preuves/D353/passe-d277.py [--voir]
INSTRUMENT ÉCARTÉ : `docs/preuves/D352/passe-d277.py` tel quel — ses motifs visent le rang 54. Sa STRUCTURE (deux étapes, aplatissement, classification par annotation) est reprise.
NE FAIT PAS FOI SUR LES AFFIRMATIONS : il LISTE ce que les fichiers disent ; c'est la lecture du contexte (`passe-d277.md`) qui tranche, occurrence par occurrence."""
import re
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
FICHIERS = ["ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md", "AGENTS.md", "CLAUDE.md"]
VOIR = "--voir" in sys.argv
MOTIFS = [
    # (sens, libellé, regex)
    ("INVALIDE", "« RANG 55 : EN ATTENTE DE CADRAGE DU RELECTEUR »", r"RANG 55\W{1,3}EN ATTENTE"),
    ("INVALIDE", "la mémoire du site client = candidat « pas arbitré »", r"mémoire du site client[^.]{0,260}(Pas arbitré|pas arbitré)"),
    ("INVALIDE", "« n'ont pas été mesurées sous ce mécanisme » (les référentiels)", r"n'ont pas été mesurées sous ce mécanisme"),
    ("INVALIDE", "le `no-store` de la carte « n'est affirmé par AUCUN test »", r"n'est affirmé par AUCUN test"),
    ("INVALIDE", "« sans créneau actif » (avec une date) « n'est pas jouée sur la carte »", r"(N'EST PAS JOUÉE SUR LA CARTE|n'est pas jouée sur la carte|non joué sur la carte)"),
    ("INVALIDE", "S-153 : la spec de `r48` TOLÈRE l'absence de puces", r"(S-153|tolère l'absence de puces|les tolère et le dit)"),
    ("INVALIDE", "les listes de référentiels du client sont vides pour tout test qui suit (D346)", r"(ELLES SONT VIDES POUR TOUT TEST QUI SUIT|« Aucun style publié »|la base e2e ne publie AUCUN style)"),
    ("INVALIDE", "la piste « en production, une liste vide rendue une fois resterait servie une heure » NON établie", r"(Piste, NON établie|Piste, non établie)[^.]{0,200}(liste vide|une heure)"),
    ("INVALIDE", "compteur TRENTE-QUATRE (le chiffre courant)", r"TRENTE-QUATRE"),
    ("INVALIDE", "S-218 à S-230 « à ratifier »", r"S-218 à S-230[^.]{0,90}(à ratifier|restent à ratifier|sont à ratifier)"),
    ("INVALIDE", "dernier numéro attribué : D352 / « D353 » n'existe pas", r"(dernier numéro attribué\W{1,4}\W{0,3}D352|D352 est au registre)"),
    ("PERMET", "le correctif de la partie e2e « vit dans e2e/ seul » (ordre du semis, purge) — une consigne que ce lot n'a pas suivie", r"(vit dans e2e/ seul|e2e/ seul|purge du cache de fetch)"),
    ("PERMET", "un lot de code PEUT s'ouvrir / aucun lot de code ne s'ouvre avant une certification (la règle courante)", r"(limite de cinq (reste |est )?SUSPENDUE|aucune certification, aucune marque|aucun lot de code ne s'ouvre)"),
    ("PERMET", "RANG 56", r"RANG 56"),
    ("PERMET", "« getVenueBySlug et searchVenues restent en no-store » / `no-store` partout et son coût [CLIENT][PERF]", r"(no-store` partout|\[CLIENT\]\[PERF\]|restent en `no-store`)"),
    ("PERMET", "`apps/client/src/lib/api.ts` « n'est pas touché » / rien dans `apps/client`", r"(api\.ts[^.]{0,40}n'est pas touché|rien dans `apps/client`)"),
    ("PERMET", "l'en-tête de l'assistant d'une salle : « en attente » avant la réponse (réponse de Ko : APRÈS)", r"(EN-TÊTE DE L'ASSISTANT D'UNE SALLE|en-tête de l'assistant d'une salle)"),
    ("PERMET", "CIBLÉ : une phrase qui dit qu'un lot de code PEUT / NE PEUT PAS s'ouvrir, ou qui attend, à cause du rang 55", r"((peut|PEUT|ne s'ouvre|s'ouvre|peuvent|attend|attendent)[^.]{0,90}(le |du )?rang 55|rang 55[^.]{0,90}(peut s'ouvrir|PEUT s'ouvrir|s'ouvre|est en attente|EN ATTENTE))"),
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
MOTIFS2 = {
    "RANG 55 en attente": r"RANG 55\W{1,3}EN ATTENTE",
    "mémoire du site client candidat pas arbitré": r"mémoire du site client[^.]{0,260}(Pas arbitré|pas arbitré)",
    "n'ont pas été mesurées": r"n'ont pas été mesurées sous ce mécanisme",
    "no-store AUCUN test": r"n'est affirmé par AUCUN test",
    "sans créneau actif non jouée": r"(N'EST PAS JOUÉE SUR LA CARTE|n'est pas jouée sur la carte|non joué sur la carte)",
    "S-153 tolère": r"(S-153|tolère l'absence de puces|les tolère et le dit)",
    "listes vides pour tout test": r"(ELLES SONT VIDES POUR TOUT TEST QUI SUIT|« Aucun style publié »|la base e2e ne publie AUCUN style)",
    "piste non établie": r"(Piste, NON établie|Piste, non établie)[^.]{0,200}(liste vide|une heure)",
    "TRENTE-QUATRE": r"TRENTE-QUATRE",
    "S-218 à S-230 à ratifier": r"S-218 à S-230[^.]{0,90}(à ratifier|restent à ratifier|sont à ratifier)",
    "dernier numéro D352": r"(dernier numéro attribué\W{1,4}\W{0,3}D352|D352 est au registre)",
}
ANNOT = re.compile(r"D353|PÉRIMÉ|RETIRÉE|ratifiées? par adoption|~~|TRENTE-CINQ|FAIT|CLOS")
total_sans = 0
for nom, motif in MOTIFS2.items():
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
