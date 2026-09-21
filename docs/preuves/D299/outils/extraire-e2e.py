"""EXTRAIT DÉRIVÉ DU JOURNAL e2e — point 9 du critère du rang 9 (règle de Ko, D294), écrit par D299.

Usage, depuis la racine :
    python3 docs/preuves/D299/outils/extraire-e2e.py SOURCE DESTINATION
    python3 docs/preuves/D299/outils/extraire-e2e.py --calibration-seule
Chaque invocation REJOUE la calibration d'abord, et ABANDONNE si un bras manque (D286).
Codes : 0 = extrait écrit ; 2 = abandon (calibration, ou jeton dans la sortie) — rien n'est écrit.

POURQUOI IL VIT ICI ET PAS DANS `neutralisation/` (Ko, D299, point 3) : un script de `neutralisation/`
ferait COMPTER la certification — un troisième lot de code, interdit. Sous `docs/preuves/`, il est
exempté parce qu'AUCUNE PORTE NE LE LIT (D292). ⚠ C'est une PROCÉDURE archivée comme preuve.

POURQUOI UN EXTRAIT, ET PAS LE JOURNAL : le serveur de développement imprime les liens de vérification
d'e-mail (pas de mailer en dev) et l'e2e crée des comptes — le journal brut porte des jetons. Une preuve
ne se caviarde pas (D291) : le journal reste HORS DÉPÔT et c'est un EXTRAIT, nommé comme tel, qui entre.

CE QUE LE POINT 9 EXIGE, ET COMMENT C'EST TENU :
  (a) RECOMPTER l'e2e par l'extrait seul — il garde « Running N tests », CHAQUE ligne de résultat du
      rapporteur `list` et les lignes de résumé ; il imprime le recompte À CÔTÉ du résumé.
      Marques RELEVÉES dans la source de Playwright 1.50.1 (`lib/reporters/list.js`, l. 27-29 et 149-161),
      jamais écrites de mémoire : sous Windows hors VS Code, `ok` (réussi) et `x` (échoué), `✓`/`✘`
      ailleurs ; `-` pour un test ignoré. Résumé (`lib/reporters/base.js`, l. 216-237) : `N failed`,
      `N interrupted`, `N flaky`, `N skipped`, `N did not run`, `N passed`.
  (b) CONFRONTER chaque « failed » à son contexte (D275) — il garde les blocs d'échec du rapporteur
      (`  N) [projet] › …` jusqu'au bloc ou au résumé suivant) ET, pour TOUTE ligne qui porte « fail »
      (insensible à la casse), une fenêtre de 3 lignes de part et d'autre. Il imprime le nombre de
      lignes « fail » du journal et le nombre gardé (attendu : toutes).
  LISTE BLANCHE, jamais noire : une ligne n'entre que si une règle la retient. ⛔ LES JETONS SONT EXCLUS
  PAR CONSTRUCTION — aucune règle ne retient une ligne de lien — ET UNE FENÊTRE PEUT EN ENGLOBER UNE :
  la sortie est alors REFUSÉE (abandon), jamais filtrée. Le garde-fou compte le paramètre du lien ET
  chacune des valeurs de 43 caractères relevées dans la source.
  PARCOURU (D290), et le `+1` de D294 corrigé : lignes par `splitlines()`, ATTENDU par le compte des
  octets de saut de ligne — deux méthodes, pas une ; ANSI retiré avant toute règle (D275).

CALIBRATION, trois bras :
  réel            le journal e2e du rang 15 (HORS dépôt, empreinte épinglée) — 910 lignes, 35 tests,
                  34 `ok`, 1 `-`, 0 `x`, 4 lignes « fail », 24 jetons dans la source et 0 dans la sortie.
                  Absent ⇒ NON REJOUÉ, dit en tête ; les deux bras construits se rejouent partout.
  échec construit un run à un test échoué : le bloc d'échec est gardé avec son message, et le recompte
                  rend `x` = `failed`.
  garde-fou       une ligne de lien À DEUX LIGNES d'un « failed » : l'extracteur doit REFUSER.
"""
import hashlib
import os
import re
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")

if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO.")
    sys.exit(2)

PARAM = "to" + "ken"  # assemblé : écrit en clair, ce fichier se détecterait au prochain audit (D291)
LIEN = re.compile(r"verification-email\?" + PARAM + r"=([A-Za-z0-9_-]{43})(?![A-Za-z0-9_-])")
ANSI = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")
R_RUNNING = re.compile(r"^\s*Running (\d+) tests? using \d+ workers?")
R_RESULTAT = re.compile(r"^  (ok|x|✓|✘|-)\s+(\d+) \[[^\]]+\] › ")
R_RESUME = re.compile(r"^  (\d+) (failed|interrupted|flaky|skipped|did not run|passed)\b")
R_RESUME_TEST = re.compile(r"^    \[[^\]]+\] › ")
R_ECHEC = re.compile(r"^  (\d+)\) \[[^\]]+\] › ")
FENETRE = 3
CAS_REEL = ".neutralisation-journaux/rang15-e2e.log"
CAS_REEL_SHA = "67354b7e73cf2d1b56789be55c5bdb2de257af30af65866f28630ae0a6e7f411"


