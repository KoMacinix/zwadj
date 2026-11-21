# D356 — le geste de Ko : donner son secret du PIN à l'API (`apps/api/.env`)

⛔ **SANS CE GESTE, L'API REFUSE DE DÉMARRER SUR LE POSTE DE KO.** Le lot D356 (rang 58) rend la variable `STAFF_PIN_HMAC_SECRET` **obligatoire partout** (R-2 de la consigne, MP-12) : le PIN du personnel est stocké en HMAC-SHA-256 avec ce secret, et un serveur qui démarrerait sans secret ferait des PIN que « 10 000 valeurs cassent hors ligne en une seconde » (DR5). **La session ne l'a pas fait pour Ko** : elle n'a ni lu ni modifié ton `apps/api/.env` (règle de la consigne et de D330 — elle a seulement COMPTÉ la présence du NOM de la variable, voir la fin de ce fichier).

Ce que tu vois si tu ne le fais pas, en lançant `pnpm --filter @zwadj/api dev` : l'API s'arrête tout de suite avec un message qui commence par **`Variables d'environnement invalides :`** et qui nomme `STAFF_PIN_HMAC_SECRET`. Ce n'est pas une panne : c'est le refus voulu.

## Ce qu'il faut faire — trois commandes, dans PowerShell, depuis la RACINE du dépôt (`Zwadj`)

⚠ Aucune de ces commandes n'**imprime** le secret. Ne le recopie nulle part : ni dans le dépôt, ni dans un message, ni dans un fichier d'exemple (D200). Le fichier `apps/api/.env` est ignoré par `git`.

**1. Voir si la variable existe déjà** (n'imprime qu'un NOMBRE : 0 = absente, 1 = présente) :

```powershell
(Select-String -Path apps/api/.env -Pattern '^STAFF_PIN_HMAC_SECRET=').Count
```

Si le nombre est **1**, **ne fais pas l'étape 2** : passe à l'étape 3. S'il est **0**, continue. (Une absence de résultat se lit « 0 » ; si la commande répond une erreur de fichier introuvable, ton `.env` n'est pas là : dis-le au relecteur avant de continuer.)

**2. Ajouter la variable, avec une valeur tirée au hasard par ta machine** (48 octets, jamais affichés) :

```powershell
$octets = New-Object byte[] 48
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($octets)
$secret = [Convert]::ToBase64String($octets)
$chemin = (Resolve-Path apps/api/.env).Path
[System.IO.File]::AppendAllText($chemin, [Environment]::NewLine + "STAFF_PIN_HMAC_SECRET=" + $secret + [Environment]::NewLine, (New-Object System.Text.UTF8Encoding $false))
Remove-Variable secret, octets
```

(`AppendAllText` avec un encodage UTF-8 **sans** BOM : l'ajout ne touche pas au reste du fichier. Si la dernière ligne de ton `.env` ne finissait pas par un saut de ligne, le saut de ligne mis devant la nouvelle ligne l'évite de coller deux variables.)

**3. Vérifier — sans rien afficher d'autre que deux nombres** :

```powershell
(Select-String -Path apps/api/.env -Pattern '^STAFF_PIN_HMAC_SECRET=').Count
((Select-String -Path apps/api/.env -Pattern '^STAFF_PIN_HMAC_SECRET=').Line.Length - 'STAFF_PIN_HMAC_SECRET='.Length)
```

Attendu : **`1`** (la variable existe, une seule fois), puis **`64`** (la valeur fait 64 caractères — 48 octets en base64 ; la règle exige **au moins 32**).

## Comment savoir que l'API démarre

```powershell
pnpm --filter @zwadj/api dev
```

Attendu : l'API compile et écoute sans le message `Variables d'environnement invalides`. Arrête-la (Ctrl+C) quand tu as vu.

## À savoir

- **Faire tourner ce secret** (en mettre un autre) **invalide tous les PIN stockés** : ils ne se vérifient plus. Ils ne sont **PAS réémis** par la connexion par mot de passe, qui n'émet un PIN que si celui du membre est absent, expiré ou verrouillé (un PIN non expiré est « valable » pour la base). Pour qu'un membre reçoive un PIN neuf après une rotation, un Manager réinitialise son mot de passe (K-21 efface le PIN ; le suivant est émis à la connexion suivante). **Non mesuré** : à traiter avant toute rotation en production (limite écrite au rapport).
- Les tests (`pnpm test:int`, `pnpm test:e2e`) n'ont **pas** besoin de cette variable dans ton `.env` : ils posent leur propre valeur jetable.
- En **production**, la variable est exigée **explicitement** (comme `PAYMENTS_ENABLED`) : le démarrage refuse, en nommant la variable, si elle manque.

## Ce que la session a relevé sur ton poste, déclaré (D330, D337)

- Présence du NOM `STAFF_PIN_HMAC_SECRET` dans `apps/api/.env`, comptée par un script qui n'imprime que des nombres : **relevé du 20/11/2026 à 20:04 — 39 lignes parcourues, 0 ligne qui commence par ce nom** (la variable est **absente** de ton `.env` : le geste ci-dessus est donc **nécessaire** sur ton poste). Un second relevé, à la clôture, est écrit dans le rapport. **Aucune valeur d'aucune variable n'a été lue à l'écran, versée ni imprimée.**
- Ta base de développement : **ni lue ni écrite** par ce lot (aucune migration).
