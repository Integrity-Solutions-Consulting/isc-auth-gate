// ponytail: sin `import "./env/server"` / `"./env/client"` (patrón de la doc
// de t3-env). Ese import valida el env al cargar next.config, y Next lo carga
// ANTES de fijar NEXT_PHASE: el build exigiría los secretos de runtime. La
// imagen se construye sin ellos a propósito; la validación corre al arrancar
// el contenedor (entrypoint.ts importa @/env/server).

import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,
  // SHA del build (ARG APP_VERSION del Containerfile), compilado en el bundle
  // del servidor para /api/health. No es secreto. El health check post-deploy
  // de los workflows exige que coincida con el SHA desplegado.
  env: { APP_VERSION: process.env.APP_VERSION ?? "local" },
  // Solo hostname (sin esquema ni puerto); localhost ya está permitido
  allowedDevOrigins: ["192.168.100.227"],
  // Add the packages in transpilePackages
  transpilePackages: ["@t3-oss/env-nextjs", "@t3-oss/env-core"],
  rewrites: async () => {
    return [
      {
        source: "/healthz",
        destination: "/api/health",
      },
    ];
  },
};

export default nextConfig;
