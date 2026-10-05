import { checkFirstAdmin } from "@/database/scripts/check-first-admin";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// ! TODO: Se debe evaluar una refactorizacion de la logica de redireccionamiento, para que no se repita en multiples lugares, y se centralice en un solo lugar, para que sea mas facil de mantener y evitar errores de logica.

// ponytail: si la instancia no tiene admin todavía, primer arranque → /setup.
// Un error de DB no manda a /setup (no atrapar al admin con la DB caída).
export default async function HomePage() {
  const firstAdmin = await checkFirstAdmin();
  if (firstAdmin.isFailed()) {
    console.warn("[setup] no se pudo comprobar el primer admin:", firstAdmin.getError());
  } else if (!firstAdmin.getValue()) {
    redirect("/setup");
  }
  redirect("/dashboard", "replace");
}
