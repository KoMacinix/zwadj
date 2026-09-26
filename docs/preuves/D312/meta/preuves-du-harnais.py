"""D312 — LES GARDES NEUVES DU HARNAIS, NEUTRALISÉES UNE À UNE, ET LE NON-DÉMARRAGE SOUS MUTATION.
Pièce jetable, versée. « Une garde qui ne mord pas n'est pas une garde » s'applique au harnais lui-même.
Chaque variante est une COPIE du harnais (écrite dans `.neutralisation-journaux/d312-meta/`, ignoré par git),
obtenue par un remplacement dont la pose est PROUVÉE (D286 : ancre 1 → 0 ET marqueur n → n + 1), lancée depuis la
racine. Le harnais versionné n'est JAMAIS modifié. Exigé pour chaque variante : son code de sortie, et des lignes
attendues dans sa sortie — l'attendu imprimé à côté du mesuré (D290).
  V0 témoin : le harnais tel quel, plage 1 1 ⇒ code 0, A1 mordue.
  V1 version : lecture calibrée sur une autre version ⇒ refus de juger (MD-AOA-6).
  V2 la garde « exécutés > 0 » neutralisée ⇒ la calibration (iii) le voit, ABANDON (MD-AOA-2, MD-AOA-7).
  V3 la sémantique de D310 réintroduite (« tout code non nul est une morsure ») ⇒ la calibration (i) et (ii) le
     voient, ABANDON (MD-AOA-1, MD-AOA-7).
  V4 NON-DÉMARRAGE SOUS MUTATION : une cible synthétique casse la syntaxe du module testé — la spec ne se charge
     plus, aucun test ne s'exécute ⇒ « NON DÉMARRÉE — PAS une morsure », 0 mordue, refus (MD-AOA-3).
  V5 PRÉ-VOL QUI NE DÉMARRE PAS : une cible synthétique dont le filtre ne correspond à aucun titre ⇒ le pré-vol
     refuse de juger, aucune cible jouée (MD-AOA-2, MD-AOA-4).
⚠ V4 et V5 gardent A1 en tête de `CIBLES` : la calibration (iv) la mute. Elles se jouent sur la plage 2 2.
Usage, depuis la racine :  python docs/preuves/D312/meta/preuves-du-harnais.py
"""
import os
import shutil
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    sys.exit("✗ À LANCER DEPUIS LA RACINE.")
ICI = os.path.dirname(os.path.abspath(__file__))
HARNAIS = "neutralisation/neutralize-available-on-api.py"
TMP = os.path.join(".neutralisation-journaux", "d312-meta")
SRC = open(HARNAIS, "rb").read().decode("utf-8")
A1_ANCRE = "if (civilUtcMs(date) < civilUtcMs(aujourdhui)) this.throwAvailableOnPast();"
SURCHARGE_V4 = (
    "CIBLES = CIBLES[:1] + [(\"S1. Synthétique : le module testé ne se charge plus (syntaxe cassée)\", "
    "\"apps/api/src/venues/venues-public.service.ts\", " + repr(A1_ANCRE) + ", \"if (((( /* D312 : syntaxe cassée */\", 1, "
    "\"date passée\", \"src/venues/venues-public.service.spec.ts\")]  # D312-META-V4\r\n"
)
SURCHARGE_V5 = (
    "CIBLES = CIBLES[:1] + [(\"S2. Synthétique : le filtre ne correspond à aucun titre\", "
    "\"apps/api/src/venues/venues-public.service.ts\", " + repr(A1_ANCRE) + ", \"/* neutralisé */\", 1, "
    "\"motif-sans-titre-d312-qq\", \"src/venues/venues-public.service.spec.ts\")]  # D312-META-V5\r\n"
)
POINT = "\r\n\r\n\r\n# ── Sécurité de reprise"
VARIANTES = [
    ("V0-temoin", None, None, ["1", "1"], 0,
     ["calibration : 5 bras sur 5", "✓ A1. ", "1 garde(s) mordue(s) sur 1 cible(s)"]),
    ("V1-version", 'VITEST_CALIBRE = "3.2.7"', 'VITEST_CALIBRE = "0.0.0"', ["1", "1"], 2,
     ["✗ VERSION", "REFUSE DE JUGER"]),
    ("V2-executes-neutralise", "    if executes == 0:\r\n", "    if False:  # D312-META-V2\r\n", ["1", "1"], 2,
     ["calibration (iii) filtre sans titre : VERTE (attendu NON DÉMARRÉE)", "MANQUÉ", "✗ CALIBRATION"]),
    ("V3-semantique-d310", '    resumes = RESUME.findall(sortie)\r\n',
     '    if code not in (0, None):  # D312-META-V3\r\n        return "MORDUE", f"code {code}", []\r\n'
     '    resumes = RESUME.findall(sortie)\r\n', ["1", "1"], 2,
     ["calibration (i) le défaut de D310 rejoué tel quel : MORDUE (attendu NON DÉMARRÉE)",
      "calibration (ii) commande introuvable : MORDUE (attendu NON DÉMARRÉE)", "✗ CALIBRATION"]),
    ("V4-non-demarrage-sous-mutation", POINT, "\r\n" + SURCHARGE_V4 + POINT, ["2", "2"], 2,
     ["calibration : 5 bras sur 5", "✓ Pré-vol : 1 mesure(s)", "✗ S1. ", "NON DÉMARRÉE — PAS une morsure",
      "0 garde(s) mordue(s) sur 0 cible(s) RÉELLEMENT MESURÉE(S) (déclarées dans la plage : 1)"]),
    ("V5-pre-vol-sans-demarrage", POINT, "\r\n" + SURCHARGE_V5 + POINT, ["2", "2"], 2,
     ["calibration : 5 bras sur 5", "pré-vol S2 [", ": NON DÉMARRÉE", "✗ PRÉ-VOL", "REFUSE DE JUGER"]),
]
os.makedirs(TMP, exist_ok=True)
ecarts = 0
for nom, ancre, remplacement, plage, code_attendu, lignes in VARIANTES:
    src = SRC
    if ancre is not None:
        avant, marque_avant = src.count(ancre), src.count(remplacement)
        src = src.replace(ancre, remplacement)
        apres, marque_apres = src.count(ancre), src.count(remplacement)
        # Pour une INSERTION, l'ancre SURVIT (elle est dans le remplacement) : ancre → 1, marqueur 0 → 1 (D286).
        insertion = ancre in remplacement
        posee = (avant == 1 and marque_apres == marque_avant + 1 and apres == (1 if insertion else 0))
        print(f"{nom} : ancre {avant} → {apres} · marqueur {marque_avant} → {marque_apres} · "
              f"{'insertion' if insertion else 'substitution'} · pose {'PROUVÉE' if posee else 'NON PROUVÉE'}")
        if not posee:
            ecarts += 1
            continue
    copie = os.path.join(TMP, f"{nom}.py")
    open(copie, "wb").write(src.encode("utf-8"))
    r = subprocess.run([sys.executable, copie, *plage], capture_output=True, text=True, encoding="utf-8", errors="replace")
    sortie = r.stdout + r.stderr
    open(os.path.join(ICI, f"{nom}.txt"), "w", encoding="utf-8", newline="\n").write(
        f"$ python {copie} {' '.join(plage)}\n{sortie}\n--- code de sortie : {r.returncode} ---\n")
    manquantes = [l for l in lignes if l not in sortie]
    ok = r.returncode == code_attendu and not manquantes
    ecarts += not ok
    print(f"{'✓' if ok else '✗'} {nom} : code {r.returncode} (attendu {code_attendu}) · lignes attendues trouvées "
          f"{len(lignes) - len(manquantes)} sur {len(lignes)}{' · MANQUANTES : ' + repr(manquantes) if manquantes else ''}")
st = subprocess.run(["git", "status", "--porcelain", "--", "apps", "neutralisation"], capture_output=True, text=True).stdout
print(f"\narbre après les variantes (apps/, neutralisation/) : {len([l for l in st.splitlines() if l])} ligne(s) de statut "
      f"(attendu 1 : le harnais corrigé, non commité) · {st.strip()!r}")
print(f"variantes : {len(VARIANTES)} · écarts {ecarts} (attendu 0)")
shutil.rmtree(TMP, ignore_errors=True)
sys.exit(1 if ecarts else 0)
