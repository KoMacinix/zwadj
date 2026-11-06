# D341 — le coût de la lecture du drapeau de la couche, par requête Pro (limite 6 du cadrage de D340 : « à mesurer, sans budget »)

**Ce que cette pièce répond.** Le quatrième garde global relit `pro_profiles.staff_layer_enabled_at` à CHAQUE requête d'un PRO (MP-7 : le drapeau n'est jamais mis dans le jeton, c'est ce qui rend vrai « la couche activée pendant qu'un Pro est connecté prend effet à la requête suivante »). Cette lecture est une requête SQL de plus. Combien coûte-t-elle ? **Aucun budget n'est posé** (la consigne : « sans budget ») : la pièce relève, elle ne juge pas.

## Procédure

- `mesurer.py` (archivé comme PREUVE, jamais promu en instrument, D291) joue **six passes en ALTERNANCE** — avant, après, avant, après, avant, après —, parce que D291 a mesuré qu'une passe enchaînée est plus rapide qu'une passe après repos (de 0,7 à 7,2 %) : alterner répartit cet effet au lieu de le mettre tout entier d'un côté.
- **« avant »** = le quatrième garde retiré de `apps/api/src/app.module.ts` (une ligne, texte remplacé sur les octets, SHA-256 du fichier vérifié avant et après : **identique au départ**) ; le reste du code est le même. **« après »** = le code livré (`40b7380`).
- Chaque passe joue `mesure-lecture-drapeau.int-spec.ts` : base `zwadj_test` recréée par `setup-global`, application Nest complète, **80 requêtes d'échauffement puis 600 mesurées** sur `GET /api/v1/pro/venues`, couche **éteinte** (le cas de toute salle tant qu'elle n'a rien activé). Le fichier n'asserte AUCUNE durée (D290 : un budget de test ferait d'une durée un verdict) ; il imprime une ligne JSON que `mesurer.py` relit, et exige 600 réponses 200 sur 600 (une route qui répondrait 401 mesurerait un refus, pas une lecture).
- Le script REFUSE de démarrer sur batterie (code 3, R-9 de D340).

## État machine (D270 : une durée sans son état machine est exactement la mesure que cette règle interdit)

```
AVANT : 22:42:34 | SECTEUR | RAM libre 3,096 Mo | chrome 14 | headless_shell 0 | node 0
APRÈS : 22:45:00 | SECTEUR | RAM libre 3,262 Mo | chrome 13 | headless_shell 0 | node 0
```

⚠ **`chrome` n'est pas à 0** (le navigateur du poste de Ko est ouvert) : cette mesure n'est PAS une mesure certifiante au sens des règles de certification (en pause, D336) et ne prétend pas l'être. Elle compare deux variantes sur le même poste, dans la même fenêtre de deux minutes et demie.

## Résultat (sorties brutes : `mesure-avant.txt`, `mesure-apres.txt`)

| passe | médiane (ms) | p95 (ms) | moyenne (ms) |
|---|---:|---:|---:|
| avant n°1 | 15,651 | 19,092 | 15,996 |
| après n°1 | 17,524 | 21,837 | 17,948 |
| avant n°2 | 15,673 | 18,716 | 15,905 |
| après n°2 | 16,827 | 19,820 | 17,125 |
| avant n°3 | 16,162 | 20,754 | 16,681 |
| après n°3 | 17,873 | 22,811 | 18,389 |

**Médiane des médianes : avant 15,673 ms · après 17,524 ms · écart +1,851 ms (+11,8 %).** Le bruit entre passes d'une même variante va jusqu'à **1,046 ms** (avant : 15,651 à 16,162 ; après : 16,827 à 17,873).

**Lecture, dans l'ordre de ce qui est établi.**
1. **Établi** : sur ce poste, chaque passe « après » est plus lente que chaque passe « avant » (la plus rapide des « après », 16,827 ms, dépasse la plus lente des « avant », 16,162 ms). Le surcoût n'est donc pas du bruit de passe.
2. **Établi** : la lecture est UNE requête indexée — `pro_profiles.user_id` porte l'index unique `pro_profiles_user_id_key` (relevé sur la base de test migrée). Le garde n'émet aucune autre requête quand la couche est éteinte (garde de son spec : « LA SEULE lecture est celle du drapeau »).
3. **Inféré, non mesuré** : le surcoût (≈ 1,9 ms) est le prix d'UN aller-retour SQL local. En production, la base n'est pas sur la même machine : **le surcoût vaudra au moins la latence réseau d'un aller-retour de plus**, par requête Pro.

## Ce que cette mesure NE dit PAS (écrit pour ne pas se lire comme tenu)

- **Le coût de la couche ACTIVÉE** : une salle qui active la couche paie, en plus de la lecture du drapeau, un `UPDATE … RETURNING` par requête (la prolongation de la session) — une écriture, avec verrou de ligne sur la session. Il n'est pas mesuré ici : la limite 6 demandait la lecture du drapeau.
- Le coût sous charge concurrente : une seule requête à la fois.
- Une seule route (`GET /pro/venues`, qui rend une liste vide) : le surcoût est ABSOLU (une requête de plus), il ne dépend pas de la route ; son poids RELATIF, si.
- Une mise en cache du drapeau : elle n'existe pas, et un cache casserait MP-7 (la couche activée prendrait effet avec retard) — ce n'est pas une option de ce lot.
