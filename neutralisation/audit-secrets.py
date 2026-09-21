#!/usr/bin/env python3
"""AUDIT DE SECRETS DES PREUVES VERSÉES — rang 18, D298. Instrument, PAS une campagne.

Depuis la RACINE du monorepo :
    python3 neutralisation/audit-secrets.py                      # calibration, puis audit
    python3 neutralisation/audit-secrets.py --sortie docs/preuves/<Dnnn>/audit-secrets-<dnnn>.txt
                                                                # idem, et sortie SCELLÉE, versable
    python3 neutralisation/audit-secrets.py --calibration-seule  # rejoue la calibration, n'audite rien
    python3 neutralisation/audit-secrets.py --cas-reel <journal> # autre emplacement du cas réel connu
Codes de sortie : 0 = aucune alerte ; 1 = alertes (le tri est humain, il se lit dans la sortie) ;
2 = ABANDON (calibration manquée, registre incohérent) — rien n'a été audité.

POURQUOI IL EXISTE. L'audit versé par D293 (`docs/preuves/D293/outils/audit-secrets.py`)
n'exclut que ses sorties DE SON PROPRE DOSSIER. Toute sortie versée ailleurs est
réauditée au versement suivant, et les contextes d'alerte qu'elle recite se recomptent
comme des alertes : 83 → 185 → 244 pour zéro fuite nouvelle (D296, D297). Un « attendu
0 » jamais atteint apprend à ne plus lire le compte (D275) — et c'est là qu'une vraie
fuite passerait. Mesuré le 21/09/2026 : sur 244 alertes, l'écho en pèse 154 ; la sortie
de D297, réauditée, en ajouterait 189.
⛔ POURQUOI UN INSTRUMENT NOUVEAU ET PAS UNE RETOUCHE (contrainte de Ko, D298) : l'outil de
D293 est une PIÈCE versée, et un instrument se corrige avec la pièce qu'il a produite ou
pas du tout (D295). Il reste en place, intact. ⛔ C'EST CELUI-CI QUI FAIT FOI DEPUIS D298.

CE QUI EST EXCLU — PAR L'IDENTITÉ DES OCTETS, JAMAIS PAR LE NOM.
  1. Les sorties des TROIS instruments prédécesseurs qui portent un audit de secrets :
     `D291/controles/integrite-et-secrets.py`, `D293/versement-d288/verser-et-confronter.py`,
     `D293/outils/audit-secrets.py`. Retenues parce qu'elles portent la LIGNE DE BILAN d'un
     audit, pas parce qu'elles alertent : le critère est l'ORIGINE — exclure « ce qui
     alerte » serait exclure par le résultat. Chacune est ÉPINGLÉE par CHEMIN et EMPREINTE
     SHA-256 (liste dérivée du disque le 21/09/2026, jamais retapée). Une pièce ne se
     retouche pas (D291) : une empreinte qui change dit qu'autre chose que la sortie connue
     est là — le fichier est alors AUDITÉ, et signalé.
  2. Ses PROPRES sorties, écrites par `--sortie` et SCELLÉES : la dernière ligne porte
     l'empreinte SHA-256 de tout ce qui la précède. Sceau vérifié ⇒ exclue ; un octet
     ajouté, retiré ou changé, avant ou après le sceau ⇒ auditée.
     ⚠ Une sortie versée s'écrit par `--sortie`, JAMAIS par redirection : PowerShell 5.1
     réencode en UTF-16, et le sceau ne couvrirait plus les octets versés.
  ⇒ Pour CHAQUE exclusion, la sortie imprime le chemin, la raison, et les alertes que le
  fichier AURAIT rendues : une exclusion silencieuse est un audit tronqué (Ko ; D200).
  Exclure veut dire exactement : ne pas RECOMPTER un contenu, à l'octet près, déjà audité
  et trié par la décision qui l'a versé.

INSTRUMENTS CONCURRENTS ÉCARTÉS, ET SUR QUELLE MESURE (D286).
  · Exclure par NOM (`audit-secrets*.txt` où qu'il soit) : un jeton réel dans une pièce
    neuve ainsi nommée serait caché. C'est le bras (d) ci-dessous ; la contre-épreuve de
    D298 montre qu'une exclusion par nom le manque (`docs/preuves/D298/contre-epreuve/`).
  · Exclure LIGNE PAR LIGNE ce qui porte un masque « <N car. masques> » : mesuré le
    21/09/2026 sur les quatre sorties d'audit les plus lourdes, 113 correspondances sur 341
    ne sont suivies d'AUCUN masque — lignes de bilan des prédécesseurs, contextes imbriqués
    tronqués à 200 caractères. Une règle de ligne assez large pour les couvrir couvrirait
    du texte ordinaire (`docs/preuves/D298/lecture/echo-par-ligne.txt`).
  · Retoucher l'exclusion de l'outil de D293 : refusé par Ko, voir plus haut.

LES MOTIFS sont les ONZE de D293, recopiés à l'identique : deux passes qui se comparent
comptent la même chose (D290). Identité vérifiée par D298 (`docs/preuves/D298/lecture/`).
Les littéraux qui se détecteraient eux-mêmes sont assemblés à l'exécution (leçon D291).
« chemin local » reste INFORMATIF : rapporté, jamais compté comme alerte.

CALIBRATION — rejouée à CHAQUE invocation, EN MÉMOIRE (rien n'est écrit sur le disque),
ABANDON si un seul bras manque son verdict (D286). Aucune valeur n'est imprimée.
  motifs          chacun trouve 1 occurrence dans son échantillon positif, 0 dans le propre ;
  positif         (Ko) une pièce NEUVE portant un jeton de la FORME RÉELLE du journal e2e
                  (ligne `[WebServer]`, lien de vérification d'e-mail, 43 caractères
                  base64url) est VUE : 1 alerte, motif `jeton` ;
  écho            (Ko) les sorties épinglées, LUES SUR LE DISQUE, et une sortie scellée par
                  cet instrument ne rendent AUCUNE alerte, sont TOUTES listées exclues, et
                  les alertes qu'elles auraient rendues sont > 0 — sinon rien n'a été exclu ;
  discrimination  (ajouté par la session, D298) le même jeton ajouté (a) à une sortie
                  épinglée, à son chemin, (b) après le sceau d'une sortie scellée, (c) avant
                  ce sceau, (d) dans une pièce neuve NOMMÉE comme une sortie d'audit, est VU
                  dans les quatre cas, et compte exactement pour un : l'exclusion tient à
                  l'IDENTITÉ des octets et à rien d'autre ;
  cas réel        (Ko) le journal e2e du rang 15, HORS DÉPÔT, placé dans une pièce neuve,
                  rend 24 alertes, toutes `jeton` (910 lignes, 24 jetons de 43 caractères :
                  relevé par D293, recompté par D298). ⚠ Il vérifie d'abord que le cas a bien
                  EU LIEU (empreinte épinglée, 24 jetons comptés par une autre expression).
                  Absent (clone, autre poste) ⇒ bras NON REJOUÉ, dit en tête et au bilan ; les
                  bras construits se rejouent partout.

SORTIE : calibration ; exclusions ; fichiers audités avec leurs marques ; bilan — fichiers et
octets PARCOURUS, AUDITÉS, EXCLUS, alertes et attendu (D290), ventilation PAR MOTIF et motifs
à zéro nommés (D295) ; contexte de chaque alerte, valeur masquée, avec le nombre de fichiers
suivis hors preuves qui la portent déjà (D275).
⚠ LIMITE, ÉCRITE : cet instrument retire l'ÉCHO, il n'atteint pas « attendu 0 ». Au 21/09/2026,
90 alertes ne sont pas de l'écho — titres de tests recopiés dans les rapports versés, outils
qui nomment le motif qu'ils cherchent. Triées, rapportées au backlog, NON exclues.
"""
import argparse
import hashlib
import os
import re
import subprocess
import sys

