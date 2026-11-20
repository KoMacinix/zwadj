# Annotations « D355 » posées APRÈS la passe D277 (deux sens, D287) : chaque affirmation que le lot a rendue fausse ou close (« non corrigé », « à ratifier », « la question ») qui se lit COURANTE dans une section datée ou une ligne de rang clos reçoit
# une annotation en ligne, jamais une réécriture. Chaque ancre est comptée (exactement une occurrence) AVANT d'écrire ; le résultat est RELU dans le fichier ; CRLF conservé, aucun LF nu. Archivé comme PIÈCE (D291), jamais promu en instrument.
# Usage, depuis la RACINE : python3 -I -X utf8 annoter-d277.py
import hashlib


def lire(c):
    b = open(c, "rb").read().decode("utf-8")
    assert b.count("\r\n") == b.count("\n"), (c, "LF nus")
    return b.replace("\r\n", "\n")


def ecrire(c, t, jetons):
    s = t.replace("\n", "\r\n").encode("utf-8")
    open(c, "wb").write(s)
    relu = open(c, "rb").read().decode("utf-8").replace("\r\n", "\n")
    for j in jetons:
        assert j in relu, ("jeton absent", c, j[:80])
    assert open(c, "rb").read().count(b"\r\n") == open(c, "rb").read().count(b"\n")
    print(f"{c} : écrit, sha256 {hashlib.sha256(s).hexdigest()[:16]}, {len(jetons)} jeton(s) relu(s)")


def sub(t, ancien, neuf):
    n = t.count(ancien)
    assert n == 1, ("ancre : occurrences", n, ancien[:100])
    return t.replace(ancien, neuf)


ANN = "⛔ *(D355, 20/11/2026 : "
c = lire("ZWADJ_CONTINUITE.md")
# E1 — la ligne du rang 56 clos dans l'ordre des rangs
c = sub(c, "ouvre une session après elle) ; décisions prises seule **S-239 à S-251, à ratifier** ; compteur POUR MÉMOIRE **TRENTE-CINQ → TRENTE-SIX** ; section D354 de ce fichier",
        "ouvre une session après elle) " + ANN + "**CORRIGÉ** — rang 57, R-1 : l'ouverture est conditionnée au hachage lu à la réservation. Annoté, pas réécrit.)* ; décisions prises seule **S-239 à S-251, à ratifier** " + ANN + "**RATIFIÉES par adoption** — consigne du rang 57, § 1 b.)* ; compteur POUR MÉMOIRE **TRENTE-CINQ → TRENTE-SIX** ; section D354 de ce fichier")
# E2 — D354 § 3
c = sub(c, "- **Un défaut CROISÉ, MESURÉ et RAPPORTÉ — pas corrigé** :", "- **Un défaut CROISÉ, MESURÉ et RAPPORTÉ — pas corrigé** " + ANN + "**CORRIGÉ** au rang 57, R-1 : le « pas corrigé » est **PÉRIMÉ** ; annoté, pas réécrit.)* :")
# E3 — D354 § 5, titre
c = sub(c, "### 5. Décisions prises par la session seule — **S-239 à S-251, À RATIFIER** (une phrase chacune, avec ce qu'elle change pour Ko)",
        "### 5. Décisions prises par la session seule — **S-239 à S-251, À RATIFIER** " + ANN + "**RATIFIÉES par adoption** — consigne du rang 57, § 1 b ; **S-248 est levée** et **S-240 répondue** : voir leurs lignes.)* (une phrase chacune, avec ce qu'elle change pour Ko)")
# E4 — S-240
c = sub(c, "- **S-240** — **L'audit livré est celui des TROIS actions du personnel ; celui des FICHES CLIENT n'est pas écrit.**",
        "- **S-240** — **L'audit livré est celui des TROIS actions du personnel ; celui des FICHES CLIENT n'est pas écrit.** " + ANN + "**ÉCRIT** — rang 57, R-2 ; Ko a répondu OUI.)*")
# E5 — S-248 (la ligne de D354 § 5, suivie de son « Pour Ko » : l'autre occurrence est une CITATION dans la table recopiée)
c = sub(c, "le premier client réel.*" + chr(10) + "- **S-249** —",
        "le premier client réel.* " + ANN + "**LEVÉE** — corrigé au rang 57, R-1 ; consigne du rang 57, § 1 b.)*" + chr(10) + "- **S-249** —")
