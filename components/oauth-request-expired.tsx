"use client";

import { ClockAlertIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { oauthExpiredHref } from "@/lib/oauth-flow";

/**
 * Aviso de solicitud OAuth caducada (invalid_signature): la query firmada del
 * authorize ya no vale y no se puede continuar aquí; la app debe reiniciar el
 * inicio de sesión.
 */
export function OAuthRequestExpired() {
  return (
    <div className="flex flex-col gap-3">
      <Alert variant="destructive" role="alert" aria-live="assertive">
        <ClockAlertIcon />
        <AlertTitle>La solicitud de inicio de sesión expiró</AlertTitle>
        <AlertDescription>
          Pasó demasiado tiempo desde que la aplicación te envió aquí o el enlace
          ya no es válido. Vuelve a la aplicación para iniciar sesión de nuevo.
        </AlertDescription>
      </Alert>
      <Button
        type="button"
        className="w-full"
        onClick={() => window.location.assign(oauthExpiredHref(window.location.search))}
      >
        Volver a la aplicación
      </Button>
    </div>
  );
}
