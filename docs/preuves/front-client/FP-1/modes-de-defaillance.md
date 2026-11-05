# FP-1 — LA QUANTITÉ (PER_UNIT) ET LE PALIER (TIERED) AU COMPTOIR — modes de défaillance — le cadrage, écrit AVANT tout test et tout code

Méthode RENFORCÉE (consigne : « l'écran ne fait que capturer » ; la donnée qui entre dans le calcul d'un montant, branche (5) de la
règle de portée — D311 ; D325 : la méthode se décide par ce que le lot touche). Le contrat existe : `bookingServiceChoiceSchema`
(`packages/types/src/service.ts`) — `tierId` REQUIS en TIERED et INTERDIT ailleurs ; `quantity` REQUISE en PER_UNIT et INTERDITE
ailleurs ; bornes `minUnits`/`maxUnits` du PER_UNIT (refus `quantityRange`). Aujourd'hui l'écran envoie `{ serviceId }` SEUL
(`walkin-journey.tsx`, `body()`) : un TIERED ou un PER_UNIT coché fait REFUSER le devis par le serveur (400).

| # | mode de défaillance | conséquence | garde prévue |
|---|---|---|---|
| MD-1 | un TIERED coché sans palier | 400 au calcul ; ou, pire, un palier choisi PAR DÉFAUT que le pro n'a pas choisi : un montant faux | aucun défaut ; « Voir le devis » inactif, la raison DITE ; test |
| MD-2 | un PER_UNIT coché sans quantité | 400 au calcul | idem MD-1 |
| MD-3 | une quantité hors des bornes du catalogue | 400 `quantityRange` | les bornes LUES dans le catalogue (`minUnits`/`maxUnits` du DTO), jamais recopiées ; message ; le serveur reste l'autorité |
| MD-4 | `tierId` envoyé hors TIERED, `quantity` hors PER_UNIT | 400 (« interdit ailleurs ») | UNE fonction pure qui bâtit le choix par `pricingType` ; test par type, valeurs dérivées du contrat |
| MD-5 | la valeur envoyée n'est pas celle saisie (chaîne, zéros de tête, virgule) | une autre quantité facturée | test : la quantité ENVOYÉE = la quantité SAISIE (règle des montants, D325) |
| MD-6 | changer le palier ou la quantité APRÈS un calcul | un devis converti qui ne dit pas ce que l'écran montre | `invalidate()` comme `togglePick` ; test : le devis affiché tombe |
| MD-7 | décocher une prestation garde son palier ou sa quantité | un choix fantôme renvoyé au recochage | décocher EFFACE le choix ; test |
| MD-8 | l'écran calcule un total (palier × invités, prix × quantité) | un second calcul du même montant (D188) | AUCUN montant calculé : le prix d'un palier s'affiche tel que le serveur le rend (formatage seul), le total est celui du devis ; garde de source |
| MD-9 | la révision n'emporte pas les choix | une version N+1 sans palier : 400 | `body()` partagé par création et révision ; test sur `revise` |
| MD-10 | le libellé d'un palier en français dans une page arabe | défaut FC-3 | `labelAr`/`labelFr` par la règle de FC-3 (repli DIT) |
| MD-11 | un palier inactif (`isActive: false`) proposé | 400 ou un palier retiré | seuls les paliers actifs ; test |

## La forme de la garde — dérivée des modes ci-dessus
- **UNE règle pure** (`apps/pro/src/dashboard/walkin-services.ts`, D187) : `choixDePrestation(service, détail)` rend le choix tel que le
  contrat l'attend — `{ serviceId }` (FIXED, PER_GUEST), `{ serviceId, tierId }` (TIERED, palier ACTIF du catalogue), `{ serviceId,
  quantity }` (PER_UNIT, entier saisi dans les bornes du catalogue) — ou `null` quand le détail manque ; elle ne calcule AUCUN montant.
  Les types de tarification sont lus dans l'autorité (`ServicePricingType`, `@zwadj/types`), jamais recopiés.
- **L'écran ne fait que saisir** : un palier (liste des paliers actifs, libellé dans la langue de la page) ou une quantité (bornes du
  catalogue) sous chaque prestation cochée qui en demande un ; « Voir le devis » et « Calculer » restent INACTIFS tant qu'un détail
  manque, la raison DITE (MD-1, MD-2) ; décocher efface le détail (MD-7) ; changer un détail jette le devis affiché (MD-6) ; le corps de
  la création ET de la révision passe par la même fonction (MD-9).
- **Chaque garde se neutralise** (harnais `neutralize-fp1.py`) et son échec se LIT en assertion (D304) — sinon elle ne compte pas.
