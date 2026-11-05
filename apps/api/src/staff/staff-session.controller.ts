// Le CONTRÔLEUR de la couche du personnel — rang 44, L36-3a-1 (D341, K-14 à K-18). CHEMIN D'IDENTITÉ : méthode RENFORCÉE, revue humaine requise. Il ne décide rien : il valide le corps (Zod), lit les cookies, appelle
// le service, POSE les cookies avec les attributs de `staff-cookies.ts`.
//
// ⛔ Toutes ces routes sont sous `@Roles(PRO)` ET derrière le Bearer (`JwtAuthGuard`) : un CLIENT ou un ADMIN n'en atteint aucune, un anonyme non plus. Trois d'entre elles — l'activation, la connexion, l'état —
// portent `@StaffExempt()` : elles servent à OUVRIR une session ou à lire l'état, elles ne peuvent pas en exiger une. La déconnexion et le changement de mot de passe, eux, sont ceux d'un MEMBRE : sans session de
// personnel, 401 — y compris quand la couche est éteinte (il n'y a alors personne à déconnecter).
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import {
  STAFF_ERROR_MESSAGE_KEYS,
  StaffErrorCode,
  UserRole,
  staffActivateSchema,
  staffLoginSchema,
  staffPasswordChangeSchema,
  type StaffActivateInput,
  type StaffActivationDTO,
  type StaffLoginDTO,
  type StaffLoginInput,
  type StaffLogoutDTO,
  type StaffPasswordChangeDTO,
  type StaffPasswordChangeInput,
  type StaffSessionStateDTO
} from "@zwadj/types";
import type { Request, Response } from "express";
import { CurrentUser, Roles } from "../auth/auth.decorators";
import { AUTH_THROTTLE } from "../auth/auth.throttle";
import type { AuthenticatedUser } from "../auth/auth.types";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import {
  STAFF_SESSION_COOKIE,
  readDeviceCookies,
  readSessionCookie,
  staffDeviceCookieName,
  staffDeviceCookieOptions,
  staffSessionCookieOptions
} from "./staff-cookies";
import { CurrentStaff, StaffExempt, type StaffContext } from "./staff-decorators";
import { StaffSessionService, type StaffCookiesIn, type StaffCookiesOut } from "./staff-session.service";
import type { StaffActor } from "./staff-store.types";

/** Le compte commun qui agit. ⚠ Le rôle est LITTÉRALEMENT « PRO » parce que `@Roles(PRO)` de la classe l'a déjà garanti : une seule autorité sur la question (D78), pas une seconde vérification ici. */
const acteur = (user: AuthenticatedUser): StaffActor => ({ userId: user.userId, role: "PRO" });

@ApiTags("pro-staff")
@ApiBearerAuth()
@Roles(UserRole.PRO)
@Controller("pro/staff")
export class StaffSessionController {
  constructor(
    private readonly service: StaffSessionService,
    private readonly config: ConfigService
  ) {}

  // K-14 — 201 : le Manager est créé, sa session et son appareil sont ouverts, leurs cookies posés.
  @StaffExempt()
  @Post("activate")
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: AUTH_THROTTLE.staffActivate })
  @ApiOperation({ summary: "Active la couche du personnel : crée le Manager de la salle et ouvre sa session (cookie zwadj_ss) et son appareil (cookie zwadj_dv_*)" })
  async activate(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(staffActivateSchema)) body: StaffActivateInput,
    @Res({ passthrough: true }) res: Response
  ): Promise<StaffActivationDTO> {
    const reply = await this.service.activate(acteur(user), body);
    this.poser(res, reply.cookies);
    return reply.body;
  }

  // K-15 — 200 : nom de compte et mot de passe. TOUS les refus sont le même 401 `STAFF_INVALID_CREDENTIALS` (R-3 (D341)).
  @StaffExempt()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: AUTH_THROTTLE.staffLogin })
  @ApiOperation({ summary: "Ouvre une session de personnel (nom de compte et mot de passe) — refus indistincts" })
  async login(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(staffLoginSchema)) body: StaffLoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ): Promise<StaffLoginDTO> {
    const reply = await this.service.login(acteur(user), body, this.cookiesDe(req));
    this.poser(res, reply.cookies);
    return reply.body;
  }

  // K-17 — 200, TOUJOURS : l'état n'est jamais un refus, et il ne prolonge rien.
  @StaffExempt()
  @Get("session")
  @ApiOperation({ summary: "État de la couche pour ce compte commun et ce poste (jamais un refus, ne prolonge pas la session)" })
  @ApiOkResponse({ description: "{ enabled, member, knownMembers }" })
  state(@CurrentUser() user: AuthenticatedUser, @Req() req: Request): Promise<StaffSessionStateDTO> {
    return this.service.state(acteur(user), this.cookiesDe(req));
  }

  // K-16 — 200 : termine la session COURANTE et efface son cookie. L'appareil reste.
  @Post("logout")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Termine la session de personnel courante et efface son cookie" })
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentStaff() staff: StaffContext | undefined,
    @Res({ passthrough: true }) res: Response
  ): Promise<StaffLogoutDTO> {
    const reply = await this.service.logout(acteur(user), this.exiger(staff));
    this.poser(res, reply.cookies);
    return reply.body;
  }

  // K-18 — 200 : le membre change SON mot de passe ; ses AUTRES sessions prennent fin, la courante et l'appareil restent.
  @Post("password")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: AUTH_THROTTLE.changePassword })
  @ApiOperation({ summary: "Change le mot de passe du membre connecté (met fin à ses autres sessions)" })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @CurrentStaff() staff: StaffContext | undefined,
    @Body(new ZodValidationPipe(staffPasswordChangeSchema)) body: StaffPasswordChangeInput,
    @Res({ passthrough: true }) res: Response
  ): Promise<StaffPasswordChangeDTO> {
    const reply = await this.service.changePassword(acteur(user), this.exiger(staff), body);
    this.poser(res, reply.cookies);
    return reply.body;
  }

  /** Une route de MEMBRE exige le contexte que le garde pose. Absent (couche éteinte, ou route exemptée) : le même 401 que le garde. */
  private exiger(staff: StaffContext | undefined): StaffContext {
    if (staff === undefined) {
      throw new UnauthorizedException({ code: StaffErrorCode.STAFF_SESSION_REQUIRED, message: STAFF_ERROR_MESSAGE_KEYS.STAFF_SESSION_REQUIRED });
    }
    return staff;
  }

  private cookiesDe(req: Request): StaffCookiesIn {
    const cookies = req.cookies as Record<string, unknown> | undefined;
    return { session: readSessionCookie(cookies), devices: readDeviceCookies(cookies) };
  }

  /** `Secure` vient du levier EXISTANT (`AUTH_COOKIE_SECURE`) : aucun second. L'effacement reprend les attributs de la pose (Express apparie par nom et chemin). */
  private poser(res: Response, cookies: StaffCookiesOut): void {
    const secure = this.config.getOrThrow<boolean>("AUTH_COOKIE_SECURE");
    if (cookies.session === null) res.clearCookie(STAFF_SESSION_COOKIE, staffSessionCookieOptions(secure));
    else if (cookies.session !== undefined) res.cookie(STAFF_SESSION_COOKIE, cookies.session, staffSessionCookieOptions(secure));
    if (cookies.device !== undefined) res.cookie(staffDeviceCookieName(cookies.device.suffix), cookies.device.token, staffDeviceCookieOptions(secure));
  }
}
