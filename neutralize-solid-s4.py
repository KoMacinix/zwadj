#!/usr/bin/env python3
"""Campagne de neutralisation — lot S4, registres de stratégies de tarification.

⚠ CE QUE CETTE CAMPAGNE PROUVE.
S4 remplace deux cascades par deux registres, sans toucher au comportement : les
29 gardes existantes de `pricing-engine.spec.ts` et `service-pricing.spec.ts`
sont restées vertes SANS UNE RETOUCHE — c'est le critère du lot. Mais une suite
verte ne dit pas si CHAQUE stratégie est réellement mesurée. On neutralise donc
les stratégies UNE À UNE, et on exige que la garde correspondante tombe.

⚠ ÉCHANGER DEUX RÉSOLVEURS PLUTÔT QUE LES CASSER. Rendre une stratégie
inopérante ferait rougir n'importe quel test qui l'effleure — y compris un test
d'une AUTRE stratégie. Les intervertir est plus sévère : la mutation reste un
calcul plausible, elle ne rougit que si quelque chose mesure ce que CETTE
stratégie a de propre.

⚠ UNE STRATÉGIE DONT LA NEUTRALISATION NE ROUGIT RIEN EST UN TROU DE MESURE
(famille D209). Elle se RAPPORTE : on n'écrit pas un test complaisant dans le
même geste pour la boucher — celui-là viendrait avec sa propre preuve rouge.

⚠ Aucune mesure d'intégration : ces deux modules sont PURS. Ce qui les traverse
en base est déjà couvert par les devis et les demandes, et l'aurait été de la
même façon avant S4 — l'ajouter ici gonflerait la campagne sans rien prouver.

Usage :
    python3 neutralize-solid-s4.py            # toutes les cibles
    python3 neutralize-solid-s4.py 1 3        # une plage
Depuis : la racine du monorepo.
"""

import io
import os
import shutil
import subprocess
import sys

SAUVEGARDE = ".neutralisation-sauvegarde"
MOTEUR = "apps/api/src/venues/pricing-engine.ts"
SERVICES = "apps/api/src/venues/service-pricing.ts"


def _binaire(nom: str) -> str:
    """Windows : `pnpm` est un `.cmd`, que `CreateProcess` ne résout pas seul."""
    return shutil.which(nom) or nom


MESURES = {
    "moteur": ["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", "src/venues/pricing-engine.spec.ts"],
    "services": ["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", "src/venues/service-pricing.spec.ts"],
    # Les deux consommateurs réels des registres. Une stratégie muette ici
    # signalerait que le calcul de prix ne traverse plus le registre du tout.
    "devis": ["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", "src/venues/deposit.spec.ts"],
}

CIBLES = [
    (
        "S4-1. ⚠ HOLIDAY et WEEKDAY sont ÉCHANGÉS — un férié se tarife comme un jour ordinaire",
        MOTEUR,
        "  HOLIDAY: (_rule, day) => day.isHoliday,\n  WEEKDAY: (rule, day) => rule.daysOfWeek.includes(day.dayOfWeek),",
        "  HOLIDAY: (rule, day) => rule.daysOfWeek.includes(day.dayOfWeek),\n  WEEKDAY: (_rule, day) => day.isHoliday,",
        1,
        ["moteur"],
    ),
    (
        "S4-2. SEASON cesse de refuser les bornes absentes : une saison sans dates couvre l'année",
        MOTEUR,
        "    rule.startMonth !== null && rule.endMonth !== null\n      ? monthInWindow(day.month, rule.startMonth, rule.endMonth)\n      : false",
        "    rule.startMonth === null || rule.endMonth === null\n      ? true\n      : monthInWindow(day.month, rule.startMonth, rule.endMonth)",
        1,
        ["moteur"],
    ),
    (
        "S4-3. ⚠ LE REPLI DU TYPE INCONNU SAUTE — une famille de règle inconnue s'applique toujours",
        MOTEUR,
        "  return matcher === undefined ? false : matcher(rule, day);",
        "  return matcher === undefined ? true : matcher(rule, day);",
        1,
        ["moteur"],
    ),
    (
        "S4-4. ⚠ PER_GUEST et PER_UNIT sont ÉCHANGÉS — le menu par tête se facture à la quantité saisie",
        SERVICES,
        "  [ServicePricingType.PER_GUEST]: (service, choice, guests, base) => {",
        "  [ServicePricingType.PER_UNIT]: (service, choice, guests, base) => {",
        1,
        ["services"],
    ),
    (
        "S4-5. Le type inconnu redevient vendable (le retombé PER_UNIT d'origine)",
        SERVICES,
        '  if (resolver === undefined) return { ok: false, failure: { code: "SERVICE_UNAVAILABLE" } };',
        "  if (resolver === undefined) return RESOLVERS[ServicePricingType.PER_UNIT](service, choice, guests, base);",
        1,
        ["services"],
    ),
    (
        "S4-6. FIXED cesse de refuser une quantité — un forfait se multiplie",
        SERVICES,
        '  [ServicePricingType.FIXED]: (service, choice, _guests, base) => {\n    const entree = enterNonTiered(service, choice, base);\n    if (!entree.ok) return entree;\n    if (choice.quantity !== undefined) return { ok: false, failure: { code: "SERVICE_TIER_MISMATCH" } };',
        "  [ServicePricingType.FIXED]: (service, choice, _guests, base) => {\n    const entree = enterNonTiered(service, choice, base);\n    if (!entree.ok) return entree;",
        1,
        ["services"],
    ),
    (
        "S4-7. TIERED accepte un palier INACTIF — un tarif retiré du catalogue se revend",
        SERVICES,
        "    const tier = service.tiers.find((candidate) => candidate.id === choice.tierId && candidate.isActive);",
        "    const tier = service.tiers.find((candidate) => candidate.id === choice.tierId);",
        1,
        ["services"],
    ),
]


