# Zwadj — vérification des 30 contrôles de sécurité

**Archive :** zwadj(6).zip · comparaison intégrale avec zwadj(5).zip  
**Mise à jour :** 9 septembre 2026 · audit initial : 8 septembre 2026  
**Périmètre :** code, configuration, migrations, dépendances verrouillées et vérifications locales. Aucun fichier original modifié.

## Verdict

**Le projet ne respecte pas encore l’ensemble de cette liste.** Il possède des protections applicatives utiles, mais présente des défauts confirmés de journalisation et de configuration, des dépendances signalées par des avis de sécurité, et des fonctionnalités de sécurité encore absentes.

La configuration réelle de l’hébergeur n’est pas fournie. Le WAF, la protection DDoS, les certificats, le chiffrement des disques, les droits d’exploitation, les alertes et les sauvegardes ne peuvent donc pas être validés à partir du ZIP.

Légende :

- **Présent** : mécanisme constaté dans le code ; cela ne certifie pas le déploiement.
- **Partiel** : mécanisme présent avec une limite ou un défaut identifié.
- **Absent / à corriger** : contrôle absent de l’archive ou défaut confirmé.
- **Non vérifiable** : preuve d’exploitation nécessaire.
- **En attente** : fonctionnalité concernée non encore implémentée.

## Progrès vérifiés depuis la version précédente

**Oui, il y a un progrès sur le chiffrage et la validation métier. Le verdict de sécurité global reste insuffisant.** La comparaison de tous les fichiers donne **3 ajouts, 8 modifications, aucune suppression et 533 fichiers identiques**.

| Point | Évolution confirmée |
|---|---|
| Calcul réservation/devis | Module pur `booking-charge.ts`, réellement consommé par les deux services ; duplication du total et de l'acompte supprimée |
| Prestations en double | Refus `SERVICE_DUPLICATE` avec HTTP 409 avant toute écriture ; l'ancienne version atteignait l'écriture avec une double facturation de la prestation |
| Appartenance d'une prestation à la salle | Vérification explicite supplémentaire dans le calcul, en complément des filtres de requête déjà présents |
| Montant annoncé par le client | Confrontation extraite dans une fonction pure ; les montants réels restent renvoyés en cas de désaccord |
| Authentification, logs, HTTP, infrastructure, conformité | Aucun changement des fichiers concernés : les défauts et limites du premier audit restent ouverts |
| Dépendances | Manifestes et lockfile identiques ; la consultation actuelle retourne davantage d'avis, détaillés ci-dessous |

Preuves : [apps/api/src/venues/booking-charge.ts:92](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/booking-charge.ts), [apps/api/src/venues/bookings.service.ts:223](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/bookings.service.ts), [apps/api/src/venues/quotes.service.ts:448](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/quotes.service.ts). Les sondes comparent les vrais services des deux archives avec une persistance simulée, arrêtée à la frontière d'écriture. Elles ne prouvent pas un déploiement ni une transaction réelle.

Le contrôle **20 — validation des entrées** est donc renforcé, et le contrôle **18 — droits serveur** reçoit une défense supplémentaire ciblée. Aucun des contrôles auparavant absents, à corriger ou non vérifiables ne peut être déclaré entièrement résolu par ce lot. Le rapport SOLID actualisé retire le reproche de duplication du chiffrage côté serveur.

La nouvelle consultation de dépendances retourne **55 entrées / 53 GHSA distincts**, contre 44 / 42 lors de la précédente. Les 11 identifiants supplémentaires enrichissent le résultat connu ; ils ne correspondent pas à 11 dépendances ajoutées ni à 11 régressions introduites par vos changements. Certains avis avaient déjà été publiés avant le premier audit : il ne faut pas lire cet écart comme leur date de découverte ou de publication.

## Grille complète

### 1. Secrets, configuration et infrastructure

