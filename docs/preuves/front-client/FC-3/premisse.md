# FC-3 — la prémisse, vérifiée à `c780dfc` (D231)

**Le défaut existe encore** : `apps/client/src/components/venue/booking-request-panel.tsx` lit, quelle que soit la langue,
`slot.nameFr` (l. 197, nom du créneau), `service.nameFr` (l. 387, 404, 427), `service.unitNameFr` (l. 392), `tier.labelFr`
(l. 419). Les DTO portent l'arabe : `VenueAvailabilitySlotDTO.nameAr`, `ServiceDTO.nameAr`, `ServiceDTO.unitNameAr` (nullable),
`ServiceTierDTO.labelAr` (`packages/types/src/venue.ts`, `service.ts`). Le contrat exige ces champs non vides à la création
(`label()` : `trim().min(1)`), sauf `unitNameAr` hors « à l'unité » ; le repli ne sert donc qu'aux données héritées ou absentes.

**Mesuré** (`rouges/rouge-panneau.txt`) : en arabe, le panneau affiche « Soirée », « Traiteur », « par table », « Formule or ».

**Ce que le correctif fera** : une règle, un module pur (`apps/client/src/lib/nom-localise.ts`) — en arabe le champ arabe, le
français seulement si l'arabe est vide (blancs compris) ; le repli se DIT (`lang="fr"`, `dir="ltr"` sur le texte rendu, sauf
dans une phrase de message — l'unité — où aucun élément ne peut s'insérer). Affichage seul : aucun montant, aucun identifiant
envoyé au serveur ne passe par la règle (décision du relecteur pour FC-3).
