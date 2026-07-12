import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Toutes les routes sauf assets/_next/api
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)"
};
