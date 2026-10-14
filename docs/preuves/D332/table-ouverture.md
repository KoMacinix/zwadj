# D332 — rang 38 — table d'ouverture

Lot : **L35-2, le PDF** (rang 38, arbitré par Ko le 14/10/2026 : « 3. Rang 38 : L35-2, le PDF. Lot de code. »). C'est un **lot de CODE** : il **compte** dans le compteur de lots de code non certifiés (D283 amendé par D292 : un lot qui touche du code, un test, un harnais ou une spec e2e compte). Compteur à l'ouverture : **UN** (clôture de D331) ; à la clôture : **DEUX**, sous la limite de **CINQ** arbitrée par Ko le 14/10/2026 (point 1 du second texte ; elle remplace « deux tenables, trois non » de D270, annotée et non réécrite). Méthode **NORMALE, avec la règle des montants** (le PDF imprime la valeur STOCKÉE ; le test qui le prouve reste vert et mord) : le lot ne touche ni le paiement, ni un montant calculé ou enregistré par le serveur, ni un statut de réservation ou de devis.

- **SHA de départ** : `dd41fbd` (clôture de D331). `HEAD` = `origin/main` après `git fetch` (les deux = `dd41fbdab2ada56b7f601bc38aed1e9fb3b68687`), arbre propre, aucun stash, branche `main`.
- **Numéro** : D332 — pris en lisant la dernière ligne du registre de `ZWADJ_CONTINUITE.md` (D331) ; `git grep -w D332` : 0 occurrence.
- **Ordre des commits de ce lot** (règle de `AGENTS.md`, D328) : (1) ce fichier, SEUL ; (2) la sortie de la lecture adverse (instrument, sortie), puis la première passe D277, **avant toute écriture d'autorité** ; (3) les `.md` d'autorité, **les arbitrages de Ko en première écriture, mot pour mot, seuls dans leur commit**, puis les décisions du relecteur ; la table « Fichiers attendus » y est recopiée **à l'identique**, extensions comprises ; (4) toute extension : un commit propre qui l'ajoute à ce fichier, **AVANT** le commit du fichier qu'elle couvre.
- **Pourquoi des extensions sont PRÉVUES** : les pièces des portes, des campagnes, des captures, des rouges et des verts portent des noms qui **dépendent de la mesure**. Elles sont déclarées **en chemins complets, un par un**, par des extensions commitées avant leur versement — jamais par un préfixe (un préfixe rend « 0 non déclaré » vrai par construction : constat P-C1 de D328).

## Ce que le lot fait, et ce qu'il ne fait pas

