// La FICHE CLIENT d'un pro — le SERVICE (rang 41, D336, L35-4 amendé). Il traduit les décisions de la politique (`pro-client-policy.ts`, module pur) et les
// résultats du port (`pro-client-store.types.ts`) en réponses HTTP ; il n'écrit aucune règle lui-même.
//
// ⛔ K-1 NE LIT JAMAIS `users` (M-4) : la recherche ne touche que les fiches du pro — sa réponse est donc la même, à l'octet, qu'un compte Zwadj porte
// l'identifiant ou non. ⛔ Le contact du PRO (son numéro, son second numéro, l'e-mail de son compte) est refusé à K-2 et à K-3b (S-54), AVANT toute écriture.
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import {
  ClientRecordErrorCode,
  type ClientRecordCreateDTO,
  type ClientRecordCreateInput,
  type ClientRecordDTO,
  type ClientRecordLookupDTO,
  type ClientRecordLookupInput,
  type ClientRecordNamesInput,
  type ClientRecordUpdateInput
} from "@zwadj/types";
import { decisionCreation, estContactDuPro, peutModifier } from "./pro-client-policy";
import { PRO_CLIENT_STORE, type FicheRow, type ProClientStore } from "./pro-client-store.types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** La fiche telle que les routes la rendent. ⛔ `linked` est un BOOLÉEN : ni l'identifiant du compte, ni le profil du pro (S-53). */
export function toClientRecordDTO(fiche: FicheRow): ClientRecordDTO {
  return {
    id: fiche.id,
    phone: fiche.phone,
    email: fiche.email,
    nameAr: fiche.nameAr,
    nameLatin: fiche.nameLatin,
    linked: !peutModifier(fiche),
    createdAt: fiche.createdAt.toISOString(),
    updatedAt: fiche.updatedAt.toISOString()
  };
}

@Injectable()
export class ProClientsService {
  constructor(@Inject(PRO_CLIENT_STORE) private readonly fiches: ProClientStore) {}

  /** ⛔ K-1 (M-4) — la fiche du pro, ou `{ found: false }` et RIEN d'autre. Un seul appel au port : `rechercher`, jamais le contact du pro (qui lit `users`). */
  async lookup(userId: string, input: ClientRecordLookupInput): Promise<ClientRecordLookupDTO> {
    const critere = input.phone !== undefined ? { phone: input.phone } : { email: input.email as string };
    const fiche = await this.fiches.rechercher(userId, critere);
    return fiche === null ? { found: false } : { found: true, record: toClientRecordDTO(fiche) };
  }

  /** ⛔ K-2 (MD-1, MD-2, MD-4) — crée la fiche, ou REND celle qui existe (telle quelle) ; le contact du pro est refusé avant toute écriture ; le numéro et
   *  l'e-mail sur deux fiches différentes : 409, rien n'est fusionné. */
  async create(userId: string, input: ClientRecordCreateInput): Promise<ClientRecordCreateDTO> {
    const pro = await this.fiches.contactDuPro(userId);
    if (pro === null) this.throwNotFound();
    if (estContactDuPro(input, pro)) this.throwProContact();
    const resultat = await this.fiches.creerSiAbsente(pro.proProfileId, {
      phone: input.phone ?? null,
      email: input.email ?? null,
      nameAr: input.nameAr ?? null,
      nameLatin: input.nameLatin ?? null
    });
    if (resultat.cree) return { created: true, record: toClientRecordDTO(resultat.fiche) };
    const decision = decisionCreation(resultat.parTelephone, resultat.parEmail);
    if (decision.kind === "rendre") return { created: false, record: toClientRecordDTO(decision.fiche) };
    // « conflit » — ou « créer » après un refus d'insertion : une modification simultanée a déplacé l'identifiant ; on refuse plutôt que d'inventer une fiche.
    this.throwIdentifiersConflict();
  }

  /** ⛔ K-3 (MD-7, MD-6) — complète un nom MANQUANT ; un nom présent n'est jamais remplacé, une fiche liée ne se complète pas. */
  async completeNames(userId: string, id: string, input: ClientRecordNamesInput): Promise<ClientRecordDTO> {
    if (!UUID_PATTERN.test(id)) this.throwNotFound();
    const resultat = await this.fiches.completerNoms(userId, id, input);
    if (resultat.ok) return toClientRecordDTO(resultat.fiche);
    if (resultat.actuelle === null) this.throwNotFound();
    if (!peutModifier(resultat.actuelle)) this.throwLinked();
    throw new ConflictException({ code: ClientRecordErrorCode.CLIENT_RECORD_NAME_ALREADY_SET, message: "clientRecord.errors.nameAlreadySet" });
  }

  /** ⛔ K-3b (S-48 ; MD-2, MD-4, MD-6) — modifie une fiche du pro (DB-11). Ne touche aucune copie déjà faite sur un devis (R8) : il n'écrit que la fiche. */
  async update(userId: string, id: string, input: ClientRecordUpdateInput): Promise<ClientRecordDTO> {
    if (!UUID_PATTERN.test(id)) this.throwNotFound();
    if (input.phone !== undefined || input.email !== undefined) {
      const pro = await this.fiches.contactDuPro(userId);
      if (pro === null) this.throwNotFound();
      if (estContactDuPro(input, pro)) this.throwProContact();
    }
    const resultat = await this.fiches.modifier(userId, id, input);
    if (resultat.ok) return toClientRecordDTO(resultat.fiche);
    if (resultat.raison === "unicite") this.throwIdentifiersConflict();
    if (resultat.actuelle === null) this.throwNotFound();
    this.throwLinked();
  }

  // ───────────────────────────────────────────────────────────────────────────

  private throwNotFound(): never {
    throw new NotFoundException({ code: ClientRecordErrorCode.CLIENT_RECORD_NOT_FOUND, message: "clientRecord.errors.notFound" });
  }

  private throwProContact(): never {
    throw new BadRequestException({ code: ClientRecordErrorCode.CLIENT_IS_PRO_CONTACT, message: "clientRecord.errors.isProContact" });
  }

  private throwIdentifiersConflict(): never {
    throw new ConflictException({ code: ClientRecordErrorCode.CLIENT_RECORD_IDENTIFIERS_CONFLICT, message: "clientRecord.errors.identifiersConflict" });
  }

  private throwLinked(): never {
    throw new ConflictException({ code: ClientRecordErrorCode.CLIENT_RECORD_LINKED, message: "clientRecord.errors.linked" });
  }
}
