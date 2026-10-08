POLICES DES DOCUMENTS (PDF) — rang 33, D326, décision 5 du relecteur : « une police arabe (licence relevée, fichier versé au dépôt) ».

Police      : Readex Pro (sous-ensembles « arabic » et « latin », graisses 400 et 600), WOFF2.
Provenance  : le paquet `@fontsource/readex-pro` 5.2.11 (celui de `apps/pro` et de `apps/client` — la police de l'interface), fichiers
              `files/readex-pro-{arabic,latin}-{400,600}-normal.woff2`, copiés À L'OCTET (comparés par `cmp` à la copie).
Licence     : SIL Open Font License 1.1 — « Copyright 2019 The Readex Pro Project Authors (https://github.com/ThomasJockin/readexpro) ».
              Texte intégral : `OFL-readex-pro.txt` (copie à l'octet du `LICENSE` du paquet). Redistribuable avec le logiciel, à condition de
              garder cette notice et ce texte ; la police ne se vend pas seule.
Pourquoi ici: le PDF est rendu CÔTÉ SERVEUR par un navigateur dont le réseau est BLOQUÉ (décision 3) : la police ne peut pas venir d'une adresse,
              elle vient du dépôt, lue sur disque et injectée dans le document (`quote-document-fonts.ts`). Sur une image Linux sans police arabe,
              c'est ELLE seule qui porte l'arabe — la preuve sur l'image réelle est une entrée du backlog (déploiement).
Build       : `nest-cli.json` copie ce dossier dans `dist/documents/fonts/` ; sans cela, la police est absente en production.
