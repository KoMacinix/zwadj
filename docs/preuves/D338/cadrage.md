# D338 — cadrage de L36-2, « le devis brouillon non officiel » — écrit le 27/10/2026, AVANT toute ligne de code

Lot : rang 43 (consigne du relecteur, adoptée par Ko le 27/10/2026). Méthode **RENFORCÉE** (DR4 de D336) sous la pause de certification. **Ce cadrage conclut que la règle d'arrêt (consigne, 4 b) JOUE** : DR4 ne tranche pas cinq questions — quatre de produit et un écart de schéma, DR8 (section 6). Il est commité seul, aucun code n'est écrit, le lot est **documentaire** et le rang 43 reste **OUVERT**.

Départ : `origin/main` = `985fd20` à l'ouverture, arbre propre, aucun stash ; numéro D338 (dernière ligne du registre : D337). Toutes les **mesures** citées sont dans `docs/preuves/D338/mesures-cadrage.txt` (treize, sortie brute, chaque commande imprimée avant sa sortie) et `docs/preuves/D338/spike-filigrane/`. Une affirmation est écrite **MESURÉE** (avec sa pièce), **LUE** (dans un fichier, numéro de ligne) ou **INFÉRÉE** (déduite, à mesurer par le code) — jamais autrement.

---

## 1. État des lieux mesuré (consigne 4 a, point 1)

| objet | ce qui est aujourd'hui | pièce |
|---|---|---|
| **Création** `QuotesService.create` | `quotes.service.ts:175` : vérifie la salle du pro, décide la fiche et la copie du nom (`copieDuClient`), chiffre (`price`), puis `creerTeteDeChaine` en UNE transaction. | LU |
| **La fiche est facultative** | `quote.ts:371` : `clientRecordId` est `.optional()`. Des noms SANS fiche sont refusés, une fiche SANS nom aussi (`quote.ts:376-384`, rang 41). Aucune `CHECK` ne lie les noms à la fiche en base : la migration de rang 41 n'ajoute que trois colonnes à `quotes`. | M7 |
| **Le compteur et la référence** | Une ligne `quote_number_counters` par (salle, année), incrémentée atomiquement dans la transaction de création (`quote-store.prisma.ts`, `incrementerCompteur`) ; une révision recopie année et numéro de sa tête et ne touche aucun compteur (rang 39, D333). `formatQuoteReference` (`quote.ts:319`) rend `DEVIS-2026-0001-0089 v1`. | LU |
| **Qui bâtit la référence** | DEUX sites de production la bâtissent : le DTO (`quotes.service.ts:592`) et la lecture du document (`quote-document-source.prisma.ts:80`) ; DEUX en dérivent le NOM du fichier (`quote-document.service.ts:60` côté serveur, `walkin-journey.tsx:706` côté écran) par `quoteDocumentFilename` (`quote.ts:337`), dont le motif `^(DEVIS-\d{4}-\d{4,}-\d{4,}) v(\d+)$` **lève** (`TypeError`) sur toute autre chaîne. | M9 |
| **Remise** `deliver` | `quotes.service.ts:216` : check-and-set `UPDATE … WHERE id AND status IN (DRAFT, SENT)` ; écrit **exactement deux colonnes** : `sent_via` et `sent_at` (`quote-store.prisma.ts`, `marquerRemis` → `checkAndSet({ sentVia, sentAt })`). Aucun statut ne change. | LU |
| **Révision** `revise` | `quotes.service.ts:253` : autorisée depuis DRAFT ou SENT (`QUOTE_OPEN_STATUSES`), verrou `SELECT … FOR UPDATE` sur la tête de chaîne, version = `MAX + 1`. **Autorisée depuis N'IMPORTE QUELLE version ouverte**, pas seulement la dernière (aucun contrôle de version dans `revise`). Aucun drapeau n'existe : rien à hériter aujourd'hui. | LU |
| **Conversion** `convert` | `quotes.service.ts:302` : depuis DRAFT/SENT, refuse si une réservation existe déjà ; écrit **la réservation seule** (`quote-store.prisma.ts:190`, `quoteId: donnees.quoteId`) ; **le devis ne bouge pas**. | M5, LU |
| **Annulation** `cancel` | `quotes.service.ts:394` : check-and-set depuis DRAFT/SENT vers CANCELLED. | M1 |
| **Qui écrit ACCEPTED** | **PERSONNE**. Les seules occurrences de `QuoteStatus.ACCEPTED` en production sont des lectures (entonnoir, politique du PDF). Les seules cibles de la table des transitions sont `null` et CANCELLED. Aujourd'hui sont écrits : DRAFT (défaut à la création) et CANCELLED. | M1, M2 |
| **Les contraintes qui existent déjà sur `quotes`** | `quotes_sent_at_coherent` (hors DRAFT/CANCELLED, `sent_at` est exigé), `quotes_accepted_at_coherent`, `quotes_sent_via_not_blank`, deux index uniques partiels (un SENT, un ACCEPTED par chaîne). | M8 |
| **L'écran du pro** | Six étapes `contact → client → date → slot → services → quote` (`walkin-journey.tsx:161`). L'étape Contact exige un numéro OU un e-mail valides (`identifierBlockers` : les deux vides rendent `needIdentifier`, le bouton « Continuer » est grisé) ; `termsReady` exige une fiche (`:412`). **L'écran ne peut donc pas produire un devis sans fiche** ; l'API, elle, le peut. | M6, LU |
| **Le journal** `audit_logs` | Le modèle existe (`schema.prisma:1432`) ; **zéro écrivain** dans le code de production. La ligne d'audit de la promotion serait la PREMIÈRE écriture de la table. | M3 |
| **Les déclencheurs SQL** | Un seul précédent : `venues_number_immutable` (`20261015100000_venue_number`, rang 39). | M4 |
| **Les numéros** | Aucun code ne supprime un devis ; la clé étrangère de la salle est `ON DELETE RESTRICT`. | M11 |
| **Le PDF d'un brouillon** | `decideQuoteDocument` laisse imprimer un devis OUVERT : un brouillon s'imprime déjà (rien à changer dans la politique). Le moteur coupe JavaScript et le réseau ; `page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true })`. | M12 |
| **Un lecteur de PDF** | **Aucun** dans le dépôt (ni `pdfjs`, ni `pdf-parse`…) ; `apps/api/test/int/pdf-inspect.ts` lit des octets bruts (pages, polices, titre). | M13 |

