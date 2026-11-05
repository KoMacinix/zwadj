# FC-6 — la prémisse, vérifiée à `90d3ae2` (D231)

**L'arbitrage**, mot pour mot (Ko, 04/10/2026, D323) : « Les dates et les nombres en arabe se formatent en `ar-DZ`. Le catalogue
et les routes restent `ar`. Le lot qui le fera relèvera d'abord, dans le navigateur, ce que `ar` et `ar-DZ` affichent pour un
mois, une date et un prix. »

**Le relevé navigateur, fait AVANT le code** (`releve-ar-dz.txt`, outil `releve-ar-dz.mjs`, Chromium 153 du conteneur, calibré à
deux bras) — pour CHAQUE format de date que les deux applications emploient (options relevées dans leurs sources) :
- `ar` nomme les mois à l'orientale (« أغسطس », « يناير »…), `ar-DZ` comme en Algérie (« أوت », « جانفي »…) : le mois seul, le
  mois et l'année, la date longue, le jour-mois-année, la date du PDF diffèrent ; le numéro du jour, les noms de jours et la date
  en chiffres sont IDENTIQUES entre `ar` et `ar-DZ`.
- `fr` et `fr-DZ` rendent les **mêmes octets sur les neuf formats de date** : la règle des montants (`ar-DZ` / `fr-DZ`, déjà
  écrite dans `formatDZD` et `formatRating`) peut servir les dates sans rien changer en français.
- Montants : `ar` « ‏235,000 د.ج.‏ », `ar-DZ` « ‏235.000 د.ج.‏ », `fr-DZ` « 235 000 DA ».
- `getWeekInfo()` de `ar-DZ` rend `firstDay: 6` (samedi) : la semaine ne se dérive JAMAIS de la locale (D56) — rien ici ne
  la lit.

**L'existant, relevé par la garde neuve contre l'état d'avant** (`rouges/rouge-client.txt`) — **34 fautes**, dans les deux
applications et deux paquets :
- **20 montants SANS langue** (`formatDZD(cents)`, donc en français même dans une page arabe) : le panneau de demande du client
  (7), le prix de base de la fiche (1) ; au pro, le récapitulatif du devis au comptoir (5), la liste des devis (2), le catalogue
  des prestations (4), le prix d'un créneau du calendrier (1). Les autres appels (cartes, recherche, assistant, accueil, compte,
  demandes du pro, liste des salles) passaient déjà la langue.
- **12 formateurs `Intl` hors d'une règle commune** : neuf `Intl.DateTimeFormat(locale…)` — en arabe, `ar` et ses mois
  orientaux — (client : numéro du jour, date longue, en-têtes, mois ; pro : date du devis, mois et jours des règles de prix,
  en-têtes, mois), et trois `Intl.NumberFormat` qui réécrivent chacun la règle `ar-DZ` / `fr-DZ` en ligne
  (`formatDZD`, `formatRating`, le prix du calendrier de la fiche).
- **2 `toLocaleDateString()` sans argument** : la date d'une demande de suppression de compte, client et pro — dans la langue et
  le fuseau du NAVIGATEUR, pas de la page.

**⛔ La rencontre avec D326 — ce que ce lot ne fait PAS.** Le PDF du devis (`apps/api/src/documents/quote-document.ts`) imprime
ses montants par `formatDZD(cents)` **sans langue** — le format français, même en arabe — et son en-tête l'écrit : « Les montants
s'impriment comme l'ÉCRAN DU PRO les affiche […] la décision 1 craint un devis imprimé « différent de celui affiché à
l'écran » ». Passer l'écran du devis en `ar-DZ` sans le PDF ferait mentir cette décision ; passer le PDF exige `apps/api`, hors
de la session (consigne, § 2 : « touche apps/api » ⇒ ARRÊTÉ). ⇒ **Les montants d'un DEVIS (écran du comptoir, liste des devis,
PDF) restent au format français, explicitement** (`QUOTE_AMOUNT_LOCALE`), et une garde les CONFRONTE au PDF ; la décision
(l'écran ET le PDF en `ar-DZ`, ensemble) est **due à Ko**. Le PDF écrit déjà `ar-DZ` pour ses DATES : la date du devis à
l'écran (`ar-DZ` après ce lot) le rejoint.

**Ce qui change en français : rien** (relevé ci-dessus). **Ce qui change pour la date d'une demande de suppression** : la langue
de la PAGE et le fuseau d'ALGER (D48) au lieu de ceux du navigateur — pour un visiteur en Algérie, la date ne bouge pas.
