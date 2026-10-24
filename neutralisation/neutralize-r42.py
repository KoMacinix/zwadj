#!/usr/bin/env python3
"""Campagne de neutralisation — RANG 42 (D337), LOT L36-1 : la RÉSERVATION PAR E-MAIL SEUL.

Ce que le lot ajoute, et que chaque cible neutralise (une garde neuve dont on n'a pas montré qu'elle mord est une assurance sans mesure) :
  · le CONTRAT (`packages/types`) : « un numéro OU un e-mail » est UNE fonction (`hasContactChannel`, `reachableContact`), appliquée par `bookingCreateSchema` et par
    `quoteConvertSchema` ; le numéro est facultatif mais, quand il est saisi, valide ; la clé est OMISE, jamais vide (T-*) ;
  · la BASE (migration `20261024100000`) : `contact_phone` facultatif, `CHECK (contact_phone IS NOT NULL OR contact_email IS NOT NULL)` (M-*, sous `--int`) ;
  · l'API : `bookings.service` et `quotes.service` écrivent NULL pour un numéro absent ; la charge utile de notification porte l'e-mail à défaut de numéro (S-*) ;
  · le formulaire en ligne du CLIENT : numéro OU e-mail, ni l'un ni l'autre `required` (D32), le texte « l'un des deux » relié aux deux champs, la clé du numéro omise (C-*) ;
  · l'écran du PRO : la conversion n'exige plus le numéro, le corps l'omet, la liste des demandes affiche l'e-mail à défaut de numéro, les canaux qui exigent un numéro restent
    bloqués sans numéro (P-*).
Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-r42.py            # les cibles qui n'exigent PAS de base (unitaires) — les cibles d'intégration sont COMPTÉES « non jouées »
    python3 neutralisation/neutralize-r42.py --int      # + les cibles d'intégration : PostgreSQL réel, base recréée par `setup-global` à chaque mesure
    R42_DECOUVERTE=1 python3 neutralisation/neutralize-r42.py [--int]   # n'écrit AUCUN verdict : liste les tests qui rougissent, par cible
Codes de sortie : 0 = tout joué, tout a mordu ; 1 = au moins une garde MUETTE ; 2 = pré-vol rouge, ERREUR DE SCRIPT, vitest non attendu, calibration manquée, ou arbre non conforme.

⛔ UNE MORSURE SE LIT, ELLE NE SE DÉDUIT PAS D'UN CODE DE SORTIE (D304, D305, D312, D316) : la ligne « Tests » compte au moins un test en échec (exécutés = passés + en échec) ; le titre attendu
y est marqué en échec ET la PREMIÈRE ligne de son bloc « FAIL … > titre » — en-têtes regroupés sautés — est une `AssertionError`. ⚠ Ce lot est de méthode NORMALE (le montant est inchangé) ; la lecture
d'« assertion » est gardée telle quelle : elle ne coûte rien, et un verdict qui ne serait pas une assertion n'est pas une morsure.
⛔ VITEST 3.2.7 : la lecture est calibrée sur SA sortie ; toute autre version ⇒ refus de juger.
⛔ LA MUTATION SE PROUVE POSÉE (D286) : ancre 1 → 0 ET marqueur n → n + 1 pour une SUBSTITUTION ; ancre 1 → 1 ET marqueur n → n + 1 pour une INSERTION. ⚠ Le remplacement d'une substitution
ne doit jamais être une SOUS-CHAÎNE de son ancre (D325).
⛔ UNE MUTATION ÉQUIVALENTE SE RETIRE PAR ÉCRIT, avec sa mesure, à la place de la cible retirée.
⛔ SURVIVRE À UN SIGNAL : sauvegarde sur DISQUE avant toute mutation, restaurée au démarrage suivant.
⛔ LES TITRES ATTENDUS SE RELÈVENT, ILS NE S'ÉCRIVENT PAS DE MÉMOIRE : `R42_DECOUVERTE=1` liste, par cible, ce qui rougit.
⛔ CE QUE CETTE CAMPAGNE NE MESURE PAS (écrit, pas tu) : (1) un VRAI navigateur — le parcours de bout en bout est `e2e/specs/r42-reservation-email-seul.e2e.ts`, neutralisée À LA MAIN
(procédure versée) ; (2) la notification réelle (L36-9, hors lot) ; (3) ce que Ko voit (`docs/preuves/D337/scenarios-ko.md`).

POURQUOI IL EXISTE : CLAUDE.md, « une garde qui ne mord pas n'est pas une garde ». Lecteur, calibration et boucle : COPIÉS de `neutralize-r42.py` (lui-même copié de `neutralize-r39.py`, calibré par
D316 / D325 / D331 / D332 / D333) ; seuls les noms, le jeu de cibles et le bilan changent.
"""

