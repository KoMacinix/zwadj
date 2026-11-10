# D347 — la carte des gardes de r32 (R-2), versée AVANT tout code

Source des gardes : `docs/preuves/D325/navigateur/r32-nouvelle-reservation.e2e.ts` (cinq tests, intacte). Pour chaque garde : ce qui la mesure DÉJÀ dans un navigateur au SHA `0d61ba0`, relevé par `grep` dans `e2e/specs/` (les mots-clés cherchés sont dans la colonne « relevé »), ou « personne ».

⚠ Cette carte dit où une garde n'est mesurée par AUCUNE spec. Elle ne dit pas que l'application satisfait la garde : c'est le rôle des rouges et de la spec (R-3 si elle la contredit).

| id | garde de r32 | qui la mesure aujourd'hui | relevé | r49 |
|---|---|---|---|---|
| G1a | « Continuer » grisé DIT pourquoi : la liste des raisons, liée au bouton par `aria-describedby` (étapes Contact et Client) | **personne** | `wk-continue`, `aria-describedby` : seul `r33:205` (la remise du devis, `wk-deliver-reason`) | OUI (T1) |
| G1b | un nom avec un chiffre est refusé sous le champ ; l'arabe et le tiret passent | **personne** | `Invalid` : aucun message de nom dans `e2e/specs/` | OUI (T1) |
| G1c | téléphone : indicatif et drapeau devant ; premier chiffre refusé GARDÉ SEUL, saisie suivante bloquée ; chiffres seuls, au plus neuf | **personne** | `leadingDigit`, `needPhone` : aucun. `r41`/`r47` ne tapent qu'un numéro VALIDE | OUI (T1) |
| G1d | e-mail à moitié tapé refusé par la règle du contrat ; vide, il ne retient rien | **personne** côté Pro | `emailInvalid` : `r42:88` mesure le panneau du CLIENT, pas l'écran du Pro | OUI (T1) |
| G1e | un exemple (`placeholder`) dans chaque champ, libellé visible | **personne** | `placeholder` : aucune occurrence | OUI (T1) |
| G1f | le libellé « Téléphone » plus près de SON champ que du champ du dessus | **personne** — mais **la garde de r32 n'a plus d'objet à l'écran d'aujourd'hui** : le téléphone est le PREMIER champ (il n'y a plus de « Prénom » au-dessus) | `boundingBox` : aucune | **REPRISE ADAPTÉE** : la proximité libellé-champ se mesure là où deux champs s'empilent (T6, 360 px) ; sinon ARRÊTÉE par écrit (voir « arrêtées ») |
| G1g | « Précédent » est à GAUCHE de l'action principale en français | **personne** | `Précédent`/`previous` : aucune spec | OUI (T2) |
| G1h | ⛔ le total et l'acompte AFFICHÉS sont ceux de la réponse du SERVEUR | **personne** | `wk-grand`, `wk-deposit` : aucune occurrence | OUI (T2) |
| G1i | le libellé « Client » du rail ramène à l'étape sans rien effacer | **personne** | le rail (`progressLabel`) : aucune occurrence ; `r47` mesure un aller-retour d'ONGLET, pas le rail | OUI (T2) |
| G1j | la fenêtre de confirmation ne s'ouvre PAS avant la réponse du serveur (réponse RETENUE) | **personne** | `route(` : aucune occurrence dans `e2e/specs/` ; `r41:104` voit la fenêtre APRÈS | OUI (T2) |
| G1k | la fenêtre nomme le client, dit l'action, porte une date ; « Fermer » la ferme | **personne** | `doneTitle` : `r41:104` voit le TITRE seulement | OUI (T2) |
| G1l | « Nouveau devis » remplace le bouton de remise à zéro, repart du début, formulaire vidé | **personne** | `newQuote` : aucune occurrence ; `r47` mesure « Recommencer » (avant la conclusion) | OUI (T2) |
| G1m | la valeur ENREGISTRÉE est celle SAISIE (ligne `PENDING` relue par l'API) | **partielle** : `r41:101-103` mesure le CORPS de la requête `convert`, pas la ligne écrite | `r41` | OUI (T2) — seule la ligne relue, jamais le corps (aucun doublon) |
| G2 | « Bloquer la date » : la fenêtre dit « bloquée », la ligne écrite est `ACCEPTED` | **personne** | `lockDate`, `ACCEPTED` : seul `r26` (côté client, un AUTRE parcours) | OUI (T3) |
| G3 | un échec du serveur ne confirme RIEN : fenêtre fermée, erreur visible, pas de « Nouveau devis » | **personne** | `route(` : aucune occurrence | OUI (T4) |
| G4 | calendrier du parcours : un jour BLOQUÉ de week-end garde sa couleur de statut ET un hachurage ; le week-end libre est plus clair | **personne** | `is-blocked`, `is-weekend`, `repeating-linear` : aucune occurrence | OUI (T5) |
| G5a | en arabe, à 360 px : `dir="rtl"`, chaque libellé pointe son champ (quatre identifiants distincts), exemples en arabe | **personne** | `r43`/`r47` jouent le parcours en arabe mais ne mesurent ni la direction ni les libellés | OUI (T6) |
| G5b | le numéro reste de gauche à droite : drapeau à gauche des chiffres, `dir="ltr"` sur la boîte | **personne** | `phone-field` : aucune occurrence | OUI (T6) |
| G5c | rien ne déborde à 360 px | **personne** pour le Pro | `fc2-debordement-360` : « l'app Pro : non mesurée » (son en-tête) | OUI (T6) |
| G5d | « Précédent » à DROITE de l'action en arabe | **personne** | — | OUI (T6) |

## Arrêtées d'avance (R-6) — gardes de r32 qui ne se reprennent PAS telles quelles
- **G1f sous sa forme de r32** (« le libellé du téléphone est deux fois plus près de son champ que du champ du dessus ») : il n'y a plus de champ au-dessus du téléphone. Reprise en T6 (empilement à 360 px, libellé de l'e-mail contre la boîte du téléphone). Si T6 ne la tient pas, elle sera listée ici comme arrêtée, avec la mesure.
- **`remplirClient`** (prénom, nom, numéro, invités sur UN écran) : l'écran est scindé en deux (contact, puis noms et invités) depuis le rang 41. Pas reprise (R-1).

## R-5 — le cache d'une heure des référentiels
Aucune garde de r49 n'en dépend : les gardes vivent dans l'application Pro, sur une salle créée par `createPublishedVenue()` ; aucune ne lit les styles ni les équipements (côté client, `revalidate: 3600`). **Dit, comme R-5 l'exige : pas de dépendance.**

## Ce que la carte ne dit pas
- Elle ne couvre que ce que `grep` voit dans `e2e/specs/`. Un test de composant (vitest) qui mesure la même règle dans jsdom existe peut-être (`walkin-journey.test.tsx`, 3 053 lignes) : il ne mesure PAS la cascade CSS, la géométrie ni l'ordre des événements, qui sont l'objet de r32 (en-tête de r32 : « jsdom ne calcule ni l'un ni l'autre »).