**Le défaut** (constat 1 de Ko du 08/10/2026, D327) : le tableau du PDF a trois colonnes (Prestation / Qté / Montant) et la colonne « Qté » est vide quand le devis n'a aucune prestation ; les lignes du récapitulatif (location, prestations, total, acompte) n'ont qu'un libellé et un montant, sont décalées vers la droite et ne s'alignent sous aucune colonne. La langue du PDF est décidée par une règle (« langue du client, sinon langue de l'interface du pro ») dont la branche « langue du client » n'a **aucun chemin de production** (un devis du parcours sur place n'a jamais de `clientId`) ; Ko l'a remplacée (décision A de D327) par une boîte de dialogue au téléchargement. Le titre de la page « Mes salles » ne suit pas le menu quand il n'y a qu'une salle (observation de D331, S-11 ratifiée par Ko le 14/10/2026).

**Le correctif** (rien d'autre) :
1. **le tableau des prestations** : une ligne par prestation choisie ; **aucune colonne vide** (la colonne de détail n'existe que si au moins une ligne a un détail ; sans prestation, pas de tableau) ; le détail suit DB-9 : « par invité » et « à l'unité » → la quantité ; « à paliers » → le nom du palier, **lu sur la ligne STOCKÉE** (décision 3 du relecteur) ; « fixe » → rien ;
2. **le récapitulatif** (location, prestations, total, acompte) : un **bloc séparé**, de toute la largeur, libellés alignés au début et montants alignés à la fin ;
3. **la boîte de dialogue de langue** aux cinq boutons qui produisent le PDF : « Français » / « العربية » (chacun écrit dans sa propre langue) et « Annuler » ; **annuler n'enregistre rien** (aucun canal de remise), ne télécharge rien, n'ouvre pas la fenêtre de remise (décision 2 du relecteur) ;
4. **le retrait de la branche « langue du client »** : `chooseDocumentLocale`, `DocumentLocaleBranch`, le champ `branch`, la lecture de `users.locale` — code, tests, gardes de neutralisation, **sans code mort** ;
5. **S-11** : le titre de « Ma salle / Mes salles » suit le menu (une seule règle, importée par les deux).

**Ce que le lot ne fait pas** : aucune migration ; **aucun contrat d'API neuf** (`locale` existe : `GET /quotes/:id/document?locale=<fr|ar>`) — si le correctif en exigeait un, il s'arrêterait et demanderait ; **l'étape « nom manquant » de la boîte n'est PAS de ce lot** (L35-4) ; **le nom du client sur le PDF n'est pas touché ni jugé** (L35-4) ; la référence et le nom de fichier (L35-3) ; la condition de clôture du rang 33 reste OUVERTE (le nom du client vient avec L35-4).

## Fichiers attendus — chemins COMPLETS

| fichier | pour |
|---|---|
| `docs/preuves/D332/table-ouverture.md` | cette table (premier commit, seul) |
| `docs/preuves/D332/lecture-adverse/confronter-d331.py` | l'instrument de la lecture adverse de D331 |
| `docs/preuves/D332/lecture-adverse/confronter-sortie.txt` | sa sortie, versée avant toute écriture d'autorité |
| `docs/preuves/D332/passe-d277/balayage.py` | la passe D277, les deux sens (copie à l'octet de celle de D331) |
| `docs/preuves/D332/passe-d277/motifs.txt` | ses motifs |
| `docs/preuves/D332/passe-d277/balayage-1-AVANT-ECRITURE.txt` | sa première passe, avant toute écriture d'autorité |
| `docs/preuves/D332/passe-d277/balayage-final.txt` | sa dernière passe |
| `docs/preuves/D332/audit-secrets-d332a.txt` | audit de secrets scellé, avant les pièces de code |
| `docs/preuves/D332/tri-audit-d332a.txt` | son tri différentiel contre la dernière sortie scellée |
| `docs/preuves/D332/audit-secrets-d332b.txt` | dernier audit scellé, après la dernière écriture |
| `docs/preuves/D332/tri-audit-d332b.txt` | son tri différentiel |
| `docs/preuves/D332/releve-lignes/sonde-lignes.py` | le relevé de ce que contient une ligne de devis stockée (décision 3) : `SELECT` seulement, transaction en lecture seule, refus d'écriture prouvé, calibré à deux bras |
| `docs/preuves/D332/releve-lignes/sonde-lignes-sortie.txt` | sa sortie : le schéma (colonne `lines`), le code qui l'écrit, et les devis réels de la base de développement |
| `apps/api/src/documents/quote-document.ts` | le modèle du document : tableau sans colonne vide, détail selon DB-9, récapitulatif en bloc séparé |
| `apps/api/src/documents/quote-document-source.ts` | la ligne lue porte `pricingType` et le nom du palier stocké ; le client ne porte plus de langue |
| `apps/api/src/documents/quote-document-source.prisma.ts` | l'adaptateur de lecture : la forme stockée est validée (une forme inattendue LÈVE) ; `users.locale` n'est plus sélectionnée |
| `apps/api/src/documents/quote-document-policy.ts` | `chooseDocumentLocale` et `DocumentLocaleBranch` sont RETIRÉS |
| `apps/api/src/documents/quote-document.service.ts` | la langue appliquée est celle demandée ; plus de `branch` |
| `apps/api/src/documents/quote-document.controller.ts` | la description du contrat ne parle plus de la langue du client |
| `packages/i18n/messages/fr.json` | catalogue français : libellés du tableau, du récapitulatif, de la boîte de langue |
| `packages/i18n/messages/ar.json` | catalogue arabe : les mêmes clés (parité) |
| `packages/ui/src/choice-dialog.tsx` | NOUVEAU — la fenêtre de choix partagée (même mécanique que `ConfirmDialog` : un seul piège de focus, un seul rendu de fenêtre) |
| `packages/ui/src/index.ts` | l'export de la fenêtre de choix |
| `apps/pro/src/dashboard/walkin-journey.tsx` | les cinq boutons ouvrent la boîte ; la langue choisie part au serveur ; l'annulation n'écrit rien |
| `apps/pro/src/shell/venues-label.ts` | NOUVEAU — la règle « Ma salle / Mes salles » en UN endroit (fonction pure) |
| `apps/pro/src/shell/pro-nav.tsx` | le menu importe la règle |
| `apps/pro/src/venues/venue-list-page.tsx` | le titre de la page importe la même règle (S-11) |
| `apps/api/src/documents/quote-document.spec.ts` | le modèle : aucune colonne vide, DB-9 par type, le palier stocké, le récapitulatif séparé, l'échappement, la valeur stockée |
| `apps/api/src/documents/quote-document-policy.spec.ts` | les tests de la branche « langue du client » sont retirés avec elle |
| `apps/api/src/documents/quote-document.service.spec.ts` | la langue appliquée est la langue demandée, même pour un devis lié à un compte de l'autre langue |
| `apps/api/test/int/quote-document.int-spec.ts` | l'intégration : le PDF réel d'un devis à paliers et à quantités, dans les deux langues |
| `apps/pro/src/dashboard/walkin-journey.test.tsx` | les tests de remise passent par la boîte ; l'annulation, la langue choisie, le canal retenu |
| `apps/pro/src/ui-choice-dialog.test.tsx` | NOUVEAU — la fenêtre de choix partagée (rôle, nom, focus, Échap, langue et direction des boutons) |
| `apps/pro/src/shell/venues-label.test.ts` | NOUVEAU — la règle du libellé, son seuil, le chargement |
| `apps/pro/src/venues/venue-list.test.tsx` | le titre de la page suit le menu |
| `apps/pro/src/App.test.tsx` | le titre de `/salles` sans salle (« Ma salle ») |
| `e2e/specs/r33-remise-devis.e2e.ts` | l'e2e : la boîte (choix français, choix arabe, annulation) et le téléchargement |
| `neutralisation/neutralize-r38.py` | NOUVEAU — le harnais de neutralisation du lot |
| `neutralisation/neutralize-r33.py` | les cibles de la branche retirée sont retirées ou réorientées, par écrit ; les ancres du modèle réécrit sont revérifiées |
| `ZWADJ_CONTINUITE.md` | arbitrages de Ko du 14/10 (première écriture), décisions du relecteur, ordre des rangs, point d'entrée du rang 38, section D332, bloc D332 de la méthode, registre |
| `AGENTS.md` | la règle de D270 ANNOTÉE (limite de CINQ, trois conditions), l'exception de D311 annotée « sans objet sous la limite de 5 », la chaîne du compteur (UN → DEUX) |
| `ZWADJ_BACKLOG.md` | « Reports du 14/10/2026 — rang 38 » ; deux entrées de D331 fermées avec renvoi (le constat de Ko sur « Ma salle » ; le titre « Mes salles ») |

### Fichiers CONDITIONNELS — créés ou modifiés seulement si le cas se produit, sinon dits absents au rapport

| fichier | condition |
|---|---|
| `docs/preuves/D332/lecture-adverse/confronter-sortie-passe-1-AVANT-CORRECTIFS.txt` | la première passe de l'instrument porte un ✗ qui est un défaut de l'instrument (patron de D327 à D331) |
| `docs/preuves/D332/lecture-adverse/defauts-instrument.txt` | un tel défaut est trouvé |
| `neutralisation/neutralize-journey.py` | une ancre de cible citant `walkin-journey.tsx` est périmée par ce diff (leçon D286) ; fichier par fichier, par extension, avec la mesure qui le prouve |
| `neutralisation/neutralize-r32.py` | idem (cite `walkin-journey.tsx`) |
| `neutralisation/neutralize-r37.py` | idem (cite `venue-list-page.tsx`) |
| `apps/api/test/int/pdf-renderer.int-spec.ts`, `apps/api/src/documents/playwright-pdf.renderer.spec.ts` | la forme du devis de test (`locale` du client) casse à la compilation |
| `apps/pro/src/dashboard/remittance.ts`, `apps/pro/src/dashboard/remittance.test.ts` | une décision pure de la boîte (ouvrir / annuler / choisir) est mieux placée dans le module pur que dans le composant (D187, D205) |
| `e2e/fixtures/harness.ts` | un auxiliaire de l'e2e (services de chaque type de tarification) ne peut pas vivre dans la spec |
| `packages/types/src/quote.ts` | la forme partagée (`QuoteDocumentLocale`, `quoteDocumentQuerySchema`) devait changer — ce qui serait un contrat : le lot s'arrêterait et demanderait |

*(Un diagnostic NON certifiant, s'il est nécessaire, se déclare lui aussi par extension, fichier par fichier : aucune ligne de cette table ne nomme un répertoire.)*

### Fichiers à déclarer PAR EXTENSION, en chemins complets, avant leur versement

| famille | contenu |
|---|---|
| les rouges et les verts | `docs/preuves/D332/rouge/…` et `docs/preuves/D332/vert/…` : un rouge LU contre l'état d'avant pour chaque point (assertion native), puis le vert ; l'extracteur calibré |
| les portes | `docs/preuves/D332/portes/<porte>.txt` : les six portes, avec leurs chiffres, **extraits** (jamais le journal brut des suites qui portent des jetons) |
| les campagnes | `docs/preuves/D332/neutralisation/…` : la sortie de `neutralize-r38.py`, l'UNION des campagnes (décision 1 du relecteur) et le script calibré qui la calcule, versé avec sa sortie AVANT de jouer les campagnes |
| les captures | `docs/preuves/D332/navigateur/…` : la boîte de langue et les pages rastérisées de trois devis réels (sans prestation ; à prestations fixes ; à quantités et à palier), en français et en arabe |

### Extensions de la table

Chaque extension s'ajoute ici, dans un commit propre, avec son motif, AVANT le commit du fichier qu'elle couvre. *(Aucune à l'ouverture.)*

## Modes de défaillance — écrits AVANT toute ligne de code

Chacun nomme ce qui peut mal tourner, le test qui le mesure, et le sort de la cible de neutralisation. Aucune valeur attendue ne s'écrit de mémoire : les textes d'écran sont relevés dans `packages/i18n/messages/fr.json` et `ar.json`, les montants viennent du formateur partagé (`formatDZD`), les types de tarification de l'énumération partagée (`ServicePricingType`).

| id | mode de défaillance | mesure prévue |
|---|---|---|
| **P-1** | **une colonne vide** : toutes les lignes sont « fixe » (ou il n'y en a aucune) et la colonne de détail s'imprime quand même, vide | modèle pur, trois cas — aucune prestation (pas de tableau), toutes « fixe » (deux colonnes), mixte (trois) ; rouge d'abord contre l'état d'avant (la colonne « Qté » s'imprime toujours) |
| **P-2** | **la quantité imprimée là où elle n'existe pas** (« fixe » et « à paliers » valent 1) ou **omise là où elle existe** (« par invité », « à l'unité ») ; ou la règle suit la VALEUR au lieu du TYPE | un test par type de tarification, dont un « à l'unité » de quantité 1 (la règle suit le type, pas la valeur) ; cible : la règle inversée |
| **P-3** | **le nom du palier lu ailleurs que sur la ligne stockée** (le catalogue actuel de la salle), absent, ou **dans la mauvaise langue** ; une ligne « à paliers » sans nom stocké imprimée à moitié | le modèle ne lit QUE le devis (garde de SOURCE : aucun import du catalogue, de `pricing-engine`, de `service-pricing`) ; le nom est celui de la locale du document ; une ligne « à paliers » sans nom stocké **LÈVE** (une forme inattendue ne s'imprime pas à moitié) ; décision 3 : si le nom n'était pas stocké, le lot s'arrêtait et demandait — relevé, il l'est |
| **P-4** | **un montant recalculé** (prix unitaire × quantité) à l'impression | fixture dont le total de ligne **n'est pas** le produit (D209 n° 6 : la valeur attendue vient du stocké) ; le PDF imprime la valeur stockée ; la cible M-3 de `r33` reste vivante |
| **P-5** | **le récapitulatif se confond avec le tableau**, ou ne s'aligne pas : lignes décalées vers la droite comme le constat 1 de Ko | un bloc séparé (titre, quatre lignes dans l'ordre location, prestations, total, acompte), de toute la largeur ; le DOM l'énumère, le CSS place (propriétés logiques) ; la rastérisation, que Ko regarde (décision 4) |
| **P-6** | **un total qui ne se retrouve pas** : location + prestations ≠ total imprimé | limite écrite, pas une garde : le PDF **n'additionne pas**, il imprime les quatre valeurs stockées (règle des montants) |
| **P-7** | **un nom de palier hostile** inséré sans échappement | fixture hostile sur le nom du palier ET sur le nom de la prestation ; cible : `raw()` |
| **P-8** | **le document arabe** : `×` et nombres mal ordonnés, tableau lu de gauche à droite, colonnes inversées | `lang="ar"` ⇒ `dir="rtl"` ; propriétés CSS logiques ; rastérisation arabe regardée par Ko |
| **P-9** | **beaucoup de prestations** : une ligne coupée entre deux pages, l'en-tête non répété, le récapitulatif orphelin | `break-inside: avoid` sur les lignes et le récapitulatif ; un devis de vingt-cinq lignes rendu par le VRAI moteur, nombre de pages et position du récapitulatif relevés |
| **P-10** | **annuler enregistre quand même** : « Annuler », Échap ou le clic sur le fond déclenche `deliver` ou `document`, ou ouvre la fenêtre de remise | faux serveur qui journalise les appels : zéro `deliver`, zéro `document`, aucune fenêtre de remise, aucun fichier ; e2e : zéro téléchargement ; cible : l'annulation appelle la remise |
| **P-11** | **la langue envoyée n'est pas celle cliquée** : « Français » sur une page arabe envoie `ar` (la langue de l'interface reste le repli), ou l'inverse | le test exige `document(id, "fr")` pour « Français » **sur une page arabe** et `"ar"` pour « العربية » **sur une page française** ; cible : la langue de l'interface rétablie |
| **P-12** | **le canal retenu est périmé** : la boîte ouverte pour le SMS, annulée, rouverte pour l'impression enregistre le SMS | séquence de test : SMS, annuler, impression, « Français » ⇒ `deliver(id, { sentVia: "PRINT" })` |
| **P-13** | **un des cinq boutons n'ouvre pas la boîte**, ou la boîte s'ouvre pour un canal grisé, ou deux fois (double clic) | le test boucle sur `QUOTE_SENT_VIA_ORDER` (l'autorité), cinq canaux × deux langues ; un canal grisé n'ouvre rien ; `busy` verrouille |
| **P-14** | **la boîte est inaccessible** : pas de rôle `dialog`, pas de nom, le focus se perd, Échap ne ferme pas ; les boutons de langue sans `lang`/`dir` (l'arabe lu en lettres non liées par un lecteur d'écran) | rôle, nom accessible, focus initial, Échap, `lang` + `dir` ; les libellés « Français » et « العربية » sont **identiques dans les deux catalogues** (chacun dans sa langue) |
| **P-15** | **du code mort après le retrait** : `chooseDocumentLocale`, `DocumentLocaleBranch`, `branch`, `users.locale` lue | garde de SOURCE : plus aucune occurrence dans `apps/api/src` ; un compte client `ar` ne force plus l'arabe (rouge d'abord : l'état d'avant rend `ar` pour une demande `fr`) |
| **P-16** | **le titre ne suit pas le menu**, ou la règle existe deux fois et diverge ; ou le titre clignote au chargement | UNE fonction pure importée par le menu ET la page (garde de SOURCE) ; test : 0, 1 salle ⇒ « Ma salle » ; 2 ⇒ « Mes salles » ; repasse au singulier après la suppression d'une seconde salle SANS rechargement ; arabe : « قاعتي » / « قاعاتي » |
| **P-17** | **un contrat d'API neuf s'est glissé** (une nouvelle route, un nouveau paramètre, un champ de réponse) | le diff ne touche pas `packages/types/src/quote.ts` ni `packages/api-client` ; sinon le lot s'arrête et demande |
| **P-18** | **les campagnes que le lot touche ne sont pas toutes rejouées** : le tri `lancer-campagnes.py` ne retient pas une campagne qui cite le fichier par un chemin relatif à son paquet (30 campagnes sur 35, D331) | décision 1 du relecteur : l'**UNION** de ce que retient le tri et de ce que le script calibré trouve (chemin relatif au paquet ET nom de fichier), calculée et versée AVANT de jouer |

⚠ **Limite écrite d'avance** : la boîte de langue n'écrit ni ne demande le nom manquant du client (L35-4) ; le PDF imprime le nom du compte lié au devis s'il y en a un, sinon « — », comme avant — c'est le constat 2 de Ko, qui n'est pas de ce lot. Le cas de plusieurs prestations de même nom, ou d'un nom de palier très long, est dit par la rastérisation, pas par une règle de troncature.
