"""Relecteur du lot D294 — on relit LE FICHIER, jamais le compte rendu de l'outil d'edition.

Usage, depuis la racine : python docs/preuves/D294/outils/relire-d294.py

POURQUOI (D289)
  Un compte rendu d'outil decrit ce que l'outil a FAIT ; seul le fichier dit ce qu'il CONTIENT.
  Un texte d'autorite passe par un interpreteur est du code qu'on lui donne : ici rien ne
  transite par un shell, le script lit les fichiers et cherche des jetons ecrits en clair.

POURQUOI L'ATTENDU EST « >= 1 » ET NON UN CHIFFRE (D290 + D293)
  D293 a ecrit DEUX fois un attendu compte DE TETE, et s'est fait rendre l'ecart par son propre
  relecteur (« `657e9ba` x 3 » alors qu'il y est deux fois ; « ouverture-16-09/ x 2 » alors
  qu'il y est une fois). La lecon retenue : un attendu se RELEVE, il ne se devine pas — et
  quand la quantite exacte n'a pas ete relevee AVANT l'ecriture, le seul attendu honnete est
  la PRESENCE. On ecrit donc « >= 1 », et le compte mesure est imprime a cote pour etre lu.
  ⚠ Et un attendu releve avant la derniere modification n'est plus un attendu (D218) : ce
  script se rejoue APRES la derniere ecriture, jamais avant.

CE QU'IL IMPRIME (D290)
  A cote de chaque verdict, CE QU'IL A PARCOURU. Un « present » sur un fichier vide ou non lu
  n'est pas une mesure.

CALIBRATION, DEUX BRAS, REJOUEE A CHAQUE INVOCATION (D286)
  - positif : un jeton connu present AVANT ce lot (« Registre des decisions ») ;
  - negatif : un jeton absurde, qui doit rendre 0.
  Un detecteur qui repondrait « present » a tout passerait le bras positif seul.
  ABANDON si un bras manque son verdict.
"""
import io
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")

CONT = "ZWADJ_CONTINUITE.md"
BACK = "ZWADJ_BACKLOG.md"
AGEN = "AGENTS.md"
RECT = "docs/preuves/D293/outils/RECTIFICATION-D294.txt"

# (fichier, jeton attendu present, ce que ce jeton prouve)
ATTENDUS = [
    (CONT, "CLOS LE 11/09/2026 (D286) — TITRE ALIGNÉ", "constat 1 — titre du rang 8 aligne"),
    (CONT, "~~⛔ **CE LOT EST OUVERT ET À MI-PARCOURS.**~~", "constat 1 — phrase barree"),
    (CONT, "LES SIX ÉTAPES SONT FAITES (D279 + D282), RANG CLOS (D286)", "constat 1 — sous-titre"),
    (CONT, "ET C'EST LA SEULE DES CINQ QUI ÉTAIT RESTÉE COURANTE", "constat 1 — 1er paragraphe"),
    (CONT, "SECONDE MOITIÉ DE LA RÈGLE, AJOUTÉE LE 16/09/2026 (D294)", "regle de D282 completee"),
    (CONT, "PÉRIMÉE SUR SES TROIS TERMES", "constat 2 — testTimeout barre"),
    (CONT, "RAISON BARRÉE LE 16/09/2026 (D294), DETTE CONSERVÉE", "constat 3 — bac a sable"),
    (CONT, "LE JOURNAL EN PORTE 910, PAS 911", "constat 5 — rectification"),
    (CONT, "L'ARCHIVE N'EST PAS RETOUCHÉE, ET C'EST DÉLIBÉRÉ", "constat 5 — archive intacte"),
    (CONT, "LE JOURNAL e2e N'ENTRE PAS AU DÉPÔT", "decision 1 — point 9 du critere"),
    (CONT, "Session du 16/09/2026 — D294", "section de session D294"),
    (CONT, "| D294 | A |", "ligne de registre D294"),
    (CONT, "PROCHAIN LOT~~ — rang 16", "bloc du rang 16"),
    (CONT, "RANG 17 : EN ATTENTE D'ARBITRAGE DE KO", "etat nomme du rang suivant (D284)"),
    (CONT, "CE MOTIF VAUT DE LA FORME (a), PAS DE LA FORME (b)", "sens 2 — occurrence 1"),
    (CONT, "VAUT DE LA FORME (a), PAS DE (b)", "sens 2 — occurrence 2"),
    (BACK, "NI (1) NI (2) : L'EXTRAIT S'ÉLARGIT", "decision 1 au backlog"),
    (BACK, "FORME ARBITRÉE PAR KO LE 16/09/2026 (D294) — C'EST (b)", "decision 2 au backlog"),
    (BACK, "Reports du 16/09/2026 — rang 16", "section de reports D294"),
    (BACK, "LE TITRE DE CETTE ENTRÉE", "constat 6 — une ligne"),
    (BACK, "DEUX DES QUATRE ENTRÉES CI-DESSOUS SONT CLOSES", "constat 7 — une ligne"),
    (AGEN, "RÉPARÉE — ÉCRIT ICI LE 16/09/2026 (D294)", "constat 4 — reparation vite.config"),
    (AGEN, "ET LE POINT D'ENTRÉE D'UN RANG SE RAFRAÎCHIT", "regle de D282, portee dans AGENTS"),
    (RECT, "lignes parcourues : 911", "rectification cite le chiffre fautif"),
]

# --- calibration, deux bras ---------------------------------------------------------------
temoin = io.open(CONT, encoding="utf-8").read()
pos = temoin.count("Registre des décisions")
neg = temoin.count("zzzz-jeton-absurde-zzzz")
print("== CALIBRATION (%s, %d caracteres lus)" % (CONT, len(temoin)))
print("   bras positif 'Registre des décisions' : %d (attendu >= 1)" % pos)
print("   bras negatif 'zzzz-...-zzzz'          : %d (attendu 0)" % neg)
if pos < 1 or neg != 0:
    sys.exit("ABANDON : calibration manquee — le relecteur n'est pas cru")
print("   => 2 bras sur 2\n")

cache = {}
manquants = 0
octets = 0
for chemin, jeton, quoi in ATTENDUS:
    if chemin not in cache:
        cache[chemin] = io.open(chemin, encoding="utf-8").read()
        octets += len(cache[chemin])
    n = cache[chemin].count(jeton)
    etat = "OK " if n >= 1 else "MANQUANT"
    if n < 1:
        manquants += 1
    print("%-8s %-22s x%-3d (attendu >= 1)  %s" % (etat, chemin.split("/")[-1], n, quoi))

print("\n== PARCOURU : %d fichiers ouverts · %d caracteres lus · %d jetons cherches"
      % (len(cache), octets, len(ATTENDUS)))
print("== MANQUANTS : %d (attendu 0)" % manquants)
if manquants:
    sys.exit("ABANDON : un jeton attendu n'est pas dans le fichier — l'ecriture n'a pas eu lieu")
print("== ✓ tout ce que ce lot dit avoir ecrit est DANS les fichiers.")
