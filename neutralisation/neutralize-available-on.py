#!/usr/bin/env python3
"""Campagne de neutralisation du lot `availableOn`.

Chaque garde livrée est DÉSACTIVÉE une par une, et le test correspondant DOIT
rougir. Une garde qui reste verte une fois neutralisée ne mesure rien.

⚠ CE SCRIPT ASSERTE SON PROPRE NOMBRE DE REMPLACEMENTS. `vitest -t <filtre>`
sort 0 quand AUCUN test ne correspond : une neutralisation qui ne remplace rien
produirait donc un « rouge attendu, vert obtenu » indiscernable d'un test qui ne
mord pas. Un remplacement à zéro est une ERREUR DE SCRIPT, pas un résultat.

Usage :  python3 neutralize-available-on.py
Depuis  :  la racine du monorepo.
"""

import io
import os
import shutil
import subprocess
import sys

CIBLES = [
    # (libellé, source, avant, après, occurrences attendues, filtre, fichier de test)
    (
        "1. Le grisé ne mord plus : `false` cesse de produire la classe",
        "apps/client/src/components/search/search-view.tsx",
        'unavailableOn={venue.availableOnDate === false ? annotatedOn : null}',
        "unavailableOn={null}",
        1,
        "carte GRISÉE",
        "src/components/search/search-view.test.tsx",
    ),
    (
        "2. `null` grise comme `false` (le piège du booléen à trois valeurs)",
        "apps/client/src/components/search/search-view.tsx",
        "unavailableOn={venue.availableOnDate === false ? annotatedOn : null}",
        "unavailableOn={venue.availableOnDate ? null : annotatedOn}",
        1,
        "NE GRISE PAS",
        "src/components/search/search-view.test.tsx",
    ),
    (
        "3. La date affichée vient de l'URL et non de l'écho du serveur",
        "apps/client/src/components/search/search-view.tsx",
        "const annotatedOn = results?.availableOn ?? null;",
        'const annotatedOn = state.availableOn === "" ? null : state.availableOn;',
        1,
        "VIENT DE L'ÉCHO",
        "src/components/search/search-view.test.tsx",
    ),
    (
        "4. Le refus de date passée est replié sur la panne générique",
        "apps/client/src/lib/api.ts",
        'if (body.message?.code === VenueErrorCode.AVAILABLE_ON_PAST) return { kind: "past-date" };',
        "/* neutralisé */",
        1,
        "DATE PASSÉE",
        "src/lib/api.test.ts",
    ),
    (
        "5. La date irréelle n'est plus filtrée (février 31 part à l'API)",
        "apps/client/src/lib/search-query.ts",
        'availableOn: isRealCivilDate(availableOnRaw) ? availableOnRaw : "",',
        "availableOn: availableOnRaw,",
        1,
        "IRRÉELLE",
        "src/lib/search-query.test.ts",
    ),
    (
        "6. `availableOn` cesse d'être transmis à l'API",
        "apps/client/src/lib/search-query.ts",
        'if (state.availableOn) query.set("availableOn", state.availableOn);\r\n  query.set("sort", state.sort);',
        'query.set("sort", state.sort);',
        1,
        "CAS RÉEL",
        "src/lib/search-query.test.ts",
    ),
    (
        "7. La règle SEO ne voit plus la pagination comme une variante",
        "apps/client/src/lib/seo.ts",
        '  "sort",\r\n  "page"\r\n] as const;',
        '  "sort"\r\n] as const;',
        1,
        "PROBLÈME EXISTAIT DÉJÀ",
        "src/lib/seo.test.ts",
    ),
    (
        "8. `noindex` emporte `nofollow` (le chemin vers les fiches est coupé)",
        "apps/client/src/lib/seo.ts",
        "robots: { index: indexable, follow: true },",
        "robots: { index: indexable, follow: indexable },",
        1,
        "follow",
        "src/lib/seo.test.ts",
    ),
    (
        "9. Un champ vide redevient une variante (la page nue se désindexe)",
        "apps/client/src/lib/seo.ts",
        'return Array.isArray(value) ? value.some((v) => v.trim() !== "") : value.trim() !== "";',
        "return true;",
        1,
        "clé VIDE",
        "src/lib/seo.test.ts",
    ),
    (
        "10. La carte grisée cesse d'être un lien",
        "apps/client/src/components/venue-card.tsx",
        '<Link href={`/salles/${venue.slug}`} className="venue-card-link">',
        '<Link href="" className="venue-card-link">',
        1,
        "RESTE UN LIEN",
        "src/components/search/search-view.test.tsx",
    ),
]


