import { describe, it, expect } from "bun:test";
import { testAuth } from "@/lib/auth.test";
import { testDb } from "@/tests/database";

/**
 * Seed de usuario de prueba a voluntad.
 *
 * Crea `user@example.com` / `12345678` (idempotente: si ya existe, solo
 * verifica que el login funcione). NO trunca la DB para que el usuario
 * persista y pueda usarse en el browser para pruebas manuales.
 *
 * Uso:
 *   bun test tests/unit/seed-user.test.ts
 */
describe("Seed test user", () => {
  const TEST_EMAIL = "user@example.com";
  const TEST_PASSWORD = "12345678";

  it("crea o reutiliza user@example.com con password 12345678", async () => {
    const existing = await testDb.query.users.findFirst({
      where: { email: TEST_EMAIL },
    });

    if (existing) {
      // Ya existe: verificar que el login funcione con la clave esperada
      const signIn = await testAuth.api.signInEmail({
        body: { email: TEST_EMAIL, password: TEST_PASSWORD },
        asResponse: true,
      });
      expect(signIn.status).toBe(200);
      return;
    }

    // No existe: crear vía signUpEmail (hashea password y crea account)
    const signup = (await testAuth.api.signUpEmail({
      body: { email: TEST_EMAIL, name: "Test User", password: TEST_PASSWORD },
    })) as { user?: { id: string }; data?: { user?: { id: string } } };

    const userId = signup.user?.id ?? signup.data?.user?.id;
    expect(userId).toBeDefined();

    // Verificar login tras creación
    const signIn = await testAuth.api.signInEmail({
      body: { email: TEST_EMAIL, password: TEST_PASSWORD },
      asResponse: true,
    });
    expect(signIn.status).toBe(200);
  });
});
