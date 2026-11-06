"""Masque, dans une sortie brute, toute suite de 43 caractères base64url qui mêle minuscules, majuscules et chiffres (la forme exacte d'un jeton opaque de ce dépôt : TokenService.generate, 256 bits en base64url).
Procédure archivée avec la pièce qu'elle a produite — jamais promue en instrument (D291). Les jetons de la sortie e2e sont ceux d'une base JETABLE (`zwadj_e2e`, recréée à chaque lancement) : ils ne donnent accès à rien,
mais ils ont la forme de jetons réels, et le dépôt est public (D200 : un audit de secrets ne se tronque pas, une pièce ne porte pas de suite de forme jeton).
Remplace la Nième suite DISTINCTE (ordre de première apparition) par `<jeton masqué #N (43 car.)>` ; la même suite reçoit toujours le même numéro (on peut encore dire que deux occurrences sont le même jeton).
Écrit un en-tête qui dit ce qui a été fait, avec l'empreinte et la taille de la sortie BRUTE (gardée hors dépôt). Imprime : suites distinctes, occurrences remplacées, et la preuve qu'il n'en reste aucune.
Calibration, deux bras : (positif) un texte fabriqué avec un jeton de forme réelle est masqué ; (négatif) une chaîne de 43 caractères sans chiffre, ou de 42 caractères, ne l'est pas.
Usage : python3 masquer-jetons.py <brut> <masqué> <libellé de la pièce>"""
import hashlib
import re
import sys

JETON = re.compile(r"(?<![A-Za-z0-9_-])[A-Za-z0-9_-]{43}(?![A-Za-z0-9_-])")


def forme_jeton(s: str) -> bool:
    return any(c.islower() for c in s) and any(c.isupper() for c in s) and any(c.isdigit() for c in s)


def masquer(texte: str):
    numeros: dict[str, int] = {}
    n = 0

    def sub(m):
        nonlocal n
        s = m.group(0)
        if not forme_jeton(s):
            return s
        if s not in numeros:
            numeros[s] = len(numeros) + 1
        n += 1
        return f"<jeton masqué #{numeros[s]} (43 car.)>"

    return JETON.sub(sub, texte), numeros, n


# calibration
faux_jeton = "aB3" + "x" * 40  # 43 caractères mêlant minuscules, majuscules, chiffre
sortie, num, k = masquer(f"a {faux_jeton} b {faux_jeton} c")
assert num == {faux_jeton: 1} and k == 2 and faux_jeton not in sortie, "calibration positive manquée"
sans_chiffre = "aBc" + "x" * 40
trop_court = "aB3" + "x" * 39
assert masquer(sans_chiffre)[2] == 0 and masquer(trop_court)[2] == 0, "calibration négative manquée"

brut_chemin, masque_chemin, libelle = sys.argv[1], sys.argv[2], sys.argv[3]
brut = open(brut_chemin, "rb").read()
texte = brut.decode("utf-8", errors="replace")
masque, numeros, occurrences = masquer(texte)
reste = [m.group(0) for m in JETON.finditer(masque) if forme_jeton(m.group(0))]
entete = (
    f"⛔ PIÈCE MASQUÉE — {libelle}. La sortie brute porte {occurrences} occurrence(s) de {len(numeros)} suite(s) DISTINCTE(S) de 43 caractères base64url mêlant minuscules, majuscules et chiffres : des jetons d'une base jetable\n"
    f"(`zwadj_e2e`, recréée à chaque lancement) mais de la forme exacte de jetons réels, remplacés ci-dessous par `<jeton masqué #N (43 car.)>` (la même suite reçoit le même numéro). Le reste est la sortie telle quelle.\n"
    f"BRUT (gardé HORS dépôt) : {len(brut)} octets, sha256 {hashlib.sha256(brut).hexdigest()}. Procédure : `masquer-jetons.py` (archivée à côté, jamais promue en instrument, D291).\n"
    f"Après masquage : {len(reste)} suite(s) de forme jeton restante(s) (attendu 0).\n"
    f"═══ DÉBUT DE LA SORTIE ═══\n"
)
open(masque_chemin, "w", encoding="utf-8", newline="").write(entete + masque)
print(f"{libelle} : {occurrences} occurrence(s) · {len(numeros)} suite(s) distincte(s) · restantes après masquage : {len(reste)} (attendu 0) · brut {len(brut)} octets sha256 {hashlib.sha256(brut).hexdigest()}")
sys.exit(0 if not reste else 1)