# ⛔ Console cp1252 sur le poste de Ko : sans ces lignes, le premier « ✓ » lève (D268).
for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")

if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO (pnpm-workspace.yaml introuvable).")
    print(f"  dossier courant : {os.getcwd()}")
    sys.exit(2)

# ---------------------------------------------------------------------------------------
# LES ONZE MOTIFS DE D293, À L'IDENTIQUE — et leurs deux bras de calibration.
# ---------------------------------------------------------------------------------------
TIRETS = "-" * 5
MOTIFS = {
    "url-avec-identifiants": r"[a-z][a-z0-9+.-]*://[^\s:/@]+:[^\s@]+@",
    "mot-de-passe": r"pass(word|wd)\s*[\"']?\s*[:=]",
    "valeur-nommee-secrete": r"secret\s*[\"']?\s*[:=]",
    "jeton": r"(access|refresh|id|api)?_?token\s*[\"']?\s*[:=]",
    "jwt": r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.",
    "porteur": r"bearer\s+[A-Za-z0-9._~+/-]{16,}",
    "cle-privee": re.escape(TIRETS + "BEG" + "IN"),
    "google-client": re.escape("GOC" + "SPX-"),
    "aws": r"AKIA[0-9A-Z]{16}",
    "cle-api": r"api[_-]?key\s*[\"']?\s*[:=]",
    "chargily": "char" + "gily" + r"[^\n]{0,40}(k" + "ey|sec" + "ret)",
}
INFORMATIF = {"chemin-local": "ben" + "la"}
POSITIFS = {
    "url-avec-identifiants": "post" + "gresql://u" + "ser:mo" + "tdepasse@hote/base",
    "mot-de-passe": "pass" + "word = x",
    "valeur-nommee-secrete": "sec" + "ret: x",
    "jeton": "access_" + "tok" + "en = x",
    "jwt": "ey" + "J" + "a" * 12 + "." + "b" * 12 + ".c",
    "porteur": "Bear" + "er " + "Z" * 20,
    "cle-privee": TIRETS + "BEG" + "IN RSA",
    "google-client": "GOC" + "SPX-abc",
    "aws": "AK" + "IA" + "A" * 16,
    "cle-api": "api" + "_key: x",
    "chargily": "char" + "gily k" + "ey",
}
PROPRE = "✓ S11b-11. L'ÉCRÊTAGE S'INVERSE — `min` devient `max`  [echeances]"

