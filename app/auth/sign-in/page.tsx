import { LoginForm } from "./sign-in-form";
import { CommandIcon } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { betterAuthServer as auth } from "@/lib/auth/server";
import { headers as NextHeaders } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { isOAuthFlow, isOAuthQueryExpired } from "@/lib/oauth-flow";
// import { needsSetup } from "@/lib/setup";

// ponytail: sin esto Next prerenderiza en build (○ en la tabla de rutas) y la
// consulta de needsSetup() corre contra el placeholder de build.
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = new URLSearchParams(
    Object.entries(await searchParams).flatMap(([key, value]) =>
      Array.isArray(value)
        ? value.map((v) => [key, v])
        : value === undefined
          ? []
          : [[key, value]],
    ),
  );
  // Viene del /oauth2/authorize de una app: tras el login hay que volver a ella
  const oauthFlow = isOAuthFlow(query);

  // ponytail: primer arranque sin admin → /setup.
  // if (await needsSetup()) redirect("/setup");

  let hasSession = false;
  try {
    const headers = await NextHeaders();
    hasSession = Boolean(await auth.api.getSession({ headers }));
  } catch {
    // DB unreachable — show login page anyway
  }
  // Fuera del try: redirect() lanza, y dentro lo tragaba el catch dejando el
  // formulario de login a un usuario que ya tiene sesión. En un flujo OAuth
  // (p. ej. prompt=login) no: mandaría al dashboard en vez de volver a la app.
  if (hasSession && !oauthFlow) redirect("/dashboard");

  return (
    <main className="flex flex-col gap-4 p-6 md:p-10 rounded-l-2xl ">
      <header className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2 font-semibold lg:hidden">
          <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
            <CommandIcon className="size-4" />
          </div>
          ISC Gate
        </div>
        <ThemeToggle />
      </header>

      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-sm animate-in fade-in-0 slide-in-from-bottom-4 duration-500 motion-reduce:animate-none">
          <Suspense fallback={null}>
            <LoginForm expired={oauthFlow && isOAuthQueryExpired(query)} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
