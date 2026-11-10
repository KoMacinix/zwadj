#!/usr/bin/env python3
"""Campagne de neutralisation — RANG 49 (D347) : le parcours « Nouvelle réservation » du pro retrouve une spec navigateur (`e2e/specs/r49-nouvelle-reservation.e2e.ts`).

Chaque cible MUTE l'application (jamais la spec) pour faire apparaître le défaut que la garde nomme, joue la spec dans un vrai navigateur, et lit l'échec du test visé :
il doit être une ASSERTION `expect(...)` (D305, D323). Le lot ne change aucune ligne d'`apps/` : la mutation dure le temps d'une mesure, puis le fichier est restauré (D318).
Cibles : T1 les règles de saisie (G1a-G1e) · T2 montants, rail, « Précédent », fenêtre, « Nouveau devis », ligne écrite (G1g-G1m) · T3 « Bloquer la date » (G2) · T4 l'échec
du serveur (G3) · T5 le calendrier (G4) · T6 l'arabe à 360 px (G5). La CARTE : `docs/preuves/D347/carte.md`.

Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-r49.py            # la calibration du lecteur seule ; les cibles e2e : NON MESURÉES (code 3)
    python3 neutralisation/neutralize-r49.py --e2e      # + toutes les cibles (serveurs de dev, base zwadj_e2e)
Codes de sortie : 0 = tout joué, tout a mordu ; 1 = au moins une garde MUETTE ; 2 = pré-vol rouge, ERREUR DE SCRIPT, mutation non posée, calibration manquée, ou arbre non
conforme ; 3 = campagne INCOMPLÈTE (cibles e2e hors exécution : lancer avec --e2e).

⛔ UNE MORSURE SE LIT, ELLE NE SE DÉDUIT PAS D'UN CODE DE SORTIE (D304, D305, D312, D316, D323) : une ligne « x » porte le titre visé, et le bloc d'erreur de CE test porte `expect(`.
Un délai d'ACTION (`click`, `goto`, `getAttribute`) n'est pas une morsure ; l'expiration d'une assertion web-first l'est (D323). Le lecteur et sa calibration (deux bras par verdict)
sont ceux de `neutralize-r48.py`, repris tels quels.
⛔ LA MUTATION SE PROUVE POSÉE (D286) : ancre 1 → 0 ET marqueur n → n + 1 pour CHAQUE remplacement (substitutions seulement ; aucun texte remplaçant n'est une sous-chaîne de son
ancre — D325). Une cible peut porter PLUSIEURS remplacements du même fichier (une même panne en plusieurs endroits).
⛔ SURVIVRE À UN SIGNAL : sauvegarde sur DISQUE avant toute mutation, restaurée au démarrage suivant si une exécution a été tuée.
⚠ Les fichiers mutés sont en CRLF : une ancre sur plusieurs lignes porte `\r\n`.

POURQUOI IL EXISTE : une garde neuve dont on n'a pas montré qu'elle mord est une assurance sans mesure (CLAUDE.md). Ce que la spec voit — la cascade CSS, la géométrie, l'ordre des
événements — est invisible à jsdom : sans cette campagne, rien ne dirait qu'une règle de saisie ou un hachurage peut disparaître sans qu'une porte rougisse.
"""

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

SAUVEGARDE = ".neutralisation-r49"
MANIFESTE = os.path.join(SAUVEGARDE, "manifeste.json")
JOURNAUX = os.path.join(".neutralisation-journaux", "r49")  # ignoré par git ; ce qu'une décision cite se COPIE (D291)
ANSI = re.compile(r"\x1b\[[0-9;]*m")
VITEST_ATTENDU = "v3.2.7"

J = "apps/pro/src/dashboard/walkin-journey.tsx"
CT = "apps/pro/src/dashboard/walkin-contact.ts"
CSS = "apps/pro/src/theme.css"
I18N = "apps/pro/src/i18n.ts"
PF = "packages/ui/src/phone-field.tsx"
PH = "packages/types/src/phone.ts"

MESURES = {"e2e-r49": ["pnpm", "--filter", "@zwadj/e2e", "exec", "playwright", "test", "specs/r49-nouvelle-reservation.e2e.ts"]}
MODE = {"e2e-r49": "e2e"}

