# Écrit les `.md` d'autorité du rang 57 (D355) à partir des brouillons PRÉPARÉS hors du dépôt (`scratchpad/staging/*.final.md`), par insertions dont CHAQUE ANCRE est comptée (exactement une occurrence) AVANT d'écrire, et dont le
# résultat est RELU dans le fichier (les jetons attendus sont cherchés, on ne se fie pas au compte rendu de l'outil, D288/D289). Les fichiers d'autorité sont en CRLF : tout texte inséré est converti en CRLF, et le fichier ne doit contenir
# AUCUN LF nu après l'écriture. Aucun texte ne traverse un interpréteur : les blocs sont des FICHIERS. Archivé comme PIÈCE (D291), jamais promu en instrument.
# Usage, depuis la RACINE : python3 -I -X utf8 ecrire-autorite.py <étape> <dossier staging>
#   étapes : A1 (l'arbitrage de Ko — première écriture d'autorité) · A2 (la clôture : ordre des rangs, état, section, table recopiée, registre) · AGENTS · BACKLOG
import hashlib
import sys

ETAPE, ST = sys.argv[1], sys.argv[2]


def lire(chemin: str) -> str:
    b = open(chemin, "rb").read().decode("utf-8")
    assert b.count("\r\n") == b.count("\n"), (chemin, "LF nus avant écriture")
    return b.replace("\r\n", "\n")


def ecrire(chemin: str, texte: str, jetons: list[str]) -> None:
    sortie = texte.replace("\n", "\r\n").encode("utf-8")
    assert sortie.count(b"\r\n") == sortie.count(b"\n"), "LF nus introduits"
    open(chemin, "wb").write(sortie)
    relu = open(chemin, "rb").read().decode("utf-8")
    for j in jetons:
        assert j in relu.replace("\r\n", "\n"), ("jeton attendu ABSENT du fichier relu", chemin, j[:80])
    print(f"{chemin} : écrit ({len(sortie)} octets, sha256 {hashlib.sha256(sortie).hexdigest()[:16]}) ; {len(jetons)} jeton(s) relu(s) dans le fichier")


def une_fois(texte: str, ancre: str) -> int:
    n = texte.count(ancre)
    assert n == 1, ("ancre : occurrences", n, ancre[:100])
    return texte.index(ancre)


def bloc(nom: str) -> str:
    return open(f"{ST}/{nom}", encoding="utf-8", newline="").read().rstrip("\n")


CONT = "ZWADJ_CONTINUITE.md"
ANCRE_TABLE_56 = "⛔ **TABLE D'OUVERTURE DU RANG 56 (D354), recopiée"

if ETAPE == "A1":
    t = lire(CONT)
    # 1. la ligne « RANG 57 : EN ATTENTE » est barrée avec son motif
    ancien = "⇒ **RANG 57 : EN ATTENTE DE CADRAGE DU RELECTEUR.** *(Forme de la délégation de Ko du 02/11/2026 : voir le bloc d'arbitrage du rang 44.)* Candidat **proposé** (consigne du rang 56, § 4) : **L36-3b, le PIN**"
    neuf = ("⇒ ~~**RANG 57 : EN ATTENTE DE CADRAGE DU RELECTEUR.**~~ ⛔ *(D355, 20/11/2026 : **PÉRIMÉ** — le rang 57 est arbitré par Ko par adoption de la consigne du relecteur « RANG 57 — LES RESTES DE L36-3a-2 : UNE CONNEXION NE SURVIT PLUS À UNE "
            "RÉINITIALISATION, ET LE JOURNAL DES FICHES CLIENT QUE DR5 DEMANDE » : voir le bloc « ARBITRÉ LE 19/11/2026 PAR KO — LE RANG 57 » juste dessous ; la suite de cette ligne — « Candidat **proposé** … **Pas arbitré** » — dit ce qui était vrai AVANT. "
            "Barré avec son motif, pas effacé.)* *(Forme de la délégation de Ko du 02/11/2026 : voir le bloc d'arbitrage du rang 44.)* Candidat **proposé** (consigne du rang 56, § 4) : **L36-3b, le PIN**")
    une_fois(t, ancien)
    t = t.replace(ancien, neuf)
    # 2. le bloc d'arbitrage de Ko, juste avant la table du rang 56
    i = une_fois(t, ANCRE_TABLE_56)
    arb = bloc("arbitrage.md")
    t = t[:i] + arb + "\n\n" + t[i:]
    ecrire(CONT, t, ["⛔ **ARBITRÉ LE 19/11/2026 PAR KO — LE RANG 57", "⇒ ~~**RANG 57 : EN ATTENTE DE CADRAGE DU RELECTEUR.**~~", "**[1c] Réponse de Ko à la question de D354", "Candidat **proposé** (consigne du rang 56, § 4)"])

