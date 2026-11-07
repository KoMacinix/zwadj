# FP-4 — RAFRAÎCHIR LE PANNEAU GAUCHE ET LE SÉLECTEUR APRÈS LES ENREGISTREMENTS — **ARRÊTÉ** (prémisse fausse, lue dans le code)

Session `front-client`, 06/11/2026. Aucun code, aucun test, aucun harnais : ce lot est cette pièce. Règle d'arrêt de la consigne :
« prémisse fausse ». Le code est lu à `HEAD` (`bcb51fd` : le fournisseur, le panneau, le sélecteur, les sections de l'assistant), chaque fait relu avant l'écriture de cette pièce.

## La consigne, et la décision qu'elle vise
Consigne FP-4 : « rafraîchir le panneau gauche et le sélecteur de salle après les enregistrements (S-4 de D331 ; `ProVenuesProvider`
source unique ; la garde `ma-salle-relecture.test.tsx` tient) ».
S-4 de D331 (décision de la session, section D331 de `ZWADJ_CONTINUITE.md`) : « les sections de l'assistant (créneaux, prestations,
acompte, photos, visite virtuelle) ne déclenchent **pas** de relecture. *Motif* : M-23 nomme création, édition, publication,
suppression ; la liste les reprend à l'entrée. »

## La prémisse : « le panneau gauche et le sélecteur montrent une donnée que ces sections écrivent »
| surface | ce qu'elle affiche (lu) | écrit par une des cinq sections ? |
|---|---|---|
| panneau gauche (`apps/pro/src/dashboard/dashboard-aside.tsx`, `DashboardAside`) | le **nom** de la salle (`venue.nameFr` / `nameAr`), quatre liens, et des **compteurs lus par l'API** à partir de `venue.id` : visites du jour, demandes en attente, entonnoir des devis | non — le nom s'écrit à l'étape 1 de l'assistant ; les compteurs viennent de requêtes, pas de la liste |
| sélecteur de salle (`apps/pro/src/shell/venue-scope.tsx`, `VenueScope`) | les **noms** des salles | non |
| libellé « Ma salle / Mes salles » (`apps/pro/src/shell/pro-nav.tsx`) | le **compte** des salles | non |

⇒ **Aucune des cinq sections ne change ce que ces trois surfaces montrent.** Le nom, lui, est déjà relu : « Enregistrer » de l'étape 1
appelle `reloadVenues()` (D331), et la garde `ma-salle-relecture.test.tsx` le tient. Relire la liste COMPLÈTE des salles (photos
comprises) après chaque créneau, prestation, photo ou acompte enregistré n'aurait donc aucun effet visible sur ces surfaces — et
contredirait S-4, dont le motif (« la liste les reprend à l'entrée ») tient pour elles.

## Ce que la lecture a trouvé à côté — un défaut croisé réel, **non reproduit par un test** (hypothèse, D291)
Le récapitulatif du comptoir (`apps/pro/src/dashboard/walkin-journey.tsx`, `slotLabel`, puis sa ligne « Créneau » : `slotLabel(slotId) ?? slotId`)
cherche le NOM du créneau choisi dans `venue.slotTemplates`, la copie que le fournisseur a lue de la salle courante. Un créneau CRÉÉ à l'étape 4 de
l'assistant après la dernière lecture n'y est pas tant que la liste n'est pas relue : `/salles` la relit à l'entrée (D331, S5), le tableau de bord non —
la ligne « Créneau » du récapitulatif afficherait alors l'IDENTIFIANT du créneau (le repli `?? slotId`) au lieu de son nom. Même famille pour la
couverture, la capacité et le prix de la carte de `/salles` (relus à l'entrée : sans effet). Hypothèse de lecture : aucun test ne l'a reproduite.

## Options pour Ko
1. **Garder l'état** : la prémisse de S-4 tient pour le panneau et le sélecteur ; le défaut du récapitulatif reste rapporté.
2. **Relire après l'enregistrement d'un créneau seulement** — la seule section dont la donnée est lue ailleurs (le comptoir) : un
   rappel `onSaved` de `SlotsSection`, `reload()` du fournisseur ; un lot de code, méthode normale, qui nomme S-4 en le BORNANT.
3. **Que le comptoir ne dépende plus de `venue.slotTemplates`** : la réponse de disponibilité que le calendrier du comptoir charge déjà porte les
   créneaux ACTIFS de la salle (`VenueAvailabilityResponse.slots`, `packages/types/src/venue.ts`) ; à vérifier qu'elle porte leurs noms avant de s'y fier.

⇒ Recommandation de la session : **1**, puis **2** si Ko confirme le défaut par un geste (créer un créneau, aller au tableau de bord,
répondre jusqu'au créneau : la ligne du récapitulatif montre-t-elle un identifiant au lieu d'un nom ?).