T1 = "T1 — les règles de SAISIE"
T2 = "T2 — jusqu'à la demande enregistrée"
T3 = "T3 — « Bloquer la date »"
T4 = "T4 — un échec du serveur"
T5 = "T5 — le calendrier du parcours"
T6 = "T6 — en ARABE, à 360 px"


def cible(libelle: str, fichier: str, remplacements: list, titre: str) -> dict:
    return {"libelle": libelle, "fichier": fichier, "remplacements": remplacements, "mesure": "e2e-r49", "titre": titre}


CIBLES = [
    # ── G1a — « Continuer » DIT pourquoi
    cible("R49-1. G1a — « Continuer » du contact n'est plus relié à sa raison (aria-describedby)", J,
          [('aria-describedby={identifiantPret ? undefined : "wk-continue-reason"}', "aria-describedby={undefined}")], T1),
    cible("R49-2. G1a — « Continuer » des noms n'est plus relié à sa raison (aria-describedby)", J,
          [('aria-describedby={clientAnswered ? undefined : "wk-continue-reason"}', "aria-describedby={undefined}")], T1),
    # ── G1d — l'e-mail
    cible("R49-3. G1d — l'erreur d'e-mail n'est plus affichée sous le champ", J,
          [('error={invalidIdentifiant.email ? t("venue.ui.walkin.emailInvalid") : undefined}', "error={undefined}")], T1),
    cible("R49-4. G1d — un e-mail saisi et invalide ne retient plus « Continuer »", CT,
          [('if (identifiant.email.trim() !== "" && !isValidContactEmail(identifiant.email)) out.push("needEmailValid");',
            'if (identifiant.email.trim() !== "" && false && !isValidContactEmail(identifiant.email)) out.push("needEmailValid");')], T1),
    # ── G1b — les noms
    cible("R49-5. G1b — l'erreur du nom en lettres latines n'est plus affichée", J,
          [('error={invalidNames.latin ? t("venue.ui.walkin.nameLatinInvalid") : undefined}', "error={undefined}")], T1),
    cible("R49-6. G1b — un nom latin invalide ne retient plus « Continuer »", CT,
          [('if (latin !== "" && !isValidPersonName(latin)) out.push("needNameLatinValid");',
            'if (latin !== "" && false && !isValidPersonName(latin)) out.push("needNameLatinValid");')], T1),
    # ── G1e — les exemples
    cible("R49-7. G1e — le champ du nom latin perd son exemple", J, [('placeholder={t("venue.ui.walkin.nameLatinPlaceholder")}', 'placeholder=""')], T1),
    cible("R49-8. G1e — le champ des invités perd son exemple", J, [('placeholder={t("venue.ui.walkin.guestsPlaceholder")}', 'placeholder=""')], T1),
    cible("R49-9. G1e — le champ de l'e-mail du contact perd son exemple", J,
          [('placeholder={t("venue.ui.walkin.emailPlaceholder")}\r\n                error={invalidIdentifiant.email',
            'placeholder=""\r\n                error={invalidIdentifiant.email')], T1),
    cible("R49-10. G1e — le champ du téléphone perd son exemple", J, [('placeholder={phoneText("placeholder")}', 'placeholder=""')], T1),
    # ── G1c — le téléphone
    cible("R49-11. G1c — le premier chiffre refusé n'est plus signalé sous le champ", PF,
          [('const rejected = value !== "" && !rule.leadingDigits.includes(value.charAt(0));', "const rejected = false;")], T1),
    cible("R49-12. G1c — le premier chiffre refusé n'est plus GARDÉ SEUL : la saisie suivante passe", PH,
          [("if (previousRejected && digits.length > previous.length && digits.startsWith(previous)) {",
            "if (false && previousRejected && digits.length > previous.length && digits.startsWith(previous)) {"),
           ('} else if (digits !== "" && !leadingOk(country, digits[0])) {', '} else if (false && digits !== "" && !leadingOk(country, digits[0])) {')], T1),
    cible("R49-13. G1c — le champ du téléphone accepte plus de neuf chiffres", PH,
          [("digits = digits.slice(0, country.nationalLength);", "digits = digits.slice(0, 99);")], T1),
    cible("R49-14. G1c — le champ du téléphone accepte les lettres", PH, [('let digits = raw.replace(/\\D/g, "");', "let digits = raw;")], T1),
    # ── G5a — chaque libellé pointe son champ
    cible("R49-15. G5a — le libellé ne pointe plus son champ (htmlFor)", J, [('<label className="wk-label" htmlFor={id}>', '<label className="wk-label" htmlFor="wk-x">')], T6),
    # ── G1h — les montants viennent du serveur
    cible("R49-16. G1h — le total affiché n'est plus celui du serveur", J,
          [("<strong>{formatDZD(quote.totalCents, QUOTE_AMOUNT_LOCALE)}</strong>", "<strong>{formatDZD(quote.totalCents + 100, QUOTE_AMOUNT_LOCALE)}</strong>")], T2),
    cible("R49-17. G1h — l'acompte affiché n'est plus celui du serveur", J,
          [("<strong>{formatDZD(quote.depositCents, QUOTE_AMOUNT_LOCALE)}</strong>", "<strong>{formatDZD(quote.depositCents + 100, QUOTE_AMOUNT_LOCALE)}</strong>")], T2),
    # ── G1i — le rail
    cible("R49-18. G1i — le rail ne ramène plus à l'étape cliquée", J,
          [("{ step: t(STEP_LABEL[s]) }) : undefined\r\n        }))}\r\n        onEdit={(id) => goTo(id as Step)}",
            "{ step: t(STEP_LABEL[s]) }) : undefined\r\n        }))}\r\n        onEdit={() => undefined}")], T2),
    # ── G1g / G5d — « Précédent »
    cible("R49-19. G1g — « Précédent » passe du côté de FIN de la ligne (ordre inversé)", CSS,
          [(".wk-actions {\r\n  display: flex;", ".wk-actions {\r\n  flex-direction: row-reverse;\r\n  display: flex;")], T2),
    cible("R49-20. G5d — la ligne des boutons ne se reflète plus en arabe (direction physique)", CSS,
          [(".wk-actions {\r\n  display: flex;", ".wk-actions {\r\n  direction: ltr;\r\n  display: flex;")], T6),
    # ── G1j / G1k — la fenêtre
    cible("R49-21. G1j — la fenêtre s'ouvre pendant que le serveur travaille", J, [("open={done !== null}", "open={done !== null || busy}")], T2),
    cible("R49-22. G1k — la fenêtre ne nomme plus le client", J, [("client: done.client", 'client: ""')], T2),
    cible("R49-23. G1k — la fenêtre ne porte plus la date", J, [("date: longDate(done.date, i18n.language),", 'date: "",')], T2),
    # ── G1l — « Nouveau devis »
    cible("R49-24. G1l — « Nouveau devis » redevient « Recommencer »", J,
          [('{conclu ? t("venue.ui.walkin.newQuote") : t("venue.ui.walkin.reset")}', '{t("venue.ui.walkin.reset")}')], T2),
    # ── G1m — la ligne écrite
    cible("R49-25. G1m — la ligne écrite ne porte plus le prénom saisi", CT,
          [("contactFirstName: contact.firstName.trim(),", "contactFirstName: contact.lastName.trim(),")], T2),
    # ── G2 — « Bloquer la date »
    cible("R49-26. G2 — « Bloquer la date » n'accepte plus la demande (elle reste en attente)", J,
          [("if (converted.bookingId !== null) await bookings.accept(converted.bookingId);", "if (converted.bookingId !== null) { /* mutation */ }")], T3),
    cible("R49-27. G2 — « Bloquer la date » annonce « enregistrée »", J,
          [('setDone({ kind: "locked", date: eventDate as string, client });', 'setDone({ kind: "standby", date: eventDate as string, client });')], T3),
    # ── G3 — un échec ne confirme rien
    cible("R49-28. G3 — l'erreur du serveur n'est plus dite", J,
          [("} catch (cause) {\r\n      setError(toMessageRef.current(cause));\r\n    } finally {\r\n      setBusy(false);",
            "} catch (cause) {\r\n      setError(null);\r\n    } finally {\r\n      setBusy(false);")], T4),
    cible("R49-29. G3 — un échec ouvre quand même la fenêtre de confirmation", J,
          [("} catch (cause) {\r\n      setError(toMessageRef.current(cause));\r\n    } finally {\r\n      setBusy(false);",
            '} catch (cause) {\r\n      setDone({ kind: "locked", date: "2026-01-01", client: "x" });\r\n      setError(toMessageRef.current(cause));\r\n    } finally {\r\n      setBusy(false);')], T4),
    # ── G4 — le calendrier
    cible("R49-30. G4 — un vendredi bloqué reprend la teinte du week-end (le statut ne l'emporte plus)", CSS,
          [(".cal-cell.is-weekend .cal-day.is-blocked { background: var(--cal-blocked); }", ".cal-cell.is-weekend .cal-day.is-blocked { background: var(--cal-weekend); }")], T5),
    cible("R49-31. G4 — le jour bloqué perd son hachurage", CSS,
          [("background-image: repeating-linear-gradient(135deg, transparent 0 5px, var(--cal-hatch) 5px 6px);", "background-image: none;")], T5),
    cible("R49-32. G4 — le week-end libre perd sa teinte propre", CSS,
          [(".cal-cell.is-weekend .cal-day.is-empty { background: var(--cal-weekend); }", ".cal-cell.is-weekend .cal-day.is-empty { background: var(--accent-soft); }")], T5),
    cible("R49-33. G4 — le week-end perd sa bordure en tirets", CSS,
          [(".cal-cell.is-weekend .cal-day { border-style: dashed; }", ".cal-cell.is-weekend .cal-day { border-style: solid; }")], T5),
    # ── G5 — l'arabe à 360 px
    cible("R49-34. G5a — la page arabe n'est plus déclarée de droite à gauche", I18N,
          [('document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";', 'document.documentElement.dir = "ltr";')], T6),
    cible("R49-35. G5b — la boîte du numéro n'est plus de gauche à droite", PF, [(': "input-affix phone-field"} dir="ltr">', ': "input-affix phone-field"}>')], T6),
    cible("R49-36. G5c — l'étape Contact déborde à 360 px", CSS,
          [(".wk-pair {\r\n  display: grid;", ".wk-pair {\r\n  min-inline-size: 460px;\r\n  display: grid;")], T6),
]