| N° | Contrôle | Verdict | Constat |
|---|---|---|---|
| 1 | Clés API dans .env | Présent, côté structure | JWT et clé Chargily passent par la configuration d’environnement. Trois .env.example sont fournis ; aucun .env réel dans l’archive. Aucun secret de production identifié par le balayage heuristique. L’historique Git n’est pas fourni. |
| 2 | .env dans .gitignore | Partiel | .env, .env.local et .env.*.local sont ignorés. .env.production et .env.staging ne le sont pas. Vérifié avec le moteur Git. |
| 3 | Clé publique côté client | Présent | NEXT_PUBLIC_GOOGLE_CLIENT_ID est un identifiant OAuth public. Aucune référence utilisable à une clé privée serveur trouvée dans les deux frontends. |
| 4 | Dépendances à jour | À corriger | Nouvelle consultation : 55 entrées, 53 GHSA distincts : 2 critiques, 30 élevées, 21 modérées, 2 faibles. Lockfile inchangé. Ce sont des signalements de dépendances, pas 55 exploitations démontrées de Zwadj. |
| 5 | Moindre privilège | Partiel | Rôles et appartenance des ressources contrôlés dans l’API. L’exemple SQL utilise le compte d’initialisation ; aucun rôle d’exécution aux droits réduits ni configuration IAM de production fourni. |
| 6 | DDoS et WAF | Non vérifiable | Limiteur applicatif présent ; aucune configuration WAF ou protection en périphérie du réseau fournie. Les routes médias et health sont exemptées du limiteur applicatif. |

### 2. Authentification et sessions

| N° | Contrôle | Verdict | Constat |
|---|---|---|---|
| 7 | Mots de passe hashés | Présent | Argon2id avec génération du sel par la bibliothèque. Les valeurs par défaut de la version installée sont 64 Mio, trois passes, parallélisme quatre. Les tokens opaques sont stockés sous forme SHA-256. |
| 8 | Rate limiting du login | Partiel | Par défaut, 10 tentatives par 15 minutes, par IP et route. Stockage en mémoire du processus ; aucune configuration effective de confiance du proxy. |
| 9 | Sessions qui expirent | Présent, avec réserves | JWT : 15 minutes par défaut. Refresh : 30 jours, avec rotation et échéance glissante. Aucun plafond absolu de durée de session. Un JWT déjà émis n’est pas immédiatement invalidé par la seule révocation du refresh. |
| 10 | Email confirmé | Partiel | PRO/ADMIN non vérifiés refusés au login. Un CLIENT peut se connecter sans confirmation, par choix produit. Le fournisseur email actuellement branché journalise les messages sans les envoyer. |
| 11 | Cookies sécurisés | Partiel | HttpOnly, SameSite=Lax, portée /api/v1/auth et absence de Domain explicite. Secure dépend d’une variable qui peut rester false même en production. |
| 12 | MFA / 2FA | Absent | Aucun mécanisme TOTP, WebAuthn, second facteur ou récupération MFA trouvé. La connexion Google ne garantit pas un second facteur imposé par Zwadj. |

### 3. Réseau et HTTP

| N° | Contrôle | Verdict | Constat |
|---|---|---|---|
| 13 | HTTPS partout | Partiel / non garanti | Aucun dispositif TLS ou de redirection HTTPS fourni. Des URL HTTP sont acceptées en mode production ; TLS vers PostgreSQL n’est pas imposé. Une terminaison HTTPS chez l’hébergeur reste possible, mais non vérifiée. |
| 14 | CORS configuré | Présent, configuration à vérifier | Liste d’origines avec credentials=true. Une sonde HTTP confirme les bons en-têtes pour une origine autorisée et leur absence pour une origine non listée. La production peut néanmoins retomber sur la liste localhost si la variable manque. |
| 15 | Webhooks signés | En attente | Le webhook Chargily n’existe pas encore. Son développement est explicitement en pause et les paiements sont désactivés par défaut. Aucun webhook non signé exposé n’a été trouvé ; la garantie demandée n’est pas implémentée. |
| 16 | CSP | Absent de l’application | Aucune politique CSP dans l’API, Next.js ou Vite. Une CSP ajoutée au proxy ne peut pas être vérifiée ici. |
| 17 | En-têtes de sécurité | Absents de la configuration applicative | Aucun dispositif explicite pour HSTS, nosniff, anti-encadrement, Referrer-Policy ou Permissions-Policy. Le montage API testé ne les émet pas. |

### 4. Données et droits