# ---------------------------------------------------------------------------------------
# LES SORTIES PRÉDÉCESSEURES, ÉPINGLÉES — dérivées du disque le 21/09/2026 : tout fichier de
# `docs/preuves/` portant la ligne de bilan d'un audit (BILAN ci-dessous), attribué à son
# instrument producteur. 17 fichiers sur 331 parcourus. Procédure : `docs/preuves/D298/lecture/`.
# ---------------------------------------------------------------------------------------
BILAN = re.compile(r"^\s*parcourus : \d+ fichiers, \d+ octets · alertes( de secret)? : \d+ \(attendu 0\)", re.M)
EPINGLEES = [
    ("docs/preuves/D291/controles/integrite-et-secrets-avant-commit-1.txt", "942bc2dc6e470a30754c8fabf359bc67407f972d98fb822ba8ee7d35d36c953f", "D291/controles/integrite-et-secrets.py"),
    ("docs/preuves/D291/controles/integrite-et-secrets-avant-commit-2.txt", "6b3f4fb79e531dff994d936dc195c0494d621a1b096a24752bd2cf69f3302714", "D291/controles/integrite-et-secrets.py"),
    ("docs/preuves/D291/controles/integrite-et-secrets-premiere-execution.txt", "3430e66d63b9b6e7e501945529e9cfd86f7c0255aaf178927ab003cf88c19223", "D291/controles/integrite-et-secrets.py"),
    ("docs/preuves/D293/outils/audit-secrets-final.txt", "54dc02deaf3a660a3657154d83181822620f3b8c9b8fa3a6d2cae3b04c8eeec0", "D293/outils/audit-secrets.py"),
    ("docs/preuves/D293/outils/audit-secrets-marque.txt", "5bccdcb5a1dcad305e356a50110c6f93ad54f86a1af012505033481b51ce67d2", "D293/outils/audit-secrets.py"),
    ("docs/preuves/D293/outils/audit-secrets-passe-2.txt", "ba5620ade7f52adfab4526f738a740d87c41d073df7f84c1e1ef637d56891e18", "D293/outils/audit-secrets.py"),
    ("docs/preuves/D293/outils/audit-secrets-passe.txt", "271f84fbc26820f027af04feae81f446a7a7e135ce4fa4a95ab22a2687af3529", "D293/outils/audit-secrets.py"),
    ("docs/preuves/D293/versement-d288/verser-et-confronter-avant-commit-2.txt", "12aeb0b4c2ed725c0707f2aade06c3b763aea70784d08c3b8bc4dfc35680f086", "D293/versement-d288/verser-et-confronter.py"),
    ("docs/preuves/D293/versement-d288/verser-et-confronter-avant-commit.txt", "d189f615362b024e6412dc6684f70260159a5666ea9e11502e222aa9a20f7631", "D293/versement-d288/verser-et-confronter.py"),
    ("docs/preuves/D293/versement-d288/verser-et-confronter-cloture.txt", "5cdec04eb4826e0db35d9529368368eb359b88b3200fefe34f2aa0e7df57864d", "D293/versement-d288/verser-et-confronter.py"),
    ("docs/preuves/D293/versement-d288/verser-et-confronter-lecture.txt", "241ec113bc690f59056c4097614c049e48830f257e6988e73795f3ab80661ab6", "D293/versement-d288/verser-et-confronter.py"),
    ("docs/preuves/D293/versement-d288/verser-et-confronter-refus2-2.txt", "8c8c0a01fe5ff0b08a21b7828b33055f0b271577ede01f36fe6ac69c2f1fe0f0", "D293/versement-d288/verser-et-confronter.py"),
    ("docs/preuves/D293/versement-d288/verser-et-confronter-refus2.txt", "e6c210e3d64ea1e23aca4bad67033fb5d2187955a7cff08a6faadf3e1a1522a5", "D293/versement-d288/verser-et-confronter.py"),
    ("docs/preuves/D293/versement-d288/verser-et-confronter.txt", "04cc2a0800e151cf1b88bcff6e45288779a3d7db74a5969052f093a017c24493", "D293/versement-d288/verser-et-confronter.py"),
    ("docs/preuves/D294/outils/audit-secrets-d294.txt", "d280d5a1c21422d988ce09aa900cd14e39d0000722ec27bdd8a8262f1d488f2d", "D293/outils/audit-secrets.py"),
    ("docs/preuves/D296/audit-secrets-d296.txt", "fd6cac10723a4bd6f3d58862b57bad6c51b538a3b9603d8557f6ad8479a55b65", "D293/outils/audit-secrets.py"),
    ("docs/preuves/D297/audit-secrets-d297.txt", "72448e923b12d30eb86cd6df0a23065608643d7cc160b522a9634ce24598b0d0", "D293/outils/audit-secrets.py"),
]