# ── Sécurité de reprise ─────────────────────────────────────────────────────
# ⚠ DÉFAUT RÉEL RENCONTRÉ : ce script a été tué par un `timeout` externe. Le
# `finally` de restauration n'a alors PAS tourné, et l'arbre de travail est
# resté avec une garde neutralisée — c'est-à-dire un fichier sciemment cassé,
# indiscernable à l'œil. Un lot construit dans cet état aurait embarqué la
# faute. Le `finally` protège de l'exception, pas du signal.
#
# Parade : les originaux sont écrits sur disque AVANT toute mutation, et un
# démarrage les restaure s'ils traînent encore d'une exécution interrompue.
# ⛔ CE SCRIPT SE LANCE DEPUIS LA RACINE DU MONOREPO, jamais depuis son propre
#   dossier : tous ses chemins sont relatifs au DOSSIER COURANT. Sans cette
#   garde, un `cd neutralisation` produirait « ERREUR DE SCRIPT : 0
#   occurrence(s) » — un message qui envoie chercher un défaut de code là où il
#   n'y a qu'un dossier de travail.
if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO (pnpm-workspace.yaml introuvable).")
    print(f"  dossier courant : {os.getcwd()}")
    print(f"  → python3 neutralisation/{os.path.basename(__file__)}")
    sys.exit(2)

SAUVEGARDE = ".neutralisation-sauvegarde"


def restaurer_si_interrompu() -> None:
    if not os.path.isdir(SAUVEGARDE):
        return
    for nom in os.listdir(SAUVEGARDE):
        chemin = nom.replace("__", "/")
        contenu = io.open(os.path.join(SAUVEGARDE, nom), encoding="utf-8", newline="").read()
        io.open(chemin, "w", encoding="utf-8", newline="").write(contenu)
        print(f"↺ restauré après interruption : {chemin}")
    shutil.rmtree(SAUVEGARDE)


def sauver(chemin: str, contenu: str) -> str:
    os.makedirs(SAUVEGARDE, exist_ok=True)
    nom = os.path.join(SAUVEGARDE, chemin.replace("/", "__"))
    io.open(nom, "w", encoding="utf-8", newline="").write(contenu)
    return nom


def _binaire(nom: str) -> str:
    """Résout l'exécutable AVANT `subprocess.run`.

    ⚠ Windows : `pnpm` est un `pnpm.cmd`, et `CreateProcess` ne consulte PAS
    `PATHEXT` — il ne cherche qu'un `.exe`, échoue en `WinError 2`, et la
    campagne meurt avant d'avoir mesuré quoi que ce soit. `shutil.which`, lui,
    consulte `PATHEXT` et rend le chemin complet. Sur POSIX il rend le même nom.
    """
    return shutil.which(nom) or nom

def run(cmd: list[str]) -> int:
    return subprocess.run(
        [_binaire(cmd[0]), *cmd[1:]],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    ).returncode


def main(depuis: int = 1, jusqua: int = 99) -> int:
    restaurer_si_interrompu()
    mordu, muettes = 0, []
    for rang, (libelle, chemin, avant, apres, attendu, filtre, fichier) in enumerate(CIBLES, start=1):
        if not (depuis <= rang <= jusqua):
            continue
        source = io.open(chemin, encoding="utf-8", newline="").read()
        vus = source.count(avant)
        if vus != attendu:
            # ⚠ ERREUR DE SCRIPT, pas résultat de mesure. Un remplacement à zéro
            # laisserait le test passer et se lirait « garde muette ».
            print(f"✗ {libelle}\n   ERREUR DE SCRIPT : {vus} occurrence(s), {attendu} attendue(s) dans {chemin}")
            return 2

        marque = sauver(chemin, source)
        io.open(chemin, "w", encoding="utf-8", newline="").write(source.replace(avant, apres))
        try:
            code = run(["pnpm", "--filter", "@zwadj/client", "run", "test", "--", fichier, "-t", filtre])
        finally:
            io.open(chemin, "w", encoding="utf-8", newline="").write(source)
            os.remove(marque)

        if code == 0:
            muettes.append(libelle)
            print(f"✗ {libelle}\n   VERT malgré la neutralisation — cette garde ne mesure rien.")
        else:
            mordu += 1
            print(f"✓ {libelle}")

    # Le dossier de sauvegarde a été vidé fichier par fichier ; on retire la
    # coquille, sinon une campagne réussie laisse une trace dans `git status`
    # et le prochain lecteur se demande si quelque chose a mal tourné.
    if os.path.isdir(SAUVEGARDE) and not os.listdir(SAUVEGARDE):
        os.rmdir(SAUVEGARDE)

    print(f"\n{mordu} garde(s) neutralisée(s) et ROUGE(s) sur la plage demandée.")
    for m in muettes:
        print(f"  muette : {m}")
    return 0 if not muettes else 1


if __name__ == "__main__":
    sys.exit(main(int(sys.argv[1]) if len(sys.argv) > 1 else 1, int(sys.argv[2]) if len(sys.argv) > 2 else 99))
