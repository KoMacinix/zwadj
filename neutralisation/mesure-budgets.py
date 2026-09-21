#!/usr/bin/env python3
"""MESURE DES BUDGETS DE TEST — rang 17, forme (b), D297. Instrument, PAS une campagne.

Depuis la RACINE du monorepo :
    python3 neutralisation/mesure-budgets.py --calibrer
    python3 neutralisation/mesure-budgets.py --encadrement [--paquet apps/pro]
    python3 neutralisation/mesure-budgets.py --mesurer [--paquet apps/pro]
Chaque invocation REJOUE la calibration d'abord, et abandonne si un bras manque.
Rapports JSON bruts et résumés : `.neutralisation-journaux/budgets/` (ignoré par git) ;
ceux qu'une décision cite sont COPIÉS dans `docs/preuves/<Dnnn>/` (D291).

POURQUOI IL EXISTE. Aucune des quatre configurations unitaires n'écrivait de
`testTimeout` : le verdict des portes reposait sur un défaut de vitest que personne
n'avait écrit (report `[MÉTHODE][P0]` du 10/09/2026). La forme (b) écrit la valeur EN
VIGUEUR. Cet instrument fournit ce qui la fonde et ce qui se lit à côté :
  --encadrement : la valeur en vigueur, sous CHACUNE des quatre configurations,
                  `setupFiles` compris (mode n°0 du cadrage) ;
  --mesurer     : la marge, sur un MAJORANT déclaré, et N par la règle de Ko.

LA QUANTITÉ, ET CE QU'ELLE N'EST PAS (arbitrage (ii) de Ko, D297). `testTimeout` borne
la seule FONCTION du test. La `duration` du reporter JSON va d'avant les `beforeEach`
à après les `afterEach` et nettoyages (vitest 3.2.7, `runTest` — mesuré par D296).
Elle est donc TOUJOURS ≥ la quantité bornée : c'est un MAJORANT, et il est DÉCLARÉ.
Une marge calculée dessus est PLUS PESSIMISTE que la vraie — elle peut inquiéter à
tort, jamais rassurer à tort. ⇒ Elle confirme qu'une borne tient ; ⛔ ELLE NE SUFFIT
PAS POUR EN CHOISIR UNE NOUVELLE : écrire autre chose que la valeur en vigueur exige
un instrument qui chronomètre la seule fonction du test (sortie (i) de D296).
⇒ Ce script écrit « marge ≥ X », jamais « marge = X ».

INSTRUMENTS ÉCARTÉS, ET SUR QUELLE MESURE.
  · Un extracteur de la sortie console : codes ANSI (D275, premier faux positif de la
    série), et vitest n'y imprime que les tests jugés lents. Écarté au cadrage (D295).
  · La `duration` JSON prise pour la quantité EXACTE : réfutée par D296 — le bras de
    discrimination rendait 1 208 à 1 218 ms là où il exigeait < 100.
  · Un runner réservé à la mesure (`runner.runTask` + `task.meta`) : piste NON
    VÉRIFIÉE, écartée par l'arbitrage de Ko — une précision dont aucune décision ne
    dépend, au prix d'un instrument neuf sur une API non vérifiée.
  · Une configuration ENVELOPPE pour jouer le témoin : elle mesurerait l'enveloppe.
    Le témoin est écrit dans le motif d'inclusion du paquet, et joué par la
    configuration du paquet lui-même.

CALIBRATION — TROIS BRAS, REJOUÉE À CHAQUE INVOCATION, ABANDON SI UN SEUL MANQUE (D286).
Suite témoin construite, configuration nue :
  positif        un test qui dort 1 200 ms              maximum dans [1 200 ; 1 300]
  négatif        deux tests vides                        maximum < 100
  discrimination 1 200 ms dans un beforeEach, vides      maximum ≥ 1 200 (le majorant
                                                         DOIT les compter)
⚠ La tolérance [1 200 ; 1 300] est POSÉE PAR KO LE 20/09/2026 APRÈS TROIS OBSERVATIONS
(1 204 · 1 205,7 · 1 213,6 ms, D296) — pas « écrite d'avance ». Borne basse : un
sommeil ne dure pas moins que lui-même.
⚠ Le bras de discrimination est celui qui prouve que le majorant CONTIENT ce qu'il
déclare contenir ; le négatif est celui qui refuse un menteur constant.

LA VALEUR ATTENDUE N'EST ÉCRITE NULLE PART ICI : elle est lue à l'exécution dans le
texte d'aide de vitest (`--testTimeout … (default: V)`). Trois sources, nommées, et
aucune ne suffit seule : le texte d'aide ; la signature `Test timed out in Vms`,
générée depuis la valeur EFFECTIVE du processus (`makeTimeoutError`) ; l'encadrement
comportemental V − 100 passe / V + 100 échoue.
⚠ Un échec du bras V − 100 est à 100 ms du seuil, dans la zone que la contention
mange : il SE REPRODUIT AU REPOS avant d'être cru (code de sortie 3, `--paquet`).

TÉMOINS TEMPORAIRES. Écrits dans `src/` du paquet (`__temoin_budget__.spec.ts` pour
`apps/api`, `.test.ts` ailleurs), PURGÉS AU DÉMARRAGE ET EN FIN : un `finally` ne
survit pas à un signal (D224). Sommeil par `node:timers/promises`, qui échappe aux
horloges factices de vitest.

CODES DE SORTIE : 0 tout a rendu son verdict · 1 un verdict est manqué (encadrement ≠
V, passe non verte, compte de tests qui change) · 2 calibration manquée ou erreur
d'instrument · 3 bras V − 100 échoué, à reproduire au repos.
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time
import xml.etree.ElementTree as ET

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO (pnpm-workspace.yaml introuvable).")
    sys.exit(2)

RACINE = os.getcwd()
JOURNAUX = os.path.join(RACINE, ".neutralisation-journaux", "budgets")
NOM_TEMOIN = "__temoin_budget__"

# (nom, dossier du paquet, configuration, témoin relatif au dossier). Ordre DÉCLARÉ
# au cadrage amendé (D297) : c'est aussi l'ordre des mesures.
# ⛔ `apps/api/vitest.config.int.ts` n'y figure PAS et n'y figurera jamais (mode n°1).
PAQUETS = [
    ("packages/api-client", "packages/api-client", "packages/api-client/vitest.config.ts",
     "src/__temoin_budget__.test.ts"),
    ("apps/api", "apps/api", "apps/api/vitest.config.ts", "src/__temoin_budget__.spec.ts"),
    ("apps/client", "apps/client", "apps/client/vitest.config.ts",
     "src/__temoin_budget__.test.ts"),
    ("apps/pro", "apps/pro", "apps/pro/vite.config.ts", "src/__temoin_budget__.test.ts"),
]

TOL_POSITIF = (1200.0, 1300.0)   # posée par Ko après trois observations (D297)
SEUIL_NEGATIF = 100.0
SEUIL_DISCRIMINATION = 1200.0
SEUIL_N = 0.05                   # arbitrage de Ko (D295)
PLAFOND_PASSES = 15              # arbitrage de Ko (D295)
ECART_ENCADREMENT = 100          # ±100 ms autour de V (D295, n°0)


def horodatage():
    return time.strftime("%Y-%m-%d %H:%M:%S")


def node():
    n = shutil.which("node")
    if not n:
        print("✗ ERREUR D'INSTRUMENT : node introuvable")
        sys.exit(2)
    return n


def vitest_mjs(dossier):
    p = os.path.join(RACINE, dossier, "node_modules", "vitest", "vitest.mjs")
    if not os.path.isfile(p):
        print(f"✗ ERREUR D'INSTRUMENT : {p} introuvable")
        sys.exit(2)
    return p


def environnement():
    # ⛔ Un relevé ne sort jamais en vert (S8) : sous cette variable, la garde des
    #   sorties console est désactivée. On refuse de mesurer plutôt que de l'ôter en
    #   silence — elle signalerait un shell dans un état que personne n'a déclaré.
    if os.environ.get("UPDATE_CONSOLE_CEILINGS"):
        print("✗ UPDATE_CONSOLE_CEILINGS est définie : refus de mesurer (garde S8 désactivée).")
        sys.exit(2)
    return dict(os.environ)


def junit_de(rapport):
    return rapport[:-5] + ".junit.xml" if rapport.endswith(".json") else rapport + ".junit.xml"


def jouer(dossier, args, rapport, racine_vitest=None):
    """Lance vitest dans `dossier` avec les reporters JSON ET JUnit. Rend (code, sortie,
    rapport JSON lu, mur). Le JUnit s'écrit à côté (`junit_de(rapport)`).

    ⚠ Les rapports sont SUPPRIMÉS avant : un rapport ancien relu après une exécution qui
    n'a rien écrit serait une mesure d'hier présentée comme celle d'aujourd'hui.
    ⛔ POURQUOI DEUX REPORTERS (D297, trouvé en confrontant la sortie brute, D275) : le
    JSON porte les DURÉES mais PAS la signature d'expiration. vitest 3.2.7 écrit
    `failureMessages` = `e.stack || e.message`, et `makeTimeoutError` REMPLACE la pile de
    l'erreur par celle de `STACK_TRACE_ERROR` : le message « Test timed out in … » n'y est
    jamais. Le JUnit écrit `<failure message="…">` depuis `error.message` : c'est lui qui
    porte la signature, sans codes ANSI. Chacun est lu pour ce qu'il porte."""
    os.makedirs(os.path.dirname(rapport), exist_ok=True)
    for r_ in (rapport, junit_de(rapport)):
        if os.path.exists(r_):
            os.remove(r_)
    cmd = [node(), vitest_mjs(racine_vitest or dossier), "run", *args,
           "--reporter=json", "--reporter=junit",
           f"--outputFile.json={rapport}", f"--outputFile.junit={junit_de(rapport)}"]
    debut = time.time()
    r = subprocess.run(cmd, cwd=os.path.join(RACINE, dossier), capture_output=True,
                       text=True, encoding="utf-8", errors="replace", env=environnement())
    mur = time.time() - debut
    lu = None
    if os.path.exists(rapport):
        with open(rapport, encoding="utf-8") as h:
            lu = json.load(h)
    return r.returncode, (r.stdout or "") + (r.stderr or ""), lu, mur


