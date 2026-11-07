# FP-5 — LES VERSIONS PRÉCÉDENTES D'UN DEVIS — **ARRÊTÉ** (aucune route d'écran ne les rend ; leur retrait est une décision de Ko)

Session `front-client`, 06/11/2026. Départ `fd9dac0`. Chaque fait ci-dessous a été relu à ce `HEAD` avant l'écriture de cette pièce. Aucun code, aucun test, aucun harnais : ce lot est cette pièce. Règle de la consigne : « seulement si
une route existante les rend, sinon ARRÊTÉ ».

## Ce que le dépôt dit — lu, à `HEAD`
- **Aucun écran ne les rend.** `QuotesSection` (`apps/pro/src/venues/quotes-section.tsx`), qui groupait les devis par chaîne et portait
  l'historique, n'est montée NULLE PART : `apps/pro/src/dashboard/dashboard-page.tsx` le dit (« `QuotesSection` n'est PLUS montée
  ici »), et la recherche de ses emplois hors tests n'en trouve aucun. Le comptoir (`walkin-journey.tsx`) n'affiche que la version
  COURANTE de la chaîne en cours.
- **Le retrait est une décision.** `AGENTS.md`, « DÉCISION A — le versionnement est CONSERVÉ » : « seul l'AFFICHAGE de l'historique
  quitte l'écran pro ». Le commentaire de `quotes-section.tsx` l'écrit : « les versions antérieures ne sont plus atteignables depuis
  AUCUNE interface […] la donnée est sauve ; le chemin pour y accéder reste à écrire ».
- **La donnée existe, la route d'API aussi.** `GET /pro/venues/:id/quotes` rend « tous les devis d'une salle, toutes versions »
  (`quotes.listForVenue`, déjà dans le client d'API) : un écran serait POSSIBLE sans nouveau contrat.
- **Le point est au backlog, à ordonner par Ko** : « Remonter `QuotesSection`, démontée par la refonte : cinq gestes inatteignables
  (envoyer un brouillon existant, marquer refusé, convertir un devis ancien, **historique des versions**, réviser hors session) »
  (`ZWADJ_BACKLOG.md`, `[PRO][P0]`), nommé par Ko (D318, D320) : « s'ouvre seul, sur son arbitrage, sous la méthode renforcée ».

## Pourquoi la session s'arrête
Afficher les versions précédentes, c'est RENVERSER la décision A (un écran que Ko a retiré), pas l'appliquer ; et ce que cet écran
montrerait (montants anciens, références, statuts) relève de la méthode renforcée du backlog (« gestion des devis »). Aucune route
d'écran existante ne les rend : la condition de la consigne n'est pas remplie.

## Options pour Ko
1. **Garder l'état** (décision A) : les versions restent en base et dans `listForVenue`.
2. **Un écran de lecture de l'historique** (par exemple dans la fiche d'un devis) : un lot de code, méthode renforcée, à ordonner avec le
   point « Remonter `QuotesSection` » du backlog.
3. **Un export** pour le jour d'un litige (le commentaire de la décision A nomme « un écran ou un export »).
