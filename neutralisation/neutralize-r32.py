#!/usr/bin/env python3
"""Campagne de neutralisation — RANG 32 (D325) : les réparations de l'app Pro.

Ce que le lot ajoute, et que chaque cible neutralise (une garde neuve dont on n'a pas montré qu'elle mord est une assurance sans mesure) :
  · le MODÈLE DE PAYS et la règle de SAISIE du téléphone (`packages/types/src/phone.ts`) : chiffres seuls, au plus neuf, premier chiffre
    refusé GARDÉ SEUL puis saisie suivante bloquée, collage reconnu, valeur envoyée = `+213` + chiffres saisis (T-*) ;
  · le CONTACT du client (`packages/types/src/contact.ts`, `booking.ts`, `quote.ts`) : un nom sans chiffre, un e-mail par `.email()`, les
    mêmes règles à l'écran et au serveur (C-*, B-*) ;
  · les BLOCAGES du parcours « Nouvelle réservation » (`walkin-contact.ts`) et leur affichage (`walkin-journey.tsx`) : « Continuer » dit
    pourquoi il est grisé, la valeur envoyée est celle saisie, la fenêtre s'ouvre APRÈS la réponse du serveur, « Précédent », l'identifiant
    des champs (en arabe, quatre champs portaient le MÊME `id`), les exemples (W-*, N-*) ;
  · le CHAMP DE TÉLÉPHONE PARTAGÉ (`packages/ui/src/phone-field.tsx`) et le RAIL à libellé cliquable (`journey.tsx`) — du code PARTAGÉ : chaque
    cible fait rougir le côté CLIENT **et** le côté PRO, sinon l'un des deux ne mesure rien (P-*, R-*) ;
  · « Enregistrer » à l'étape 7 de l'assistant de salle : il dit TOUJOURS ce qu'il a fait (U-*) ;
  · le CALENDRIER du parcours : le statut l'emporte sur le week-end, week-end plus clair, jour bloqué hachuré (S-*) ;
  · les écrans qui ENVOIENT un téléphone : la valeur est convertie une fois, par `toE164` (Q-*).
  (Le point « minuit » est arrêté et rapporté : aucun code, aucune cible. Ce qui ne se mesure que dans un navigateur — espacement, ordre
  des boutons en arabe, fenêtre après la réponse réelle — est neutralisé À LA MAIN, sortie lue : `docs/preuves/D325/neutralisation-e2e/`.)

Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-r32.py
    R32_DECOUVERTE=1 python3 neutralisation/neutralize-r32.py     # n'écrit AUCUN verdict : liste les tests qui rougissent, par cible
Codes de sortie : 0 = tout joué, tout a mordu ; 1 = au moins une garde MUETTE ; 2 = pré-vol rouge, ERREUR DE SCRIPT, vitest non attendu,
calibration manquée, ou arbre non conforme.

⛔ UNE MORSURE SE LIT, ELLE NE SE DÉDUIT PAS D'UN CODE DE SORTIE (D304, D305, D312, D316) : la ligne « Tests » compte au moins un test en
échec (exécutés = passés + en échec) ; le titre attendu porte « × » ; la PREMIÈRE ligne de son bloc « FAIL … > titre » — en-têtes regroupés
sautés — est une `AssertionError`. ⚠ Ce lot n'est pas du chemin de l'argent : la lecture n'y est pas EXIGÉE ; elle y est appliquée parce
qu'un code de sortie seul ne prouve rien (patron de `neutralize-r30.py`). ⛔ La RÈGLE DES MONTANTS (décision 2 du relecteur) s'applique aux
cibles Q-* et N-3 : elles mutent ce que l'écran ENVOIE comme valeur saisie, jamais un montant calculé par le serveur.
⛔ VITEST 3.2.7 : la lecture est calibrée sur SA sortie ; toute autre version ⇒ refus de juger.
⛔ LA MUTATION SE PROUVE POSÉE (D286) : ancre 1 → 0 ET marqueur n → n + 1 pour une SUBSTITUTION ; ancre 1 → 1 ET marqueur n → n + 1 pour une INSERTION
(N-4 seule : son remplacement contient l'ancre). ⚠ Le remplacement d'une substitution ne doit jamais être une SOUS-CHAÎNE de l'ancre (W-6, S-6 : « marqueur 1→1 »).
⛔ UNE MUTATION ÉQUIVALENTE SE RETIRE PAR ÉCRIT, avec sa mesure : T-5 (première branche) et Q-5, Q-7, Q-8, Q-10 — commentaires à leur place, plus bas.
⛔ UNE GARDE QUI NE ROUGIT QUE PAR UN MATCHER jest-dom OU UNE REQUÊTE Testing Library N'EST PAS LUE COMME UNE MORSURE (D304, D316) : la découverte en a relevé
neuf (P-2, P-3, P-4, P-6, N-11, N-12, U-2, Q-2, Q-3) ; chacune a reçu une assertion NATIVE dans le test, et le client a reçu `aria-invalid` (P-4 ne rougissait que le Pro).
⛔ SURVIVRE À UN SIGNAL : sauvegarde sur DISQUE avant toute mutation, restaurée au démarrage suivant.
⛔ UNE CIBLE PARTAGÉE SE VÉRIFIE DANS TOUS SES CONSOMMATEURS : une cible à plusieurs mesures n'est « mordue » que si CHACUNE mord.
⛔ LES TITRES ATTENDUS SE RELÈVENT, ILS NE S'ÉCRIVENT PAS DE MÉMOIRE : `R32_DECOUVERTE=1` liste, par cible, ce qui rougit.

POURQUOI IL EXISTE : CLAUDE.md, « une garde qui ne mord pas n'est pas une garde ». Lecteur, calibration et boucle : repris de `neutralize-r30.py`.
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

SAUVEGARDE = ".neutralisation-r32"
MANIFESTE = os.path.join(SAUVEGARDE, "manifeste.json")
JOURNAUX = os.path.join(".neutralisation-journaux", "r32")  # ignoré par git ; ce qu'une décision cite se COPIE (D291)
ANSI = re.compile(r"\x1b\[[0-9;]*m")
VITEST_ATTENDU = "v3.2.7"
DECOUVERTE = os.environ.get("R32_DECOUVERTE") == "1"
# `R32_FILTRE="P-,N-"` ne joue que les cibles dont l'identifiant commence par l'un de ces préfixes — POUR LA DÉCOUVERTE SEULEMENT : une campagne filtrée n'est
# pas une campagne verte, et le harnais refuse de rendre un verdict (code 2) tant que le filtre est posé hors découverte.
FILTRE = [p for p in os.environ.get("R32_FILTRE", "").split(",") if p]

PHONE = "packages/types/src/phone.ts"
CONTACT = "packages/types/src/contact.ts"
BOOKING = "packages/types/src/booking.ts"
QUOTE = "packages/types/src/quote.ts"
CHAMP = "packages/ui/src/phone-field.tsx"
RAIL = "packages/ui/src/journey.tsx"
WK_CONTACT = "apps/pro/src/dashboard/walkin-contact.ts"
WK = "apps/pro/src/dashboard/walkin-journey.tsx"
EDITION = "apps/pro/src/venues/edit-venue-page.tsx"
THEME = "apps/pro/src/theme.css"
CL_BOOKING = "apps/client/src/components/venue/booking-request-panel.tsx"
CL_VISIT = "apps/client/src/components/venue/visit-booking-panel.tsx"
CL_ACCOUNT = "apps/client/src/components/account/account-settings-view.tsx"
PRO_ACCOUNT = "apps/pro/src/account/account-settings-page.tsx"


def _vitest(paquet: str, fichier: str) -> list[str]:
    return ["pnpm", "--filter", paquet, "exec", "vitest", "run", fichier]


MESURES = {
    "types-phone": _vitest("@zwadj/api", "src/common/phone.spec.ts"),
    "types-contact": _vitest("@zwadj/api", "src/common/contact.spec.ts"),
    "api-bookings": _vitest("@zwadj/api", "src/venues/bookings.schemas.spec.ts"),
    "pro-contact": _vitest("@zwadj/pro", "src/dashboard/walkin-contact.test.ts"),
    "pro-journey": _vitest("@zwadj/pro", "src/dashboard/walkin-journey.test.tsx"),
    "pro-champ": _vitest("@zwadj/pro", "src/ui-phone-field.test.tsx"),
    "client-champ": _vitest("@zwadj/client", "src/components/ui-phone-field.test.tsx"),
    "pro-edit": _vitest("@zwadj/pro", "src/venues/edit-venue-save.test.tsx"),
    "pro-css": _vitest("@zwadj/pro", "src/venues/calendar-style.test.ts"),
    "pro-account": _vitest("@zwadj/pro", "src/account/account-settings-page.test.tsx"),
    "client-booking": _vitest("@zwadj/client", "src/components/venue/booking-request-panel.test.tsx"),
    "client-visit": _vitest("@zwadj/client", "src/components/venue/visit-booking-panel.test.tsx"),
    "client-account": _vitest("@zwadj/client", "src/components/account/account-settings-view.test.tsx"),
    "client-wizard": _vitest("@zwadj/client", "src/components/filter-wizard.test.tsx"),
    "client-garde": _vitest("@zwadj/client", "src/lib/phone-literal-guard.test.ts"),
}

CIBLES: list[dict] = []


def cible(libelle: str, fichier: str, avant: str, apres: str, mesures: dict[str, str], genre: str = "substitution") -> None:
    """`mesures` : {nom de mesure → sous-chaîne du titre du test qui doit rougir}. Chaque mesure doit mordre.
    `genre` (D286 — chaque genre a SON arithmétique, une seule formule pour tous accuse à tort) : « substitution » = ancre 1→0 ET marqueur n→n+1 ;
    « insertion » = le remplacement CONTIENT l'ancre, qui doit donc SURVIVRE (1→1) tandis que le marqueur passe de n à n+1."""
    CIBLES.append({"libelle": libelle, "fichier": fichier, "avant": avant, "apres": apres, "mesures": mesures, "genre": genre})