def tests_du(rapport):
    """Liste (fichier, nom complet, statut, durée ms, messages d'échec)."""
    out = []
    for f in rapport.get("testResults", []):
        fic = os.path.relpath(f.get("name", "?"), RACINE).replace("\\", "/")
        for t in f.get("assertionResults", []):
            out.append((fic, t.get("fullName", "?"), t.get("status", "?"),
                        float(t.get("duration") or 0.0), t.get("failureMessages") or []))
    return out


def echecs_junit(rapport):
    """{nom du test : [messages d'échec]} lus dans le JUnit écrit à côté du rapport JSON.
    Rend None si le JUnit n'existe pas — jamais un dictionnaire vide qui se lirait
    « aucun échec »."""
    chemin = junit_de(rapport)
    if not os.path.exists(chemin):
        return None
    out = {}
    for cas in ET.parse(chemin).getroot().iter("testcase"):
        out[cas.get("name", "?")] = [f.get("message", "") for f in cas.findall("failure")]
    return out


def signatures(messages):
    return sorted({s for m in messages for s in re.findall(r"Test timed out in \d+ms", m)})


def source_temoin(tests, dans_before_each=None):
    lignes = ['import { setTimeout as dormir } from "node:timers/promises";']
    if dans_before_each is not None:
        lignes.append(f"beforeEach(async () => {{ await dormir({dans_before_each}); }});")
    for nom, ms in tests:
        corps = f"await dormir({ms});" if ms else ""
        lignes.append(f'it("{nom}", async () => {{ {corps} }});')
    return "\n".join(lignes) + "\n"


