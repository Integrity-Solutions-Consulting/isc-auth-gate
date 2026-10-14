import { CommandIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Desarrolladores - ISC Auth",
  description:
    "Documentación de integración para aplicaciones de terceros con ISC Auth OAuth 2.1 / OIDC",
};

// Las guías incluyen URLs configuradas en runtime; no deben prerenderizarse
// con las variables (o secretos) disponibles durante `next build`.
// export const dynamic = "force-dynamic";

const navItems = [
  { href: "/developers", label: "Overview", exact: true },
  { href: "/developers/quickstart", label: "Quickstart" },
  { href: "/developers/flows", label: "Authorization Code + PKCE" },
  { href: "/developers/flows/device", label: "Device Flow" },
  { href: "/developers/scopes", label: "Scopes" },
  { href: "/developers/m2m", label: "Machine to Machine" },
  { href: "/developers/resource-server", label: "Resource Server" },
  { href: "/developers/better-auth", label: "Cliente Better Auth" },
  { href: "/developers/troubleshooting", label: "Solución de problemas" },
];

export default function DevelopersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link href="/developers" className="flex items-center gap-2 font-medium">
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-7 items-center justify-center rounded-lg">
              <CommandIcon className="size-4" />
            </div>
            ISC Auth <span className="text-muted-foreground">/ Developers</span>
          </Link>
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground text-sm"
          >
            Volver al inicio
          </Link>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-10 px-6 py-8">
        <aside className="hidden w-52 shrink-0 md:block">
          <nav className="sticky top-8 flex flex-col gap-1">
            <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
              Guías
            </p>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-muted-foreground hover:bg-accent hover:text-foreground rounded-md px-3 py-1.5 text-sm",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 pb-24">{children}</main>
      </div>
    </div>
  );
}
