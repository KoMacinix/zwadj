"""Passe D277 du rang 16 (D294) — les DEUX sens, sur texte APLATI.

Usage, depuis la racine : python docs/preuves/D294/outils/passe-d277.py motifs.txt

POURQUOI IL EXISTE
  D277 : ecrire une decision dans un fichier d'autorite ne suffit pas, il faut la porter
  PARTOUT ou un autre fichier d'autorite la contredit. D287 : la passe cherche AUSSI ce que
  le lot REND PERMIS — une permission perimee ne contredit aucun mot du lot, donc aucune
  recherche par contradiction ne la ramene.

POURQUOI APLATI, ET C'EST MESURE (D289)
  Ces fichiers sont enveloppes a ~95 colonnes : toute expression de plus de quelques mots y
  est coupee au moins une fois. `grep` et `git log -S` ne franchissent pas un retour a la
  ligne — une coquille signalee au backlog est restee introuvable par les deux avant d'etre
  vue sur le texte aplati.

POURQUOI LES MOTIFS SONT DANS UN FICHIER (D289 + D290)
  Aucun texte ne transite par un interpreteur : ni `-c`, ni guillemets doubles, ni argument
  de ligne de commande. Le script LIT le fichier. Deux commandes ont deja ete cassees par un
  accent grave non echappe, dont l'une cherchait les traces d'une corruption par accents
  graves.

INSTRUMENTS ECARTES
  - `grep` ligne a ligne : aveugle a ce qui enjambe un retour a la ligne (ci-dessus).
  - la recherche sensible a la casse : la passe de D293 a compte 31 occurrences DEUX FOIS
    parce que « rang 15 » et « RANG 15 » ne differaient que par elle. Ici la casse est
    ignoree et les positions sont DEDUPLIQUEES.
  - `.split("\\n")` pour compter : rend un element vide final sur un fichier termine par un
    saut de ligne, donc +1 systematique (defaut releve dans `extraire-e2e.py`, D294).
  - ⛔ LA PREMIERE VERSION DE CE SCRIPT, ECARTEE PAR SA PROPRE SORTIE (gardee a cote :
    `passe-d277-sortie-FAUTIVE-motifs-non-replies.txt`). Elle comparait les motifs au texte
    BRUT : « serre a 5 s » ne trouvait pas « serré à 5 s », « au juge » ne trouvait pas
    « au jugé », « testTimeout de » ne trouvait pas « `testTimeout` de ». SIX motifs sur
    seize ont rendu ZERO EN SILENCE, et le total — 302 — avait l'air d'une mesure saine.
    ⚠ ELLE N'A PAS LEVE, ELLE A REPONDU (D275). Vue seulement parce que le compte PAR MOTIF
    a ete imprime : sans lui, six angles morts passaient pour six absences.
  => D'ou les deux replis ci-dessous, ET l'impression du compte PAR MOTIF, qui est ce qui
     rend un zero lisible comme un zero.

DEUX REPLIS APPLIQUES AU TEXTE *ET* AU MOTIF
  1. ACCENTS : decomposition NFD puis retrait des marques combinantes. « jugé » et « juge »
     deviennent comparables, « à » et « a » aussi.
  2. BALISAGE : accents graves et asterisques retires. Ces fichiers ecrivent
     « `testTimeout` de » et « **le rang n'est pas CLOS** » — le balisage coupe une
     expression aussi surement qu'un retour a la ligne. Les `~~` sont GARDES : ils sont
     l'indice qu'une affirmation est barree, donc l'information qu'on vient trier.

CALIBRATION, DEUX BRAS, REJOUEE A CHAQUE INVOCATION (D286)
  - bras positif : un motif dont on connait deja la reponse DOIT etre trouve ;
  - bras negatif : un motif absurde NE DOIT PAS l'etre. Un detecteur qui repondrait « trouve »
    a tout passerait le bras positif seul et declarerait fautif ce qui est sain.
  ABANDON si un seul des deux bras manque son verdict.

CE QU'IL IMPRIME (D290)
  A cote de chaque total, CE QU'IL A PARCOURU — fichiers ouverts, caracteres, occurrences
  vues — et l'ATTENDU a cote du mesure la ou un attendu existe. Un « 0 » sur zero element
  parcouru n'est pas une mesure : c'est un silence qui a la forme d'un resultat.
"""
import io
import re
import sys
import unicodedata

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")

if len(sys.argv) != 2:
    sys.exit("ABANDON : usage passe-d277.py <fichier-de-motifs>")