def chemin_temoin(paquet):
    _, dossier, _, rel = paquet
    return os.path.join(RACINE, dossier, rel)


def purger_temoins():
    n = 0
    for p in PAQUETS:
        c = chemin_temoin(p)
        if os.path.exists(c):
            os.remove(c)
            n += 1
    return n


def valeur_aide():
    """V, lue dans le texte d'aide de vitest — première des trois sources."""
    r = subprocess.run([node(), vitest_mjs("apps/api"), "--help"], cwd=os.path.join(RACINE, "apps/api"),
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    m = re.search(r"--testTimeout <timeout>[^\n]*\(default: (\d+)\)", r.stdout or "")
    if not m:
        print("✗ ERREUR D'INSTRUMENT : `--testTimeout … (default: V)` introuvable dans l'aide")
        sys.exit(2)
    return int(m.group(1))


# ---------------------------------------------------------------------------
# CALIBRATION
# ---------------------------------------------------------------------------
def calibrer():
    print(f"== CALIBRATION ({horodatage()}) — trois bras, abandon si un seul manque")
    base = os.path.join(JOURNAUX, "calibration")
    os.makedirs(base, exist_ok=True)
    with open(os.path.join(base, "vitest.config.mjs"), "w", encoding="utf-8") as h:
        h.write('export default { test: { globals: true, environment: "node" } };\n')
    bras = [
        ("positif", source_temoin([("lourd", 1200), ("leger", 0)]),
         lambda m: TOL_POSITIF[0] <= m <= TOL_POSITIF[1], f"dans [{TOL_POSITIF[0]:.0f} ; {TOL_POSITIF[1]:.0f}]"),
        ("negatif", source_temoin([("leger-1", 0), ("leger-2", 0)]),
         lambda m: m < SEUIL_NEGATIF, f"< {SEUIL_NEGATIF:.0f}"),
        ("discrimination", source_temoin([("leger-1", 0), ("leger-2", 0)], dans_before_each=1200),
         lambda m: m >= SEUIL_DISCRIMINATION, f"≥ {SEUIL_DISCRIMINATION:.0f} (le majorant DOIT compter le hook)"),
    ]
    manques = []
    for nom, src, juge, attendu in bras:
        fic = os.path.join(base, f"{nom}.test.mjs")
        with open(fic, "w", encoding="utf-8") as h:
            h.write(src)
        rapport = os.path.join(base, f"{nom}.json")
        code, sortie, lu, _ = jouer("apps/api", ["--root", base, "--config",
                                                 os.path.join(base, "vitest.config.mjs"), f"{nom}.test.mjs"],
                                    rapport)
        tests = tests_du(lu) if lu else []
        mx = max((t[3] for t in tests), default=float("nan"))
        ok = code == 0 and len(tests) == 2 and all(t[2] == "passed" for t in tests) and juge(mx)
        print(f"   {'✓' if ok else '✗'} {nom:15s} tests parcourus {len(tests)} (attendu 2) · "
              f"max {mx:.1f} ms (exigé {attendu}) · code vitest {code}")
        if not ok:
            manques.append(nom)
    # --- LE LECTEUR DE SIGNATURE, calibré À PART, hors des trois bras de la pièce 3 ---
    # ⛔ Ajouté le 21/09/2026 (D297) : il n'avait AUCUNE calibration, et la première
    #   exécution de l'encadrement l'a pris en faute — il cherchait la signature dans le
    #   JSON, qui ne la porte pas. Deux bras : une expiration sous un budget CONNU (300 ms,
    #   écrit ici même) doit être lue avec SA valeur ; une erreur ordinaire, rouge aussi,
    #   ne doit PAS l'être. Sans le second, un lecteur qui verrait une signature dans tout
    #   rouge passerait.
    sig_cfg = os.path.join(base, "vitest.signature.config.mjs")
    with open(sig_cfg, "w", encoding="utf-8") as h:
        h.write('export default { test: { globals: true, environment: "node", testTimeout: 300 } };\n')
    with open(os.path.join(base, "signature.test.mjs"), "w", encoding="utf-8") as h:
        h.write(source_temoin([("expire", 600)]) + 'it("leve", () => { throw new Error("boom"); });\n')
    rapport = os.path.join(base, "signature.json")
    code, _, lu, _ = jouer("apps/api", ["--root", base, "--config", sig_cfg, "signature.test.mjs"], rapport)
    ej = echecs_junit(rapport)
    s_exp = signatures(ej.get("expire", [])) if ej is not None else None
    s_lev = signatures(ej.get("leve", [])) if ej is not None else None
    pos = s_exp == ["Test timed out in 300ms"]
    neg = ej is not None and bool(ej.get("leve")) and s_lev == []
    print(f"   {'✓' if pos else '✗'} signature+     expiration sous 300 ms : lue {s_exp} "
          f"(attendue ['Test timed out in 300ms']) · source JUnit")
    print(f"   {'✓' if neg else '✗'} signature−     erreur ordinaire : échecs {ej.get('leve') if ej else None}, "
          f"signatures lues {s_lev} (attendu [])")
    if not pos:
        manques.append("lecteur de signature (positif)")
    if not neg:
        manques.append("lecteur de signature (négatif)")
    if manques:
        print(f"⛔ CALIBRATION MANQUÉE sur : {', '.join(manques)} — l'instrument ABANDONNE (D286).")
        sys.exit(2)
    print("   calibration : 3 bras sur 3 · lecteur de signature : 2 sur 2")


# ---------------------------------------------------------------------------
# ENCADREMENT (mode n°0)
# ---------------------------------------------------------------------------
def encadrer(paquets):
    v = valeur_aide()
    bas, haut = v - ECART_ENCADREMENT, v + ECART_ENCADREMENT
    signature = f"Test timed out in {v}ms"
    print(f"== ENCADREMENT ({horodatage()}) — V = {v} lu dans le texte d'aide ; "
          f"{bas} doit passer, {haut} doit échouer avec « {signature} »")
    verdicts = []
    for p in paquets:
        nom, dossier, _, rel = p
        c = chemin_temoin(p)
        try:
            with open(c, "w", encoding="utf-8") as h:
                h.write(source_temoin([(f"encadrement {bas}", bas), (f"encadrement {haut}", haut)]))
            rapport = os.path.join(JOURNAUX, "encadrement", nom.replace("/", "_") + ".json")
            code, sortie, lu, mur = jouer(dossier, [NOM_TEMOIN], rapport)
        finally:
            if os.path.exists(c):
                os.remove(c)
        tests = tests_du(lu) if lu else []
        par_nom = {t[1]: t for t in tests}
        t_bas = par_nom.get(f"encadrement {bas}")
        t_haut = par_nom.get(f"encadrement {haut}")
        ej = echecs_junit(rapport) or {}
        bas_ok = t_bas is not None and t_bas[2] == "passed"
        haut_ok = (t_haut is not None and t_haut[2] == "failed"
                   and signature in signatures(ej.get(f"encadrement {haut}", [])))
        sig_lue = signatures([m for ms in ej.values() for m in ms])
        print(f"   {nom:20s} tests parcourus {len(tests)} (attendu 2) · {bas} : "
              f"{t_bas[2] if t_bas else 'ABSENT'} (attendu passed) · {haut} : "
              f"{t_haut[2] if t_haut else 'ABSENT'} (attendu failed) · signature lue {sig_lue or '—'} "
              f"(attendue [{signature!r}]) · {mur:.1f} s")
        verdicts.append((nom, len(tests) == 2 and bas_ok and haut_ok, bas_ok, haut_ok))
    a_reproduire = [n for n, _, b, _ in verdicts if not b]
    if a_reproduire:
        print(f"⚠ BRAS {bas} ÉCHOUÉ sur : {', '.join(a_reproduire)} — à REPRODUIRE AU REPOS avant d'être cru "
              f"(`--encadrement --paquet …`, relevé d'état devant).")
        return 3
    if not all(ok for _, ok, _, _ in verdicts):
        print(f"⛔ L'ENCADREMENT NE REND PAS {v} — le lot s'arrête et n'écrit rien (n°0).")
        return 1
    print(f"   encadrement : {len(verdicts)} configuration(s) sur {len(verdicts)} rendent V = {v} "
          f"à ±{ECART_ENCADREMENT} ms — trois sources : aide, signature effective, comportement.")
    return 0


# ---------------------------------------------------------------------------
# MESURES (pièce 2 rendue opératoire, D297)
# ---------------------------------------------------------------------------
def une_passe(p, etiquette):
    nom, dossier, _, _ = p
    rapport = os.path.join(JOURNAUX, "mesures", f"{nom.replace('/', '_')}-{etiquette}.json")
    code, sortie, lu, mur = jouer(dossier, [], rapport)
    if not lu:
        print(f"   ✗ {etiquette} : AUCUN rapport écrit (code {code})\n{sortie[-600:]}")
        return None
    tests = tests_du(lu)
    echecs = [t for t in tests if t[2] == "failed"]
    comptes = [t for t in tests if t[2] == "passed"]
    top = max(comptes, key=lambda t: t[3]) if comptes else None
    return {"etiquette": etiquette, "code": code, "tests_lus": len(tests), "passes": len(comptes),
            "echecs": len(echecs), "max": top[3] if top else float("nan"),
            "au_max": f"{top[0]} › {top[1]}" if top else "—", "mur": mur,
            "echecs_detail": [f"{t[0]} › {t[1]}" for t in echecs][:5]}


def mesurer(paquets):
    v = valeur_aide()
    print(f"== MESURES ({horodatage()}) — régime ENCHAÎNÉ, une passe froide hors compte ; "
          f"N = plus petit k tel que M(k+1) ≤ {1 + SEUIL_N:.2f} × M(k) ; plafond {PLAFOND_PASSES} passes")
    resume = []
    for p in paquets:
        nom = p[0]
        print(f"\n-- {nom} ({horodatage()})")
        froide = une_passe(p, "froide")
        if froide is None or froide["code"] != 0 or froide["echecs"]:
            print(f"   ⛔ passe froide NON VERTE ({froide and froide['echecs_detail']}) — l'instrument s'arrête.")
            return 1, resume
        print(f"   froide   : {froide['tests_lus']} tests lus · max {froide['max']:.1f} ms "
              f"({froide['au_max']}) · {froide['mur']:.1f} s   [HORS COMPTE]")
        passes, m_courant, n = [], None, None
        for k in range(1, PLAFOND_PASSES + 1):
            r = une_passe(p, f"passe-{k:02d}")
            if r is None or r["code"] != 0 or r["echecs"]:
                print(f"   ⛔ passe {k} NON VERTE ({r and r['echecs_detail']}) — un rouge est un verdict, "
                      "pas une durée : l'instrument s'arrête.")
                return 1, resume
            if r["tests_lus"] != froide["tests_lus"]:
                print(f"   ⛔ passe {k} : {r['tests_lus']} tests lus, la passe froide en lisait "
                      f"{froide['tests_lus']} — l'instrument s'arrête (D290).")
                return 1, resume
            m_prec = m_courant
            m_courant = r["max"] if m_courant is None else max(m_courant, r["max"])
            passes.append(r)
            depl = "" if m_prec is None else f" · M {m_prec:.1f} → {m_courant:.1f} ({(m_courant / m_prec - 1) * 100:+.1f} %)"
            print(f"   passe {k:2d} : {r['tests_lus']} tests lus · max {r['max']:.1f} ms ({r['au_max']}) · "
                  f"{r['mur']:.1f} s{depl}", flush=True)
            if m_prec is not None and m_courant <= (1 + SEUIL_N) * m_prec:
                n = k - 1
                break
        entree = {"paquet": nom, "V": v, "froide": froide, "passes": passes,
                  "M": m_courant, "N": n, "marge_min_ms": v - m_courant,
                  "facteur_min": v / m_courant if m_courant else None}
        resume.append(entree)
        if n is None:
            print(f"   ⛔ NON CONVERGÉ À {PLAFOND_PASSES} PASSES — c'est le RÉSULTAT, aucun N par défaut.")
        else:
            print(f"   N = {n} (la passe {n + 1} déplace M de ≤ {SEUIL_N * 100:.0f} %) · M = {m_courant:.1f} ms")
        print(f"   marge ≥ {v - m_courant:.0f} ms (budget {v} / majorant {m_courant:.1f} ≥ {v / m_courant:.1f}×)"
              + (f" · ⚠ la passe froide ({froide['max']:.1f}) DÉPASSE M" if froide["max"] > m_courant else ""))
    return 0, resume


def main():
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--calibrer", action="store_true")
    g.add_argument("--encadrement", action="store_true")
    g.add_argument("--mesurer", action="store_true")
    ap.add_argument("--paquet", action="append")
    a = ap.parse_args()

    purges = purger_temoins()
    if purges:
        print(f"⚠ {purges} témoin(s) laissé(s) par une exécution interrompue : purgé(s) au démarrage.")
    paquets = PAQUETS if not a.paquet else [p for p in PAQUETS if p[0] in a.paquet]
    if a.paquet and len(paquets) != len(a.paquet):
        print(f"✗ paquet inconnu parmi {a.paquet} ; connus : {[p[0] for p in PAQUETS]}")
        return 2
    try:
        calibrer()
        if a.calibrer:
            return 0
        if a.encadrement:
            return encadrer(paquets)
        code, resume = mesurer(paquets)
        os.makedirs(JOURNAUX, exist_ok=True)
        with open(os.path.join(JOURNAUX, "resume-mesures.json"), "w", encoding="utf-8") as h:
            json.dump(resume, h, ensure_ascii=False, indent=2)
        print(f"\nrésumé : {os.path.relpath(os.path.join(JOURNAUX, 'resume-mesures.json'), RACINE)}")
        return code
    finally:
        restes = purger_temoins()
        print(f"témoins restants en fin : {restes} purgé(s) (attendu 0)")


if __name__ == "__main__":
    sys.exit(main())