A_DECOUVRIR = "?"

# ── T — le modèle de pays et la règle de saisie du téléphone (`phone.ts`).
cible("T-1. la saisie n'est reconnue en COLLAGE que si plusieurs chiffres arrivent d'un coup : ici la règle est INVERSÉE",
      PHONE, "if (multiple) digits = stripPhonePrefixes(country, digits);", "if (!multiple) digits = stripPhonePrefixes(country, digits);",
      {"types-phone": '« 0555123456 » (avec le zéro) devient les neuf chiffres nationaux'})
cible("T-2. le champ accepte UN chiffre de trop (dix au lieu de neuf)",
      PHONE, "digits = digits.slice(0, country.nationalLength);", "digits = digits.slice(0, country.nationalLength + 1);",
      {"types-phone": 'AU PLUS neuf chiffres : le dixième est écarté'})
cible("T-3. les lettres passent dans le champ (plus de « chiffres seuls »)",
      PHONE, r'let digits = raw.replace(/\D/g, "");', "let digits = raw;", {"types-phone": 'SEULS LES CHIFFRES passent : lettres, symboles et espaces tapés sont écartés'})
cible("T-4. tout premier chiffre est admis (la règle 5, 6 ou 7 disparaît de la saisie)",
      PHONE, "digit !== undefined && country.leadingDigits.includes(digit);", "digit !== undefined;", {"types-phone": "UN PREMIER CHIFFRE REFUSÉ reste affiché, SEUL, avec son drapeau d'erreur"})