FICHIERS = ["ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md", "AGENTS.md", "CLAUDE.md"]


def replier(texte):
    """Casse, accents et balisage. Applique au TEXTE et au MOTIF, sinon ils ne se comparent
    pas — c'est la faute qui a fait ecarter la premiere version (voir l'en-tete)."""
    sans_accent = "".join(c for c in unicodedata.normalize("NFD", texte)
                          if not unicodedata.combining(c))
    return sans_accent.lower().replace("`", "").replace("*", "")


def aplatir(chemin):
    return re.sub(r"\s+", " ", io.open(chemin, encoding="utf-8").read())


def occurrences(plat, motif):
    """Positions distinctes, casse/accents/balisage replies. Deduplique : voir
    INSTRUMENTS ECARTES. ⚠ Les positions indexent le texte REPLIE, qui reste aligne sur
    le texte aplati tant que le repli ne fait que substituer ou retirer des caracteres
    — le contexte imprime vient donc du texte replie, jamais de l'original."""
    bas, cible, vues, depart = replier(plat), replier(motif), [], 0
    if not cible:
        return vues
    while True:
        i = bas.find(cible, depart)
        if i < 0:
            return vues
        vues.append(i)
        depart = i + 1


# --- calibration, TROIS bras, sur des cas dont la reponse est connue AVANT de chercher -----
# Le 3e bras est ne de la faute de la 1re version : sans lui, un motif accentue ou balise
# rend zero en silence et l'instrument passe quand meme.
temoin = aplatir("CLAUDE.md")
bras_positif = len(occurrences(temoin, "ZWADJ_CONTINUITE.md"))      # connu present
bras_negatif = len(occurrences(temoin, "zzzz-motif-absurde-zzzz"))  # connu absent
# connu present, mais ECRIT ACCENTUE ET BALISE dans CLAUDE.md : « décisions numérotées »
bras_repli = len(occurrences(temoin, "decisions numerotees"))
print("== CALIBRATION (CLAUDE.md, %d caracteres aplatis)" % len(temoin))
print("   bras positif  'ZWADJ_CONTINUITE.md'   : %d (attendu >= 1)" % bras_positif)
print("   bras negatif  'zzzz-...-zzzz'         : %d (attendu 0)" % bras_negatif)
print("   bras repli    'decisions numerotees'  : %d (attendu >= 1 — le texte porte"
      " « décisions numérotées », accentue)" % bras_repli)
if bras_positif < 1 or bras_negatif != 0 or bras_repli < 1:
    sys.exit("ABANDON : la calibration a manque un verdict — l'instrument n'est pas cru")
print("   => 3 bras sur 3\n")

motifs = []
for ligne in io.open(sys.argv[1], encoding="utf-8").read().splitlines():
    t = ligne.strip()
    if t and not t.startswith("#"):
        motifs.append(t)

total_caracteres = 0
total_vues = 0
fichiers_ouverts = 0
par_motif = dict((m, 0) for m in motifs)
for chemin in FICHIERS:
    plat = aplatir(chemin)
    replie = replier(plat)
    total_caracteres += len(plat)
    fichiers_ouverts += 1
    for motif in motifs:
        for i in occurrences(plat, motif):
            total_vues += 1
            par_motif[motif] += 1
            print("[%s] <<%s>>" % (chemin, motif))
            print("    ... %s ..." % replie[max(0, i - 260):i + 260])

print("\n== PARCOURU : %d fichiers ouverts · %d caracteres aplatis · %d motifs"
      % (fichiers_ouverts, total_caracteres, len(motifs)))
print("== OCCURRENCES VUES : %d" % total_vues)
print("\n== COMPTE PAR MOTIF — c'est ce tableau qui rend un ZERO lisible comme un zero.")
print("==   Un motif a 0 est soit une absence REELLE (information), soit un angle mort de")
print("==   l'instrument. Les distinguer demande de connaitre la reponse : on la releve,")
print("==   on ne la devine pas. La 1re version de ce script en avait SIX, tous invisibles.")
muets = 0
for motif in motifs:
    n = par_motif[motif]
    if n == 0:
        muets += 1
    print("   %-28s %4d%s" % (motif, n, "   <-- ZERO : a confronter au texte brut" if n == 0 else ""))
print("== MOTIFS A ZERO : %d sur %d" % (muets, len(motifs)))
print("== ⚠ UN COMPTE NE SE LIT PAS SEUL : chaque occurrence se juge sur son CONTEXTE —")
print("==   barree, datee, ou courante. Le tri est ecrit dans la section D294, pas ici.")
