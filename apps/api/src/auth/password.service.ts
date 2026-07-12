import { Injectable } from "@nestjs/common";
import * as argon2 from "argon2";

/**
 * Hachage des mots de passe — argon2id (décision AGENTS.md/backlog, pas bcrypt).
 * Paramètres = défauts de la lib (m=64 MiB, t=3, p=4), alignés sur les
 * recommandations OWASP actuelles ; ils sont encodés DANS le hash ($argon2id$…),
 * donc modifiables plus tard sans invalider l'existant.
 */
@Injectable()
export class PasswordService {
  hash(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id });
  }

  /** false sur mauvais mot de passe ET sur hash malformé — jamais d'exception. */
  async verify(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }
}
