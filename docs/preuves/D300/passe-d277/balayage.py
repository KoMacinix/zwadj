"""Passe D277 de D300 (rang 20 : l'ordre des rangs sort de la section D270 et reçoit son titre `##`).
Usage, depuis la racine : python3 docs/preuves/D300/passe-d277/balayage.py <fichier-de-motifs>
Fichier de motifs : une ligne = nom, blancs, expression ; « # » en tête = commentaire. Lu dans un FICHIER (D289).
Pour chaque occurrence, sur le texte APLATI (D294 — ces fichiers sont enveloppés à ~95 colonnes), débarrassé de
TOUT `*` — gras et italique : l'outil de D291 était aveugle au gras, et un `*` simple coupe une expression tout
autant —, des accents graves (D295 — « `testTimeout` de » ne se trouvait pas en texte brut) et du marqueur de citation
`> ` en tête de ligne (l'en-tête de `ZWADJ_CONTINUITE.md` en est une : sans ce retrait, une expression coupée par
un retour à la ligne y porte un « > » en son milieu) : fichier, LIGNE réelle, titre `## ` englobant, CLASSE,
contexte.
CLASSE, par TITRE et jamais par mot (règle de D299) : dans `ZWADJ_CONTINUITE.md`, « DATÉE » sous un titre
« ## Session », « ## Incident » ou « ## Registre », « COURANTE » ailleurs ; dans `ZWADJ_BACKLOG.md`, « BACKLOG »
(une entrée ouverte se lit comme courante, D284 : tri à la main) ; `AGENTS.md` et `CLAUDE.md` « COURANTE ».
⚠ Pourquoi un script neuf et pas celui de D299 : `verifier-marque.py` ÉPINGLE le sous-titre de l'ordre et ABANDONNE
s'il ne le trouve pas une fois — c'est le cas particulier que ce lot rend inutile. Celui-ci ne connaît aucun titre
en particulier : il classe TOUT par la même règle, et c'est elle qui doit voir l'ordre après le déplacement.
CALIBRATION, rejouée à chaque invocation, deux bras (D286) : un texte construit où la phrase cherchée est coupée par
un retour à la ligne CRLF, derrière `> `, en gras, en italique et entre accents graves ⇒ 1 exactement ; le même texte avec « D271 »
⇒ 0. Un bras manqué ⇒ ABANDON. Imprime la ventilation par motif et par classe, les motifs à ZÉRO sous un intitulé
qui les nomme (D295), et le parcouru à côté de l'attendu compté sur les octets (D290)."""
import bisect
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO (pnpm-workspace.yaml introuvable).")
    sys.exit(2)
FICHIERS = ["AGENTS.md", "CLAUDE.md", "ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md"]
DATEES = ("Session", "Incident", "Registre")


def aplatir(brut):
    """Texte aplati, et pour chaque caractère aplati sa position dans le brut."""
    plat, orig, blanc, debut_ligne, i = [], [], False, True, 0
    while i < len(brut):
        c = brut[i]
        if c in "*`" or (debut_ligne and c == ">"):
            i += 1
            continue
        if c == "\n":
            debut_ligne = True
        elif not c.isspace():
            debut_ligne = False
        if c.isspace():
            if not blanc:
                plat.append(" ")
                orig.append(i)
            blanc = True
        else:
            plat.append(c)
            orig.append(i)
            blanc = False
        i += 1
    return "".join(plat), orig


# calibration — deux bras, jouée AVANT tout comptage
TEMOIN = "> l'**ordre** des *rangs*\r\n> (`ZWADJ_CONTINUITE.md`, section\r\n> D270) dit QUEL lot\r\n"
RX_TEMOIN = re.compile(r"(?i)ordre des rangs \(ZWADJ_CONTINUITE\.md, section D270\)")
positif = len(RX_TEMOIN.findall(aplatir(TEMOIN)[0]))
negatif = len(RX_TEMOIN.findall(aplatir(TEMOIN.replace("D270", "D271"))[0]))
print(f"CALIBRATION : bras positif {positif} (attendu 1) · bras négatif {negatif} (attendu 0)")
if (positif, negatif) != (1, 0):
    print("✗ ABANDON : l'aplatissement ne rend pas le cas connu")
    sys.exit(2)

motifs = []
for ligne in open(sys.argv[1], encoding="utf-8"):
    ligne = ligne.rstrip("\r\n")
    if ligne and not ligne.startswith("#"):
        nom, rx = re.split(r"\s+", ligne, maxsplit=1)
        motifs.append((nom, re.compile(rx)))
ventil = {nom: {} for nom, _ in motifs}
car = lignes_vues = lignes_attendues = 0
for f in FICHIERS:
    octets = open(f, "rb").read()
    brut = octets.decode("utf-8")
    lignes_attendues += octets.count(b"\n")
    plat, orig = aplatir(brut)
    car += len(plat)
    debuts = [0] + [m.end() for m in re.finditer("\n", brut)]
    lignes_vues += len(debuts) - (1 if brut.endswith("\n") else 0)
    titres = [(m.start(), m.group(1)) for m in re.finditer(r"(?m)^## (.*)$", brut)]
    pos = [p for p, _ in titres]
    for nom, rx in motifs:
        for m in rx.finditer(plat):
            p = orig[m.start()]
            no = bisect.bisect_right(debuts, p)
            k = bisect.bisect_right(pos, p) - 1
            titre = titres[k][1] if k >= 0 else "(avant tout titre ##)"
            if f == "ZWADJ_BACKLOG.md":
                classe = "BACKLOG"
            elif f == "ZWADJ_CONTINUITE.md" and titre.startswith(DATEES):
                classe = "DATÉE"
            else:
                classe = "COURANTE"
            ventil[nom][classe] = ventil[nom].get(classe, 0) + 1
            ctx = plat[max(0, m.start() - 110):m.end() + 110]
            print(f"{f}:{no} [{nom}] {classe} ## {titre[:70]}\n      …{ctx}…")
print("== ventilation par motif et par classe :")
for nom, par in ventil.items():
    print(f"   {nom:28s} total {sum(par.values()):4d} · "
          + " · ".join(f"{c}={n}" for c, n in sorted(par.items())))
zero = [n for n, par in ventil.items() if not par]
print("== motifs à ZÉRO — des hypothèses à vérifier, pas des absences (D295) : " + (", ".join(zero) or "aucun"))
print(f"== parcourus : {len(FICHIERS)} fichiers · {lignes_vues} lignes (attendu {lignes_attendues}, compté sur les "
      f"octets) · {car} caractères aplatis · {len(motifs)} motifs · "
      f"{sum(sum(p.values()) for p in ventil.values())} occurrences")
if lignes_vues != lignes_attendues:
    print("✗ ÉCART AU PARCOURU — ne rien conclure")
    sys.exit(1)