# ---------------------------------------------------------------------------------------
# LE SCEAU DE SES PROPRES SORTIES.
# ---------------------------------------------------------------------------------------
SCEAU_TEXTE = ("== SCEAU sha256:{} — neutralisation/audit-secrets.py : cette sortie s'exclut "
               "de l'audit tant que ce sceau couvre ses octets ==")
SCEAU = re.compile(re.escape(SCEAU_TEXTE).replace(re.escape("{}"), "([0-9a-f]{64})"))


def sceller(texte: str) -> bytes:
    corps = texte.encode("utf-8")
    if not corps.endswith(b"\n"):
        corps += b"\n"
    return corps + SCEAU_TEXTE.format(hashlib.sha256(corps).hexdigest()).encode("utf-8") + b"\n"


def sceau_valide(octets: bytes) -> bool:
    """Vrai si et seulement si la DERNIÈRE ligne est un sceau qui couvre exactement le reste."""
    if not octets.endswith(b"\n"):
        return False
    corps, sep, derniere = octets[:-1].rpartition(b"\n")
    if not sep:
        return False
    m = SCEAU.fullmatch(derniere.decode("utf-8", errors="replace"))
    return bool(m) and hashlib.sha256(corps + b"\n").hexdigest() == m.group(1)


# ---------------------------------------------------------------------------------------
# LE CAS RÉEL CONNU — hors dépôt, épinglé.
# ---------------------------------------------------------------------------------------
CAS_REEL = ".neutralisation-journaux/rang15-e2e.log"
CAS_REEL_SHA = "67354b7e73cf2d1b56789be55c5bdb2de257af30af65866f28630ae0a6e7f411"
CAS_REEL_JETONS = 24
FORME_JETON = re.compile(r"verification-email\?" + "to" + r"ken=[A-Za-z0-9_-]{43}(?![A-Za-z0-9_-])")
# Forme RELEVÉE sur le journal réel (D298), valeur construite : jamais une valeur réelle. ⚠ Le journal en
# porte DEUX — 20 lignes sur `localhost:5273/auth/`, 4 sur `localhost:3100/fr/auth/` : c'est la plus
# fréquente. Le bras « cas réel » couvre les deux (`docs/preuves/D298/lecture/cas-reel-sortie.txt`).
LIGNE_JETON = ("\x1b[2m[WebServer] \x1b[22mhttp://localhost:5273/auth/verification-email?" + "to" + "ken="
               + ("Zw4dj_calibration-" * 3)[:43]).encode("utf-8")