class Refus(Exception):
    pass


def extraire(brut: bytes, nom: str) -> tuple:
    """Rend (texte de l'extrait, bilan). Lève Refus si la sortie porte un paramètre ou une valeur de lien."""
    texte = brut.decode("utf-8", errors="replace")
    attendu = brut.count(b"\n") + (1 if brut and not brut.endswith(b"\n") else 0)
    parcourues = len(texte.splitlines())
    lignes = texte.split("\n")
    if lignes and lignes[-1] == "":
        lignes.pop()  # ⚠ le `+1` de D294 : l'élément vide final n'est pas une ligne
    propres = [ANSI.sub("", l.rstrip("\r")) for l in lignes]
    garde = set()
    echec_ouvert = False
    for i, l in enumerate(propres):
        if R_ECHEC.match(l):
            echec_ouvert = True
        elif R_RESUME.match(l) or R_RUNNING.match(l):
            echec_ouvert = False
        if echec_ouvert or R_RUNNING.match(l) or R_RESULTAT.match(l) or R_RESUME.match(l) or R_RESUME_TEST.match(l):
            garde.add(i)
    fails = [i for i, l in enumerate(propres) if "fail" in l.lower()]
    for i in fails:
        garde.update(range(max(0, i - FENETRE), min(len(propres), i + FENETRE + 1)))
    marques = {"ok": 0, "x": 0, "-": 0}
    for l in propres:
        m = R_RESULTAT.match(l)
        if m:
            marques[{"✓": "ok", "✘": "x"}.get(m.group(1), m.group(1))] += 1
    resume = {}
    for l in propres:
        m = R_RESUME.match(l)
        if m:
            resume[m.group(2)] = int(m.group(1))
    running = [int(R_RUNNING.match(l).group(1)) for l in propres if R_RUNNING.match(l)]
    corps = [f"{i + 1:05d} | {propres[i]}" for i in sorted(garde)]
    recompte = [
        (f"`ok` {marques['ok']}", "passed", resume.get("passed", 0), marques["ok"] == resume.get("passed", 0)),
        (f"`x` {marques['x']}", "failed + interrupted",
         resume.get("failed", 0) + resume.get("interrupted", 0), marques["x"] == resume.get("failed", 0) + resume.get("interrupted", 0)),
        (f"`-` {marques['-']}", "skipped", resume.get("skipped", 0), marques["-"] == resume.get("skipped", 0)),
        (f"lignes de résultat {sum(marques.values())}", "Running − did not run",
         (running[0] if running else 0) - resume.get("did not run", 0),
         sum(marques.values()) == (running[0] if running else 0) - resume.get("did not run", 0)),
    ]
    fails_gardees = sum(1 for i in fails if i in garde)
    entete = [
        f"EXTRAIT DÉRIVÉ de {nom} — PAS la pièce brute (critère du rang 9, point 9 ; D294, D299).",
        "Le journal brut reste HORS DÉPÔT : il porte des jetons de vérification d'e-mail imprimés par le",
        "serveur de développement. Une preuve ne se caviarde pas (D291) : ceci est une LISTE BLANCHE — Running,",
        "chaque ligne de résultat, le résumé, les blocs d'échec, et 3 lignes autour de toute ligne « fail ».",
        "Codes ANSI retirés. En tête de chaque ligne gardée : son numéro dans le journal.",
        f"lignes parcourues : {parcourues} (attendu {attendu}, par les octets de saut de ligne) · gardées : {len(garde)}",
        f"Running : {running} · résumé : {resume}",
    ]
    entete += [f"recompte : {a} ⇔ {b} {c} → {'✓' if ok else '✗ INCOHÉRENT'}" for a, b, c, ok in recompte]
    entete.append(f"lignes « fail » du journal : {len(fails)} · gardées avec leur fenêtre : {fails_gardees} "
                  f"(attendu {len(fails)})")
    sortie = "\n".join(entete + ["--- lignes gardées ---"] + corps) + "\n"
    valeurs = set(LIEN.findall(texte))
    n_param = sortie.count(PARAM + "=")
    n_val = sum(1 for v in valeurs if v in sortie)
    bilan = {"parcourues": parcourues, "attendu": attendu, "gardees": len(garde), "running": running,
             "resume": resume, "marques": marques, "recompte_ok": all(r[3] for r in recompte),
             "fails": len(fails), "fails_gardees": fails_gardees, "valeurs_source": len(valeurs),
             "param_sortie": n_param, "valeurs_sortie": n_val, "lignes_echec": sum(1 for l in corps if "Error" in l)}
    if n_param or n_val:
        raise Refus(f"la sortie porterait le paramètre du lien {n_param} fois et {n_val} valeur(s) réelle(s)")
    return sortie, bilan


