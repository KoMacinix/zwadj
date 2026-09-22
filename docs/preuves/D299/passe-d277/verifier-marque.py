"""Passe D277 de D299 à la marque — CONTRÔLE DE TRAITEMENT. Pour chaque occurrence des motifs du SENS 1
(`compteur-deux`, `aucun-lot-de-code`, `non-certifie-17-18`, `permission-consommee`, `rang19-ouvert`) située
HORS d'une section datée (« ## Session », « ## Incident », « ## Registre »), dit si elle est TRAITÉE :
barrée (dans un `~~…~~` ouvert sur sa ligne), ou suivie d'une annotation « D299 » dans les 8 lignes qui
suivent. Imprime les NON TRAITÉES une à une, puis le parcouru à côté de l'attendu (D290).
Usage, depuis la racine : python3 docs/preuves/D299/passe-d277/verifier-marque.py <sortie de situer.py>
⚠ Classement par TITRE, jamais par mot (D284 : une entrée close peut porter une phrase courante — c'est
pourquoi les points d'entrée clos restent dans le champ).
⛔ ANGLE MORT TROUVÉ AVANT DE CONCLURE, ET CORRIGÉ ICI : l'ORDRE DES RANGS vit sous un titre « ## Session du
31/08/2026 — D270 ». Exclure les sections datées par leur seul titre `##` l'aurait SAUTÉ — c'est le bloc le
plus courant du fichier. ⇒ Le sous-titre « ### D270 — ordre des lots » est ramené dans le champ, repéré par
son TEXTE (jamais par un numéro de ligne, qui bouge à chaque écriture)."""
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
SENS1 = {"compteur-deux", "aucun-lot-de-code", "non-certifie-17-18", "permission-consommee", "rang19-ouvert"}
DATEES = ("## Session", "## Incident", "## Registre")
ORDRE = "### D270 — ordre des lots, révisé par Ko"
lignes = {}
examinees = traitees = 0
non_traitees = []
cont = open("ZWADJ_CONTINUITE.md", encoding="utf-8").read().split("\n")
debut = [i + 1 for i, x in enumerate(cont) if x.rstrip("\r") == ORDRE]
if len(debut) != 1:
    print(f"ABANDON : le titre de l'ordre des rangs est trouvé {len(debut)} fois (attendu 1)")
    sys.exit(2)
fin = next(i + 1 for i in range(debut[0], len(cont)) if cont[i].startswith("#"))
print(f"== ordre des rangs : lignes {debut[0]} à {fin - 1}, ramenées dans le champ")
for l in open(sys.argv[1], encoding="utf-8"):
    m = re.match(r"^(\S+):(\d+) \[([^\]]+)\] (## .*)$", l.rstrip("\n"))
    if not m:
        continue
    f, n, motif, titre = m.group(1), int(m.group(2)), m.group(3), m.group(4)
    dans_ordre = f == "ZWADJ_CONTINUITE.md" and debut[0] <= n < fin
    if motif not in SENS1 or (titre.startswith(DATEES) and not dans_ordre):
        continue
    if f not in lignes:
        lignes[f] = open(f, encoding="utf-8").read().split("\n")
    L = lignes[f]
    examinees += 1
    fenetre = "\n".join(L[n - 1:n + 8])
    barre = L[n - 1].count("~~") % 2 == 1 or "~~" in L[n - 1][: max(0, L[n - 1].find("ompteur"))]
    if "D299" in fenetre or barre:
        traitees += 1
    else:
        non_traitees.append(f"{f}:{n} [{motif}] {titre[:80]}")
for x in non_traitees:
    print(f"   ✗ NON TRAITÉE : {x}")
print(f"== occurrences du sens 1 hors sections datées examinées : {examinees} · traitées {traitees} · "
      f"non traitées {len(non_traitees)} (attendu 0, à trier une à une)")