def _binaire(nom: str) -> str:
    """Résout l'exécutable AVANT `subprocess.run` (Windows : `pnpm.cmd`)."""
    return shutil.which(nom) or nom


def lancer(mesure: str) -> tuple[int, str]:
    cmd = MESURES[mesure]
    r = subprocess.run([_binaire(cmd[0]), *cmd[1:]], capture_output=True, text=True, encoding="utf-8", errors="replace")
    return r.returncode, ANSI.sub("", (r.stdout or "") + "\n" + (r.stderr or ""))


def lire_vitest(sortie: str, titre: str | None) -> tuple[str, str]:
    """Rend (verdict, détail). Verdicts : VERT, MORD, SANS-TITRE, PAS-ASSERTION, NON-DÉMARRÉE, VERSION."""
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
    # ⚠ DÉFAUT DE LECTEUR RÉPARÉ (D298), vu à la première passe : vitest REGROUPE sous un seul message les tests qui
    # échouent de la même façon — plusieurs en-têtes « FAIL … » d'affilée, PUIS l'erreur. La première version prenait
    # la ligne suivant l'en-tête du titre : c'était un autre en-tête, et elle déclarait « PAS-ASSERTION » une morsure.
    lignes = sortie.splitlines()
    premiere = "—"
    for i, l in enumerate(lignes):
        if l.strip().startswith("FAIL ") and titre in l:
            premiere = next((x.strip() for x in lignes[i + 1:] if x.strip() and not x.strip().startswith("FAIL ")), "—")
            break
    if not premiere.startswith("AssertionError"):
        return "PAS-ASSERTION", f"première ligne du bloc : {premiere[:140]}"
    return "MORD", f"passés {passes} · en échec {echecs} · {premiere[:140]}"


