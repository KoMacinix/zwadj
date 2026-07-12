import { ArgumentMetadata, BadRequestException, Injectable, PipeTransform } from "@nestjs/common";
import type { ZodTypeAny } from "zod";

/**
 * Pipe de validation Zod (AGENTS.md : validation aux frontières en Zod,
 * pas class-validator).
 *
 * - Enregistré GLOBALEMENT sans schéma : pass-through (le câblage existe).
 * - Sur une route : `@Body(new ZodValidationPipe(monSchema))` → validation
 *   effective + erreurs normalisées. Premier usage réel : tranche Auth.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema?: ZodTypeAny) {}

  transform(value: unknown, _metadata: ArgumentMetadata): unknown {
    if (!this.schema) return value;
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) {
      throw new BadRequestException({
        message: "Validation échouée",
        issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }))
      });
    }
    return parsed.data;
  }
}
