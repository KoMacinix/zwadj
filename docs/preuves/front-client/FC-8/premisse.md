# FC-8 — la prémisse, vérifiée à `483a6b8` (D231) : le cadrage du lot ③ confronté au code d'aujourd'hui

**Le cadrage** (`ZWADJ_CONTINUITE.md`, D229 à D231, « NON LIVRÉ » — D232) :
- **D229** — « L'assistant n'est plus une route, c'est un MODE de `/salles`. » « AUCUN ÉTAT LOCAL : l'URL est la seule source de
  vérité. Chaque réponse pousse vers `/salles?…`. » « Sur l'accueil, répondre à la première question pousse vers
  `/salles?cityId=…&guide=guests` ; la suite se déroule dans l'overlay, au-dessus des résultats réels. » « Le champ invités est le
  seul non contrôlé. » Le libellé devient « Li hwas lqa ».
- **D230** — « `?guide=` porte l'ÉTAPE, pas un booléen » ; « le bouton retour recule d'une question » ; « toute valeur inconnue
  FERME le panneau » ; « `guide` ET `maxPriceCents` entrent dans `isVariant` ».
- **D231** — « Accueil : formulaire SSR à TROIS champs, strictement additif. Commune + invités + budget […]. Sans JS : soumet les
  trois. Avec JS : le même formulaire devient l'étape 1. »
- **La consigne** : supprimer `/[locale]/assistant` ; la date (cinquième étape) HORS lot.

**Le code au SHA de départ** :
- l'assistant est une ROUTE dédiée (`apps/client/src/app/[locale]/assistant/page.tsx`, `ASSISTANT_PATH`) dont le composant
  (`filter-wizard.tsx`, 500 lignes) tient son état EN LOCAL (`useState` : étape, commune, invités, budget, styles, équipements),
  interroge l'API pour un compteur (`countVenues`, en centimes) et ne pousse l'URL qu'à la fin. Son en-tête dit « ROUTE DÉDIÉE,
  ET C'EST STRUCTUREL (arbitrage Ko) » : c'est le compromis que D229, POSTÉRIEURE, annule.
- `/salles` est rendue par le serveur à partir de l'URL (`parseSearchParams` → `SearchView`) : le modèle de D229 (l'URL seule
  source de vérité) y est DÉJÀ — l'assistant le rejoint.
- l'accueil a DEUX champs (invités, budget), un `<form method="get">` vers `/salles`, et un lien « Répondre à quatre questions
  guidées » vers `/assistant`.
- `guide` n'existe nulle part ; `SEARCH_VARIANT_PARAMS` ne le porte pas.

**Confrontation, point par point** :
1. Aucune décision POSTÉRIEURE ne contredit D229 à D231 : l'en-tête de la route dédiée cite l'arbitrage que D229 annule ; D254
   (les paliers de budget, une seule autorité en dinars) est compatible — l'assistant pousse `maxPrice` en dinars.
2. **Une incidente, créée par FC-7** : D230 fait entrer `maxPriceCents` dans `isVariant` parce que le repli le LISAIT encore ; FC-7
   l'a retiré, le paramètre n'a plus aucun effet sur la page — il ne fait plus une seconde adresse. ⇒ Seul `guide` entre dans
   `SEARCH_VARIANT_PARAMS` ; ce n'est pas une contradiction avec le code, c'est la prémisse de D230 que FC-7 a changée.
3. Quatre harnais d'autres rangs MESURENT l'assistant actuel : `neutralize-journey.py` (la chrome partagée, D223 — l'assistant
   est son consommateur client), `neutralize-r32.py` (R-1, « client-wizard »), `neutralize-maxprice.py` (M3, M4),
   `neutralize-e3d1-s8.py` (S8-1 à S8-3, le plafond d'avertissements de `filter-wizard.test.tsx`). ⇒ Le composant est réécrit EN
   PLACE (même fichier, même nom), la chrome partagée (rail, récapitulatif, liaison, carte) est GARDÉE, et les titres que ces
   harnais attendent sont conservés là où leur sens tient. Ce qui devient sans objet (le compteur d'API de M4) se retire par
   écrit.

⇒ **Le cadrage ne contredit pas le code : le lot se fait.**

**Ce que « avec JavaScript » veut dire ici, écrit avant le code** : l'assistant se MONTE côté client seulement, par-dessus les
résultats ; sans JavaScript, `/salles?guide=…` rend la page de résultats et son formulaire, entiers (un panneau qui ne répond pas
masquerait une page qui marche). L'accueil, sans JavaScript, soumet ses trois champs ; avec JavaScript, le même formulaire porte
l'étape SUIVANTE (`guide`) : la première question sans réponse — après la commune, les invités (D229, mot pour mot).
