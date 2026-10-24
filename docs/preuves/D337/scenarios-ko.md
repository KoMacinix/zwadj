# D337 — rang 42, L36-1 : les gestes de Ko pour une réservation par e-mail seul

En langage simple. Ta base a déjà reçu la migration (voir `ecritures-base-dev.md`). Redémarre l'API et les deux sites si tu les as laissés tourner.

1. **Réserver avec l'e-mail seul.** Site client, connecté en client : ouvre une salle, choisis une date, tape prénom, nom et nombre d'invités, puis **seulement une adresse e-mail**. À constater : le bouton « Envoyer ma demande » s'ouvre, le message de confirmation s'affiche.
2. **Ne rien mettre.** Même formulaire, ni numéro ni e-mail. À constater : une phrase sous les champs dit « l'un des deux au moins » et le bouton reste grisé. Ni le numéro ni l'e-mail ne porte d'astérisque.
3. **Un e-mail mal tapé.** Tape `amina@` : un message rouge « Adresse e-mail invalide » apparaît et le bouton se grise, même si un bon numéro est saisi.
4. **Côté pro.** Connecté en pro, rubrique « Demandes » : la demande du geste 1 est là, avec l'**e-mail à la place du numéro**.
5. **Un devis converti par e-mail seul.** « Nouvelle réservation » : au contact, tape seulement une adresse e-mail ; au devis, « Enregistrer sans bloquer » est actif **sans numéro**. À constater : « SMS » et « Téléphone » sont grisés, « E-mail » reste disponible.
6. **En arabe.** Refais 1, 2 et 3 avec l'interface en arabe : la phrase « l'un des deux » s'affiche, et l'e-mail s'écrit de gauche à droite dans la liste du pro.