# ⚠ T-5 — CIBLE RÉORIENTÉE PAR ÉCRIT (D286, « une cible devenue sans objet se réoriente ou se retire »). La première version neutralisait la branche
# `if (previousRejected && …) digits = previous` : MESURÉ, 55 tests passés, 0 en échec — une MUTATION ÉQUIVALENTE. Tant que l'état précédent vient de
# `applyPhoneInput` lui-même, un premier chiffre refusé est TOUJOURS seul (un chiffre) ; la branche suivante (`else if` : `digits.slice(0, 1)`) rend alors
# exactement le même résultat. Aucune assertion ne peut la distinguer, et une cible qui ne peut pas rougir est muette par construction. Elle est donc
# reportée sur la branche qui PORTE la règle (le premier chiffre refusé ramené à lui seul), que le collage « 0123456789 » exerce ; la branche redondante
# reste dans le code, qui la dit (point 4 de la docstring), et son équivalence est écrite ICI, avec sa mesure.
cible("T-5. un premier chiffre refusé n'est plus ramené à lui SEUL : le collage « 0123456789 » garde ses neuf chiffres",
      PHONE, 'else if (digits !== "" && !leadingOk(country, digits[0])) {', "else if (false) {", {"types-phone": 'un collage dont le numéro national commence mal reste refusé'})
cible("T-6. la valeur ENVOYÉE n'a plus d'indicatif : les chiffres nationaux partent seuls",
      PHONE, r'return digits === "" ? "" : `${PHONE_COUNTRIES[id].dialCode}${digits}`;', "return digits;", {"types-phone": "le format envoyé à l'API est celui que le contrat attend"})
cible("T-7. un numéro est « complet » sans que son premier chiffre soit contrôlé",
      PHONE, r"return new RegExp(`^[${country.leadingDigits}]\\d{${country.nationalLength - 1}}$`);",
      r"return new RegExp(`^\\d{${country.nationalLength}}$`);", {"types-phone": 'préfixe 4 : aucun opérateur mobile'})
cible("T-8. un collage n'est JAMAIS reconnu : « +213 555… » reste tel quel",
      PHONE, 'const multiple = digits.length - previous.length > 1 || (previous === "" && digits.length > 1);', "const multiple = false;",
      {"types-phone": "préfixe composé à l'ancienne"})

# ── C, B — le contact : une règle, à l'écran ET au serveur.
NOM = r"export const PERSON_NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M} '’-]*$/u;"
cible("C-1. un nom accepte les CHIFFRES", CONTACT, NOM, r"export const PERSON_NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}\d '’-]*$/u;",
      {"types-contact": '« Amine1 » — un chiffre à la fin'})
cible("C-2. un nom peut COMMENCER par un tiret ou une apostrophe", CONTACT, NOM, r"export const PERSON_NAME_PATTERN = /^[\p{L}\p{M} '’-]*$/u;",
      {"types-contact": '« -Jean » — commence par un tiret'})
cible("C-3. un nom perd ses marques combinantes : voyelles brèves de l'arabe, accent décomposé",
      CONTACT, NOM, r"export const PERSON_NAME_PATTERN = /^[\p{L}][\p{L} '’-]*$/u;", {"types-contact": '(lettre + marque combinante)'})
cible("C-4. le schéma d'un nom ne regarde plus son motif",
      CONTACT, '.refine((valeur) => valeur === "" || PERSON_NAME_PATTERN.test(valeur), messages.invalid);', ".refine(() => true, messages.invalid);",
      {"types-contact": "jugent TOUS les noms comme l'écran"})
cible("C-5. un nom VIDE est accepté", CONTACT, ".min(1, messages.required)", ".min(0, messages.required)", {"types-contact": 'un champ simplement VIDE dit « obligatoire » seul'})
cible("C-6. le plafond du nom saute (80 → 1080)", CONTACT, ".max(PERSON_NAME_MAX, messages.tooLong)", ".max(PERSON_NAME_MAX + 1000, messages.tooLong)",
      {"types-contact": "le plafond reste celui des deux routes d'avant"})
