#!/usr/bin/env python3
"""Campagne de neutralisation — RANG 33 (D326) : le PDF du devis, les boutons de remise, et les réparations de l'app Pro qui suivent.

Ce que le lot ajoute, et que chaque cible neutralise (une garde neuve dont on n'a pas montré qu'elle mord est une assurance sans mesure) :
  · l'ÉCHAPPEMENT structurel du modèle (`apps/api/src/documents/html.ts`) et son emploi dans le modèle du devis (`quote-document.ts`) : tout ce qui est inséré est
    échappé, sauf un `raw()` écrit — le CSS et les polices du dépôt (H-*, M-*) ;
  · l'ADAPTATEUR du moteur de rendu (`playwright-pdf.renderer.ts`) : JavaScript coupé, réseau bloqué, navigateur fermé sur tous les chemins, rendus simultanés bornés,
    une panne dite panne (RD-*) ;
  · la POLITIQUE du document (`quote-document-policy.ts`) : une version qui n'est plus la dernière est REFUSÉE, l'ordre des refus, la langue du client avant celle du pro,
    comparée au MINUSCULE de l'énuméré (PO-*) ; l'ORCHESTRATION (`quote-document.service.ts`) : propriétaire, 404 indistinct, 409, 503, fuseau d'Alger (SV-*) ;
  · la RÈGLE DES MONTANTS — le PDF imprime la valeur STOCKÉE, jamais un recalcul (M-1 à M-3, I-4) ; les POLICES du dépôt, avec leurs plages (F-*) ;
  · la REMISE du devis (`remittance.ts`, `remittance-hook.ts`, `walkin-journey.tsx`) : ce que la fenêtre DIT selon les deux issues, aucun texte ne dit que Zwadj a envoyé,
    le point de branchement SMS / e-mail, le canal « e-mail » exigeant une adresse, les boutons verrouillés pendant le travail (R-*, J-*) ;
  · les TEXTES des deux catalogues (K-*) ; le CLIENT des devis et le contrat (`quotes-client.ts`, `quote.ts` de `@zwadj/types`) (Q-*, T-*) ;
  · les RÉPARATIONS de l'app Pro : le stepper de l'assistant est le rail PARTAGÉ (W-*), « Ma salle » relit sa liste (C-*), `.pro-layout` à 360 px (L-*).
  Mode `--int` (PostgreSQL réel, le vrai Chromium) : les cibles I-* et les mesures d'intégration des cibles ci-dessus.

Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-r33.py [--int]
    R33_DECOUVERTE=1 python3 neutralisation/neutralize-r33.py [--int]   # n'écrit AUCUN verdict : liste les tests qui rougissent, par cible
Codes de sortie : 0 = tout joué, tout a mordu ; 1 = au moins une garde MUETTE ; 2 = pré-vol rouge, ERREUR DE SCRIPT, vitest non attendu,
calibration manquée, ou arbre non conforme.

⛔ UNE MORSURE SE LIT, ELLE NE SE DÉDUIT PAS D'UN CODE DE SORTIE (D304, D305, D312, D316) : la ligne « Tests » compte au moins un test en échec (exécutés = passés + en
échec) ; le titre attendu porte « × » ; la PREMIÈRE ligne de son bloc « FAIL … > titre » — en-têtes regroupés sautés — est une `AssertionError`. ⚠ Le lot n'est pas du chemin de
l'argent (décision du relecteur de D325 : la méthode se décide par ce que le lot touche ; le PDF IMPRIME des montants, il n'en calcule ni n'en écrit) : la lecture n'y est pas
EXIGÉE ; elle est appliquée parce qu'un code de sortie seul ne prouve rien (patron de `neutralize-r32.py`). ⛔ La RÈGLE DES MONTANTS s'applique aux cibles M-1 à M-3 et I-4 :
elles mutent ce que le PDF IMPRIME, jamais un montant que le serveur calcule.
⛔ VITEST 3.2.7 : la lecture est calibrée sur SA sortie ; toute autre version ⇒ refus de juger.
⛔ LA MUTATION SE PROUVE POSÉE (D286) : ancre 1 → 0 ET marqueur n → n + 1 pour une SUBSTITUTION ; ancre 1 → 1 ET marqueur n → n + 1 pour une INSERTION. ⚠ Le remplacement d'une
substitution ne doit jamais être une SOUS-CHAÎNE de l'ancre (D325 : W-6, S-6, E-5 — « marqueur 1→1 »).
⛔ UNE MUTATION ÉQUIVALENTE SE RETIRE PAR ÉCRIT, avec sa mesure, à la place de la cible retirée.
⛔ UNE GARDE QUI NE ROUGIT QUE PAR UN MATCHER jest-dom OU UNE REQUÊTE Testing Library N'EST PAS LUE COMME UNE MORSURE (D304, D316) : le test reçoit une assertion NATIVE.
⛔ SURVIVRE À UN SIGNAL : sauvegarde sur DISQUE avant toute mutation, restaurée au démarrage suivant.
⛔ UNE CIBLE PARTAGÉE SE VÉRIFIE DANS TOUS SES CONSOMMATEURS : une cible à plusieurs mesures n'est « mordue » que si CHACUNE mord.
⛔ LES TITRES ATTENDUS SE RELÈVENT, ILS NE S'ÉCRIVENT PAS DE MÉMOIRE : `R33_DECOUVERTE=1` liste, par cible, ce qui rougit.
⛔ CE QU'AUCUNE MUTATION NE PEUT FAIRE ROUGIR PAR ASSERTION (écrit ici, pas tu) : (1) la route `/fr/auth/connexion` ajoutée au PRÉCHAUFFAGE (`warmup.setup.ts`) — la retirer ne
fait rougir aucun test, elle déplace un DÉLAI (D127), et un délai n'est pas une morsure (D323) ; elle se mesure par les durées de `r25-lien-connexion` sur plusieurs passes
(section D326) ; (2) `save-file.ts` (le lien `download`, le clic) — jsdom n'a ni téléchargement ni `createObjectURL`, les tests du parcours le REMPLACENT : il se neutralise À LA
MAIN dans la spec e2e, sortie lue (`docs/preuves/D326/neutralisation-e2e/`).
⛔ CE QUE LA DÉCOUVERTE A CORRIGÉ AVANT LA CAMPAGNE (écrit, pas tu) : une cible MUETTE (M-2 : la fixture valait pile base + prestations, un total recomposé passait — un test a été ajouté) ;
des gardes qui ne rougissaient que par une requête Testing Library, un matcher jest-dom, une `SyntaxError` ou un DÉLAI (Q-4, Q-5, J-4, J-9, J-12, J-15, W-3, W-5, W-6, RD-7) et les
`.expect(<statut>)` de supertest de l'intégration (T-2, I-1, I-2, I-3, I-7, I-8 : une `Error`, pas une `AssertionError`, D305) — chacune a reçu une assertion NATIVE ; RD-2 réorientée
(`route.continue()`, que le faux navigateur offre désormais) ; un titre de test portait « × » (F-1, F-2). ⛔ Et UNE AFFIRMATION SANS PIÈCE A ÉTÉ RETIRÉE : F-1 (retirer les `unicode-range`) laisse
l'intégration VERTE — « sans plage l'arabe retomberait sur une police système » n'est pas établi ; la cible ne garde que la PRÉSENCE des plages (`quote-document-fonts.ts`, commentaire corrigé).

POURQUOI IL EXISTE : CLAUDE.md, « une garde qui ne mord pas n'est pas une garde ». Lecteur, calibration et boucle : repris de `neutralize-r32.py` (calibré par D316 / D325).
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

SAUVEGARDE = ".neutralisation-r33"
MANIFESTE = os.path.join(SAUVEGARDE, "manifeste.json")
JOURNAUX = os.path.join(".neutralisation-journaux", "r33")  # ignoré par git ; ce qu'une décision cite se COPIE (D291)
ANSI = re.compile(r"\x1b\[[0-9;]*m")
VITEST_ATTENDU = "v3.2.7"
DECOUVERTE = os.environ.get("R33_DECOUVERTE") == "1"
INT = "--int" in sys.argv[1:]
# `R33_FILTRE="H-,RD-"` ne joue que les cibles dont l'identifiant commence par l'un de ces préfixes — POUR LA DÉCOUVERTE SEULEMENT : une campagne filtrée n'est pas une
# campagne verte, et le harnais refuse de rendre un verdict (code 2) tant que le filtre est posé hors découverte.
FILTRE = [p for p in os.environ.get("R33_FILTRE", "").split(",") if p]

DOC = "apps/api/src/documents/"
HTML = DOC + "html.ts"
RENDU = DOC + "playwright-pdf.renderer.ts"
POLITIQUE = DOC + "quote-document-policy.ts"
SERVICE = DOC + "quote-document.service.ts"
MODELE = DOC + "quote-document.ts"
POLICES = DOC + "quote-document-fonts.ts"
SOURCE = DOC + "quote-document-source.prisma.ts"
CONTROLEUR = DOC + "quote-document.controller.ts"
TYPES_DEVIS = "packages/types/src/quote.ts"
CLIENT_DEVIS = "packages/api-client/src/quotes-client.ts"
CLIENT_AUTH = "packages/api-client/src/auth-client.ts"
REMISE = "apps/pro/src/dashboard/remittance.ts"
CROCHET = "apps/pro/src/dashboard/remittance-hook.ts"
WK = "apps/pro/src/dashboard/walkin-journey.tsx"
ASSISTANT = "apps/pro/src/venues/venue-wizard.tsx"
CREATION = "apps/pro/src/venues/create-venue-page.tsx"
THEME = "apps/pro/src/theme.css"
FR = "packages/i18n/messages/fr.json"
AR = "packages/i18n/messages/ar.json"


def _vitest(paquet: str, fichier: str) -> list[str]:
    return ["pnpm", "--filter", paquet, "exec", "vitest", "run", fichier]


def _vitest_int(fichier: str) -> list[str]:
    return ["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", "-c", "vitest.config.int.ts", fichier]


MESURES = {
    "api-html": _vitest("@zwadj/api", "src/documents/html.spec.ts"),
    "api-rendu": _vitest("@zwadj/api", "src/documents/playwright-pdf.renderer.spec.ts"),
    "api-politique": _vitest("@zwadj/api", "src/documents/quote-document-policy.spec.ts"),
    "api-service": _vitest("@zwadj/api", "src/documents/quote-document.service.spec.ts"),
    "api-modele": _vitest("@zwadj/api", "src/documents/quote-document.spec.ts"),
    "api-parite": _vitest("@zwadj/api", "src/common/i18n-parity.spec.ts"),
    "pro-remise": _vitest("@zwadj/pro", "src/dashboard/remittance.test.ts"),
    "pro-parcours": _vitest("@zwadj/pro", "src/dashboard/walkin-journey.test.tsx"),
    "pro-assistant": _vitest("@zwadj/pro", "src/venues/venue-wizard.test.tsx"),
    "pro-creation": _vitest("@zwadj/pro", "src/venues/create-venue-page.test.tsx"),
    "pro-feuille": _vitest("@zwadj/pro", "src/venues/layout-style.test.ts"),
    "client-auth": _vitest("@zwadj/api-client", "src/auth-client.test.ts"),
    "client-devis": _vitest("@zwadj/api-client", "src/quotes-client.test.ts"),
    "int-document": _vitest_int("test/int/quote-document.int-spec.ts"),
    "int-rendu": _vitest_int("test/int/pdf-renderer.int-spec.ts"),
}
MODE_INT = {"int-document", "int-rendu"}

CIBLES: list[dict] = []


def cible(libelle: str, fichier: str, avant: str, apres: str, mesures: dict[str, str], genre: str = "substitution") -> None:
    """`mesures` : {nom de mesure → sous-chaîne du titre du test qui doit rougir}. Chaque mesure doit mordre. Les mesures d'INTÉGRATION (`int-*`) ne sont jouées qu'avec `--int`.
    `genre` (D286 — chaque genre a SON arithmétique) : « substitution » = ancre 1→0 ET marqueur n→n+1 ; « insertion » = le remplacement CONTIENT l'ancre, qui doit
    donc SURVIVRE (1→1) tandis que le marqueur passe de n à n+1."""
    CIBLES.append({"libelle": libelle, "fichier": fichier, "avant": avant, "apres": apres, "mesures": mesures, "genre": genre})


A_DECOUVRIR = "?"

# ── H — l'ÉCHAPPEMENT structurel (`html.ts`).
cible("H-1. `escapeHtml` ne remplace plus rien : la saisie passe telle quelle", HTML,
      'return String(value).replace(/[&<>"\']/g, (c) => ENTITES[c] as string);', "return String(value);", {"api-html": "escapeHtml remplace les cinq caractères actifs", "api-modele": "le nom de la salle, du client, du créneau et des prestat"})
cible("H-2. `escapeHtml` oublie « & » : « &lt; » saisi redevient une balise à la relecture", HTML,
      'return String(value).replace(/[&<>"\']/g, (c) => ENTITES[c] as string);', 'return String(value).replace(/[<>"\']/g, (c) => ENTITES[c] as string);', {"api-html": "escapeHtml échappe « & » EN PREMIER"})
cible("H-3. une chaîne interpolée n'est plus échappée (le défaut que le module existe pour empêcher)", HTML,
      'if (typeof valeur === "string" || typeof valeur === "number") return escapeHtml(valeur);',
      'if (typeof valeur === "string" || typeof valeur === "number") return String(valeur);', {"api-html": "une valeur interpolée est ÉCHAPPÉE sans que l'appelant l'ait demandé", "api-modele": "le nom de la salle, du client, du créneau et des prestat"})
cible("H-4. un fragment déjà sûr est échappé une SECONDE fois", HTML, "if (isSafeHtml(valeur)) return valeur.value;", "if (isSafeHtml(valeur)) return escapeHtml(valeur.value);",
      {"api-html": "un fragment déjà sûr n'est PAS échappé une seconde fois"})
cible("H-5. une valeur non insérable est stringifiée en silence au lieu de LEVER", HTML,
      'throw new TypeError(`html : valeur non insérable (${valeur === null ? "null" : typeof valeur}) — convertis-la explicitement.`);', "return String(valeur);",
      {"api-html": "une valeur non insérable LÈVE"})
cible("H-6. les éléments d'un tableau ne sont plus rendus un à un : le tableau est joint tel quel", HTML,
      'if (Array.isArray(valeur)) return valeur.map(rendu).join("");', 'if (Array.isArray(valeur)) return valeur.join("");', {"api-html": "un nombre est inséré ; un tableau est rendu élément par élément"})
cible("H-7. un imposteur à la forme d'un fragment passe pour un fragment sûr", HTML,
      "return typeof value === \"object\" && value !== null && (value as { [SAFE]?: unknown })[SAFE] === true;",
      'return typeof value === "object" && value !== null && "value" in (value as object);', {"api-html": "un objet qui N'est PAS un fragment sûr ne passe pas pour tel"})

# ── M — le MODÈLE du devis : la valeur STOCKÉE s'imprime, tout est échappé.
cible("M-1. ⛔ RÈGLE DES MONTANTS — l'acompte imprimé est RECALCULÉ (30 % du total) au lieu d'être la valeur stockée", MODELE,
      '<div class="acompte"><span>${L.deposit}</span><span>${formatDZD(record.depositCents)}</span></div>',
      '<div class="acompte"><span>${L.deposit}</span><span>${formatDZD(Math.round(record.totalCents * 0.3))}</span></div>', {"api-modele": "l'acompte imprimé est la valeur stockée, et PAS 30 % du total"})
cible("M-2. ⛔ RÈGLE DES MONTANTS — le total imprimé est RECOMPOSÉ (base + prestations) au lieu d'être la valeur stockée", MODELE,
      "<div><span>${L.total}</span><span>${formatDZD(record.totalCents)}</span></div>",
      "<div><span>${L.total}</span><span>${formatDZD(record.basePriceCents + record.servicesTotalCents)}</span></div>", {"api-modele": "le total imprimé est la valeur STOCKÉE, et PAS base + prestations"})
cible("M-3. ⛔ RÈGLE DES MONTANTS — le montant d'une ligne est RECALCULÉ (× quantité)", MODELE,
      "formatDZD(l.lineTotalCents)", "formatDZD(l.lineTotalCents * l.quantity)", {"api-modele": "chaque montant imprimé est celui du devis"})
cible("M-4. le nom de la salle s'insère SANS échappement (`raw`)", MODELE, "<h1>${salle}</h1>", "<h1>${raw(salle)}</h1>", {"api-modele": "le nom de la salle, du client, du créneau et des prestat"})
cible("M-5. le nom du client s'insère SANS échappement", MODELE, "<small>${L.client}</small>${client}</div>", "<small>${L.client}</small>${raw(client)}</div>", {"api-modele": "le nom de la salle, du client, du créneau et des prestat"})
cible("M-6. le nom d'une prestation s'insère SANS échappement", MODELE, "<td>${rtl ? l.nameAr : l.nameFr}</td>", "<td>${raw(rtl ? l.nameAr : l.nameFr)}</td>", {"api-modele": "le nom de la salle, du client, du créneau et des prestat"})
cible("M-7. le document arabe n'est plus de droite à gauche", MODELE, 'dir="${rtl ? "rtl" : "ltr"}"', 'dir="ltr"', {"api-modele": "arabe : `lang=ar`, `dir=rtl`"})
cible("M-8. le nom de la salle est toujours le nom FRANÇAIS", MODELE, "const salle = rtl ? record.venue.nameAr : record.venue.nameFr;", "const salle = record.venue.nameFr;", {"api-modele": "arabe : `lang=ar`, `dir=rtl`"})
cible("M-9. le CSS des polices n'est plus inséré dans le document (une police absente retombe sur le système)", MODELE, "${raw(fontCss)}", '${raw("")}', {"api-modele": "le CSS des polices est inséré tel quel"})
cible("M-10. le créneau n'est plus mis en forme par `formatSlotRange` (24 h) : des minutes brutes", MODELE,
      "formatSlotRange(record.slot.startMinutes, record.slot.endMinutes)", "String(record.slot.startMinutes)", {"api-modele": "le créneau s'imprime par `formatSlotRange`"})
cible("M-11. la référence imprimée ne dit plus QUELLE version est imprimée", MODELE, "return `${record.id.slice(0, 8)}-v${record.version}`;", "return `${record.id.slice(0, 8)}`;", {"api-modele": "le client s'imprime quand le devis y est lié"})
cible("M-12. la date d'un événement dérive du fuseau du serveur (la date civile n'est pas un instant)", MODELE,
      '{ dateStyle: "long", timeZone: "UTC" }', '{ dateStyle: "long" }', {"api-modele": "la date de l'événement est en toutes lettres"})
cible("M-13. ⛔ une garde de SOURCE : le modèle importe le moteur de prix", MODELE, "const MESSAGES = { fr: frMessages, ar: arMessages } as const;",
      'import { computeDeposit } from "../venues/deposit";\nconst MESSAGES = { fr: frMessages, ar: arMessages } as const;', {"api-modele": "aucun n'importe le moteur de prix"}, genre="insertion")
cible("M-14. ⛔ une garde de SOURCE : le modèle MULTIPLIE (il calcule au lieu de mettre en forme)", MODELE, 'const rtl = locale === "ar";',
      'const rtl = locale === "ar"; const inutile = record.totalCents * 2;', {"api-modele": "le modèle ne contient aucune multiplication"}, genre="insertion")

# ── F — les polices du DÉPÔT.
cible("F-1. les faces perdent leur `unicode-range` (leur PRÉSENCE est gardée ; leur NÉCESSITÉ ne l'est pas — l'intégration reste VERTE sans elles, mesuré)", POLICES,
      "unicode-range: ${PLAGES[sousEnsemble]}; ", "font-display: block; ", {"api-modele": "quatre faces — deux sous-ensembles et deux graisses"})
cible("F-2. une graisse disparaît : « quatre faces » devient deux", POLICES, "export const DOCUMENT_FONT_WEIGHTS = [400, 600] as const;",
      "export const DOCUMENT_FONT_WEIGHTS = [400] as const;", {"api-modele": "quatre faces — deux sous-ensembles et deux graisses"})

# ── RD — l'ADAPTATEUR du moteur de rendu : les quatre gardes de la décision 3.
cible("RD-1. garde 1 — JavaScript n'est plus coupé dans la page de rendu", RENDU,
      "lance.newContext({ javaScriptEnabled: false })", "lance.newContext({ javaScriptEnabled: true })", {"api-rendu": "rend les octets du PDF, JavaScript COUPÉ et TOUTE requête avortée", "int-rendu": "garde 1 — JavaScript est COUPÉ"})
cible("RD-2. garde 2 — les requêtes de la page ne sont plus avortées : elles PARTENT", RENDU,
      'await context.route("**/*", (route) => route.abort());', 'await context.route("**/*", (route) => route.continue());', {"api-rendu": "rend les octets du PDF, JavaScript COUPÉ et TOUTE requête avortée", "int-rendu": "garde 2 — le RÉSEAU est muet"})
cible("RD-3. garde 3 — le navigateur n'est plus fermé à la fin (erreur, délai ou succès)", RENDU,
      "if (browser !== undefined) await browser.close().catch(() => undefined);", "if (browser !== undefined) await Promise.resolve();", {"api-rendu": "garde 3 — le navigateur est fermé quand le RENDU échoue", "int-rendu": "garde 3 — le navigateur est FERMÉ après un rendu réussi"})
cible("RD-4. garde 3 — un lancement qui finit APRÈS le délai n'est plus fermé : le navigateur est orphelin", RENDU, "if (abandonne) {", "if (false) {", {"api-rendu": "un délai qui tombe PENDANT le lancement"})
cible("RD-5. garde 3 — le drapeau « abandonné » n'est jamais levé par le `finally`", RENDU, "abandonne = true;", "abandonne = false;", {"api-rendu": "un délai qui tombe PENDANT le lancement"})
cible("RD-6. garde 4 — la borne des rendus simultanés dépasse d'UN : N + 1 rendus à la fois", RENDU, "if (this.actifs >= this.max)", "if (this.actifs > this.max)", {"api-rendu": "garde 4 — jamais plus de N rendus simultanés"})
cible("RD-7. une place n'est plus rendue à la file quand le travail se termine", RENDU, "this.attente.shift()?.();", "void 0;", {"api-rendu": "la place rendue est TRANSMISE à celui qui attend"})
cible("RD-8. une panne du moteur n'est plus une panne dite : l'erreur d'origine remonte", RENDU, "throw new PdfRenderUnavailableError(erreur);", "throw erreur;", {"api-rendu": "un lancement qui ÉCHOUE est une panne du moteur"})

# ── PO — la POLITIQUE du document : version active, ordre des refus, langue.
cible("PO-1. la version la plus récente n'est plus comparée dans le bon sens : l'ancienne est SERVIE, la dernière REFUSÉE", POLITIQUE,
      "if (input.version < input.latestVersion)", "if (input.version > input.latestVersion)", {"api-politique": "une version plus ancienne est REFUSÉE", "api-service": "une version qui n'est plus la dernière : 409"})
cible("PO-2. ⛔ l'ORDRE des refus s'inverse : une ancienne version ANNULÉE est refusée comme « clos », pas comme « pas la version active »", POLITIQUE,
      "if (input.version < input.latestVersion) return", "if (input.version < input.latestVersion && isPrintable(input.status)) return",
      {"api-politique": "UN CAS DOUBLEMENT FAUTIF : une ancienne version ANNULÉE", "api-service": "un cas doublement fautif — ancienne version ET annulée"})
cible("PO-3. un devis ACCEPTÉ n'est plus imprimable (le document qui compte le plus)", POLITIQUE,
      "return isQuoteOpen(status) || status === QuoteStatus.ACCEPTED;", "return isQuoteOpen(status);", {"api-politique": "un devis ACCEPTÉ — la version dont l'acompte est réglé"})
cible("PO-4. une affaire PERDUE devient imprimable", POLITIQUE, "return isQuoteOpen(status) || status === QuoteStatus.ACCEPTED;", "return true;", {"api-politique": "la dernière version d'une affaire PERDUE"})
cible("PO-5. ⛔ la langue du compte est lue en MAJUSCULES (la faute de F7) : « AR » redevient l'arabe", POLITIQUE,
      "QUOTE_DOCUMENT_LOCALES.find((l) => l === input.clientLocale)", "QUOTE_DOCUMENT_LOCALES.find((l) => l === input.clientLocale?.toLowerCase())",
      {"api-politique": "la comparaison est au MINUSCULE de l'énuméré", "api-service": "une langue de compte INCONNUE"})
cible("PO-6. la langue du client n'est jamais lue : toujours le repli", POLITIQUE, "lisible === undefined ?", "true ?", {"api-politique": "un client `ar` reçoit un PDF ARABE, même si le pro clique", "api-service": "un client `ar` reçoit un PDF ARABE même quand le pro clique"})
cible("PO-7. la branche dit « FALLBACK » quand c'est la langue du client qui a servi", POLITIQUE,
      '{ locale: lisible, branch: "CLIENT" }', '{ locale: lisible, branch: "FALLBACK" }', {"api-politique": "un client `ar` reçoit un PDF ARABE, même si le pro clique", "api-service": "un client `ar` reçoit un PDF ARABE même quand le pro clique"})

# ── SV — l'ORCHESTRATION : propriétaire, 404 indistinct, 409, 503, fuseau.
cible("SV-1. un identifiant mal formé atteint la base (il ne rend plus le 404 sans lire)", SERVICE, "if (!UUID_PATTERN.test(quoteId)) this.throwNotFound();", "if (false) this.throwNotFound();",
      {"api-service": "un devis inexistant et un identifiant mal formé rendent la MÊME réponse"})
cible("SV-2. le propriétaire n'est plus transmis à la lecture : tout pro lit n'importe quel devis", SERVICE, "this.source.findForOwner(userId, quoteId)", 'this.source.findForOwner("", quoteId)',
      {"api-service": "une version qui n'est plus la dernière : 409"})
cible("SV-3. le refus d'une ancienne version ne dit plus laquelle est active", SERVICE, "latestVersion: decision.latestVersion", "latestVersion: record.version", {"api-service": "une version qui n'est plus la dernière : 409"})
cible("SV-4. le refus d'une ancienne version porte le code d'un devis CLOS", SERVICE, "code: QuoteErrorCode.QUOTE_VERSION_NOT_ACTIVE,", "code: QuoteErrorCode.QUOTE_STATUS_CONFLICT,",
      {"api-service": "une version qui n'est plus la dernière : 409"})
cible("SV-5. une PANNE du moteur n'est plus un 503 : elle remonte comme une erreur quelconque", SERVICE, "if (erreur instanceof PdfRenderUnavailableError) {", "if (false) {", {"api-service": "le moteur qui n'a pas rendu : 503 QUOTE_DOCUMENT_UNAVAILABLE"})
cible("SV-6. la langue de l'interface du pro n'est plus le repli : toujours le français", SERVICE, 'fallback: fallbackLocale })', 'fallback: "fr" })', {"api-service": "un client `fr` reçoit un PDF français depuis une interface arabe"})
cible("SV-7. la langue du compte du client n'est jamais transmise", SERVICE, "clientLocale: record.client?.locale ?? null,", "clientLocale: null,", {"api-service": "un client `ar` reçoit un PDF ARABE même quand le pro clique"})
cible("SV-8. le nom du fichier porte une donnée PERSONNELLE (le nom de la salle)", SERVICE, "filename: quoteDocumentFilename(record)", "filename: `devis-${record.venue.nameFr}.pdf`",
      {"api-service": "rend le PDF de la version active ; le HTML confié au moteur"})
cible("SV-9. la date d'émission est celle du fuseau UTC du serveur, pas celle d'Alger", SERVICE, '{ timeZone: "Africa/Algiers" }', '{ timeZone: "UTC" }', {"api-service": "à 23 h 30 UTC il est déjà le lendemain à Alger"})

# ── T — le contrat des devis (`@zwadj/types`).
cible("T-1. le canal « e-mail » n'exige plus d'adresse : il s'active sans destinataire", TYPES_DEVIS, "export const QUOTE_SENT_VIA_NEEDS_EMAIL = [QUOTE_SENT_VIA.EMAIL] as const;",
      "export const QUOTE_SENT_VIA_NEEDS_EMAIL = [QUOTE_SENT_VIA.PRINT] as const;", {"pro-remise": "l'e-mail exige l'ADRESSE et rien d'autre", "pro-parcours": "les cinq canaux sont RENDUS une fois le devis calculé"})
cible("T-2. ⛔ le schéma du serveur redevient une liste recopiée, sans « e-mail » : l'écran l'accepte, le serveur le refuse", TYPES_DEVIS, "z.enum(QUOTE_SENT_VIA_ORDER, {",
      "z.enum([QUOTE_SENT_VIA.PRINT, QUOTE_SENT_VIA.SMS, QUOTE_SENT_VIA.IN_PERSON, QUOTE_SENT_VIA.PHONE], {", {"int-document": "chaque canal de la liste d'autorité est accepté ET relu en base"})
cible("T-3. le nom du fichier ne dit plus la version", TYPES_DEVIS, "return `devis-${quote.eventDate}-v${quote.version}-${quote.id.slice(0, 8)}.pdf`;",
      "return `devis-${quote.eventDate}-${quote.id.slice(0, 8)}.pdf`;", {"api-modele": "le nom du fichier ne porte AUCUNE donnée personnelle", "api-service": "rend le PDF de la version active ; le HTML confié au moteur", "pro-parcours": "le fichier téléchargé porte le nom que le SERVEUR donne"})

# ── Q — le client des devis et la primitive authentifiée (réponse binaire).
cible("Q-1. `quotes.document` lit la réponse comme du JSON : le PDF planterait à la première lecture", CLIENT_DEVIS, '{ responseType: "blob" })', "{})",
      {"client-devis": "lit la réponse en FICHIER"})
cible("Q-2. la langue de repli ne voyage plus dans l'adresse", CLIENT_DEVIS, "/document?locale=${locale}`", "/document`", {"client-devis": "la langue de repli voyage dans l'adresse"})
cible("Q-3. l'identifiant du devis n'est plus encodé dans l'adresse du document", CLIENT_DEVIS, "request<Blob>(`/quotes/${encodeURIComponent(quoteId)}/document",
      "request<Blob>(`/quotes/${quoteId}/document", {"client-devis": "l'identifiant est ENCODÉ"})
cible("Q-4. la primitive ne rend plus un fichier : la réponse binaire est parsée", CLIENT_AUTH, 'if (init.responseType === "blob") return (await res.blob()) as T;',
      'if (false) return (await res.blob()) as T;', {"client-auth": "un succès rend un Blob aux MÊMES octets"})
cible("Q-5. le rejeu après 401 perd le type de réponse : le second succès n'est plus un fichier", CLIENT_AUTH,
      "return raw<T>(path, { ...init, bearer: true });", "return raw<T>(path, { method: init.method, body: init.body, bearer: true });", {"client-auth": "le rejeu après 401 GARDE le type de réponse"})

# ── R — ce que la fenêtre DIT (`remittance.ts`) et le point de branchement.
cible("R-1. le SMS ne figure plus parmi les canaux d'un envoi à venir", REMISE, "[QUOTE_SENT_VIA.SMS, QUOTE_SENT_VIA.EMAIL];", "[QUOTE_SENT_VIA.EMAIL];", {"pro-remise": "la ligne « Zwadj n'envoie pas encore » n'existe que pour le SMS", "pro-parcours": "AUCUN TEXTE NE DIT QUE ZWADJ A ENVOYÉ QUOI QUE CE SOIT : pour le SMS"})
cible("R-2. « Zwadj n'envoie pas encore » s'affiche aussi quand l'enregistrement a ÉCHOUÉ", REMISE, "if (recorded.ok && wantsRealSending(channel))", "if (wantsRealSending(channel))",
      {"pro-remise": "la ligne « Zwadj n'envoie pas encore » n'existe que pour le SMS"})
cible("R-3. « Remise enregistrée » est le titre d'une remise enregistrée dont le PDF a ÉCHOUÉ", REMISE, ': "remitTitleRecordedOnly"', ': "remitTitleDone"', {"pro-remise": "les QUATRE issues rendent quatre titres différents"})
cible("R-4. « Remise enregistrée » est le titre d'un échec TOTAL", REMISE, ': "remitTitleNone";', ': "remitTitleDone";', {"pro-remise": "les QUATRE issues rendent quatre titres différents"})
cible("R-5. la ligne d'enregistrement dit « enregistrée » même quand l'enregistrement a échoué", REMISE, 'recorded.ok ? { key: "remitRecorded", channel }',
      'true ? { key: "remitRecorded", channel }', {"pro-remise": "les QUATRE issues rendent quatre titres différents"})
cible("R-6. la ligne du PDF dit « téléchargé » même quand le PDF a échoué", REMISE, 'pdf.ok ? { key: "remitPdfDone" }', 'true ? { key: "remitPdfDone" }', {"pro-remise": "les QUATRE issues rendent quatre titres différents"})
cible("R-7. le canal « e-mail » ne retient plus personne faute d'adresse", REMISE, 'if (quoteSentViaNeedsEmail(channel) && !contact.emailOk) out.push("needEmail");',
      'if (false) out.push("needEmail");', {"pro-remise": "chaque canal est retenu par exactement ce que les prédicats du contrat disent"})
cible("R-8. le SMS et le téléphone ne retiennent plus personne faute de mobile", REMISE, 'if (quoteSentViaNeedsPhone(channel) && !contact.phoneOk) out.push("needPhone");',
      'if (false) out.push("needPhone");', {"pro-remise": "chaque canal est retenu par exactement ce que les prédicats du contrat disent"})
cible("R-9. ⛔ le point de branchement fait un APPEL RÉSEAU : le contrat réel serait inventé sans interlocuteur", CROCHET, "void channel;", 'fetch("/envoi"); void channel;',
      {"pro-remise": "aucun appel d'API, aucun contrat neuf"}, genre="insertion")

# ── J — le parcours : un bouton fait DEUX choses, et la fenêtre dit ce qui a eu lieu.
cible("J-1. la langue de repli envoyée n'est plus celle de l'interface : toujours le français", WK, 'const documentLocale = isAr ? "ar" : "fr";', 'const documentLocale = "fr";',
      {"pro-parcours": "la langue de repli envoyée est celle de l'interface AU MOMENT DU CLIC"})
cible("J-2. le bouton enregistre toujours « impression », quel que soit le bouton cliqué", WK, "quotes.deliver(courant.id, { sentVia: canal })", 'quotes.deliver(courant.id, { sentVia: "PRINT" })',
      {"pro-parcours": "chaque bouton fait DEUX choses"})
cible("J-3. un échec de l'un des deux appels emporte l'autre : plus de règlement SÉPARÉ (`all` au lieu d'`allSettled`)", WK, "Promise.allSettled([", "Promise.all([",
      {"pro-parcours": "chaque bouton fait DEUX choses"})
cible("J-4. le devis enregistré n'est plus relu dans l'écran après la remise", WK, 'if (enregistre.status === "fulfilled") setQuote(enregistre.value);',
      'if (false) setQuote(enregistre.value);', {"pro-parcours": "issue 1 — tout a réussi"})
cible("J-5. le point de branchement est appelé pour TOUS les canaux", WK, 'enregistre.status === "fulfilled" && wantsRealSending(canal)', 'enregistre.status === "fulfilled" && canal !== undefined',
      {"pro-parcours": "le point de branchement de l'envoi réel est appelé pour le SMS et l'e-mail, UNE fois"})
cible("J-6. le point de branchement est appelé même quand l'enregistrement a ÉCHOUÉ", WK, 'enregistre.status === "fulfilled" && wantsRealSending(canal)', "wantsRealSending(canal) && true",
      {"pro-parcours": "le point de branchement n'est PAS appelé quand l'enregistrement a échoué"})
cible("J-7. le point de branchement n'est plus appelé du tout", WK, "onQuoteRemitted(canal, enregistre.value);", "void 0;", {"pro-parcours": "le point de branchement de l'envoi réel est appelé pour le SMS et l'e-mail, UNE fois"})
cible("J-8. le point de branchement reçoit le devis d'AVANT le clic, pas celui du serveur", WK, "onQuoteRemitted(canal, enregistre.value);", "onQuoteRemitted(canal, courant);",
      {"pro-parcours": "le point de branchement de l'envoi réel est appelé pour le SMS et l'e-mail, UNE fois"})
cible("J-9. les boutons restent actifs pendant le travail : un double clic fait deux remises", WK, "disabled={busy || canalBloque(canal)}", "disabled={canalBloque(canal)}", {"pro-parcours": "pendant le travail les boutons sont VERROUILLÉS"})
cible("J-10. la fenêtre se ferme sans fermer (`onClose` ne fait rien)", WK, "onClose={() => setRemit(null)}", "onClose={() => undefined}", {"pro-parcours": "la fenêtre se ferme par son bouton"})
cible("J-11. la fenêtre s'ouvre PENDANT le travail, avant les deux réponses", WK, "open={remit !== null}", "open={remit !== null || busy}", {"pro-parcours": "la fenêtre ne s'ouvre PAS avant les réponses"})
cible("J-12. un téléchargement qui échoue est dit « téléchargé »", WK, "pdf = { ok: false, failure: cause };", "pdf = { ok: true };", {"pro-parcours": "un échec du TÉLÉCHARGEMENT lui-même"})
cible("J-13. le fichier téléchargé porte un nom écrit à la main, pas celui de la formule partagée", WK, "saveBlob(fichier.value, quoteDocumentFilename(courant));",
      'saveBlob(fichier.value, "devis.pdf");', {"pro-parcours": "le fichier téléchargé porte le nom que le SERVEUR donne"})
cible("J-14. le canal « e-mail » est actif quelle que soit l'adresse", WK, 'const emailOk = contact.email.trim() !== "" && isValidContactEmail(contact.email);', "const emailOk = true;",
      {"pro-parcours": "les cinq canaux sont RENDUS une fois le devis calculé"})
cible("J-15. la raison du blocage « e-mail » n'est plus affichée", WK, 'emailOk ? null : "deliverEmailRequired"', "(null as null)", {"pro-parcours": "le canal « e-mail » est INACTIF sans adresse"})
cible("J-16. ⛔ LA PHRASE RETIRÉE REVIENT sur l'écran : « Zwadj n'imprime rien et n'envoie rien à votre place »", WK, '{t("venue.ui.walkin.deliverHint")}',
      "{\"Zwadj n'imprime rien et n'envoie rien à votre place.\"}", {"pro-parcours": "la phrase « Zwadj n'imprime rien et n'envoie rien à votre place » a DISPARU"})

# ── K — les TEXTES des deux catalogues.
cible("K-1. une clé neuve n'existe plus que dans UN catalogue (le français)", FR, '"remitPdfDone": "Le PDF du devis est téléchargé.",', '"remitPdfDoneX": "Le PDF du devis est téléchargé.",',
      {"api-parite": "les DEUX ensembles de clés sont identiques"})
cible("K-2. ⛔ la phrase retirée revient dans le catalogue français", FR,
      '"deliverHint": "Chaque bouton enregistre comment vous avez remis le devis et télécharge son PDF récapitulatif.",',
      '"deliverHint": "Zwadj n\'imprime rien et n\'envoie rien à votre place : vous déclarez ici par quel moyen le client a reçu le devis.",', {"pro-remise": "la phrase retirée n'existe plus"})
cible("K-3. ⛔ la ligne du SMS, en arabe, dit que Zwadj ENVOIE", AR, '"remitNotSentSMS": "زواج لا يرسل الرسائل القصيرة بعد: أرسلها بنفسك إلى الزبون.",',
      '"remitNotSentSMS": "زواج يرسل الرسالة القصيرة إلى الزبون.",', {"pro-remise": "chaque ligne que la fenêtre peut afficher"})
cible("K-4. ⛔ la ligne de l'e-mail, en français, dit que Zwadj ENVOIE", FR,
      '"remitNotSentEMAIL": "Zwadj n\'envoie pas encore d\'e-mail : envoyez-le vous-même au client, avec le PDF en pièce jointe."',
      '"remitNotSentEMAIL": "Zwadj envoie l\'e-mail au client, avec le PDF en pièce jointe."', {"pro-remise": "chaque ligne que la fenêtre peut afficher"})
cible("K-5. le cinquième canal perd son libellé arabe", AR, '"sv_EMAIL": "مُرسَل بالبريد الإلكتروني",', '"sv_EMAIL": "",', {"pro-remise": "tout canal de la liste d'autorité a un libellé FR et AR"})

# ── W — le stepper de l'assistant de salle est le rail PARTAGÉ.
cible("W-1. les étapes avant la courante ne sont plus « franchies » : toute étape ouverte est cochée, même après elle", ASSISTANT,
      's.reachable && s.n < step.n ? "done" : "todo"', 's.reachable ? "done" : "todo"', {"pro-assistant": "les états sont ceux du rail partagé"})
cible("W-2. une étape non franchissable devient un BOUTON", ASSISTANT, "...(s.reachable && s.n !== step.n ?", "...(s.n !== step.n ?", {"pro-assistant": "vider un champ requis REFERME les étapes suivantes"})
cible("W-3. cliquer une étape ouvre la SUIVANTE", ASSISTANT, "onEdit={(id) => onGo(Number(id))}", "onEdit={(id) => onGo(Number(id) + 1)}", {"pro-assistant": "cliquer une étape du rail l'ouvre"})
cible("W-4. la classe de mise en page propre au Pro n'est plus posée sur le rail", ASSISTANT, 'className="wizard-rail"', 'className=""', {"pro-assistant": "S-b — c'est"})
cible("W-5. le nom accessible du bouton d'étape n'est plus le TITRE de l'étape", ASSISTANT, "{ editLabel: s.title }", "{ editLabel: String(s.n) }", {"pro-assistant": "cliquer une étape du rail l'ouvre"})
cible("W-6. le rail perd son nom accessible", ASSISTANT, 'label={t("venue.ui.wizard.stepsLabel")}', 'label=""', {"pro-assistant": "le rail porte son NOM ACCESSIBLE"})
cible("W-7. la mise en page du rail ne le place plus dans sa zone de grille", THEME, ".wizard-rail {\n  grid-area: rail;", ".wizard-rail {\n  grid-area: flow;", {"pro-assistant": "la feuille du Pro pose la grille rail | flux"})

# ── C — « Ma salle » relit sa liste.
cible("C-1. la salle créée n'est plus signalée au fournisseur : la liste reste celle d'avant", CREATION, "      reloadVenues();", "      void 0;", {"pro-creation": "après la création, une navigation INTERNE vers la liste montre la nouvelle salle"})

# ── L — `.pro-layout` à 360 px.
cible("L-1. ⛔ LE DÉFAUT RESTAURÉ — la colonne du panneau est redéclarée APRÈS le repli à une colonne", THEME,
      "/* ⚠ La colonne n'est PLUS redéclarée ici (voir la première règle de `.pro-layout`) : une déclaration plus bas que le repli le défait. */",
      "grid-template-columns: 292px minmax(0, 1fr);", {"pro-feuille": "à 360 px la valeur qui GAGNE n'a qu'UNE piste"})

# ── I — l'INTÉGRATION (PostgreSQL réel, le vrai Chromium) : `--int`.
cible("I-1. ⛔ la propriété d'un devis ne passe plus par la relation : tout pro lit le devis de tous", SOURCE, "venue: { deletedAt: null, owner: { userId } }", "venue: { deletedAt: null }",
      {"int-document": "un AUTRE pro est refusé en 404 indistinct"})
cible("I-2. une salle SUPPRIMÉE sert encore son devis", SOURCE, "venue: { deletedAt: null, owner: { userId } }", "venue: { owner: { userId } }", {"int-document": "un CLIENT est refusé (403), un anonyme aussi (401), une salle SUPPRIMÉE"})
cible("I-3. la version la plus haute n'est plus cherchée dans la CHAÎNE : l'ancienne version reste servie", SOURCE, "where: { chainId: row.chainId }", "where: { id: row.id }",
      {"int-document": "après une révision, le PDF de la v1 est REFUSÉ"})
cible("I-4. ⛔ RÈGLE DES MONTANTS — l'adaptateur de lecture RECALCULE l'acompte (30 % du total) au lieu de lire la valeur stockée", SOURCE, "depositCents: row.depositCents,",
      "depositCents: Math.round(row.totalCents * 0.3),", {"int-document": "test 1 — l'acompte stocké, qui n'est PAS 30 %"})
cible("I-5. la réponse est mise en cache partagé : un PDF porte le nom d'un client", CONTROLEUR, '"Cache-Control": "private, no-store",', '"Cache-Control": "public, max-age=3600",',
      {"int-document": "le propriétaire télécharge : application/pdf"})
cible("I-6. `Content-Language` dit la langue DEMANDÉE, pas la langue APPLIQUÉE", CONTROLEUR, '"Content-Language": document.locale,', '"Content-Language": query.locale,',
      {"int-document": "un devis lié à un client `ar` : PDF ARABE"})
cible("I-7. un CLIENT peut télécharger le PDF d'un devis", CONTROLEUR, "@Roles(UserRole.PRO)", "@Roles(UserRole.PRO, UserRole.CLIENT)", {"int-document": "un CLIENT est refusé (403), un anonyme aussi (401), une salle SUPPRIMÉE"})
cible("I-8. la langue de repli n'est plus validée : absente ou inconnue, elle passe", CONTROLEUR, "@Query(new ZodValidationPipe(quoteDocumentQuerySchema))", "@Query()",
      {"int-document": "la langue de repli est OBLIGATOIRE et se limite à fr / ar"})


def _jouees() -> list[dict]:
    """Les cibles jouées dans CE mode : sans `--int`, une cible n'a que ses mesures unitaires, et celle qui n'en a pas est NON JOUÉE (comptée à part)."""
    jouees = []
    for c in CIBLES:
        mesures = {m: t for m, t in c["mesures"].items() if INT or m not in MODE_INT}
        if mesures:
            jouees.append({**c, "mesures": mesures})
    return jouees


def _binaire(nom: str) -> str:
    """Résout l'exécutable AVANT `subprocess.run` (Windows : `pnpm.cmd`)."""
    return shutil.which(nom) or nom


