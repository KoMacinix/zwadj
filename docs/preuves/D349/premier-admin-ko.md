# Créer le premier compte administrateur — pas à pas, pour Ko

**Ce document est une procédure écrite, pas un geste fait.** Aucune session de code n'a joué ce script sur votre base de développement (R-6 de la consigne du rang 51) : il a été essayé seulement sur la base de TEST, qui est recréée de zéro à chaque lancement. Le premier compte admin se crée avec l'écran d'administration (ADM-2, rang 52) ; la procédure ci-dessous est celle à suivre à ce moment-là.

## Ce que fait le script, en une phrase

Il prend **un compte qui existe déjà**, dont l'adresse e-mail est **vérifiée** et qui est **actif**, et il change son rôle en « administrateur ». C'est tout : il ne crée pas de compte, il ne choisit ni ne change aucun mot de passe, il n'envoie rien. Il écrit une ligne dans le journal (`audit_logs`) pour qu'on sache qu'il a été lancé.

## Avant de commencer

1. **Un compte client dédié.** Dans l'application client, inscrivez-vous avec une adresse e-mail que vous contrôlez. **Ne partez pas d'un compte PRO** : un compte PRO promu perdrait l'accès à ses salles, et le script le refuse. Le mot de passe est celui que vous choisissez à l'inscription ; personne d'autre ne le connaît.
2. **L'adresse doit être vérifiée.** Ouvrez le lien de vérification reçu par e-mail. Tant que l'envoi réel d'e-mails n'existe pas, en développement le lien s'affiche dans la console de l'API.
3. **La bonne base.** Le script écrit dans la base que désigne `DATABASE_URL` (le fichier `apps/api/.env`). Il affiche « Base visée : … » avant d'agir : **lisez cette ligne** avant de continuer.

## Les deux commandes (à lancer depuis la racine du dépôt)

**D'abord à blanc** — dit ce qui SERAIT fait, n'écrit RIEN :

```text
pnpm --filter @zwadj/api run admin:promote -- --dry-run adresse@exemple.dz
```

Réponse attendue : `✓ (--dry-run) Ce compte SERAIT promu ADMIN … Rien n'a été écrit.`

**Puis pour de vrai** — la même commande sans `--dry-run` :

```text
pnpm --filter @zwadj/api run admin:promote -- adresse@exemple.dz
```

Réponse attendue : `✓ Compte promu ADMIN … Une ligne a été écrite dans le journal.`

## Après

- **Déconnectez-vous puis reconnectez-vous** avec ce compte. Le rôle est écrit dans le jeton de connexion : un jeton déjà émis garde l'ancien rôle jusqu'à son expiration (15 minutes par défaut, `JWT_ACCESS_TTL`). C'est écrit, pas un défaut du script (D-9).
- Pour vérifier sans écran, dans DBeaver, sur la même base :

```sql
SELECT created_at, action, entity_id FROM audit_logs WHERE action = 'user.promote_admin' ORDER BY created_at DESC LIMIT 5;
```

## Si le script refuse — ce que chaque message veut dire

Dans tous les cas, **rien n'a été écrit** (code de sortie 1).

| message | ce que ça veut dire | quoi faire |
|---|---|---|
| aucun compte n'a cette adresse | l'adresse est mal tapée, ou le compte n'existe pas sur CETTE base | relire « Base visée », puis l'adresse |
| le compte n'est pas actif | il est suspendu ou anonymisé | choisir un autre compte |
| l'adresse e-mail du compte n'est pas vérifiée | le lien de vérification n'a pas été ouvert | l'ouvrir, puis relancer |
| c'est un compte PRO | il perdrait l'accès à ses salles | inscrire un compte client dédié |
| le compte a changé pendant l'opération | deux lancements en même temps, ou une suspension entre-temps | relancer |

Si le compte est **déjà** administrateur, le script le dit et ne fait rien (code de sortie 0) : on peut le relancer sans danger.

## Ce que le script ne fait PAS

- Il ne **rétrograde** personne. Retirer le rôle d'un administrateur se fait aujourd'hui à la main (SQL), et l'ancien rôle reste actif jusqu'à l'expiration de son jeton d'accès (≤ 15 minutes) : arbitrage de Ko D-9 (e3-a), écrit.
- Il ne pose **aucun second facteur**.

## ⛔ À ne pas oublier avant tout déploiement

Deux choses que Ko a repoussées, « pas annulées », et qui **bloquent toute mise en service** (D-7 et D-9, D321) : le **second facteur (MFA)** des comptes administrateurs, et la **relecture du rôle et du statut en base** sur chaque route administrateur. Tant qu'elles ne sont pas faites, un administrateur rétrogradé ou suspendu garde ses droits jusqu'à l'expiration de son jeton, et un mot de passe volé suffit à approuver une suppression de compte, irréversible.