cible("C-7. l'e-mail n'est plus contrôlé par `.email()`", CONTACT, ".email(messages.invalid)", ".min(0, messages.invalid)", {"types-contact": "`contactEmailSchema` : la fabrique rend la règle avec LES messages de l'appelant"})
cible("B-1. la route de réservation reprend sa règle de nom LÂCHE (« non vide » tient lieu de « valide »)",
      BOOKING, "contactFirstName: contactNameSchema,", "contactFirstName: z.string().trim().min(1),", {"types-contact": "jugent TOUS les noms comme l'écran"})
cible("B-2. la route du devis reprend sa règle de nom LÂCHE", QUOTE, "contactFirstName: contactName,", "contactFirstName: z.string().trim().min(1),",
      {"types-contact": "jugent TOUS les noms comme l'écran"})
cible("B-3. la route du devis n'applique plus la règle d'e-mail du contrat",
      QUOTE, 'contactEmail: contactEmailSchema({ invalid: "quote.validation.emailInvalid" }).optional(),', "contactEmail: z.string().trim().optional(),",
      {"types-contact": 'rendent le MÊME verdict'})

# ── W — les blocages du parcours, en fonctions PURES.
cible("W-1. le premier chiffre refusé ne retient plus « Continuer »", WK_CONTACT,
      'else if (phoneLeadingRejected(contact.phone, country)) out.push("needPhoneLeading");', 'else if (false) out.push("needPhoneLeading");',
      {"pro-contact": 'le téléphone : vide ≠ premier chiffre refusé ≠ incomplet'})
cible("W-2. un numéro INCOMPLET ne retient plus « Continuer »", WK_CONTACT,
      'else if (!isPhoneComplete(country, contact.phone)) out.push("needPhoneIncomplete");', 'else if (false) out.push("needPhoneIncomplete");',
      {"pro-contact": 'le téléphone : vide ≠ premier chiffre refusé ≠ incomplet'})
cible("W-3. un e-mail invalide ne retient plus « Continuer »", WK_CONTACT,
      'if (contact.email.trim() !== "" && !isValidContactEmail(contact.email)) out.push("needEmailValid");', 'if (false) out.push("needEmailValid");',
      {"pro-contact": "l'e-mail SAISI doit passer la règle du contrat"})
cible("W-4. le nombre d'invités ne retient plus l'étape Client", WK_CONTACT,
      'if (!(Number(guests) > 0)) out.push("needGuests");', 'if (false) out.push("needGuests");', {"pro-contact": 'un seul manque'})
cible("W-5. ⚠ RÈGLE DES MONTANTS — le téléphone ENVOYÉ n'a plus son indicatif", WK_CONTACT,
      "contactPhone: toE164(country, contact.phone),", "contactPhone: contact.phone,", {"pro-contact": "noms rognés, téléphone = l'indicatif du modèle + les chiffres saisis"})
# ⚠ W-6 — le remplacement ne doit PAS être une sous-chaîne de l'ancre : sa première version (`contactEmail: contact.email.trim()`) l'était, et la
# preuve « marqueur n → n + 1 » (D286) ne pouvait pas se poser (« marqueur 1→1 » à la découverte).
cible("W-6. un e-mail VIDE part quand même (la clé n'est plus omise : `.email()` refuserait la chaîne vide)", WK_CONTACT,
      '...(contact.email.trim() === "" ? {} : { contactEmail: contact.email.trim() })', 'contactEmail: contact.email.trim() || ""',
      {"pro-contact": "noms rognés, téléphone = l'indicatif du modèle + les chiffres saisis"})
cible("W-7. les noms ENVOYÉS ne sont plus rognés", WK_CONTACT, "contactFirstName: contact.firstName.trim(),", "contactFirstName: contact.firstName,",
      {"pro-contact": "noms rognés, téléphone = l'indicatif du modèle + les chiffres saisis"})

# ── P — le champ de téléphone PARTAGÉ : client ET pro.
cible("P-1. le champ ne passe plus par la règle de saisie : il remonte ce que le navigateur lui donne",
      CHAMP, "onChange={(event) => onChange(applyPhoneInput(country, value, event.target.value).digits)}", "onChange={(event) => onChange(event.target.value)}", {"pro-champ": 'seuls les chiffres passent, et au plus la longueur du modèle', "client-champ": 'seuls les chiffres passent, au plus la longueur du modèle'})
cible("P-2. la boîte n'est plus LTR : en arabe le drapeau passerait à droite des chiffres",
      CHAMP, '<div className={rejected || invalid ? "input-affix phone-field is-invalid" : "input-affix phone-field"} dir="ltr">',
      '<div className={rejected || invalid ? "input-affix phone-field is-invalid" : "input-affix phone-field"}>', {"pro-champ": 'la boîte est LTR même dans une page arabe', "client-champ": 'la boîte reste LTR en arabe'})
