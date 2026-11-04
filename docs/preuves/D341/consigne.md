RANG 44 (SUITE) — L36-3a-1 : LA COUCHE ET SON MANAGER — LE CODE (texte proposé par le relecteur, adopté par Ko tel quel)

Lot unique de cette session : le code de L36-3a-1, sur le cadrage de D340 (docs/preuves/D340/cadrage.md) et ce qui suit. Le rang 44 est OUVERT ; cette session le fait avancer. Aucune certification (pause de Ko ; DR1). Méthode RENFORCÉE sous la pause (R-3 de D340).

0. OUVERTURE ET ORDRE DES COMMITS (D328 ; D288 ; D334, item 5)
- Numéro : la dernière ligne du registre (attendu D341 ; s'il diffère, tu le dis et tu prends celui du registre). État de départ à relire toi-même : origin/main = e40c141 (vérifié par le relecteur le 04/11/2026), arbre propre, sans stash. Si origin/main a bougé, tu t'arrêtes et tu le dis.
- Premier commit : la table seule, en chemins COMPLETS (les noms du § 5.5 du cadrage, lot 1). Toute extension est commitée SEULE, AVANT le versement qu'elle déclare.
- Lecture adverse de CETTE consigne contre le dépôt, sortie versée puis restituée EN ENTIER (forme allégée). Audits de secrets avant chaque versement (D298). Cette consigne entière versée en pièce (docs/preuves/D341/consigne.md).
- Si une affirmation de cette consigne est fausse contre le dépôt, tu t'arrêtes et tu le dis ; tu ne l'adaptes pas seul.
- Ordre : la section 1 en PREMIÈRE écriture d'autorité (D328, point 3) ; les rouges commités AVANT le premier commit de code ; le code ; les autres .md d'autorité en dernier.
- Poste sur batterie au moment d'une porte de clôture : tu ne la lances pas, tu t'arrêtes et tu le dis (R-9 de D340, AGENTS.md).

1. CE QUE KO ADOPTE — par ADOPTION de ce message (Ko l'a collé) : à écrire ainsi, jamais comme une parole de Ko
a) La nullabilité du § 5.2 du cadrage de D340, telle qu'écrite : extension de la tranche [L36-3], ratifiée par adoption (DR8).
b) Les six garanties de base du § 5.3 du cadrage de D340, (a) à (f), telles qu'écrites : extensions de la tranche [L36-3], ratifiées par adoption (DR8). Aucun déclencheur pour « jamais zéro Manager » (§ 3.2 du cadrage).

