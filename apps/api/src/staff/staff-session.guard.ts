// Le QUATRIÈME GARDE GLOBAL — rang 44, L36-3a-1 (D341, S-98, MP-7, MP-18, MP-20, MP-34, MP-35) ; rang 56 (D354, R-2, R-3, S-104, S-107) : l'ÉTAT du compte et la CAPACITÉ. CHEMIN D'IDENTITÉ : méthode RENFORCÉE, revue
// humaine requise.
//
// Il COMPLÈTE le Bearer, il ne l'authentifie pas : il s'exécute après `ThrottlerGuard`, `JwtAuthGuard` et `RolesGuard` (l'ordre d'enregistrement EST l'ordre d'exécution, D6), donc toute route qu'il voit est déjà
// authentifiée. FERMÉ PAR DÉFAUT : une route Pro neuve est couverte le jour où elle apparaît ; l'exemption (`@StaffExempt()`) est un choix écrit, et leur liste est fermée.
//
// ⛔ CE QUE CE GARDE NE FAIT PAS, ET QU'UN SPEC MESURE :
//   · il ne garde pas le drapeau de la couche : il le RELIT à chaque requête (MP-7) — la couche activée pendant qu'un Pro est connecté prend effet à la requête suivante, le jeton d'accès ne porte rien de nouveau ;
//   · il ne fait pas confiance au cookie pour dire la salle : la salle est celle du PROFIL du Bearer (MP-18) ;
//   · il ne dit pas POURQUOI il refuse : absent, mal formé, inconnu, terminé, inactif, plafonné, d'une autre salle, temporaire expiré — UN seul 401 (un 401 par cause serait un oracle) ; et UN seul 403 `STAFF_CAPABILITY_DENIED`
//     pour le rôle sans capacité comme pour le mot de passe à changer (S-242) ;
//   · il ne juge pas l'heure : l'état du compte se juge avec `now()` de la BASE, rendu avec la session (S-241, MP-41) ;
//   · il ne tombe jamais « ouvert » sur une panne : une exception de la base remonte (une panne n'est pas « couche éteinte »).
import { ForbiddenException, Inject, Injectable, UnauthorizedException, type CanActivate, type ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { STAFF_ERROR_MESSAGE_KEYS, StaffAccountState, StaffErrorCode, type StaffCapability } from "@zwadj/types";
import { IS_PUBLIC_KEY } from "../auth/auth.decorators";
import type { AuthenticatedUser } from "../auth/auth.types";
import { TokenService } from "../auth/token.service";
import { etatDuCompte } from "./staff-account-state";
import { accessVerdict } from "./staff-access-policy";
import { readSessionCookie } from "./staff-cookies";
import { STAFF_ANY_MEMBER_KEY, STAFF_CAPABILITY_KEY, STAFF_EXEMPT_KEY, type StaffContext } from "./staff-decorators";
import { guardVerdict } from "./staff-session-policy";
import { STAFF_STORE, type StaffGuardStore } from "./staff-store.types";

/** Ce que ce garde lit de la requête et ce qu'il y pose. */
interface StaffRequest {
  method?: string;
  user?: AuthenticatedUser;
  cookies?: Record<string, unknown>;
  staff?: StaffContext;
}

/** UNE seule réponse, pour toutes les causes. Un seul endroit la fabrique. */
const sessionRequise = (): UnauthorizedException =>
  new UnauthorizedException({ code: StaffErrorCode.STAFF_SESSION_REQUIRED, message: STAFF_ERROR_MESSAGE_KEYS.STAFF_SESSION_REQUIRED });

/** UN seul refus de capacité (S-242), pour toutes les causes : le rôle n'a pas la capacité, ou le mot de passe est à changer et la route n'est pas celle du changement. */
const capaciteRefusee = (): ForbiddenException =>
  new ForbiddenException({ code: StaffErrorCode.STAFF_CAPABILITY_DENIED, message: STAFF_ERROR_MESSAGE_KEYS.STAFF_CAPABILITY_DENIED });

@Injectable()
export class StaffSessionGuard implements CanActivate {
  // La formule du hachage d'un jeton est CELLE de `TokenService` (SHA-256 hexadécimal) : une seule, pas une copie. Le constructeur du garde est `(reflector, store)` — le contrat de son spec —, donc le service,
  // sans état, s'instancie ici plutôt que de s'injecter.
  private readonly tokens = new TokenService();

  constructor(
    private readonly reflector: Reflector,
    @Inject(STAFF_STORE) private readonly store: StaffGuardStore
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const cibles = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, cibles) === true) return true;

    const request = context.switchToHttp().getRequest<StaffRequest>();
    const user = request.user;
    const exempt = this.reflector.getAllAndOverride<boolean | undefined>(STAFF_EXEMPT_KEY, cibles) === true;

    // AVANT toute lecture : ce qui ne concerne pas le garde passe sans toucher à la base (pas d'identité, un CLIENT, un ADMIN — MP-34 —, une route exemptée). Le verdict est celui du module pur, drapeau
    // supposé allumé : « exiger une session » est la seule réponse qui oblige à lire le drapeau.
    if (user === undefined || guardVerdict({ role: user.role, exempt, layerEnabled: true }) === "pass") return true;

    // Le drapeau et la salle se RELISENT à chaque requête, depuis le profil du compte commun (MP-7, MP-18). Pas de profil : donnée incohérente, le garde n'invente pas un refus que l'API n'a jamais rendu.
    const layer = await this.store.readLayer(user.userId);
    if (layer === null) return true;
    if (guardVerdict({ role: user.role, exempt, layerEnabled: layer.enabledAt !== null }) === "pass") return true;

    const jeton = readSessionCookie(request.cookies);
    if (jeton === undefined) throw sessionRequise();

    // La session est PROLONGÉE par la requête qui la franchit (UN `UPDATE … RETURNING` côté magasin) ; sinon la cause qui s'écrit s'écrit, et la réponse reste la même.
    const touched = await this.store.touchSession({ tokenHash: this.tokens.hash(jeton), proProfileId: layer.proProfileId });
    if (!touched.ok) throw sessionRequise();

    // ⛔ L'ÉTAT puis la CAPACITÉ (R-2, R-3) : la règle de l'état est `etatDuCompte` (UNE copie, lue aussi par la connexion), jugée à l'heure de la BASE rendue avec la session ; la décision d'accès est le module pur
    // `accessVerdict`. Ce garde lit la requête (méthode, déclarations de la route) et applique — il ne décide rien lui-même.
    const session = touched.session;
    const state = etatDuCompte(session, session.now);
    const verdict = accessVerdict({
      state,
      role: session.role,
      method: request.method ?? "",
      capability: this.reflector.getAllAndOverride<StaffCapability | undefined>(STAFF_CAPABILITY_KEY, cibles),
      ownSession: this.reflector.getAllAndOverride<boolean | undefined>(STAFF_ANY_MEMBER_KEY, cibles) === true
    });
    if (verdict === "refuseSession") throw sessionRequise();
    if (verdict === "refuseCapability") throw capaciteRefusee();

    request.staff = {
      sessionId: session.sessionId,
      memberId: session.memberId,
      role: session.role,
      accountName: session.accountName,
      mustChangePassword: state === StaffAccountState.MUST_CHANGE_PASSWORD,
      proProfileId: layer.proProfileId
    };
    return true;
  }
}