ICI_CALIBRATION = "docs/preuves/D000-calibration"


def compter(octets: bytes) -> dict:
    texte = octets.decode("utf-8", errors="replace")
    return {cle: len(re.findall(m, texte, flags=re.IGNORECASE)) for cle, m in MOTIFS.items()}


def classer(pieces: list) -> tuple:
    """Sépare les pièces AUDITÉES des pièces EXCLUES. Le même code sert la calibration et l'audit :
    une calibration qui passerait par un autre chemin ne calibrerait rien."""
    index = {c: (h, producteur) for c, h, producteur in EPINGLEES}
    audites, exclus, signales = [], [], []
    for chemin, octets in pieces:
        if chemin in index:
            h, producteur = index[chemin]
            if hashlib.sha256(octets).hexdigest() == h:
                if not BILAN.search(octets.decode("utf-8", errors="replace")):
                    # ⚠ `SystemExit("…")` sortirait en 1, c'est-à-dire « alertes » : un abandon rend 2.
                    print(f"ABANDON : registre incohérent — {chemin} épinglé sans ligne de bilan d'audit", flush=True)
                    sys.exit(2)
                exclus.append((chemin, octets, f"sortie de {producteur} (prédécesseur), empreinte épinglée {h[:12]}…"))
                continue
            signales.append(f"⚠ {chemin} : sortie épinglée MODIFIÉE (empreinte ≠ {h[:12]}…) — AUDITÉE")
        elif sceau_valide(octets):
            exclus.append((chemin, octets, "sortie scellée de cet instrument, sceau vérifié"))
            continue
        elif SCEAU.search(octets.decode("utf-8", errors="replace")):
            signales.append(f"⚠ {chemin} : porte un sceau de cet instrument qui ne couvre PAS ses octets — AUDITÉE")
        audites.append((chemin, octets))
    return audites, exclus, signales