cible("P-3. le message du premier chiffre n'est plus une ALERTE", CHAMP, '<p id={messageId} className="field-error" role="alert">',
      '<p id={messageId} className="field-error" role="note">', {"pro-champ": 'UN PREMIER CHIFFRE REFUSÉ : il reste, SEUL', "client-champ": 'un premier chiffre refusé : seul, avec son message dans la langue de la page'})
cible("P-4. le champ ne se déclare plus invalide", CHAMP, "aria-invalid={rejected || invalid ? true : undefined}", "aria-invalid={undefined}", {"pro-champ": 'UN PREMIER CHIFFRE REFUSÉ : il reste, SEUL', "client-champ": 'un premier chiffre refusé : seul, avec son message dans la langue de la page'})
cible("P-5. le premier chiffre n'est plus jamais refusé par le champ", CHAMP,
      'const rejected = value !== "" && !rule.leadingDigits.includes(value.charAt(0));', "const rejected = false;", {"pro-champ": "le message du premier chiffre est LIÉ au champ pour un lecteur d'écran", "client-champ": 'un premier chiffre refusé : seul, avec son message dans la langue de la page'})
cible("P-6. le nom accessible du drapeau perd l'indicatif", CHAMP, "aria-label={`${countryName}, ${rule.dialCode}`}", "aria-label={countryName}", {"pro-champ": "le drapeau et l'indicatif portent le nom accessible du pays", "client-champ": "l'indicatif du modèle est affiché devant, nommé avec le pays"})

# ── R — le rail : un libellé d'étape cliquable.
cible("R-1. le rail ne réagit plus au clic : le bouton existe, il ne fait rien", RAIL,
      '<button type="button" className="zj-rail-step" aria-label={step.editLabel} onClick={() => onEdit(step.id)}>',
      '<button type="button" className="zj-rail-step" aria-label={step.editLabel}>',
      {"pro-journey": "le LIBELLÉ d'une étape répondue ramène à elle", "client-wizard": "cliquer le LIBELLÉ d'une étape répondue vaut « Modifier »"})

# ── N — le parcours « Nouvelle réservation ».
cible("N-1. « Continuer » ne dit plus POURQUOI il est grisé : la liste des raisons est vide", WK,
      "const blockers = clientBlockers(contact, guests);", "const blockers: Blocker[] = [];", {"pro-journey": 'UN SEUL manque'})
cible("N-2. la liste des raisons n'est plus LIÉE au bouton (`aria-describedby`)", WK,
      'aria-describedby={clientAnswered ? undefined : "wk-continue-reason"}', "aria-describedby={undefined}", {"pro-journey": 'UN SEUL manque'})
cible("N-3. ⚠ RÈGLE DES MONTANTS — la conversion du devis envoie le téléphone SANS indicatif", WK,
      "...contactPayload(contact),", "contactFirstName: contact.firstName, contactLastName: contact.lastName, contactPhone: contact.phone,",
      {"pro-journey": "LE FORMAT ENVOYÉ À L'API n'a pas changé"})
cible("N-4. la fenêtre de confirmation s'ouvre AVANT la réponse du serveur", WK,
      "const converted = await quotes.convert(quote.id, {",
      'setDone({ kind: "standby", date: eventDate as string, client: "" }); const converted = await quotes.convert(quote.id, {', {"pro-journey": "la fenêtre ne s'ouvre PAS avant la réponse du serveur"},
      genre="insertion")
cible("N-5. « Précédent » reste proposé une fois l'affaire conclue", WK, "previousStep === undefined || conclu ? null : (",
      "previousStep === undefined ? null : (", {"pro-journey": "une fois l'affaire conclue, « Précédent » disparaît"})
cible("N-6. « Précédent » mène à l'étape SUIVANTE", WK, "const previousStep = stepIndex > 0 ? STEPS[stepIndex - 1] : undefined;",
      "const previousStep = stepIndex > 0 ? STEPS[stepIndex + 1] : undefined;", {"pro-journey": 'absent à la première étape ; présent aux suivantes'})
cible("N-7. la fenêtre de confirmation ne se ferme plus", WK, "onClose={() => setDone(null)}", "onClose={() => undefined}", {"pro-journey": 'la fenêtre se ferme par son bouton'})
cible("N-8. ⛔ LE DÉFAUT RESTAURÉ — l'identifiant d'un champ ne garde que les lettres LATINES du libellé : en arabe, quatre champs, un seul `id`", WK,
      "const id = `wk-${useId()}`;", 'const id = `wk-${label.replace(/[^a-zA-Z]/g, "")}`;', {"pro-journey": 'chaque libellé pointe son PROPRE champ'})
cible("N-9. l'exemple du prénom disparaît", WK, 'placeholder={t("venue.ui.walkin.firstNamePlaceholder")}', "placeholder={undefined}",
      {"pro-journey": 'chaque champ porte son exemple, ET son libellé visible reste là, lié'})
cible("N-10. l'exemple du téléphone disparaît", WK, 'placeholder={phoneText("placeholder")}', "placeholder={undefined}", {"pro-journey": 'chaque champ porte son exemple, ET son libellé visible reste là, lié'})
cible("N-11. l'erreur d'un champ n'est plus une alerte", WK, '<p id={errorId} className="wk-field-error field-error" role="alert">',
      '<p id={errorId} className="wk-field-error field-error" role="note">', {"pro-journey": 'un chiffre ou un symbole est refusé, sous le champ'})
