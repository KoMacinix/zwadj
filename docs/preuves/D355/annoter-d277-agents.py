# Seconde moitié de `annoter-d277.py` (la partie AGENTS.md), rejouée seule : la première exécution a écrit ZWADJ_CONTINUITE.md puis s'est arrêtée sur une ancre d'AGENTS.md mal bornée (le gras commence plus tôt : « **S-231 à S-238 (D353) ratifiées par adoption ; S-239 à S-251 sont à ratifier** »).
# Mêmes règles : chaque ancre comptée AVANT d'écrire, résultat RELU, CRLF conservé. Archivé comme PIÈCE (D291), jamais promu en instrument.
import hashlib

b = open("AGENTS.md", "rb").read().decode("utf-8")
assert b.count("\r\n") == b.count("\n")
a = b.replace("\r\n", "\n")
ANN = "⛔ *(D355, 20/11/2026 : "


def sub(t, ancien, neuf):
    n = t.count(ancien)
    assert n == 1, ("ancre : occurrences", n, ancien[:100])
    return t.replace(ancien, neuf)


a = sub(a, "S-239 à S-251 sont à ratifier**", "S-239 à S-251 sont à ratifier** " + ANN + "**RATIFIÉES par adoption** — consigne du rang 57, § 1 b.)*")
a = sub(a, "**la question du rapport** : faut-il aussi auditer la création et la modification d'une fiche client (S-240) ?", "**la question du rapport** : faut-il aussi auditer la création et la modification d'une fiche client (S-240) ? " + ANN + "**RÉPONDUE : OUI**, et FAIT — rang 57, R-2.)*")
a = sub(a, "**un défaut croisé MESURÉ et RAPPORTÉ, non corrigé** (une connexion dont le mot de passe a été vérifié avant une réinitialisation ouvre une session après elle)",
        "**un défaut croisé MESURÉ et RAPPORTÉ, non corrigé** (une connexion dont le mot de passe a été vérifié avant une réinitialisation ouvre une session après elle) " + ANN + "**CORRIGÉ** — rang 57, R-1.)*")
s = a.replace("\n", "\r\n").encode("utf-8")
open("AGENTS.md", "wb").write(s)
relu = open("AGENTS.md", "rb").read()
assert relu.count(b"\r\n") == relu.count(b"\n")
t = relu.decode("utf-8").replace("\r\n", "\n")
for j in ("**RATIFIÉES par adoption** — consigne du rang 57, § 1 b.)*", "**RÉPONDUE : OUI**, et FAIT — rang 57, R-2.)*", "**CORRIGÉ** — rang 57, R-1.)*"):
    assert j in t, j
print(f"AGENTS.md : écrit, sha256 {hashlib.sha256(s).hexdigest()[:16]}, 3 jeton(s) relu(s)")
