# D306 — les titres que cette session cherche dans les sorties, par PRÉFIXE unique.
# ⚠ Aucun n'est cru sur parole : `verifier()` relit les `it("…"` des deux specs à la
# révision courante et exige que chaque préfixe désigne EXACTEMENT un test.
import re

TITRES = {
    "T1": "F1 contre un refus —",
    "T2": "F1 contre une annulation —",
    "T3": "F5 — une ACCEPTATION commite pendant l'annulation client SANS motif",
    "T4": "MD-F1-8 — l'ORDRE des refus d'accept",
    "T5": "MD-F1-5 — un BLOCAGE commite pendant l'acceptation",
    "U1": "writableFrom — SANS motif",
    "U2": "writableFrom — une chaîne VIDE",
    # Test séquentiel existant, verdict par `.expect(400)` de supertest (non déclaré par D305).
    "SEQ400": "le client DOIT un motif pour annuler une demande ACCEPTÉE",
    # Tests existants, avant 23a, que certaines mutations adverses doivent (ou non) toucher.
    "D117X2": "deux acceptations SIMULTANÉES de la MÊME demande",
    "D121C": "D121 — deux annulations CLIENT SIMULTANÉES",
    "DIFF": "deux demandes DIFFÉRENTES acceptées simultanément",
    "SEQ23P01": "la SECONDE acceptation reçoit 409 via le 23P01",
    # Titres de la SONDE de D306 (hors suite), pour la rejouer sous mutation.
    "P1": "P1 — séquentiel : refus, PUIS annulation client SANS motif",
    "P1b": "P1b — séquentiel : refus, PUIS annulation client AVEC motif",
    "P2": "P2 — concurrent : un REFUS commite pendant l'annulation client SANS motif",
    "P3": "P3 — concurrent : un REFUS commite pendant l'annulation client AVEC motif",
    "P11": "P11 — séquentiel, même état que P10",
    "P4": "P4 — concurrent : une ACCEPTATION commite pendant l'annulation client AVEC motif",
}

SPECS = {
    "int": "apps/api/test/int/bookings.int-spec.ts",
    "unit": "apps/api/src/venues/booking-transitions.spec.ts",
    "sonde": "docs/preuves/D306/sondes/test/int/adverse-23a.int-spec.ts",
}


def verifier(racine: str) -> list:
    """Rend une ligne par titre : combien de `it(` de chaque spec il désigne (attendu 1 au total)."""
    titres_par_spec = {}
    for nom, chemin in SPECS.items():
        texte = open(f"{racine}/{chemin}", encoding="utf-8").read()
        titres_par_spec[nom] = re.findall(r'\bit\(\s*"((?:[^"\\]|\\.)*)"', texte)
    lignes = []
    for cle, prefixe in TITRES.items():
        n = sum(1 for ts in titres_par_spec.values() for t in ts if prefixe in t)
        lignes.append((cle, prefixe, n))
    return lignes, {k: len(v) for k, v in titres_par_spec.items()}
