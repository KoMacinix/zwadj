// Le SERVICE de GESTION DU PERSONNEL — rang 56, L36-3a-2 (D354, K-19 à K-22). CHEMIN D'IDENTITÉ : méthode RENFORCÉE, revue humaine requise. Il ORCHESTRE : il génère le mot de passe temporaire, le hache, appelle le
// magasin, traduit les refus en erreurs MÉTIER. Ce qu'il DÉCIDE vit dans des modules purs (`staff-temporary-password.ts`, `staff-account-state.ts`, `staff-members-policy.ts` — appelé par le magasin, sous verrou) et
// dans SQL (`staff-store.prisma.ts`) — jamais ici.
//
// ⛔ CE QUE CE FICHIER TIENT :
//   · LE TEMPORAIRE EST GÉNÉRÉ, HACHÉ, RENDU UNE FOIS (R-5, MP-11) : le magasin ne reçoit que le HACHAGE (une garde de source l'interdit de nommer `temporaryPassword`), la réponse le porte une fois, rien ne le mémorise,
//     aucun appel de journal n'existe dans le module (garde de source). L'aléa vient du jeton cryptographique du `TokenService` (S-109 : pas de port `Random`) ; un tirage qui ne ferait pas un mot de passe VALABLE est
//     REFAIT, jamais raccourci.
//   · L'ACTEUR VIENT DU GARDE, JAMAIS DU CORPS : le Manager (audit, `created_by`), la salle du PROFIL du Bearer, le compte commun — tous trois lus dans le contexte que `StaffSessionGuard` a posé. Un identifiant de
//     membre venu de l'URL est cherché DANS cette salle : celui d'une autre salle est un « introuvable » indiscernable d'un identifiant inventé.
//   · UN REFUS MÉTIER N'EST JAMAIS UNE 500 : nom pris (409), membre introuvable (404), désactivé (409), dernier Manager (409).
//   · AUCUNE HORLOGE (MP-41) : l'état de chaque membre est jugé par `etatDuCompte` avec `now()` de la BASE, rendu par le magasin avec la ligne.
//   · AUCUN CONTRÔLE DE CAPACITÉ ICI (D78 : une seule autorité) : « Manager seul » est la déclaration `personnel` du contrôleur, lue par le garde global.
import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  STAFF_ERROR_MESSAGE_KEYS,
  StaffErrorCode,
  normalizeStaffAccountName,
  type StaffMemberCreateInput,
  type StaffMemberDisabledDTO,
  type StaffMemberListItemDTO,
  type StaffMembersListDTO,
  type StaffTemporaryPasswordDTO
} from "@zwadj/types";
import { PasswordService } from "../auth/password.service";
import { TokenService } from "../auth/token.service";
import { etatDuCompte } from "./staff-account-state";
import type { StaffContext } from "./staff-decorators";
import { temporaryPasswordFrom } from "./staff-temporary-password";
import { STAFF_STORE, type ManagementActor, type MemberListRow, type StaffActor, type StaffStore } from "./staff-store.types";

/** Le corps d'une erreur métier : le code ET la clé de message localisable (le catalogue FR = AR, MP-39). */
const corpsDErreur = (code: StaffErrorCode): { code: StaffErrorCode; message: string } => ({ code, message: STAFF_ERROR_MESSAGE_KEYS[code] });

const membreIntrouvable = (): NotFoundException => new NotFoundException(corpsDErreur(StaffErrorCode.STAFF_MEMBER_NOT_FOUND));

/** Combien de fois on re-tire des octets avant de renoncer. Un tirage de 32 octets aboutit presque toujours (mesuré : `staff-temporary-password.spec.ts`) ; huit échecs de suite sont hors de portée du hasard. */
const ESSAIS_DE_TIRAGE = 8;

/** Un membre, tel que les réponses le rendent : SIX champs, jamais un secret ; l'ÉTAT est le jugement de la règle, à l'heure de la base. */
function versLeDTO(ligne: MemberListRow): StaffMemberListItemDTO {
  return {
    id: ligne.id,
    accountName: ligne.accountName,
    role: ligne.role,
    state: etatDuCompte(ligne, ligne.now),
    lastLoginAt: ligne.lastLoginAt === null ? null : ligne.lastLoginAt.toISOString(),
    createdAt: ligne.createdAt.toISOString()
  };
}

