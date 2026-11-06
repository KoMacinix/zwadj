"""MESURE du coût de la lecture du drapeau de la couche du personnel, par requête Pro — rang 44, L36-3a-1 (D341).

POURQUOI IL EXISTE : la consigne demande « le coût de la lecture du drapeau par requête Pro (limite 6), à mesurer, sans budget ». Une mesure de durée sans son contexte est exactement ce que D270 et D290 interdisent ;
ce script joue donc deux variantes EN ALTERNANCE et rapporte chaque passe, pas seulement une moyenne.
  · variante « avant » : le QUATRIÈME garde global est retiré de `apps/api/src/app.module.ts` (une ligne, texte remplacé sur les octets, hachage vérifié avant et après) — tout le reste du code est identique ;
  · variante « après » : le code livré.
Chaque passe joue `mesure-lecture-drapeau.int-spec.ts` (copié dans `apps/api/test/int/`, retiré ensuite) : base recréée par `setup-global`, application Nest complète, 80 requêtes d'échauffement puis 600 mesurées sur
`GET /api/v1/pro/venues`, couche éteinte. L'ordre est A B A B A B (avant, après, avant, après, avant, après) : D291 a mesuré qu'une passe enchaînée est plus rapide qu'une passe après repos ; alterner répartit cet effet.

INSTRUMENTS ÉCARTÉS : une seule passe par variante (D291 : la position fait 0,7 à 7,2 %) ; un budget de test (D290 : une durée devient un verdict) ; un profileur SQL (la lecture est UNE requête indexée, `EXPLAIN` la montre ; ce
que le pro attend, c'est la latence de la requête HTTP).
CALIBRATION, deux bras, REJOUÉE à chaque lancement (D286) : (positif) la variante « avant » ne contient plus le garde — le texte retiré est absent du fichier muté, et le fichier d'origine le contient ; (négatif) la variante
« après » est le fichier d'origine, à l'octet. Et chaque passe doit rendre 600 réponses 200 sur 600 (une route qui répondrait 401 mesurerait un refus, pas une lecture).
USAGE, depuis la RACINE, SUR SECTEUR (R-9 de D340 : une mesure de durée prise sur batterie se déclare comme telle et n'entre dans aucune comparaison — ce script REFUSE de démarrer sur batterie, code 3) :
    python3 docs/preuves/D341/mesure/mesurer.py <dossier de sortie>      # écrit mesure-avant.txt et mesure-apres.txt
Codes de sortie : 0 = mesuré ; 2 = erreur ou calibration manquée ; 3 = batterie (rien n'est mesuré).
"""
import hashlib
import json
import os
import re
import shutil
import statistics
import subprocess
import sys
import time

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

MODULE = "apps/api/src/app.module.ts"
SPEC_ARCHIVE = "docs/preuves/D341/mesure/mesure-lecture-drapeau.int-spec.ts"
SPEC_JOUEE = "apps/api/test/int/mesure-lecture-drapeau.int-spec.ts"
ANCRE = "    { provide: APP_GUARD, useClass: RolesGuard },\n    { provide: APP_GUARD, useClass: StaffSessionGuard }"
SANS_GARDE = "    { provide: APP_GUARD, useClass: RolesGuard }"
ANSI = re.compile(r"\x1b\[[0-9;]*m")
PASSES = 3


def sha(chemin: str) -> str:
    return hashlib.sha256(open(chemin, "rb").read()).hexdigest()


