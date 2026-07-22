// Lot A4 — endpoints PRO des médias d'une salle. Topologie : écritures sur
// /venues/:id/... (même famille que POST/PATCH/DELETE /venues d'A2) ; les
// lectures passent par les trois surfaces enrichies (GET /pro/venues/:id,
// GET /venues, GET /venues/:slug) — aucun GET média dédié.
// @Roles(PRO) au niveau classe ; ownership + 404 indistincts : dans les
// services. Uploads : multipart champ « file », stockage MÉMOIRE Multer
// (défaut — le pipeline sharp consomme un Buffer, rien ne touche le disque
// avant ré-encodage), borne fileSize par TYPE d'image.
//
// ⚠️ ORDRE DES ROUTES : PATCH venues/:id/photos/order est déclaré AVANT
// PATCH venues/:id/photos/:photoId — Express matche dans l'ordre de
// déclaration, sinon « order » serait capturé comme un :photoId (→ 404
// PHOTO_NOT_FOUND systématique). Un test d'intégration le verrouille.
import {
  ArgumentsHost,
  BadRequestException,
  Body,
  Catch,
  Controller,
  Delete,
  ExceptionFilter,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  PayloadTooLargeException,
  Post,
  UploadedFile,
  UseFilters,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiConsumes,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags
} from "@nestjs/swagger";
import type { Response } from "express";
import {
  MediaErrorCode,
  UserRole,
  VENUE_PHOTO_360_LIMITS,
  VENUE_PHOTO_LIMITS,
  venue360LinkCreateSchema,
  venuePhotoAltUpdateSchema,
  venuePhotoOrderSchema,
  type Venue360LinkCreateInput,
  type VenuePhoto360LinkDTO,
  type VenuePhoto360SceneDTO,
  type VenuePhotoAltUpdateInput,
  type VenuePhotoDTO,
  type VenuePhotoOrderInput
} from "@zwadj/types";
import { CurrentUser, Roles } from "../auth/auth.decorators";
import type { AuthenticatedUser } from "../auth/auth.types";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { VenueMediaService } from "./venue-media.service";

/** Le strict nécessaire du fichier Multer (stockage mémoire) — évite la
 *  dépendance @types/multer pour un seul champ consommé. */
interface UploadedImageFile {
  buffer: Buffer;
}

/**
 * Multer coupe le flux à `fileSize` et Nest le traduit en 413 — on le ramène
 * au contrat du domaine : 400 { code: MEDIA_TOO_LARGE, message: clé i18n },
 * même enveloppe que le filtre global { statusCode, message, path, timestamp }.
 * Un seul phénomène « fichier trop gros », un seul code, quelle que soit la
 * couche qui l'attrape (Multer ici, pipeline sharp sinon).
 */
@Catch(PayloadTooLargeException)
export class UploadTooLargeFilter implements ExceptionFilter {
  catch(_exception: PayloadTooLargeException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<{ url: string }>();
    response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      message: { code: MediaErrorCode.MEDIA_TOO_LARGE, message: "media.errors.tooLarge" },
      path: request.url,
      timestamp: new Date().toISOString()
    });
  }
}

@ApiTags("venues-media")
@Roles(UserRole.PRO)
@Controller()
export class VenueMediaController {
  constructor(private readonly media: VenueMediaService) {}

  // ── Photos ─────────────────────────────────────────────────────────────────

