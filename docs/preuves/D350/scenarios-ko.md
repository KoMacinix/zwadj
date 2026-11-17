# D350 — les gestes de Ko, pas à pas (rang 52, ADM-2)

**Ce document est une liste de gestes à faire par Ko, pas des gestes faits.** Aucune session de code n'a touché votre base de développement pour ce lot (règle de D337) : tout ce qui a été mesuré l'a été sur des bases jetables (`zwadj_test` pour l'intégration, `zwadj_e2e` pour le navigateur automatique). Ce qui suit est ce qu'**il reste à regarder avec vos yeux**, sur votre poste, avec votre base.

Les mots en gras sont ceux que vous verrez à l'écran. Tout le texte de l'administration est en français seul (arbitrage D-2) ; le seul texte arabe de ce lot est celui que lit le **pro** (geste 6).

## Avant de commencer

1. Lancez l'application comme d'habitude : `pnpm dev` (l'API, l'application Pro et le site client démarrent ensemble). L'application Pro est à l'adresse habituelle (`http://localhost:5173`).
2. **Aucune migration n'est nécessaire** pour ce lot (la colonne du motif de refus et le journal existent depuis la première migration).
3. Il vous faut **quatre comptes** : un compte client dédié, qui deviendra votre administrateur ; un compte pro avec **une salle en brouillon qui a au moins un créneau** ; un second compte client et un troisième, pour les suppressions (des comptes d'essai, pas de vrais clients — l'approbation d'une suppression est irréversible).

## Geste 0 — créer votre premier compte administrateur (la procédure de D349, inchangée)

Suivez `docs/preuves/D349/premier-admin-ko.md`, **telle qu'elle est écrite** : d'abord la commande « à blanc » (`--dry-run`), puis la vraie. **Lisez la ligne « Base visée »** avant de continuer. La procédure n'a pas besoin d'être complétée par ce lot : l'écran ne change rien à ses étapes.

**Ce que vous voyez ensuite, en vous connectant** (c'est le seul ajout de ce lot à cette procédure) :
- vous ouvrez `http://localhost:5173`, vous vous **connectez avec l'adresse et le mot de passe du compte promu**, sur le formulaire habituel du Pro ;
- vous arrivez **directement** sur **Salles en attente de validation**, adresse `/admin`, pas sur le tableau de bord du Pro ;
- en haut : **Zwadj — Administration**, deux entrées (**Salles en attente**, **Suppressions de compte**) et **Se déconnecter** ;
- si vous tapez à la main une adresse du Pro (`/salles`, `/calendrier`…), vous êtes **renvoyé sous `/admin`** : un administrateur n'a pas d'espace pro.

⚠ Si vous étiez déjà connecté avec ce compte avant la promotion, **déconnectez-vous puis reconnectez-vous** : le rôle est dans le jeton (15 minutes au plus).

## Geste 1 — publier une salle

1. Dans **Salles en attente**, trouvez la salle de votre compte pro (la plus récente est **en dernier** ; il peut y avoir plusieurs pages).
2. Cliquez sur son nom : vous voyez son détail (le nom en français et en arabe, la ville, le professionnel, les créneaux actifs, **Brouillon**) et **les deux taux**, avec la mention qu'ils ne se modifient pas ici — **il n'y a aucun champ pour les changer, c'est voulu**.
3. Cliquez sur **Publier la salle** : le message **La salle est publiée.** apparaît, l'état passe à **Publiée**, et les boutons disparaissent.
4. Ouvrez le site client : la salle doit apparaître dans la recherche et sa fiche doit s'ouvrir.

## Geste 2 — rejeter une salle (avec un motif)

1. Prenez une autre salle en brouillon (ou créez-en une avec le compte pro). Ouvrez son détail.
2. Cliquez sur **Rejeter la salle** **sans rien écrire** : un message dit que le motif est obligatoire, et rien n'est envoyé.
3. Écrivez un motif (« Les photos sont floues. »), puis **Rejeter la salle** : le message **Le rejet est enregistré…** apparaît, un encadré **Salle déjà rejetée** montre le motif et la date, et le bouton devient **Corriger le motif**. La salle reste un brouillon.
4. Revenez à **Salles en attente** : la salle y est toujours, marquée **Déjà rejetée**, avec son motif, **rangée après** les autres.

## Geste 3 — corriger un motif

1. Sur la salle rejetée, changez le motif dans le champ (il part du motif en vigueur), puis **Corriger le motif**.
2. L'encadré montre le **nouveau** motif. L'ancien n'est plus affiché ; il est gardé dans le journal (`audit_logs`, avant / après) — vous pouvez le voir dans DBeaver : `SELECT created_at, action, before, after FROM audit_logs WHERE action = 'venue.reject' ORDER BY created_at DESC LIMIT 5;`.

## Geste 4 — lire le refus côté pro, en français

1. Dans un autre navigateur (ou une fenêtre privée), connectez-vous avec le **compte pro** et ouvrez sa salle rejetée, puis son **étape 7, « Publication »**.
2. Vous devez voir : un encadré **Zwadj n'a pas publié votre salle**, **le motif** (celui de l'administrateur, tel quel), **Refus du …** et **Votre salle reste en brouillon : vous pouvez la corriger…**
3. En haut de l'assistant, l'étiquette ne doit **plus** dire « En attente de publication par Zwadj » : elle dit **Refusée**. *(Sur la **liste** des salles, en revanche, l'étiquette dit encore « En attente » pour une salle refusée : c'est une limite connue, notée au backlog.)*

## Geste 5 — lire le refus côté pro, en arabe

1. Même page, après avoir changé la langue du Pro en arabe (le bouton de langue). La page passe de droite à gauche.
2. **Lisez les textes arabes neufs** — ce sont les seuls de ce lot, et ils sont **à relire par un humain** (je n'ai pas de relecteur arabophone) : l'étiquette **مرفوضة**, le titre **لم تنشر Zwadj قاعتك**, la date **تاريخ الرفض: …**, l'aide **تبقى قاعتك مسودة: يمكنك تصحيحها. لا تظهر في البحث ما دامت غير منشورة.**, et en cas de panne **تعذّر التحقق من رفض قاعتك.** avec **إعادة المحاولة**. Le motif, écrit par l'administrateur, reste tel qu'il a été écrit.

## Geste 6 — rejeter, puis approuver, une suppression de compte (sur des comptes d'essai)

1. Avec les deux comptes clients d'essai, demandez chacun la suppression de leur compte (dans leur profil).
2. Dans l'administration, **Suppressions de compte** : vous voyez chaque demande (adresse, **Client**, date, motif de l'utilisateur ou **Aucun motif indiqué…**).
3. **Rejeter** la première : cliquez sur **Rejeter** puis **Confirmer le rejet** sans rien écrire (le message dit que le motif est obligatoire), écrivez un motif, **Confirmer le rejet**. Le compte **reste actif** (il peut toujours se connecter) et reçoit le motif par e-mail (en développement : dans la console de l'API).
4. **Approuver** la seconde : cliquez sur **Approuver** → une fenêtre s'ouvre : **Approuver la suppression de ce compte ?** et le texte **Cette action est IRRÉVERSIBLE…**. Cliquez d'abord sur **Annuler** (rien ne se passe, la demande est toujours là), puis recommencez et **Approuver la suppression**. Le message **La suppression du compte … est approuvée.** apparaît. Ce compte **ne peut plus se connecter**.

## Ce qui reste à votre charge

- ⛔ **La MFA et la relecture du rôle en base sur les routes admin ne sont PAS faites : elles bloquent TOUT déploiement** (D-7 et D-9, arbitrages de Ko). Un administrateur rétrogradé ou suspendu garde ses droits jusqu'à l'expiration de son jeton ; un mot de passe d'administrateur volé suffit à approuver une suppression.
- Le **rétrogradage d'un administrateur** reste un geste manuel (SQL).
- Tout ce qui est écrit « limite connue » dans la section D350 de `ZWADJ_CONTINUITE.md` (notamment l'étiquette de la liste des salles du pro, et la relecture de l'arabe).