def calibrer(cas_reel: str) -> tuple:
    """Rend (lignes, bras manqués, état du cas réel). N'écrit rien, n'imprime aucune valeur."""
    lignes, manques = [], []

    def bras(nom: str, ok: bool, detail: str) -> None:
        lignes.append(f"   {'✓' if ok else '✗'} {nom:15s} {detail}")
        if not ok:
            manques.append(nom)

    # motifs — les deux bras de D293
    rates = [c for c, m in MOTIFS.items()
             if len(re.findall(m, POSITIFS[c], flags=re.IGNORECASE)) != 1 or re.findall(m, PROPRE, flags=re.IGNORECASE)]
    bras("motifs", not rates, f"{len(MOTIFS) - len(rates)} sur {len(MOTIFS)} trouvent 1 dans leur positif et 0 dans le propre"
         + (f" — manquent : {', '.join(rates)}" if rates else ""))

    # positif — une pièce neuve portant un jeton de la forme réelle
    piece = (f"{ICI_CALIBRATION}/piece-neuve.log", LIGNE_JETON + b"\n")
    audites, exclus, _ = classer([piece])
    vu = compter(piece[1])
    bras("positif", len(audites) == 1 and not exclus and sum(vu.values()) == 1 and vu["jeton"] == 1,
         f"pièce neuve, jeton de la forme réelle : auditée {len(audites)} (attendu 1) · alertes {sum(vu.values())}"
         f" (attendu 1), motif jeton {vu['jeton']} (attendu 1)")

    # écho — les sorties épinglées, lues sur le disque, et une sortie scellée
    absents = [c for c, _, _ in EPINGLEES if not os.path.isfile(c)]
    if absents:
        bras("écho", False, f"{len(absents)} sortie(s) épinglée(s) absente(s) du disque : {', '.join(absents)}")
        return lignes, manques, "non rejoué (calibration abandonnée avant)"
    echo = [(c, open(c, "rb").read()) for c, _, _ in EPINGLEES]
    base_d297 = echo[-1][1]
    scellee = sceller(base_d297.decode("utf-8", errors="replace"))
    echo.append((f"{ICI_CALIBRATION}/sortie-scellee.txt", scellee))
    audites, exclus, _ = classer(echo)
    aurait = sum(sum(compter(o).values()) for _, o, _ in exclus)
    bras("écho", not audites and len(exclus) == len(echo) and aurait > 0,
         f"{len(echo)} sorties connues ({len(EPINGLEES)} épinglées + 1 scellée) : auditées {len(audites)} (attendu 0)"
         f" · exclues {len(exclus)} (attendu {len(echo)}) · alertes qu'elles auraient rendues {aurait} (attendu > 0)")

    # discrimination — le même jeton, là où une exclusion par nom ou par emplacement le cacherait
    chemin_d297 = EPINGLEES[-1][0]
    corps_scelle, _, _ = scellee[:-1].rpartition(b"\n")
    cas = {
        "(a) épinglée + jeton": ((chemin_d297, base_d297 + b"\n" + LIGNE_JETON + b"\n"), base_d297),
        "(b) après le sceau": ((f"{ICI_CALIBRATION}/sortie-scellee.txt", scellee + LIGNE_JETON + b"\n"), scellee),
        "(c) avant le sceau": ((f"{ICI_CALIBRATION}/sortie-scellee.txt",
                                corps_scelle + b"\n" + LIGNE_JETON + b"\n" + scellee[len(corps_scelle) + 1:]), scellee),
        "(d) nom d'audit": ((f"{ICI_CALIBRATION}/audit-secrets-d000.txt", LIGNE_JETON + b"\n"), b""),
    }
    vus = 0
    for nom, (piece, sans) in cas.items():
        audites, exclus, _ = classer([piece])
        delta = compter(piece[1])["jeton"] - compter(sans)["jeton"]
        vus += len(audites) == 1 and not exclus and delta == 1
    bras("discrimination", vus == len(cas),
         f"jeton ajouté (a) à une sortie épinglée, (b) après / (c) avant un sceau, (d) dans une pièce nommée comme"
         f" une sortie d'audit : vu {vus} sur {len(cas)} (attendu {len(cas)}), un de plus chaque fois")

    # cas réel — hors dépôt : il doit d'abord avoir EU LIEU
    if not os.path.isfile(cas_reel):
        etat = f"NON REJOUÉ — {cas_reel} absent (hors dépôt) ; les bras construits font foi"
        lignes.append(f"   ⚠ cas réel         {etat}")
        return lignes, manques, etat
    brut = open(cas_reel, "rb").read()
    if hashlib.sha256(brut).hexdigest() != CAS_REEL_SHA:
        etat = f"NON REJOUÉ — {cas_reel} n'est pas le fichier dont la réponse est connue (empreinte ≠)"
        lignes.append(f"   ⚠ cas réel         {etat}")
        return lignes, manques, etat
    formes = len(FORME_JETON.findall(brut.decode("utf-8", errors="replace")))
    audites, exclus, _ = classer([(f"{ICI_CALIBRATION}/journal-e2e.log", brut)])
    vu = compter(brut)
    ok = (formes == CAS_REEL_JETONS and len(audites) == 1 and not exclus
          and sum(vu.values()) == CAS_REEL_JETONS and vu["jeton"] == CAS_REEL_JETONS)
    bras("cas réel", ok, f"journal e2e du rang 15, empreinte épinglée : jetons de 43 car. comptés à part {formes}"
         f" (attendu {CAS_REEL_JETONS}) · placé dans une pièce neuve : alertes {sum(vu.values())}, motif jeton"
         f" {vu['jeton']} (attendus {CAS_REEL_JETONS})")
    return lignes, manques, "rejoué" if ok else "MANQUÉ"


