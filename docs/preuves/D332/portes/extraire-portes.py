"""D332 — EXTRACTEUR DES PORTES (typecheck, lint, test, build, test:int, e2e). Pièce versée, procédure archivée comme PREUVE (D291), jamais promue en instrument.

POURQUOI. Le journal brut d'une porte porte des centaines de lignes de DOM, des liens à jeton de la pile e2e (vérification d'e-mail) et des chemins de poste : le dépôt n'en garde pas le brut ; il garde un EXTRAIT, avec le hachage du brut,
le code de sortie RÉEL de la commande (jamais celui de son enveloppe), ce que l'extracteur a PARCOURU et l'attendu à côté (D290), et — pour `test` et `test:int` — les totaux CONFRONTÉS à ceux de la passe de D331 LUS dans
sa pièce versée, jamais recopiés de mémoire.
USAGE, depuis la racine, bash : python3 docs/preuves/D332/portes/extraire-portes.py <porte> <journal brut> <sortie> <code de sortie> <durée en s> <HEAD>
  <porte> ∈ typecheck, lint, test, build, test-int, e2e.
CALIBRATION, deux bras, rejouée à chaque lancement, abandon si un seul manque : (positif) un texte synthétique à deux résumés vitest et un « 3 passed » Playwright rend les totaux attendus ; (négatif) un texte sans résumé rend
ZÉRO résumé ET le dit — un zéro ne se lit pas comme « rien à signaler » (D275).
"""
import glob
import hashlib
import json
import os
import re
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")

ANSI = re.compile(r"\x1b\[[0-9;]*m")


def resumes_vitest(texte: str):
    """[(fichiers passés, en échec, total), (tests passés, en échec, total)] pour chaque couple « Test Files / Tests » du journal."""
    lignes = ANSI.sub("", texte).splitlines()
    sortie = []
    for i, l in enumerate(lignes):
        m = re.match(r"^\s*Test Files\s+(.*)$", l)
        if m:
            suivante = next((x for x in lignes[i + 1:i + 3] if re.match(r"^\s*Tests\s", x)), None)
            if suivante is None:
                continue
            def trio(s):
                p = re.search(r"(\d+) passed", s)
                e = re.search(r"(\d+) failed", s)
                t = re.search(r"\((\d+)\)", s)
                return (int(p[1]) if p else 0, int(e[1]) if e else 0, int(t[1]) if t else 0)
            sortie.append((trio(m[1]), trio(suivante)))
    return sortie


def playwright(texte: str):
    t = ANSI.sub("", texte)
    d = {k: int(m[1]) for k in ("passed", "failed", "flaky", "skipped") if (m := re.search(rf"^\s+(\d+) {k}\b", t, re.M))}
    verdicts = [l.strip() for l in t.splitlines() if re.match(r"^\s+(ok|✘|x|-) +\d+ \[", l)]
    return d, verdicts


CAL_TXT = (" Test Files  2 passed (2)\n      Tests  10 passed (10)\n bruit\n Test Files  1 failed | 3 passed (4)\n      Tests  1 failed | 20 passed (21)\n"
           "  3 passed (1.0m)\n  ok 1 [chromium] › a.ts:1:1 › t (1s)\n")
cal = [
    ("positif : deux résumés vitest lus avec leurs trios", resumes_vitest(CAL_TXT) == [((2, 0, 2), (10, 0, 10)), ((3, 1, 4), (20, 1, 21))]),
    ("positif : « 3 passed » Playwright et un verdict lu", playwright(CAL_TXT) == ({"passed": 3}, ["ok 1 [chromium] › a.ts:1:1 › t (1s)"])),
    ("négatif : un texte sans résumé rend 0 résumé et 0 verdict", resumes_vitest("rien\n") == [] and playwright("rien\n") == ({}, [])),
]
for nom, ok in cal:
    print(f"   {'✓' if ok else '✗'} calibration — {nom}")
if not all(ok for _, ok in cal):
    sys.exit("✗ ABANDON : calibration manquée")
print(f"   calibration : {len(cal)} bras, 0 manqué")

if len(sys.argv) != 7:
    sys.exit("usage : voir l'en-tête")
