"""D305 — LECTURE DES ÉCHECS de 23a. PIÈCE, pas instrument : elle vit dans docs/preuves/ et ne se branche
sur aucun harnais (forme β, décision 3 du relecteur au § 9 de R1 — le lecteur partagé est l'objet de R1,
pas de 23a).

POURQUOI : la règle b de D303 — une garde du chemin de l'argent n'est prouvée que par une neutralisation dont
on a LU l'échec : tests collectés > 0 ET assertion en échec. Le harnais `neutralize-rang23.py` juge au code ;
ce script lit ses journaux (et les sorties rouge / vert de 23a) et imprime, par titre attendu, ce que R1 dit
de garder : collectés, test en échec, première ligne de son bloc d'échec.

MODE D'EMPLOI, depuis la racine :
    python3 docs/preuves/D305/lecture/lire-echecs.py <dossier des journaux de campagne> [<journal s5b-2> [<journal s5b-1>]]
Codes : 0 = lu, tous les verdicts attendus obtenus ; 1 = un verdict attendu manque ; 2 = ABANDON (calibration).

CE QU'IL LIT, par sortie vitest (codes ANSI retirés) — les signatures MESURÉES par D304 (`r1/signatures/`) :
  collectés   le total entre parenthèses de la ligne `Tests` ; `Tests  no tests` vaut 0 ;
  fichier     les blocs d'échec de FICHIER `FAIL <f> [ <f> ]` (import, collecte vide, crochet) ;
  ×           les lignes qui COMMENCENT par « × » — ⚠ jamais une recherche du glyphe dans la ligne : un titre
              peut le contenir (faute n° 1 de D305) ;
  1re ligne   la première ligne non vide après l'en-tête `FAIL … > <titre>`.
Verdict par titre : MORSURE LUE ⇔ collectés > 0 ∧ aucun échec de fichier ∧ titre sur une ligne « × » ∧
1re ligne en `AssertionError`. Sinon : MUETTE (pas de ×) ou NON PROUVÉE (la raison est imprimée).

CALIBRATION — sur les sorties brutes de D304, réponse connue, ABANDON si un bras manque :
  positif   tests.defaut.txt · CAS-ASSERTION                → MORSURE LUE
  négatifs  tests.defaut.txt · CAS-PLANTAGE (TypeError)     → NON PROUVÉE
            tests.defaut.txt · CAS-DELAI (délai dépassé)    → NON PROUVÉE
            tests.defaut.txt · CAS-PASSE (vert)             → MUETTE
            vide.defaut.txt  · (collecte à zéro)            → NON PROUVÉE
            crochet.defaut.txt · CAS-CROCHET (crochet)      → NON PROUVÉE
"""
import importlib.util
import io
import os
import re
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")

if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO.")
    sys.exit(2)

ANSI = re.compile(r"\x1b\[[0-9;]*m")
LIGNE_TESTS = re.compile(r"^\s*Tests\s+(.*)$")
TOTAL = re.compile(r"\((\d+)\)\s*$")
ECHEC_FICHIER = re.compile(r"^\s*FAIL\s+(\S+)\s+\[\s*(\S+)\s*\]\s*$")
CROIX = re.compile(r"^\s*×\s+(.*?)(?:\s+\d+(?:\.\d+)?m?s)?\s*$")
ENTETE = re.compile(r"^\s*FAIL\s+\S+\s+>\s+(.*)$")


def lire(chemin: str) -> list[str]:
    return ANSI.sub("", io.open(chemin, encoding="utf-8", errors="replace").read()).splitlines()


def analyser(lignes: list[str]) -> dict:
    collectes = None
    for l in lignes:
        m = LIGNE_TESTS.match(l)
        if m:
            reste = m.group(1).strip()
            t = TOTAL.search(reste)
            collectes = 0 if reste.startswith("no tests") else (int(t.group(1)) if t else None)
    fichiers = [l.strip() for l in lignes if ECHEC_FICHIER.match(l)]
    croix = [m.group(1) for l in lignes if (m := CROIX.match(l))]
    return {"collectes": collectes, "fichiers": fichiers, "croix": croix, "lignes": lignes}


def premiere_ligne(lignes: list[str], titre: str) -> str | None:
    for i, l in enumerate(lignes):
        m = ENTETE.match(l)
        if m and (m.group(1) == titre or m.group(1).endswith(" > " + titre)):
            for suite in lignes[i + 1:]:
                if suite.strip():
                    return suite.strip()
    return None


def verdict(a: dict, titre: str) -> tuple[str, str]:
    en_croix = any(c == titre or c.endswith(" > " + titre) for c in a["croix"])
    une = premiere_ligne(a["lignes"], titre) if en_croix else None
    if not a["collectes"]:
        return "NON PROUVÉE", f"collectés {a['collectes']}"
    if a["fichiers"]:
        return "NON PROUVÉE", f"échec de FICHIER ({len(a['fichiers'])})"
    if not en_croix:
        return "MUETTE", "titre absent des lignes « × »"
    if une is None:
        return "NON PROUVÉE", "bloc d'échec introuvable"
    if not une.startswith("AssertionError"):
        return "NON PROUVÉE", f"1re ligne : {une[:90]}"
    return "MORSURE LUE", une


