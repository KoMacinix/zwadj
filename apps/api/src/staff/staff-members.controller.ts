// Le CONTRÔLEUR de GESTION DU PERSONNEL — rang 56, L36-3a-2 (D354, K-19 à K-22). CHEMIN D'IDENTITÉ : méthode RENFORCÉE, revue humaine requise. Il ne décide rien : il valide le corps (Zod) et l'identifiant (UUID),
// lit le contexte posé par le garde, appelle le service.
//
// ⛔ MANAGER SEUL : la classe porte `@RequiresStaffCapability("personnel")` — la ligne `personnel` de la table des capacités ne donne rien à un employé, pas même la lecture (R-2, MP-21, MP-32). Le refus est celui du
// garde global (403 `STAFF_CAPABILITY_DENIED`) ; ce contrôleur ne le redit pas (D78 : une seule autorité).
// ⛔ CE SONT DES ROUTES DE MEMBRE : elles agissent comme le Manager qui les appelle (l'audit, `created_by`, la salle). Sans contexte de personnel — la couche éteinte, ou une route que le garde n'a pas franchie —
// elles répondent le même 401 `STAFF_SESSION_REQUIRED` que la déconnexion et le changement de mot de passe : il n'y a personne qui agit.
// ⛔ LE TEMPORAIRE (K-20, K-21) : `Cache-Control: no-store` sur ces deux routes — le mot de passe est rendu UNE fois, aucun cache, aucun intermédiaire ne doit le garder (R-5). Une garde de source compte les deux en-têtes.
import { Body, Controller, Get, Header, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post, UnauthorizedException } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  STAFF_ERROR_MESSAGE_KEYS,
  StaffErrorCode,
  UserRole,
  staffMemberCreateSchema,
  type StaffMemberCreateInput,
  type StaffMemberDisabledDTO,
  type StaffMembersListDTO,
  type StaffTemporaryPasswordDTO
} from "@zwadj/types";
import { CurrentUser, Roles } from "../auth/auth.decorators";
import type { AuthenticatedUser } from "../auth/auth.types";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { CurrentStaff, RequiresStaffCapability, type StaffContext } from "./staff-decorators";
import { StaffMembersService } from "./staff-members.service";
import type { StaffActor } from "./staff-store.types";

/** Le compte commun qui agit. ⚠ Le rôle est LITTÉRALEMENT « PRO » parce que `@Roles(PRO)` de la classe l'a déjà garanti : une seule autorité sur la question (D78). */
const acteur = (user: AuthenticatedUser): StaffActor => ({ userId: user.userId, role: "PRO" });

/** Une route de membre exige le contexte que le garde pose. Absent (couche éteinte, ou route non franchie) : le même 401 que le garde. */
function exiger(staff: StaffContext | undefined): StaffContext {
  if (staff === undefined) {
    throw new UnauthorizedException({ code: StaffErrorCode.STAFF_SESSION_REQUIRED, message: STAFF_ERROR_MESSAGE_KEYS.STAFF_SESSION_REQUIRED });
  }
  return staff;
}

@ApiTags("pro-staff")
@ApiBearerAuth()
@Roles(UserRole.PRO)
@RequiresStaffCapability("personnel")
@Controller("pro/staff/members")
export class StaffMembersController {
  constructor(private readonly service: StaffMembersService) {}

  // K-19 — 200 : les membres de la salle, leur ÉTAT, aucun secret.
  @Get()
  @ApiOperation({ summary: "Liste les membres du personnel de la salle (Manager seul) : nom de compte, rôle, état, dernière connexion" })
  @ApiOkResponse({ description: "{ members: [{ id, accountName, role, state, lastLoginAt, createdAt }] }" })
  list(@CurrentStaff() staff: StaffContext | undefined): Promise<StaffMembersListDTO> {
    return this.service.list(exiger(staff));
  }

  // K-20 — 201 : le membre et son mot de passe temporaire, RENDU UNE FOIS (`no-store`).
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "Crée un membre (Manager seul) : le mot de passe temporaire est généré par le serveur et rendu UNE fois" })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentStaff() staff: StaffContext | undefined,
    @Body(new ZodValidationPipe(staffMemberCreateSchema)) body: StaffMemberCreateInput
  ): Promise<StaffTemporaryPasswordDTO> {
    return this.service.create(acteur(user), exiger(staff), body);
  }

  // K-21 — 200 : un NOUVEAU temporaire ; toutes les sessions et tous les appareils du membre sont révoqués.
  @Post(":id/reset-password")
  @HttpCode(HttpStatus.OK)
  @Header("Cache-Control", "no-store")
  @ApiOperation({ summary: "Réinitialise le mot de passe d'un membre (Manager seul) : nouveau temporaire rendu UNE fois, sessions et appareils révoqués" })
  resetPassword(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentStaff() staff: StaffContext | undefined,
    @Param("id", new ParseUUIDPipe()) id: string
  ): Promise<StaffTemporaryPasswordDTO> {
    return this.service.resetPassword(acteur(user), exiger(staff), id);
  }

  // K-22 — 200 : le membre désactivé, ses sessions terminées. 409 si c'était le dernier Manager actif.
  @Post(":id/disable")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Désactive un membre (Manager seul) : jamais le dernier Manager actif" })
  disable(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentStaff() staff: StaffContext | undefined,
    @Param("id", new ParseUUIDPipe()) id: string
  ): Promise<StaffMemberDisabledDTO> {
    return this.service.disable(acteur(user), exiger(staff), id);
  }
}
