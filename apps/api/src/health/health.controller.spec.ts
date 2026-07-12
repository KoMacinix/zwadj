// Test minimal (validation squelette) : le contrôleur /health répond au
// contrat partagé ApiHealthResponse, PrismaService étant mocké (up et down).
import { Test } from "@nestjs/testing";
import { HealthController } from "./health.controller";
import { PrismaService } from "../prisma/prisma.service";

describe("HealthController", () => {
  async function build(queryRawImpl: () => Promise<unknown>) {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: { $queryRaw: queryRawImpl } }]
    }).compile();
    return moduleRef.get(HealthController);
  }

  it("répond ok avec db=up quand PostgreSQL répond", async () => {
    const controller = await build(async () => [{ "?column?": 1 }]);
    const res = await controller.health();
    expect(res.status).toBe("ok");
    expect(res.db).toBe("up");
    expect(new Date(res.timestamp).toString()).not.toBe("Invalid Date");
  });

  it("répond ok avec db=down quand PostgreSQL est injoignable (l'API reste vivante)", async () => {
    const controller = await build(async () => {
      throw new Error("connexion refusée");
    });
    const res = await controller.health();
    expect(res.status).toBe("ok");
    expect(res.db).toBe("down");
  });
});
