#!/usr/bin/env python3
"""
D325 — EXTRACTEUR DES JOURNAUX DES PORTES du rang 32 (pièce jetable, versée avec ce qu'elle a produit ; jamais promue en instrument).

POURQUOI : un journal brut de `pnpm test` ou de `pnpm test:e2e` porte les journaux des serveurs (cookies, liens à jeton, requêtes) : il ne se verse pas (D200). On verse un RÉSUMÉ :
le code et la durée de chaque porte, les lignes `Test Files` / `Tests` de vitest rattachées à leur paquet par la ligne `RUN`, et pour typecheck / lint / build le compte des paquets lancés
et des paquets finis. ⚠ D275 : les journaux portent des codes ANSI — ils sont retirés AVANT toute lecture. ⚠ D290 : chaque compte s'imprime avec ce qu'il a PARCOURU et son attendu.

Usage : python3 docs/preuves/D325/portes/extraire-portes.py <dossier des journaux> <portes-resume.txt> <sortie>
Les journaux attendus dans le dossier : porte-typecheck.log, porte-lint.log, porte-test.log, porte-build.log, porte-test-int.log.
"""
import io
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
ANSI = re.compile(r"\x1b\[[0-9;]*m")


def lire(chemin):
    return [ANSI.sub("", l.rstrip("\r")) for l in io.open(chemin, encoding="utf-8", errors="replace").read().split("\n")]


def calibrer():
    """Deux bras : un texte témoin qui porte des codes ANSI ET des lignes à compter."""
    temoin = "\x1b[2mapps/api typecheck$ tsc\x1b[22m\napps/api typecheck: Done\n RUN  v3.2.7 C:/x/apps/api\n Test Files  2 passed (2)\n      Tests  9 passed (9)\n"
    for nom, texte in (("avec ANSI", temoin), ("sans ANSI", ANSI.sub("", temoin))):
        lignes = [ANSI.sub("", l) for l in texte.split("\n")]
        lances = sum(1 for l in lignes if re.search(r" (typecheck|lint|build)\$ ", l))
        finis = sum(1 for l in lignes if re.search(r" (typecheck|lint|build): Done$", l))
        tests = [l.strip() for l in lignes if re.match(r"^\s+Tests\s+", l)]
        if (lances, finis, len(tests)) != (1, 1, 1):
            print(f"CALIBRATION ÉCHOUÉE ({nom}) : {(lances, finis, len(tests))} au lieu de (1, 1, 1)")
            sys.exit(2)
        print(f"calibration {nom} : lancés/finis/lignes « Tests » = {(lances, finis, len(tests))} (attendu (1, 1, 1))")


def main():
    if len(sys.argv) != 4:
        print(__doc__)
        return 2
    dossier, resume, sortie = sys.argv[1], sys.argv[2], sys.argv[3]
    calibrer()
    out = ["# RÉSUMÉ DES PORTES — rang 32 (D325) — produit par docs/preuves/D325/portes/extraire-portes.py ; les journaux bruts ne sont pas versés (journaux de serveur).", ""]
    out += ["## Codes et durées (relevés par la commande qui a lancé chaque porte)"] + [l.rstrip() for l in io.open(resume, encoding="utf-8").read().split("\n") if l.strip()] + [""]
    erreurs = 0
    for porte in ("typecheck", "lint", "build"):
        lignes = lire(f"{dossier}/porte-{porte}.log")
        lances = [re.match(r"^(\S+) " + porte + r"\$ ", l).group(1) for l in lignes if re.match(r"^(\S+) " + porte + r"\$ ", l)]
        finis = [re.match(r"^(\S+) " + porte + r": Done$", l).group(1) for l in lignes if re.match(r"^(\S+) " + porte + r": Done$", l)]
        ok = sorted(lances) == sorted(finis) and len(lances) > 0
        erreurs += not ok
        out.append(f"## {porte} : {len(lignes)} lignes examinées · paquets lancés {len(lances)} · finis « Done » {len(finis)} · égaux : {'OUI' if ok else 'NON'} (attendu OUI)")
        out.append("   " + ", ".join(sorted(finis)))
        out.append("")
    for porte, fichier in (("test", "porte-test.log"), ("test:int", "porte-test-int.log")):
        lignes = lire(f"{dossier}/{fichier}")
        out.append(f"## {porte} : {len(lignes)} lignes examinées")
        courant = None
        n_run = n_files = n_tests = 0
        for l in lignes:
            m = re.match(r"^\s*RUN\s+v\S+\s+(\S+)", l)
            if m:
                courant = m.group(1).replace("\\", "/").split("Zwadj/")[-1]
                n_run += 1
            if re.match(r"^\s+Test Files\s+", l):
                out.append(f"   [{courant}] {l.strip()}")
                n_files += 1
            if re.match(r"^\s+Tests\s+", l):
                out.append(f"   [{courant}] {l.strip()}")
                n_tests += 1
        egal = n_run == n_files == n_tests and n_run > 0
        erreurs += not egal
        out.append(f"   lignes RUN {n_run} · « Test Files » {n_files} · « Tests » {n_tests} · égaux : {'OUI' if egal else 'NON'} (attendu OUI)")
        out.append("")
    io.open(sortie, "w", encoding="utf-8", newline="\n").write("\n".join(out) + "\n")
    print(f"écrit : {sortie} ({len(out)} lignes) · incohérences : {erreurs} (attendu 0)")
    return 1 if erreurs else 0


if __name__ == "__main__":
    sys.exit(main())
