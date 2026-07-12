import { Global, Module } from "@nestjs/common";
import { DevLoggerEmailSender } from "./dev-logger.email";
import { EMAIL_SENDER } from "./email.types";

@Global()
@Module({
  providers: [{ provide: EMAIL_SENDER, useClass: DevLoggerEmailSender }],
  exports: [EMAIL_SENDER]
})
export class EmailModule {}