import hashlib
import io
import json
import os
import re
import shutil
import subprocess
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO (pnpm-workspace.yaml introuvable).")
    print(f"  dossier courant : {os.getcwd()}")
    print(f"  → python3 neutralisation/{os.path.basename(__file__)}")
    sys.exit(2)

SAUVEGARDE = ".neutralisation-r42"
MANIFESTE = os.path.join(SAUVEGARDE, "manifeste.json")
JOURNAUX = os.path.join(".neutralisation-journaux", "r42")  # ignoré par git ; ce qu'une décision cite se COPIE (D291)
ANSI = re.compile(r"\x1b\[[0-9;]*m")
VITEST_ATTENDU = "v3.2.7"
DECOUVERTE = os.environ.get("R42_DECOUVERTE") == "1"
# `R42_FILTRE="P-,S-"` ne joue que les cibles dont l'identifiant commence par l'un de ces préfixes — POUR LA DÉCOUVERTE SEULEMENT : une campagne filtrée n'est pas une campagne verte.
FILTRE = [p for p in os.environ.get("R42_FILTRE", "").split(",") if p]


def _vitest(paquet: str, fichier: str) -> list[str]:
    return ["pnpm", "--filter", paquet, "exec", "vitest", "run", fichier]


def _vitest_int(fichier: str) -> list[str]:
    return ["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", "-c", "vitest.config.int.ts", fichier]


MESURES = {
    "contrat": _vitest("@zwadj/api", "src/common/contact.spec.ts"),
    "schemas": _vitest("@zwadj/api", "src/venues/bookings.schemas.spec.ts"),
    "notification": _vitest("@zwadj/api", "src/venues/booking-notification-input.spec.ts"),
    "client": _vitest("@zwadj/client", "src/components/venue/booking-request-panel.test.tsx"),
    "garde": _vitest("@zwadj/client", "src/lib/contact-channel-guard.test.ts"),
    "pro-contact": _vitest("@zwadj/pro", "src/dashboard/walkin-contact.test.ts"),
    "pro-parcours": _vitest("@zwadj/pro", "src/dashboard/walkin-journey.test.tsx"),
    "pro-demandes": _vitest("@zwadj/pro", "src/venues/booking-requests-section.test.tsx"),
    # ── mesures d'INTÉGRATION (PostgreSQL réel, `--int`) : la base est recréée par `setup-global` à chaque lancement ; les migrations sont REJOUÉES depuis les fichiers.
    "int-reservations": _vitest_int("test/int/bookings.int-spec.ts"),
    "int-devis": _vitest_int("test/int/quotes.int-spec.ts"),
    "int-migration": _vitest_int("test/int/migration-non-empty.int-spec.ts"),
}
MESURES_INT = {"int-reservations", "int-devis", "int-migration"}
AVEC_INT = "--int" in sys.argv

CONTACT = "packages/types/src/contact.ts"
TYPES_RESERVATION = "packages/types/src/booking.ts"
TYPES_DEVIS = "packages/types/src/quote.ts"
SERVICE_RESERVATIONS = "apps/api/src/venues/bookings.service.ts"
SERVICE_DEVIS = "apps/api/src/venues/quotes.service.ts"
NOTIFICATION = "apps/api/src/venues/booking-notification-input.ts"
MIGRATION = "apps/api/prisma/migrations/20261024100000_booking_contact_phone_optional/migration.sql"
PANNEAU = "apps/client/src/components/venue/booking-request-panel.tsx"
ECRAN_CONTACT = "apps/pro/src/dashboard/walkin-contact.ts"
PARCOURS = "apps/pro/src/dashboard/walkin-journey.tsx"
DEMANDES = "apps/pro/src/venues/booking-requests-section.tsx"

CIBLES: list[dict] = []


def cible(libelle: str, fichier: str, avant: str, apres: str, mesures: dict[str, str], genre: str = "substitution") -> None:
    """`mesures` : {nom de mesure → sous-chaîne du titre du test qui doit rougir}. Chaque mesure doit mordre.
    `genre` (D286 — chaque genre a SON arithmétique) : « substitution » = ancre 1→0 ET marqueur n→n+1 ; « insertion » = le remplacement CONTIENT l'ancre, qui doit
    donc SURVIVRE (1→1) tandis que le marqueur passe de n à n+1."""
    CIBLES.append({"libelle": libelle, "fichier": fichier, "avant": avant, "apres": apres, "mesures": mesures, "genre": genre})


A_DECOUVRIR = "?"