def calibrer() -> tuple:
    lignes, manques = [], []

    def bras(nom, ok, detail):
        lignes.append(f"   {'✓' if ok else '✗'} {nom:15s} {detail}")
        if not ok:
            manques.append(nom)

    lien = ("[WebServer] http://localhost:5273/auth/verification-email?" + PARAM + "="
            + ("Zw4dj_calibration-" * 3)[:43])
    echec = "\n".join([
        "Running 3 tests using 1 worker", "",
        "  ok 1 [chromium] › a.e2e.ts:1:1 › passe (1.0s)",
        "  x  2 [chromium] › b.e2e.ts:1:1 › échoue (2.0s)",
        "  -  3 [chromium] › c.e2e.ts:1:1 › ignoré", "",
        "  1) [chromium] › b.e2e.ts:1:1 › échoue ──────────", "",
        "    Error: expect(received).toBe(expected)", "    Expected: 1", "    Received: 2", "",
        "  1 failed", "    [chromium] › b.e2e.ts:1:1 › échoue", "  1 skipped", "  1 passed (3.0s)", ""])
    _, b = extraire(echec.encode("utf-8"), "échec construit")
    bras("échec construit", b["marques"] == {"ok": 1, "x": 1, "-": 1} and b["recompte_ok"] and b["lignes_echec"] >= 1,
         f"marques {b['marques']} (attendu ok 1 · x 1 · - 1) · recompte cohérent {b['recompte_ok']} · bloc d'échec "
         f"gardé avec son message : {b['lignes_echec']} ligne(s) « Error » (attendu ≥ 1)")
    piege = "\n".join(["Running 1 test using 1 worker", "[WebServer] request errored",
                       "[WebServer]   \"message\": \"failed with status code 500\"", "[WebServer] …", lien,
                       "  ok 1 [chromium] › a.e2e.ts:1:1 › passe (1.0s)", "  1 passed (1.0s)", ""])
    try:
        extraire(piege.encode("utf-8"), "garde-fou")
        refuse = False
    except Refus:
        refuse = True
    bras("garde-fou", refuse, f"lien à deux lignes d'un « failed » : refusé {refuse} (attendu True)")
    if not os.path.isfile(CAS_REEL):
        etat = f"NON REJOUÉ — {CAS_REEL} absent (hors dépôt)"
    else:
        brut = open(CAS_REEL, "rb").read()
        if hashlib.sha256(brut).hexdigest() != CAS_REEL_SHA:
            etat = "NON REJOUÉ — ce n'est pas le fichier dont la réponse est connue (empreinte ≠)"
        else:
            _, b = extraire(brut, CAS_REEL)
            ok = (b["parcourues"] == 910 and b["attendu"] == 910 and b["running"] == [35]
                  and b["marques"] == {"ok": 34, "x": 0, "-": 1} and b["resume"] == {"skipped": 1, "passed": 34}
                  and b["recompte_ok"] and b["fails"] == 4 and b["fails_gardees"] == 4
                  and b["valeurs_source"] == 24 and b["param_sortie"] == 0 and b["valeurs_sortie"] == 0)
            bras("réel", ok, f"rang 15 : {b['parcourues']} lignes (attendu 910, octets {b['attendu']}) · Running "
                 f"{b['running']} · marques {b['marques']} · résumé {b['resume']} · « fail » {b['fails']} gardées "
                 f"{b['fails_gardees']} (attendu 4 · 4) · jetons source {b['valeurs_source']} (attendu 24), sortie "
                 f"{b['valeurs_sortie']} (attendu 0)")
            etat = "rejoué" if ok else "MANQUÉ"
    if etat.startswith("NON"):
        lignes.append(f"   ⚠ réel            {etat}")
    return lignes, manques, etat


def main(argv: list) -> int:
    lignes, manques, etat = calibrer()
    print("== CALIBRATION — trois bras, abandon si un seul manque")
    print("\n".join(lignes))
    print(f"   calibration : {sum(1 for l in lignes if l.startswith('   ✓'))} bras passent · {len(manques)} manqué(s) · réel : {etat}")
    if manques:
        print(f"ABANDON : bras manqué(s) : {', '.join(manques)} — rien n'est écrit")
        return 2
    if argv == ["--calibration-seule"]:
        return 0
    if len(argv) != 2:
        print("ABANDON : usage SOURCE DESTINATION")
        return 2
    src, dst = argv
    try:
        sortie, b = extraire(open(src, "rb").read(), src.replace("\\", "/"))
    except Refus as e:
        print(f"ABANDON : {e} — rien n'est écrit")
        return 2
    with open(dst, "w", encoding="utf-8", newline="\n") as f:
        f.write(sortie)
    relu = open(dst, "rb").read().decode("utf-8")
    print(f"== EXTRAIT : {b['parcourues']} lignes parcourues (attendu {b['attendu']}) · {b['gardees']} gardées · Running "
          f"{b['running']} · marques {b['marques']} · résumé {b['resume']} · recompte cohérent {b['recompte_ok']} · "
          f"« fail » {b['fails']} gardées {b['fails_gardees']} · jetons dans la source {b['valeurs_source']}, dans la "
          f"sortie {b['valeurs_sortie']} (attendu 0) · relu identique {relu == sortie}")
    print("écrit : " + dst.replace("\\", "/"))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
