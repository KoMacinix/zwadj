-- D116 — Fenêtre de grâce à la rotation du refresh token.
--
-- POURQUOI UNE COLONNE, ET PAS UNE LECTURE DE `revoked_at`.
-- `revoked_at` est posée par TROIS gestes qui n'ont rien à voir :
--   1. la rotation (D9) — le token a été légitimement consommé ;
--   2. la déconnexion (D11) — l'utilisateur a demandé que ça s'arrête ;
--   3. la révocation en masse (D10, suspension) — on répond à un vol.
-- Seul (1) mérite une grâce. Accorder 30 secondes de sursis à (2) ou (3)
-- serait un tout autre comportement, et un vrai trou : une déconnexion doit
-- tuer le token à l'instant même. La colonne EST la distinction.
ALTER TABLE "refresh_tokens" ADD COLUMN "rotated_at" TIMESTAMPTZ(6);

-- AUCUNE REPRISE DE DONNÉES, volontairement. Les lignes déjà révoquées gardent
-- `rotated_at = NULL` et restent donc traitées en réutilisation stricte. On ne
-- peut pas savoir après coup si elles ont été révoquées par rotation ou par
-- déconnexion ; le choix conservateur est de ne rien supposer. Elles sont de
-- toute façon toutes antérieures de bien plus de 30 secondes.

-- Index partiel : la grâce ne se lit QUE sur des lignes rotées, et la fenêtre
-- est courte. Sans lui, le `findUnique` par hash suffit déjà (il porte l'unique
-- sur `token_hash`) — cet index sert la SUPERVISION, pas le chemin chaud :
-- compter les rotations concurrentes récentes est la métrique qui dira si 30 s
-- est le bon réglage.
CREATE INDEX "refresh_tokens_rotated_at_idx" ON "refresh_tokens"("rotated_at") WHERE "rotated_at" IS NOT NULL;