def lire_playwright(sortie: str, titre: str | None) -> tuple[str, str]:
    echecs = [l for l in sortie.splitlines() if re.match(r"^\s+x\s+\d+ \[chromium\]", l)]
    oks = [l for l in sortie.splitlines() if re.match(r"^\s+ok\s+\d+ \[chromium\]", l)]
    if not echecs and not oks:
        return "NON-DÉMARRÉE", "aucune ligne de test [chromium] (serveurs ? base ?)"
    if titre is None or not echecs:
        return ("VERT" if not echecs else "ROUGE"), f"ok {len(oks)} · x {len(echecs)}"
    if not any(titre in l for l in echecs):
        return "SANS-TITRE", f"x {len(echecs)}, aucun ne porte « {titre} »"
    # ⚠ DÉFAUT DE LECTEUR RÉPARÉ (D298, D312), vu à la campagne officielle : un `beforeAll` en échec (ici `ECONNREFUSED`,
    # l'API de développement redémarrait) marque le test « x … (0ms) » — son CORPS n'a jamais tourné, la mutation n'a
    # jamais été exercée. La première version le jugeait « PAS-ASSERTION », donc MUETTE : le faux négatif de D286, un
    # verdict sur une garde qui n'a pas été mesurée. C'est une mesure NON DÉMARRÉE, et le harnais refuse de juger.
    if any(titre in l and l.rstrip().endswith("(0ms)") for l in echecs):
        return "NON-DÉMARRÉE", "le test visé a échoué en 0 ms : son corps n'a pas tourné (crochet en échec)"
    bloc = re.search(rf"\d+\) \[chromium\] .*{re.escape(titre)}.*?\n(.*?)attachment #1", sortie, re.S)
    texte = bloc.group(1) if bloc else ""
    if "expect(" not in texte:
        return "PAS-ASSERTION", "le bloc d'erreur ne porte pas « expect( »"
    premiere = next((l.strip() for l in texte.splitlines() if l.strip().startswith("Error:")), "—")
    return "MORD", f"ok {len(oks)} · x {len(echecs)} · {premiere[:140]}"


