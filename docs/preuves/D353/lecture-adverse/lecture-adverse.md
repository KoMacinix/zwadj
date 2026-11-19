# D353 — lecture adverse de la consigne du rang 55 contre le dépôt

**Instrument** : `confronter-consigne.py` (lit des objets git au SHA de départ `cd8e079`, calibré à deux bras, 12 cas). **Sortie finale** : `confronter-sortie.txt` — **26 contrôles : 19 ✓ · 6 ≈ · 0 ✗ · 1 ?**, code de sortie 0. **Aucun écart qui arrête le lot.**

## Ce que la première passe a montré, et qui n'était pas le dépôt

`confronter-sortie-passe-1.txt` (gardée, non retouchée) porte **deux ✗** : **les deux étaient des défauts de l'instrument**, confrontés à la source avant d'être crus (D275).
- **1.c** (S-218 à S-230) : la découpe de la section D352 incluait des renvois légitimes à S-210…S-217 (D351), et le contrôle exigeait l'ÉGALITÉ de plage au lieu d'une INCLUSION. Corrigé : on compte les DÉFINITIONS (`- **S-nnn** —` en début de ligne) — 13 sur 13.
- **2.h** (« `global-setup.ts` ne sème rien ») : le contrôle comptait la sous-chaîne « seed » ; l'unique occurrence est un **commentaire** (« Elle NE seede PAS de comptes »). Corrigé : on cherche un APPEL (`db:seed`, `seedReferentials(`, `seed(`), le mot est imprimé en contexte. Les deux cas ont reçu leur bras de calibration.
- **Un défaut de plus, de mon outil d'édition, attrapé avant la sortie finale** : deux caractères de contrôle (`\x08`, un `\b` mal échappé par l'enveloppe) s'étaient glissés dans deux regex de l'instrument ; trouvés par un balayage d'octets (0 attendu), réparés par construction explicite des octets, instrument **rejoué EN ENTIER, calibration comprise** (règle de D298). La première passe a été produite par l'état d'avant ces corrections : sa sortie est une pièce datée, pas une preuve de l'instrument final.

## Les six « ≈ » (vrai pour l'essentiel, imprécis ou en tension — écrits, jamais tus)

| contrôle | ce que la lecture montre | ce que ça change |
|---|---|---|
| **1.d** | l'entrée de backlog sur l'en-tête de l'assistant (`PublicationHeaderState`) **existe déjà** (rang 54, `[PRO][À ORDONNER PAR KO]`) ; la consigne (1 c) la présente comme « à écrire » | **ANNOTER** l'entrée avec la réponse de Ko (« APRÈS »), pas une seconde : un doublon se contredirait au premier changement (décision de la session, dite au rapport) |
| **2.e** | « la base e2e ne publie AUCUN style » (commentaire de r48) contre « 4 styles en base » (D346) : **par lecture, c'est le commentaire qui est faux** (`listVenueStyles` ne filtre rien, `seed.ts` sème les quatre styles) ; **mais** aucune migration n'insère de référentiel : avant le semis les quatre listes sont vides | à MESURER (R-1) : la lecture n'est pas une mesure |
| **2.i** | dans Playwright 1.50.1 les serveurs (`webServer`) démarrent **avant** `globalSetup` ; le serveur du client est donc déjà debout quand `global-setup.ts` s'exécute | un correctif d'ordre dans `global-setup.ts` précède bien le préchauffage ; une purge du cache doit tenir compte d'un serveur déjà levé (mais qui n'a encore rien lu) |
| **R-4.a** | le « patron : `venue-detail-view.test.tsx` l. 374 pour la fiche » garde `getVisitSlots`, **pas la fiche** ; aucun test unitaire de `getVenueBySlug` n'existe (sa garde est l'e2e `r50` M-3 et la cible PUB1-20) | le patron de FORME est juste (assertion sur le second argument de `fetch`) et sert tel quel à la carte ; **entrée de backlog** : le `no-store` de la fiche n'a pas de garde unitaire (R-6 : on n'y touche pas dans ce lot) |
| **R-5.a** | la carte ne joue aucune date future : `availableOn` n'y apparaît qu'en clé de contrat, en attendu `null`, et en date PASSÉE (400) ; ni `slotTemplate` ni `ACTIVE_SLOT` | confirme le trou décrit par l'entrée de backlog |
| **3.a** | `lancer-touchees.py` et `masquer-jetons.py` sont des **pièces versées de D352** (`docs/preuves/D352/neutralisation/`, `docs/preuves/D352/portes/`), pas des fichiers de `neutralisation/` | copiés tels quels (empreinte identique) ; `audit-secrets.py` et `lancer-campagnes.py` sont, eux, dans `neutralisation/` |

Le contrôle **F-2** (« sur batterie, aucune porte ») est `?` : un engagement de méthode, constaté à chaque passe par le pilote.

## Ce qui est vrai tel que la consigne l'écrit (extraits)

`getWilayas`, `getAmenities`, `getVenueStyles` : trois `next: { revalidate: 3600 }`, `[]` sur non-ok ET sur exception ; `getVenueMap` en `no-store` ; le projet `warmup` précède `chromium` ; `r48` tolère l'absence de puces (deux gardes) ; la mutation de D351 est bien le rouge de référence (47 fichiers / 564 tests verts sous `force-cache`) ; une seule autorité `publicFilter` pour la liste et la carte ; les trois entrées du backlog existent, une fois chacune ; `claude/rang50-message.md` n'est dans aucun fichier du dépôt ; S-218 à S-230 sont définies ; le dernier numéro de décision est 352 ; `getVenueBySlug`, `searchVenues` et les autres lectures restent en `no-store`.
