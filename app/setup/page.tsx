import { redirect } from "next/navigation";
import { CommandIcon } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
// import { env } from "@/env/server";
import { SetupForm } from "./setup-form";
import { checkFirstAdmin } from "@/database/scripts/check-first-admin";
import { checkConnection } from "@/database/scripts/check-connection";
import { cn } from "@/lib/utils";


//! TODO: Se tiene que hacer una refactorización de la página de setup para que no dependa de la verificación de Microsoft y SMTP, ya que estos son opcionales. Por ahora, se mantiene la verificación de la base de datos como requisito principal para el setup inicial.

export default async function SetupPage() {
  // const checkFirstAdminResult = await checkFirstAdmin();

  // console.log("checkFirstAdminResult", checkFirstAdminResult);

  if (!(await checkFirstAdmin())) redirect("/auth/sign-in");

  const databaseCheck = await checkConnection();

  // Microsoft y SMTP son opcionales (lib/providers.ts): "no configurado" no es
  // un fallo de salud, así que el panel muestra tres estados, no dos.
  const status = [
    {
      label: "Base de datos",
      state: databaseCheck ? ("ok" as const) : ("off" as const),
      detail: databaseCheck ? "Conectada" : "Sin respuesta",
    },
    // {
    //   label: "Microsoft OAuth",
    //   state: microsoftConfigured ? ("ok" as const) : ("off" as const),
    //   detail: microsoftConfigured ? "Configurado" : "No configurado",
    // },
    // {
    //   label: "SMTP (correo)",
    //   state: smtpConfigured ? ("ok" as const) : ("off" as const),
    //   detail: smtpConfigured ? "Configurado" : "No configurado",
    // },
  ];

  // Callback de Azure: solo tiene sentido si el provider está habilitado.
  // const microsoftCallbackUrl = `${env.BETTER_AUTH_URL.replace(/\/+$/, "")}/api/auth/callback/microsoft`;

  return (
    <main className="flex min-h-svh flex-col gap-6 p-6 md:p-10">
      <header className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2 font-semibold">
          <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
            <CommandIcon className="size-4" />
          </div>
          ISC Gate — Configuración inicial
        </div>
        <ThemeToggle />
      </header>

      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-md animate-in fade-in-0 slide-in-from-bottom-4 duration-500 motion-reduce:animate-none flex flex-col gap-6">
          <section
            aria-label="Estado del sistema"
            className="border rounded-lg p-4 text-sm flex flex-col gap-2"
          >
            {status.map(({ label, state, detail }) => (
              <div
                key={label}
                className="flex items-center justify-between gap-2"
              >
                <span className="text-muted-foreground">{label}</span>
                <span
                  className={cn({
                    "text-green-600 dark:text-green-400": state === "ok",
                    "text-muted-foreground": state === "off",
                  })}
                >
                  {state === "ok" ? "✓" : state === "off" ? "○" : "✗"} {detail}
                </span>
              </div>
            ))}
            {/* {microsoftConfigured ? (
              <p className="text-xs text-muted-foreground break-all pt-2 border-t">
                Callback de Microsoft (regístralo en Azure Portal → Redirect
                URIs): <code className="font-mono">{microsoftCallbackUrl}</code>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground pt-2 border-t">
                Microsoft OAuth y SMTP son opcionales por ahora. El admin puede
                entrar con correo y contraseña; habilítalos después en las
                variables de entorno del deploy.
              </p>
            )} */}
          </section>

          <SetupForm dbOk={databaseCheck} />
        </div>
      </div>
    </main>
  );
}
