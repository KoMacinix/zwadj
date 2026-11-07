"""Vérifie les motifs à ZÉRO de la passe D277 par des motifs PLUS LARGES (D295 : un zéro est une hypothèse), sur le texte aplati des trois fichiers d'autorité. Imprime le nombre et chaque contexte."""
import re
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
F = ["ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md", "AGENTS.md"]
T = {f: re.sub(r"\s+", " ", open(f, encoding="utf-8", newline="").read()) for f in F}
LARGES = [
    ("migration de la tranche L36-3 / staff : « à écrire », « pas écrite », « n'est pas appliquée », « n'existe pas »", r"(?:migration[^.]{0,160}(?:staff|L36-3)[^.]{0,160}(?:à écrire|pas écrite|n'existe pas|pas encore)|(?:staff|L36-3)[^.]{0,160}migration[^.]{0,100}(?:à écrire|pas écrite|n'existe pas|pas encore))"),
    ("« K-14 » (toutes occurrences, hors « K-14 à K-23 » qui est un contrat à ratifier)", r"K-14(?! à K-23)"),
    ("« recours » + « Manager » (n'importe quel verbe)", r"[Rr]ecours[^.]{0,80}Manager"),
    ("« pause du paiement en ligne » (toutes occurrences, 100 caractères après)", r"pause du paiement en ligne.{0,100}"),
]
for nom, motif in LARGES:
    print(f"\n· {nom}")
    n = 0
    for f in F:
        lst = list(re.finditer(motif, T[f], re.IGNORECASE))
        n += len(lst)
        print(f"   {f.split('.')[0]} : {len(lst)}")
        for m in lst[:6]:
            print(f"      @{m.start()} …{T[f][max(0, m.start() - 60): m.end() + 80]}…"[:330])
    print(f"   TOTAL : {n}")
