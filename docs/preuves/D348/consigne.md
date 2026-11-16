# D348 — la consigne du rang 50, versée telle quelle

Source : message collé par Ko dans la session du 16/11/2026, encadré « texte proposé par le relecteur le 14/11/2026 ; copie seulement si tu adoptes ces points ». Ko l'a collé sans retouche : **adoption par adoption de ce message** (point 1 du texte). Copie du texte, sans changement.

---

RANG 50 — UNE SALLE PUBLIÉE SE VOIT SUR LE SITE CLIENT : VÉRIFIER LE CHEMIN RÉEL APRÈS PUBLICATION, CORRIGER SEULEMENT CE QUI EST ROUGE (texte proposé par le relecteur le 14/11/2026 ; copie seulement si tu adoptes ces points)

0. REPRISE (avant toute écriture)
- Lis ZWADJ_CONTINUITE.md seul (section la plus récente, ordre des rangs, registre) et rapporte. Attendu : rang 49 CLOS (D347), compteur POUR MÉMOIRE VINGT-TROIS, « RANG 50 : EN ATTENTE DE CADRAGE DU RELECTEUR », origin/main = 26ad5c7 (vérifié par le relecteur le 14/11/2026), arbre propre, sans stash, sur `main`. Branches distantes attendues en plus de main : `front-client` (43996e2) et `par-carte` (7fdc679) ; tu n'y touches pas. Un écart : tu t'arrêtes et tu le dis.
- État machine : secteur, RAM libre, chrome, headless_shell, Docker lancé. Sur batterie : aucune porte (R-9 de D340).

1. CE QUE KO ADOPTE — par ADOPTION de ce message
a) Ko, mot pour mot (10/11/2026) : « lot pour qu'une salle publié soit affichant dans la partie client ». Et (12/11/2026), sur ce qu'il a vu : « Je sais pas ce que je dois voir, du moment que j'ai pas la main pour accepter de publier ». ⇒ Ko n'a constaté AUCUN défaut d'affichage : il n'a aucun moyen de publier (aucun écran ; c'est ADM-1/ADM-2). Ce lot est une VÉRIFICATION du chemin après publication, sans piste de défaut.
b) Rang 50 = ce lot (PUB-1). Numéro attendu : D348, pris EN LISANT le registre. Il compte (code ou code de test, D283) : VINGT-TROIS → VINGT-QUATRE. Le message du rang 50 donné le 10/11 (le cache d'une heure des référentiels, `claude/rang50-message.md`) N'EST PAS adopté : il reste candidat, sans rang.
c) Retour au mode normal (Ko, 14/11) : une session à la fois, en local, sur `main`, un lot par session. Les trois messages « parallèles » du 10/11 sont abandonnés, sauf la branche `par-carte`, faite, qui attend son propre rang d'intégration.

