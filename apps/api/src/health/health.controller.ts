import { Controller, Get } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { ApiHealthResponse } from "@zwadj/types";
import { Public } from "../auth/auth.decorators";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("health")
@Public() // sonde de vivacité (monitoring/orchestrateur) : aucun JWT à présenter
@SkipThrottle()
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: "Liveness + ping BDD" })
  @ApiOkResponse({ description: "L'API répond ; `db` indique l'état de PostgreSQL." })
  async health(): Promise<ApiHealthResponse> {
    let db: ApiHealthResponse["db"] = "up";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      db = "down";
    }
    return { status: "ok", db, timestamp: new Date().toISOString() };
  }
}