def restaurer_si_interrompu() -> None:
    """Un `finally` ne s'exécute PAS quand le processus est tué (D223)."""
    if not os.path.isdir(SAUVEGARDE):
        return
    for marque in os.listdir(SAUVEGARDE):
        chemin = marque.replace("__", "/")
        contenu = io.open(os.path.join(SAUVEGARDE, marque), encoding="utf-8", newline="").read()
        io.open(chemin, "w", encoding="utf-8", newline="").write(contenu)
        print(f"↩ RESTAURÉ après interruption : {chemin}")
    shutil.rmtree(SAUVEGARDE)


def sauver(chemin: str, contenu: str) -> str:
    os.makedirs(SAUVEGARDE, exist_ok=True)
    marque = os.path.join(SAUVEGARDE, chemin.replace("/", "__"))
    io.open(marque, "w", encoding="utf-8", newline="").write(contenu)
    return marque


def lancer(nom: str) -> int:
    commande = MESURES[nom]
    return subprocess.run(
        [_binaire(commande[0]), *commande[1:]],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    ).returncode


def main(argv: list[str]) -> int:
    rangs = [a for a in argv if a.isdigit()]
    depuis = int(rangs[0]) if rangs else 1
    jusqua = int(rangs[1]) if len(rangs) > 1 else 99

    restaurer_si_interrompu()

    for nom in MESURES:
        if lancer(nom) != 0:
            print(f"✗ PRÉ-VOL : « {nom} » est DÉJÀ ROUGE avant mutation. Campagne abandonnée.")
            return 2
    print(f"✓ Pré-vol : {len(MESURES)} mesure(s) verte(s) — {', '.join(MESURES)}\n")

    mordu, muettes = 0, []
    for rang, (libelle, chemin, avant, apres, attendu, mesures) in enumerate(CIBLES, start=1):
        if not (depuis <= rang <= jusqua):
            continue
        source = io.open(chemin, encoding="utf-8", newline="").read()
        # ⚠ Fichiers en CRLF : un motif multi-lignes DOIT porter \r\n (D224).
        avant = avant.replace("\n", "\r\n")
        apres = apres.replace("\n", "\r\n")
        vus = source.count(avant)
        if vus != attendu:
            print(f"✗ {libelle}\n   ERREUR DE SCRIPT : {vus} occurrence(s), {attendu} attendue(s) dans {chemin}")
            return 2

        marque = sauver(chemin, source)
        io.open(chemin, "w", encoding="utf-8", newline="").write(source.replace(avant, apres))
        try:
            codes = {m: lancer(m) for m in mesures}
        finally:
            io.open(chemin, "w", encoding="utf-8", newline="").write(source)
            os.remove(marque)

        verts = [m for m, code in codes.items() if code == 0]
        if verts:
            muettes.append(f"{libelle} (vert dans : {', '.join(verts)})")
            print(f"✗ {libelle}\n   VERT dans {verts} malgré la neutralisation.")
        else:
            mordu += 1
            print(f"✓ {libelle}  [{', '.join(codes)}]")

    if os.path.isdir(SAUVEGARDE) and not os.listdir(SAUVEGARDE):
        os.rmdir(SAUVEGARDE)

    print(f"\n{mordu} garde(s) neutralisée(s) et ROUGE(s) sur la plage demandée.")
    for m in muettes:
        print(f"  muette : {m}")
    return 0 if not muettes else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