| N° | Contrôle | Verdict | Constat |
|---|---|---|---|
| 18 | Droits côté serveur | Présent, avec réserves | JWT et rôles appliqués globalement ; filtres owner/client dans les opérations. L’inscription publique ne peut pas créer ADMIN. Nouveau : le calcul vérifie explicitement la salle de chaque prestation. Les rôles du JWT peuvent rester valables jusqu’à son expiration. |
| 19 | RLS activée | Absente des migrations | Aucun ENABLE ROW LEVEL SECURITY ni CREATE POLICY dans les 26 migrations. La RLS est une protection supplémentaire possible ; elle n’est pas indispensable à toute architecture avec une API serveur. |
| 20 | Inputs validés | Présent, renforcé | Zod et règles serveur déjà présents. Nouveau : les doublons de prestations sont refusés avant les écritures de réservations/devis, avec SERVICE_DUPLICATE. Le pipe global sans schéma ne valide rien à lui seul. |
| 21 | Taille maximale des uploads | Présent | 10 Mio par photo, limités dans Multer et à nouveau dans le traitement d’image. Cela ne couvre pas à lui seul tous les risques du parseur multipart. |
| 22 | Type de fichier vérifié | Présent | Le contenu est décodé avec sharp ; JPEG, PNG et WebP acceptés. Réencodage WebP et suppression des métadonnées EXIF. Le nom et le MIME déclarés ne suffisent pas. Réserve actualisée : sharp 0.35.3 fait lui-même l’objet d’un avis ; le contrôle du format intervient après la lecture des métadonnées. |
| 23 | Chiffrement au repos | Non vérifiable | Aucun chiffrement applicatif général des données ou des médias. Le chiffrement des volumes, de la base et des sauvegardes dépend de l’hébergement. Le hash du mot de passe ne prouve pas le chiffrement de la base. |

### 5. Logs, erreurs et résilience

| N° | Contrôle | Verdict | Constat |
|---|---|---|---|
| 24 | Erreurs détaillées coupées | Présent pour les erreurs internes | Une exception non HTTP devient un 500 générique, sans stack dans la réponse. Les erreurs de validation et les erreurs métier structurées restent visibles, ce qui est normal. |
| 25 | console.log nettoyés | Globalement présent | Aucun console.log dans les modules de production analysés. Un console.error de rendu subsiste dans GuardedSection ; des logs de scripts de seed existent. Le principal défaut de confidentialité est dans Pino, pas dans console.log. |
| 26 | Message d’erreur unique | Partiel | Login : même erreur pour compte inconnu et mauvais mot de passe, avec calcul Argon2 factice. Forgot/resend : réponse constante. L’inscription et le changement d’email révèlent encore EMAIL_ALREADY_USED. |
| 27 | Logs centralisés et sécurisés | À corriger | Pino structure les logs et masque Authorization et Cookie entrants. Il laisse les tokens présents dans les URL, les cookies Set-Cookie sortants et le contenu des emails. Aucune preuve de collecteur, contrôle d’accès ou durée de conservation. |
| 28 | Alerting en temps réel | Non vérifiable | Des erreurs et événements de sécurité sont journalisés ; aucune intégration ou règle d’alerte opérationnelle fournie. Écrire un warn/error n’établit pas qu’une alerte est envoyée. |
| 29 | Backups automatiques | Non vérifiable ; anomalie de volume | Aucun job, calendrier ou test de restauration fourni. Le volume du Compose utilise en outre un emplacement incompatible avec le PGDATA par défaut de l’image PostgreSQL 18. |

### 6. Conformité

| N° | Contrôle | Verdict | Constat |
|---|---|---|---|
| 30 | RGPD / CCPA | Non démontrée ; préparation incomplète | Pages CGU/confidentialité réduites à « Bientôt disponible ». Modification de profil et demande de suppression présentes, mais pas de dossier de conformité, politique de conservation, procédure complète de droits ou justification des traitements fournis. L’applicabilité doit être déterminée selon l’exploitant et les marchés visés. |

## Défauts et corrections prioritaires

### P1 — Des secrets de session et de récupération arrivent dans les logs

[apps/api/src/app.module.ts:28](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/app.module.ts) ne masque que Authorization et Cookie des requêtes. Une sonde utilisant la version installée de pino-http et exactement cette liste de masquage a confirmé :

- le Bearer entrant et le Cookie entrant sont masqués ;
- un token placé dans l’URL reste enregistré ;
- le refresh token d’un en-tête Set-Cookie reste enregistré.