def contextes_de(chemin: str, texte: str, cle: str, motif: str) -> list:
    """Même lecture que D293 : valeur masquée, et combien de fichiers suivis hors preuves la portent déjà."""
    sortie = []
    for no, ligne in enumerate(texte.split("\n"), 1):  # split("\n") NUMÉROTE, il ne compte rien (D294)
        for m in re.finditer(motif, ligne, flags=re.IGNORECASE):
            if motif.endswith("[:=]"):
                suite = re.match(r"\s*[\"']?([^\s\"',}]*)", ligne[m.end():])
                debut, valeur = m.end() + suite.start(1), suite.group(1)
            else:
                debut, valeur = m.start(), m.group(0)
            masque = ligne[:debut] + f"<{len(valeur)} car. masques>" + ligne[debut + len(valeur):]
            suivis = "valeur trop courte pour une recherche"
            if len(valeur) >= 3:
                r = subprocess.run(["git", "grep", "-l", "-F", "--", valeur], capture_output=True, text=True, encoding="utf-8")
                hors = [x for x in r.stdout.splitlines() if not x.startswith("docs/preuves/")]
                suivis = f"valeur deja presente dans {len(hors)} fichier(s) suivi(s) hors preuves"
            sortie.append(f"  [{cle}] {chemin}:{no} : {masque.strip()[:200]}\n      -> {suivis}")
    return sortie