/** Ce que le magasin exige de l'acteur : jamais un identifiant venu du corps de la requête. */
const acteurDe = (user: StaffActor, staff: StaffContext): ManagementActor => ({ actor: user, actorMemberId: staff.memberId, proProfileId: staff.proProfileId });

@Injectable()
export class StaffMembersService {
  constructor(
    @Inject(STAFF_STORE) private readonly store: Pick<StaffStore, "listMembers" | "createMember" | "resetMemberPassword" | "disableMember">,
    @Inject(PasswordService) private readonly passwords: Pick<PasswordService, "hash">,
    @Inject(TokenService) private readonly tokens: Pick<TokenService, "generate">
  ) {}

  // K-19 — les membres de LA salle du garde (jamais une salle venue de la requête).
  async list(staff: StaffContext): Promise<StaffMembersListDTO> {
    const lignes = await this.store.listMembers(staff.proProfileId);
    return { members: lignes.map(versLeDTO) };
  }

  // K-20 — le temporaire est généré, haché, et le magasin ne voit que le hachage. Le clair part dans la réponse, une fois.
  async create(user: StaffActor, staff: StaffContext, input: StaffMemberCreateInput): Promise<StaffTemporaryPasswordDTO> {
    const temporaire = this.tirerUnTemporaire();
    const passwordHash = await this.passwords.hash(temporaire);
    const cree = await this.store.createMember({
      ...acteurDe(user, staff),
      accountName: input.accountName,
      accountNameKey: normalizeStaffAccountName(input.accountName),
      role: input.role,
      passwordHash
    });
    if (!cree.ok) throw new ConflictException(corpsDErreur(StaffErrorCode.STAFF_ACCOUNT_NAME_TAKEN));
    return { member: versLeDTO(cree.member), temporaryPassword: temporaire, temporaryPasswordExpiresAt: cree.member.passwordExpiresAt.toISOString() };
  }

  // K-21 — un NOUVEAU temporaire : jamais le précédent (rien n'est mémorisé). Le magasin révoque TOUTES les sessions et TOUS les appareils du membre. Les comptes de révocations ne sont pas rendus (un écran n'en a
  // pas besoin, et c'est une information sur les postes d'autrui) : ils vont à l'audit.
  async resetPassword(user: StaffActor, staff: StaffContext, memberId: string): Promise<StaffTemporaryPasswordDTO> {
    const temporaire = this.tirerUnTemporaire();
    const passwordHash = await this.passwords.hash(temporaire);
    const reinitialise = await this.store.resetMemberPassword({ ...acteurDe(user, staff), memberId, passwordHash });
    if (!reinitialise.ok) {
      throw reinitialise.reason === "disabled" ? new ConflictException(corpsDErreur(StaffErrorCode.STAFF_MEMBER_DISABLED)) : membreIntrouvable();
    }
    return { member: versLeDTO(reinitialise.member), temporaryPassword: temporaire, temporaryPasswordExpiresAt: reinitialise.member.passwordExpiresAt.toISOString() };
  }

  // K-22 — « jamais zéro Manager » est décidé PAR LE MAGASIN, sous le verrou du profil (le comptage fait ici, hors verrou, serait une garde qui ment). Une désactivation répétée rend le membre désactivé sans rien écrire.
  async disable(user: StaffActor, staff: StaffContext, memberId: string): Promise<StaffMemberDisabledDTO> {
    const desactive = await this.store.disableMember({ ...acteurDe(user, staff), memberId });
    if (!desactive.ok) {
      throw desactive.reason === "lastManager" ? new ConflictException(corpsDErreur(StaffErrorCode.STAFF_LAST_MANAGER)) : membreIntrouvable();
    }
    return { member: versLeDTO(desactive.member) };
  }

  /** Un temporaire VALABLE : tiré des octets d'un jeton cryptographique, re-tiré tant que le module pur dit « pas assez » (jamais un mot de passe plus court, jamais un refusé par le contrat). */
  private tirerUnTemporaire(): string {
    for (let essai = 0; essai < ESSAIS_DE_TIRAGE; essai += 1) {
      const tire = temporaryPasswordFrom(new Uint8Array(Buffer.from(this.tokens.generate(), "base64url")));
      if (tire !== null) return tire;
    }
    throw new Error(`aucun tirage valable de mot de passe temporaire en ${ESSAIS_DE_TIRAGE} essais`);
  }
}