elif ETAPE == "A2":
    t = lire(CONT)
    # 1. ordre des rangs : CLOS + RANG 58, puis la table recopiée, AVANT la table du rang 56
    i = une_fois(t, ANCRE_TABLE_56)
    table = open("docs/preuves/D355/table-ouverture.md", "rb").read().decode("utf-8")
    assert "\r\n" not in table and table.endswith("```\n")
    entete_table = bloc("entete-table.md")
    t = t[:i] + bloc("ordre-rang57.final.md") + "\n\n" + entete_table + "\n\n~~~~markdown\n" + table.rstrip("\n") + "\n~~~~\n\n" + t[i:]
    # 2. l'état : le titre du rang 56 et son bloc d'état sont BARRÉS ; le nouvel état les précède
    ancre_etat_56 = "## PROCHAIN LOT — rang 56 · `[CODE]` **L36-3a-2 : le personnel et ses capacités, côté serveur"
    j = une_fois(t, ancre_etat_56)
    barre_titre = ("## ~~PROCHAIN LOT — rang 56~~ ⛔ *(D355 : l'état courant est le bloc « ÉTAT À LA CLÔTURE DU RANG 57 » juste au-dessus ; le bloc du rang 56 qui suit garde sa date. Barré avec son motif, pas effacé.)* · `[CODE]` **L36-3a-2 : le personnel et ses capacités, côté serveur")
    t = t[:j] + bloc("etat-cloture.final.md") + "\n\n" + barre_titre + t[j + len(ancre_etat_56):]
    ancien_h = "### ⛔ ÉTAT À LA CLÔTURE DU RANG 56 (D354, 19/11/2026) — À LIRE EN PREMIER"
    une_fois(t, ancien_h)
    neuf_h = ("### ~~⛔ ÉTAT À LA CLÔTURE DU RANG 56 (D354, 19/11/2026) — À LIRE EN PREMIER~~ ⛔ *(D355, 20/11/2026 : **PÉRIMÉ** sur « rang suivant : RANG 57 : EN ATTENTE DE CADRAGE DU RELECTEUR », « compteur TRENTE-SIX », « décisions prises seule : S-239 à S-251, à ratifier » "
              "(ratifiées par adoption), « ce que le lot NE livre PAS : … la correction du défaut croisé… l'audit des FICHES client » (livrés par le rang 57) et « ce qui RESTE : (1) le rang 57, à cadrer… (3) la question : faut-il aussi auditer la création et la modification d'une FICHE client (S-240) ? » (répondue OUI) ; "
              "l'état courant est le bloc « ÉTAT À LA CLÔTURE DU RANG 57 » juste au-dessus ; celui-ci dit ce qui était vrai AVANT le rang 57. Barré avec son motif, pas effacé.)*")
    t = t.replace(ancien_h, neuf_h)
    # 3. la section de session, avant celle de D354
    ancre_sec = "## Session du 19/11/2026 — D354 · rang 56 CLOS SUR LE CODE"
    k = une_fois(t, ancre_sec)
    t = t[:k] + bloc("D355-section.final.md") + "\n\n" + t[k:]
    # 4. le registre : une ligne de plus, à la fin du fichier
    ligne = bloc("registre.md")
    assert t.rstrip("\n").splitlines()[-1].startswith("| D354 | A |"), "la dernière ligne du fichier doit être celle de D354"
    t = t.rstrip("\n") + "\n" + ligne + "\n"
    ecrire(CONT, t, ["⇒ **RANG 57 : CLOS SUR LE CODE (D355", "⇒ **RANG 58 : EN ATTENTE DE CADRAGE DU RELECTEUR.**", "⛔ **TABLE D'OUVERTURE DU RANG 57 (D355)", "### ⛔ ÉTAT À LA CLÔTURE DU RANG 57 (D355", "## Session des 19 et 20/11/2026 — D355 · rang 57 CLOS SUR LE CODE", "| D355 | A |", "~~PROCHAIN LOT — rang 56~~"])

elif ETAPE == "AGENTS":
    t = lire("AGENTS.md")
    # 1. les deux annotations « PÉRIMÉ » dans l'invariant de D354
    a1 = "défaut croisé **MESURÉ** (`openSession` ne conditionne pas le hachage lu à la réservation), **non corrigé**, au backlog ;"
    une_fois(t, a1)
    t = t.replace(a1, a1[:-2] + " ⛔ *(D355, 20/11/2026 : **CORRIGÉ** — rang 57, R-1 : le check-and-set d'`openSession` porte le hachage lu à la réservation (voir l'invariant « UNE CONNEXION NE SURVIT PLUS À UNE RÉINITIALISATION… (D355) » juste dessous) ; « non corrigé » est **PÉRIMÉ**. Annoté, pas réécrit.)* ;")
    a2 = "**l'audit des FICHES client n'est PAS écrit** (S-240 : la consigne et le cadrage se contredisent sur « fiches », question à Ko) ;"
    une_fois(t, a2)
    t = t.replace(a2, a2[:-2] + " ⛔ *(D355 : **ÉCRIT** — rang 57, R-2 : Ko a répondu OUI à la question (DR5 le liste) ; les quatre écritures de fiche écrivent chacune leur ligne dans leur transaction ; « n'est PAS écrit » est **PÉRIMÉ**. Annoté, pas réécrit.)* ;")
    # 2. le nouvel invariant, juste après celui de D354
    ancre_suite = "- ⛔ **LES APPELS DE PRÉPARATION DE L'E2E N'EMPLOIENT AUCUNE CONNEXION RÉUTILISABLE"
    i = une_fois(t, ancre_suite)
    t = t[:i] + bloc("agents-invariant.final.md") + "\n" + t[i:]
    # 3. l'annotation de la chaîne des rangs, après celle de D354
    fin_d354 = "`ZWADJ_CONTINUITE.md`, « ÉTAT À LA CLÔTURE DU RANG 56 (D354) » et section D354. Annoté, pas réécrit.)*"
    une_fois(t, fin_d354)
    t = t.replace(fin_d354, fin_d354 + "\n" + bloc("agents-chaine.md"))
    ecrire("AGENTS.md", t, ["⛔ **UNE CONNEXION NE SURVIT PLUS À UNE RÉINITIALISATION, ET LES ÉCRITURES D'UNE FICHE CLIENT", "⛔ *(D355, 20/11/2026 : **RANG 57 CLOS SUR LE CODE", "⛔ *(D355, 20/11/2026 : **CORRIGÉ**", "⛔ *(D355 : **ÉCRIT**"])