Le problème de token dans l’URL correspond à une vraie route : [apps/api/src/auth/auth.controller.ts:68](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/auth/auth.controller.ts) reçoit le token de vérification dans le chemin. Le risque sur le cookie correspond aux réponses de login/refresh.

Un second chemin est indépendant des logs HTTP : [apps/api/src/common/email/email.module.ts:7](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/common/email/email.module.ts) branche DevLoggerEmailSender sans condition de production. [apps/api/src/common/email/dev-logger.email.ts:21](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/common/email/dev-logger.email.ts) journalise le message complet, et [apps/api/src/auth/auth-emails.service.ts:64](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/auth/auth-emails.service.ts) y insère le lien de réinitialisation contenant le token brut. Une sonde a confirmé ce comportement avec NODE_ENV=production. Les messages ne sont pas envoyés par cet adaptateur.

**Correction :** brancher un fournisseur email réel pour la production ; interdire l’adaptateur de développement dans ce mode ; supprimer ou masquer les secrets dans les URL et les en-têtes sortants ; conserver les événements utiles sans corps de message ni token. Vérifier ensuite les droits d’accès et la rétention du collecteur de logs. Si cette version a traité des utilisateurs réels, examiner l’exposition des logs et la révocation des secrets concernés.

Il s’agit de chemins de fuite reproduits avec des données factices. Aucun accès à des logs de production ni aucune fuite réelle concernant un utilisateur n’a été constaté.

### P1 — Les valeurs de production ne garantissent pas une configuration sûre

[apps/api/src/config/env.ts:150](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/config/env.ts) exige certaines variables explicitement. Il ne suffit pourtant pas de vérifier leur présence :

- AUTH_COOKIE_SECURE=false est accepté ;
- CLIENT_URL et PRO_URL en HTTP sont acceptés ;
- CORS_ORIGINS peut manquer et conserver localhost ;
- DATABASE_URL n’impose pas TLS ;
- les variables THROTTLE_* sont lues séparément sans validation par [apps/api/src/auth/auth.throttle.ts:9](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/auth/auth.throttle.ts).

Deux sondes ont confirmé qu’une configuration production avec Secure=false passe la validation, puis produit réellement cette option dans AuthController.

**Correction :** imposer les invariants adaptés à la production au démarrage : Secure=true, origines et URL publiques HTTPS explicites, valeurs de limitation valides et politique TLS de base de données adaptée à l’infrastructure. [apps/api/src/main.ts:17](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/main.ts) contient une note sur le proxy ; ce n’est pas une configuration effective. Définir la confiance uniquement pour les proxys réellement utilisés.

### P1 — Les dépendances verrouillées comportent des avis de sécurité

La nouvelle consultation a terminé avec un code de sortie 1 pour des avis trouvés, sans erreur réseau. Elle compte **55 entrées : 2 critiques, 30 élevées, 21 modérées, 2 faibles**, soit **53 GHSA distincts**. Les 42 identifiants précédents sont toujours présents, avec 11 supplémentaires. Le lockfile et tous les manifestes sont identiques entre les deux ZIP : cet écart de résultats ne mesure pas une régression du code livré.

| Dépendance | Version constatée | Lecture actualisée |
|---|---|---|
| Next.js | 15.5.20 | Les correctifs de la branche 15.5 restent à appliquer ; l'avis officiel d'août donne 15.5.24. Les deux signalements critiques apparaissent désormais aussi dans le résultat brut. |
| Multer, via Nest Express | 2.1.1 | FileInterceptor réellement utilisé sur la route PRO d'upload. Le correctif minimal recommandé dans cet audit passe de 2.2.0 à **2.3.0**, pour couvrir les avis supplémentaires sur les champs multipart. |
| sharp, API | 0.35.3 | **La copie directe de l'API est maintenant également signalée** par GHSA-rgj7-g3m4-5g8c. Correctif fourni à partir de **0.35.4**. |
| sharp, Next.js | 0.34.5 | Copie transitive distincte, également concernée. Une mise à jour de sharp dans l'API seule ne met pas automatiquement cette copie à jour. |
| React Router | 7.18.1 | Avis ciblant les API RSC instables, corrigé en 7.18.2. Le Pro utilise BrowserRouter sans ces API ; exploitabilité non établie ici. |
| Autres transitives | Voir annexe | Certains chemins concernent l'outillage et les dépendances optionnelles de Prisma CLI/ESLint, même sous --prod. Chaque chemin doit être contextualisé. |