porte, brut, sortie, code, duree, head = sys.argv[1:7]
octets = open(brut, "rb").read()
texte = octets.decode("utf-8", errors="replace")
propre = ANSI.sub("", texte)
out = [
    f"# D332 — porte `{porte}`",
    f"# HEAD au lancement : {head} (arbre de travail : seuls `docs/preuves/D332/{{navigateur,vert}}` non suivis, aucun fichier de code modifié — vérifié par `git status` avant la passe)",
    f"# code de sortie RÉEL de la commande : {code} · durée : {duree} s (DONNÉE NON CERTIFIANTE : aucune durée ne se compare, D290 ; état de la machine : `etat-machine.txt`)",
    f"# journal brut (hors dépôt) : SHA-256 {hashlib.sha256(octets).hexdigest()} · {len(octets)} octets · {len(propre.splitlines())} lignes",
    "",
    f"parcouru : {len(propre.splitlines())} ligne(s)",
]
if porte in ("typecheck", "lint", "build"):
    mot = {"typecheck": "typecheck", "lint": "lint", "build": "build"}[porte]
    faits = re.findall(rf"^(\S+) {mot}: Done$", propre, re.M)
    echecs = re.findall(rf"^(\S+) {mot}: Failed$", propre, re.M)
    # L'attendu se DÉRIVE du dépôt : les paquets dont le `package.json` déclare ce script (pas de la portée annoncée par pnpm, qui compte aussi les paquets sans le script).
    avec = sorted(
        os.path.dirname(f).replace("\\", "/")
        for f in glob.glob("apps/*/package.json") + glob.glob("packages/*/package.json") + ["e2e/package.json"]
        if mot in json.load(open(f, encoding="utf-8")).get("scripts", {})
    )
    out.append(f"paquets « Done » : {len(faits)} ({', '.join(sorted(faits))}) ; « Failed » : {len(echecs)} (attendu : 0)")
    out.append(f"paquets dont le package.json déclare le script `{mot}` : {len(avec)} ({', '.join(avec)}) (attendu : les mêmes que les « Done » : {'égaux' if sorted(faits) == avec else 'DIFFÉRENTS'})")
    out.append(f"code de sortie lu : {code} (attendu : 0)")
elif porte in ("test", "test-int"):
    r = resumes_vitest(texte)
    out.append(f"résumés vitest lus : {len(r)} (attendu : {4 if porte == 'test' else 1})")
    for i, (f, t) in enumerate(r, 1):
        out.append(f"  résumé {i} : fichiers passés {f[0]} · en échec {f[1]} · total {f[2]} ; tests passés {t[0]} · en échec {t[1]} · total {t[2]}")
    base_txt = open("docs/preuves/D331/portes/" + ("test.txt" if porte == "test" else "test-int.txt"), encoding="utf-8").read()
    if porte == "test":
        base = [tuple(int(x) for x in m.groups()) for m in re.finditer(r"résumé \d : fichiers passés (\d+) · en échec \d+ · total \d+ ; tests passés (\d+)", base_txt)]
        mes = [(f[0], t[0]) for f, t in r]
        out.append(f"base de D331 (LUE dans docs/preuves/D331/portes/test.txt) : {base}")
        out.append(f"mesuré : {mes}")
        out.append(f"somme : {sum(t for _, t in mes)} tests / {sum(f for f, _ in mes)} fichiers ; en échec : {sum(t[1] for _, t in r)} · base {sum(t for _, t in base)} tests / {sum(f for f, _ in base)} fichiers · écart {sum(t for _, t in mes) - sum(t for _, t in base):+d} tests, {sum(f for f, _ in mes) - sum(f for f, _ in base):+d} fichiers")
    else:
        base = re.search(r"résumé : \[\(\((\d+), (\d+), (\d+)\), \((\d+), (\d+), (\d+)\)\)\]", base_txt)
        out.append(f"base de D331 : fichiers {base[3]}, tests {base[6]}" if base else "base de D331 : INTROUVABLE")
        if r and base:
            out.append(f"mesuré : fichiers {r[0][0][2]}, tests {r[0][1][2]} · écart {r[0][1][2] - int(base[6]):+d} tests, {r[0][0][2] - int(base[3]):+d} fichiers")
elif porte == "e2e":
    d, verdicts = playwright(texte)
    out.append(f"résumé Playwright : {d} (attendu : aucun « failed »)")
    out.append(f"verdicts lus : {len(verdicts)} ; total du résumé : {sum(d.values())} (attendu : égaux — D275)")
    out.append("")
    for v in verdicts:
        out.append(v[:260])
else:
    sys.exit(f"porte inconnue : {porte}")
open(sortie, "w", encoding="utf-8", newline="").write("\n".join(out) + "\n")
print(f"extrait écrit : {sortie} ({len(out)} lignes)")
