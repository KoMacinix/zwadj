# D341 — carte des modes de défaillance du lot L36-3a-1 (MP-1 à MP-44 du cadrage de D340, § 4) → tests → cibles de `neutralize-r44.py`

Pièce DÉRIVÉE par un script qui lit les fichiers (aucun test, aucune cible n'est recopié à la main) : `generer-carte.py` (archivé avec la section D341 ; calibré à deux bras). **Un mode absent du § 4 ne s'y trouve pas** (D126). Les colonnes « tests » et « cibles » comptent les MENTIONS du numéro de mode dans les fichiers de test et les libellés de cible ; une mention n'est pas une preuve — la preuve est la morsure de la cible (journaux de la campagne), jamais cette carte.

| mode | ce qu'il redoute (cadrage) | lot | tests qui le nomment (mentions) | cibles r44 | lecture |
|---|---|---|---|---|---|
| MP-1 | 20 essais de PIN parallèles = **exactement 3 comptés** | P | — | — | hors lot (lot P) |
| MP-2 | un PIN sans jeton d'appareil | P | — | — | hors lot (lot P) |
| MP-3 | le jeton d'appareil d'un **autre membre** / d'**une autre salle** | 1 (salle) · P (membre) | `src/staff\staff-session-policy.spec.ts` ×2, `src/staff\staff-session.service.spec.ts` ×1, `src/staff\staff-store.prisma.spec.ts` ×1, `test/int\staff-login.int-spec.ts` ×6 | P-13, P-14, S-9, S-11, A-32, A-63, A-64, A-65 | hors lot (lot 1 (salle) · P (membre)) — nommé tout de même par un test |
| MP-4 | la session d'un membre **désactivé** | 1 · 2 | `src/staff\staff-session-policy.spec.ts` ×2, `src/staff\staff-store.prisma.spec.ts` ×2, `test/int\staff-login.int-spec.ts` ×2, `test/int\staff-session-guard.int-spec.ts` ×1 | S-4, A-16, A-39, A-44, A-66 | dans le lot · testé · neutralisé |
| MP-5 | un changement de mot de passe qui ne mettrait pas fin aux sessions | 1 | `src/staff\staff-session.service.spec.ts` ×1, `src/staff\staff-store.prisma.spec.ts` ×1, `test/int\staff-password.int-spec.ts` ×3 | S-23, A-55, A-56 | dans le lot · testé · neutralisé |
| MP-6 | **deux Managers se désactivent l'un l'autre en même temps** | 2 | — | — | hors lot (lot 2) |
| MP-7 | la couche **activée pendant qu'un Pro est connecté** | 1 | `src/staff\staff-session.guard.spec.ts` ×3, `test/int\staff-session-guard.int-spec.ts` ×2 | G-6, A-2 | dans le lot · testé · neutralisé |
| MP-8 | compte inconnu / mauvais mot de passe : **même réponse, même coût** | 1 | `src/staff\staff-session-policy.spec.ts` ×2, `src/staff\staff-session.service.spec.ts` ×4, `test/int\staff-login.int-spec.ts` ×3 | S-5, S-6 | dans le lot · testé · neutralisé |
| MP-9 | nom de compte **normalisé** (casse, diacritiques, variantes de lettres arabes) et **unique par salle** | 1 | `src/common\staff-account-name.spec.ts` ×2 | S-2, S-3 | dans le lot · testé · neutralisé |
| MP-10 | PIN trivial refusé | P | — | — | hors lot (lot P) |
| MP-11 | PIN / mot de passe / jeton **jamais en clair** hors de son unique affichage | 1 · 2 · P | `src/staff\staff-source-guards.spec.ts` ×2, `src/staff\staff-store.prisma.spec.ts` ×1, `test/int\log-capture.ts` ×1, `test/int\log-set-cookie.int-spec.ts` ×1, `test/int\staff-activation.int-spec.ts` ×2, `test/int\staff-login.int-spec.ts` ×2 | G-9, S-34, M-2, M-3 | dans le lot · testé · neutralisé |
| MP-12 | secret HMAC **absent en production** : démarrage refusé | P | — | — | hors lot (lot P) |
| MP-13 | inactivité 10 min **côté serveur**, plafond 12 h | 1 | `src/staff\staff-session-policy.spec.ts` ×3, `src/staff\staff-store.prisma.spec.ts` ×3, `test/int\staff-login.int-spec.ts` ×2 | A-37, A-41, A-42, A-45, A-46 | dans le lot · testé · neutralisé |
| MP-14 | mot de passe temporaire : 7 jours, changement obligatoire | 2 | — | — | hors lot (lot 2) |
| MP-15 | verrouillage au 3ᵉ échec ; déblocage **par nom de compte + mot de passe seulement**, avec un **nouveau PIN** | P | — | — | hors lot (lot P) |
| MP-16 | 5 échecs de mot de passe = **pause de 15 min, jamais définitive** | 1 | `src/staff\staff-session.service.spec.ts` ×1, `src/staff\staff-store.prisma.spec.ts` ×1, `test/int\staff-login.int-spec.ts` ×2 | A-15, A-17, A-18 | dans le lot · testé · neutralisé |
| MP-17 | **20 mauvais mots de passe parallèles ne déclenchent pas 20 `argon2`** (coût : 64 Mio chacun) | 1 | `src/staff\staff-session-policy.spec.ts` ×2, `src/staff\staff-session.service.spec.ts` ×1, `src/staff\staff-store.prisma.spec.ts` ×1, `test/int\staff-login.int-spec.ts` ×3 | P-11, A-15 | dans le lot · testé · neutralisé |
| MP-18 | **cross-salle** : la session du membre de la salle A présentée avec le Bearer de la salle B | 1 | `src/staff\staff-session-policy.spec.ts` ×2, `src/staff\staff-session.guard.spec.ts` ×2, `src/staff\staff-store.prisma.spec.ts` ×2, `test/int\staff-login.int-spec.ts` ×1, `test/int\staff-session-guard.int-spec.ts` ×3 | G-10, A-14, A-30, A-38, A-43 | dans le lot · testé · neutralisé |
| MP-19 | **jeton rejoué** après `logout`, après fin `DISABLED`, après réinitialisation | 1 · 2 | `src/staff\staff-session-policy.spec.ts` ×2, `src/staff\staff-store.prisma.spec.ts` ×1, `test/int\staff-login.int-spec.ts` ×3, `test/int\staff-password.int-spec.ts` ×2, `test/int\staff-session-guard.int-spec.ts` ×2 | A-40 | dans le lot · testé · neutralisé |
| MP-20 | **route Pro neuve oubliée** de la liste des exemptions | 1 | `src/staff\staff-session-policy.spec.ts` ×2, `src/staff\staff-session.guard.spec.ts` ×1, `test/int\staff-session-guard.int-spec.ts` ×3 | L-4, L-5, L-6, L-7, L-17 | dans le lot · testé · neutralisé |
| MP-21 | **EMPLOYEE écrit** sur salle / prix / prestations / personnel / compte commun | 2 | — | — | hors lot (lot 2) |
| MP-22 | **activation concurrente ×2** | 1 | `src/staff\staff-store.prisma.spec.ts` ×1, `test/int\staff-activation.int-spec.ts` ×2 | A-4, A-5 | dans le lot · testé · neutralisé |
| MP-23 | activation **sans e-mail vérifié** ou par un non-propriétaire | 1 | `src/staff\staff-store.prisma.spec.ts` ×1, `test/int\staff-activation.int-spec.ts` ×2 | S-30, A-3 | dans le lot · testé · neutralisé |
| MP-24 | mot de passe **courant** ou **réutilisé** | 1 | `src/staff\staff-password-policy.spec.ts` ×3, `src/staff\staff-session.service.spec.ts` ×3, `test/int\staff-activation.int-spec.ts` ×1, `test/int\staff-password.int-spec.ts` ×4 | S-1, S-17, S-21 | dans le lot · testé · neutralisé |
| MP-25 | mot de passe **expiré** (90 j) | 2 | — | — | hors lot (lot 2) |
| MP-26 | PIN **expiré** (90 j) | P | — | — | hors lot (lot P) |
| MP-27 | appareil **expiré ou révoqué** | P | — | — | hors lot (lot P) |
| MP-28 | **cookies d'appareil en excès** (plus de 8) | P | `src/staff\staff-cookies.spec.ts` ×1 | K-11, T-5 | hors lot (lot P) — nommé tout de même par un test |
| MP-29 | **réinitialisation** par le Manager | 2 | — | — | hors lot (lot 2) |
| MP-30 | **désactivation** | 2 | — | — | hors lot (lot 2) |
| MP-31 | un **Manager se désactive lui-même** | 2 | — | — | hors lot (lot 2) |
| MP-32 | un **EMPLOYEE** crée / réinitialise / désactive | 2 | — | — | hors lot (lot 2) |
| MP-33 | **audit** : une ligne par action de personnel, `actor_member_id` renseigné, **aucune donnée secrète** | 1 · 2 · P | `src/staff\staff-source-guards.spec.ts` ×2, `src/staff\staff-store.prisma.spec.ts` ×4, `test/int\staff-activation.int-spec.ts` ×1 | A-26, A-59, A-67, A-68, A-69 | dans le lot · testé · neutralisé |
| MP-34 | **ADMIN et CLIENT** jamais concernés | 1 | `src/staff\staff-session-policy.spec.ts` ×2, `src/staff\staff-session.guard.spec.ts` ×3, `test/int\staff-activation.int-spec.ts` ×1, `test/int\staff-session-guard.int-spec.ts` ×2 | G-3, L-8 | dans le lot · testé · neutralisé |
| MP-35 | **avant toute activation, rien ne change** | 1 | `src/staff\staff-session-policy.spec.ts` ×2, `src/staff\staff-session.guard.spec.ts` ×2, `test/int\staff-activation.int-spec.ts` ×1, `test/int\staff-session-guard.int-spec.ts` ×2 | G-5, M-19 | dans le lot · testé · neutralisé |
| MP-36 | **débit** des routes neuves | 1 · P | `test/int/throttle.int-spec.ts` ×5 | L-12, L-13, L-14, L-15 | dans le lot · testé · neutralisé |
| MP-37 | **cookies** : attributs, noms, `Path` | 1 | `src/staff\staff-cookies.spec.ts` ×3, `src/staff\staff-source-guards.spec.ts` ×1, `test/int\staff-activation.int-spec.ts` ×2 | L-21 | dans le lot · testé · neutralisé |
| MP-38 | **migration sur base non vide** | 1 | `test/int/migration-non-empty.int-spec.ts` ×1 | M-19 | dans le lot · testé · neutralisé |
| MP-39 | **parité FR = AR** de tous les messages d'erreur | 1 · 2 · P | `src/common\staff-contract.spec.ts` ×2 | T-8, T-9 | dans le lot · testé · neutralisé |
| MP-40 | **un seul `Manager` à l'activation** et il est actif | 1 | `test/int\staff-activation.int-spec.ts` ×2 | A-7, A-10 | dans le lot · testé · neutralisé |
| MP-41 | **dérive de l'horloge** entre l'API et la base | 1 · 2 · P | `src/staff\staff-source-guards.spec.ts` ×2, `src/staff\staff-store.prisma.spec.ts` ×1, `test/int\staff-helpers.ts` ×1 | S-33 | dans le lot · testé · neutralisé |
| MP-42 | **la tranche est exécutée par `prisma migrate dev`** par erreur | 1 | — | — | dans le lot · **AUCUN TEST NE LE NOMME** · **AUCUNE CIBLE NE LE NOMME** |
| MP-43 | **un seul levier de la durée d'inactivité** | 1 · 2 · P | `src/common\staff-contract.spec.ts` ×2, `src/staff\staff-source-guards.spec.ts` ×2, `src/staff\staff-store.prisma.spec.ts` ×6 | K-18, A-11, A-12, A-13, A-20, A-35, A-36, A-58, T-1, T-2, T-3, T-4 | dans le lot · testé · neutralisé |
| MP-44 | **recours si un Manager perd son mot de passe et qu'il n'y en a pas d'autre** | hors | — | — | hors lot (lot hors) |

**Parcouru** : 44 modes lus dans le § 4 (attendu 44) · 20 fichiers de test · 236 cibles ; **dans le lot** : 26 · sans test qui les nomme : 1 · sans cible qui les nomme : 1.

**MP-42 n'a ni test ni cible, et c'est dit** : c'est un geste INTERDIT (`prisma migrate dev`), pas un comportement du code ; il est tenu par une PIÈCE — la sonde de dérive de D334 rejouée sans modification, `derive-prisma.txt` — et par l'interdit écrit dans `AGENTS.md`. Aucun test ne peut empêcher une commande qu'un humain tape.