Next.js décrit deux conditions précises : AVIF dans l'optimiseur d'images, ou serveur Windows utilisant conjointement Pages Router et App Router. L'archive emploie App Router et des balises img, sans configuration distante d'optimisation. **Aucune exécution de code à distance sur Zwadj n'a été démontrée.** Le correctif reste nécessaire [S1, S2].

Pour Multer, l'avis antérieur sur l'imbrication est corrigé en 2.2.0 [S3], mais les avis supplémentaires GHSA-wc9g-mqfw-jrwm et GHSA-535w-7cp7-47q4 demandent **2.3.0**. Ils décrivent des arrêts du processus provoqués par des noms de champs multipart. La limite de taille de photo ne couvre pas ces cas. L'accès PRO réduit l'exposition de la route du projet ; il ne corrige pas le parseur [S10, S11]. Aucun essai de déni de service n'a été exécuté.

L'avis sharp concerne libheif et le traitement de données non fiables, avec possibilité d'exécution de code sous certaines conditions Linux ; le correctif fourni est 0.35.4 [S12]. Dans [apps/api/src/media/image-pipeline.ts:58](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/media/image-pipeline.ts), `sharp(input).metadata()` précède la liste des formats autorisés. **Déduction du code :** refuser AVIF après cette lecture ne suffit pas à prouver que le parseur vulnérable n'a jamais touché les octets. Prioriser aussi la copie API ; aucune exploitation n'a été tentée.

La distinction de versions du premier rapport était correcte pour le signalement alors retourné sur sharp 0.34.5 ; elle ne doit plus être lue comme une absence d'avis concernant sharp 0.35.3. L'avis React Router reste classé élevé par le résultat npm et modéré par son mainteneur ; les totaux reproduisent l'outil, tandis que la pertinence suit l'usage constaté [S4].

**Correction :** mettre à jour les dépendances directes et les branches transitives concernées, vérifier les versions effectivement résolues dans le lockfile, puis rejouer audit/tests/build. Aucun paquet n'a été modifié dans cette revue.

### P1 — La persistance déclarée pour PostgreSQL 18 doit être corrigée

[docker-compose.yml:14](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/docker-compose.yml) monte le volume nommé sur /var/lib/postgresql/data, alors que l’image postgres:18 utilise par défaut /var/lib/postgresql/18/docker et prévoit le montage sur /var/lib/postgresql [S5].

**Constat par rapprochement du Compose et de la documentation officielle :** le volume nommé ne couvre pas le PGDATA par défaut. Il ne faut pas en déduire que les données réelles sont protégées par ce volume. Le comportement d’un conteneur existant n’a pas été testé, Docker n’étant pas disponible.

**Correction :** relever le PGDATA et les volumes réellement utilisés, sauvegarder les données existantes avant de modifier le montage, puis valider la persistance et une restauration. Prévoir des sauvegardes indépendantes pour PostgreSQL et les médias. Un volume persistant n’est pas une sauvegarde.

Le même Compose contient un mot de passe de développement en clair et publie le port 5432. [apps/api/.env.example:1](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/.env.example) doit être lu comme un exemple local, pas comme une configuration de production. Le rôle créé par POSTGRES_USER est un superutilisateur [S5] ; séparer rôle de migration et rôle applicatif.

### P1 — Le défaut d’usage unique du reset reste présent

[apps/api/src/auth/auth.service.ts:751](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/auth/auth.service.ts) lit le token avant la transaction ; [apps/api/src/auth/auth.service.ts:778](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/auth/auth.service.ts) le consomme ensuite par ID sans condition usedAt=null. La reproduction contrôlée du précédent audit a montré deux réinitialisations réussies avec le même token.

La nouvelle archive conserve exactement ce code : ce défaut reste ouvert. Il concerne la récupération du compte, même si le hash du mot de passe et la durée de vie des sessions sont corrects.

**Correction :** consommer atomiquement un token toujours valide, effectuer le changement de mot de passe et révoquer les sessions dans la même transaction. Vérifier les autres flux à token unique. Le conflit entre annulation et approbation de suppression de compte signalé dans l’audit précédent reste également à traiter.

### P2 — Compléter les politiques navigateur et la protection distribuée

