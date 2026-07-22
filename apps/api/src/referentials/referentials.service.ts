// Lectures des référentiels (Flux A, Lot A1). Aucune écriture ici : le
// contenu vient du seed (prisma/seed.ts), jamais d'un endpoint.
import { Injectable } from "@nestjs/common";
import type { AmenityDTO, WilayaDTO } from "@zwadj/types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ReferentialsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Les 58 wilayas triées par code officiel, villes imbriquées triées par
   *  nameFr (collation de la base). `wilayaId` interne des villes non exposé. */
  async listWilayas(): Promise<WilayaDTO[]> {
    const wilayas = await this.prisma.wilaya.findMany({
      orderBy: { code: "asc" },
      include: { cities: { orderBy: { nameFr: "asc" } } }
    });
    return wilayas.map((w) => ({
      id: w.id,
      code: w.code,
      nameFr: w.nameFr,
      nameAr: w.nameAr,
      cities: w.cities.map((c) => ({
        id: c.id,
        nameFr: c.nameFr,
        nameAr: c.nameAr,
        // Decimal(9,6) → number : coordonnées ≠ argent, l'invariant « entiers »
        // ne s'applique pas ; 6 décimales tiennent exactement dans un double.
        lat: c.lat === null ? null : c.lat.toNumber(),
        lng: c.lng === null ? null : c.lng.toNumber()
      }))
    }));
  }

  /** Les équipements triés par nameFr — le front ré-ordonne pour l'AR s'il le
   *  souhaite (aucun champ d'ordre en base, décision Lot A1). */
  async listAmenities(): Promise<AmenityDTO[]> {
    const amenities = await this.prisma.amenity.findMany({ orderBy: { nameFr: "asc" } });
    return amenities.map((a) => ({ id: a.id, key: a.key, nameFr: a.nameFr, nameAr: a.nameAr, icon: a.icon }));
  }
}
