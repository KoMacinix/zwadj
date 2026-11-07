# FC-2 — la prémisse, vérifiée à `fa38448`, dans un navigateur (D231)

**Le défaut existe encore, et il est plus large que la phrase de la consigne.** La spec neuve
(`e2e/specs/fc2-debordement-360.e2e.ts`), jouée contre l'état d'avant (`rouges/rouge-e2e.txt`), mesure à 360 px, visiteur
anonyme, session résolue (« Inscription » visible) :

| écran | fr : `scrollWidth` | ar : `scrollWidth` |
|---|---|---|
| accueil | **364** | 360 |
| recherche | **364** | 360 |
| fiche salle | **364** | 360 |

⇒ Ce n'est pas la fiche salle seule : c'est **l'en-tête**, commun aux trois gabarits. Même valeur que la sonde de D321
(`docs/preuves/D321/captures/debordement.txt` : « fr : … scrollWidth 364 px », « `<div class="header-auth">` 20→364 »).

**La cause, lue dans les feuilles.** `.header-auth` (`packages/ui/styles.css`) est un `flex` SANS retour à la ligne : son
contenu (bascule de thème, « العربية », « Connexion », « Inscription ») mesure 344 px quand la ligne n'en offre que 320 (360 moins
deux marges de 20 px). Un conteneur flex qui ne passe pas à la ligne a pour largeur minimale la SOMME de ses enfants : il ne peut
pas rétrécir, il déborde. En arabe la barre tient (« Français » est plus court que « العربية » et les libellés arabes aussi).

**Le correctif retenu** : dans l'en-tête du CLIENT seulement (`.site-header--stacked`, que le Pro ne porte pas — commentaire de
`packages/ui/styles.css`), la barre PASSE À LA LIGNE (`flex-wrap: wrap`), alignée sur la fin de ligne (`justify-content:
flex-end`, une propriété LOGIQUE : à droite en français, à gauche en arabe). Aucune largeur seuil, aucun `@media` : la barre
passe à la ligne à toute largeur où elle ne tient plus, quelle que soit la langue ou la longueur d'un libellé futur. Les deux
en-têtes Pro ne bougent pas.