[apps/api/src/app.setup.ts:11](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/app.setup.ts), [apps/client/next.config.ts:5](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/client/next.config.ts) et [apps/pro/vite.config.ts:6](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/pro/vite.config.ts) ne définissent pas de politique d’en-têtes de sécurité. Une sonde du montage API a confirmé l’absence des six en-têtes recherchés.

**Correction :** définir les politiques applicables aux réponses HTML/API, protéger l’encadrement, activer nosniff et HSTS au bon niveau, et introduire une CSP compatible avec le script de thème, Google GIS et Matterport. Vérifier les en-têtes réellement émis par le déploiement ; ne pas ajouter simplement une CSP qui casse les fonctionnalités.

[apps/api/src/auth/auth.throttle.ts:46](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/auth/auth.throttle.ts) fournit bien un quota de login. Le stockage intégré est local au processus, et la documentation Nest demande une configuration adaptée derrière un proxy [S6]. Plusieurs instances nécessitent une coordination des quotas. Restreindre l’exposition réseau de health et des services internes ; traiter les médias et le trafic volumétrique au niveau approprié.

### P2 — Compléter les garanties de compte et l’information des utilisateurs

La confirmation email partielle correspond au comportement explicite de [apps/api/src/auth/auth.service.ts:278](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/auth/auth.service.ts). Le blocage de tous les clients non vérifiés serait donc une évolution de règle produit. Il faut néanmoins que l’envoi de vérification fonctionne réellement.

Ajouter MFA en priorité sur les accès administratifs et définir l’enrôlement, la récupération et les exigences de réauthentification. Prévoir le traitement des sessions existantes lors des opérations sensibles.

[apps/client/src/app/[locale]/confidentialite/page.tsx:22](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/client/src/app/[locale]/confidentialite/page.tsx) et [apps/client/src/app/[locale]/cgu/page.tsx:25](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/client/src/app/[locale]/cgu/page.tsx) contiennent seulement un texte d’attente. Le formulaire possède une case d’acceptation, mais [apps/client/src/components/auth/register-form.tsx:71](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/client/src/components/auth/register-form.tsx) ne transmet ni version du texte ni preuve d’acceptation à l’API.

## Ce que la conformité demande de vérifier

Le RGPD dépend notamment d’un établissement dans l’UE, ou d’une offre visant des personnes dans l’UE ou d’un suivi de leur comportement. Le CCPA dépend de l’activité en Californie et de critères d’assujettissement ; il ne s’applique pas automatiquement à toute application. L’exploitant, les marchés visés, le volume de données et le modèle commercial ne sont pas établis par le ZIP [S7, S8].

Les lacunes techniques/documentaires visibles sont :

- une vraie information sur les données, finalités, destinataires, durées et contacts ;
- l’identification des bases légales et des sous-traitants ;
- des procédures d’accès, rectification, effacement et, lorsque requis, portabilité ;
- la politique de conservation et la gestion des sauvegardes/logs ;
- l’examen des transferts et intégrations Google, Matterport et futurs prestataires ;
- la procédure de gestion des incidents.

[apps/api/src/account/account-deletion.service.ts:226](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/account/account-deletion.service.ts) efface plusieurs attributs du compte, mais ne supprime pas tous les instantanés de contact des réservations ni les données historiques associées. L’étiquette ANONYMIZED ne suffit pas à rendre tout le jeu de données anonyme. Une conservation peut être légitime ; elle doit être justifiée, limitée et documentée.

Une case « j’accepte » ne rend pas tous les traitements licites. Inversement, tous les traitements ne doivent pas reposer sur le consentement, et l’absence d’une bannière cookies n’est pas à elle seule une preuve de non-conformité. Les traceurs effectivement utilisés et leur finalité doivent être examinés. Cette revue identifie les écarts ; elle ne certifie pas la conformité juridique.

## Points correctement implémentés à conserver

