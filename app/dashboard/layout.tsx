import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { redirect } from "next/navigation";
import { PropsWithChildren } from "react";
import { betterAuthServer as auth } from "@/lib/auth/server";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { cookies as NextCookies, headers as NextHeaders } from "next/headers";
import { DashboardBreadcrumb } from "./dashboard-breadcrumb";
import { DashboardAccessDenied } from "@/components/dashboard-access-denied";
import { isPublicDashboardRoute } from "@/proxy";

/**
 * Layout principal del panel de administración (Server Component).
 * Proporciona autenticación en el servidor, control de acceso basado en permisos (RBAC)
 * y la estructura visual base con Sidebar y Header.
 *
 * @param children Componentes o páginas hijas a renderizar dentro del contenedor principal.
 */
export default async function DashboardLayout({ children }: PropsWithChildren) {
  const cookies = await NextCookies();
  const headers = await NextHeaders();

  // 1. Omitir validación en rutas explícitamente públicas (ej. /dashboard/login)
  const isPublicRoute = isPublicDashboardRoute(`${headers.get("x-pathname")}`);

  if (isPublicRoute) {
    return <>{children}</>;
  }

  // 2. Verificación de sesión activa
  const session = await auth.api.getSession({ headers });

  if (!session) redirect("/dashboard/login");

  // 3. Verificación de permisos de usuario (RBAC)
  const { success, error } = await auth.api.userHasPermission({
    headers,
    body: { permissions: { auth: ["access"] } },
  });

  if (error || !success) return <DashboardAccessDenied />;

  // 4. Inferencia del estado de la barra lateral desde cookies de servidor
  const isOpen = Boolean(cookies.get("sidebar_state")?.value === "true");

  return (
    <SidebarProvider defaultOpen={isOpen}>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2">
          <div className="flex items-center gap-2 px-4 w-full">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <DashboardBreadcrumb />
            <Separator
              orientation="vertical"
              className="ml-auto data-[orientation=vertical]:h-7"
            />
            <ThemeToggle />
          </div>
        </header>
        <section className="flex flex-1 flex-col gap-4 p-4 container mx-auto">
          {children}
        </section>
      </SidebarInset>
    </SidebarProvider>
  );
}
