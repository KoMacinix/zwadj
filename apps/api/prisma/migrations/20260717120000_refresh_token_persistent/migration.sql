-- Lot 7 (D27) : « Se souvenir de moi » — mode de persistance du cookie refresh.
-- true (défaut, comportement historique) = cookie persistant 30 j ;
-- false = cookie de session. Copié à chaque rotation.
ALTER TABLE "refresh_tokens" ADD COLUMN "persistent" BOOLEAN NOT NULL DEFAULT true;
