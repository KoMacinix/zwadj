import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Les packages du workspace sont livrés en TypeScript source → Next les transpile.
const nextConfig: NextConfig = {
  transpilePackages: ["@zwadj/ui", "@zwadj/i18n", "@zwadj/types", "@zwadj/api-client"]
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");
export default withNextIntl(nextConfig);