# ── T — le CONTRAT (`@zwadj/types`) : UNE règle, UNE fonction.
cible("T-1. ⛔ `hasContactChannel` rend toujours VRAI : « ni numéro ni e-mail » n'est plus refusé nulle part", CONTACT,
      "return estRenseigne(phone) || estRenseigne(email);", "return phone !== undefined || email !== undefined || true;",
      {"contrat": "dix cas, dont quatre"})
cible("T-2. ⛔ `hasContactChannel` ne regarde que le NUMÉRO : l'e-mail seul n'est plus un moyen de joindre", CONTACT,
      "return estRenseigne(phone) || estRenseigne(email);", "return estRenseigne(phone) && email !== undefined || estRenseigne(phone);",
      {"contrat": "dix cas, dont quatre"})
cible("T-3. ⛔ une chaîne BLANCHE vaut « renseigné » (un formulaire vide passerait pour un contact)", CONTACT,
      'return typeof valeur === "string" ? valeur.trim() !== "" : true;', 'return typeof valeur === "string" ? valeur !== "" : true;',
      {"contrat": "dix cas, dont quatre"})
cible("T-4. ⛔ `reachableContact` donne l'E-MAIL avant le numéro (le pro rappelle d'abord)", CONTACT,
      'if (numero !== "") return numero;', 'if (numero !== "" && (email ?? "").trim() === "") return numero;',
      {"contrat": "les deux : le NUMÉRO — le pro rappelle d'abord"})
cible("T-5. ⛔ la réservation en ligne accepte « ni numéro ni e-mail »", TYPES_RESERVATION,
      'if (!hasContactChannel(corps.contactPhone, corps.contactEmail)) {\n      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["contactPhone"], message: "booking.validation.contactChannelRequired" });',
      'if (false) {\n      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["contactPhone"], message: "booking.validation.contactChannelRequired" });',
      {"schemas": "ML-1 — NI numéro NI e-mail : refusé"})
cible("T-6. ⛔ la conversion d'un devis accepte « ni numéro ni e-mail »", TYPES_DEVIS,
      'if (!hasContactChannel(corps.contactPhone, corps.contactEmail)) {\n      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["contactPhone"], message: "quote.validation.contactChannelRequired" });',
      'if (false) {\n      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["contactPhone"], message: "quote.validation.contactChannelRequired" });',
      {"contrat": "ML-1 — NI l'un NI l'autre : refusé"})
cible("T-7. ⛔ le numéro redevient OBLIGATOIRE à la réservation en ligne", TYPES_RESERVATION,
      "    contactPhone: dzPhoneSchema.optional(),", "    contactPhone: dzPhoneSchema,",
      {"schemas": "ML-2 — un e-mail SEUL : accepté"})
cible("T-8. ⛔ le numéro redevient OBLIGATOIRE à la conversion d'un devis", TYPES_DEVIS,
      "    contactPhone: dzPhoneSchema.optional(),", "    contactPhone: dzPhoneSchema,",
      {"contrat": "ML-2 — e-mail seul : accepté, le numéro reste ABSENT"})
cible("T-9. ⛔ un numéro VIDE devient une absence à la réservation en ligne (« facultatif » ne veut plus dire clé omise)", TYPES_RESERVATION,
      "    contactPhone: dzPhoneSchema.optional(),", '    contactPhone: z.union([dzPhoneSchema, z.literal("")]).optional(),',
      {"schemas": "ML-9 — « facultatif » veut dire CLÉ OMISE"})

# ── S — l'API.
cible("S-1. ⛔ la réservation par e-mail seul écrit une chaîne VIDE au lieu de NULL dans `contact_phone` (le CHECK passe, la donnée ment)", SERVICE_RESERVATIONS,
      "        contactPhone: input.contactPhone ?? null,", '        contactPhone: input.contactPhone ?? "",',
      {"int-reservations": "ML-2 — e-mail seul : 201, PENDING"}, )
cible("S-2. ⛔ la conversion par e-mail seul écrit une chaîne VIDE au lieu de NULL dans `contact_phone`", SERVICE_DEVIS,
      "      contactPhone: input.contactPhone ?? null,", '      contactPhone: input.contactPhone ?? "",',
      {"int-devis": "ML-2 — un client avec un E-MAIL SEUL se convertit"})
cible("S-3. ⛔ la notification au pro ne cite que le NUMÉRO : une réservation par e-mail seul n'a aucun contact", NOTIFICATION,
      'contact: reachableContact(row.contactPhone, row.contactEmail) ?? "",', 'contact: row.contactPhone ?? "",',
      {"notification": "e-mail seul : `contact` est l'e-mail", "int-reservations": "ML-5 — le pro est prévenu"})

