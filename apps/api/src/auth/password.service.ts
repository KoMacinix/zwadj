import { randomBytes } from "node:crypto";
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

  /**
   * Vérification FACTICE anti-timing (D5) : quand l'email n'existe pas, le
   * login paie quand même le coût d'un argon2.verify complet — sinon la
   * différence de latence (~100 ms vs ~0 ms) trahirait l'existence du compte
   * malgré un corps de réponse identique.
   * Le hash factice est calculé au premier usage (préimage = 32 octets CSPRNG
   * aussitôt oubliés : la comparaison est structurellement toujours fausse)
   * puis mémoïsé — un seul hash payé par vie du process.
   */
  async verifyAgainstDummy(plain: string): Promise<false> {
    this.dummyHash ??= argon2.hash(randomBytes(32).toString("base64url"), { type: argon2.argon2id });
    await this.verify(await this.dummyHash, plain);
    return false;
  }

  private dummyHash?: Promise<string>;
}