---

## 2. La forme (consigne 4 a, point 2)

### 2.1 La colonne et la `CHECK` — dans la tranche RATIFIÉE, colonnes fixées par la lecture de `deliver()`

```sql
ALTER TABLE "quotes" ADD COLUMN "is_official" boolean NOT NULL DEFAULT true;

ALTER TABLE "quotes" ADD CONSTRAINT "quotes_unofficial_never_remitted"
  CHECK ("is_official" OR ("status" IN ('DRAFT', 'CANCELLED')
                           AND "sent_via" IS NULL AND "sent_at" IS NULL AND "accepted_at" IS NULL));
```

- **Pourquoi ces colonnes (DR4 : « colonnes exactes à fixer par la lecture de `deliver()` »)** : `deliver` écrit `sent_via` et `sent_at` et rien d'autre (LU) ; « marqué remis » = l'une des deux renseignée (D162 : `sent_via` atteste la remise, `sent_at` dit quand). « Accepté » = le statut ACCEPTED (et `accepted_at`, qui n'a de sens qu'avec lui, `quotes_accepted_at_coherent`). Les statuts admis pour un devis non officiel sont ceux que le code a le droit d'écrire (`QUOTE_WRITABLE_STATUSES` = DRAFT, ACCEPTED, CANCELLED) **moins ACCEPTED** : **DRAFT et CANCELLED** ; les statuts hérités (SENT, SUPERSEDED, DECLINED) ne peuvent pas exister sur un brouillon.
- **Devis existants inchangés — INFÉRÉ, à mesurer par le code** : `DEFAULT true` rend le premier terme vrai pour toute ligne existante ; `ADD CONSTRAINT` ne peut donc pas échouer sur une base non vide. La preuve D123 est un bloc de `migration-non-empty.int-spec.ts` (des devis semés avant la migration dans CHAQUE état, hérités compris, traversent intacts, ligne à ligne) — pas écrit dans ce lot.
- **La promotion** est un `UPDATE … SET is_official = true`. **La base n'interdit pas `true → false`** (une `CHECK` n'a pas de mémoire) : le code n'écrit jamais ce sens, aucune route ne le permet ; une garde de source le dirait. Un déclencheur pourrait le fermer (précédent M4) — **non proposé** : hors tranche ratifiée.
- **« La promotion exige une fiche avec numéro ou e-mail »** : la base ne peut pas le garantir par `CHECK` sur `quotes` — les devis officiels d'avant n'ont PAS de fiche et l'ont toujours été. Le garant est le service (la fiche appartient au pro, `ficheDuPro`) et la base de la FICHE, qui refuse déjà une fiche sans numéro ni e-mail (`pro_client_records_identifier_present`, M7).