2. DÉCISIONS DU RELECTEUR (chat), DÉLÉGUÉES PAR KO
Constats du relecteur à 26ad5c7, par LECTURE, donc À MESURER PAR TOI et jamais à écrire comme établis : l'accueil et `/salles` lisent `GET /venues` sans cache (apps/client/src/lib/api.ts, `searchVenues`, `cache: "no-store"`) ; la fiche est gardée 300 secondes (`getVenueBySlug`, `revalidate: 300`) ; la liste publique exige « publiée, non supprimée, statut ACTIVE » (apps/api/src/venues/venues-public.service.ts, `PUBLIC_BASE_WHERE` puis `status`) ; hors production, quand la liste est VIDE, des salles FICTIVES s'affichent avec un bandeau (lib/preview-venues.ts) ; la publication n'existe que par `POST /admin/venues/:id/publish`, qui refuse une salle sans créneau actif.
- R-1. MESURE D'ABORD, aucun correctif avant. M-1, le chemin réel dans un navigateur (spec e2e neuve) : un pro crée une salle par l'écran (créneau, prix, photo), un admin la publie par la route existante (fabrique d'admin de la suite, comme r37), puis : l'accueil la montre et les salles fictives ont disparu avec leur bandeau ; `/salles` la montre sans filtre, puis avec chaque filtre qui lui correspond (ville, invités, budget, style, équipement, date) ; sa fiche s'ouvre ; la même chose en arabe. Chaque étape : vu ou pas vu, pièce versée.
- R-2. M-2, la table « pourquoi une salle publiée ne s'affiche pas » : chaque condition relevée dans le code ET jouée — statut autre qu'ACTIVE, salle supprimée, aucun créneau actif avec une date demandée, filtre qui l'exclut, compte du pro supprimé, et toute autre que tu trouves. Pour chacune : la liste, la fiche, et ce que le PRO lit de son côté (sait-il pourquoi sa salle n'est pas visible ?).
- R-3. M-3, les délais, sur un BUILD DE PRODUCTION local du client (next build + next start) : (i) la fiche visitée AVANT la publication rend 404 — après publication, combien de temps reste-t-elle en 404 ? (ii) une salle publiée puis modifiée par le pro (nom, prix, photo) : combien de temps la fiche et la liste montrent-elles l'ancien état ? (iii) une salle masquée ou supprimée reste-t-elle visible, et combien de temps ? Durée réduite pour la mesure seule, sur une copie hors du dépôt, déclarée, jamais commitée.
- R-4. CORRIGER seulement ce qui est mesuré ROUGE, rouge versé avant le code : un défaut d'affichage (salle publiée absente, salle fictive à côté d'une vraie) se corrige ici. Un délai de cache se corrige ici s'il fait mentir la page sur une salle qui vient d'être publiée, masquée ou supprimée ; motif écrit. Tout le reste : entrée de backlog.
- R-5. Si rien n'est rouge : le lot livre la spec e2e et la table de R-2, et le dit. Ce n'est pas un échec : c'est la preuve qui manquait.
- R-6. La branche `par-carte` modifie des fichiers que tu pourrais toucher : relève-les (`git diff --name-only origin/main origin/par-carte`) et verse la liste. Dans ces fichiers, un correctif est le plus petit possible, déclaré ligne par ligne au rapport ; jamais dans ce qui concerne la carte (section `hm-map` de l'accueil, vue carte de la recherche, route de points). Motif : cette branche s'intègre après toi, et chaque ligne déplacée ici devient un conflit là-bas.
- R-7. Aucun contrat d'API neuf, aucune migration, aucun montant calculé dans le navigateur. Besoin de l'un d'eux ⇒ tu t'arrêtes et tu rapportes les options.
- R-8. HORS lot, à reporter si la mesure le montre utile : lien « voir ma salle sur le site » côté pro ; message au pro quand sa salle est publiée ; l'écran de publication (ADM-1, ADM-2) ; la carte ; le retrait des salles fictives du dépôt (décision de Ko).
- R-5 et R-6 du rang 50 d'origine s'appliquent quand même (règles de campagne) : harnais modifié en cours de campagne ⇒ campagne rejouée EN ENTIER ; journaux bruts versés MASQUÉS (masquer-jetons.py).

3. FORME
Premier commit : docs/preuves/D348/table-ouverture.md SEUL, chemins complets ; extension = commit seul avant son fichier ; lecture adverse de cette consigne avant tout .md d'autorité ; rouges avant le code (sorties et empreintes) ; neutralisation/neutralize-pub1.py pour chaque garde neuve (neutralisée, rouge lu, restaurée) ; lancer-campagnes.py ; audits de secrets avant chaque versement (D298) ; consigne versée (docs/preuves/D348/consigne.md). Toute chaîne visible en FR et AR, parité ; clés arabes neuves listées. Six portes après la dernière modification ; deux passes e2e vertes de suite, règle commitée avant (R-15 de D343).

4. FIN
- Contrôle de fin de lot (D288, D328), push puis fetch, local = origin/main.
- Ordre des rangs : « RANG 50 : CLOS », puis « RANG 51 : EN ATTENTE DE CADRAGE DU RELECTEUR » (candidat proposé : ADM-1, la page d'administration côté API, cadrée au rang 28 et arbitrée par Ko en D321 ; puis ADM-2 ; puis l'intégration de `par-carte`).
- Au backlog : l'entrée du cache des référentiels (rang 50 d'origine) reste candidate ; tout ce que R-4 et R-8 reportent.
- Gestes de Ko : scénarios à essayer dans le navigateur, ou « aucun » ; dis-le.
- Rapport en français : fait, pas fait, écarts, décisions prises seule (une phrase simple chacune, avec ce qu'elle change pour Ko), la réponse en une phrase à « une salle publiée s'affiche-t-elle ? », au plus une question. Une session, un lot.
