import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { OAuth2Client } from "google-auth-library";
import {
  GoogleAuthDisabledError,
  GoogleTokenInvalidError,
  type GoogleIdTokenPayload,
  type GoogleTokenVerifier
} from "./google.types";

/**
 * Adapter réel du port GOOGLE_TOKEN_VERIFIER (Lot 8) — `google-auth-library`.
 * verifyIdToken vérifie signature (certificats Google, mis en cache par la
 * lib), émetteur, expiration ET audience = GOOGLE_CLIENT_ID : un ID token
 * émis pour une AUTRE application est rejeté même s'il est authentique.
 * Flux GIS « ID token direct » (cadrage OAuth) : aucun secret client, aucun
 * échange de code — ce fichier est le SEUL point de contact avec Google.
 */
@Injectable()
export class GoogleAuthLibraryVerifier implements GoogleTokenVerifier {
  /** Construit paresseusement : l'API doit booter sans GOOGLE_CLIENT_ID (dev). */
  private client?: OAuth2Client;

  constructor(private readonly config: ConfigService) {}

  async verify(idToken: string): Promise<GoogleIdTokenPayload> {
    const clientId = this.config.get<string>("GOOGLE_CLIENT_ID");
    if (!clientId) throw new GoogleAuthDisabledError();
    this.client ??= new OAuth2Client(clientId);

    let payload;
    try {
      const ticket = await this.client.verifyIdToken({ idToken, audience: clientId });
      payload = ticket.getPayload();
    } catch {
      // Signature/audience/expiration/forme : indistincts (pas d'oracle) — le
      // détail éventuel de la lib n'atteint jamais la réponse HTTP.
      throw new GoogleTokenInvalidError();
    }

    // Claims ESSENTIELS : sans `sub` (identité) ou `email` (ancre de la
    // matrice de connexion), le token est inexploitable → même rejet générique.
    if (!payload?.sub || !payload.email) throw new GoogleTokenInvalidError();

    return {
      sub: payload.sub,
      // Normalisation ALIGNÉE sur emailSchema (.trim().toLowerCase()) : la
      // recherche findUnique(email) doit matcher la colonne, insensible à la
      // casse que Google renverrait.
      email: payload.email.trim().toLowerCase(),
      // `=== true` : undefined (claim absent) compte comme NON vérifié.
      emailVerified: payload.email_verified === true,
      givenName: payload.given_name ?? null,
      familyName: payload.family_name ?? null
    };
  }
}