cible("N-12. le libellé d'un champ n'est plus LIÉ à son champ", WK, '<label className="wk-label" htmlFor={id}>', '<label className="wk-label">',
      {"pro-journey": 'chaque libellé du formulaire porte `for`'})

# ── U — « Enregistrer » à l'étape 7.
cible("U-1. ⛔ UN DIFF VIDE DIT « ENREGISTRÉ » alors qu'aucune requête n'est partie", EDITION,
      'setNotice(t("venue.ui.form.nothingToSave"));', 'setNotice(t("venue.ui.form.saved"));', {"pro-edit": "U-c : le message d'un diff vide ne dit PAS « enregistré »"})
cible("U-2. un champ fautif d'une autre étape ne dit plus rien : « Enregistrer » se tait", EDITION,
      'setFormError(t("venue.ui.wizard.step1Invalid"));', "setFormError(null);", {"pro-edit": "U-b : un champ fautif d'une AUTRE étape"})

# ── S — le calendrier du parcours.
cible("S-1. le week-end reprend l'ancienne teinte, plus FONCÉE (clair)", THEME, "--cal-weekend: #f9f8f7;", "--cal-weekend: #f1efee;", {"pro-css": 'clair : `--cal-weekend` est plus clair que `--accent-soft`'})
cible("S-2. le week-end n'est plus plus clair que l'ancien fond (sombre)", THEME, "--dark-cal-weekend: #2a2625;", "--dark-cal-weekend: #24201f;",
      {"pro-css": 'sombre : `--dark-cal-weekend` est plus clair que `--dark-pro-accent-soft`'})
cible("S-3. un jour RÉSERVÉ de week-end reprend la teinte du week-end", THEME,
      ".cal-cell.is-weekend .cal-day.is-booked { background: var(--cal-booked); }", ".cal-cell.is-weekend .cal-day.is-booked { background: var(--cal-weekend); }",
      {"pro-css": 'un jour « booked » un vendredi ou un samedi'})
cible("S-4. un jour DEMANDÉ de week-end reprend la teinte du week-end", THEME,
      ".cal-cell.is-weekend .cal-day.is-requested { background: var(--cal-requested); }",
      ".cal-cell.is-weekend .cal-day.is-requested { background: var(--cal-weekend); }", {"pro-css": 'un jour « requested » un vendredi ou un samedi'})
cible("S-5. un jour BLOQUÉ de week-end reprend la teinte du week-end", THEME,
      ".cal-cell.is-weekend .cal-day.is-blocked { background: var(--cal-blocked); }", ".cal-cell.is-weekend .cal-day.is-blocked { background: var(--cal-weekend); }",
      {"pro-css": 'un jour « blocked » un vendredi ou un samedi'})
# ⚠ S-6 — le remplacement ne doit PAS être une sous-chaîne de l'ancre (même défaut que W-6, relevé à la découverte : « marqueur 1→1 »).
cible("S-6. le jour bloqué n'est plus HACHURÉ (plus aucun dégradé)", THEME,
      "repeating-linear-gradient(135deg, transparent 0 5px, var(--cal-hatch) 5px 6px);", "none;", {"pro-css": 'un hachurage en diagonale sur le jour bloqué'})
cible("S-7. le trait du hachurage devient presque OPAQUE (clair) : le chiffre du jour n'est plus lisible", THEME,
      "--cal-hatch: rgba(24, 24, 27, 0.2);", "--cal-hatch: rgba(24, 24, 27, 0.9);", {"pro-css": 'clair · fond « available »'})
cible("S-8. le trait du hachurage devient presque OPAQUE (sombre)", THEME, "--dark-cal-hatch: rgba(240, 240, 240, 0.22);",
      "--dark-cal-hatch: rgba(240, 240, 240, 0.9);", {"pro-css": 'sombre · fond « available »'})
cible("S-9. le week-end perd sa bordure en TIRETS (le signe qui ne dépend pas de la couleur)", THEME,
      ".cal-cell.is-weekend .cal-day { border-style: dashed; }", ".cal-cell.is-weekend .cal-day { border-style: solid; }", {"pro-css": 'le week-end reste DISTINGUABLE sans la couleur'})
cible("S-10. ⛔ UN JETON ABSENT D'UN THÈME : en sombre, `--cal-hatch` ne vient plus de `--dark-cal-hatch` (D129)", THEME,
      "--cal-hatch: var(--dark-cal-hatch);", "--cal-hatch: inherit;", {"pro-css": 'le jeton `--cal-hatch` existe dans les DEUX thèmes'})

# ── Q — les écrans qui ENVOIENT un téléphone : la valeur est convertie UNE fois, par `toE164`.
cible("Q-1. ⚠ RÈGLE DES MONTANTS — la demande du client part avec un téléphone SANS indicatif", CL_BOOKING,
      "contactPhone: toE164(DEFAULT_PHONE_COUNTRY, phone),", "contactPhone: phone,", {"client-booking": "LE FORMAT ENVOYÉ N'A PAS CHANGÉ"})
