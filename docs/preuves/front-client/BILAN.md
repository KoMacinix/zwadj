# BILAN — session `front-client` (05 et 06/11/2026)

Branche `front-client`, partie de `origin/main` à `e40c141` ; **`main` n'a pas bougé** (`e40c141`, relevé après la dernière poussée). 106 commits.
La session n'a écrit **aucun** fichier d'autorité (`AGENTS.md`, `CLAUDE.md`, `ZWADJ_CONTINUITE.md`, `ZWADJ_BACKLOG.md` : 0 fichier au diff), n'a pris aucun
numéro de décision ni de rang, n'a touché **ni `apps/api`, ni une migration, ni un fichier SQL** (0 fichier au diff). Les lots s'appellent FC-n (client) et FP-n (Pro) ;
chaque lot a son dossier `docs/preuves/front-client/<lot>/` (table d'ouverture, rouges, harnais, campagnes, portes, audit, contrôle, rapport).
Un lot terminé est « PRÊT À INTÉGRER », jamais « CLOS » : l'intégration est à Ko.

## 1. Les lots

| lot | état | objet | départ → clôture |
|---|---|---|---|
| FC-1 | **PRÊT** | contraste : une garde à 4,5:1 sur le pire fond neutre, quatre sélecteurs | `1e6426f` → `5f95ba3` |
| FC-2 | **PRÊT** | débordement à 360 px de l'en-tête commun (la barre passe à la ligne) | `5f95ba3` → `7113356` |
| FC-3 | **PRÊT** | noms en arabe dans le panneau de demande : le repli français est dit (`lang`, `dir`) | `7113356` → `470dfe1` |
| FC-4 | **PRÊT** | le jour et le créneau déjà demandés se choisissent, avec un avis | `470dfe1` → `e537bb1` |
| FC-5 | **PRÊT** | source unique : la semaine, et les adresses de pages | `e537bb1` → `b595bde` |
| FC-6 | **PRÊT** (une partie **ARRÊTÉE**) | dates et nombres en arabe en `ar-DZ` par une seule règle ; **les montants d'un devis restent en français** (le PDF est dans `apps/api`) | `b595bde` → `06261c3` |
| FC-7 | **PRÊT** | le repli `maxPriceCents` est retiré | `06261c3` → `a2d96f0` |
| FC-8 | **PRÊT** | le lot ③ : l'assistant est un mode de `/salles` | `a2d96f0` → `f4c9256` |
| FC-9 | **PRÊT** | les avertissements `act(...)` de la suite client : corrigés à la source, plus aucun fichier exempté | `f4c9256` → `669cdae` |
| FC-10 | **PRÊT** | données structurées schema.org `EventVenue` de la fiche | `669cdae` → `eb98ee7` |
| FC-11 | **ARRÊTÉ** | le HTML initial vide des 404 : **prémisse fausse, mesurée** (c'est le rendu des 404 de Next 15.5.20) | `eb98ee7` → `01f3c25` |
| FC-12 | **PRÊT** | galerie de photos et visionneuse (Échap, flèches RTL, focus) | `01f3c25` → `aec8141` |
| FP-1 | **PRÊT** (méthode RENFORCÉE) | la quantité (PER_UNIT) et le palier (TIERED) au comptoir | `aec8141` → `8fb0296` |
| FP-2 | **PRÊT** | après le 409 de K-5, l'écran garde la copie du nom qui existe déjà | `8fb0296` → `8432070` |
| FP-3 | **PRÊT** (avec une limite du serveur) | une révision reprend la copie du nom de la version courante | `8432070` → `bcb51fd` |
| FP-4 | **ARRÊTÉ** | rafraîchir le panneau gauche et le sélecteur : **prémisse fausse**, lue dans le code | `bcb51fd` → `fd9dac0` |
| FP-5 | **ARRÊTÉ** | versions précédentes d'un devis : aucune route d'**écran** ne les rend ; leur retrait est la décision A | `fd9dac0` → `73919ff` |

**DÉJÀ FAIT : aucun lot** ne s'est révélé déjà fait. Onze lots client PRÊTS (FC-1 à FC-10, FC-12 ; FC-6 avec une partie arrêtée) et trois lots Pro PRÊTS (FP-1 à FP-3) ; trois lots ARRÊTÉS
sans code (FC-11, FP-4, FP-5). **Quatorze lots de code comptent à l'intégration** (FC-1 à FC-10, FC-12, FP-1 à FP-3) ; les trois ARRÊTÉS sont documentaires et ne comptent pas.
Les ordres de commit de chaque lot (table seule d'abord, rouges avant le code, extensions seules) sont prouvés par `controle-lot.py` : voir le `controle.txt` de chaque dossier.

## 2. Les portes

Six portes à chaque lot, APRÈS la dernière modification, par le pilote `outils/portes.sh` (code de sortie de la commande, journal sans codes ANSI). Entrée de la session
(`etat-entree.md`) : api-client 59, api 1 096, client 386, pro 653 = 2 194 tests. **Sortie (FP-3, `FP-3/portes/`)** : api-client 59, api 1 096, client **488**, pro **711** = **2 354 tests**
(+102 client, +58 pro ; l'API n'a pas bougé).

| lot | typecheck · lint · build | test (client / pro) | test:int | test:e2e |
|---|---|---|---|---|
| FC-1 | 0 · 0 · 0 | 0 (400 / 653) | 1 — 5 rouges de 619 | 0 — 63 passés |
| FC-2 | 0 · 0 · 0 | 0 (400 / 653) | 1 — 3 rouges | 0 — 69 |
| FC-3 | 0 · 0 · 0 | 0 (414 / 653) | 1 — 6 rouges | 0 — 69 |
| FC-4 | 0 · 0 · 0 | 0 (424 / 653) | 1 — 5 rouges | 0 — 69 |
| FC-5 | 0 · 0 · 0 | 0 (441 / 668) | 1 — 8 rouges | 0 — 69 |
| FC-6 | 0 · 0 · 0 | 0 (457 / 676) | 1 — 11 rouges | 0 — 69 |
| FC-7 | 0 · 0 · 0 | 0 (454 / 676) | 1 — 3 rouges | 0 — 69 |
| FC-8 | 0 · 0 · 0 | 0 (473 / 676) | 1 — 6 rouges | 0 — 73 |
| FC-9 | 0 · 0 · 0 | 0 (474 / 676) | 1 — 3 rouges | 0 — 73 |
| FC-10 | 0 · 0 · 0 | 0 (480 / 676) | 1 — 5 rouges | 0 — 75 |
| FC-12 | 0 · 0 · 0 | **1 à la première passe** (un avertissement `act` d'un fichier voisin), **0 au rejeu unique** (`portes/test-rejeu.txt`) (487 / 676) | 1 — 5 rouges | 0 — 75 |
| FP-1 | 0 · 0 · 0 | 0 (488 / 693) | 1 — 7 rouges | 0 — 75 |
| FP-2 | 0 · 0 · 0 | 0 (488 / 698) | 1 — 10 rouges | 0 — 75 |
| FP-3 | 0 · 0 · 0 | 0 (488 / 711) | 1 — 9 rouges | 0 — 75 |

FC-11, FP-4 et FP-5 : aucune porte rejouée (aucun fichier qu'une porte lit ne change, D292).
Campagnes de neutralisation (`campagnes.txt` de chaque lot) : toute garde neuve est neutralisée, son rouge LU en assertion (un plantage, un délai ou une requête qui lève n'est pas une
morsure — D304, D316). Derniers lots : FP-2 **403 mordues · 1 muette · 0 non mesurée** ; FP-3 **419 mordues · 1 muette · 0 non mesurée**. La seule muette est **M-12 de `r33`**
(la garde de fuseau, muette sur un serveur en UTC : propriété de l'environnement, prouvée en FC-4, rapportée à chaque lot).

## 3. Ce qui n'a PAS pu tourner ici — à jouer à l'intégration

1. **`test:int` n'est vert dans aucun lot, et n'est jamais déclaré vert.** Les rouges (3 à 11 selon la passe) sont **tous** des tests de concurrence de deux fichiers que la session ne touche pas
   (`pro-clients.int-spec.ts` MD-1 et `quote-numbering.int-spec.ts` F-1 à F-7 : `read ECONNRESET` sur des requêtes simultanées, puis `deadlock detected` en cascade dans `truncateAll`) — la classe de
   D265, relevée à l'entrée (`etat-entree.md`) sur le même SHA que la passe sur secteur de D340, où `test:int` rendait 619/619 sur le poste de Ko. Sans le navigateur du conteneur, 15 tests de plus
   rougissent (le moteur PDF). **À rejouer sur le poste de Ko, sur secteur.** L'hypothèse de cause écrite à l'entrée n'est PAS mesurée.
2. **Aucune relecture humaine de l'arabe** (consigne, § 4) : les clés ci-dessous sont proposées par la session.
3. **Aucun regard de Ko sur l'aspect** : les tests mesurent des comportements et des noms accessibles ; la CSS n'est vérifiée que par calcul (contraste) et par des gardes de structure.
   FC-4 l'écrit comme limite (bord pointillé du jour demandé, cadre de l'avis, jamais regardés dans un navigateur). FC-2 a été mesuré dans un navigateur à 360 px et deux captures ont été regardées
   par la session (non versées). La visionneuse de FC-12 n'a **aucune e2e** (la fixture e2e ne publie aucune photo) : clavier, focus et `alt` ne sont mesurés que par jsdom.
4. **La session ADVERSE de FP-1** (la forme de revue d'un lot du chemin de l'argent : une session ouverte à froid qui tente de casser le code) **n'a pas eu lieu** : elle ne se joue pas dans cette
   session. **Elle est due avant l'intégration de FP-1** ; la liste des modes de défaillance (`FP-1/modes-de-defaillance.md`) et le harnais sont ses points de départ.
5. **Aucune certification** (en pause, Ko) : le compteur se tient à l'intégration, quatorze lots de code.
6. Deux faits d'environnement, sans effet sur le code : le démon Docker tombe avec chaque redémarrage du worker (relancé à la main, base intacte, volume nommé) ; un artefact de build périmé
   (`apps/client/.next/types`) fait rougir `typecheck` après la suppression d'une page — `rm -rf apps/client/.next/types` avant `pnpm typecheck` sur le poste de Ko.

## 4. Les clés arabes neuves — liste complète (toutes à faire relire par un arabophone)

Parité FR/AR tenue à la fin de la session : **1 246 clés feuilles de chaque côté, jeux identiques**. Seize clés neuves et une modifiée ; le détail est dans les `arabe-a-relire.md` des lots.

| lot | clé | français | arabe proposé |
|---|---|---|---|
| FC-4 | `venueDetail.booking.dayRequested` | `{date}, demandes en attente` | `{date}، طلبات قيد الانتظار` |
| FC-4 | `venueDetail.booking.requested` | `demandes en attente` | `طلبات قيد الانتظار` |
| FC-4 | `venueDetail.booking.requestedNotice` | D'autres demandes sont déjà en attente pour ce créneau. La salle choisit entre les demandes : vous pouvez envoyer la vôtre. | `توجد طلبات أخرى قيد الانتظار لهذه الفترة. تختار القاعة بين الطلبات، ويمكنك إرسال طلبك.` |
| FC-8 | `home.search.assistant` (**modifiée**) | « Li hwas lqa » (D229) | `اللي حوّس لقى` — D229 décide le libellé en darija en LETTRES LATINES ; la session l'a transcrit pour la page arabe |
| FC-8 | `wizard.close` | Fermer l'assistant | `إغلاق المساعد` |
| FC-12 | `venueDetail.viewerLabel` | Photo {n} sur {total} | `الصورة {n} من {total}` |
| FC-12 | `venueDetail.viewerClose` | Fermer | `إغلاق` |
| FC-12 | `venueDetail.viewerPrevious` | Photo précédente | `الصورة السابقة` |
| FC-12 | `venueDetail.viewerNext` | Photo suivante | `الصورة التالية` |
| FP-1 | `venue.ui.walkin.tierLabel` | Formule — {name} | `الصيغة — {name}` |
| FP-1 | `venue.ui.walkin.tierChoose` | Choisir une formule | `اختر صيغة` |
| FP-1 | `venue.ui.walkin.quantityLabel` | Quantité — {name} ({unit}) | `الكمية — {name} ({unit})` |
| FP-1 | `venue.ui.walkin.quantityLabelNoUnit` | Quantité — {name} | `الكمية — {name}` |
| FP-1 | `venue.ui.walkin.quantityRange` | De {min} à {max}. | `من {min} إلى {max}.` |
| FP-1 | `venue.ui.walkin.quantityMin` | Au moins {min}. | `على الأقل {min}.` |
| FP-1 | `venue.ui.walkin.quantityMax` | Au plus {max}. | `على الأكثر {max}.` |
| FP-1 | `venue.ui.walkin.servicesMissing` | Il manque une formule ou une quantité : {names}. | `تنقص صيغة أو كمية: {names}.` |

FC-1 à FC-3, FC-5 à FC-7, FC-9, FC-10, FP-2 et FP-3 : aucune clé (FC-6 : les noms de mois viennent du moteur `Intl`, pas du catalogue).

## 5. Les décisions prises seul — et ce qu'elles changent pour Ko

(Le détail et les alternatives sont dans le rapport de chaque lot, section « Décisions prises seul ». Ici : ce qui demande l'œil de Ko.)

- **FC-1** — la garde exige 4,5:1 sur le PIRE fond neutre : un texte posé en `--accent` sur ces quatre sélecteurs ne passera plus, même sur blanc pur. Un socle partagé des harnais
  (`neutralisation/socle_front_client.py`) et deux outils de session versés (`outils/portes.sh`, `outils/controle-lot.py`) : à promouvoir ou non.
- **FC-2** — l'en-tête anonyme fait une ligne de plus sur téléphone (la barre passe à la ligne). À regarder.
- **FC-3** — le repli français d'un nom arabe vide est DIT par `lang="fr"` + `dir="ltr"`, sans mention visible. Une mention visible serait une clé de plus.
- **FC-4** — le jour demandé a un bord pointillé (marque discrète, sans accent) ; un jour à créneau libre ET demandé reste « disponible ». À regarder ; le retirer est une règle CSS.
- **FC-5** — le Pro nomme les pages du client par des constantes confrontées à celles du client ; l'autorité des adresses est la page DÉCLARÉE, pas la liste de D321.
- **FC-6** — la règle vaut aussi pour le français (`fr-DZ`, mesuré sans effet sur les dates). **Les montants d'un devis restent en français, explicitement** (`QUOTE_AMOUNT_LOCALE`) : passer
  écran ET PDF en `ar-DZ` ensemble est un lot qui touche `apps/api` — **décision due à Ko**.
- **FC-7** — retrait AVANT l'échéance du 19/11/2026 : aucun déploiement n'a eu lieu, donc aucun lien partagé réel. L'entrée de backlog sur ce repli porte une **prémisse fausse**
  (`maxPriceCents` n'a jamais été dans `SEARCH_VARIANT_PARAMS`) : à barrer à l'intégration.
- **FC-8** — `maxPriceCents` n'entre pas dans `isVariant` (D230 le demandait ; sa prémisse a changé avec FC-7) : à barrer de D230, ou à rétablir. Le panneau se monte côté client seulement
  (sans JavaScript, `/salles?guide=…` est la page de résultats). La commune est un champ NON contrôlé. Les gardes du plafond `act` (S8) déménagent sur `venue-detail-view.test.tsx`.
  Trois réorientations et un retrait dans des harnais d'autres rangs.
- **FC-9** — un étalon dans la suite (`test-setup-calibration.test.ts`, deux `console.error` émis exprès) : sans fichier exempté, le mécanisme de plafond n'aurait plus rien à juger ; si Ko ne
  veut aucun bruit délibéré, l'étalon et le mécanisme se retirent ENSEMBLE. La garde du Pro lève toujours une `Error` nue alors que celle du client échoue par assertion : asymétrie écrite.
- **FC-10** — `EventVenue` plutôt que `Place` ; la description du JSON-LD est l'accroche. (Un incident, dit dans le rapport : une pièce commitée avec des jetons d'une base e2e jetable,
  vue avant toute poussée, corrigée en local : 0 jeton sur le distant.)
- **FC-11 (ARRÊTÉ)** — options : garder l'état (recommandé, en écrivant la limite) ; changer de version de Next (lot de dépendance, banc d'essai versé) ; une 404 statique hors de React (non recommandé).
- **FC-12** — aucune fermeture au clic sur le voile (Échap et « Fermer » suffisent) ; le voile reste sombre dans les deux thèmes.
- **FP-1** — le palier se choisit dans une liste déroulante, la quantité dans un champ numérique (changer la forme est une affaire d'écran, la règle ne bouge pas) ; « Voir le devis » est
  RETENU (bouton inactif) avec la raison dite, plutôt que d'accepter puis refuser ; une prestation cochée disparue du catalogue compte comme un manque ; le libellé « Formule ».
- **FP-2** — pas de remise automatique après la relecture (un clic de plus : le pro voit ce qu'il remet) ; la relecture passe par la liste des devis de la salle (lourde, mais ne part qu'après ce
  409 rare) : **un `GET /quotes/:id` serait plus sobre — un contrat d'API, hors session** ; seul CE 409 relit.
- **FP-3** — une révision reprend la copie du nom de la version courante, pour une fiche NON liée seulement : le serveur refuse (409 `CLIENT_RECORD_LINKED`) un nom que la fiche liée n'a pas.
  **Pour une fiche liée, la copie complétée par K-5 est donc perdue à la révision, et K-5 reposera sa question** — changer cela est une règle du serveur (`apps/api`), un lot d'API. La version
  rendue est gardée dans une référence d'écran (la modification jette le devis affiché). **Quatre harnais d'autres rangs ont dû être remis d'aplomb** (`r41` J-6, `r43` P-3, `act-plafonds`, `horloge`),
  déclarés par l'extension 2 de la table ; `act-plafonds` et `horloge` avaient une constante de comptage périmée depuis FP-1.
- **FP-4 (ARRÊTÉ)** — la prémisse est fausse : ni le panneau gauche, ni le sélecteur, ni « Ma salle / Mes salles » ne montrent une donnée qu'écrit une des cinq sections ; relire la liste complète
  après chaque enregistrement n'aurait aucun effet visible et contredirait S-4. Défaut croisé trouvé à côté, **non reproduit** : le récapitulatif du comptoir montrerait l'identifiant d'un créneau
  tout juste créé. Options : garder (recommandé), relire après l'enregistrement d'un créneau seulement, ou que le comptoir ne dépende plus de `venue.slotTemplates`.
- **FP-5 (ARRÊTÉ)** — afficher les versions précédentes renverserait la décision A au lieu de l'appliquer ; la route de donnée existe (`listForVenue`), pas une route d'écran. Le point est au
  backlog (« Remonter `QuotesSection` »), à ordonner par Ko.

## 6. Défauts croisés — rapportés, non corrigés (hors lot)

- Le catalogue des prestations du **Pro** affiche les noms de palier et d'unité en français même en arabe (`labelFr`, `unitNameFr` dans `services-section.tsx`) — la faute que FC-3 a corrigée côté client.
- `/salles` sans JavaScript reste sur son indicateur de chargement.
- Cinq anciens harnais écrivent des ancres en CRLF EN DUR (404, available-on, horizon, maxprice, r30), et `act-plafonds` / `horloge` exigent des fichiers entièrement en CRLF : ils ne se jouent que
  sur un poste en CRLF, ou sous `outils/crlf-simule.py` (utilisé ici). `act-plafonds` et `horloge` ne sont pas importables par `outils/releve-ancres.py`.
- Pas de `hreflang`, de sitemap ni de `robots` (relevé en FC-10).
- Un double `setState` du calendrier de disponibilité (FC-9) ; un avertissement `act` flottant dans `account-settings-view.test.tsx` (FC-12, une fois, rejoué vert).
- L'aperçu d'acompte du panneau de demande est RECALCULÉ dans le navigateur (hors session, § 4).
- La garde de console du Pro lève une `Error` nue, celle du client une assertion.
- Le PDF garde sa propre écriture de la règle de dates (`apps/api`).

## 7. Vérifications de fin de session

- Branche `front-client` poussée ; après la dernière poussée et un `git fetch`, local = origin (SHA rapportés dans le message de fin).
- `main` : `e40c141`, inchangé. Aucune PR ouverte.
- Audits de secrets scellés à chaque lot (`audit-secrets-<lot>.txt`) avec tri différentiel (`tri-audit-<lot>.txt`) : aucune valeur réelle. Les journaux e2e bruts, dont les lignes `[WebServer]` portent
  des jetons de vérification d'e-mail d'une base jetable, restent HORS dépôt ; leur copie versée n'en contient aucun.
- Le BILAN lui-même a été audité avant son commit (sortie gardée hors dépôt) : **0 alerte sur ce fichier** ; les 3 alertes nouvelles de ce passage viennent de phrases du tri de FP-5
  (un nom de champ, un titre de test, le décompte des jetons restants) — 0 valeur réelle.
- Ce qui a été décidé dans le fil a atterri dans un FICHIER : ce BILAN et les rapports de lot de `docs/preuves/front-client/` — **pas** dans les fichiers d'autorité, que cette session n'écrit pas
  (consigne § 0). Leur mise à jour est à l'intégration.