def lire(mesure: str, sortie: str, titre: str | None) -> tuple[str, str]:
    return lire_playwright(sortie, titre) if MODE[mesure] == "e2e" else lire_vitest(sortie, titre)


# ── CALIBRATION DU LECTEUR, à chaque lancement : chaque bras doit rendre SON verdict, sinon ABANDON (D286). Les
# échantillons reproduisent des sorties RÉELLES, versées sous `docs/preuves/D316/` : le regroupement d'en-têtes
# (`neutralisation/forme-groupee-extrait.txt`), l'échec d'un matcher jest-dom (`neutralisation/campagne-r25-unit-extrait.txt`,
# R25-7), le bloc d'erreur de Playwright (`e2e/rouge-defaut1-extrait.txt`), le crochet en échec
# (`neutralisation/premiere-passe-officielle/R25-E2-extrait.txt`). ⚠ Le `TypeError` de `toMatch` sur `undefined` a été lu
# à la PREMIÈRE course rouge d'intégration, dont le journal a été ÉCRASÉ par la seconde (même nom) : sa forme — « × »,
# en-tête `FAIL`, première ligne `TypeError: …` — est celle du cas `CAS-PLANTAGE` versé par D304
# (`docs/preuves/D304/r1/signatures/sorties/tests.defaut.txt`).
_V = " RUN  v3.2.7 C:/x\n"
CALIBRATION = [
    ("vitest, en-têtes REGROUPÉS puis AssertionError", "vitest", _V
     + "   × d > 93 jour(s) : t 8ms\n   × d > 182 jour(s) : t 1ms\n"
       " FAIL  a.test.ts > d > 93 jour(s) : t\n FAIL  a.test.ts > d > 182 jour(s) : t\n"
       "AssertionError: expected false to be true // Object.is equality\n      Tests  7 failed | 9 passed (16)\n",
     "182 jour(s) : t", "MORD"),
    ("vitest, plantage (TypeError)", "vitest", _V
     + "   × d > t 219ms\n FAIL  a.test.ts > d > t\nTypeError: .toMatch() expects to receive a string, but got undefined\n"
       "      Tests  1 failed | 18 passed (19)\n", "t", "PAS-ASSERTION"),
    ("vitest, matcher jest-dom (Error, pas AssertionError)", "vitest", _V
     + "   × d > t 12ms\n FAIL  a.test.ts > d > t\nError: expect(element).toHaveAttribute(\"href\", \"/x\")\n"
       "      Tests  1 failed | 13 passed (14)\n", "t", "PAS-ASSERTION"),
    ("vitest, rien d'exécuté sous filtre", "vitest", _V + "      Tests  25 skipped (25)\n", "t", "NON-DÉMARRÉE"),
    ("vitest, autre version", "vitest", " RUN  v3.2.6 C:/x\n      Tests  1 failed (1)\n", "t", "VERSION"),
    ("playwright, assertion", "e2e",
     "  x  2 [chromium] › specs\\a.e2e.ts:1:1 › titre (1.0s)\n\n  1) [chromium] › specs\\a.e2e.ts:1:1 › titre \n\n"
     "    Error: message\n\n    Timed out 7000ms waiting for expect(locator).toHaveCount(expected)\n\n"
     "    attachment #1: screenshot\n", "titre", "MORD"),
    ("playwright, plantage sans expect(", "e2e",
     "  x  2 [chromium] › specs\\a.e2e.ts:1:1 › titre (1.0s)\n\n  1) [chromium] › specs\\a.e2e.ts:1:1 › titre \n\n"
     "    Error: page.goto: net::ERR_CONNECTION_REFUSED\n\n    attachment #1: screenshot\n", "titre", "PAS-ASSERTION"),
    ("playwright, rien d'exécuté", "e2e", "Error: Timed out waiting 180000ms from config.webServer.\n", "titre",
     "NON-DÉMARRÉE"),
    # Relevé sur `.neutralisation-journaux/r25/R25-E2.log`, campagne officielle du 27/09/2026 (versé : D316).
    ("playwright, crochet en échec (0 ms, did not run)", "e2e",
     "  x  2 [chromium] › specs\\a.e2e.ts:30:7 › titre (0ms)\n  -  3 [chromium] › specs\\a.e2e.ts:30:7 › autre\n\n"
     "  1) [chromium] › specs\\a.e2e.ts:30:7 › titre \n\n    Error: POST http://localhost:3101/api/v1/auth/register a échoué"
     " après 66 ms.\n      TypeError: fetch failed\n\n    attachment #1: trace\n  1 failed\n  1 did not run\n", "titre",
     "NON-DÉMARRÉE"),
    # Relevé sur `docs/preuves/D304/r1/signatures/sorties/crochet.defaut.txt` (vitest 3.2.7, crochet en échec).
    ("vitest, crochet en échec (bloc de FICHIER, 1 skipped)", "vitest", _V
     + " Test Files  1 failed (1)\n      Tests  1 skipped (1)\n FAIL  cas/crochet.cas.ts [ cas/crochet.cas.ts ]\n"
       "Error: crochet en panne\n", "t", "NON-DÉMARRÉE"),
]