# ── M — la BASE (migration).
cible("M-1. ⛔ la colonne `contact_phone` redevient NOT NULL : l'e-mail seul est refusé par la base", MIGRATION,
      'ALTER COLUMN "contact_phone" DROP NOT NULL;', 'ALTER COLUMN "contact_phone" SET NOT NULL;',
      {"int-migration": "la colonne est FACULTATIVE"})
cible("M-2. ⛔ le CHECK ne garde plus rien (`true`) : ni numéro ni e-mail passe en base", MIGRATION,
      'CHECK ("contact_phone" IS NOT NULL OR "contact_email" IS NOT NULL);', "CHECK (true);",
      {"int-migration": "la colonne est FACULTATIVE", "int-reservations": "ML-11 — la BASE refuse"})
cible("M-3. ⛔ le CHECK exige les DEUX (ET au lieu de OU) : l'e-mail seul est refusé", MIGRATION,
      'CHECK ("contact_phone" IS NOT NULL OR "contact_email" IS NOT NULL);', 'CHECK ("contact_phone" IS NOT NULL AND "contact_email" IS NOT NULL);',
      {"int-migration": "la colonne est FACULTATIVE"})

# ── C — le formulaire en ligne du CLIENT.
cible("C-1. ⛔ le numéro redevient obligatoire pour ENVOYER (l'e-mail seul laisse le bouton inerte)", PANNEAU,
      "hasContactChannel(phone, email) &&", "phone !== \"\" &&",
      {"client": "ML-2 — l'e-mail SEUL suffit"})
cible("C-2. ⛔ un numéro SAISI et incomplet ne retient plus l'envoi quand l'e-mail est bon", PANNEAU,
      "(!numeroSaisi || isPhoneComplete(DEFAULT_PHONE_COUNTRY, phone))", "(!numeroSaisi || isPhoneComplete(DEFAULT_PHONE_COUNTRY, phone) || true)",
      {"client": "ML-8 — un numéro SAISI et incomplet retient"})
cible("C-3. ⛔ un e-mail SAISI et invalide ne retient plus l'envoi", PANNEAU,
      "&& !emailRefuse;", "&& !(emailRefuse && false);",
      {"client": "ML-8 — un e-mail SAISI et invalide retient"})
cible("C-4. ⛔ le corps envoie TOUJOURS la clé du numéro (« +213 » seul quand il est vide)", PANNEAU,
      '...(phone === "" ? {} : { contactPhone: toE164(DEFAULT_PHONE_COUNTRY, phone) }),', "contactPhone: toE164(DEFAULT_PHONE_COUNTRY, phone),",
      {"client": "ML-2 — l'e-mail SEUL suffit"})
cible("C-5. ⛔ D32 — le champ du numéro porte de nouveau `required` (obligatoire SEUL)", PANNEAU,
      "                describedBy={contactAideId}\n              />", "                describedBy={contactAideId}\n                required\n              />",
      {"client": "ML-19 (D32)"})
cible("C-6. ⛔ l'e-mail n'est plus relié au texte « l'un des deux » par `aria-describedby`", PANNEAU,
      "aria-describedby={describedBy === undefined ? contactAideId : `${contactAideId} ${describedBy}`}", "aria-describedby={describedBy}",
      {"client": "ML-19 (D32)"})
cible("C-7. ⛔ le champ du numéro n'est plus relié au texte « l'un des deux »", PANNEAU,
      "                describedBy={contactAideId}\n              />", "                describedBy={undefined}\n              />",
      {"client": "ML-19 (D32)"})

# ── P — l'écran du PRO.
cible("P-1. ⛔ la conversion exige de nouveau le NUMÉRO (l'e-mail seul retient)", ECRAN_CONTACT,
      'if (!hasContactChannel(contact.phone, contact.email)) out.push("needIdentifier");', 'if (contact.phone === "") out.push("needIdentifier");',
      {"pro-contact": "ML-2 — un e-mail VALIDE seul suffit"})
cible("P-2. ⛔ un numéro SAISI et invalide ne retient plus la conversion quand l'e-mail est bon", ECRAN_CONTACT,
      'else if (contact.phone !== "") {', "else if (false) {",
      {"pro-contact": "ML-8 — un numéro SAISI et invalide retient"})
cible("P-3. ⛔ le corps de la conversion envoie TOUJOURS la clé du numéro (« +213 » seul quand il est vide)", ECRAN_CONTACT,
      '...(contact.phone === "" ? {} : { contactPhone: toE164(country, contact.phone) }),', "contactPhone: toE164(country, contact.phone),",
      {"pro-parcours": "L36-1 — une fiche SANS numéro", "pro-contact": "L36-1 — sans numéro, la clé"})
