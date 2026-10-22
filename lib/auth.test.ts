import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import {
  emailOTP,
  haveIBeenPwned,
  magicLink,
  organization,
  phoneNumber,
  testUtils,
  twoFactor,
} from "better-auth/plugins";
import { oauthProvider } from "@better-auth/oauth-provider";

import * as schemaSqlite from "@/database/schema-sqlite";
import * as schemaAppSqlite from "@/database/schema-app-sqlite";
import { env } from "@/env/server";
import {
  BetterAuthAdminServerConfig,
  BetterAuthApiKeyServerConfig,
  BetterAuthBearerServerConfig,
  BetterAuthGenericOAuthServerConfig,
  BetterAuthJwtServerConfig,
  BetterAuthLastLoginMethodServerConfig,
  BetterAuthMultiSessionServerConfig,
  BetterAuthNextCookiesServerConfig,
  BetterAuthOauthDeviceAuthorizationServerConfig,
  BetterAuthOauthPopupServerConfig,
  BetterAuthOneTimeTokenServerConfig,
  BetterAuthOpenApiServerConfig,
  BetterAuthPasskeyServerConfig,
  BetterAuthUsernameServerConfig,
  BetterAuthUserServerConfig,
} from "@/lib/auth/server/config";
import { accessControl, orgRoles } from "@/lib/permissions";
import { testDb } from "@/tests/database";

/**
 * Instancia de Better Auth para `bun test`, sobre la SQLite en memoria de
 * `tests/database.ts`. Reusa los plugins de `lib/auth/server/config` salvo los
 * que envían correo o consultan PostgreSQL: esos se redefinen aquí y capturan
 * el OTP / enlace / invitación en las variables `last*` para que el test los lea.
 */

export const lastEmailOtp: { email?: string; code?: string } = {};
export const lastMagicLink: { email?: string; url?: string; token?: string } =
  {};
export const lastInviteEmail: {
  email?: string;
  id?: string;
  org?: string;
} = {};

export const testAuth = betterAuth({
  appName: env.BETTER_AUTH_SERVER_NAME,
  secret: env.BETTER_AUTH_SERVER_SECRET,
  trustedOrigins: env.BETTER_AUTH_SERVER_TRUSTED_ORIGINS,
  advanced: {
    useSecureCookies: true,
    disableCSRFCheck: true,
    disableOriginCheck: true,
    crossSubDomainCookies: { enabled: true },
  },
  database: drizzleAdapter(testDb, {
    provider: "sqlite",
    usePlural: true,
    schema: { ...schemaSqlite, ...schemaAppSqlite },
  }),
  user: BetterAuthUserServerConfig,
  session: {
    additionalFields: {
      securityLevel: { type: "string", required: false },
    },
  },
  emailAndPassword: { enabled: true },
  plugins: [
    testUtils({ captureOTP: true }),
    BetterAuthAdminServerConfig,
    organization({
      ac: accessControl,
      roles: orgRoles,
      allowUserToCreateOrganization: true,
      organizationLimit: 5,
      membershipLimit: 100,
      dynamicAccessControl: { enabled: true },
      sendInvitationEmail: async ({ email, organization, id }) => {
        lastInviteEmail.email = email;
        lastInviteEmail.id = id;
        lastInviteEmail.org = organization?.name;
      },
    }),
    BetterAuthOpenApiServerConfig,
    BetterAuthJwtServerConfig,
    // Sin postLogin/clientPrivileges de producción: consultan PostgreSQL.
    oauthProvider({
      loginPage: "/auth/sign-in",
      consentPage: "/auth/consent",
      allowDynamicClientRegistration: true,
      allowUnauthenticatedClientRegistration: true,
      resources: [
        {
          identifier: "https://api.test.example.com",
          name: "API de prueba",
          allowedScopes: ["openid", "profile", "email", "offline_access"],
        },
      ],
      resourcePrivileges: async ({ user }) => user?.role === "admin",
      clientPrivileges: async ({ user }) => user?.role === "admin",
    }),
    BetterAuthOauthDeviceAuthorizationServerConfig,
    twoFactor({
      issuer: env.BETTER_AUTH_SERVER_NAME,
      otpOptions: { sendOTP: async () => {} },
    }),
    BetterAuthApiKeyServerConfig,
    BetterAuthUsernameServerConfig,
    phoneNumber({
      requireVerification: false,
      otpLength: 6,
      sendOTP: async () => {},
    }),
    emailOTP({
      sendVerificationOTP: async ({ email, otp }) => {
        lastEmailOtp.email = email;
        lastEmailOtp.code = otp;
      },
    }),
    magicLink({
      sendMagicLink: async ({ email, url, token }) => {
        lastMagicLink.email = email;
        lastMagicLink.url = url;
        lastMagicLink.token = token;
      },
    }),
    BetterAuthMultiSessionServerConfig,
    BetterAuthLastLoginMethodServerConfig,
    ...BetterAuthGenericOAuthServerConfig,
    BetterAuthBearerServerConfig,
    BetterAuthOauthPopupServerConfig,
    BetterAuthPasskeyServerConfig,
    // Inerto: el chequeo real contra HIBP requiere red.
    haveIBeenPwned({ enabled: false }),
    BetterAuthOneTimeTokenServerConfig,
    BetterAuthNextCookiesServerConfig,
  ],
});
