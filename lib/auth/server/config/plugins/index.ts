import type { BetterAuthPlugin } from "better-auth";

import { BetterAuthAdminServerConfig } from "./admin";
import { BetterAuthApiKeyServerConfig } from "./api-key";
import { BetterAuthBearerServerConfig } from "./bearer";
import { BetterAuthHaveIBeenPwnedServerConfig } from "./been-pawned";
import { BetterAuthCaptchaServerConfig } from "./captcha";
import { BetterAuthEmailOtpServerConfig } from "./email-otp";
import { BetterAuthI18nServerConfig } from "./i18n";
import { BetterAuthJwtServerConfig } from "./jwt";
import { BetterAuthLastLoginMethodServerConfig } from "./last-login";
import { BetterAuthMagicLinkServerConfig } from "./magic-link";
import { BetterAuthMultiSessionServerConfig } from "./multi-session";
import { BetterAuthNextCookiesServerConfig } from "./next";
import { BetterAuthOauthDeviceAuthorizationServerConfig } from "./oauth-device-authorization";
import { BetterAuthGenericOAuthServerConfig } from "./oauth-generic";
import { BetterAuthOauthPopupServerConfig } from "./oauth-popup";
import { BetterAuthOAuthErrorI18nServerConfig } from "./oauth-error-i18n";
import { BetterAuthOAuthProviderServerConfig } from "./oauth-provider";
import { BetterAuthOneTimeTokenServerConfig } from "./one-time-token";
import { BetterAuthOpenApiServerConfig } from "./open-api";
import { BetterAuthOrganizationServerConfig } from "./organization";
import { BetterAuthPasskeyServerConfig } from "./pass-key";
import { BetterAuthPhoneNumberServerConfig } from "./phone";
import { BetterAuthTestUtilsServerConfig } from "./test-utils";
import { BetterAuthTwoFactorServerConfig } from "./two-factor";
import { BetterAuthUsernameServerConfig } from "./username";

export {
  BetterAuthAdminServerConfig,
  BetterAuthApiKeyServerConfig,
  BetterAuthBearerServerConfig,
  BetterAuthHaveIBeenPwnedServerConfig,
  BetterAuthCaptchaServerConfig,
  BetterAuthEmailOtpServerConfig,
  BetterAuthI18nServerConfig,
  BetterAuthJwtServerConfig,
  BetterAuthLastLoginMethodServerConfig,
  BetterAuthMagicLinkServerConfig,
  BetterAuthMultiSessionServerConfig,
  BetterAuthNextCookiesServerConfig,
  BetterAuthOauthDeviceAuthorizationServerConfig,
  BetterAuthGenericOAuthServerConfig,
  BetterAuthOauthPopupServerConfig,
  BetterAuthOAuthErrorI18nServerConfig,
  BetterAuthOAuthProviderServerConfig,
  BetterAuthOneTimeTokenServerConfig,
  BetterAuthOpenApiServerConfig,
  BetterAuthOrganizationServerConfig,
  BetterAuthPasskeyServerConfig,
  BetterAuthPhoneNumberServerConfig,
  BetterAuthTestUtilsServerConfig,
  BetterAuthTwoFactorServerConfig,
  BetterAuthUsernameServerConfig,
};

/**
 * Identidad tipada: misma restricción que `plugins` en BetterAuthOptions
 * (`[] | BetterAuthPlugin[]`). Ese `[]` hace que TypeScript infiera una TUPLA,
 * y Better Auth infiere los campos de los plugins desde la tupla
 * (InferPluginFieldFromTuple): `session.user.role` del admin, etc. Un array
 * exportado tal cual se ensancha a `(A | B)[]` y esos campos desaparecen.
 */
const definePlugins = <T extends [] | BetterAuthPlugin[]>(plugins: T): T =>
  plugins;

/**
 * Plugins del servidor, en el orden de registro.
 *
 * ponytail: el orden importa — `nextCookies` debe ir último (antes sólo de
 * testUtils) para fijar las cookies de lo que devuelvan los demás. Los
 * opcionales (Microsoft, CAPTCHA, testUtils) son listas que se esparcen.
 */
export const BetterAuthServerPlugins = definePlugins([
  BetterAuthOpenApiServerConfig,
  BetterAuthJwtServerConfig,
  BetterAuthAdminServerConfig,
  BetterAuthOrganizationServerConfig,
  BetterAuthOAuthProviderServerConfig,
  BetterAuthOauthDeviceAuthorizationServerConfig,
  BetterAuthTwoFactorServerConfig,
  BetterAuthApiKeyServerConfig,
  BetterAuthUsernameServerConfig,
  BetterAuthPhoneNumberServerConfig,
  BetterAuthEmailOtpServerConfig,
  BetterAuthMagicLinkServerConfig,
  BetterAuthMultiSessionServerConfig,
  BetterAuthLastLoginMethodServerConfig,
  ...BetterAuthGenericOAuthServerConfig,
  BetterAuthBearerServerConfig,
  BetterAuthHaveIBeenPwnedServerConfig,
  ...BetterAuthCaptchaServerConfig,
  BetterAuthOneTimeTokenServerConfig,
  BetterAuthOauthPopupServerConfig,
  BetterAuthPasskeyServerConfig,
  BetterAuthI18nServerConfig,
  BetterAuthOAuthErrorI18nServerConfig,
  BetterAuthNextCookiesServerConfig,
  ...BetterAuthTestUtilsServerConfig,
]);
