# FC-9 — le RELEVÉ des avertissements `act(...)` de la suite client, et leur cause

Mesuré sur `f4c9256` (FC-8 clos), AVANT toute modification : trois passes `UPDATE_CONSOLE_CEILINGS=1` de la suite client
(`releve/passe-1.txt` à `passe-3.txt`), dépouillées par un extracteur qui retire les codes ANSI avant de lire (D275) et imprime ce
qu'il a parcouru (D290) : 1 201, 1 199 et 1 196 lignes lues ; 39 blocs `stderr` vus à chaque passe.

## Ce que disent les trois passes — identiques

| fichier | plafond (exemption) | relevé ×3 | avertissements « not wrapped in act » | tests émetteurs | composants émetteurs |
|---|---|---|---|---|---|
| `src/components/venue/venue-detail-view.test.tsx` | 100 | 100 · 100 · 100 | 100 sur 100 | 19 sur 20 (18 × 5, et 10 pour « équipements en pastilles », qui rend DEUX fois) | `AvailabilityCalendar` ×2, `AuthProvider`, `VisitBookingPanel`, `BookingRequestPanel` — par rendu |
| `src/components/auth/google-signin.test.tsx` | 1 | 1 · 1 · 1 | 1 sur 1 | « SANS NEXT_PUBLIC_GOOGLE_CLIENT_ID : ne rend RIEN… (feature OFF) » | `AuthProvider` |
| `src/components/venue/booking-request-panel.test.tsx` | 5 | 0 · 0 · 0 | — | — | — |
| `src/components/filter-wizard.test.tsx` | 3 | 0 · 0 · 0 | — | — | — (l'assistant réécrit par FC-8 n'a plus aucun effet asynchrone) |

Aucun fichier NON exempté n'imprime de bruit (aucune ligne « NON EXEMPTÉ ET BRUYANT »). Les deux plafonds à 0 se lisaient déjà
dans la porte `test` de FC-8 (« PLAFOND ABAISSABLE … 0 observé(s) ») : trois passes concordantes de plus, ici.

## La cause — lue dans le code, confirmée par la mesure

- **La fiche de salle** monte QUATRE chargements asynchrones : l'amorçage de session (`AuthProvider`, `bootstrap()`), les créneaux de
  visite (`VisitBookingPanel`, `getVisitSlots`), les disponibilités du panneau de demande (`BookingRequestPanel`, `getVenueAvailability`
  par fenêtres) et celles du calendrier (`AvailabilityCalendar` : DEUX écritures d'état par réponse, `setData` puis `setState` — d'où
  le ×2). Les dix-neuf tests SYNCHRONES rendent la page, lisent, et rendent la main : les quatre réponses arrivent APRÈS la fin
  du test, hors `act` — cinq écritures d'état par rendu, cinq avertissements. **Le seul test qui attend l'état final** (« le panneau de visite
  est MONTÉ et interroge les créneaux », `await screen.findByText(…)`) **n'émet RIEN** : c'est la mesure qui désigne la cause.
- **Le bouton Google** : le test « feature OFF » rend `AuthProvider` sans rien attendre — son `bootstrap()` résolu écrit l'état après
  la fin du test.
- **Aucun composant n'écrit un état après démontage** : tous les avertissements sont « inside a test was not wrapped in act »
  (pendant le test, avant le nettoyage). La correction est donc dans les TESTS — attendre l'état final rendu avant de rendre la main —,
  par l'idiome que le dépôt emploie déjà (`await act(async () => render(…))`, puis l'état final par `findBy…`,
  `visit-booking-panel.test.tsx`, D269). Le conditionnel (a) de la table (un composant fautif) ne se réalise pas.

## Ce que le lot en fait

- Les deux fichiers BRUYANTS sont corrigés à la source ; les quatre exemptions sont RETIRÉES : chacun des quatre fichiers est gardé
  comme les autres, son premier avertissement le fait tomber.
- La garde d'un fichier non exempté échoue désormais par une ASSERTION (même message) : un harnais qui réintroduit le bruit lit une
  morsure, pas un plantage (D304).
- Le mécanisme de plafond garde un CAS CONNU (`test-setup-calibration.test.ts`, deux lignes, exempté à deux) : sans lui, plus rien
  ne prouverait qu'il marche, et les cibles S8 de `neutralize-e3d1-s8.py` perdraient leur fichier.