def main(argv: list) -> int:
    p = argparse.ArgumentParser(add_help=True)
    p.add_argument("--sortie")
    p.add_argument("--calibration-seule", action="store_true")
    p.add_argument("--cas-reel", default=CAS_REEL)
    args = p.parse_args(argv)

    sortie = []

    def dire(s: str = "") -> None:
        print(s, flush=True)
        sortie.append(s)

    dire(f"== CALIBRATION — {ICI_CALIBRATION.split('/')[-1]} est un chemin FICTIF, en mémoire : rien n'est écrit")
    lignes, manques, etat_reel = calibrer(args.cas_reel)
    for l in lignes:
        dire(l)
    dire(f"   calibration : {sum(1 for l in lignes if l.startswith('   ✓'))} bras passent sur {len(lignes)} imprimés,"
         f" {len(manques)} manqué(s) · cas réel : {etat_reel}")
    if manques:
        dire(f"ABANDON : un bras de la calibration manque son verdict ({', '.join(manques)}) — rien n'est audité")
        return 2
    if args.calibration_seule:
        return 0

    pieces = [(".gitattributes", open(".gitattributes", "rb").read())]
    for base, dossiers, noms in os.walk(os.path.join("docs", "preuves")):
        dossiers.sort()
        for n in sorted(noms):
            chemin = os.path.join(base, n).replace(os.sep, "/")
            pieces.append((chemin, open(chemin, "rb").read()))
    pieces.sort()
    audites, exclus, signales = classer(pieces)
    presents = {c for c, _ in pieces}
    absentes = [c for c, _, _ in EPINGLEES if c not in presents]
    intactes = sum(1 for c, _, r in exclus if "épinglée" in r)

    dire(f"== EXCLUSIONS — ce qui n'est PAS audité, et pourquoi ({len(exclus)} fichier(s))")
    total_aurait = 0
    for chemin, octets, raison in exclus:
        par = compter(octets)
        n = sum(par.values())
        total_aurait += n
        detail = " · ".join(f"{k}={v}" for k, v in par.items() if v) or "aucune"
        dire(f"  {chemin} ({len(octets)} o) : {raison} · alertes qu'il aurait rendues : {n} ({detail})")
    dire(f"  épinglées : {len(EPINGLEES)} · présentes et intactes : {intactes} · modifiées : "
         f"{sum(1 for s in signales if 'MODIFIÉE' in s)} · absentes : {len(absentes)}")
    for s in signales:
        dire("  " + s)
    for c in absentes:
        dire(f"  ⚠ {c} : sortie épinglée ABSENTE du disque — une pièce versée a disparu")

    dire(f"== AUDIT : {len(audites)} fichier(s) audité(s) ==")
    alertes, info, octets_audites = {c: 0 for c in MOTIFS}, 0, 0
    contextes = []
    for chemin, octets in audites:
        octets_audites += len(octets)
        texte = octets.decode("utf-8", errors="replace")
        marques = []
        for cle, motif in MOTIFS.items():
            k = len(re.findall(motif, texte, flags=re.IGNORECASE))
            if k:
                alertes[cle] += k
                marques.append(f"ALERTE {cle}={k}")
                contextes += contextes_de(chemin, texte, cle, motif)
        for cle, motif in INFORMATIF.items():
            k = len(re.findall(motif, texte, flags=re.IGNORECASE))
            if k:
                info += k
                marques.append(f"{cle}={k}")
        if marques:
            dire(f"  {chemin:62s} {len(octets):>8} o  {' · '.join(marques)}")
    total = sum(alertes.values())
    octets_parcourus = sum(len(o) for _, o in pieces)
    dire(f"  parcourus : {len(pieces)} fichiers, {octets_parcourus} octets · audités : {len(audites)} fichiers,"
         f" {octets_audites} octets · exclus : {len(exclus)} fichiers ({total_aurait} alertes d'écho non comptées)"
         f" · alertes : {total} (attendu 0) · chemin local (informatif) : {info}")
    dire(f"  contrôle : audités + exclus = {len(audites) + len(exclus)} (attendu {len(pieces)}, les parcourus)"
         f" · cas réel : {etat_reel}")
    dire("  ventilation par motif : " + " · ".join(f"{k}={v}" for k, v in alertes.items() if v))
    dire("  motifs à ZÉRO — des hypothèses à vérifier, jamais des absences constatées (D295) : "
         + (", ".join(k for k, v in alertes.items() if not v) or "aucun"))
    if contextes:
        dire("== CONTEXTE DES ALERTES, VALEURS MASQUÉES — le tri est humain et se lit ici (D275) ==")
        for c in contextes:
            dire(c)

    if args.sortie:
        octets = sceller("\n".join(sortie) + "\n")
        os.makedirs(os.path.dirname(args.sortie) or ".", exist_ok=True)
        with open(args.sortie, "wb") as f:
            f.write(octets)
        relu = open(args.sortie, "rb").read()
        print(f"sortie scellée : {args.sortie} ({len(relu)} octets) · relue identique : {relu == octets}"
              f" · sceau vérifié à la relecture : {sceau_valide(relu)}")
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
