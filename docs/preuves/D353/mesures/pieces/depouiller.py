#!/usr/bin/env python3
"""Dépouille les pièces de l'instrument de production : par cas, nombre de sondes, sondes où la page est VIDE (au moins une liste à 0 ou en erreur) pendant que l'API rend une
liste PLEINE, premier instant de chaque état. Chaque compte imprime ce qu'il a parcouru (D290). Usage : python3 depouiller.py <dossier> [cas ...]"""
import re
import sys

dossier = sys.argv[1]
cas = sys.argv[2:] or ["cas-i", "cas-ii-500", "cas-ii-arret", "cas-iii", "cas-iii-bis"]
LIGNE = re.compile(r"^\+\s*([\d.]+)s\s+page\[(?:HTTP (\d+) styles=(\d+) amenities=(\d+) communes=(\d+)|ERREUR (\S+))[^\]]*\]\s+api\[styles=(\S+) amenities=(\S+) communes=(\S+)\](.*)$")
for nom in cas:
    texte = open(f"{dossier}/{nom}.txt", encoding="utf-8").read().splitlines()
    sondes = []
    for l in texte:
        m = LIGNE.match(l)
        if m:
            t, http, s, a, c, err, qs, qa, qc, reste = m.groups()
            page = (int(s), int(a), int(c)) if http else None
            api = tuple(int(x) if x.isdigit() else None for x in (qs, qa, qc))
            sondes.append((float(t), page, api, reste.strip()))
    plein = lambda x: x is not None and all(v is not None and v > 0 for v in x)
    vide_page = lambda p: p is None or any(v == 0 for v in p)
    api_pleine = [t for t, p, q, r in sondes if plein(q)]
    cachees = [(t, p, q) for t, p, q, r in sondes if vide_page(p) and plein(q)]
    page_pleine = [t for t, p, q, r in sondes if plein(p)]
    print(f"== {nom} : {len(texte)} lignes parcourues, {len(sondes)} sondes lues")
    print(f"   API pleine pour la 1re fois : {api_pleine[0] if api_pleine else '-'} s ; page pleine pour la 1re fois : {page_pleine[0] if page_pleine else '-'} s")
    print(f"   sondes où la page est VIDE (ou en erreur) PENDANT que l'API rend une liste PLEINE : {len(cachees)} sur {len(sondes)}"
          + (f" (de +{cachees[0][0]} s à +{cachees[-1][0]} s)" if cachees else ""))
    vides_partout = [t for t, p, q, r in sondes if vide_page(p)]
    print(f"   sondes où la page est vide (toutes causes) : {len(vides_partout)}" + (f" (de +{vides_partout[0]} s à +{vides_partout[-1]} s)" if vides_partout else ""))
