# D337 — L36-1 : les modes de défaillance (consigne 3 e), écrits AVANT le code

Numérotation `ML-n` (« mode de défaillance du lot L36-1 ») : ne pas les lire comme les `MD-n` de D336. Chaque mode dit **ce qui casse**, **l'attendu**, et **où il se mesure** (un test, une cible du harnais `neutralize-r42.py`, ou « limite écrite »). Un mode qui n'est pas listé ici **ne se code pas** (doctrine de la méthode).

## Les règles que le lot applique

- **UNE règle « numéro OU e-mail », UNE fonction** (`packages/types/src/contact.ts`) : le schéma de réservation, le schéma de conversion, le formulaire du client et l'écran de conversion du pro l'importent. Deux copies d'une même règle divergent (D147).
- **Un numéro saisi doit être valide, même si l'e-mail l'est** (règle déjà en vigueur à l'étape Contact du rang 41, `identifierBlockers` : « un identifiant saisi et invalide retient même quand l'autre est bon »). Idem pour un e-mail saisi.
- **L'absence d'un numéro est une CLÉ ABSENTE du corps**, jamais `""` ni `null` (D135 pour l'e-mail ; `dzPhoneSchema` refuse la chaîne vide).
- **La base garde** : `CHECK (contact_phone IS NOT NULL OR contact_email IS NOT NULL)` (D186 : écrite à la main). Le message neuf vit dans `packages/i18n` sous une clé NEUVE (`booking.validation.contactRequired` EXISTE déjà : c'est « Ce champ est obligatoire. » des noms ; la réutiliser aurait fait dire « ce champ » sans dire lequel).
- **Aucune écriture dans la fiche à la conversion** (inchangé, consigne 3 c) ; **aucun contrat neuf** : `bookingCreateSchema` et `quoteConvertSchema` sont NOMMÉS par la consigne (S-48 précisé : un contrat nommé est dans le lot).

## Les modes

| # | mode de défaillance | attendu | mesuré par |
|---|---|---|---|
| ML-1 | **ni numéro ni e-mail** | refusé PARTOUT, quatre fois : le formulaire en ligne n'enlève pas son bouton ; l'écran de conversion nomme la raison ; le schéma (`bookingCreateSchema`, `quoteConvertSchema`) rend 400 avec la clé neuve ; la base refuse l'`INSERT` sans passer par l'API (`23514`) | tests de schéma ; `bookings.int-spec` / `quotes.int-spec` (400, aucune ligne écrite) ; test `migration` (SQL brut) ; test de composant ; cibles R42-1 à R42-4 |
| ML-2 | **e-mail seul, de bout en bout** | réservation en ligne : 201, `PENDING`, `contact_phone IS NULL`, `contact_email` stocké ; le pro la voit avec l'e-mail ; conversion d'un devis par e-mail seul : 200, la réservation née porte `contact_phone IS NULL` | `bookings.int-spec`, `quotes.int-spec` (PostgreSQL réel, la ligne relue) ; e2e `r42-reservation-email-seul` |
| ML-3 | **e-mail de casse différente** (`Amina@Example.DZ`) | accepté ; stocké **rogné, tel que saisi** (le schéma de réservation ne met pas en minuscules). **SIGNALEMENT S-55, sans alignement** : l'e-mail de la fiche est normalisé (`normalizeContactEmail` : rogné, NFKC, minuscules), celui de la réservation ne l'est pas — deux fonctions pour un même e-mail. Le lot ne les aligne pas (consigne 3 b) | un test qui ÉPINGLE l'état et le dit ; entrée de backlog |
| ML-4 | **réservation existante, avec numéro, inchangée** | la migration ne réécrit aucune ligne : les 3 colonnes de contact, ligne à ligne, identiques avant et après ; une réservation avec numéro ET e-mail garde les deux | `migration-non-empty.int-spec` (bloc « L36-1 (D337) ») ; `bookings.int-spec` |
| ML-5 | **chaque consommateur du recensement face à un numéro nul** (#5, #6, #8, #9, #11, #12, #13) | notification : `contact` = l'e-mail (jamais `"null"`, jamais `undefined`) ; DTO du pro : `contactPhone: null` ; liste du pro : l'e-mail à la place, et RIEN (ni « null ») si les deux manquaient — impossible par la base, mais l'écran ne s'écroule pas ; conversion : la clé absente du corps | specs de `booking-notification-input`, `quote-store`, composants ; cibles R42-5 à R42-9 |
| ML-6 | **geste d'appel ou de SMS sans numéro** | aucun `tel:` / `sms:` / `wa.me` n'existe dans `apps/pro/src` ni `apps/client/src` (mesuré) ; les canaux de remise « SMS » et « appel » restent bloqués sans numéro valide (`channelBlockers`), et restent proposés avec | garde de SOURCE (arbre TypeScript, hors tests) ; test de composant (conversion par e-mail seul : le canal e-mail est proposé, SMS et appel ne le sont pas) |
| ML-7 | **messages neufs, FR et AR** | une clé par message, présente et NON VIDE dans les deux catalogues ; la parité FR = AR est une porte (`pnpm test`) | le test de parité existant ; un test qui nomme les clés neuves |
| ML-8 | **un numéro saisi invalide avec un e-mail valide** (et l'inverse) | REFUSÉ — l'e-mail valide ne « rachète » pas un numéro faux, comme l'étape Contact du rang 41 | tests de schéma et de blocages ; cible R42-10 |
| ML-9 | **chaîne vide à la place de la clé** (`contactPhone: ""`, `contactEmail: ""`) | 400 : `dzPhoneSchema` et `.email()` refusent la chaîne vide ; l'écran omet la clé. Le contrat ne traite pas `""` comme une absence | tests de schéma |
| ML-10 | **`contactPhone: null` explicite** | 400 : un champ facultatif est ABSENT, pas nul | test de schéma |
| ML-11 | **la base accepte-t-elle ce que le schéma refuse ?** | non : `INSERT` sans numéro ni e-mail ⇒ `23514` ; `UPDATE` qui retire le dernier des deux ⇒ `23514` ; un `INSERT` avec e-mail seul passe | `migration-non-empty.int-spec` |
| ML-12 | **migration sur base NON VIDE (D123)** | appliquée sur des réservations semées AVANT elle : aucune ligne n'est perdue ni modifiée, le `CHECK` existe, la colonne est nullable | `migration-non-empty.int-spec` ; la sonde « applique tout SAUF la dernière » se retarge |
| ML-13 | **la violation du `CHECK` remonte en 500** | **LIMITE ÉCRITE** : par l'API elle est inatteignable (le schéma, qui est la même fonction que l'écran, refuse avant). Si un code futur contourne le schéma, la base arrête l'écriture (erreur de contrainte, code SQL `23514`) et l'appelant voit une 500. Traduire en erreur métier serait une seconde vérité sur la même borne (D55) | aucun test supplémentaire ; entrée de backlog |
| ML-14 | **un consommateur lié au paiement lit `contact_phone`** | aucun en production (instrument 3f.1) ; un test d'intégration de paiement SÈME un numéro, il reste valide | signalé au recensement, non touché |
| ML-15 | **la visite** | inchangée : `visit_bookings` et ses DTO ne sont pas touchés ; `visit-bookings.int-spec` reste verte | suites existantes |
| ML-16 | **un devis sans fiche** (tous les devis d'avant le rang 41) | se convertit comme avant : numéro OU e-mail, la fiche n'est pas écrite | `quotes.int-spec` (conversion sans fiche, avec numéro, inchangée) |
| ML-17 | **clé inconnue** | toujours refusée (`.strict`) : la règle « un des deux » s'ajoute par `superRefine`, qui ne retire pas `.strict` | test de schéma |
| ML-18 | **`dir` et RTL** | un e-mail affiché dans la liste du pro en arabe s'écrit de gauche à droite (`dir="ltr"` sur le contact) ; le champ e-mail du formulaire reste `inputMode="email"` | test de composant (attribut) |
| ML-19 | **D32 : un champ obligatoire porte `required` et un astérisque** | ni le numéro ni l'e-mail n'est obligatoire SEUL : aucun des deux ne porte `required` ni astérisque ; une phrase visible dit « l'un des deux au moins », reliée aux deux champs par `aria-describedby` | test de composant (attributs natifs) |

## Hors lot, inchangé (consigne 3 f)

`visit_bookings` ; l'écriture du numéro dans la fiche à la conversion ; les notifications (L36-9 : le gabarit ne change pas, seul le texte du champ « contact » vient de l'e-mail à défaut de numéro) ; tout consommateur lié au paiement.
