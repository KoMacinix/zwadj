# D348 — M-3 : les délais de la fiche et de la liste, sur un BUILD DE PRODUCTION

⛔ **Cette pièce est écrite en deux temps.** Ce premier état (le ROUGE) est commité AVANT tout code d'application (D334, point 5). Le second état (la même mesure rejouée après la correction) est ajouté en bas, sous « Après la correction ».

## Conditions (déclarées)

- `next build` puis `next start --port 3100` de `apps/client` (NODE_ENV = production), `NEXT_PUBLIC_API_URL` sur l'API de l'e2e (port 3101, `nest start`), base jetable `zwadj_e2e`, jamais la base de développement de Ko. **Aucune copie du dépôt, aucun `revalidate` raccourci** : la valeur RÉELLE (300 s) est mesurée telle quelle — la consigne permettait de la réduire, pas de l'exiger ; ne rien modifier évite de devoir restaurer. Rien n'est commité de ce qui a servi à construire (`apps/client/.next` est ignoré par git). Le serveur de développement du client (qui écrit aussi dans `.next`) était arrêté pendant le build et la mesure.
- Instrument : `pieces/m3-instrument.mjs` (jetable, versé comme pièce, jamais promu en instrument — D291). Il crée quatre salles par l'API, visite leur fiche, change leur état, puis sonde chaque fiche toutes les 5 s pendant 11 minutes au plus.
- Sortie brute : `pieces/m3-rouge-sortie-brute.txt` (aucun jeton : l'instrument n'imprime ni identifiants ni en-têtes).
- Code d'application : `26ad5c7`, inchangé.

## Ce qui a été fait, à T = 0

| salle | avant T0 | acte à T0 |
|---|---|---|
| V1 | brouillon ; fiche visitée → **404** | publiée par l'admin |
| V2 | publiée ; fiche visitée → 200 (mise en cache) | renommée, prix changé (97 000 → 123 456 DA), une photo ajoutée |
| V3 | publiée ; fiche visitée → 200 | **masquée** (`HIDDEN`) |
| V4 | publiée ; fiche visitée → 200 | **supprimée** |

## Résultats (rouge)