cible("P-4. ⛔ la liste des demandes n'affiche que le NUMÉRO : une réservation par e-mail seul n'a plus de contact visible", DEMANDES,
      "reachableContact(row.contactPhone, row.contactEmail);", "row.contactPhone;",
      {"pro-demandes": "ML-5 — sans numéro, l'E-MAIL est affiché"})
cible("P-5. ⛔ ML-18 — le contact de la liste n'est plus écrit de gauche à droite (un e-mail se retourne dans une page arabe)", DEMANDES,
      '<span className="field-hint" dir="ltr">', '<span className="field-hint">',
      {"pro-demandes": "ML-18 — le contact s'écrit de gauche à droite"})
cible("P-6. ⛔ ML-6 — les canaux SMS et appel ne sont plus bloqués sans numéro", PARCOURS,
      "const telOk = isPhoneComplete(DEFAULT_PHONE_COUNTRY, contact.phone);", "const telOk = true;",
      {"pro-parcours": "ML-6 — SANS numéro, les canaux"})


def _est_int(c: dict) -> bool:
    return any(_mesure_de(m) in MESURES_INT for m in c["mesures"])


def _jouees() -> list[dict]:
    """Les cibles jouées. Une clé de mesure peut porter un suffixe `#n` : plusieurs titres d'un MÊME fichier de test pour une même cible (le dictionnaire ne peut pas répéter une clé).
    Sans `--int`, les cibles d'INTÉGRATION (PostgreSQL réel) ne sont pas jouées : elles sont COMPTÉES comme telles, jamais comme mordues.
    ⚠ Une cible qui a une mesure d'intégration ET une mesure unitaire n'est jouée qu'avec `--int` : ses deux mesures se jugent ensemble."""
    return [{**c, "mesures": dict(c["mesures"])} for c in CIBLES if AVEC_INT or not _est_int(c)]


def _mesure_de(cle: str) -> str:
    return cle.split("#")[0]


def _binaire(nom: str) -> str:
    """Résout l'exécutable AVANT `subprocess.run` (Windows : `pnpm.cmd`)."""
    return shutil.which(nom) or nom


def lancer(mesure: str) -> tuple[int, str]:
    cmd = MESURES[_mesure_de(mesure)]
    r = subprocess.run([_binaire(cmd[0]), *cmd[1:]], capture_output=True, text=True, encoding="utf-8", errors="replace")
    return r.returncode, ANSI.sub("", (r.stdout or "") + "\n" + (r.stderr or ""))


def lire_vitest(sortie: str, titre: str | None) -> tuple[str, str]:
    """Rend (verdict, détail). Verdicts : VERT, ROUGE, MORD, SANS-TITRE, PAS-ASSERTION, NON-DÉMARRÉE, VERSION.
    Copie du lecteur de `neutralize-r39.py` (lui-même copié de `neutralize-r33.py`, calibré par D316 et D325) — mêmes verdicts, mêmes bras de calibration ci-dessous."""
    if f"RUN  {VITEST_ATTENDU}" not in sortie:
        m = re.search(r"RUN\s+(v\S+)", sortie)
        return "VERSION", f"vitest {m.group(1) if m else 'introuvable'}, {VITEST_ATTENDU} attendu"
    ligne = re.search(r"^\s*Tests\s+(.*)$", sortie, re.M)
    if not ligne:
        return "NON-DÉMARRÉE", "aucune ligne « Tests »"
    echecs = int(m.group(1)) if (m := re.search(r"(\d+) failed", ligne.group(1))) else 0
    passes = int(m.group(1)) if (m := re.search(r"(\d+) passed", ligne.group(1))) else 0
    if passes + echecs == 0:
        return "NON-DÉMARRÉE", f"exécutés 0 ({ligne.group(0).strip()})"
    if titre is None or echecs == 0:
        return ("VERT" if echecs == 0 else "ROUGE"), f"passés {passes} · en échec {echecs}"
    if not any("×" in l and titre in l for l in sortie.splitlines()):
        return "SANS-TITRE", f"en échec {echecs}, aucun « × » ne porte « {titre} »"
    lignes = sortie.splitlines()
    premiere = "—"
    for i, l in enumerate(lignes):
        if l.strip().startswith("FAIL ") and titre in l:
            premiere = next((x.strip() for x in lignes[i + 1:] if x.strip() and not x.strip().startswith("FAIL ")), "—")
            break
    if not premiere.startswith("AssertionError"):
        return "PAS-ASSERTION", f"première ligne du bloc : {premiere[:140]}"
    return "MORD", f"passés {passes} · en échec {echecs} · {premiere[:140]}"


