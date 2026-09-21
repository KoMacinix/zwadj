"""L'écho se reconnaîtrait-il LIGNE PAR LIGNE ? (D298 — instrument concurrent écarté sur cette mesure)
Pour chaque correspondance des onze motifs de D293 (lus dans la pièce, jamais retapés) dans une sortie
d'audit, la valeur capturée (même logique que D293) commence-t-elle par un masque « <N car. masques> » ?
Rend : correspondances vues, suivies d'un masque, NON masquées. N'imprime AUCUN exemple : les lignes
d'écho portent les motifs, et les recopier ici ferait de cette sortie un écho de plus.
Usage, depuis la racine : python3 docs/preuves/D298/lecture/echo-par-ligne.py <sortie d'audit>..."""
import ast
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
src = open("docs/preuves/D293/outils/audit-secrets.py", encoding="utf-8").read()
ns = {"re": re}
for noeud in ast.parse(src).body:
    if isinstance(noeud, ast.Assign) and isinstance(noeud.targets[0], ast.Name) and noeud.targets[0].id in ("TIRETS", "MOTIFS"):
        exec(compile(ast.Module([noeud], []), "d293", "exec"), ns)
MOTIFS = ns["MOTIFS"]
MASQUE = re.compile(r"<\d+ car\. masques>")
tv = tm = 0
for f in sys.argv[1:]:
    t = open(f, "rb").read().decode("utf-8", errors="replace")
    vus = masques = 0
    for ligne in t.split("\n"):  # split("\n") découpe, il ne sert à aucun compte de lignes (D294)
        for motif in MOTIFS.values():
            for m in re.finditer(motif, ligne, flags=re.IGNORECASE):
                vus += 1
                reste = ligne[m.end():] if motif.endswith("[:=]") else ligne[m.start():]
                masques += bool(MASQUE.match(reste.lstrip(" \"'")))
    tv, tm = tv + vus, tm + masques
    print(f"{f} : correspondances vues {vus} · suivies d'un masque {masques} · NON masquées {vus - masques}")
print(f"== {len(sys.argv) - 1} sorties parcourues, {len(MOTIFS)} motifs : vues {tv} · masquées {tm} · NON masquées {tv - tm}")
