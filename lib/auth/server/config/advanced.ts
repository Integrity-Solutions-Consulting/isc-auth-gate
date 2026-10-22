import { env } from "@/env/server";
import type { BetterAuthAdvancedOptions } from "better-auth/types";

export const BetterAuthAdvancedServerConfig = {
  // Cookies `Secure` solo sobre https: el navegador las descarta en http (salvo localhost).
  // `?.`: en `next build` el env llega sin validar y puede faltar.
  useSecureCookies: env.BETTER_AUTH_URL?.startsWith("https://") ?? false,
  disableCSRFCheck: false,
  disableOriginCheck: false,
  crossSubDomainCookies: {
    enabled: Boolean(env.BETTER_AUTH_SERVER_DOMAIN),
    domain: env.BETTER_AUTH_SERVER_DOMAIN,
  },
} satisfies BetterAuthAdvancedOptions;
