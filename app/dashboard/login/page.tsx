import { CommandIcon } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { DashboardLoginForm } from "@/app/dashboard/login/form-login";
import { Card } from "@/components/ui/card";
import { betterAuthServer as auth } from "@/lib/auth/server";
import { headers as NextHeaders } from "next/headers";
import { redirect } from "next/navigation";
import { checkFirstAdmin } from "@/database/scripts/check-first-admin";

/**
 * Página principal de autenticación/login para el panel de control (Server Component).
 *
 * Realiza una verificación previa de sesión en el servidor. Si existe una sesión activa,
 * redirige al usuario hacia `/dashboard`. En caso contrario, despliega la interfaz con
 * el formulario `DashboardLoginForm`.
 */
export default async function DashboardLoginPage() {
  // ponytail: primer arranque sin admin → /setup (única manera de entrar).

  const checkFirstAdminResult = await checkFirstAdmin();

  // console.log("checkFirstAdminResult", checkFirstAdminResult);
  if (!checkFirstAdminResult.isSuccess()) redirect("/setup");

  const headers = await NextHeaders();

  // 1. Verificación de sesión activa en el servidor (SSR)
  const session = await auth.api.getSession({ headers });

  // 2. Redirección automática si el usuario ya está autenticado
  if (session) redirect("/dashboard");

  return (
    <main className="flex min-h-svh flex-col p-6 md:p-10">
      {/* Cabecera con marca de la aplicación en móvil y selector de tema */}
      <header className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2 font-semibold lg:hidden">
          <div className="bg-accent flex aspect-square size-8 items-center justify-center rounded-lg">
            <CommandIcon className="size-4" />
          </div>
          ISC Gate — Panel
        </div>
        <ThemeToggle />
      </header>

      {/* Contenedor principal del formulario de login centrado */}
      <div className="w-full max-w-sm mx-auto my-auto animate-in fade-in-0 slide-in-from-bottom-4 duration-500 motion-reduce:animate-none">
        <Card className="p-6 shadow-sm lg:ring-0! lg:border-0 lg:bg-transparent lg:shadow-none lg:p-0">
          <DashboardLoginForm />
        </Card>
      </div>
    </main>
  );
}
