import { betterAuthServer as auth } from "@/lib/auth/server";
import { headers } from "next/headers";

// Compartido por las rutas /api/admin/resources/**. Los endpoints admin de
// resources del plugin son SERVER_ONLY (404 por HTTP); estas rutas los
// exponen al dashboard sólo para admins.

/** null si el usuario es admin; si no, la respuesta 401/403 a devolver. */
export const requireAdmin = async (): Promise<Response | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
};

// ponytail: drizzle 1.x envuelve los errores de DB en "Failed query: ..."
// (SQL + params) y deja el de Postgres en `cause`. Bun SQL pone el SQLSTATE
// en `errno` (code = ERR_POSTGRES_SERVER_ERROR); node-postgres, en `code`.
export const isUniqueViolation = (error: unknown): boolean => {
  for (let e = error; e; e = (e as { cause?: unknown }).cause) {
    const { code, errno } = e as { code?: string; errno?: string };
    if (code === "23505" || errno === "23505") return true;
  }
  return false;
};

/**
 * Sólo los APIError del plugin (traen `body`) llegan al cliente, con su
 * `error_description` (su `message` suele venir vacío). Cualquier otro error
 * —p. ej. de DB, con el SQL dentro— se loguea y responde 500 genérico.
 */
export const errorResponse = (
  error: unknown,
  fallback: string,
): Response => {
  const { body, statusCode } = error as {
    body?: { error_description?: string; message?: string };
    statusCode?: number;
  };
  if (!body || typeof statusCode !== "number" || statusCode >= 500) {
    console.error(`[resources] ${fallback}:`, error);
    return Response.json({ error: fallback }, { status: 500 });
  }
  return Response.json(
    {
      error:
        body.error_description ||
        body.message ||
        (error instanceof Error && error.message) ||
        fallback,
    },
    { status: statusCode },
  );
};