cible("Q-2. la demande du client s'envoie avec un numéro INCOMPLET", CL_BOOKING, "isPhoneComplete(DEFAULT_PHONE_COUNTRY, phone);",
      'phone !== "";', {"client-booking": 'un numéro INCOMPLET laisse « Envoyer » inerte'})
cible("Q-3. le rendez-vous de visite se confirme avec un numéro INCOMPLET", CL_VISIT,
      'const phoneIncomplete = phone !== "" && !isPhoneComplete(DEFAULT_PHONE_COUNTRY, phone);', "const phoneIncomplete = false;", {"client-visit": 'un numéro COMMENCÉ doit être complet'})
cible("Q-4. le rendez-vous de visite envoie le téléphone SANS indicatif", CL_VISIT,
      '...(phone === "" ? {} : { phone: toE164(DEFAULT_PHONE_COUNTRY, phone) })', '...(phone === "" ? {} : { phone })', {"client-visit": "LE FORMAT ENVOYÉ N'A PAS CHANGÉ"})
# ⚠ Q-5, Q-7, Q-8 ET Q-10 — QUATRE CIBLES RETIRÉES PAR ÉCRIT (D286 : « une cible devenue sans objet se réoriente ou se retire »). Elles neutralisaient `toE164` à
# l'ENVOI de l'inscription du client (`register-form.tsx`), de l'enregistrement du compte client (`account-settings-view.tsx`), de l'enregistrement du compte pro
# (`account-settings-page.tsx`, premier numéro) et de l'inscription du pro (`register-page.tsx`). MESURÉ à la découverte : 5, 10, 31 et 18 tests passés, 0 en échec —
# des MUTATIONS ÉQUIVALENTES. Cause LUE dans le code, pas supposée : à ces quatre sites le numéro traverse `validate(<schéma partagé>, …)` AVANT l'envoi, et
# `dzPhoneSchema` (`packages/types/src/auth.ts`, `.transform` → `normalizeDzPhone`) le re-canonise : « 551223344 » devient « +213551223344 » avec ou sans `toE164`.
# La forme envoyée y est donc garantie par le CONTRAT, que `apps/api/src/common/phone.spec.ts` mesure (T-6, T-7, T-8 ci-dessus) ; `toE164` y est une
# conversion redondante, laissée en place (aucun refactoring dans ce lot) et DITE ici. Les sites qui construisent leur corps SANS schéma — la demande de réservation,
# la visite, le parcours « Nouvelle réservation » — ne sont pas dans ce cas : Q-1, Q-4 et N-3 y mordent.
cible("Q-6. le compte client n'affiche plus les chiffres NATIONAUX d'un numéro enregistré", CL_ACCOUNT,
      "phone: nationalDigitsOf(DEFAULT_PHONE_COUNTRY, user?.phone)", 'phone: user?.phone ?? ""', {"client-account": "un numéro enregistré s'affiche en chiffres NATIONAUX"})
cible("Q-9. le compte pro n'affiche plus les chiffres NATIONAUX d'un numéro enregistré", PRO_ACCOUNT,
      "phone: nationalDigitsOf(DEFAULT_PHONE_COUNTRY, user?.proProfile?.phone),", 'phone: user?.proProfile?.phone ?? "",', {"pro-account": "les numéros enregistrés s'affichent en chiffres NATIONAUX"})


# ── L — LA GARDE DE SOURCE « jamais `+213` en dur dans un composant » (`apps/client/src/lib/phone-literal-guard.test.ts`). Une garde neuve se neutralise : un indicatif posé dans un littéral
# INOFFENSIF de chacune des trois zones qu'elle lit — `@zwadj/ui` (une chaîne), le Pro (un texte JSX), le Client (un attribut JSX) — doit la faire rougir. Le bras négatif (un commentaire n'est pas vu)
# est calibré dans la garde elle-même (« CALIBRATION, bras négatif »).
cible("L-1. un indicatif ÉCRIT EN DUR dans une chaîne de `@zwadj/ui` (le champ partagé lui-même)", CHAMP, 'autoComplete = "tel-national"', 'autoComplete = "+213"',
      {"client-garde": "AUCUNE source de l'application Client, de l'application Pro ni de `@zwadj/ui` n'écrit un indicatif en dur"})
cible("L-2. un indicatif ÉCRIT EN DUR dans le texte JSX du Pro", WK, '<h1 className="wk-title">{t("venue.ui.walkin.title")}</h1>', '<h1 className="wk-title">+213</h1>',
      {"client-garde": "AUCUNE source de l'application Client, de l'application Pro ni de `@zwadj/ui` n'écrit un indicatif en dur"})
cible("L-3. un indicatif ÉCRIT EN DUR dans un attribut JSX du Client", CL_BOOKING, 'autoComplete="given-name"', 'autoComplete="+213"', {"client-garde": "AUCUNE source de l'application Client, de l'application Pro ni de `@zwadj/ui` n'écrit un indicatif en dur"})


def _binaire(nom: str) -> str:
    """Résout l'exécutable AVANT `subprocess.run` (Windows : `pnpm.cmd`)."""
    return shutil.which(nom) or nom