def echecs_de(sortie: str) -> list[tuple[str, str]]:
    """Mode DÉCOUVERTE : (titre, première ligne de son bloc) pour chaque test en échec. Les en-têtes REGROUPÉS partagent le message qui les suit."""
    lignes = sortie.splitlines()
    rendus: list[tuple[str, str]] = []
    i = 0
    while i < len(lignes):
        if lignes[i].strip().startswith("FAIL ") and ">" in lignes[i]:
            titres = []
            while i < len(lignes) and (lignes[i].strip().startswith("FAIL ") or not lignes[i].strip()):
                if lignes[i].strip():
                    titres.append(lignes[i].strip())
                i += 1
            message = lignes[i].strip() if i < len(lignes) else "—"
            rendus += [(t, message) for t in titres]
        else:
            i += 1
    return rendus


# ── CALIBRATION DU LECTEUR, à chaque lancement (D286) — les bras de `neutralize-r39.py`, formes réelles versées sous `docs/preuves/D316/` et `docs/preuves/D304/`.
_V = " RUN  v3.2.7 C:/x\n"
CALIBRATION = [
    ("en-têtes REGROUPÉS puis AssertionError", _V
     + "   × d > 93 jour(s) : t 8ms\n   × d > 182 jour(s) : t 1ms\n"
       " FAIL  a.test.ts > d > 93 jour(s) : t\n FAIL  a.test.ts > d > 182 jour(s) : t\n"
       "AssertionError: expected false to be true // Object.is equality\n      Tests  7 failed | 9 passed (16)\n",
     "182 jour(s) : t", "MORD"),
    ("plantage (TypeError)", _V
     + "   × d > t 219ms\n FAIL  a.test.ts > d > t\nTypeError: .toMatch() expects to receive a string, but got undefined\n"
       "      Tests  1 failed | 18 passed (19)\n", "t", "PAS-ASSERTION"),
    ("erreur de REQUÊTE Testing Library (pas une assertion)", _V
     + "   × d > t 1105ms\n FAIL  a.test.ts > d > t\nTestingLibraryElementError: Unable to find an element with the text: x\n"
       "      Tests  1 failed | 13 passed (14)\n", "t", "PAS-ASSERTION"),
    ("rien d'exécuté sous filtre", _V + "      Tests  25 skipped (25)\n", "t", "NON-DÉMARRÉE"),
    ("autre version", " RUN  v3.2.6 C:/x\n      Tests  1 failed (1)\n", "t", "VERSION"),
    ("crochet en échec (bloc de FICHIER, 1 skipped)", _V
     + " Test Files  1 failed (1)\n      Tests  1 skipped (1)\n FAIL  cas/crochet.cas.ts [ cas/crochet.cas.ts ]\n"
       "Error: crochet en panne\n", "t", "NON-DÉMARRÉE"),
    ("le titre attendu n'échoue pas (un autre, si)", _V
     + "   × d > une autre garde 3ms\n FAIL  a.test.ts > d > une autre garde\nAssertionError: expected 1 to be 2\n"
       "      Tests  1 failed | 4 passed (5)\n", "garde visée par la cible", "SANS-TITRE"),
    ("délai dépassé (jamais une morsure)", _V
     + "   × d > t 5001ms\n FAIL  a.test.ts > d > t\nError: Test timed out in 5000ms.\n      Tests  1 failed | 7 passed (8)\n", "t", "PAS-ASSERTION"),
    ("plafond de console (Error de test-setup, pas une assertion)", _V
     + "   × d > t 30ms\n FAIL  a.test.ts > d > t\nError: 3 avertissement(s) de console dans un fichier NON exempté.\n      Tests  1 failed | 3 passed (4)\n", "t", "PAS-ASSERTION"),
]


def calibrer() -> bool:
    manques = 0
    for nom, texte, titre, attendu in CALIBRATION:
        verdict, _ = lire_vitest(texte, titre)
        manques += verdict != attendu
        print(f"  calibration {'✓' if verdict == attendu else '✗'} {nom} : {verdict} (attendu {attendu})")
    decouverte = echecs_de(_V + " FAIL  a.test.ts > d > un\n FAIL  a.test.ts > d > deux\nAssertionError: m1\n\n FAIL  a.test.ts > d > trois\nTypeError: m2\n")
    attendu_decouverte = [("FAIL  a.test.ts > d > un", "AssertionError: m1"), ("FAIL  a.test.ts > d > deux", "AssertionError: m1"),
                          ("FAIL  a.test.ts > d > trois", "TypeError: m2")]
    ok = decouverte == attendu_decouverte
    manques += not ok
    print(f"  calibration {'✓' if ok else '✗'} découverte : {len(decouverte)} échec(s) lu(s) (attendu 3)")
    print(f"  calibration : {len(CALIBRATION) + 1} bras · {manques} manqué(s) (attendu 0)")
    return manques == 0


