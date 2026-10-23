import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// getSessionCookie detecta la cookie con o sin prefijo `__Secure-` (https vs http).
export function isHasSession(request: NextRequest): boolean {
  return Boolean(getSessionCookie(request));
}

// TODO: se esta dejando como fallback este metodo hasta que podamos refactorizarlo luego
export function isPublicDashboardRoute(route: string): boolean;
export function isPublicDashboardRoute(request: NextRequest): boolean;
export function isPublicDashboardRoute(param: NextRequest | string): boolean {
  const PUBLIC_DASHBOARD_ROUTES = [
    "/dashboard/login",
    "/dashboard/2fa",
  ] as const;

  if (param instanceof Request) {
    const { pathname } = param.nextUrl;
    return PUBLIC_DASHBOARD_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
    );
  }

  return PUBLIC_DASHBOARD_ROUTES.some(
    (route) => param === route || param.startsWith(`${route}/`),
  );
}

export function isPrivateDashboardRoute(request: NextRequest): boolean {
  const PRIVATE_DASHBOARD_ROUTES = ["/dashboard", "/"] as const;

  const { pathname } = request.nextUrl;

  return PRIVATE_DASHBOARD_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = isHasSession(request);

  // rutas públicas dentro de /dashboard (no requieren sesión)
  const isPublicRoute = isPublicDashboardRoute(request);

  // rutas privadas dentro de /dashboard (requieren sesión)
  const isPrivateRoute = isPrivateDashboardRoute(request);

  const requiresSession = isPrivateRoute && !isPublicRoute;

  // TODO: Implementacion de redireccionamiento temporal para el login de /dashboard, mientras se implementa la logica de autenticacion
  console.info(
    `[proxy] pathname: ${pathname}, hasSession: ${hasSession}, isPublicRoute: ${isPublicRoute}, isPrivateRoute: ${isPrivateRoute}, requiresSession: ${requiresSession}`,
  );
  if (requiresSession && !hasSession) {
    const url = new URL("/dashboard/login", request.url);
    if (pathname !== "/") url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // TODO: Se debe validar otros mecaniscos de redireccionamiento, como por ejemplo si el usuario ya tiene una sesion activa y esta intentando acceder a /dashboard/login, en ese caso se debe redirigir al usuario a /dashboard

  // expone pathname a layouts/server components vía header
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|css|js|ico)$).*)",
  ],
};
