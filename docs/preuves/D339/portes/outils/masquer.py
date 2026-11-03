"""Masque les jetons de liens de vérification d'e-mail d'une sortie e2e (D339, reprise du 03/11/2026).

Usage : python masquer.py <entrée> <sortie> "<étiquette>"
Le reste de la sortie est écrit tel quel, OCTET POUR OCTET (aucune conversion de fin de ligne).
Un en-tête d'une ligne dit combien de jetons ont été masqués (modèle : D338, rouge-e2e de D339).

Calibration, rejouée à CHAQUE lancement, deux bras (D286) :
  bras positif : un lien portant un jeton DOIT être masqué ;
  bras négatif : une ligne de route « /auth/verify-email/:token », un jeton déjà masqué et une ligne
                 sans « token » DOIVENT rester identiques.
Le compteur imprime ce qu'il a parcouru à côté de ce qu'il a trouvé (D290).
"""
import re
import sys

MOTIF = re.compile(rb"(token=)[A-Za-z0-9_\-]{8,}")
RESTE = re.compile(rb"token=[A-Za-z0-9_\-]{8,}")
MASQUE = "<valeur masquée>".encode("utf-8")


def masquer(octets):
    sortie, n = MOTIF.subn(lambda m: m.group(1) + MASQUE, octets)
    return sortie, n


def calibrer():
    # Valeur SYNTHÉTIQUE, assemblée à l'exécution : aucune vraie valeur dans ce fichier (D200, D299).
    synthetique = b"Zz" * 20
    pos = b"[WebServer] http://localhost:3100/fr/auth/verification-email?" + b"token" + b"=" + synthetique + b"\n"
    out, n = masquer(pos)
    assert n == 1 and synthetique not in out and out.endswith(b"=" + MASQUE + b"\n"), ("bras positif", out, n)
    neg = (
        b"Mapped {/api/v1/auth/verify-email/:token, GET} route\n"
        + b"http://x/y?token=" + MASQUE + b"\n"
        + b"une ligne sans le mot\n"
    )
    out, n = masquer(neg)
    assert n == 0 and out == neg, ("bras négatif", out, n)
    print("calibration : 2 bras, tous OK")


def main():
    entree, sortie, etiquette = sys.argv[1], sys.argv[2], sys.argv[3]
    calibrer()
    brut = open(entree, "rb").read()
    lignes = brut.count(b"\n")
    esc = brut.count(b"\x1b")
    masque, n = masquer(brut)
    reste = len(RESTE.findall(masque))
    entete = (
        "# D339 — PIÈCE MASQUÉE : %d lien(s) de vérification d'e-mail imprimés par le serveur du harnais e2e "
        "(comptes de test, base jetable `zwadj_e2e` recréée à chaque passe) ont leur jeton remplacé par "
        "« <valeur masquée> » AVANT le commit (D298 ; faute n° 7 de D337). %s Le reste est la sortie telle quelle, "
        "aucune conversion de fin de ligne.\n" % (n, etiquette)
    ).encode("utf-8")
    ecrit = entete + masque
    open(sortie, "wb").write(ecrit)
    relu = open(sortie, "rb").read()
    reste_relu = len(RESTE.findall(relu))
    print("entrée : %d octets, %d lignes (LF), %d ESC" % (len(brut), lignes, esc))
    print("jetons masqués : %d" % n)
    print("jetons restants dans la sortie RELUE : %d (attendu 0)" % reste_relu)
    print("occurrences de « <valeur masquée> » dans la sortie RELUE : %d (attendu %d = %d jetons + 1 pour l'en-tête)"
          % (relu.count(MASQUE), n + 1, n))
    print("sortie : %d octets" % len(relu))
    if reste_relu != 0:
        sys.exit(3)


if __name__ == "__main__":
    main()
