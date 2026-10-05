import { env } from "@/env/server";
import type { BetterAuthAdvancedOptions } from "better-auth/types";

export const BetterAuthAdvancedServerConfig = {
  // Cookies `Secure` solo sobre https: el navegador las descarta en http (salvo localhost).
  useSecureCookies: env.BETTER_AUTH_URL.startsWith("https://"),
  disableCSRFCheck: false,
  disableOriginCheck: false,
  crossSubDomainCookies: {
    enabled: Boolean(env.BETTER_AUTH_SERVER_DOMAIN),
    domain: env.BETTER_AUTH_SERVER_DOMAIN,
  },
} satisfies BetterAuthAdvancedOptions;