| question de la consigne | mesure | verdict |
|---|---|---|
| (i) la fiche visitée AVANT la publication rend 404 : combien de temps reste-t-elle en 404 après la publication ? | **0 s** : 200 à T+1 s (premier sondage). Le 404 n'est pas gardé. | conforme |
| (ii) une salle publiée puis modifiée (nom, prix, photo) : combien de temps la fiche et la liste montrent-elles l'ancien état ? | **la liste : 0 s** (sans cache : la liste immédiate, à T+2 s, porte le nouveau nom). **La fiche : 308 s** pour le nom ET la photo, apparus ensemble au sondage de T+308 s (cache de 300 s + intervalle de sondage). | **la fiche ment jusqu'à 5 minutes** sur le nom, le prix et les photos d'une salle modifiée |
| (iii) une salle masquée ou supprimée reste-t-elle visible, et combien de temps ? | **la liste : 0 s** (V3 et V4 absentes à T+2 s). **La fiche : toujours 200 à T+663 s** (fin de la fenêtre) pour V3 ET V4 ; relue ensuite, à plus de douze minutes : **toujours 200** alors que l'API répond **404** pour les deux slugs (`GET /venues/<slug>`) ; **toujours 200 après l'arrêt et le redémarrage de `next start`** (l'entrée périmée est gardée sur disque). | **ROUGE : la fiche d'une salle masquée ou supprimée n'est pas retirée dans le délai de 300 s annoncé — elle ne l'est pas du tout, dans tout ce qui a été mesuré** |

## Rectification d'une ligne de la sortie brute (écrite à côté de la pièce, qui n'est pas retouchée — D295)

La sortie brute porte « V2 : le NOUVEAU PRIX est servi à T+1 s » : c'est un **FAUX POSITIF de l'instrument**. Son détecteur cherchait « 123456 » dans le HTML ; cette suite de chiffres figure aussi dans « 0555123456 », un exemple de validation de numéro de mobile présent sur toutes les pages. Relevé : le HTML de V2 porte `123456 DA` (le prix) **et** `basePriceCents":12345600` **après** la revalidation, pas avant. Le prix a donc changé avec le nom et la photo, à T+308 s. L'instrument n'est pas corrigé ici ; la mesure « après la correction » utilise un détecteur sur `123456 DA` (écrit avant son lancement).

## Ce que le rouge ne dit PAS (inférences, écrites comme telles)

- **La cause.** Ce qui est mesuré : une entrée de cache à 200 n'est jamais remplacée par une réponse 404 de l'API ; le prix, le nom et la photo (réponses 200) sont remplacés après 300 s. **Inférence, non lue dans le code de Next** : le cache de données de `fetch` ne retient pas une réponse non-200, donc une revalidation qui rend 404 laisse l'entrée périmée en place et continue de la servir.
- **Combien de temps « pour toujours » dure.** Mesuré : au moins 13 minutes et un redémarrage. Non mesuré au-delà ; une éviction du cache sur disque (déploiement, purge de `.next/cache`) la lèverait.
- **L'effet réel pour le visiteur d'un site en production.** Le build est celui de `next build` sur ce poste ; un hébergeur qui garde le cache de données ailleurs (ou le purge à chaque déploiement) peut se comporter autrement. Non mesuré.

## Après la correction (ajouté à la clôture ; le rouge ci-dessus n'est pas retouché)

Correction : `getVenueBySlug` lit l'API **sans cache** (`cache: "no-store"` au lieu de `next: { revalidate: 300 }`, `apps/client/src/lib/api.ts`), commit `411d373`. Même mesure, même build de production (`next build` puis `next start`, API de l'e2e, base jetable `zwadj_e2e`), instrument `pieces/m3-instrument-apres.mjs` (COPIE du premier ; seul changement : le détecteur du prix). Sortie : `pieces/m3-apres-sortie.txt`.

| question | avant la correction | après la correction |
|---|---|---|
| (i) fiche visitée en 404 avant la publication, puis publiée | 200 à T+1 s | **200 à T+1 s** (inchangé : le 404 n'était déjà pas gardé) |
| (ii) nom / photo d'une salle modifiée, sur la fiche | servis périmés pendant **308 s** | **à jour à T+1 s** (nom, photo) |
| (ii) prix d'une salle modifiée | périmé 308 s (le « T+1 s » de la sortie brute rouge est le faux positif rectifié plus haut) | **à jour** : lu directement sur la page après la mesure, `123456 DA` et `basePriceCents":12345600` présents (le détecteur de cette copie attendait aussi un espace simple devant « DA » alors que l'espace est insécable : **second défaut d'instrument**, écrit ici ; l'instrument a été arrêté au bout de 9 minutes et le prix relu à la main) |
| (iii) salle masquée | fiche en 200 à T+663 s et au-delà, redémarrage compris | **404 à T+1 s**, stable aux 9 sondages suivants (jusqu'à T+541 s) |
| (iii) salle supprimée | idem | **404 à T+1 s**, stable de même |

La liste (sans cache) est restée identique : nouveau nom présent, salles masquée et supprimée absentes, à T+2 s.

## Ce que cette mesure NE dit PAS
- **Le coût.** Une lecture de l'API par vue de fiche (au lieu d'une toutes les 5 minutes). Ni la charge ni le temps de réponse n'ont été mesurés ; la déduplication des deux lectures d'une même vue (métadonnées et rendu) n'a pas été mesurée non plus (le commentaire de `getVenueBySlug` le dit).
- **Un autre hébergeur.** Mesuré sur `next start` de ce poste.
- **Les référentiels** (`getWilayas`, `getAmenities`, `getVenueStyles`, `revalidate: 3600`) : le mécanisme supposé (une réponse non-200 ne remplace pas l'entrée) leur serait applicable, mais ils ne servent que des listes quasi immuables ; non mesuré, non corrigé (entrée de backlog).