- [apps/api/src/auth/password.service.ts:13](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/auth/password.service.ts) : Argon2id ; [apps/api/src/auth/token.service.ts:14](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/auth/token.service.ts) : tokens aléatoires de 32 octets et hash des tokens stockés.
- [apps/api/src/auth/jwt-auth.guard.ts:26](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/auth/jwt-auth.guard.ts) et [apps/api/src/auth/roles.guard.ts:24](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/auth/roles.guard.ts) : protection serveur globale, avec exceptions publiques explicites.
- [apps/api/src/venues/venue-store.prisma.ts:36](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/venue-store.prisma.ts) : requêtes bornées au propriétaire ; [apps/api/src/venues/bookings.controller.ts:29](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/bookings.controller.ts) : rôle CLIENT pour les routes concernées.
- [packages/types/src/auth.ts:161](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/packages/types/src/auth.ts) : inscription limitée aux rôles CLIENT/PRO.
- [packages/api-client/src/auth-client.ts:123](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/packages/api-client/src/auth-client.ts) : access token conservé en mémoire, pas dans localStorage.
- [apps/api/src/auth/auth.service.ts:554](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/auth/auth.service.ts) : consommation conditionnelle du refresh lors de sa rotation et traitement de la réutilisation.
- [apps/api/src/venues/venue-media.controller.ts:100](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/venues/venue-media.controller.ts) et [packages/types/src/media.ts:17](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/packages/types/src/media.ts) : limite de 10 Mio ; [apps/api/src/media/image-pipeline.ts:50](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/media/image-pipeline.ts) : inspection réelle des octets et formats autorisés.
- [apps/api/src/common/filters/all-exceptions.filter.ts:37](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-v6/apps/api/src/common/filters/all-exceptions.filter.ts) : erreur interne générique.

La RLS ne doit pas être ajoutée mécaniquement. Avec une base accessible seulement à l’API, l’autorisation serveur peut être le contrôle principal. Une RLS supplémentaire exige des politiques testées et une propagation sûre du contexte utilisateur. PostgreSQL précise que les superutilisateurs et BYPASSRLS la contournent [S9] : l’activer sans revoir les rôles SQL pourrait donner une fausse garantie.

## Vérifications exécutées et limites

| Vérification de cette révision | Résultat |
|---|---|
| Comparaison intégrale | 544 fichiers dans v6 : 3 ajouts, 8 modifications, 533 identiques ; aucune suppression |
| Analyse de source | 424 TS/TSX analysés ; aucun diagnostic de syntaxe ; 26 migrations inchangées |
| Balayage de secrets | 544 fichiers parcourus pour six familles de clés/tokens ; aucun motif reconnu trouvé. Contrôle heuristique, sans historique Git. |
| Dépendances | Nouvelle consultation en ligne : 55 entrées, 53 GHSA distincts ; comparaison avec le résultat initial conservé |
| Suite API | 653 tests / 57 fichiers, tous réussis, dont les 13 nouveaux tests purs de chiffrage |
| Sondes complémentaires | 10 réussies : comparaison v5/v6 et branchement des deux services, montants conservés, refus des doublons et autres salles, désaccord de montant et diagnostic d'ordre des refus |
| TypeScript / ESLint | 6 contrôles réussis : API, types partagés et i18n ; construction du paquet types réussie |
| Mutations locales S11-b | 7 cibles détectées par de vraies assertions, 13 tests collectés à chaque passage ; retour au vert après restauration |
| Intégrité | 544/544 fichiers originaux identiques au ZIP après vérification ; aucun correctif applicatif livré |

La revue initiale avait exécuté 137 tests de sécurité ciblés, six sondes de configuration/cookies/logs/en-têtes/CORS et un balayage des 541 fichiers d'origine. Ces résultats sont **historiques** ; les fichiers portant ces contrôles sont inchangés et les trois ajouts concernent le chiffrage et ses tests. Les 30 statuts ci-dessus s'appuient sur cette comparaison et les nouvelles vérifications, sans présenter les six anciennes sondes comme rejouées ici.

Le défaut de reset, les courses de transitions et les fuites de logs ne sont pas fermés par les tests API verts. Une assertion diagnostique qui confirme un comportement indésirable reproduit le défaut. Le nouveau harnais possède aussi une faiblesse d'interprétation des codes de sortie, détaillée dans le rapport SOLID ; les sept mutations ici annoncées ont été contrôlées séparément à partir de leurs assertions et nombres de tests.

Runtime : Node 24.19.0 au lieu du Node 22 demandé ; pnpm 11.19.0 au lieu de 10.34.4. Dépendances réutilisées après vérification des lockfiles identiques, vrai client Prisma régénéré depuis le schéma v6, exécutables locaux utilisés pour les contrôles. Les sondes utilisent des données factices et une persistance simulée, pas des transactions PostgreSQL réelles.