def lancer(mesure: str) -> tuple[int, str]:
    cmd = MESURES[mesure]
    r = subprocess.run([_binaire(cmd[0]), *cmd[1:]], capture_output=True, text=True, encoding="utf-8", errors="replace")
    return r.returncode, ANSI.sub("", (r.stdout or "") + "\n" + (r.stderr or ""))


def lire_vitest(sortie: str, titre: str | None) -> tuple[str, str]:
    """Rend (verdict, détail). Verdicts : VERT, ROUGE, MORD, SANS-TITRE, PAS-ASSERTION, NON-DÉMARRÉE, VERSION.
    Copie du lecteur de `neutralize-r32.py` (calibré par D316 et D325) — mêmes verdicts, mêmes bras de calibration ci-dessous."""
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


# ── CALIBRATION DU LECTEUR, à chaque lancement (D286) — les bras vitest de `neutralize-r32.py`, formes réelles versées sous `docs/preuves/D316/` et `docs/preuves/D304/`.
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
    # Bras propre à ce lot : un délai dépassé n'est JAMAIS une morsure (D305, D323) — la première ligne du bloc est « Error: Test timed out … ».
    ("délai dépassé (jamais une morsure)", _V
     + "   × d > t 5001ms\n FAIL  a.test.ts > d > t\nError: Test timed out in 5000ms.\n      Tests  1 failed | 7 passed (8)\n", "t", "PAS-ASSERTION"),
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
        print("✗ R33_FILTRE n'est admis qu'avec R33_DECOUVERTE=1 : une campagne filtrée n'est pas une campagne verte, aucun verdict n'est rendu.")
        return 2
    toutes = _jouees()
    sans_titre = [c["libelle"].split(".")[0] for c in toutes for t in c["mesures"].values() if t == A_DECOUVRIR]
    if sans_titre and not DECOUVERTE:
        print(f"✗ TITRE NON RELEVÉ pour {len(sans_titre)} mesure(s) ({', '.join(sorted(set(sans_titre)))}) : relever par R33_DECOUVERTE=1, puis écrire le titre — aucun verdict n'est rendu sur « ? ».")
        return 2
    actives = [c for c in toutes if not FILTRE or any(c["libelle"].startswith(p) for p in FILTRE)]
    non_jouees = len(CIBLES) - len(toutes)
    depart = empreintes()
    os.makedirs(JOURNAUX, exist_ok=True)
    mesures_utilisees = sorted({m for c in actives for m in c["mesures"]})
    print(f"cibles : {len(CIBLES)} déclarées · {len(actives)} jouées ({'unit + int' if INT else 'unit'}) · {non_jouees} non jouée(s) (sans --int) · "
          f"{len(mesures_utilisees)} mesure(s) distincte(s) · {len({c['fichier'] for c in actives})} fichier(s) muté(s)")

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
        print(f"\n{mordu} garde(s) mordue(s) sur {len(actives)} cible(s) jouée(s) · {len(muettes)} muette(s) · {len(erreurs)} non mesurée(s) · {non_jouees} non jouée(s) (sans --int) "
              f"(attendu : {len(actives)} sur {len(actives)}, 0, 0{', 0' if INT else ''})")
    if conforme:
        print("arbre rendu à son état de départ : vérifié.")
    if erreurs or not conforme:
        return 2
    return 1 if muettes else 0


if __name__ == "__main__":
    sys.exit(main())
