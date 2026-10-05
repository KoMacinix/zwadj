#!/usr/bin/env python3
"""
D325 — EXTRACTEUR DES JOURNAUX e2e DU RANG 32 (pièce jetable, versée avec ce qu'elle a produit).

POURQUOI : un journal Playwright brut porte, entre les lignes de résultat, le journal des serveurs lancés par la suite — requêtes, cookies de rafraîchissement
(`zwadj_rt=…`), liens de vérification d'e-mail à jeton. Même jetables (base `zwadj_e2e`), ce sont des VALEURS qui n'ont rien à faire au dépôt (D200). On verse donc un
EXTRAIT : les lignes de résultat, le résumé, et les blocs d'échec (que la spec écrit sans valeur sensible). Le journal brut n'est pas versé.

⚠ PIÈGE DE D275, RELEVÉ DANS CE LOT MÊME : `grep -c '^\\[WebServer\\]'` rend 0 sur un journal qui porte des codes ANSI — chaque ligne commence par `ESC[2m` et non par
`[WebServer]`. L'extracteur retire donc les codes ANSI AVANT de classer, et il imprime ce qu'il a examiné AVEC l'attendu à côté (D290) : un « 0 » sur zéro ligne examinée
n'est pas une mesure.

Usage : python3 docs/preuves/D325/e2e/extraire.py <journal> <extrait> --resultats N [--echecs M]
  --resultats N : nombre de lignes de résultat attendu (le préchauffage compte) ; --echecs M : nombre de blocs d'échec attendu (défaut 0).
Sort 1 si un nombre mesuré diffère de l'attendu, et n'écrit alors RIEN.

CALIBRATION (rejouée à chaque lancement, deux bras, avant de toucher au journal) :
  bras 1 — un texte témoin qui porte une ligne `[WebServer]` coloriée et une ligne de résultat : l'extracteur doit écarter la première et garder la seconde ;
  bras 2 — le même texte SANS code ANSI : même verdict. Un extracteur qui ne verrait que l'un des deux est celui de D275.
"""
import re
import sys

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:  # noqa: BLE001
    pass

ANSI = re.compile(r"\x1b\[[0-9;]*m")
SERVEUR = re.compile(r"^\[WebServer\]")
RESULTAT = re.compile(r"^\s+(ok|x|-)\s+\d+\s+\[")
RESUME = re.compile(r"^\s+\d+\s+(passed|failed|flaky|skipped|did not run)\b")
DEBUT_ECHEC = re.compile(r"^\s+\d+\)\s+\[")


def nettoyer(texte: str) -> list[str]:
    return [ANSI.sub("", ligne.rstrip("\r")) for ligne in texte.split("\n")]


def extraire(lignes: list[str]):
    """Rend (gardees, nb_serveur, nb_resultats, nb_echecs)."""
    gardees: list[str] = []
    serveur = resultats = echecs = 0
    dans_echec = False
    for ligne in lignes:
        if SERVEUR.match(ligne):
            serveur += 1
            continue
        if DEBUT_ECHEC.match(ligne):
            echecs += 1
            dans_echec = True
        elif RESULTAT.match(ligne):
            resultats += 1
            dans_echec = False
            gardees.append(ligne)
            continue
        elif RESUME.match(ligne):
            dans_echec = False
            gardees.append(ligne)
            continue
        if dans_echec:
            gardees.append(ligne)
    return gardees, serveur, resultats, echecs


def calibrer() -> None:
    temoin = "\x1b[2m[WebServer] \x1b[22mINFO: du bruit\n  ok 1 [chromium] › un test (1.0s)\n  1 passed (2s)\n"
    for nom, texte in (("avec ANSI", temoin), ("sans ANSI", ANSI.sub("", temoin))):
        gardees, serveur, resultats, echecs = extraire(nettoyer(texte))
        attendu = (1, 1, 0, 2)
        mesure = (serveur, resultats, echecs, len(gardees))
        print(f"calibration {nom} : serveur/résultats/échecs/gardées = {mesure} (attendu {attendu})")
        if mesure != attendu:
            print("CALIBRATION ÉCHOUÉE — l'extracteur ne sépare pas le bruit du résultat : on s'arrête.")
            sys.exit(2)


def main() -> int:
    args = sys.argv[1:]
    if len(args) < 4 or "--resultats" not in args:
        print(__doc__)
        return 2
    journal, extrait = args[0], args[1]
    attendu_resultats = int(args[args.index("--resultats") + 1])
    attendu_echecs = int(args[args.index("--echecs") + 1]) if "--echecs" in args else 0
    calibrer()
    with open(journal, "rb") as f:
        brut = f.read().decode("utf-8")
    lignes = nettoyer(brut)
    gardees, serveur, resultats, echecs = extraire(lignes)
    print(f"{journal} : {len(lignes)} lignes examinées, dont {serveur} lignes de serveur écartées (attendu > 0), {len(gardees)} gardées")
    print(f"  résultats : {resultats} (attendu {attendu_resultats}) · blocs d'échec : {echecs} (attendu {attendu_echecs})")
    if serveur == 0:
        print("  ⚠ ZÉRO ligne de serveur écartée : ou le journal n'en porte pas, ou l'extracteur ne les voit pas — non conclu.")
        return 1
    if resultats != attendu_resultats or echecs != attendu_echecs:
        print("  ÉCART : rien n'est écrit.")
        return 1
    entete = [
        f"# EXTRAIT de {journal.replace(chr(92), '/').split('/')[-1]} — produit par docs/preuves/D325/e2e/extraire.py",
        f"# {len(lignes)} lignes examinées, {serveur} lignes de serveur écartées, {resultats} résultats, {echecs} blocs d'échec",
        "# Les lignes ci-dessous sont COPIÉES telles quelles (codes ANSI retirés) ; rien n'est reformulé.",
        "",
    ]
    with open(extrait, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(entete + gardees) + "\n")
    print(f"  écrit : {extrait}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