def _ecrire_manifeste(actions: list) -> None:
    os.makedirs(SAUVEGARDE, exist_ok=True)
    io.open(MANIFESTE, "w", encoding="utf-8", newline="").write(json.dumps(actions, ensure_ascii=False))


def _defaire(actions: list) -> None:
    for action in reversed(actions):
        io.open(action["chemin"], "w", encoding="utf-8", newline="").write(action["contenu"])


def restaurer_si_interrompu() -> None:
    if os.path.isfile(MANIFESTE):
        actions = json.load(io.open(MANIFESTE, encoding="utf-8"))
        _defaire(actions)
        print(f"↺ arbre restauré après une exécution interrompue ({len(actions)} fichier(s)).")
    shutil.rmtree(SAUVEGARDE, ignore_errors=True)


def empreintes() -> dict[str, str]:
    return {f: hashlib.sha256(open(f, "rb").read()).hexdigest() for f in sorted({c["fichier"] for c in CIBLES})}


def _adapter(texte: str, source: str) -> str:
    """Les ancres multi-lignes sont écrites en `\\n` : un fichier en CRLF les porte en `\\r\\n` (D325 : « un motif multi-lignes doit porter `\\r\\n` »)."""
    return texte.replace("\n", "\r\n") if "\r\n" in source else texte


def verifier_arbre(moment: str, depart: dict[str, str] | None = None) -> bool:
    """Chaque ancre est là, UNE fois ; à l'arrivée, chaque fichier ciblé a l'EMPREINTE du départ (restauration prouvée à l'octet)."""
    ecarts = []
    for c in CIBLES:
        src = io.open(c["fichier"], encoding="utf-8", newline="").read()
        n = src.count(_adapter(c["avant"], src))
        if n != 1:
            ecarts.append(f"{c['libelle'][:5]} : ancre ×{n}")
    if depart is not None:
        maintenant = empreintes()
        ecarts += [f"{f} : empreinte changée" for f in depart if depart[f] != maintenant[f]]
        print(f"  empreintes : {len(depart)} fichier(s) ciblé(s) comparé(s) au départ · {sum(depart[f] != maintenant[f] for f in depart)} différent(s) (attendu 0)")
    if ecarts:
        print(f"✗ ARBRE NON CONFORME {moment} : " + " ; ".join(ecarts))
        return False
    return True


