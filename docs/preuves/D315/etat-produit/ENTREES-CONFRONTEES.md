# Entrées ouvertes du backlog, confrontées au code — relevé du 26/09/2026 (D315, rang 24)

⛔ **PIÈCE DATÉE, PAS UNE AUTORITÉ.** Elle dit ce que le code porte au commit `ffd32e9` ; elle se périme au premier lot
de code. Elle ne coche, ne barre et ne réécrit **aucune** entrée du backlog : les verdicts vivent ici (consigne de Ko,
rang 24 : « une pièce datée, pas une liste dans un fichier d'autorité »).

**Périmètre** : les **146** entrées ouvertes (`- [ ]`) des cinq phases qui décrivent les parcours — PHASE 6 (métier,
44), 8 (notifications, 20), 9 (client, 51), 10 (pro, 25), 12 (admin, 6). Relevé mécanique :
`outils/entrees-ouvertes.py`, sortie `entrees-ouvertes-sortie.txt` (974 entrées à case parcourues ; calibration deux
bras). **Renvoi** : `B:<ligne>` = numéro de ligne dans `ZWADJ_BACKLOG.md` **à `ffd32e9`**.
Les entrées ouvertes **hors** de ces phases (reports des lots, audits du 09/09) sont citées par la pièce d'état là où
un parcours les touche ; elles n'ont pas été confrontées une à une ici.

**Verdicts** — écrits à la main, chacun avec ce qui a été lu :
- **RÉALISÉ** — le code fait ce que l'entrée demande ; **l'entrée est ouverte à tort** (périmée).
- **RÉALISÉ AUTREMENT** — le besoin est couvert sous une autre forme, écrite dans une décision.
- **PARTIEL** — une partie existe ; ce qui manque est dit.
- **CASSÉ À L'ÉCRAN** — le code existe, et une mesure de ce lot montre que l'écran ne l'atteint pas.
- **ABSENT** — rien dans le code.
- **PAUSE** — relève du chemin de l'argent en pause (E3 et suites) : ne s'ouvre pas sans Ko.
- **BIENTÔT** / **ÉCARTÉ** — annoncé sans être construit, ou écarté par une décision écrite.
- **DÉCISION OUVERTE** — attend un arbitrage.
- **NON CONFRONTÉ** — ce lot ne l'a pas mesuré.

## Décompte

⛔ **Aucun chiffre n'est écrit ici à la main.** Le décompte par verdict est recompté par `outils/compter-verdicts.py`
sur ce fichier même — sortie `compter-verdicts-sortie.txt`, qui fait foi. ⚠ Une première version de cette pièce
portait une table de décompte écrite AVANT tout comptage : retirée avant le commit (faute de méthode, section D315).

## PHASE 6 — métier (44)

| renvoi | entrée (abrégée) | verdict | ce qui a été lu |
|---|---|---|---|
| B:328 | `GET /vendor-categories` | BIENTÔT | rubrique « Prestataires » en `<span>` « Bientôt » (`site-nav.tsx`) ; aucune route |
| B:331 | `bookingMode` à la création | RÉALISÉ | `POST /api/v1/venues` porte `bookingMode` (charge relevée dans `bookings.int-spec.ts`) |
| B:337 | D39 — prix par créneau | RÉALISÉ AUTREMENT | D46 : `slot_templates.base_price_cents`, règles par créneau |
| B:339 | détection des chevauchements `pending` | RÉALISÉ | `conflictIds` calculé par l'API, affiché `booking-requests-section.tsx:174` |
| B:340 | double réservation par la contrainte d'exclusion | RÉALISÉ | entrée B3 barrée « PÉRIMÉE » au backlog ; rang 23 (F1) |
| B:341 | `GET` des prestations | RÉALISÉ | `GET /api/v1/pro/venues/:id/services` |
| B:342 | `POST` des prestations | RÉALISÉ | `POST /api/v1/venues/:id/services` |
| B:343 | `PATCH` des prestations | RÉALISÉ | `PATCH /api/v1/services/:id` |
| B:344 | résolution du prix par type | RÉALISÉ | `booking-charge.ts` (carte D304, branche 1) ; R2 ouvert (ordre des refus) |
| B:345 | total du devis | RÉALISÉ | `booking-charge.ts` : `totalCents = basePriceCents + servicesTotalCents` |
| B:346 | acompte 30 % − 1 000 DA en ligne | PARTIEL | acompte par politique de salle (`deposit.ts`) ; remise en ligne absente — décision ouverte B:1801 |
| B:347 | TVA et frais | ABSENT | 0 occurrence réelle — le compte brut (18 fichiers) était `setValues` : faux positif relu au contexte (D275) |
| B:348 | codes promo | ABSENT | 0 occurrence |
| B:351 | `POST /quotes` | RÉALISÉ | `POST /api/v1/venues/:id/quotes` |
| B:352 | `GET /quotes/:id` | ABSENT | absent de la carte des routes |
| B:353 | énuméré et transitions | RÉALISÉ | `booking-transitions.ts` |
| B:354 | garde générique de transition | RÉALISÉ | `booking-transitions.ts`, `quote-transitions.ts` ; écritures conditionnées (rang 23) |
| B:355 | `POST /bookings` | RÉALISÉ | API : 201 mesuré (script de captures) — l'écran, lui, est CASSÉ (B:655) |
| B:356 | clé d'idempotence sur `POST /bookings` | ABSENT | 0 mécanisme ; `AGENTS.md` : « ce qui est DÛ » |
| B:357 | acceptation | RÉALISÉ | `POST /api/v1/pro/bookings/:id/accept` |
| B:358 | refus | RÉALISÉ | `POST /api/v1/pro/bookings/:id/decline` |
| B:359 | expiration des demandes (pg-boss) | ABSENT | 0 écrivain d'`EXPIRED` ; `pg-boss` absent de tous les `package.json` (`verifier-deploiement-sortie.txt`, [11] [12]) |
| B:360 | confirmation après paiement | PAUSE | aucune route ne mène à `CONFIRMED` |
| B:361 | reprise d'un paiement orphelin | PAUSE | — |
| B:362 | `PATCH /bookings/:id` | ABSENT | absent de la carte des routes |
| B:363 | annulation + politique | PARTIEL | client `DELETE /api/v1/bookings/:id`, pro `POST /api/v1/pro/bookings/:id/cancel` ; aucune politique d'annulation |
| B:364 | remboursement | PAUSE | — |
| B:365 | liste client | RÉALISÉ | `GET /api/v1/me/bookings` |
| B:366 | liste pro avec conflits | RÉALISÉ | `GET /api/v1/pro/venues/:id/bookings` |
| B:370 | plages de visite (lecture) | RÉALISÉ | `GET /api/v1/pro/venues/:id/visit-availabilities` |
| B:371 | plages de visite (écriture) | RÉALISÉ | `POST /api/v1/venues/:id/visit-availabilities` (201 ×7, script de captures) |
| B:372 | prise de visite | RÉALISÉ | `POST /api/v1/venues/:slug/visit-bookings` (201, script de captures) |
| B:373 | prévenir le pro d'une visite | PARTIEL | abonnement `visit.booked` ; transport = journal de dev |
| B:374 | annulation d'une visite par le pro | RÉALISÉ | `DELETE /api/v1/pro/venues/:id/visit-bookings/:bookingId` |
| B:375 | visites à venir (pro) | RÉALISÉ | `GET /api/v1/pro/venues/:id/visit-bookings` |
| B:379 | remise − 1 000 DA en ligne | DÉCISION OUVERTE | B:1801 « trancher si `cashbackRateBps` est la remise » ; rien dans le code |
| B:380 | réclamation de cashback | ABSENT | table `cashback_claims` en base, aucune route |
| B:381 | vérification admin du cashback | ABSENT | — |
| B:382 | paiement du cashback | ABSENT | — |
| B:383 | statut de la réclamation | ABSENT | — |
| B:386 | `POST /reviews` | ABSENT | tables `reviews`, `review_moderations` en base (`schema.prisma:1285`, `:1306`) ; aucune route |
| B:387 | modération des avis | ABSENT | idem |
| B:388 | `GET` des avis | ABSENT | idem |
| B:390 | recherche plein texte | ABSENT | D231 : n'existait nulle part ; aucun paramètre de mot-clé au contrat |

## PHASE 8 — notifications (20)

⚠ **Commun à toute la phase** : `EmailModule` et `WhatsAppModule` lient **sans condition** leur adaptateur « journal de
dev » (`verifier-deploiement-sortie.txt`, [6] [7] [8]). Rien ne part hors de la console de l'API.

| renvoi | entrée (abrégée) | verdict | ce qui a été lu |
|---|---|---|---|
| B:567 | abstraction port / adaptateur | RÉALISÉ | ports `EMAIL_SENDER`, `WHATSAPP_SENDER` |
| B:568 | fournisseur d'e-mail transactionnel | ABSENT | `DevLoggerEmailSender` lié sans condition |
| B:569 | SPF, DKIM, DMARC | ABSENT | hors code ; aucun domaine d'envoi au dépôt |
| B:570 | gabarits FR/AR | PARTIEL | `common/email/render.ts` ; F7 : les notifications de réservation d'un compte `ar` partent en français |
| B:571 | pg-boss pour la file d'envoi | ABSENT | ⚠ l'entrée dit « already installed » : **faux** à `ffd32e9` — absent de tous les `package.json` |
| B:574 | e-mail de vérification | PARTIEL | `auth-emails.service.ts` ; transport de dev |
| B:575 | e-mail de réinitialisation | PARTIEL | idem |
| B:576 | confirmation après paiement | PAUSE | — |
| B:577 | reçu de paiement | PAUSE | — |
| B:578 | annulation / remboursement | PARTIEL | l'annulation par le pro prévient le client (`notification-subscriptions.ts:33`, message du refus) ; remboursement : pause |
| B:581 | pro : nouvelle demande | PARTIEL | `booking.requested` → `notifyProRequested` ; transport de dev |
| B:582 | client : acceptée, payer l'acompte (lien) | PARTIEL | `booking.accepted` → `notifyClientAccepted` ; lien de paiement : pause ; branche (6) du chemin de l'argent |
| B:583 | client : refusée | PARTIEL | `booking.declined` ; transport de dev |
| B:584 | client : expirée | ABSENT | pas d'expiration (B:359), pas d'abonnement |
| B:587 | pro : visite prise | PARTIEL | `visit.booked` → `notifyProBooked` |
| B:588 | client : visite confirmée | PARTIEL | `visit.booked` → `confirmToClient` |
| B:589 | client : visite annulée par la salle | PARTIEL | `visit.cancelledByPro` |
| B:590 | cashback reçu | ABSENT | — |
| B:591 | cashback payé | ABSENT | — |
| B:592 | cashback refusé | ABSENT | — |

## PHASE 9 — client (51)

| renvoi | entrée (abrégée) | verdict | ce qui a été lu |
|---|---|---|---|
| B:604 | page « Bientôt disponible » réutilisable | ÉCARTÉ | écart assumé (`AGENTS.md`, lot UI-N1) : rubriques en `<span>` « Bientôt » ; CGU et confidentialité, elles, sont des pages « Bientôt » (captures 10, 11, 22, 23) |
| B:605 | pied de page | RÉALISÉ | captures 01, 27 |
| B:606 | hôte de toasts | ABSENT | 0 occurrence dans `apps/client/src` |
| B:608 | restauration du défilement | NON CONFRONTÉ | 0 occurrence ; le comportement par défaut de Next n'a pas été mesuré |
| B:619 | héros + barre de recherche (lieu, date, invités, budget) | PARTIEL | le formulaire porte `guests` et `maxPrice` seulement ; ni lieu ni date (entrée P2 « réintégrer la DATE ») |
| B:620 | carte à venir (accueil) | RÉALISÉ | section `hm-map` (`home-view.tsx:173`) |
| B:621 | grille de salles + carrousel `next/image` | PARTIEL | grille présente ; ni carrousel ni `next/image` (écarté, A6a-P) |
| B:622 | « Comment ça marche » | RÉALISÉ | section `hm-how` |
| B:625 | résultats liés à `GET /venues` | RÉALISÉ | A7, `/[locale]/salles` rendue par le serveur ; captures 02, 14 |
| B:626 | carte à venir (recherche) | RÉALISÉ | vue « carte » → panneau « à venir » (`search-view.tsx:212`) |
| B:627 | curseur de capacité | RÉALISÉ | capture 14 |
| B:628 | curseur de budget | RÉALISÉ | capture 14 ; « DÉFAUT B » (B:1325) résolu dans le code (D254), entrée restée ouverte |
| B:629 | équipements | RÉALISÉ | capture 14 |
| B:630 | tri (recommandé, prix, note) | PARTIEL | `VENUE_LIST_SORTS` = `recent`, `price_asc`, `price_desc` ; « recommandé » volontairement non fait (B:716) ; pas de note |
| B:631 | réinitialiser | RÉALISÉ | capture 14 |
| B:632 | compte et états vides / erreur | RÉALISÉ | A7 : trois états distincts ; capture 14 (« 7 قاعة ») |
| B:633 | filtres dans l'URL | RÉALISÉ | `<form method="get">`, M3 : `/ar/salles?guests=&maxPrice=` |
| B:636 | galerie + visionneuse | PARTIEL | galerie sans visionneuse, écart écrit (A8) |
| B:637 | Matterport au geste | RÉALISÉ | A6a, A8 |
| B:638 | avis, capacité, prix de base | PARTIEL | capacité et « à partir de » ; aucun avis |
| B:639 | icônes d'équipements | RÉALISÉ | `AmenityIcon` |
| B:640 | onglets | ABSENT | — |
| B:641 | bouton ♥ | BIENTÔT | bouton `disabled` « annoncé, pas construit » (`venue-card.tsx:134`) |
| B:642 | réserver une visite | RÉALISÉ | `visit-booking-panel.tsx` ; capture 26 |
| B:643 | panneau de réservation | PARTIEL | présent ; ne propose aucune date (B:646) |
| B:646 | choix du créneau | CASSÉ À L'ÉCRAN | fenêtre de 182 jours refusée en 400 (`mesures/mesurer-fenetre-panneau-sortie.txt`) ⇒ « aucune date » |
| B:647 | calendrier deux mois avec prix | PARTIEL | un mois navigable, prix par jour (`availability-calendar.tsx`) |
| B:648 | légende des saisons | ABSENT | aucune légende dans `availability-calendar.tsx` |
| B:649 | dates passées / prises bloquées | RÉALISÉ | statuts du moteur (D49, B3) |
| B:650 | nombre d'invités | RÉALISÉ | champ numérique (sans ±) |
| B:651 | prestations par type | PARTIEL | A3 : `lineTotal` retombe sur `fixedPriceCents` pour tout autre type |
| B:652 | récapitulatif + acompte + TVA | PARTIEL | total et acompte (aperçu recalculé, A3) ; pas de TVA ni de frais |
| B:653 | choix en ligne / espèces | ABSENT | le panneau envoie toujours `paymentMethod: "CASH"` (`booking-request-panel.tsx:181`) |
| B:654 | formulaire de contact | RÉALISÉ | sans `<label>` visibles : 1 `<label>` pour 8 champs (D143) |
| B:655 | envoi de la demande | CASSÉ À L'ÉCRAN | aucune date sélectionnable ⇒ bouton inactif (capture 26) ; l'API accepte (201) |
| B:656 | libellé « Envoyer la demande » | RÉALISÉ | « Envoyer ma demande » |
| B:657 | écran « demande envoyée » | RÉALISÉ | état `sent` (message + lien vers `/compte`) — inatteignable tant que B:655 |
| B:660 | mes demandes, tous statuts | RÉALISÉ | section « Mes réservations » de `/compte`, clés `st_<STATUT>` ; capture 27 |
| B:661 | mes visites | RÉALISÉ | capture 27 |
| B:662 | détail d'une demande | ABSENT | liste seule |
| B:663 | écran de paiement | PAUSE | — |
| B:664 | paiement en ligne avec remise | PAUSE | — |
| B:665 | parcours espèces + cashback | PAUSE | — |
| B:666 | retour Chargily réussi | PAUSE | — |
| B:667 | retour Chargily échoué | PAUSE | — |
| B:668 | formulaire de cashback | ABSENT | — |
| B:669 | statut du cashback | ABSENT | — |
| B:677 | `/fr` `/ar` + hreflang | PARTIEL | segments de locale ; pas d'`alternates.languages` ([16]) — `hrefLang` n'existe que sur le lien de langue |
| B:678 | métadonnées, sitemap, robots, OG | PARTIEL | métadonnées et OG du détail ; ni `robots` ni `sitemap` ([15]) |
| B:679 | découpage du code | NON CONFRONTÉ | — |
| B:680 | `next/image` | ÉCARTÉ | non utilisé, écrit (A6a-P, A8) |

## PHASE 10 — pro (25)

| renvoi | entrée (abrégée) | verdict | ce qui a été lu |
|---|---|---|---|
| B:691 | tableau de bord (réservations, revenus, KPI) | PARTIEL | panneau : visites du jour, demandes en attente, transformation des devis ; aucun revenu (capture 33) |
| B:692 | boîte des demandes | RÉALISÉ | `/demandes` ; capture 43 |
| B:693 | accepter / refuser | RÉALISÉ | capture 43 ; rang 23 (F1, F5) |
| B:694 | avertissement de chevauchement | RÉALISÉ | badge `conflictIds` avant le clic |
| B:695 | échec d'acceptation propre | RÉALISÉ | 409 `BOOKING_SLOT_TAKEN` ⇒ rechargement (`booking-requests-section.tsx:91`) |
| B:696 | calendrier | RÉALISÉ | lecture seule ; capture 44 |
| B:697 | blocages | RÉALISÉ | `blocks-section.tsx` (assistant de salle) |
| B:698 | éditeur de créneaux | RÉALISÉ | `slots-section.tsx` |
| B:699 | règles de prix | RÉALISÉ | `pricing-rules-editor.tsx` |
| B:700 | éditeur de prestations | RÉALISÉ | `services-section.tsx` |
| B:701 | plages de visite | RÉALISÉ | `visits-section.tsx` |
| B:702 | mes visites (pro) | RÉALISÉ | volet « Rendez-vous de visite » ; capture 43 |
| B:703 | réservation sur place (créée confirmée) | RÉALISÉ AUTREMENT | parcours « client sur place » : devis → demande → `ACCEPTED`, jamais `CONFIRMED` (`walkin-journey.tsx`) |
| B:704 | gestion des clients | ABSENT | — |
| B:705 | revenus et commission | ABSENT | — |
| B:716 | tri « recommandé » volontairement non fait | ÉCARTÉ | toujours vrai : absent de `VENUE_LIST_SORTS`, par décision écrite |
| B:728 | dire au pro que le prix saisi est écrasé | ABSENT | aucune des 1 094 clés FR ne le dit |
| B:738 | prix résolu par date (pro) | RÉALISÉ | `venue-calendar.tsx:287` |
| B:777 | C3 — prise de rendez-vous client | RÉALISÉ | B:372 |
| B:778 | fournisseur WhatsApp, synchrone ou file | DÉCISION OUVERTE | aucun fournisseur ; transport = journal de dev (B:568) |
| B:779 | C4 — écran pro des plages | RÉALISÉ | B:701 |
| B:780 | C5 — écran client de rendez-vous | RÉALISÉ | B:642 |
| B:781 | « l'api-client n'a aucune méthode pour les visites » | périmée | `visit-bookings-client`, exporté `packages/api-client/src/index.ts:26` |
| B:791 | 404 bilingue | RÉALISÉ | `[locale]/not-found.tsx` + attrape-tout ; captures 12, 24 en 404 |
| B:792 | schema.org | ABSENT | 0 `ld+json` ([18]) |

## PHASE 12 — admin (6)

| renvoi | entrée (abrégée) | verdict | ce qui a été lu |
|---|---|---|---|
| B:830 | publier une salle | RÉALISÉ | `POST /api/v1/admin/venues/:id/publish` : 200 mesuré par le script de captures |
| B:831 | rejeter une salle | ABSENT | absent de la carte des routes |
| B:832 | taux de commission | RÉALISÉ | `PATCH /api/v1/admin/venues/:id/commission-rate` (branche 1 du chemin de l'argent) |
| B:833 | cashback (admin) | ABSENT | — |
| B:834 | rôle et garde ADMIN | RÉALISÉ | `@Roles(UserRole.ADMIN)` au niveau classe ; ⚠ aucun chemin du produit ne CRÉE un ADMIN |
| B:835 | documenter le flux DBeaver | ABSENT | aucun document hors `docs/preuves/` et `docs/history/` |