def sur_secteur() -> bool:
    """Vrai si le poste est branché (ou n'a pas de batterie). Faux sur batterie. Relevé par WMI, jamais déduit."""
    r = subprocess.run(["powershell.exe", "-NoProfile", "-Command", "$b = Get-CimInstance Win32_Battery | Select-Object -First 1; if ($null -eq $b) { 'AUCUNE' } else { [string]$b.BatteryStatus }"],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    valeur = (r.stdout or "").strip()
    print(f"  alimentation : Win32_Battery.BatteryStatus = {valeur or '?'} (2 = secteur ; AUCUNE = poste sans batterie)")
    return valeur in ("2", "AUCUNE", "3", "6", "7", "8", "9")  # 2 secteur · 3 pleine · 6-9 en charge ; 1, 4, 5, 10, 11 = batterie/bas/critique


def muter(contenu: bytes) -> bytes:
    crlf = b"\r\n" in contenu
    ancre = ANCRE.replace("\n", "\r\n") if crlf else ANCRE
    remplace = SANS_GARDE
    n = contenu.count(ancre.encode("utf-8"))
    if n != 1:
        raise SystemExit(f"✗ ancre du garde : {n} occurrence(s), 1 attendue")
    return contenu.replace(ancre.encode("utf-8"), remplace.encode("utf-8"))


def une_passe(variante: str, numero: int, original: bytes) -> dict:
    ecrit = muter(original) if variante == "avant" else original
    if variante == "avant":
        # calibration (positif) : le garde est ABSENT du fichier muté, et PRÉSENT dans l'original
        assert b"useClass: StaffSessionGuard" in original, "calibration : l'original ne contient pas le garde"
        assert b"useClass: StaffSessionGuard" not in ecrit, "calibration : le garde est resté dans le fichier muté"
    open(MODULE, "wb").write(ecrit)
    shutil.copyfile(SPEC_ARCHIVE, SPEC_JOUEE)
    try:
        t0 = time.time()
        r = subprocess.run([shutil.which("pnpm") or "pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", "-c", "vitest.config.int.ts", "test/int/mesure-lecture-drapeau.int-spec.ts"],
                           capture_output=True, text=True, encoding="utf-8", errors="replace")
        sortie = ANSI.sub("", (r.stdout or "") + "\n" + (r.stderr or ""))
        mur = time.time() - t0
    finally:
        open(MODULE, "wb").write(original)  # restauration INCONDITIONNELLE
        if os.path.exists(SPEC_JOUEE):
            os.remove(SPEC_JOUEE)
    m = re.search(r"^MESURE (\{.*\})$", sortie, re.M)
    if not m or r.returncode != 0:
        print(sortie[-2500:])
        raise SystemExit(f"✗ passe {variante} n°{numero} : code {r.returncode}, ligne MESURE {'absente' if not m else 'présente'}")
    mesure = json.loads(m.group(1))
    assert mesure["reponses200"] == mesure["mesures"], f"passe {variante} n°{numero} : {mesure['reponses200']} réponses 200 sur {mesure['mesures']} — la route ne mesure pas une lecture"
    mesure["murS"] = round(mur, 1)
    return mesure


def main() -> int:
    if not os.path.isfile("pnpm-workspace.yaml"):
        print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO.")
        return 2
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    sortie_dir = sys.argv[1]
    os.makedirs(sortie_dir, exist_ok=True)
    print("MESURE du coût de la lecture du drapeau — D341")
    if not sur_secteur():
        print("✗ SUR BATTERIE : rien n'est mesuré (R-9 de D340). Brancher le poste, puis relancer.")
        return 3
    original = open(MODULE, "rb").read()
    depart = hashlib.sha256(original).hexdigest()
    print(f"  {MODULE} · {len(original)} octets · SHA256 {depart}")
    ordre = [("avant", 1), ("apres", 1), ("avant", 2), ("apres", 2), ("avant", 3), ("apres", 3)]
    resultats: dict[str, list[dict]] = {"avant": [], "apres": []}
    try:
        for variante, numero in ordre:
            m = une_passe(variante, numero, original)
            resultats[variante].append(m)
            print(f"  passe {variante} n°{numero} : médiane {m['medianeMs']} ms · p95 {m['p95Ms']} ms · moyenne {m['moyenneMs']} ms · {m['mesures']} requêtes · {m['reponses200']} réponses 200 · mur {m['murS']} s")
    finally:
        open(MODULE, "wb").write(original)
    fin = sha(MODULE)
    print(f"  restauration : {MODULE} SHA256 {fin} — {'IDENTIQUE au départ' if fin == depart else 'DIFFÉRENT DU DÉPART !'}")
    if fin != depart:
        return 2
    for variante in ("avant", "apres"):
        medianes = [m["medianeMs"] for m in resultats[variante]]
        lignes = [f"variante « {variante} » — {PASSES} passes (alternées A B A B A B ; « avant » = le quatrième garde retiré de app.module.ts, « après » = le code livré)"]
        for i, m in enumerate(resultats[variante], 1):
            lignes.append(f"  passe {i} : médiane {m['medianeMs']} ms · p95 {m['p95Ms']} ms · moyenne {m['moyenneMs']} ms · min {m['minMs']} · max {m['maxMs']} · {m['mesures']} requêtes · {m['reponses200']} réponses 200")
        lignes.append(f"  médiane des médianes : {statistics.median(medianes):.3f} ms · étendue entre passes : {min(medianes):.3f} à {max(medianes):.3f} ms")
        open(os.path.join(sortie_dir, f"mesure-{variante}.txt"), "w", encoding="utf-8", newline="\n").write("\n".join(lignes) + "\n")
    a = statistics.median([m["medianeMs"] for m in resultats["avant"]])
    p = statistics.median([m["medianeMs"] for m in resultats["apres"]])
    ba = [m["medianeMs"] for m in resultats["avant"]]
    bp = [m["medianeMs"] for m in resultats["apres"]]
    bruit = max(max(ba) - min(ba), max(bp) - min(bp))
    print(f"RÉSULTAT : médiane des médianes avant {a:.3f} ms · après {p:.3f} ms · écart {p - a:+.3f} ms ({(p - a) / a * 100:+.1f} %) · bruit entre passes d'une même variante : jusqu'à {bruit:.3f} ms")
    print("LECTURE : l'écart ne se lit comme un coût que s'il dépasse le bruit ; sinon il se lit « non distinguable du bruit sur cette machine », pas « nul ».")
    return 0


if __name__ == "__main__":
    sys.exit(main())