  @Post("venues/:id/photos")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: VENUE_PHOTO_LIMITS.maxBytes } }))
  @UseFilters(UploadTooLargeFilter)
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Ajoute une photo (multipart « file ») — pipeline sharp, EXIF évaporé, webp large + thumb" })
  @ApiCreatedResponse({ description: "VenuePhotoDTO — ajoutée en fin de galerie (sortOrder max+1)." })
  @ApiNotFoundResponse({ description: "404 indistinct : salle inexistante, supprimée ou d'un autre pro." })
  async addPhoto(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @UploadedFile() file?: UploadedImageFile
  ): Promise<VenuePhotoDTO> {
    return this.media.addPhoto(user.userId, id, this.requireFile(file));
  }

  // ⚠️ « order » AVANT « :photoId » (cf. en-tête de fichier).
  @Patch("venues/:id/photos/order")
  @ApiOperation({ summary: "Réordonne la galerie — ENSEMBLE complet, transaction atomique (A4-③)" })
  @ApiOkResponse({ description: "VenuePhotoDTO[] dans le nouvel ordre. La 1ʳᵉ devient la couverture publique." })
  @ApiNotFoundResponse({ description: "404 indistinct (salle)." })
  reorder(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(venuePhotoOrderSchema)) body: VenuePhotoOrderInput
  ): Promise<VenuePhotoDTO[]> {
    return this.media.reorderPhotos(user.userId, id, body);
  }

  @Patch("venues/:id/photos/:photoId")
  @ApiOperation({ summary: "Métadonnées d'une photo (altFr/altAr — null = effacement)" })
  @ApiOkResponse({ description: "VenuePhotoDTO à jour." })
  @ApiNotFoundResponse({ description: "404 indistinct : salle OU photo (PHOTO_NOT_FOUND, id malformé inclus)." })
  updateAlt(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("photoId") photoId: string,
    @Body(new ZodValidationPipe(venuePhotoAltUpdateSchema)) body: VenuePhotoAltUpdateInput
  ): Promise<VenuePhotoDTO> {
    return this.media.updatePhotoAlt(user.userId, id, photoId, body);
  }

  @Delete("venues/:id/photos/:photoId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Supprime une photo (ligne puis objets — jamais de ligne morte)" })
  @ApiNoContentResponse({ description: "204." })
  @ApiNotFoundResponse({ description: "404 indistinct : salle OU photo." })
  removePhoto(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("photoId") photoId: string
  ): Promise<void> {
    return this.media.deletePhoto(user.userId, id, photoId);
  }

  // ── Scènes 360° ────────────────────────────────────────────────────────────

  @Post("venues/:id/photos-360")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: VENUE_PHOTO_360_LIMITS.maxBytes } }))
  @UseFilters(UploadTooLargeFilter)
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Ajoute une scène 360° équirectangulaire (D34 : multi-scènes, plafond 12)" })
  @ApiCreatedResponse({ description: "VenuePhoto360SceneDTO (thumb 640×320 pour la bande de scènes A6b)." })
  @ApiNotFoundResponse({ description: "404 indistinct (salle)." })
  async addScene(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @UploadedFile() file?: UploadedImageFile
  ): Promise<VenuePhoto360SceneDTO> {
    return this.media.add360Scene(user.userId, id, this.requireFile(file));
  }

  @Delete("venues/:id/photos-360/:sceneId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Supprime une scène — ses liaisons tombent en CASCADE (FK)" })
  @ApiNoContentResponse({ description: "204." })
  @ApiNotFoundResponse({ description: "404 indistinct : salle OU scène (SCENE_NOT_FOUND)." })
  removeScene(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("sceneId") sceneId: string
  ): Promise<void> {
    return this.media.delete360Scene(user.userId, id, sceneId);
  }

  // ── Liaisons (D34) ─────────────────────────────────────────────────────────

  @Post("venues/:id/photo-360-links")
  @ApiOperation({ summary: "Lie deux scènes (bidirectionnel, hotspot par sens) — doublon inversé refusé" })
  @ApiCreatedResponse({ description: "VenuePhoto360LinkDTO. 409 LINK_ALREADY_EXISTS si la paire (même inversée) existe." })
  @ApiNotFoundResponse({ description: "404 indistinct : salle OU scène hors de cette salle (SCENE_NOT_FOUND)." })
  createLink(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(venue360LinkCreateSchema)) body: Venue360LinkCreateInput
  ): Promise<VenuePhoto360LinkDTO> {
    return this.media.createLink(user.userId, id, body);
  }

  @Delete("venues/:id/photo-360-links/:linkId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Supprime une liaison" })
  @ApiNoContentResponse({ description: "204." })
  @ApiNotFoundResponse({ description: "404 indistinct : salle OU liaison (LINK_NOT_FOUND)." })
  removeLink(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Param("linkId") linkId: string
  ): Promise<void> {
    return this.media.deleteLink(user.userId, id, linkId);
  }

  // ── Interne ────────────────────────────────────────────────────────────────

  /** Multipart sans fichier (champ absent ou mal nommé) → 400 MEDIA_FILE_REQUIRED. */
  private requireFile(file?: UploadedImageFile): Buffer {
    if (!file || !Buffer.isBuffer(file.buffer)) {
      throw new BadRequestException({
        code: MediaErrorCode.MEDIA_FILE_REQUIRED,
        message: "media.errors.fileRequired"
      });
    }
    return file.buffer;
  }
}