def calibrer() -> bool:
    base = "docs/preuves/D304/r1/signatures/sorties/"
    bras = [
        ("positif", base + "tests.defaut.txt", "CAS-ASSERTION une assertion en échec", "MORSURE LUE"),
        ("négatif", base + "tests.defaut.txt", "CAS-PLANTAGE une TypeError levée par le code", "NON PROUVÉE"),
        ("négatif", base + "tests.defaut.txt", "CAS-DELAI un délai dépassé", "NON PROUVÉE"),
        ("négatif", base + "tests.defaut.txt", "CAS-PASSE un test vert", "MUETTE"),
        ("négatif", base + "vide.defaut.txt", "CAS-VIDE (aucun test)", "NON PROUVÉE"),
        ("négatif", base + "crochet.defaut.txt", "CAS-CROCHET le corps de ce test ne s'exécute pas", "NON PROUVÉE"),
    ]
    print("== CALIBRATION — six bras sur les sorties brutes de D304, abandon si un seul manque")
    ok = 0
    for genre, chemin, titre, attendu in bras:
        v, pourquoi = verdict(analyser(lire(chemin)), titre)
        bon = v == attendu
        ok += bon
        print(f"   {'✓' if bon else '✗'} {genre:8} {os.path.basename(chemin):20} {titre[:44]:44} attendu {attendu:12} lu {v} ({pourquoi[:60]})")
    print(f"   calibration : {ok} bras sur {len(bras)} (attendu {len(bras)})")
    return ok == len(bras)


def rapport(etiquette: str, chemin: str, attendus: dict[str, str]) -> int:
    """`attendus` : titre → verdict attendu. Imprime aussi TOUS les titres en échec (MD-R1-6)."""
    a = analyser(lire(chemin))
    print(f"\n== {etiquette} — {chemin}")
    print(f"   collectés {a['collectes']} · échecs de fichier {len(a['fichiers'])} · lignes « × » {len(a['croix'])}")
    for c in a["croix"]:
        print(f"   × {c}")
    manques = 0
    for titre, attendu in attendus.items():
        v, pourquoi = verdict(a, titre)
        bon = v == attendu
        manques += not bon
        print(f"   {'✓' if bon else '✗'} [{v}] (attendu {attendu}) {titre}")
        print(f"       ↳ {pourquoi[:230]}")
    return manques


def main(argv: list[str]) -> int:
    if not calibrer():
        print("✗ ABANDON : un bras de calibration manque — le lecteur ne sait pas lire ces sorties.")
        return 2
    spec = importlib.util.spec_from_file_location("rang23", "neutralisation/neutralize-rang23.py")
    h = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(h)
    T4 = "MD-F1-8 — l'ORDRE des refus d'accept : une demande déjà REFUSÉE sous un blocage rend son statut réel, pas le blocage"
    T5 = "MD-F1-5 — un BLOCAGE commite pendant l'acceptation : 409 BOOKING_BLOCKED_PERIOD, la demande reste en attente"
    manques = 0
    rv = "docs/preuves/D305/rouge-vert/"
    manques += rapport("ROUGE AVANT CORRECTIF", rv + "rouge-avant-correctif.txt",
                       {h.T1: "MORSURE LUE", h.T2: "MORSURE LUE", h.T3: "MORSURE LUE", T4: "MUETTE", T5: "MUETTE"})
    manques += rapport("VERT APRÈS CORRECTIF", rv + "vert-apres-correctif.txt",
                       {h.T1: "MUETTE", h.T2: "MUETTE", h.T3: "MUETTE", T4: "MUETTE", T5: "MUETTE"})
    manques += rapport("VERT APRÈS CORRECTIF (unitaire)", rv + "vert-unitaire-transitions.txt",
                       {h.U1: "MUETTE", h.U2: "MUETTE"})
    dossier = argv[0] if argv else "docs/preuves/D305/neutralisation"
    for libelle, _c, _av, _ap, _n, mesures, titres in h.CIBLES:
        ident = libelle.split(".")[0]
        for m in mesures:
            manques += rapport(f"CIBLE {ident} ({m})", os.path.join(dossier, f"{ident}-{m}.txt"),
                               {t: "MORSURE LUE" for t in titres})
    if len(argv) > 1:
        manques += rapport("S5b-2 (réorientée, MD-F1-8)", argv[1], {T4: "MORSURE LUE"})
    if len(argv) > 2:
        manques += rapport("S5b-1 (réorientée, MD-F1-5)", argv[2], {T5: "MORSURE LUE"})
    print(f"\n== verdicts attendus manqués : {manques} (attendu 0)")
    return 0 if manques == 0 else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
