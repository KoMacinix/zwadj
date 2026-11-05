# FC-4 — la prémisse, vérifiée à `0c6f35e` (D231)

**Le défaut existe encore.** Deux prédicats ferment un créneau déjà demandé :
- le JOUR : `apps/client/src/lib/booking-calendar.ts`, `isDaySelectable` exige un créneau `AVAILABLE` ;
- le CRÉNEAU : `apps/client/src/components/venue/booking-request-panel.tsx`, `const free = slot.status === "AVAILABLE";` puis
  `disabled={!free}` et le libellé « prise ».
Un test du dépôt l'EXIGEAIT : `booking-calendar.test.ts`, « C-b : aucun créneau AVAILABLE… — inactif », sur un jour
`BOOKED, REQUESTED, BLOCKED`. ⇒ **inversion écrite** dans ce lot (arbitrage de Ko du 04/10/2026).

**Ce que REQUESTED veut dire — relevé dans le moteur AVANT de promettre « d'autres demandes »**
(`apps/api/src/venues/availability-engine.ts`, l. 12-20 et 154-164) :
- BLOCKED (le pro a fermé) > BOOKED (ACCEPTED/CONFIRMED, verrou dur doublé en base par l'EXCLUDE) > REQUESTED > AVAILABLE ;
- REQUESTED = **au moins une demande PENDING dont la plage HORAIRE recouvre le créneau** (« le recouvrement HORAIRE fait foi, pas
  l'identité du créneau ») ; « elle ne verrouille RIEN (deux couples peuvent demander la même date, le pro tranche) ».
- Le moteur ne dit pas QUI a demandé : la demande en attente peut être celle du visiteur. ⇒ L'avis dit « d'AUTRES demandes sont
  déjà en attente pour ce créneau » — d'autres que celle qu'il s'apprête à envoyer, ce qui est vrai dans tous les cas — et
  « la salle choisit entre les demandes ». Il ne dit pas « d'autres personnes ».
- Un jour qui porte un AVAILABLE ET un REQUESTED est « libre » (son nom ne change pas) ; un jour qui n'a que des REQUESTED (et
  des fermés) devient « demandes en attente » ; BOOKED et BLOCKED restent fermés (jour et créneau).

**Le prix** du créneau demandé est celui que le serveur rend pour ce créneau à cette date (`priceCents` de la disponibilité) :
l'écran l'affiche, il ne le calcule pas (règle des montants de D325) ; un test exige l'égalité avec le formateur appliqué à la
valeur du serveur. L'aperçu d'acompte du panneau (calcul côté navigateur, existant) n'est PAS touché : hors session (§ 4).