# E6 — D354 § 4
c = sub(c, "**l'audit de la création et de la modification d'une FICHE CLIENT** (S-240 : la question unique du rapport)",
        "**l'audit de la création et de la modification d'une FICHE CLIENT** (S-240 : la question unique du rapport) " + ANN + "**FAIT** — rang 57, R-2.)*")
# E7 — D354 § 7
c = sub(c, "- **La ratification de S-239 à S-251** (§ 5).", "- **La ratification de S-239 à S-251** (§ 5). " + ANN + "**FAITE** — ratifiées par adoption, consigne du rang 57, § 1 b.)*")
c = sub(c, "- **Une question** : **faut-il aussi auditer la création et la modification d'une FICHE CLIENT**",
        "- **Une question** : **faut-il aussi auditer la création et la modification d'une FICHE CLIENT** " + ANN + "**RÉPONDUE : OUI** — et FAIT, rang 57, R-2.)*")
# E8 — la ligne D354 du registre
c = sub(c, "**un défaut croisé mesuré et rapporté, non corrigé** (connexion ‖ réinitialisation)", "**un défaut croisé mesuré et rapporté, non corrigé** (connexion ‖ réinitialisation) " + ANN + "corrigé au rang 57)*")
c = sub(c, "décisions prises seule S-239 à S-251 à ratifier ; compteur POUR MÉMOIRE TRENTE-CINQ → TRENTE-SIX ; **« RANG 57 : EN ATTENTE DE CADRAGE DU RELECTEUR »**",
        "décisions prises seule S-239 à S-251 à ratifier " + ANN + "ratifiées par adoption)* ; compteur POUR MÉMOIRE TRENTE-CINQ → TRENTE-SIX ; ~~**« RANG 57 : EN ATTENTE DE CADRAGE DU RELECTEUR »**~~ " + ANN + "périmé : le rang 57 est arbitré et clos, voir la ligne D355)*")
# E9 — l'annotation de D354 sur R-8 de D341 (l'autre occurrence est la CITATION de la table recopiée : elle n'est pas suivie de R-9)
c = sub(c, "celui des FICHES CLIENT est la question du rapport de D354. Annoté, pas réécrit.)*\n- R-9. Lectures de D302 confirmées",
        "celui des FICHES CLIENT est la question du rapport de D354. Annoté, pas réécrit.)* " + ANN + "**ÉCRIT** — rang 57, R-2 : Ko a répondu OUI à la question ; les quatre écritures de fiche écrivent leur ligne dans leur transaction. Annoté, pas réécrit.)*\n- R-9. Lectures de D302 confirmées")
ecrire("ZWADJ_CONTINUITE.md", c, ["**RATIFIÉES par adoption** — consigne du rang 57, § 1 b ; **S-248 est levée**", "**LEVÉE** — corrigé au rang 57, R-1", "corrigé au rang 57)*", "**ÉCRIT** — rang 57, R-2 : Ko a répondu OUI à la question"])

a = lire("AGENTS.md")
a = sub(a, "**S-239 à S-251 sont à ratifier**", "**S-239 à S-251 sont à ratifier** " + ANN + "**RATIFIÉES par adoption** — consigne du rang 57, § 1 b.)*")
a = sub(a, "**la question du rapport** : faut-il aussi auditer la création et la modification d'une fiche client (S-240) ?", "**la question du rapport** : faut-il aussi auditer la création et la modification d'une fiche client (S-240) ? " + ANN + "**RÉPONDUE : OUI**, et FAIT — rang 57, R-2.)*")
a = sub(a, "**un défaut croisé MESURÉ et RAPPORTÉ, non corrigé** (une connexion dont le mot de passe a été vérifié avant une réinitialisation ouvre une session après elle)",
        "**un défaut croisé MESURÉ et RAPPORTÉ, non corrigé** (une connexion dont le mot de passe a été vérifié avant une réinitialisation ouvre une session après elle) " + ANN + "**CORRIGÉ** — rang 57, R-1.)*")
ecrire("AGENTS.md", a, ["**RATIFIÉES par adoption** — consigne du rang 57, § 1 b.)*", "**RÉPONDUE : OUI**, et FAIT — rang 57, R-2.)*", "**CORRIGÉ** — rang 57, R-1.)*"])
