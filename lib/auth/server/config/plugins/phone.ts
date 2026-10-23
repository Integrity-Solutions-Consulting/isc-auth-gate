// `db` (node-postgres), no el cliente Bun SQL: `next build` evalúa esto en
// workers de Node, y aquel tiene una sola conexión (es para el entrypoint).
import { drizzlePostgreClient } from "@/database/clients/postgre";
import { users } from "@/database/schema";
import { env } from "@/env/server";
import { client as email } from "@/lib/email";
import type { BetterAuthPlugin } from "better-auth";
import { phoneNumber } from "better-auth/plugins";
import { eq } from "drizzle-orm";

export const BetterAuthPhoneNumberServerConfig = phoneNumber({
  requireVerification: false,
  otpLength: 6,
  sendOTP: async ({ phoneNumber, code }) => {
    const [userRow] = await drizzlePostgreClient
      .select({ email: users.email })
      .from(users)
      .where(eq(users.phoneNumber, phoneNumber))
      .limit(1);

    if (userRow?.email) {
      await email.send({
        from: env.BETTER_AUTH_SMTP_TRANSPORTER_FROM,
        to: userRow.email,
        subject: "Tu código de verificación de teléfono",
        text: `Tu código de verificación es: ${code}`,
      });
    }
  },
}) satisfies BetterAuthPlugin;
