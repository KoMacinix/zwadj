# Lot C3 — décisions à insérer dans `ZWADJ_CONTINUITE.md` après D60

---

### D61 — Corps de la demande : date civile + minutes, téléphone client OPTIONNEL

Le corps de `POST /venues/:slug/visit-bookings` est `{ date: "YYYY-MM-DD", startMinutes, phone? }`. **Jamais un instant ISO** : accepter un horodatage offsetté laisserait le navigateur choisir le fuseau, ce que D48 interdit précisément. La conversion en instant se fait côté serveur, une seule fois, avec le décalage d'Alger — et le DTO relu redonne exactement le repère envoyé (symétrie D51, via `msToCivilDateTime` et lui seul).

Le **téléphone du pro est structurellement obligatoire** (`ProProfile.phone` est NOT NULL) : c'est le destinataire WhatsApp de D60, la notification n'existe pas sans lui. Le **téléphone du client est OPTIONNEL** — décision de Ko. Exiger un numéro à l'étape du rendez-vous coûterait des rendez-vous, et le pro dispose toujours de l'e-mail.

- Résolution du contact : `body.phone ?? User.phone ?? null`, **snapshotée** dans `visit_bookings.contact_phone` (NULLABLE) — même patron que `Booking.contactPhone`. Le pro rappelle sur le numéro qui lui a été donné **au moment du rendez-vous**, pas sur celui que le client aurait changé depuis.
- Le message au pro affiche le téléphone **s'il existe, sinon l'e-mail** : un pro qui lit « téléphone : null » n'a aucun moyen de rappeler. *Testé : `client sans téléphone → le pro reçoit l'e-mail de rappel, jamais « null »`.*
- Nom et prénom **ne sont pas snapshotés** : ils viennent de la relation `client`. Une anonymisation loi 18-07 doit faire disparaître le nom d'un rendez-vous passé, pas le figer. Un compte sans nom (inscription Google) retombe sur son e-mail.
- **Aucun `CHECK` de format** sur `contact_phone` : `dzPhoneSchema` valide déjà `+213`, et ni `pro_profiles.phone` ni `bookings.contact_phone` n'en portent. Une borne ne se valide jamais deux fois (D55).

⚠ **`startMinutes` est borné à la JOURNÉE (0–1439), pas à « 1440 − 30 ».** Le schéma dit seulement « une minute réelle du jour » ; savoir si un créneau **existe** appartient au découpage des plages. **Aucune arithmétique `% VISIT_DURATION_MINUTES` nulle part** : une plage 09:20→10:20 rend légitimement 09:20 et 09:50 — un modulo refuserait des créneaux **réels**. C'était la cinquième occasion de ce bug (D55) ; *le test d'intégration `plage 09:20→10:20 : 09:20 et 09:50 sont réservables, 09:40 est REFUSÉ` existe pour qu'il ne revienne pas.*

**Deux questions, deux autorités** — c'est le cœur du lot :

| Question | Autorité | Conséquence de code |
|---|---|---|
| Ce créneau **existe**-t-il ? | les plages du pro | `computeVisitSlots(..., bookings: [])` puis test d'appartenance → 409 `VISIT_SLOT_UNAVAILABLE` |
| Ce créneau est-il **pris** ? | la **BASE** seule | `P2002` sur `visit_bookings_no_double_confirmed` traduit → 409 `VISIT_SLOT_TAKEN` |

`bookings: []` est **voulu** : recharger les rendez-vous pour tester `taken` avant d'insérer serait le redoublement applicatif que la doctrine interdit — entre le test et l'insertion il reste toujours une fenêtre, et deux clients qui cliquent sur le même créneau à la même seconde sont le cas **probable**. `VISIT_SLOT_TAKEN` n'a donc **qu'un seul chemin de sortie** dans tout le dépôt.

Refus supplémentaires, tous en `VISIT_SLOT_UNAVAILABLE` : date **au-delà de l'horizon** 18 mois (⚠ l'écrêtage silencieux de D49 vise les **fenêtres de lecture** ; une écriture hors horizon se **refuse** — déplacer un rendez-vous de dix-huit mois serait pire), plage **suspendue**, jour **sans plage**, et créneau **passé** (le moteur filtre à la **minute**).

La règle de visibilité est **exactement** celle de `/visit-slots` (`PUBLIC_BASE_WHERE` + `PUBLIC_DETAIL_STATUSES`, D33) : **`TEMPORARILY_UNAVAILABLE` reste réservable**. Une règle plus stricte proposerait des créneaux que le POST refuserait ; un pro qui ne veut plus de visites suspend ses plages — le levier existe déjà et il est à lui.

⚠ **Premières routes `@Roles(UserRole.CLIENT)` du dépôt.** Le `JwtAuthGuard` est *stateless* : il ne vérifie ni `UserStatus.SUSPENDED` ni `emailVerifiedAt`, et **rien n'a été ajouté** — la cohérence avec le reste du dépôt est le choix. Changer la politique d'accès sera un lot en soi. Un JWT désignant un compte **disparu** rend 401 `UNAUTHENTICATED` (et non un 500 Prisma).

---

### D62 — Annulation douce, idempotente, refusée sur le passé — et un rendez-vous à venir par salle

L'annulation écrit `status = CANCELLED` + `cancelledAt`, **jamais un DELETE** : c'est le filtre `WHERE status = 'CONFIRMED'` de l'index qui libère le créneau, et la ligne annulée reste la trace de ce qui a été libéré ; un DELETE effacerait la seconde information. *Prouvé en base : annuler puis re-réserver le même créneau fonctionne.*

- **404 INDISTINCT** `VISIT_BOOKING_NOT_FOUND` : id malformé, inexistant, ou rendez-vous d'un autre client — même réponse (anti-énumération, doctrine A2).
- **Idempotente** : annuler deux fois rend 204 **sans réécrire `cancelledAt`**, sinon la date d'annulation deviendrait celle du dernier clic.
- **409 `VISIT_BOOKING_PAST`** sur un rendez-vous déjà passé : « le client a annulé » et « le client n'est pas venu » ne sont pas le même fait, et écraser l'un par l'autre trompe le pro.

**Garde d'accaparement : un seul rendez-vous CONFIRMÉ à venir par (client, salle)** → 409 `VISIT_ALREADY_BOOKED`. D59 a créé ce levier de nuisance : sous la tolérance au chevauchement, réserver seize créneaux ne gênait personne ; sous l'exclusivité, cela **tue la journée du pro**. La même heure dans une **autre salle** reste libre, et un rendez-vous **passé** ne bloque rien.

⚠ Cette garde est **applicative**, dans la transaction, et c'est assumé : aucun index ne peut l'exprimer sans interdire aussi de revenir six mois plus tard. Une course simultanée donne au pire **deux** rendez-vous au même client — bénin, contrairement au double-booking, que la base garantit seule.

`GET /me/visit-bookings` rend **tout**, trié par `scheduledAt` croissant, **annulés inclus et marqués** : « ce rendez-vous n'existe plus » est une information, sa disparition silencieuse en est le contraire. **Aucune pagination** — un client a quelques rendez-vous, pas des centaines. Décision, pas oubli.

---

### D63 — Notification : un port, un adaptateur de dev, un envoi APRÈS commit

`WHATSAPP_SENDER` est un port symétrique de `EMAIL_SENDER`, avec un `DevLoggerWhatsAppSender` qui logge au lieu d'envoyer. **Aucun fournisseur réel dans ce lot** : l'API Cloud de Meta exige un compte business vérifié, un numéro dédié et un modèle de message approuvé — des semaines d'ops qui ne doivent pas retenir le lot. Quand le vrai transport arrivera, il prendra la place de l'adaptateur sans qu'un seul appelant change, et ses variables rejoindront `PROD_REQUIRED_EXPLICIT`.

Le fichier s'appelle `whatsapp/`, pas `sms/` : l'enum `NotificationChannel.SMS` porte le **canal**, D60 tranche le **transport**. Nommer le port « SMS » obligerait chaque lecteur à se rappeler que SMS veut dire autre chose.

Envoi **synchrone, après le commit**. Deux interdits absolus :

1. **jamais dans le `$transaction`** — un envoi lent tiendrait un verrou de ligne ;
2. **jamais propagé** — un rendez-vous confirmé en base ne se dé-réserve pas parce qu'un e-mail est tombé. L'échec s'**écrit** (`status: FAILED` + `error`) et se logge. *Prouvé : transport en panne → 201, rendez-vous CONFIRMED, deux lignes FAILED.*

**`pg-boss` n'est dépendance de rien** aujourd'hui : l'introduire signifierait un worker, un schéma de plus et un nouveau mode de déploiement — cela appartient à la tranche Notifications. C'est pourquoi la ligne est écrite **`QUEUED` avant l'envoi** puis résolue : un process tué au milieu d'un envoi laisse une ligne `QUEUED` qu'un job de rejeu retrouvera. Écrire après l'envoi perdrait exactement les notifications qu'on voudrait rejouer.

Ce lot est le **premier producteur de lignes `Notification`** du dépôt. Taxonomie : `visit.booked` (au pro), `visit.confirmed` (au client), `visit.cancelled` (au pro). Le `payload` porte `{ visitBookingId, venueId, date, startMinutes }` — de quoi rejouer sans deviner.

La langue d'un message est celle du **destinataire** (`User.locale`), jamais celle de la requête qui a déclenché l'envoi : un pro arabophone notifié en français parce que le client naviguait en français serait absurde. Un canal en panne n'empêche pas l'autre. L'heure passe par `formatWallClock` (D57, seul formateur) ; la **date** utilise `Intl` avec `timeZone: "UTC"` sur le minuit UTC de la date civile — autorisé pour les dates, et aucun décalage ne peut faire glisser le jour.

---

## Écarts au prompt du lot, déclarés

1. **`apps/api/test/int/helpers.ts` modifié** (hors allowlist) : `createTestApp` capture désormais les envois WhatsApp (`ctx.whatsapps`) et expose deux bascules d'échec (`ctx.senders`). Sans elles, le chemin « l'envoi tombe, le rendez-vous survit » exigé par D63 ne se prouve pas — il faut un envoyeur qui **lève**. Extension purement additive : aucun des 25 autres specs ne change.
2. **`apps/api/src/venues/visit-bookings.schemas.spec.ts`** plutôt qu'un spec dans `packages/types` : les schémas Zod partagés y sont déjà testés (`venue-media.schemas.spec.ts`), `packages/types` n'a aucun spec.
3. **Aucun `@Throttle` par route.** Le défaut global (100/min/IP) s'applique comme sur toutes les écritures authentifiées, et la garde D62 refuse l'accaparement **avant** tout envoi. ⚠ Constat au passage : `AUTH_THROTTLE.changeEmail` et `.changePassword` sont **définies mais branchées nulle part** — `POST /me/change-email` **envoie un e-mail** à une adresse choisie par l'appelant sous le seul plafond de 100/min. Dette antérieure à ce lot, à corriger dans un lot dédié ; ce n'est pas un précédent à imiter.
4. **`prisma format` a été écarté** : il convertit tout le fichier en LF et ré-aligne des modèles hors périmètre (~90 lignes de bruit). Seul le modèle `VisitBooking` a été ré-aligné à la main, CRLF préservé.
