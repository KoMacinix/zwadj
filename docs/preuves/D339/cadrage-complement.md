# D339 — complément du cadrage de L36-2 (consigne du rang 43 suite, 3 b) — écrit le 28/10/2026, AVANT les rouges et AVANT toute ligne de code

Lot : rang 43 (suite). Le cadrage de D338 (`docs/preuves/D338/cadrage.md`) a posé la forme et quatorze modes de défaillance et a posé cinq questions à Ko. Ce complément applique les **réponses** (adoptées par le message du relecteur que Ko a collé : Q1 (a), Q2 (a), Q3 (a), Q4 (a) pour ce lot, Q5 (b) ; S-76 à S-82 ratifiées ; décisions R-1 à R-5 du relecteur — texte : bloc « ARBITRÉ LE 28/10/2026 PAR KO — LE RANG 43 (SUITE) » de l'ordre des rangs) aux sections 2 à 5 du cadrage, **fixe la forme exacte** de ce que le code écrit, et ajoute les modes de défaillance neufs. **Règle D126** : un mode de défaillance qui n'est ni dans le cadrage (D-1 à D-14) ni ici (D-15 à D-23) **ne se code pas**.

Départ : `d703117` ; table `fb386f1` ; lecture adverse `bb732a0` (37 contrôles, 0 ✗) ; première écriture d'autorité `52c24e6` ; entrée de backlog et annotations `17207e4`. Une affirmation est écrite **LUE** (fichier, ligne), **MESURÉE** (avec sa pièce) ou **PROPOSITION** (décision de la session, à ratifier) — jamais autrement. **Aucune mesure sur PostgreSQL dans ce document** : tout ce qui touche la base est une PROPOSITION jusqu'aux rouges et aux verts.

---

## 1. Les réponses appliquées au cadrage de D338

| objet du cadrage | ce que la réponse change | source |
|---|---|---|
| § 2.1, la `CHECK` | elle exige AUSSI `client_record_id`, `client_name_ar` et `client_name_latin` à `NULL` pour un devis non officiel ; **son nom change** (`quotes_unofficial_never_remitted` ne dit plus ce qu'elle garantit) : `quotes_unofficial_inert` — *PROPOSITION de la session* | Q2 (a) |
| § 2.2, la conversion | la garde de la base est un **déclencheur** `BEFORE INSERT OR UPDATE OF quote_id ON bookings` (ni colonne neuve, ni clé étrangère composite) ; la garde du serveur (`convert` refuse avant d'écrire) reste, sans exception écrite à « garanti par la BDD » | Q5 (b), R-4 |
| § 3, contrat 1 (création) | `isOfficial: z.literal(false).optional()` ; avec `false`, une fiche ou un nom est refusé (400) | Q1, R-2 |
| § 3, contrat 2 (promotion) | inchangé : `POST /quotes/:id/promote`, corps `{ clientRecordId, clientNameAr?, clientNameLatin? }` | S-80 |
| § 3, contrat 5 (refus) | + `QUOTE_DRAFT_HAS_NO_CLIENT` (409), + la révision n'accepte pas `isOfficial` (clé inconnue, 400) | R-1, R-3 |
| § 4, « où le pro crée » | le second bouton de l'étape Contact (section 5 ci-dessous) | Q1 (a) |
| § 4, « si le brouillon porte un nom » | non : le champ « Client » du PDF affiche « — » (c'est ce que le modèle fait déjà quand la copie manque : `quote-document.ts`, LU) | Q2 (a) |
| D-7 (révision d'un brouillon) | la révision d'un brouillon reste un brouillon ; le drapeau est lu **sous le verrou de la tête** sur la plus haute version de la chaîne ; fiche ou nom → refus avant toute écriture | Q3 (a), R-1 |
| D-13 (un ancien client qui crée sans le champ) | inchangé : officiel, fiche facultative — **l'API garde le devis officiel sans fiche** ; la règle du 21/10/2026 n'est tenue que par l'écran et la promotion (entrée de backlog, 3 a) | Q4 (a) |
| D-2 (convertir un brouillon) | le déclencheur refuse l'`INSERT` direct **et** l'`UPDATE` de `quote_id` | Q5 (b), R-4 |
| D-9 (filigrane) | + une garde : même nombre de pages avec et sans filigrane, en FR et en AR | R-5 |

---

## 2. La forme exacte — PROPOSITION de la session, à vérifier par les rouges puis par les verts

### 2.1 La migration `apps/api/prisma/migrations/20261028100000_quote_unofficial_draft/migration.sql` (écrite à la main, D186 ; jamais `migrate dev`)

```sql
-- L36-2 (D339) — le devis brouillon non officiel.
ALTER TABLE "quotes" ADD COLUMN "is_official" boolean NOT NULL DEFAULT true;

-- Un devis non officiel est INERTE : il n'est ni remis, ni accepté, ni rattaché à un client.
-- Les statuts admis sont ceux que le code a le droit d'ÉCRIRE (QUOTE_WRITABLE_STATUSES) moins ACCEPTED : DRAFT et CANCELLED.
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_unofficial_inert" CHECK (
  "is_official"
  OR (
    "status" IN ('DRAFT', 'CANCELLED')
    AND "sent_via" IS NULL AND "sent_at" IS NULL AND "accepted_at" IS NULL
    AND "client_record_id" IS NULL AND "client_name_ar" IS NULL AND "client_name_latin" IS NULL
  )
);

CREATE FUNCTION "bookings_quote_must_be_official"() RETURNS trigger AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "quotes" q WHERE q."id" = NEW."quote_id" AND NOT q."is_official") THEN
    RAISE EXCEPTION 'bookings.quote_id désigne un devis non officiel : %', NEW."quote_id"
      USING ERRCODE = 'check_violation', CONSTRAINT = 'bookings_quote_must_be_official';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "bookings_quote_must_be_official"
  BEFORE INSERT OR UPDATE OF "quote_id" ON "bookings"
  FOR EACH ROW
  WHEN (NEW."quote_id" IS NOT NULL)
  EXECUTE FUNCTION "bookings_quote_must_be_official"();
```

- **Le précédent** : `venues_number_immutable`, migration `20261015100000_venue_number` (lu : lignes 62-72 — fonction PL/pgSQL aux identifiants entre guillemets, `BEFORE UPDATE OF "number"`, clause `WHEN`, `RAISE EXCEPTION` **sans** `ERRCODE`, donc SQLSTATE `P0001`). Ce déclencheur en reprend la forme (identifiants entre guillemets, `UPDATE OF`, `WHEN`) et s'en **écarte sur un point, déclaré** : il pose `ERRCODE = 'check_violation'` (23514, la classe des refus de contrainte), pour qu'un test le distingue d'une panne et le lise comme les `CHECK` — décision de la session, à ratifier (8).
- **`DEFAULT true`** rend le premier terme de la `CHECK` vrai pour toute ligne existante : `ADD CONSTRAINT` ne peut pas échouer sur une base non vide (INFÉRÉ ; **mesuré** par le bloc « L36-2 (D339) » de `migration-non-empty.int-spec.ts`, D123 : devis semés dans CHAQUE état, hérités compris — DRAFT, SENT, ACCEPTED, DECLINED, CANCELLED, SUPERSEDED —, avec et sans canal de remise, avec et sans fiche et nom, plus des réservations avec et sans `quote_id` ; traversée intacte, ligne à ligne). Le déclencheur ne se déclenche pas à la création (aucune ligne n'est écrite).
- **`UPDATE OF quote_id`** : le déclencheur ne se déclenche que si `quote_id` figure dans la liste des colonnes du `SET` — un `UPDATE` d'une autre colonne d'une réservation déjà rattachée n'est pas gêné (mesuré par le rouge de D-18).
- **Ce que le déclencheur ne couvre pas** (dit pour ne pas se lire comme tenu) : un `UPDATE quotes SET is_official = false` sur un devis officiel qui porte déjà une réservation — la base n'interdit pas `true → false` (une `CHECK` n'a pas de mémoire) et le déclencheur est sur `bookings`. Aucun code n'écrit ce sens ; une garde de SOURCE le dit. Le fermer par un déclencheur sur `quotes` est **hors de la tranche ratifiée** : entrée de backlog à la clôture (« D-24 »).
- **L'erreur du déclencheur** n'a pas de traduction en erreur métier : par l'API elle est **inatteignable** (le drapeau ne va que de faux à vrai, et `convert` refuse un brouillon avant d'écrire) ; un code futur qui contournerait `convert` verrait un 500 (SQLSTATE 23514) — **bruyant, pas silencieux**. Entrée de backlog à la clôture, comme `bookings_contact_reachable` (ML-13 de D337).

### 2.2 `apps/api/prisma/schema.prisma`

`Quote.isOfficial Boolean @default(true) @map("is_official")`, commentée : la `CHECK` et le déclencheur n'ont **aucune** déclaration Prisma (D186 : l'autorité sur les garanties de la base est la migration).

### 2.3 Le contrat (`packages/types/src/quote.ts`)

- `QUOTE_REFERENCE_PREFIX = { OFFICIAL: "DEVIS", DRAFT: "BROUILLON" }` ; `QuoteReferenceParts.official?: boolean` (défaut vrai) ; `formatQuoteReference` en bâtit le préfixe ; `QUOTE_REFERENCE_PATTERN` est **dérivé** des deux préfixes (jamais une troisième liste) ; `quoteDocumentFilename` accepte les deux et continue de **lever** sur le reste. La référence d'un devis officiel ne change pas d'un octet.
- `quoteCreateSchema` : `isOfficial: z.literal(false)` facultatif (message `quote.validation.isOfficialInvalid`) ; avec `isOfficial: false`, `clientRecordId`, `clientNameAr` ou `clientNameLatin` donne **un seul** refus `quote.validation.draftHasNoClient` (chemin `isOfficial`) ; sans lui, les deux règles de rang 41 inchangées.
- `quoteReviseSchema` **cesse d'être** `quoteCreateSchema` : même corps, **sans** `isOfficial` (clé inconnue → `quote.validation.unknownKey`, 400), mêmes deux règles fiche ↔ nom. Une fonction commune porte ces deux règles : ni l'une ni l'autre n'est écrite deux fois.
- `quotePromoteSchema` : `clientRecordId` **obligatoire** (UUID ; absent → `quote.validation.clientRecordRequired`), `clientNameAr` / `clientNameLatin` (au moins un : `quote.validation.clientNameRequired`), `.strict()`.
- `QuoteDTO.isOfficial: boolean` (obligatoire). Codes : `QUOTE_NOT_OFFICIAL`, `QUOTE_ALREADY_OFFICIAL`, `QUOTE_DRAFT_HAS_NO_CLIENT`.

### 2.4 Les messages (clés dans les DEUX catalogues, parité FR = AR) — *PROPOSITION ; les messages arabes ne sont pas relus par un arabophone*

| clé | FR | AR |
|---|---|---|
| `quote.errors.notOfficial` | Ce devis est un brouillon non officiel : il ne peut être ni remis au client ni converti en réservation tant qu'il n'est pas rendu officiel. | هذا العرض مسودة غير رسمية: لا يمكن تسليمه للزبون ولا تحويله إلى حجز قبل اعتماده رسميًا. |
| `quote.errors.alreadyOfficial` | Ce devis est déjà officiel. | هذا العرض رسمي بالفعل. |
| `quote.errors.draftHasNoClient` | Un brouillon non officiel ne porte ni fiche ni nom de client. Pour ajouter les coordonnées du client, rendez d'abord le devis officiel. | المسودة غير الرسمية لا تحمل بطاقة زبون ولا اسمًا. لإضافة بيانات الزبون، اعتمد العرض رسميًا أولًا. |
| `quote.validation.isOfficialInvalid` | Seule la valeur « false » (brouillon) peut être demandée ; un devis officiel s'obtient en omettant ce champ. | يمكن طلب القيمة «false» (مسودة) فقط؛ ويُنشأ العرض الرسمي بحذف هذا الحقل. |
| `quote.validation.draftHasNoClient` | Un brouillon non officiel ne porte ni fiche ni nom de client. | المسودة غير الرسمية لا تحمل بطاقة زبون ولا اسمًا. |
| `quote.document.draft` | BROUILLON | مسودة |

Les chaînes de l'écran du pro (`venue.ui.walkin.*`) sont données à la section 5.

### 2.5 L'ordre des refus — une règle métier, mesurée sur des cas **doublement fautifs** (leçon de S11-a)

| commande | ordre | les cas doublement fautifs que le test fixe |
|---|---|---|
| `deliver` | 404 (introuvable) → 409 `QUOTE_STATUS_CONFLICT` (statut) → 409 `QUOTE_NOT_OFFICIAL` | brouillon **annulé** : répond « statut » (le devis est clos, c'est l'information utile) |
| `convert` | 404 → 409 `QUOTE_STATUS_CONFLICT` → 409 `QUOTE_NOT_OFFICIAL` → 409 `QUOTE_ALREADY_CONVERTED` | idem |
| `revise` | 404 → 409 `QUOTE_STATUS_CONFLICT` → 404 fiche (`CLIENT_RECORD_NOT_FOUND`) / 409 fiche liée → 409 `QUOTE_DRAFT_HAS_NO_CLIENT` (lu **sous le verrou**) | brouillon + fiche d'un autre pro : répond 404 (la fiche est décidée avant l'écriture, comme à la création) |
| `promote` | 404 devis → 404/409 fiche → *(sous le verrou de la tête)* 409 `QUOTE_VERSION_NOT_ACTIVE` (+ `latestVersion`) → 409 `QUOTE_ALREADY_OFFICIAL` si le devis est officiel, sinon 409 `QUOTE_STATUS_CONFLICT` si le statut n'est pas DRAFT | **ancienne version d'une chaîne promue** : répond « version non active » ; **officiel et annulé** : répond « déjà officiel » ; **brouillon annulé** : répond « statut » |
| `completeClientName` (K-5) | 404 → 409 `QUOTE_DRAFT_HAS_NO_CLIENT` → 409 `QUOTE_CLIENT_NAME_ALREADY_SET` | — (un brouillon n'a jamais de copie : la `CHECK`) |

*PROPOSITION de la session : l'ordre de `promote` (version avant statut avant « déjà officiel ») prolonge la politique du document (`decideQuoteDocument` : une ancienne version est refusée comme « pas la version active »). Pour un devis officiel, « déjà officiel » est vrai quel que soit son statut ; pour un brouillon, le statut dit « clos ».*

### 2.6 Le port, l'adaptateur, la promotion

- **`marquerRemis`** : la condition `is_official = true` est dans le `WHERE` du check-and-set, **en plus** du statut ; un refus relit `{ statut, isOfficial }` dans la transaction et rend `statutConflit` (statut hors de la liste) avant `nonOfficiel`. Le résultat de la remise s'élargit (`ResultatRemise`), celui du changement de statut (`ResultatTransition`) ne change pas — l'annulation d'un brouillon reste permise (D-12).
- **`creerRevision`** : sous le verrou de la tête, lit la **plus haute version** de la chaîne (statut et drapeau), refuse (`brouillonAvecClient`) si cette version est un brouillon et que le corps porte une fiche ou un nom, **n'écrit rien** dans ce cas ; sinon écrit la ligne avec le drapeau **hérité**. Le résultat du port s'élargit (`ResultatRevision`) ; les ports ne lèvent pas (doctrine S5b).
- **`creerTeteDeChaine`** : la tête naît avec le drapeau que le **service** décide (`officiel` ajouté à `ReferenceDeCreation`) ; même compteur, même transaction.
- **`promouvoir`** (neuf) : UNE transaction — la ligne du pro (par la relation, D149) ; le verrou de la tête (`SELECT … FOR UPDATE`, celui de `revise`) ; la plus haute version ; `UPDATE … WHERE id AND NOT is_official AND status IN (DRAFT)` — **compte = 1 exigé** (D305) ; à 0, une relecture ne sert qu'à **choisir le code d'erreur** ; UNE ligne `audit_logs` (`action = quote.promote`, `entity_type = quote`, `entity_id`, `actor_id`, `actor_role`, `before = { isOfficial: false, clientRecordId: null }`, `after = { isOfficial: true, clientRecordId }` — **aucun nom, aucun numéro, aucun e-mail**, S-81) dans la **même** transaction, uniquement si le compte vaut 1 ; relecture. Un échec de l'écriture d'audit annule la promotion. ⚠ **Première écriture de `audit_logs`** (M3 : zéro écrivain à `d703117`, lecture adverse 4.2).
- **`completerNomDuClient`** : `isOfficial: true` entre dans le `WHERE` de la copie ; le service relit pour choisir entre 404, `QUOTE_DRAFT_HAS_NO_CLIENT` et `QUOTE_CLIENT_NAME_ALREADY_SET`.
- **`convertirEnDemande`** : inchangé ; la garde du serveur est dans `convert` (après le statut, avant « déjà converti »).
- **`quote-transitions.ts`** : une commande `PROMOTE` (`from = QUOTE_OPEN_STATUSES`, la MÊME référence que les quatre autres, `to = null`) ; la spec du module garde ses propriétés d'ensemble — la source de chaque commande EST `QUOTE_OPEN_STATUSES` (identité), un devis hérité `SENT` reste une source légale, aucun statut hérité n'est une cible. *Pourquoi pas `[DRAFT]` seul (écart avec ma première rédaction de ce complément, relevé en lisant la spec du module)* : un devis non officiel ne peut être que `DRAFT` ou `CANCELLED` (la `CHECK`), donc la source EFFECTIVE de la promotion est `DRAFT` quelle que soit la liste ; une liste `[DRAFT]` aurait cassé deux gardes d'ensemble du module (« les statuts ouverts VIENNENT de `@zwadj/types` » et « `SENT` reste une SOURCE légale ») pour un effet nul.
- **Le PDF** : `QuoteDocumentRecord.isOfficial` ; la référence est bâtie avec le préfixe du devis ; le filigrane est inséré **dans le modèle pur**, `position: fixed`, aux valeurs que le spike de D338 a **mesurées** (`font-size: 84pt; font-weight: 700; color: rgb(31,127,201); opacity: 0.18; transform: rotate(-28deg)`) ; le moteur n'est pas modifié. La lisibilité (S-82) ne se mesure pas : Ko regarde.

---

## 3. Les écrans — Q1 (a) et le téléchargement d'un brouillon (PROPOSITION de la session)

Un état d'écran de plus, **trois** drapeaux, jamais dérivés de la liste des devis : `sansCoordonnees` (le pro a choisi le second bouton et n'a pas encore donné de coordonnées), `chaineBrouillon` (la chaîne en cours EST un brouillon : posé à la création, levé par la promotion), et le devis rendu par le serveur (`quote.isOfficial`).

| étape | comportement |
|---|---|
| **Contact** | le bouton existant « Continuer » est inchangé ; **un second bouton** (`venue.ui.walkin.noContactButton`) se tient sous lui, actif tant que rien ne retient (`busy`) ; son clic pose `sansCoordonnees` et passe à l'étape Client. Un texte (`noContactHint`) dit ce qu'il fait. Le champ numéro et le champ e-mail ne sont ni vidés ni lus : ce qui y est tapé reste, sans effet tant que `sansCoordonnees` est vrai. |
| **Client** (brouillon, `sansCoordonnees`) | les **deux champs de noms n'existent pas** ; le nombre d'invités **reste demandé** (il chiffre les prestations et la capacité : le contrat l'exige, `guests ≥ 1`). Un texte (`draftClientHint`) le dit. « Continuer » ne crée aucune fiche et ne cherche rien. *Décision de la session : la consigne dit que le bouton « mène à la date, au créneau et aux prestations » ; les invités sont demandés au passage parce que le prix en dépend.* |
| **Date, créneau, prestations** | inchangés. |
| **Devis** (brouillon) | le total, les lignes, l'acompte et la référence **`BROUILLON-…`** s'affichent comme pour un devis officiel (le brouillon EST l'estimation à blanc). **Disparaissent, avec une raison écrite et non seulement grisés** : les champs de coordonnées de la conversion, les cinq canaux de remise, les deux boutons de conclusion. **Apparaissent** : un bandeau « BROUILLON — non officiel » (`draftTitle`, `draftBody`), UN bouton « Télécharger le brouillon (PDF) » (`draftDownload`), et UN bouton de promotion (voir plus bas). |
| **Télécharger le brouillon** | ouvre la boîte de langue **existante** ; le choix appelle `GET /quotes/:id/document?locale=…` et enregistre le fichier sous `quoteDocumentFilename` (`BROUILLON-…_fr_v1.pdf`). **Aucun appel à `deliver`, aucun appel à `client-name`** : la remise est interdite à un brouillon (`sent_via` reste NULL) et la boîte « nom manquant » (K-5) n'est PAS posée (R-3). Un statut (`role="status"`, `draftDownloaded`) dit que rien n'est enregistré comme remis ; un échec est dit par l'erreur de l'écran. |
| **Promotion** | si aucune fiche n'est connue de l'écran : le bouton « Ajouter les coordonnées du client » (`draftAddContact`) lève `sansCoordonnees` et renvoie à l'étape **Contact** (le « Continuer » normal, la recherche K-1, puis l'étape Client avec les noms, K-2). Si une fiche est connue ET les noms et les invités passent leurs règles : le bouton « Rendre le devis officiel » (`draftMakeOfficial`) appelle `POST /quotes/:id/promote` avec la fiche et les noms de l'écran (`copiePourDevis`, la forme de K-4). Succès : l'écran prend le DTO rendu (`DEVIS-…`, même numéro), lève `chaineBrouillon`, affiche `draftOfficialDone` (`role="status"`), et les champs de conclusion et de remise apparaissent. Échec : l'erreur du serveur est dite. |
| **Révision d'un brouillon** | « Modifier le devis » appelle `revise` avec un corps **sans fiche ni nom ni `isOfficial`** tant que `chaineBrouillon` est vrai (R-1 côté écran). Ajouter des coordonnées ou modifier un nom **ne jette pas** le total d'un brouillon (le brouillon ne dépend ni de la fiche ni des noms) — sinon la promotion passerait par une version de plus, inutile. |

Chaînes de l'écran (FR / AR) — *PROPOSITION ; l'arabe n'est pas relu* :

| clé `venue.ui.walkin.` | FR | AR |
|---|---|---|
| `noContactButton` | Le client ne donne ni numéro ni e-mail | الزبون لا يعطي رقمًا ولا بريدًا إلكترونيًا |
| `noContactHint` | Le devis sera un brouillon non officiel : sans nom ni coordonnées, il ne pourra être ni remis au client ni converti en réservation. | سيكون العرض مسودة غير رسمية: بلا اسم ولا بيانات اتصال، لا يمكن تسليمه للزبون ولا تحويله إلى حجز. |
| `draftSummary` | Sans coordonnées (brouillon) | بلا بيانات اتصال (مسودة) |
| `draftClientHint` | Un brouillon ne porte pas de nom : seul le nombre d'invités est demandé. | المسودة لا تحمل اسمًا: يُطلب عدد المدعوين فقط. |
| `draftTitle` | BROUILLON — non officiel | مسودة — غير رسمية |
| `draftBody` | Ce devis n'est pas officiel : il ne peut être ni remis au client ni converti en réservation. Pour le rendre officiel, ajoutez le numéro ou l'e-mail du client. | هذا العرض غير رسمي: لا يمكن تسليمه للزبون ولا تحويله إلى حجز. لاعتماده رسميًا، أضف رقم الزبون أو بريده الإلكتروني. |
| `draftDownload` | Télécharger le brouillon (PDF) | تنزيل المسودة (PDF) |
| `draftDownloaded` | Brouillon téléchargé. Rien n'est enregistré comme remis. | تم تنزيل المسودة. لم يُسجَّل أي تسليم. |
| `draftAddContact` | Ajouter les coordonnées du client | إضافة بيانات اتصال الزبون |
| `draftMakeOfficial` | Rendre le devis officiel | اعتماد العرض رسميًا |
| `draftMakeOfficialHint` | Le devis garde le même numéro ; la fiche et le nom du client y sont inscrits. | يحتفظ العرض بالرقم نفسه؛ وتُسجَّل فيه بطاقة الزبون واسمه. |
| `draftOfficialDone` | Le devis est officiel : même numéro, sans le mot « brouillon ». | أصبح العرض رسميًا: بالرقم نفسه، من دون كلمة «مسودة». |

Style : les classes du bandeau (`wk-draft*`) vivent dans `apps/pro/src/theme.css`, sur des **jetons existants** (aucune couleur en dur, `AGENTS.md` : « auditer l'absence de couleur en dur dans toute zone refondue »).

---

## 4. Les modes de défaillance — D-15 à D-19 (consigne 3 b) et D-20 à D-23 (écran) — chacun avec sa garde serveur, sa garde base et sa mesure

Les cibles du harnais `neutralize-r43.py` qui arracheraient chaque garde sont nommées à l'écriture du harnais ; chaque garde neuve est **neutralisée pour prouver que son test mord** (CLAUDE.md, AGENTS.md « Méthode »). Les rouges sont écrits et lus **avant** le code.

| # | mode de défaillance | garde serveur | garde base | ce qui le mesure |
|---|---|---|---|---|
| **D-15** | **une révision choisit son drapeau, ou une révision d'un brouillon porte une fiche ou un nom** — elle ferait d'une chaîne officielle, déjà remise, un brouillon v2 (R-1) | `quoteReviseSchema` : `isOfficial` est une clé inconnue (400) ; `creerRevision` refuse **sous le verrou** (409 `QUOTE_DRAFT_HAS_NO_CLIENT`) et n'écrit rien ; le drapeau écrit est celui de la plus haute version | la `CHECK` refuse la ligne neuve (SQL direct : brouillon avec fiche, avec nom arabe, avec nom latin — SQLSTATE 23514, **trois** colonnes, une par une) | unit (schéma) ; unit (service : le port refuse ⇒ 409, rien d'autre n'est appelé) ; int : 409 + **aucune ligne écrite** (nombre de versions inchangé) ; int : v1 brouillon → v2 brouillon, même numéro ; v1 brouillon, v2 promue, révision de v1 ⇒ hérite de v2 (officielle) ; int : SQL direct ×3 |
| **D-16** | **création `isOfficial: false` avec une fiche ou un nom**, ou `isOfficial: true` (R-2) | `quoteCreateSchema` : un seul refus `draftHasNoClient` (400) ; `true` refusé (400) ; omis ⇒ officiel (inchangé) | la `CHECK` (mêmes trois colonnes) | unit (schéma, dont l'absence de doublon de message) ; int HTTP 400 ×3 ; int SQL direct ×3 |
| **D-17** | **K-5 sur un brouillon** : la boîte de langue poserait un nom sur un devis sans fiche (R-3) | `completerNomDuClient` : `isOfficial: true` dans le `WHERE` ; le service rend 404 / 409 `QUOTE_DRAFT_HAS_NO_CLIENT` / 409 `ALREADY_SET` dans cet ordre | la `CHECK` (un `UPDATE client_name_*` direct sur un brouillon est refusé) | unit (service) ; int : 409 + les deux colonnes de nom restent NULL ; int SQL direct |
| **D-18** | **une réservation rattachée à un brouillon** : `INSERT` direct, ou `UPDATE bookings SET quote_id` sur une réservation existante (R-4) | `convert` refuse avant d'écrire (409 `QUOTE_NOT_OFFICIAL`), après le statut, avant « déjà converti » | le **déclencheur** (SQLSTATE 23514, contrainte `bookings_quote_must_be_official`) sur `INSERT` ET sur `UPDATE OF quote_id` ; une réservation SANS `quote_id`, une réservation sur un devis officiel, et un `UPDATE` d'une autre colonne ne sont pas gênés | int : 409 + **aucune ligne `bookings`** ; int : `INSERT` direct refusé ; int : `UPDATE quote_id` refusé et la ligne **inchangée** ; int : les trois cas non gênés passent |
| **D-19** | **un filigrane qui change la mise en page** : le PDF d'un brouillon n'a pas le même nombre de pages que le même devis sans filigrane, ou le filigrane manque à une page (R-5, D-9) | le modèle pose `position: fixed` ; le moteur n'est pas modifié | — | int, Chromium réel : même devis, officiel puis brouillon, **même nombre de pages en FR et en AR** (70 lignes, plusieurs pages) ; **autant de poses de la couleur du filigrane que de pages** ; un devis officiel : **zéro** pose ; la mutation `absolute` (bras faux) : le nombre de pages change ou le décompte ne vaut plus le nombre de pages |
| **D-20** | **l'écran de brouillon demande un nom, ou n'en demande aucun mais perd les invités** (Q2, Q1) | — (écran) | — | Pro : l'étape Client d'un brouillon n'a **aucun** champ de nom et **a** le champ des invités ; « Continuer » reste grisé sans invités ; aucune requête `lookup` ni `create` de fiche n'est émise |
| **D-21** | **l'écran offre une remise, une conversion ou la boîte « nom manquant » sur un brouillon** (D-1, D-2, R-3) | — (écran) | — | Pro : sur un brouillon, **aucun** des cinq boutons de canal, **aucun** bouton de conclusion ; le téléchargement n'appelle ni `deliver` ni `completeClientName` (les doubles comptent leurs appels) ; le fichier porte le nom `BROUILLON-…` |
| **D-22** | **la promotion envoie ce que l'écran n'affiche pas, ou se déclenche sans fiche** (D-4) | `quotePromoteSchema` côté serveur | — | Pro : le corps de `promote` est exactement la fiche et les noms de l'écran (`copiePourDevis`) ; le bouton « Rendre officiel » est absent tant que la fiche manque (le bouton « Ajouter les coordonnées » le remplace) ; après succès, le DTO affiché est celui du serveur (`DEVIS-…`) |
| **D-23** | **l'écran envoie une fiche ou un nom dans la révision d'un brouillon, ou jette le total en ajoutant des coordonnées** (R-1, côté écran) | — (écran) ; le serveur refuse de toute façon (D-15) | — | Pro : le corps de `revise` d'une chaîne brouillon ne porte **ni** `clientRecordId` **ni** noms **ni** `isOfficial` ; ajouter des coordonnées à un brouillon **ne remet pas** le devis à zéro |

**Les modes de défaillance du cadrage (D-1 à D-14), tels que les réponses les précisent** — chacun garde sa garde et sa mesure de la section 5 de D338 ; ce qui change :

| # | précision |
|---|---|
| D-1 | la condition `is_official` est AUSSI dans le `WHERE` ; la `CHECK` porte `sent_via`, `sent_at` ; le refus rend 409 `QUOTE_NOT_OFFICIAL` **après** le statut |
| D-2 | voir D-18 |
| D-3 | la `CHECK` refuse `status = 'ACCEPTED'` ET `accepted_at` pour un brouillon (SQL direct) |
| D-4 | la promotion exige fiche **et** un nom (Q2 ne retire rien à K-4) ; la fiche d'un autre pro ⇒ 404 indistinct |
| D-5 | N appels parallèles ⇒ **exactement un 201 et exactement une ligne d'audit**, les autres 409 `QUOTE_ALREADY_OFFICIAL` |
| D-6 | promotion d'une version ancienne ⇒ 409 `QUOTE_VERSION_NOT_ACTIVE` + `latestVersion` ; promotion ‖ révision sérialisées par le verrou de la tête |
| D-7 | précisé par D-15 |
| D-8 | brouillon, officiel, brouillon, annulation du premier, promotion du troisième ⇒ numéros 1, 2, 3 tous présents ; un échec de la transaction REND le numéro |
| D-9 | + D-19 |
| D-10 | le DTO d'un ancien devis dit `isOfficial: true` et `DEVIS-…` ; le bloc D123 de `migration-non-empty` |
| D-11 | UNE ligne, dans la même transaction, **sans nom, numéro ni e-mail** (le test cherche ces trois classes de valeurs dans `before` et `after`) |
| D-12 | l'annulation d'un brouillon est permise ; le brouillon n'entre jamais dans l'entonnoir |
| D-13 | création sans `isOfficial` ⇒ officiel (fiche facultative, comme avant) ; `isOfficial: true` ⇒ 400 |
| D-14 | le PDF d'un brouillon annulé : refusé comme tout devis clos (non-régression) |

---

## 5. Ce que ce complément NE mesure PAS, et les décisions de la session à ratifier

- **Aucune mesure sur PostgreSQL** : la tenue de la `CHECK` et du déclencheur sur une base non vide est INFÉRÉE (2.1) ; elle se mesure par les rouges, puis par les verts, puis par le bloc D123.
- **La lisibilité du filigrane** (S-82) : non mesurable ; Ko regarde un brouillon de plusieurs pages, en FR et en AR (`scenarios-ko.md`).
- **Les messages arabes** : propositions, non relues par un arabophone.
- **`true → false`** et **la traduction de l'erreur du déclencheur** : non couverts, dits en 2.1, entrées de backlog à la clôture.
- **R-5** : « cause non établie » (hypothèse du relecteur : réduction à la largeur de la page) — seul le **nombre de pages** est mesuré, par la session sur SON Chromium (la lecture adverse l'a marqué « non vérifiable » : N.1).
- **Décisions de la session, à ratifier par Ko** (chacune est reprise en une phrase simple au rapport) : (1) la `CHECK` se nomme `quotes_unofficial_inert` ; (2) un code unique `QUOTE_DRAFT_HAS_NO_CLIENT` couvre la révision d'un brouillon avec fiche ou nom ET K-5 sur un brouillon ; (3) l'étape Client d'un brouillon **demande les invités** (le prix en dépend) ; (4) l'ordre des refus de `promote` (version → « déjà officiel » ou statut) ; (5) ajouter des coordonnées à un brouillon ne jette pas son total ; (6) `promote` prend l'acteur authentifié (il écrit `actor_id` et `actor_role`) ; (7) deux entrées de backlog à la clôture (`true → false` ; traduction de l'erreur du déclencheur) ; (8) le déclencheur pose `ERRCODE = 'check_violation'`, que le précédent ne pose pas.