elif ETAPE == "BACKLOG":
    t = lire("ZWADJ_BACKLOG.md")
    for ancien, motif in (("- [ ] **[API][IDENTITÉ][À ORDONNER PAR KO]** ⚠ **UNE CONNEXION DONT LE MOT DE PASSE A ÉTÉ VÉRIFIÉ AVANT UNE RÉINITIALISATION OUVRE UNE SESSION APRÈS ELLE",
                           "**FAIT** — rang 57 (D355), R-1 : le check-and-set d'`openSession` porte le hachage lu à la réservation (un seul endroit, que le PIN réutilisera) ; mesuré rouge d'abord par quatre chemins dont la route (200 là où 401), puis vert par un entrelacement forcé sur PostgreSQL réel."),
                          ("- [ ] **[PRODUIT][À ORDONNER PAR KO — LA QUESTION DU RAPPORT DE D354]** **L'AUDIT DES FICHES CLIENT N'EST PAS ÉCRIT (S-240).**",
                           "**FAIT** — rang 57 (D355), R-2 : Ko a répondu OUI à la question du rapport ; les quatre écritures d'une fiche écrivent chacune UNE ligne `audit_logs` dans leur transaction.")):
        une_fois(t, ancien)
        neuf = ancien.replace("- [ ] ", "- [x] ", 1)
        # l'annotation s'insère juste après l'étiquette, avant le texte d'origine, qui garde sa date
        etiquette_fin = neuf.index("]** ", neuf.index("**[")) + 4
        t = t.replace(ancien, neuf[:etiquette_fin] + "⛔ *(D355, 20/11/2026 : " + motif + " Cochée, pas effacée ; le texte qui suit dit ce qui était vrai AVANT.)* " + neuf[etiquette_fin:])
    ancre = "## Reports du 19/11/2026 — rang 56 CLOS, L36-3a-2 : le personnel et ses capacités côté serveur (D354)"
    i = une_fois(t, ancre)
    t = t[:i] + bloc("backlog-d355.md") + "\n\n" + t[i:]
    ecrire("ZWADJ_BACKLOG.md", t, ["## Reports du 20/11/2026 — rang 57 CLOS", "- [x] **[API][IDENTITÉ][À ORDONNER PAR KO]** ⛔ *(D355, 20/11/2026 : **FAIT**", "- [x] **[PRODUIT][À ORDONNER PAR KO — LA QUESTION DU RAPPORT DE D354]** ⛔ *(D355, 20/11/2026 : **FAIT**"])

elif ETAPE == "TABLE":
    # rafraîchit la copie de la table d'ouverture dans le fichier de continuité (après une extension) : l'en-tête ET le bloc recopié, relus contre le fichier de la table
    t = lire(CONT)
    debut = une_fois(t, "⛔ **TABLE D'OUVERTURE DU RANG 57 (D355), recopiée")
    j = t.index("~~~~markdown\n", debut)
    k = t.index("\n~~~~\n", j)
    table = open("docs/preuves/D355/table-ouverture.md", "rb").read().decode("utf-8")
    assert "\r\n" not in table and table.endswith("```\n")
    t = t[:debut] + bloc("entete-table.md") + "\n\n~~~~markdown\n" + table.rstrip("\n") + t[k:]
    ecrire(CONT, t, ["extension 7 `ce28757`", "### Extension 7 — les procédures d'écriture des fichiers d'autorité", "les SEPT extensions"])
    relu = lire(CONT)
    d2 = relu.index("⛔ **TABLE D'OUVERTURE DU RANG 57 (D355), recopiée")
    j2 = relu.index("~~~~markdown\n", d2) + len("~~~~markdown\n")
    k2 = relu.index("\n~~~~\n", j2)
    assert relu[j2:k2] == table.rstrip("\n"), "la table recopiée n'est pas identique au fichier de la table"
    print("table recopiée == fichier de la table : vrai (relu)")

else:
    raise SystemExit("étape inconnue : " + ETAPE)