Pas d'accès à l'hébergement, pas de PostgreSQL/Docker disponibles, pas de test E2E ou build de production complet relancé, pas de pentest ni de restauration. La cible de mutation exigeant PostgreSQL reste non mesurée ici. Les 1 310 tests du premier audit global et les 1 323 tests/build/intégration/E2E annoncés dans D279 ne sont pas présentés comme une nouvelle exécution globale indépendante.

Archive v6 SHA-256 : 5d0deaf82489da57c164129eaa154dd6d86862f7f7d71bba2038aa943fe8f970  
Lockfile identique SHA-256 : 99018400767a6a14232683e8158806e29178b6f79e76f15111a25dd0c3141bbb

Les résultats factuels, les logs et les sondes de la révision sont regroupés dans [zwadj-audit-evidence.zip](sandbox:/workspace/scratch/471c2fcb8f81/zwadj-audit-evidence.zip) ; les preuves initiales y restent identifiées comme v5.

## Annexe — lecture du résultat de dépendances

Les nombres ci-dessous comptent les entrées brutes de l’outil par paquet, y compris les branches de versions et les dépendances d’outillage. Ils ne mesurent ni le nombre de points d’entrée vulnérables, ni une exploitation démontrée.

| Paquet | Entrées |
|---|---:|
| next | 10 |
| hono | 7 |
| fast-uri | 6 |
| brace-expansion | 5 |
| multer | 5 |
| postcss | 4 |
| @hono/node-server | 2 |
| browserslist | 2 |
| js-yaml | 2 |
| mysql2 | 2 |
| nanoid | 2 |
| qs | 2 |
| sharp | 2 |
| baseline-browser-mapping | 1 |
| deepmerge-ts | 1 |
| react-router | 1 |
| valibot | 1 |
| **Total** | **55** |

Commande exécutée, depuis la racine :

    pnpm audit --prod --json --registry=https://registry.npmjs.org --fetch-retries=0 --fetch-timeout=15000

## Sources externes officielles

Sources du rapport initial consultées le 8 septembre 2026 ; S1, S3 à S9 revérifiées et S10 à S12 ajoutées lors de la révision du 9 septembre 2026, pour les avis, bibliothèques, images et critères légaux. Les constats propres à Zwadj proviennent du code et des sondes décrites ci-dessus.

- **S1** — [Next.js, correctifs de sécurité d’août 2026](https://nextjs.org/blog/august-2026-security-release), 25 août 2026.
- **S2** — [Next.js, correctifs de sécurité de juillet 2026](https://nextjs.org/blog/july-2026-security-release), 20 juillet 2026.
- **S3** — [Multer, GHSA-72gw-mp4g-v24j](https://github.com/expressjs/multer/security/advisories/GHSA-72gw-mp4g-v24j).
- **S4** — [React Router, GHSA-qwww-vcr4-c8h2](https://github.com/remix-run/react-router/security/advisories/GHSA-qwww-vcr4-c8h2).
- **S5** — [Documentation officielle de l’image Docker PostgreSQL : POSTGRES_USER et PGDATA](https://github.com/docker-library/docs/blob/master/postgres/content.md).
- **S6** — [NestJS : limitation de débit, proxys et stockage](https://docs.nestjs.com/security/rate-limiting).
- **S7** — [Commission européenne : données personnelles, champ d’application et principes](https://commission.europa.eu/law/law-topic/data-protection/data-protection-explained_en).
- **S8** — [California Privacy Protection Agency : champ d’application et obligations du CCPA](https://cppa.ca.gov/faq.html).
- **S9** — [PostgreSQL 18 : Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).

- **S10** — [Multer, GHSA-wc9g-mqfw-jrwm : noms de champs multipart](https://github.com/expressjs/multer/security/advisories/GHSA-wc9g-mqfw-jrwm).
- **S11** — [Multer, GHSA-535w-7cp7-47q4 : indices de tableaux surdimensionnés](https://github.com/expressjs/multer/security/advisories/GHSA-535w-7cp7-47q4).
- **S12** — [sharp, GHSA-rgj7-g3m4-5g8c : correctifs libheif](https://github.com/lovell/sharp/security/advisories/GHSA-rgj7-g3m4-5g8c), publié le 27 août 2026.
