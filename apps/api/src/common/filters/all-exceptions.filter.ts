import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, NotFoundException } from "@nestjs/common";
import type { Request, Response } from "express";

/** Code rendu quand AUCUNE route ne correspond — point B, volet API.
 *
 *  ⚠ POURQUOI IL FALLAIT LE NOMMER. Nest lève une `NotFoundException` nue sur
 *  une route inconnue : elle traversait ce filtre en `message: "Cannot GET
 *  /api/v1/salles"` — une PHRASE ANGLAISE, à la place du `{ code, message }`
 *  que porte toute erreur métier du dépôt. Un appelant qui lit `message.code`
 *  (c'est ce que fait `packages/api-client`) trouvait `undefined` et repliait
 *  sur « UNKNOWN » : une faute de frappe d'URL et une panne serveur se
 *  ressemblaient. La forme unique vaut mieux que l'exception. */
export const ROUTE_NOT_FOUND = "ROUTE_NOT_FOUND";

/**
 * Filtre d'exceptions global : réponse d'erreur normalisée
 * { statusCode, message, path, timestamp } — jamais de stack en sortie.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(status).json({
      statusCode: status,
      message: this.bodyOf(exception),
      path: request.url,
      timestamp: new Date().toISOString()
    });
  }

  private bodyOf(exception: unknown): unknown {
    if (!(exception instanceof HttpException)) return "Internal server error";

    const body = exception.getResponse();
    // ⚠ On ne réécrit QUE le 404 de ROUTAGE. Un 404 MÉTIER porte déjà son code
    // (`VENUE_NOT_FOUND`, `BOOKING_NOT_FOUND`…) : le toucher écraserait un
    // contrat que les deux fronts consomment.
    //
    // ⚠ LE MARQUEUR EST L'ABSENCE DE `code`, PAS UN CORPS-CHAÎNE. Première
    // version écrite : `typeof body === "string"` — elle n'a JAMAIS pu se
    // déclencher. Formes MESURÉES, pas supposées :
    //   `new NotFoundException("Cannot GET /x").getResponse()`
    //     → { message: "Cannot GET /x", error: "Not Found", statusCode: 404 }
    //   `new NotFoundException({ code, message }).getResponse()`
    //     → { code, message }
    // Nest ENVELOPPE la chaîne dans un objet. Ce qui distingue vraiment les
    // deux, c'est que seule l'erreur métier porte un `code`.
    if (exception instanceof NotFoundException && !carriesCode(body)) {
      return { code: ROUTE_NOT_FOUND, message: "common.errors.routeNotFound" };
    }
    return body;
  }
}

/** Le corps porte-t-il un code métier ? Seul un appel explicite
 *  `new HttpException({ code, … })` en produit un — jamais l'enveloppe
 *  automatique de Nest. */
function carriesCode(body: unknown): boolean {
  return typeof body === "object" && body !== null && typeof (body as { code?: unknown }).code === "string";
}