2. DÉCISIONS DU RELECTEUR (chat), DÉLÉGUÉES PAR KO
- R-1. Trois lots : L36-3a-1 (ce rang), puis L36-3a-2, puis L36-3b, proposés pour les rangs 45 et 46 ; L36-4 (écrans) après eux. Motif : § 6.3 du cadrage (3a d'un seul tenant ≈ 2,2 × L36-2, la taille qui a coûté deux sessions) ; la frontière de R-5 de D340 était fausse (pro_staff_sessions.device_id exige un appareil) : erreur du relecteur, corrigée par le cadrage.
- R-2. Ratifiées : S-98, S-99, S-100, S-101, S-102, S-104, S-105, S-106, S-108, S-109, S-112 ; S-107 pour L36-3a-2. Précision sur S-99 : SameSite=Strict suppose l'app Pro et l'API sur le même site, comme le cookie zwadj_rt en Lax aujourd'hui ; à écrire comme contrainte de mise en service.
- R-3. S-103 est REFUSÉE. Pendant la pause de 15 minutes, la réponse est la même que pour un mauvais mot de passe ou un compte inconnu, au même coût (argon2 factice, D5). Le message unique dit les deux causes (FR : « Nom de compte ou mot de passe incorrect. Après plusieurs échecs, la connexion est suspendue 15 minutes. » ; l'AR au catalogue, parité exigée). Motif : DR5 (« réponse identique pour compte inconnu et mauvais mot de passe ») ; accepter une décision qui contredit DR5 n'est pas au relecteur, et le refus applique DR5.
- R-4. S-110 est confirmée, avec ces ajouts : ؤ → و, ئ → ي, ک → ك, ی → ي ; chiffres arabes-indiens et persans → 0-9 ; retrait des caractères invisibles (U+200B à U+200F, U+202A à U+202E, U+2066 à U+2069, U+FEFF). Motif : NFKC ne ramène ni ces chiffres ni ces marques ; deux noms qui s'affichent pareil ne doivent pas faire deux comptes.
- R-5. S-111 : une liste publique dont la licence permet la redistribution, au moins 10 000 entrées, source, licence et sha256 écrits dans la table ; comparaison après mise en minuscules. Aucune règle de mot de passe au-delà de DR5.
- R-6. Avant qu'un PIN existe (ce lot), l'échéance d'un appareil est la durée du PIN (90 jours, même paramètre) ; L36-3b la ramène sous pin_expires_at. Motif : la tranche dit « jamais au-delà de pin_expires_at », et pin_expires_at est NULL tant qu'aucun PIN n'existe.
- R-7. SIG-1 se répare au PREMIER commit de code de ce lot, seul, avant tout cookie neuf, avec une garde qui lit la sortie réelle du journal de l'application Nest démarrée (limite 12 du cadrage). Motif : S-112 ; la fuite existe déjà pour zwadj_rt.
- R-8. L'audit « création et modification de fiche » (DR5) et S-107 appartiennent à L36-3a-2, pas à ce lot.
- R-9. Lectures de D302 confirmées : « un rang que Ko arbitre » = un rang que le relecteur cadre et que Ko adopte en collant la consigne ; « aucun lot ne s'ouvre sans l'arbitrage de Ko » vaut pour chaque lot, une consigne collée chacun.
- R-10. Les trois décisions dérivées par la session à la clôture de D340 sont confirmées : une passe pendant laquelle un relevé dit « batterie » est nulle et ne se rejoue pas dans la session (arrêt et rapport) ; un rouge : les sorties se commitent en local, sans pousser ; les refus du pilote passe-secteur.sh (batterie, Docker ou base absents, port d'e2e occupé, arbre sale). Ce pilote sert aux portes de clôture de ce lot. Motif : D290, D270, D276 ; elles tiennent la règle R-8 de D340.

3. LE LOT
- Contenu : la ligne L36-3a-1 du § 6.3 du cadrage (K-14 à K-18, la migration de TOUTE la tranche avec 1 a et 1 b, le garde global fermé par défaut, les cookies, la pause de 5 échecs, l'inactivité et le plafond, l'audit). Un seul rôle utilisable : MANAGER. Un mode de défaillance absent du § 4 du cadrage ne se code pas (D126).
- Migration écrite à la main (D186), testée sur base non vide (D123). Si ta lecture contredit la tranche, 1 a ou 1 b : NE MIGRE PAS, rapporte l'écart (DR8) et attends.
- Avant l'activation, l'app Pro marche exactement comme aujourd'hui : la suite e2e existante, inchangée, le mesure.
- Mesure, sans budget : le coût de la lecture du drapeau par requête Pro (limite 6 du cadrage).
- HORS LOT, inchangés : L36-3a-2, L36-3b, L36-4, le recours administrateur d'un Manager seul (backlog), l'annuaire, les notifications, Q4 (b), l'enquête D265, la garde des sorties console, NB-6.
- Tests : rouges avant le code (D334, item 5) ; harnais neutralize-r44 (--int pour la base) ; concurrence : deux activations simultanées (un seul Manager, une seule activation), 20 connexions par mot de passe parallèles sur un membre (5 comptées, S-102) ; messages d'erreur FR = AR.

4. FIN DE LOT
- Contrôle de fin de lot (D288, D328) AVANT le dernier commit : premier commit = table seule ; lecture adverse avant tout .md d'autorité ; rouges avant le code ; diff ⊆ table ; local = origin/main après push puis fetch.
- Six portes et e2e après la dernière modification, sur secteur, état machine relevé (pilote de R-10). Une porte rouge hors du lot : R-6 de D339. Ni certification ni marque.
- Compteur pour mémoire : TROIS → QUATRE. Toute écriture sur la base de développement de Ko : déclarée.
- Ordre des rangs : « RANG 44 : CLOS SUR LE CODE », puis « RANG 45 : EN ATTENTE DE CADRAGE DU RELECTEUR » (candidat proposé : L36-3a-2).
- Rubrique « Patrons ». Gestes de Ko : aucun écran dans ce lot ; dis-le.
- Rapport en français : fait, pas fait, écarts (une phrase chacun), décisions prises seul à ratifier (une phrase simple chacune DANS le rapport, avec ce qu'elle change pour Ko), au plus une question. Une session, un lot.