def lancer(mesure: str) -> tuple[int, str]:
    cmd = MESURES[mesure]
    r = subprocess.run([_binaire(cmd[0]), *cmd[1:]], capture_output=True, text=True, encoding="utf-8", errors="replace")
    return r.returncode, ANSI.sub("", (r.stdout or "") + "\n" + (r.stderr or ""))


def lire_vitest(sortie: str, titre: str | None) -> tuple[str, str]:
    """Rend (verdict, détail). Verdicts : VERT, ROUGE, MORD, SANS-TITRE, PAS-ASSERTION, NON-DÉMARRÉE, VERSION.
    Copie du lecteur de `neutralize-r30.py` (calibré par D316) — mêmes verdicts, mêmes bras de calibration ci-dessous."""
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


# ── CALIBRATION DU LECTEUR, à chaque lancement (D286) — les bras vitest de `neutralize-r30.py`, formes réelles versées
# sous `docs/preuves/D316/` et `docs/preuves/D304/`.
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
    ("matcher jest-dom (Error, pas AssertionError)", _V
     + "   × d > t 12ms\n FAIL  a.test.ts > d > t\nError: expect(element).toHaveAttribute(\"href\", \"/x\")\n"
       "      Tests  1 failed | 13 passed (14)\n", "t", "PAS-ASSERTION"),
    ("rien d'exécuté sous filtre", _V + "      Tests  25 skipped (25)\n", "t", "NON-DÉMARRÉE"),
    ("autre version", " RUN  v3.2.6 C:/x\n      Tests  1 failed (1)\n", "t", "VERSION"),
    ("crochet en échec (bloc de FICHIER, 1 skipped)", _V
     + " Test Files  1 failed (1)\n      Tests  1 skipped (1)\n FAIL  cas/crochet.cas.ts [ cas/crochet.cas.ts ]\n"
       "Error: crochet en panne\n", "t", "NON-DÉMARRÉE"),
    ("le titre attendu n'échoue pas (un autre, si)", _V
     + "   × d > une autre garde 3ms\n FAIL  a.test.ts > d > une autre garde\nAssertionError: expected 1 to be 2\n"
       "      Tests  1 failed | 4 passed (5)\n", "garde visée par la cible", "SANS-TITRE"),
]


def calibrer() -> bool:
    manques = 0
    for nom, texte, titre, attendu in CALIBRATION:
        verdict, _ = lire_vitest(texte, titre)
        manques += verdict != attendu
        print(f"  calibration {'✓' if verdict == attendu else '✗'} {nom} : {verdict} (attendu {attendu})")
    # Le mode DÉCOUVERTE a son propre bras : deux en-têtes regroupés partagent le message, un test seul porte le sien.
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


def verifier_arbre(moment: str, depart: dict[str, str] | None = None) -> bool:
    """Chaque ancre est là, UNE fois ; à l'arrivée, chaque fichier ciblé a l'EMPREINTE du départ (restauration prouvée à l'octet)."""
    ecarts = []
    for c in CIBLES:
        src = io.open(c["fichier"], encoding="utf-8", newline="").read()
        if src.count(c["avant"]) != 1:
            ecarts.append(f"{c['libelle'][:5]} : ancre ×{src.count(c['avant'])}")
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
        print("✗ R32_FILTRE n'est admis qu'avec R32_DECOUVERTE=1 : une campagne filtrée n'est pas une campagne verte, aucun verdict n'est rendu.")
        return 2
    actives = [c for c in CIBLES if not FILTRE or any(c["libelle"].startswith(p) for p in FILTRE)]
    depart = empreintes()
    os.makedirs(JOURNAUX, exist_ok=True)
    mesures_utilisees = sorted({m for c in actives for m in c["mesures"]})
    print(f"cibles : {len(CIBLES)} déclarées · {len(actives)} jouées (unit) · {len(mesures_utilisees)} mesure(s) distincte(s) · {len({c['fichier'] for c in actives})} fichier(s) muté(s)")

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
        ancre_avant, marque_avant = source.count(cible_["avant"]), source.count(cible_["apres"])
        if ancre_avant != 1:
            print(f"✗ {cible_['libelle']}\n   ERREUR DE SCRIPT : {ancre_avant} occurrence(s), 1 attendue dans {chemin}")
            erreurs.append(cible_["libelle"])
            break
        mute = source.replace(cible_["avant"], cible_["apres"])
        ancre_apres, marque_apres = mute.count(cible_["avant"]), mute.count(cible_["apres"])
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
            for mesure in cible_["mesures"]:
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
        for mesure, titre in cible_["mesures"].items():
            code, sortie = sorties[mesure]
            verdict, detail = lire_vitest(sortie, titre)
            verdicts.append((mesure, code, verdict, detail))
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
        print(f"\n{mordu} garde(s) mordue(s) sur {len(CIBLES)} cible(s) jouée(s) · 0 non mesurée(s) (attendu : {len(CIBLES)} sur {len(CIBLES)})")
    if conforme:
        print("arbre rendu à son état de départ : vérifié.")
    if erreurs or not conforme:
        return 2
    return 1 if muettes else 0


if __name__ == "__main__":
    sys.exit(main())