def calibrer() -> bool:
    manques = 0
    for nom, genre, texte, titre, attendu in CALIBRATION:
        verdict, _ = lire_playwright(texte, titre) if genre == "e2e" else lire_vitest(texte, titre)
        manques += verdict != attendu
        print(f"  calibration {'✓' if verdict == attendu else '✗'} {nom} : {verdict} (attendu {attendu})")
    print(f"  calibration : {len(CALIBRATION)} bras · {manques} manqué(s) (attendu 0)")
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


def _poser(source: str, remplacements: list) -> tuple[str | None, str]:
    """Pose TOUS les remplacements d'une cible et prouve chacun : ancre 1 → 0 ET marqueur n → n + 1 (D286). Rend (contenu muté | None, détail)."""
    courant, preuves = source, []
    for avant, apres in remplacements:
        a1, m1 = courant.count(avant), courant.count(apres)
        if a1 != 1:
            return None, f"ERREUR DE SCRIPT : {a1} occurrence(s), 1 attendue pour « {avant[:60]} »"
        courant = courant.replace(avant, apres)
        a2, m2 = courant.count(avant), courant.count(apres)
        if (a2, m2) != (0, m1 + 1):
            return None, f"MUTATION NON POSÉE : ancre {a1}→{a2}, marqueur {m1}→{m2} (attendu 1→0 et {m1}→{m1 + 1})"
        preuves.append(f"ancre 1→0 · marqueur {m1}→{m2}")
    return courant, " ; ".join(preuves)


def verifier_arbre(moment: str) -> bool:
    """Chaque ancre est là, UNE fois, et aucune mutation ne traîne."""
    ecarts = []
    for c in CIBLES:
        src = io.open(c["fichier"], encoding="utf-8", newline="").read()
        for avant, _ in c["remplacements"]:
            if src.count(avant) != 1:
                ecarts.append(f"{c['libelle'].split('.')[0]} : ancre ×{src.count(avant)} dans {c['fichier']}")
    if ecarts:
        print(f"✗ ARBRE NON CONFORME {moment} : " + " ; ".join(sorted(set(ecarts))))
        return False
    return True