### 2.2 La conversion — ce qu'une `CHECK` ne peut pas faire, et ce qui la remplace

**Une `CHECK` ne lit que sa propre ligne.** La conversion n'écrit que `bookings` (M5) et « le devis ne bouge pas » (décision de Q2) : aucune `CHECK` sur `quotes` ne la voit, et une `CHECK` sur `bookings` ne voit pas le drapeau du devis. DR4 écrit « garde serveur + CHECK en base » : pour la conversion, la `CHECK` seule n'existe pas. Trois remplaçants — **tous trois sortent de la tranche [L36-2] ratifiée, donc DR8 : la session s'arrête et présente l'écart** (question Q5, section 6) :

| | ce que c'est | ce que ça touche |
|---|---|---|
| (a) clé étrangère composite | une colonne neuve `bookings.quote_is_official`, un `UNIQUE (id, is_official)` sur `quotes`, et une clé étrangère `(quote_id, quote_is_official) → quotes(id, is_official)` qui REMPLACE `bookings_quote_id_fkey` (`ON DELETE SET NULL`) ; une `CHECK` qui interdit `false` | la table `bookings` (chemin de l'argent), une migration sur une base non vide, l'unique écrivain `quote-store.prisma.ts:190` |
| (b) un déclencheur | `BEFORE INSERT ON bookings` : refuse une réservation dont `quote_id` désigne un devis non officiel (précédent : `venues_number_immutable`) | un objet SQL neuf, aucune colonne neuve ; **aucune course possible** (un devis officiel ne redevient jamais brouillon) |
| (c) la garde du serveur seule | `convert` refuse un brouillon avant d'écrire ; un test le prouve ; exception **écrite** à « garanti par la BDD » (comme `ServicePricing`, `AGENTS.md`) | rien dans la base ; un futur code qui contournerait `convert` ne serait pas arrêté |

---

## 3. Les contrats NOMMÉS par la consigne — forme exacte proposée

Nommés par la consigne (4 a, point 3), donc sans « s'arrêter et demander » pour leur seule existence ; leur forme est écrite ici. ⚠ Tout ce qui suit est une **proposition de la session**, à ratifier ; ce qui dépend d'une question de la section 6 est marqué.

1. **Le champ de création d'un devis non officiel** — `POST /venues/:id/quotes` reçoit `isOfficial` : `z.literal(false).optional()`. Absent = officiel, **exactement comme aujourd'hui** ; `true` est REFUSÉ (400) : il n'y a qu'une façon de dire « officiel » (l'omettre). `.strict()` inchangé. *(Ce qu'un brouillon peut porter — une fiche, un nom — dépend de Q2.)*
2. **La route de promotion** — `POST /quotes/:id/promote`. Corps : la forme de K-4, `{ clientRecordId, clientNameAr?, clientNameLatin? }` (au moins un nom), `.strict()`. Une transaction : verrou de la tête de chaîne (comme `revise`) ; la version doit être la dernière ; `UPDATE quotes SET is_official = true, client_record_id, client_name_* WHERE id AND NOT is_official AND status = 'DRAFT'` (**compte = 1 exigé**, D305) ; UNE ligne `audit_logs` ; relecture. Réponse 201 : le `QuoteDTO` (référence `DEVIS-…`). La copie du nom suit les règles de rang 41 (`copieDuClient`, fiche liée = ses noms). Chemin en toutes lettres dans le client d'API (D182). **Même ligne, même numéro** : aucun compteur n'est touché.
3. **La référence** — `BROUILLON-2026-0001-0089 v1` : le préfixe remplace `DEVIS`, année, numéro de salle, numéro du devis et version sont ceux du devis. `formatQuoteReference` reçoit un paramètre (`official`, défaut vrai) : **une seule formule** (D333), les deux sites de bâtissage déjà listés (section 1). `QuoteDTO.isOfficial: boolean` (obligatoire). Après la promotion, la même ligne s'écrit `DEVIS-2026-0001-0089 v1`.
4. **Le nom du fichier** — `BROUILLON-2026-0001-0089_fr_v1.pdf` (le préfixe de la référence, jamais `BROUILLON_DEVIS-…`) : `QUOTE_REFERENCE_PATTERN` accepte `(DEVIS|BROUILLON)` et `quoteDocumentFilename` continue de LEVER sur le reste.
5. **Les refus** (codes ; messages FR et AR à écrire dans les deux catalogues, parité exigée) :

| situation | HTTP | code | message FR proposé | message AR proposé |
|---|---|---|---|---|
| remettre ou convertir un brouillon | 409 | `QUOTE_NOT_OFFICIAL` (neuf) | « Ce devis est un brouillon non officiel : il ne peut être ni remis au client ni converti en réservation tant qu'il n'est pas rendu officiel. » | «هذا العرض مسودة غير رسمية: لا يمكن تسليمه للزبون ولا تحويله إلى حجز قبل اعتماده رسميًا.» |
| rendre officiel un devis déjà officiel | 409 | `QUOTE_ALREADY_OFFICIAL` (neuf) | « Ce devis est déjà officiel. » | «هذا العرض رسمي بالفعل.» |
| rendre officiel une version qui n'est plus la dernière | 409 | `QUOTE_VERSION_NOT_ACTIVE` (existant, porte `latestVersion`) | message existant | message existant |
| rendre officiel un devis clos | 409 | `QUOTE_STATUS_CONFLICT` (existant, porte le statut) | message existant | message existant |
| fiche d'un autre pro, ou introuvable | 404 | `CLIENT_RECORD_NOT_FOUND` (existant) | message existant | message existant |
| fiche liée à un compte, nom différent | 409 | `CLIENT_RECORD_LINKED` (existant) | message existant | message existant |
| corps sans fiche ou sans nom | 400 | `quote.validation.clientRecordRequired` / `clientNameRequired` (existants) | messages existants | messages existants |

**L'ordre des refus est une règle métier** (leçon de S11-a, `AGENTS.md` : « un ordre de refus se mesure sur un cas doublement fautif ») : introuvable (404) → statut (409 `QUOTE_STATUS_CONFLICT`) → pas officiel (409 `QUOTE_NOT_OFFICIAL`). Un devis annulé ET brouillon répond « statut » : c'est l'information utile (« clos »). Un test sur ce cas doublement fautif le fixe.
6. **L'acceptation** n'a aucune route : aucun refus HTTP neuf ; la `CHECK` de la section 2.1 la refuse en base pour un écrivain futur (E3, en pause).

---

## 4. Les écrans (consigne 4 a, point 4)

| question | réponse | statut |
|---|---|---|
| Où le pro CRÉE un brouillon | **NON TRANCHÉ** : l'étape Contact refuse aujourd'hui d'avancer sans numéro ni e-mail (M6) ; une porte de sortie « le client ne donne ni l'un ni l'autre » n'existe nulle part dans DR4 ni dans les mots de Ko | **Q1** |
| Si le brouillon porte un nom | **NON TRANCHÉ** : le rang 41 refuse un nom sans fiche | **Q2** |
| Où le pro PROMEUT | sur l'étape finale « Devis » : un bloc « Brouillon non officiel » dont l'action « Ajouter les coordonnées du client » rouvre Contact puis Client ; au « Continuer » de Client, l'écran appelle la promotion (au lieu de la création de la fiche seule). Détail à écrire après Q1 et Q2. | proposé |
| Ce que le pro VOIT d'un brouillon | un bandeau visible « BROUILLON — non officiel » avec la référence `BROUILLON-…` ; **aucun bouton de canal de remise, aucun bouton de conversion** (ils sont absents, avec une raison écrite, pas seulement grisés) ; UN bouton « Télécharger le brouillon (PDF) » qui appelle `GET /quotes/:id/document` **sans** enregistrer de remise (la remise est interdite à un brouillon, `sent_via` reste NULL) | proposé — décision de la session, à ratifier |
| Le PDF d'un brouillon | le mot « BROUILLON » (« مسودة » en arabe) en filigrane sur chaque page, le préfixe `BROUILLON-` dans la référence et le nom du fichier ; un devis officiel n'a AUCUN filigrane | proposé |

⚠ **La phrase de DR4 « le papier remis au client et le devis officiel portent le même numéro »** est ce qui justifie le bouton de téléchargement seul : le papier remis au client EST le PDF du brouillon.

---

## 5. Les modes de défaillance (consigne 4 a, point 5) — écrits AVANT le code, chacun avec sa garde et sa mesure

Pour chacun : **la garde du serveur ET la garde de la base** quand la base peut en porter une ; le test qui rougit (écrit avant le code, D334 item 5) ; la cible du harnais `neutralize-r43.py` qui l'arracherait. *(Rien de ce qui suit n'est écrit ni mesuré dans ce lot : c'est le plan que le code suivrait.)*

| # | mode de défaillance | garde serveur | garde base | ce qui le mesure |
|---|---|---|---|---|
| D-1 | **remettre un brouillon** | `deliver` refuse (`QUOTE_NOT_OFFICIAL`) ; la condition `is_official` est AUSSI dans le `WHERE` du check-and-set | `quotes_unofficial_never_remitted` : un `UPDATE sent_via/sent_at` direct est refusé (SQLSTATE 23514) | int : 409 + aucune colonne écrite ; int : SQL direct refusé ; cible : retirer la condition |
| D-2 | **convertir un brouillon** | `convert` refuse avant d'écrire | selon **Q5** ((a) ou (b) refusent l'INSERT direct ; (c) rien) | int : 409 + aucune ligne `bookings` ; int : INSERT direct (selon Q5) |
| D-3 | **accepter un brouillon** | aucune route, aucun écrivain (M2) | la `CHECK` refuse `status = 'ACCEPTED'` | int : `UPDATE … SET status='ACCEPTED'` direct refusé |
| D-4 | **promotion sans fiche, ou fiche sans numéro ni e-mail** | corps `.strict()` : fiche et un nom exigés (400) ; fiche d'un autre pro → 404 indistinct | la fiche refuse déjà l'absence de numéro ET d'e-mail (`pro_client_records_identifier_present`, M7) | unit + int ; une fiche sans contact ne PEUT PAS exister : test de la contrainte |
| D-5 | **deux promotions simultanées** | check-and-set `WHERE NOT is_official`, compte = 1 exigé ; le perdant rend 409 `QUOTE_ALREADY_OFFICIAL` | — | int concurrent : N appels parallèles = **exactement un 201** et **exactement une ligne d'audit** |
| D-6 | **promotion d'une version qui n'est plus la dernière** | verrou de la tête de chaîne puis comparaison avec `MAX(version)` : 409 `QUOTE_VERSION_NOT_ACTIVE` + `latestVersion` ; le même verrou que `revise` les sérialise | — | int : v1 brouillon, v2 créée, promotion de v1 refusée ; int : promotion ‖ révision |
| D-7 | **révision d'un brouillon** | **dépend de Q3** ; ⚠ `revise` accepte aujourd'hui une version ANCIENNE : le drapeau hérité est celui de la version la plus récente de la chaîne (règle proposée), mesuré sur un cas doublement fautif | `CHECK` : un brouillon reste sans `sent_*` | int : v1 brouillon → v2 brouillon, même numéro ; v1 brouillon, v2 promue, révision de v1 → hérite de v2 |
| D-8 | **numéros sautés ou réutilisés** | un brouillon passe par `creerTeteDeChaine` et le MÊME compteur, dans la MÊME transaction ; l'annulation et la promotion ne touchent aucun compteur | quotes jamais supprimés (M11) | int : brouillon, officiel, brouillon, annulation du premier, promotion du troisième = numéros 1, 2, 3 tous présents ; un échec de la transaction REND le numéro (patron F-7) |
| D-9 | **filigrane sur CHAQUE page, FR et AR, plusieurs pages** | le modèle pose le filigrane (`position: fixed`) ; le moteur n'est pas modifié | — | **MESURÉ par le spike** (section 7) : 1, 4 (fr et ar), 7 pages = autant de couleurs de filigrane que de pages ; `absolute` (mutation) = 1 sur 3 ; sans filigrane = 0 ; un devis officiel = 0 |
| D-10 | **devis existants inchangés** | `DEFAULT true`, aucune écriture de données | `ADD CONSTRAINT` sur base non vide | int `migration-non-empty` (D123) : devis dans chaque état, hérités compris, intacts ligne à ligne ; le DTO d'un ancien devis dit `isOfficial: true` et `DEVIS-…` |
| D-11 | **la ligne d'audit de la promotion** | UNE ligne dans la même transaction, uniquement si le compte = 1 : action `quote.promote`, entité `quote`, identifiant, acteur et rôle ; `before`/`after` = les seuls drapeau et identifiant de fiche — **aucun nom, aucun numéro, aucun e-mail** | — | int : exactement une ligne, sans donnée personnelle ; cible : retirer l'écriture. ⚠ première écriture de `audit_logs` (M3) |
| D-12 | **annulation d'un brouillon** | autorisée (`QUOTE_OPEN_STATUSES`) ; le numéro reste | `CANCELLED` est admis par la `CHECK` | int : annulé, le numéro n'est pas réutilisé ; le brouillon n'entre jamais dans l'entonnoir (`sent_via` reste NULL) |
| D-13 | **un client ancien qui crée un devis sans le champ** | inchangé : officiel, fiche facultative | — | unit/int : création sans `isOfficial` = officiel ; `isOfficial: true` = 400 |
| D-14 | **le PDF après annulation d'un brouillon** | `decideQuoteDocument` : un devis clos n'imprime pas — inchangé | — | test de non-régression |

