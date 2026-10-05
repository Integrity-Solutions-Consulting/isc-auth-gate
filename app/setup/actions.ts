"use server";

import z from "zod";
import { hashPassword } from "better-auth/crypto";
import { createLocalAccountIssuer } from "@better-auth/core/db";
import { eq, sql } from "drizzle-orm";

import { accounts, members, organizations, users } from "@/database/schema";
import { drizzlePostgreClient } from "@/database/clients/postgre";
import { checkFirstAdmin } from "@/database/scripts/check-first-admin";

// ponytail: setup es la única ruta que crea el primer admin sin SMTP ni
// sesión — insertamos directo en DB (user/account/org/member). Esto evita:
// - el databaseHook de bienvenida (envía email al crear user, fallaría sin SMTP)
// - el flujo email-verification (requireEmailVerification bloquearía el login)
// El hash usa el mismo algoritmo de Better Auth (scrypt), el login normal
// por /sign-in funciona sin cambios.
const setupSchema = z.object({
  name: z.string().min(1, "Requerido"),
  email: z.string().email("Correo inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  organizationName: z.string().min(1, "Requerido"),
});

function slugify(name: string): string {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "org"
  );
}

export type SetupResult = { error?: string };

/** Señal interna: el gate se cerró mientras esta transacción esperaba el lock. */
class SetupAlreadyDone extends Error {}

/**
 * Crea el primer admin + organización en UNA transacción.
 *
 * - `pg_advisory_xact_lock` serializa intentos concurrentes (dos operadores, o
 *   dos réplicas en el mismo primer arranque): el segundo espera al primero y
 *   al tomar el lock ya ve el admin, así que aborta limpio.
 * - Todo dentro de la transacción: si un insert falla (email duplicado, slug de
 *   organización ya tomado) no queda un admin sin account ni una organización
 *   huérfana, que era el fallo de datos del check-then-insert anterior.
 */
export async function completeSetup(
  _prev: SetupResult,
  formData: FormData,
): Promise<SetupResult> {
  // Gate rápido (fuera de la transacción) para no abrir una tx en peticiones
  // que ya no van a hacer nada.
  if (!(await checkFirstAdmin())) {
    return { error: "El setup ya fue completado." };
  }

  const parsed = setupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    organizationName: formData.get("organizationName"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }
  const { name, email, password, organizationName } = parsed.data;

  const userId = crypto.randomUUID();
  const orgId = crypto.randomUUID();
  const accountId = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  const now = new Date();

  try {
    await drizzlePostgreClient.transaction(async (tx) => {
      // ponytail: lock global de setup. Es una fila de pg_locks, gratis, y
      // expulsa cualquier carrera entre réplicas sin tabla extra ni advisory
      // key por deploy. El número es arbitrario pero fijo.
      await tx.execute(sql`select pg_advisory_xact_lock(1_000_001)`);

      const [admin] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, "admin"))
        .limit(1);
      if (admin) throw new SetupAlreadyDone();

      await tx.insert(users).values({
        id: userId,
        name,
        email,
        emailVerified: true,
        role: "admin",
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(accounts).values({
        id: accountId,
        issuer: createLocalAccountIssuer("credential"),
        accountId: userId,
        providerId: "credential",
        userId,
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      });

      await tx.insert(organizations).values({
        id: orgId,
        name: organizationName,
        slug: slugify(organizationName),
        createdAt: now,
      });

      await tx.insert(members).values({
        id: crypto.randomUUID(),
        organizationId: orgId,
        userId,
        role: "owner",
        createdAt: now,
      });
    });
  } catch (error) {
    if (error instanceof SetupAlreadyDone) {
      return { error: "El setup ya fue completado." };
    }
    // 23505 = unique_violation. El más probable: otro setup ganó la carrera con
    // el mismo email, o el slug de la organización ya existe.
    const pgCode = (error as { cause?: { code?: string } }).cause?.code;
    if (pgCode === "23505") {
      console.error("Setup: violación de unicidad:", error);
      return {
        error:
          "Ese correo o esa organización ya existen. Prueba con otros datos.",
      };
    }
    console.error("Setup falló:", error);
    return { error: "Error al crear la cuenta inicial. Revisa los logs." };
  }

  return {};
}