def main(argv: list[str]) -> int:
    modes = {"unit"} | ({"e2e"} if "--e2e" in argv else set())
    # --seulement=R49-11,R49-19 : ne joue que ces cibles (campagne reprise après une cible corrigée ; la reprise se DÉCLARE dans la pièce).
    seul = next((a.split("=", 1)[1].split(",") for a in argv if a.startswith("--seulement=")), None)
    restaurer_si_interrompu()
    if not calibrer():
        print("✗ ABANDON : le lecteur manque un bras de sa calibration — rien n'est mesuré.")
        return 2
    if not verifier_arbre("AU DÉPART"):
        return 2
    os.makedirs(JOURNAUX, exist_ok=True)

    jouees = [c for c in CIBLES if MODE[c["mesure"]] in modes and (seul is None or c["libelle"].split(".")[0] in seul)]
    horsjeu = [c for c in CIBLES if MODE[c["mesure"]] not in modes] if seul is None else []
    print(f"cibles : {len(CIBLES)} déclarées · {len(jouees)} jouées ({', '.join(sorted(modes))}) · {len(horsjeu)} hors exécution")

    # ── PRÉ-VOL : la mesure, SANS mutation, doit être verte et avoir DÉMARRÉ (au moins un test exécuté).
    for mesure in sorted({c["mesure"] for c in jouees}):
        code, sortie = lancer(mesure)
        verdict, detail = lire(mesure, sortie, None)
        if code != 0 or verdict != "VERT":
            print(f"✗ PRÉ-VOL {mesure} : code {code}, {verdict} — {detail}")
            print(sortie[-3000:])
            return 2
        print(f"  pré-vol {mesure} : code 0 · {detail}")

    mordu, muettes, erreurs = 0, [], []
    for cible in jouees:
        chemin = cible["fichier"]
        source = io.open(chemin, encoding="utf-8", newline="").read()
        mute, posee = _poser(source, cible["remplacements"])
        if mute is None:
            print(f"✗ {cible['libelle']}\n   {posee}")
            erreurs.append(cible["libelle"])
            break
        annuler = [{"chemin": chemin, "contenu": source}]
        _ecrire_manifeste(annuler)
        io.open(chemin, "w", encoding="utf-8", newline="").write(mute)
        try:
            code, sortie = lancer(cible["mesure"])
        finally:
            _defaire(annuler)
            shutil.rmtree(SAUVEGARDE, ignore_errors=True)
        # La sortie ENTIÈRE se journalise : un rouge qu'on ne peut plus relire se relance sans être lu (D270).
        ident = cible["libelle"].split(".")[0]
        io.open(os.path.join(JOURNAUX, f"{ident}.log"), "w", encoding="utf-8").write(sortie)
        verdict, detail = lire(cible["mesure"], sortie, cible["titre"])
        if verdict == "MORD" and code != 0:
            mordu += 1
            print(f"✓ {cible['libelle']}\n   {posee} · code {code} · {detail}")
        elif verdict in ("VERSION", "NON-DÉMARRÉE"):
            print(f"✗ {cible['libelle']}\n   MESURE NON DÉMARRÉE ou non jugeable : {verdict} — {detail}")
            erreurs.append(cible["libelle"])
            break
        else:
            muettes.append(cible["libelle"])
            print(f"✗ {cible['libelle']}\n   {posee} · code {code} · {verdict} — {detail}")

    for c in horsjeu:
        print(f"  NON MESURÉE : {c['libelle']} — mesure « {c['mesure']} », relancer avec --{MODE[c['mesure']]}")
    conforme = verifier_arbre("À L'ARRIVÉE")
    print(f"\n{mordu} garde(s) mordue(s) sur {len(jouees)} cible(s) jouée(s) · {len(horsjeu)} non mesurée(s) "
          f"(attendu : {len(jouees)} sur {len(jouees)})")
    if conforme:
        print("arbre rendu à son état de départ : vérifié.")
    if erreurs or not conforme:
        return 2
    if muettes:
        return 1
    return 3 if horsjeu else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