---

## 6. Les questions pour Ko — LA RÈGLE D'ARRÊT JOUE (consigne 4 b)

Chacune ci-dessous est une question de **produit** (ou un écart de schéma, DR8) que ni DR4, ni la tranche ratifiée [L36-2], ni les mots de Ko du 21/10 (« un client qui refuse de donner son numéro ET son adresse e-mail reçoit un devis brouillon non officiel ; pour un vrai devis, il faut le numéro ou l'adresse e-mail ») ne tranchent. La session ne code pas : elle demande. Chaque question dit **ce qu'elle change pour Ko**.

**Q1 — Comment le pro commence-t-il un brouillon ?** Aujourd'hui, la première étape de « Nouvelle réservation » refuse d'avancer sans numéro ni e-mail : un client qui refuse les deux ne peut même pas obtenir un prix à l'écran.
- **(a) Recommandé.** Un second bouton sur la première étape, « Le client ne donne ni numéro ni e-mail », qui passe directement à la date, au créneau et aux prestations et se termine par un prix marqué BROUILLON. *Pour Ko :* la règle fonctionne de bout en bout au comptoir dès ce lot ; un chemin de plus à jouer à la main.
- **(b)** L'API accepte un brouillon, mais aucun écran n'en crée encore (un lot ultérieur ajoute le bouton). *Pour Ko :* un lot plus petit, mais la règle ne s'utilise pas au comptoir avant ce lot ultérieur.

**Q2 — Le brouillon porte-t-il le nom du client ?** Le rang 41 refuse un nom sans fiche, et une fiche exige un numéro ou un e-mail : un brouillon n'a donc aucun nom aujourd'hui.
- **(a) Recommandé.** Pas de nom : le champ « Client » du PDF affiche « — », la règle du rang 41 ne change pas. *Pour Ko :* le papier remis au client est anonyme (il se retrouve par son numéro `BROUILLON-…`) ; aucune donnée personnelle de plus.
- **(b)** Le pro peut taper un nom sur un brouillon sans fiche : exception écrite à la règle du rang 41, copie sur le devis seulement, comparée aux noms de la fiche au moment de la promotion. *Pour Ko :* un papier plus utile au client, mais un nom conservé sans aucun moyen de joindre la personne — une décision sur une donnée personnelle (loi 18-07).

**Q3 — Que devient la révision d'un brouillon ?**
- **(a) Recommandé.** Elle reste un brouillon (`BROUILLON-… v2`, même numéro) ; le pro le rend officiel en un geste volontaire, sur la dernière version. *Pour Ko :* le pro négocie le prix avec un client sans coordonnées sans rien perdre, et il n'y a qu'UNE porte pour devenir officiel (donc une seule ligne d'audit).
- **(b)** Une révision qui arrive avec une fiche devient officielle d'elle-même. *Pour Ko :* un geste de moins, mais deux portes pour devenir officiel, la ligne d'audit à garder aux deux, et un devis qui change de nature sans que le pro l'ait demandé.
- *(Écartée par la session : « un brouillon ne se révise pas » — le pro devrait recréer un brouillon à chaque variante, chacun avec un nouveau numéro.)*

**Q4 — L'API peut-elle encore créer un devis OFFICIEL sans fiche ?** Aujourd'hui oui (tous les devis d'avant en sont) ; la règle de Ko dit qu'un vrai devis exige un numéro ou un e-mail. L'écran, lui, ne le permet déjà pas.
- **(a) Recommandé pour ce lot.** Oui, comme aujourd'hui : seuls les brouillons sont marqués, rien d'autre ne change. *Pour Ko :* aucun changement de comportement ; la règle n'est tenue que par l'écran et par la promotion.
- **(b)** Non : l'API refuse un devis officiel sans fiche. *Pour Ko :* la règle est tenue partout, mais c'est un changement de comportement sur le chemin de l'argent qui n'a pas été demandé : les tests qui créent des devis sans fiche (au moins trois fichiers d'intégration, neuf appels HTTP — relevé partiel, M10) sont à réécrire et un ancien appelant de l'API casserait.

**Q5 — Comment la base garde-t-elle la conversion ? (écart de schéma, DR8)** Une `CHECK` ne peut pas lire la réservation (section 2.2) : les trois remplaçants sortent de la tranche ratifiée.
- **(a)** Une clé étrangère composite et une colonne neuve sur `bookings`. *Pour Ko :* la plus lourde, sur la table de l'argent.
- **(b) Recommandé.** Un déclencheur : la base refuse elle-même une réservation rattachée à un brouillon, sans colonne neuve ; il y a déjà un précédent dans le dépôt. *Pour Ko :* une petite fonction SQL de plus ; le même refus qu'on ait un bogue ou un accès direct à la base.
- **(c)** La garde du serveur seule, avec une exception écrite à « garanti par la BDD ». *Pour Ko :* le plus simple, mais la base n'arrête pas un futur code qui contournerait `convert`.

*(Si Ko répond Q1 à Q5, le code part sous la même consigne : extension 2 de la table, rouges commités avant le code, harnais `neutralize-r43.py`, e2e « brouillon créé, refusé à la remise, promu, puis remis », six portes rejouées — compteur DEUX → TROIS.)*

---

## 7. Le spike du filigrane — mesuré, pièces `docs/preuves/D338/spike-filigrane/`

Question : un élément `position: fixed` se répète-t-il sur CHAQUE page du PDF que rend le moteur du dépôt, sans toucher au moteur ? Réponse **mesurée** (code COMPILÉ du dépôt, Chromium de Playwright, un document réel de la fonction `buildQuoteDocumentHtml` avec 70 prestations, le filigrane inséré avant `</body>`) :

| cas | pages (`/Type /Page`) | couleur du filigrane posée | égalité |
|---|---|---|---|
| français, 70 prestations, `fixed` | 4 | 4 | ✓ |
| arabe, 70 prestations, `fixed` | 4 | 4 | ✓ |
| français, 3 prestations, `fixed` | 1 | 1 | ✓ |
| français, 150 prestations, `fixed` | 7 | 7 | ✓ |
| français, 70 prestations, **`absolute`** (mutation, bras faux) | 3 | 1 | ✗ |
| français, 70 prestations, aucun filigrane (bras faux) | 4 | 0 | ✗ |

⚠ **Défaut de mon extracteur, nommé** : la passe 1 (`sortie-passe-1.txt`) a rendu **zéro** sur les six cas, y compris celui qui porte le filigrane. Son motif cherchait « 0.1215… » ; la sortie brute du calibrage (`sortie-calibrage.txt`) montre que Chromium écrit « **.1216 .498 .7882 rg** » (sans « 0 » devant la virgule). Un zéro n'était pas une absence (D275, D290) ; l'extracteur a été réparé après avoir été calibré sur ses deux bras (couleur absente du PDF sans filigrane, présente dans l'autre), puis l'étape rejouée en entier.

**Conséquence pour le test (mesurée, pas écrite en code)** : « le filigrane est sur chaque page » se prouve **sans nouvelle dépendance** en comptant, dans les flux décompressés d'un document de plusieurs pages, la couleur propre au filigrane et en l'égalant au nombre de pages ; la mutation `absolute` fait rougir ce test (1 sur 3). Le lecteur de PDF maison de `apps/api/test/int/pdf-inspect.ts` (octets bruts) recevrait cette lecture. ⚠ **Limite** : la **lisibilité** du filigrane (il ne doit pas cacher les montants) ne se mesure pas — comme au rang 38, Ko regarde les pages.

---

## 8. Ce que ce cadrage n'a PAS mesuré (dit pour ne pas se lire comme tenu)

- **Aucune mesure sur une base PostgreSQL** : la tenue de la `CHECK` sur une base non vide est **inférée** (section 2.1), pas mesurée ; elle se mesure par le bloc D123 du code, qui n'est pas écrit.
- **Aucun code, aucune migration, aucune écriture sur la base de développement de Ko** ; le spike n'écrit que dans la sortie standard.
- **Les messages arabes** (section 3) sont des propositions non relues par un arabophone.
- **L'écran** : seule la ligne « ce que le pro voit » et l'emplacement de la promotion sont proposés ; la mise en page dépend de Q1 et Q2.
- **`E2E_DATABASE_URL`** peut surcharger le nom de la base e2e : seul le défaut `zwadj_e2e` a été lu (lecture adverse, contrôle 1.6.c).
