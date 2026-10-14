#!/usr/bin/env python3
"""Campagne de neutralisation — RANG 38 (D332), LOT L35-2 : le PDF du devis — un tableau sans colonne vide, un récapitulatif en bloc séparé, la boîte de langue aux cinq boutons.

Ce que le lot ajoute, et que chaque cible neutralise (une garde neuve dont on n'a pas montré qu'elle mord est une assurance sans mesure) :
  · le MODÈLE du document (`quote-document.ts`, module pur) : la colonne de détail n'existe que si une ligne a un détail (M-6, M-7), le détail suit le TYPE de tarification stocké et jamais
    la valeur de la quantité — « par invité » / « à l'unité » : la quantité, « à paliers » : le nom du palier de la LIGNE dans la langue du document, « fixe » : rien (DB-9 : M-1 à M-4) —,
    une ligne « à paliers » sans nom de palier LÈVE (M-5), sans prestation il n'y a PAS de tableau et une phrase le dit (M-8, M-17), le récapitulatif est une section titrée, de quatre lignes
    dans l'ordre, alignée par des propriétés LOGIQUES (M-10 à M-12), tout ce qui est inséré est échappé (M-13), le montant d'une ligne est la valeur STOCKÉE (M-9) ;
  · la LECTURE des lignes stockées (`quote-document-source.prisma.ts`) : un type de tarification inconnu et un nom de palier absent (FR ou AR) lèvent (S-1, S-2), la langue du compte du client
    n'est plus lue (S-3) ;
  · le SERVICE et la POLITIQUE : la langue appliquée est la langue DEMANDÉE (V-1, V-2), la branche « langue du client » est retirée sans code mort (Y-1) ;
  · la FENÊTRE DE CHOIX partagée (`packages/ui/src/choice-dialog.tsx`) : fermée elle ne rend rien, modale, « Annuler » d'abord, le fond/Échap/le bouton annulent sans jamais choisir, un clic dans
    la fenêtre n'annule pas, chaque option déclare sa langue et sa direction et rien n'est deviné (C-*) ;
  · le PARCOURS DE REMISE (`walkin-journey.tsx`) : chacun des cinq boutons ouvre la boîte, annuler n'enregistre ni ne télécharge rien, la langue envoyée est celle CHOISIE, la boîte se ferme au choix
    (J-*) ; les libellés de langue sont les mêmes dans les deux catalogues (K-1) ;
  · « Ma salle / Mes salles » (S-11) : UNE règle (`venues-label.ts`), importée par le menu ET par le titre de la page (T-*).
Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-r38.py
    R38_DECOUVERTE=1 python3 neutralisation/neutralize-r38.py   # n'écrit AUCUN verdict : liste les tests qui rougissent, par cible
Codes de sortie : 0 = tout joué, tout a mordu ; 1 = au moins une garde MUETTE ; 2 = pré-vol rouge, ERREUR DE SCRIPT, vitest non attendu, calibration manquée, ou arbre non conforme.

⛔ UNE MORSURE SE LIT, ELLE NE SE DÉDUIT PAS D'UN CODE DE SORTIE (D304, D305, D312, D316) : la ligne « Tests » compte au moins un test en échec (exécutés = passés + en échec) ; le titre attendu
porte « × » ; la PREMIÈRE ligne de son bloc « FAIL … > titre » — en-têtes regroupés sautés — est une `AssertionError`. ⚠ Le lot est de méthode NORMALE avec la règle des montants (D325 : le PDF
imprime un montant stocké, il n'en calcule ni n'en écrit) : la lecture n'y est pas EXIGÉE ; elle est appliquée parce qu'un code de sortie seul ne prouve rien (patron de `neutralize-r37.py`).
⛔ VITEST 3.2.7 : la lecture est calibrée sur SA sortie ; toute autre version ⇒ refus de juger.
⛔ LA MUTATION SE PROUVE POSÉE (D286) : ancre 1 → 0 ET marqueur n → n + 1 pour une SUBSTITUTION ; ancre 1 → 1 ET marqueur n → n + 1 pour une INSERTION. ⚠ Le remplacement d'une substitution
ne doit jamais être une SOUS-CHAÎNE de son ancre (D325).
⛔ UNE MUTATION ÉQUIVALENTE SE RETIRE PAR ÉCRIT, avec sa mesure, à la place de la cible retirée.
⛔ UNE GARDE QUI NE ROUGIT QUE PAR UN MATCHER jest-dom OU UNE REQUÊTE Testing Library N'EST PAS LUE COMME UNE MORSURE (D304, D316) : le test reçoit une assertion NATIVE.
⛔ SURVIVRE À UN SIGNAL : sauvegarde sur DISQUE avant toute mutation, restaurée au démarrage suivant.
⛔ LES TITRES ATTENDUS SE RELÈVENT, ILS NE S'ÉCRIVENT PAS DE MÉMOIRE : `R38_DECOUVERTE=1` liste, par cible, ce qui rougit.
⛔ CE QUE CETTE CAMPAGNE NE MESURE PAS (écrit, pas tu) : (1) l'INTÉGRATION sur base réelle et le VRAI moteur de rendu (`quote-document.int-spec.ts`) — ses quatre rouges contre l'état d'AVANT sont
versés (`docs/preuves/D332/rouge/rouge-api-int.txt`), mais aucune cible de cette campagne ne les rejoue : les cibles du contrôleur et de l'adaptateur qui exigent PostgreSQL restent celles de
`neutralize-r33.py --int` ; (2) ce qu'un VRAI navigateur voit de la boîte et du PDF : `e2e/specs/r33-remise-devis.e2e.ts`, les captures et les pages rastérisées regardées par Ko.

POURQUOI IL EXISTE : CLAUDE.md, « une garde qui ne mord pas n'est pas une garde ». Lecteur, calibration et boucle : repris de `neutralize-r37.py` (calibré par D316 / D325 / D331).
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

SAUVEGARDE = ".neutralisation-r38"
MANIFESTE = os.path.join(SAUVEGARDE, "manifeste.json")
JOURNAUX = os.path.join(".neutralisation-journaux", "r38")  # ignoré par git ; ce qu'une décision cite se COPIE (D291)
ANSI = re.compile(r"\x1b\[[0-9;]*m")
VITEST_ATTENDU = "v3.2.7"
DECOUVERTE = os.environ.get("R38_DECOUVERTE") == "1"
# `R38_FILTRE="M-,C-"` ne joue que les cibles dont l'identifiant commence par l'un de ces préfixes — POUR LA DÉCOUVERTE SEULEMENT : une campagne filtrée n'est pas une campagne verte.
FILTRE = [p for p in os.environ.get("R38_FILTRE", "").split(",") if p]

MODELE = "apps/api/src/documents/quote-document.ts"
LECTURE = "apps/api/src/documents/quote-document-source.prisma.ts"
SERVICE = "apps/api/src/documents/quote-document.service.ts"
POLITIQUE = "apps/api/src/documents/quote-document-policy.ts"
DIALOGUE = "packages/ui/src/choice-dialog.tsx"
WK = "apps/pro/src/dashboard/walkin-journey.tsx"
LIBELLE = "apps/pro/src/shell/venues-label.ts"
NAV = "apps/pro/src/shell/pro-nav.tsx"
LISTE = "apps/pro/src/venues/venue-list-page.tsx"
CAT_AR = "packages/i18n/messages/ar.json"


def _vitest(paquet: str, fichier: str) -> list[str]:
    return ["pnpm", "--filter", paquet, "exec", "vitest", "run", fichier]


MESURES = {
    "api-modele": _vitest("@zwadj/api", "src/documents/quote-document.spec.ts"),
    "api-service": _vitest("@zwadj/api", "src/documents/quote-document.service.spec.ts"),
    "pro-remise": _vitest("@zwadj/pro", "src/dashboard/walkin-journey.test.tsx"),
    "pro-choix": _vitest("@zwadj/pro", "src/ui-choice-dialog.test.tsx"),
    "pro-libelle": _vitest("@zwadj/pro", "src/shell/venues-label.test.ts"),
    "pro-liste": _vitest("@zwadj/pro", "src/venues/venue-list.test.tsx"),
    "pro-app": _vitest("@zwadj/pro", "src/App.test.tsx"),
}

CIBLES: list[dict] = []


def cible(libelle: str, fichier: str, avant: str, apres: str, mesures: dict[str, str], genre: str = "substitution") -> None:
    """`mesures` : {nom de mesure → sous-chaîne du titre du test qui doit rougir}. Chaque mesure doit mordre.
    `genre` (D286 — chaque genre a SON arithmétique) : « substitution » = ancre 1→0 ET marqueur n→n+1 ; « insertion » = le remplacement CONTIENT l'ancre, qui doit
    donc SURVIVRE (1→1) tandis que le marqueur passe de n à n+1."""
    CIBLES.append({"libelle": libelle, "fichier": fichier, "avant": avant, "apres": apres, "mesures": mesures, "genre": genre})


A_DECOUVRIR = "?"

# Les titres, relevés par R38_DECOUVERTE=1 (jamais écrits de mémoire).
T_UNITE = "« à l'unité » imprime la quantité — y compris 1"
T_FIXE = "« fixe » n'imprime RIEN, même quand sa quantité stockée n'est pas 1"
T_PALIER = "« à paliers » imprime le NOM du palier, pas une quantité"
T_LANGUE_PALIER = "français : le nom FRANÇAIS du palier ; arabe : le nom ARABE"
T_PALIER_SANS_NOM = "une ligne « à paliers » SANS nom de palier stocké LÈVE"
T_DEUX_COLONNES = "des prestations TOUTES « fixe » : un tableau à DEUX colonnes"
T_TROIS_COLONNES = "une prestation qui a un détail : un tableau à TROIS colonnes"
T_SANS_TABLEAU = "sans prestation : AUCUN tableau"
T_MONTANT_LIGNE = "le montant d'une LIGNE est la valeur stockée, et PAS prix unitaire × quantité"
T_RECAP_TITRE = "une section titrée « Récapitulatif », APRÈS le tableau, qui porte les quatre lignes dans l'ordre"
T_RECAP_LOGIQUE = "les montants et les libellés s'alignent par des propriétés LOGIQUES"
T_PALIER_HOSTILE = "un nom de palier HOSTILE devient du texte"
T_TYPE_INCONNU = "un type de tarification INCONNU ou ABSENT lève"
T_PALIER_FR_AR = "dont le nom du palier n'est pas stocké (FR ou AR) lève"
T_CODE_MORT = "la branche « langue du client » est RETIRÉE sans code mort"
T_LANGUE_DEMANDEE = "la langue du PDF est la langue DEMANDÉE"
T_CINQ_BOUTONS = "chacun des CINQ boutons ouvre la boîte"
T_ANNULER = "ANNULER — par le bouton, par Échap ou par le clic sur le fond"
T_LANGUE_CHOISIE = "la langue du PDF est celle CHOISIE, pas celle de l'interface"
T_ARABE = "en ARABE : le libellé du cinquième canal, la boîte de langue"
T_FERME_AU_CHOIX = "choisir une langue FERME la boîte tout de suite"
T_ACCESSIBLE = "la boîte est accessible — rôle `dialog`, nom et description"
T_LIBELLES_LANGUE = "les deux libellés de langue sont écrits DANS LEUR PROPRE LANGUE"
T_D_FERMEE = "fermée, elle ne rend rien"
T_D_MODALE = "ouverte : une fenêtre modale nommée par son titre"
T_D_ORDRE = "« Annuler » d'abord, puis les options dans l'ordre reçu"
T_D_LANG_DIR = "chaque option déclare sa langue et sa direction"
T_D_RIEN_DEVINE = "une option sans `lang` ni `dir` n'en pose pas"
T_D_CHOISIR = "choisir une option appelle `onChoose` avec son identifiant, UNE fois, et n'annule pas"
T_D_ANNULER = "annuler : le bouton, Échap, le clic sur le fond"
T_D_DANS = "un clic DANS la fenêtre n'annule pas"
T_L_PLURIEL = "deux salles et plus : le pluriel"
T_L_SINGULIER = "zéro et une salle : le singulier"
T_P_UNE = "UNE salle : « Ma salle », le mot du menu"
T_P_DEUX = "DEUX salles : « Mes salles » ; le menu du haut dit le même mot"
T_P_SOURCE = "la règle vit UNE fois"
T_APP_TITRE = "session PRO sur /salles : la LISTE, sur une route enfin DÉCLARÉE"

# ── M — le MODÈLE du document (module pur).
cible("M-1. ⛔ le détail suit la VALEUR de la quantité : une prestation « à l'unité » de quantité 1 n'imprime plus rien (DB-9 : la règle suit le TYPE)", MODELE,
      "return `× ${line.quantity}`;", "return line.quantity === 1 ? null : `× ${line.quantity}`;", {"api-modele": T_UNITE})
cible("M-2. ⛔ une prestation « fixe » de quantité stockée 7 imprime « × 7 » : le détail suit la valeur, pas le type", MODELE,
      "    case ServicePricingType.FIXED:\n      return null;", "    case ServicePricingType.FIXED:\n      return line.quantity === 1 ? null : `× ${line.quantity}`;", {"api-modele": T_FIXE})
cible("M-3. une prestation « à paliers » imprime une QUANTITÉ au lieu du nom de son palier", MODELE, "      return nom;", "      return `× ${line.quantity}`;", {"api-modele": T_PALIER})
cible("M-4. ⛔ le nom du palier est pris dans l'AUTRE langue : le document arabe imprime le nom français", MODELE,
      'const nom = locale === "ar" ? line.tierLabelAr : line.tierLabelFr;', 'const nom = locale === "ar" ? line.tierLabelFr : line.tierLabelAr;', {"api-modele": T_LANGUE_PALIER})
cible("M-5. ⛔ une ligne « à paliers » SANS nom de palier ne lève plus : elle s'imprime à moitié", MODELE,
      'if (nom === null || nom.trim() === "") throw new TypeError(', "if (false) throw new TypeError(", {"api-modele": T_PALIER_SANS_NOM})
cible("M-6. ⛔ la colonne de détail s'imprime TOUJOURS : une colonne vide quand toutes les prestations sont « fixe » (le défaut du constat 1 de Ko)", MODELE,
      "const avecDetail = details.some((d) => d !== null);", "const avecDetail = true;", {"api-modele": T_DEUX_COLONNES})
cible("M-7. la colonne de détail ne s'imprime JAMAIS : la quantité et le palier disparaissent du tableau", MODELE,
      "const avecDetail = details.some((d) => d !== null);", "const avecDetail = false;", {"api-modele": T_TROIS_COLONNES})
cible("M-8. sans prestation, le tableau s'imprime quand même (vide) au lieu de n'imprimer aucun tableau", MODELE, "record.lines.length === 0", "record.lines.length < 0", {"api-modele": T_SANS_TABLEAU})
# ⚠ M-9 n'a QU'UNE mesure, et c'est écrit : la découverte a montré que la garde de SOURCE « le modèle ne contient aucune multiplication ni division » (`quote-document.spec.ts`) ne rougit PAS
# sur `Cents * l.quantity` — son expression ne voit que `Cents` × un littéral NUMÉRIQUE (`* 0.3`). Le défaut est de la garde du rang 33, pas de ce lot : il est RAPPORTÉ au backlog, pas corrigé ici.
# La règle des montants est tenue par le comportement (trois tests rougissent sur la valeur imprimée), pas par cette garde de source.
cible("M-9. ⛔ le montant d'une ligne est RECALCULÉ (total × quantité) au lieu d'être la valeur stockée (la règle des montants)", MODELE,
      "formatDZD(l.lineTotalCents)", "formatDZD(l.lineTotalCents * l.quantity)", {"api-modele": T_MONTANT_LIGNE})
cible("M-10. le récapitulatif perd son titre « Récapitulatif » (il porte celui d'une autre ligne)", MODELE, "<h2>${L.recap}</h2>", "<h2>${L.total}</h2>", {"api-modele": T_RECAP_TITRE})
cible("M-11. ⛔ le récapitulatif répète la ligne des prestations à la place de la location : l'ordre location, prestations, total, acompte est rompu", MODELE,
      '    <div class="ligne"><dt>${L.basePrice}</dt><dd>${formatDZD(record.basePriceCents)}</dd></div>',
      '    <div class="ligne"><dt>${L.servicesTotal}</dt><dd>${formatDZD(record.servicesTotalCents)}</dd></div>', {"api-modele": T_RECAP_TITRE})
cible("M-12. ⛔ une propriété PHYSIQUE (`margin-left`) dans l'alignement du récapitulatif : en arabe il serait du mauvais côté", MODELE,
      ".ligne dd { white-space: nowrap; }", ".ligne dd { white-space: nowrap; margin-left: 4mm; }", {"api-modele": T_RECAP_LOGIQUE})
cible("M-13. ⛔ le nom du palier est inséré SANS échappement (`raw`) : un nom hostile devient du balisage", MODELE, '${details[i] ?? ""}', '${raw(details[i] ?? "")}', {"api-modele": T_PALIER_HOSTILE})
cible("M-14. l'en-tête de la colonne de détail porte un autre libellé que « Détail »", MODELE, '<th class="det">${L.detail}</th>', '<th class="det">${L.service}</th>', {"api-modele": T_TROIS_COLONNES})
cible("M-17. la phrase « aucune prestation choisie » dit autre chose", MODELE, 'html`<p class="aucune">${L.noServices}</p>`', 'html`<p class="aucune">${L.recap}</p>`', {"api-modele": T_SANS_TABLEAU})

# ── S — la LECTURE des lignes stockées.
cible("S-1. ⛔ un type de tarification INCONNU ne lève plus : la ligne s'imprime avec un détail deviné", LECTURE,
      "if (pricingType === undefined) throw new TypeError(", "if (false) throw new TypeError(", {"api-modele": T_TYPE_INCONNU})
cible("S-2. ⛔ le nom ARABE du palier n'est plus exigé : le document arabe imprimerait un palier sans nom", LECTURE,
      ' || tierLabelAr === null || tierLabelAr.trim() === ""', " || false", {"api-modele": T_PALIER_FR_AR})
cible("S-3. ⛔ la langue du compte du client est LUE de nouveau (`locale: true`) : la branche retirée revient", LECTURE,
      "client: { select: { firstName: true, lastName: true } }", "client: { select: { firstName: true, lastName: true, locale: true } }", {"api-modele": T_CODE_MORT})

# ── V — le SERVICE et la POLITIQUE : la langue appliquée est la langue DEMANDÉE.
cible("V-1. ⛔ le document est construit dans une langue FIXE, quelle que soit la langue demandée", SERVICE,
      "buildQuoteDocumentHtml({ record, locale, issuedOn: algiersToday(now), fontCss: loadDocumentFontCss() })",
      'buildQuoteDocumentHtml({ record, locale: "fr", issuedOn: algiersToday(now), fontCss: loadDocumentFontCss() })', {"api-service": T_LANGUE_DEMANDEE})
cible("V-2. ⛔ la langue APPLIQUÉE que la réponse annonce (`Content-Language`) n'est plus la langue demandée", SERVICE,
      "pdf: await this.renderer.render(document), locale, filename", 'pdf: await this.renderer.render(document), locale: "fr", filename', {"api-service": T_LANGUE_DEMANDEE})
cible("Y-1. ⛔ `chooseDocumentLocale` REVIENT dans la politique : la règle remplacée laisse du code mort", POLITIQUE,
      "export function decideQuoteDocument(input: {", "export function chooseDocumentLocale(): void {}\n\nexport function decideQuoteDocument(input: {", {"api-modele": T_CODE_MORT}, genre="insertion")

# ── C — la FENÊTRE DE CHOIX partagée.
cible("C-1. la fenêtre fermée se rend quand même", DIALOGUE, "if (!open) return null;", "if (false) return null;", {"pro-choix": T_D_FERMEE})
cible("C-2. elle n'est plus modale pour la technologie d'assistance (`aria-modal`)", DIALOGUE, 'aria-modal="true"', 'aria-modal="false"', {"pro-choix": T_D_MODALE})
cible("C-3. ⛔ « Annuler » n'est plus le premier bouton : les options passent devant lui (et le focus d'entrée ne serait plus « Annuler »)", DIALOGUE,
      "{options.map((option) => (", "{[...options].reverse().map((option) => (", {"pro-choix": T_D_ORDRE})
cible("C-4. ⛔ choisir une option ANNULE aussi : l'appelant recevrait le choix puis l'annulation", DIALOGUE,
      "onClick={() => onChoose(option.id)}", "onClick={() => { onChoose(option.id); onCancel(); }}", {"pro-choix": T_D_CHOISIR})
cible("C-5. choisir une option rend l'identifiant de la PREMIÈRE, quelle que soit celle cliquée", DIALOGUE, "onChoose(option.id)", "onChoose(options[0]?.id as Id)", {"pro-choix": T_D_CHOISIR})
cible("C-6. ⛔ Échap n'annule plus", DIALOGUE, "onDismiss: onCancel", "onDismiss: () => undefined", {"pro-choix": T_D_ANNULER})
cible("C-7. ⛔ un clic DANS la fenêtre annule (le fond n'est plus distingué du panneau)", DIALOGUE,
      "if (event.target === event.currentTarget) onCancel();", "void event; onCancel();", {"pro-choix": T_D_DANS})
cible("C-8. ⛔ la direction de l'option n'est plus déclarée : l'arabe est lu sans sa direction", DIALOGUE, "lang={option.lang} dir={option.dir}", "lang={option.lang} dir={undefined}", {"pro-choix": T_D_LANG_DIR})
cible("C-9. ⛔ une langue est DEVINÉE quand l'appelant n'en donne pas (`lang` « fr » et `dir` « ltr » par défaut)", DIALOGUE,
      "lang={option.lang} dir={option.dir}", 'lang={option.lang ?? "fr"} dir={option.dir ?? "ltr"}', {"pro-choix": T_D_RIEN_DEVINE})

# ── J — le PARCOURS DE REMISE.
cible("J-1. ⛔ le bouton de remise ne passe plus par la boîte : il enregistre et télécharge tout de suite, en français", WK,
      "onClick={() => setLangueDe(canal)}", 'onClick={() => remettre(canal, "fr")}', {"pro-remise": T_CINQ_BOUTONS})
cible("J-2. ⛔ ANNULER la boîte remet quand même (le canal est enregistré, le PDF téléchargé)", WK,
      "onCancel={() => setLangueDe(null)}", 'onCancel={() => { const canal = langueDe; setLangueDe(null); if (canal !== null) remettre(canal, "fr"); }}', {"pro-remise": T_ANNULER})
# ⚠ P-12 (« le canal retenu est périmé : SMS, annuler, impression ») n'a PAS de cible, et c'est écrit : un SEUL état (`langueDe`) porte l'ouverture de la boîte ET son canal, donc l'annulation qui ne
# ferme pas la boîte (J-3) n'est pas un canal périmé — le clic suivant réécrit le canal, le test reste vert (mesuré par la découverte : 1 titre rouge, celui d'ANNULER). La faute que P-12 décrit
# exigerait deux états (ouvert / canal) : elle est impossible PAR CONSTRUCTION. Le test reste, comme régression d'une conception à deux états ; aucune mutation n'est équivalente à lui, aucune ne le fait rougir.
cible("J-3. ⛔ ANNULER ne ferme plus la boîte : elle reste ouverte", WK,
      "onCancel={() => setLangueDe(null)}", "onCancel={() => undefined}", {"pro-remise": T_ANNULER})
cible("J-4. ⛔ la langue envoyée est celle de l'INTERFACE : choisir « العربية » sur une page française envoie `fr`", WK,
      "if (canal !== null) remettre(canal, locale);", 'if (canal !== null) remettre(canal, isAr ? "ar" : "fr");', {"pro-remise": T_LANGUE_CHOISIE})
cible("J-5. ⛔ la langue envoyée est toujours le français : le choix « العربية » est ignoré", WK,
      "if (canal !== null) remettre(canal, locale);", 'if (canal !== null) remettre(canal, "fr");', {"pro-remise": T_LANGUE_CHOISIE, "pro-remise#2": T_ARABE})
cible("J-6. ⛔ choisir une langue ne ferme pas la boîte avant le travail : elle reste ouverte pendant l'enregistrement et le téléchargement", WK,
      "const canal = langueDe;\n          setLangueDe(null);\n          if (canal !== null) remettre(canal, locale);",
      "const canal = langueDe;\n          if (canal !== null) remettre(canal, locale);", {"pro-remise": T_FERME_AU_CHOIX})
cible("J-7. ⛔ le libellé arabe déclare la direction `ltr` : l'arabe est présenté de gauche à droite", WK,
      '  ar: { labelKey: "venue.ui.walkin.langArabic", dir: "rtl" }', '  ar: { labelKey: "venue.ui.walkin.langArabic", dir: "ltr" }', {"pro-remise": T_ACCESSIBLE})
cible("J-8. ⛔ le bouton arabe déclare la langue `fr`", WK, "lang: locale,", 'lang: "fr",', {"pro-remise": T_ACCESSIBLE})
cible("J-9. la boîte ne propose que le français", WK, "options={QUOTE_DOCUMENT_LOCALES.map(", 'options={(["fr"] as const).map(', {"pro-remise": T_CINQ_BOUTONS})
cible("J-10. ⛔ le PDF est demandé au serveur dans une langue FIXE (le paramètre de `remettre` est ignoré)", WK,
      "quotes.document(courant.id, documentLocale)", 'quotes.document(courant.id, "fr")', {"pro-remise": T_LANGUE_CHOISIE})

# ── K — les catalogues.
cible("K-1. « Français » est traduit dans le catalogue arabe : le libellé n'est plus écrit dans sa propre langue", CAT_AR,
      '"langFrench": "Français"', '"langFrench": "الفرنسية"', {"pro-remise": T_LIBELLES_LANGUE})

# ── T — « Ma salle / Mes salles » : UNE règle, deux consommateurs (S-11).
cible("T-1. le seuil du pluriel passe à TROIS salles : deux salles disent encore « Ma salle »", LIBELLE, "return count > 1 ?", "return count > 2 ?", {"pro-libelle": T_L_PLURIEL})
cible("T-2. le seuil tombe à zéro : pendant le chargement le libellé dit « Mes salles » puis se rétracte", LIBELLE, "return count > 1 ?", "return count > 0 ?", {"pro-libelle": T_L_SINGULIER})
cible("T-3. ⛔ le menu écrit son propre libellé (la règle existe deux fois)", NAV, "t(venuesLabelKey(count))", 't("venue.ui.nav.myVenue")', {"pro-liste": T_P_DEUX, "pro-liste#2": T_P_SOURCE})
cible("T-4. ⛔ le titre de la page dit toujours « Mes salles » (le défaut observé par D331)", LISTE, "t(venuesLabelKey(count))", 't("venue.ui.nav.myVenues")', {"pro-liste": T_P_UNE, "pro-app": T_APP_TITRE})
cible("T-5. le titre de la page dit toujours « Ma salle » : deux salles disent le singulier", LISTE, "t(venuesLabelKey(count))", 't("venue.ui.nav.myVenue")', {"pro-liste": T_P_DEUX, "pro-liste#2": T_P_SOURCE})


def _jouees() -> list[dict]:
    """Les cibles jouées. Une clé de mesure peut porter un suffixe `#n` : plusieurs titres d'un MÊME fichier de test pour une même cible (le dictionnaire ne peut pas répéter une clé)."""
    return [{**c, "mesures": dict(c["mesures"])} for c in CIBLES]


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
    Copie du lecteur de `neutralize-r33.py` (calibré par D316 et D325) — mêmes verdicts, mêmes bras de calibration ci-dessous."""
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


# ── CALIBRATION DU LECTEUR, à chaque lancement (D286) — les bras vitest de `neutralize-r33.py`, formes réelles versées sous `docs/preuves/D316/` et `docs/preuves/D304/`.
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
    # Bras propre à ce lot : le bruit de console (« not wrapped in act(...) ») fait échouer le test par une `Error` de `test-setup.ts` — ce n'est pas une morsure non plus.
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
        print("✗ R38_FILTRE n'est admis qu'avec R38_DECOUVERTE=1 : une campagne filtrée n'est pas une campagne verte, aucun verdict n'est rendu.")
        return 2
    toutes = _jouees()
    sans_titre = [c["libelle"].split(".")[0] for c in toutes for t in c["mesures"].values() if t == A_DECOUVRIR]
    if sans_titre and not DECOUVERTE:
        print(f"✗ TITRE NON RELEVÉ pour {len(sans_titre)} mesure(s) ({', '.join(sorted(set(sans_titre)))}) : relever par R38_DECOUVERTE=1, puis écrire le titre — aucun verdict n'est rendu sur « ? ».")
        return 2
    actives = [c for c in toutes if not FILTRE or any(c["libelle"].startswith(p) for p in FILTRE)]
    depart = empreintes()
    os.makedirs(JOURNAUX, exist_ok=True)
    mesures_utilisees = sorted({_mesure_de(m) for c in actives for m in c["mesures"]})
    print(f"cibles : {len(CIBLES)} déclarées · {len(actives)} jouées · {len(mesures_utilisees)} mesure(s) distincte(s) · {len({c['fichier'] for c in actives})} fichier(s) muté(s)")

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
        print(f"\n{mordu} garde(s) mordue(s) sur {len(actives)} cible(s) jouée(s) · {len(muettes)} muette(s) · {len(erreurs)} non mesurée(s) "
              f"(attendu : {len(actives)} sur {len(actives)}, 0, 0)")
    if conforme:
        print("arbre rendu à son état de départ : vérifié.")
    if erreurs or not conforme:
        return 2
    return 1 if muettes else 0


if __name__ == "__main__":
    sys.exit(main())
