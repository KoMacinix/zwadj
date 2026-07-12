import { createHash, randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";

/**
 * Tokens opaques (vérification email, reset, refresh — D2/schéma) :
 * 256 bits d'aléa CSPRNG, encodés base64url (43 caractères, sûrs en URL).
 * En base : UNIQUEMENT le SHA-256 hex du token (colonnes tokenHash du schéma) —
 * une fuite de la table ne permet pas de rejouer les tokens.
 * SHA-256 simple (pas argon2) : l'entrée a déjà 256 bits d'entropie,
 * le hachage lent n'apporte rien ici.
 */
@Injectable()
export class TokenService {
  generate(): string {
    return randomBytes(32).toString("base64url");
  }

  hash(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