def main() -> int:
    restaurer_si_interrompu()
    if not calibrer():
        print("✗ ABANDON : le lecteur manque un bras de sa calibration — rien n'est mesuré.")
        return 2
    if not verifier_arbre("AU DÉPART"):
        return 2
    if FILTRE and not DECOUVERTE:
        print("✗ R42_FILTRE n'est admis qu'avec R42_DECOUVERTE=1 : une campagne filtrée n'est pas une campagne verte, aucun verdict n'est rendu.")
        return 2
    toutes = _jouees()
    sans_titre = [c["libelle"].split(".")[0] for c in toutes for t in c["mesures"].values() if t == A_DECOUVRIR]
    if sans_titre and not DECOUVERTE:
        print(f"✗ TITRE NON RELEVÉ pour {len(sans_titre)} mesure(s) ({', '.join(sorted(set(sans_titre)))}) : relever par R42_DECOUVERTE=1, puis écrire le titre — aucun verdict n'est rendu sur « ? ».")
        return 2
    actives = [c for c in toutes if not FILTRE or any(c["libelle"].startswith(p) for p in FILTRE)]
    depart = empreintes()
    os.makedirs(JOURNAUX, exist_ok=True)
    mesures_utilisees = sorted({_mesure_de(m) for c in actives for m in c["mesures"]})
    non_jouees = sum(1 for c in CIBLES if _est_int(c) and not AVEC_INT)
    print(f"cibles : {len(CIBLES)} déclarées · {len(actives)} jouées · {non_jouees} non jouée(s) (sans --int) · {len(mesures_utilisees)} mesure(s) distincte(s) · {len({c['fichier'] for c in actives})} fichier(s) muté(s)")

    # ── PRÉ-VOL : chaque mesure, SANS mutation, doit être verte et avoir DÉMARRÉ.
    for mesure in mesures_utilisees:
        code, sortie = lancer(mesure)
        io.open(os.path.join(JOURNAUX, f"prevol-{mesure}.log"), "w", encoding="utf-8").write(sortie)
        verdict, detail = lire_vitest(sortie, None)
        if code != 0 or verdict != "VERT":
            print(f"✗ PRÉ-VOL {mesure} : code {code}, {verdict} — {detail}")
            print(sortie[-3000:])
            return 2
        print(f"  pré-vol {mesure} : code 0 · {detail}")

    mordu, muettes, erreurs = 0, [], []
    for cible_ in actives:
        chemin = cible_["fichier"]
        source = io.open(chemin, encoding="utf-8", newline="").read()
        avant, apres = _adapter(cible_["avant"], source), _adapter(cible_["apres"], source)
        ancre_avant, marque_avant = source.count(avant), source.count(apres)
        if ancre_avant != 1:
            print(f"✗ {cible_['libelle']}\n   ERREUR DE SCRIPT : {ancre_avant} occurrence(s), 1 attendue dans {chemin}")
            erreurs.append(cible_["libelle"])
            break
        mute = source.replace(avant, apres)
        ancre_apres, marque_apres = mute.count(avant), mute.count(apres)
        ancre_attendue = 1 if cible_["genre"] == "insertion" else 0
        if (ancre_apres, marque_apres) != (ancre_attendue, marque_avant + 1):
            print(f"✗ {cible_['libelle']}\n   MUTATION NON POSÉE : ancre {ancre_avant}→{ancre_apres}, "
                  f"marqueur {marque_avant}→{marque_apres} (attendu 1→{ancre_attendue} et {marque_avant}→{marque_avant + 1}, genre {cible_['genre']})")
            erreurs.append(cible_["libelle"])
            break
        annuler = [{"chemin": chemin, "contenu": source}]
        _ecrire_manifeste(annuler)
        io.open(chemin, "w", encoding="utf-8", newline="").write(mute)
        sorties: dict[str, tuple[int, str]] = {}
        try:
            for mesure in {_mesure_de(m) for m in cible_["mesures"]}:
                sorties[mesure] = lancer(mesure)
        finally:
            _defaire(annuler)
            shutil.rmtree(SAUVEGARDE, ignore_errors=True)
        ident = cible_["libelle"].split(".")[0]
        posee = f"ancre 1→{ancre_attendue} · marqueur {marque_avant}→{marque_avant + 1} · genre {cible_['genre']}"
        # La sortie ENTIÈRE se journalise : un rouge qu'on ne peut plus relire se relance sans être lu (D270).
        for mesure, (code, sortie) in sorties.items():
            io.open(os.path.join(JOURNAUX, f"{ident}-{mesure}.log"), "w", encoding="utf-8").write(sortie)
        if DECOUVERTE:
            print(f"■ {cible_['libelle']}\n   {posee}")
            for mesure, (code, sortie) in sorties.items():
                verdict, detail = lire_vitest(sortie, None)
                print(f"   [{mesure}] code {code} · {verdict} — {detail}")
                for titre, message in echecs_de(sortie):
                    print(f"      {titre[:200]}\n         ↳ {message[:150]}")
            continue
        verdicts = []
        for cle, titre in cible_["mesures"].items():
            code, sortie = sorties[_mesure_de(cle)]
            verdict, detail = lire_vitest(sortie, titre)
            verdicts.append((cle, code, verdict, detail))
        if any(v in ("NON-DÉMARRÉE", "VERSION") for _, _, v, _ in verdicts):
            for mesure, code, verdict, detail in verdicts:
                print(f"✗ {cible_['libelle']}\n   [{mesure}] MESURE NON DÉMARRÉE ({verdict}) : {detail}")
            erreurs.append(cible_["libelle"])
            break
        if all(v == "MORD" and code != 0 for _, code, v, _ in verdicts):
            mordu += 1
            print(f"✓ {cible_['libelle']}\n   {posee}")
            for mesure, code, verdict, detail in verdicts:
                print(f"   [{mesure}] code {code} · {detail}")
        else:
            muettes.append(cible_["libelle"])
            print(f"✗ {cible_['libelle']}\n   {posee}")
            for mesure, code, verdict, detail in verdicts:
                print(f"   [{mesure}] code {code} · {verdict} — {detail}")

    conforme = verifier_arbre("À L'ARRIVÉE", depart)
    if DECOUVERTE:
        print(f"\nDÉCOUVERTE : {len(actives)} cible(s) jouée(s) sur {len(CIBLES)}, aucun verdict écrit.")
    else:
        print(f"\n{mordu} garde(s) mordue(s) sur {len(actives)} cible(s) jouée(s) · {len(muettes)} muette(s) · {len(erreurs)} non mesurée(s) · {non_jouees} non jouée(s) (sans --int) "
              f"(attendu : {len(actives)} sur {len(actives)}, 0, 0, {0 if AVEC_INT else non_jouees})")
    if conforme:
        print("arbre rendu à son état de départ : vérifié.")
    if erreurs or not conforme:
        return 2
    return 1 if muettes else 0


if __name__ == "__main__":
    sys.exit(main())
