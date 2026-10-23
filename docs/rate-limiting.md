# Rate limiting

Better Auth incluye rate limiting nativo. Está **habilitado en todos los
entornos** (`rateLimit.enabled: true` en `lib/auth/server/config/rate-limit.ts`).

## Backends

| Backend | Cuándo | Compartido entre instancias |
|---------|--------|------------------------------|
| `memory` (default) | `BETTER_AUTH_RATE_LIMIT_STORAGE` ausente o `memory` | No — por instancia de app |
| `redis` | `BETTER_AUTH_RATE_LIMIT_STORAGE=redis` + `REDIS_URL` | Sí |

> Better Auth NO genera la tabla `rateLimit` en `database/schema.ts` ni la
> auto-crea, por lo que el storage en DB no está disponible sin migración
> manual. Por eso el default es memoria y la opción compartida es Redis.

## Configuración (feature flag)

```bash
# .env
BETTER_AUTH_RATE_LIMIT_STORAGE=redis   # memory | redis
REDIS_URL=redis://host:6379
```

El flag se lee en `lib/rate-limit-storage.ts`. Si es `redis` pero `REDIS_URL`
no está definido, se emite un warning y se cae a memoria. Si Redis llegara a
caer en runtime, el límite **falla abierto** (permite la petición) para no
romper el auth.

## Límites por endpoint

Definidos en `rateLimit.customRules` (`lib/auth/server/config/rate-limit.ts`), relajando las
reglas built-in de Better Auth (que limitan `/sign-in` y `/sign-up` a 3/10s):

- `/sign-in/*`: 10 req/min
- `/sign-up/*`: 5 req/min
- `/two-factor/verify-totp`, `/verify-otp`, `/verify-backup-code`: 10 req/min
- `/forget-password`, `/reset-password`: 5 req/min

El global por defecto es 50 req/min (ventana 60s) para el resto de endpoints.
Los endpoints `/oauth2/*` tienen límites propios del plugin OAuth provider; ver
[oauth-provider.md](./oauth-provider.md#rate-limits).

## Cómo funciona el storage Redis

`createRateLimitStorage()` devuelve un `customStorage` que implementa
`consume(key, { window, max })` de forma atómica con un script Lua:

1. `HMGET` de `count` + `lastRequest` para la clave.
2. Si la ventana venció → reinicia a `count=1`.
3. Si `count >= max` → deniega (`allowed: false`, `retryAfter` en segundos).
4. Si no → incrementa y renueva `EXPIRE` = `window`.

El `EXPIRE` purga las claves solo, sin necesidad de un job de limpieza.

## Alternativa: secondary-storage

Better Auth también soporta `secondaryStorage` (p. ej. `@better-auth/cache-redis`)
que además cachea sesiones en Redis — útil para sesiones compartidas en
multi-nodo, pero con efectos fuera de solo rate limiting. Se descartó en favor
de `rateLimit.customStorage` (acotado al rate limit) para evitar cambios no
deseados en el almacenamiento de sesiones.
