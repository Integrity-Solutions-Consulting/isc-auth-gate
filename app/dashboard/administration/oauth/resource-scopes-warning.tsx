"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { TriangleAlertIcon } from "lucide-react";
import { parseAllowedScopes } from "./resource-schema";

const OIDC_SCOPES = ["openid", "profile", "email", "offline_access"];

/**
 * Con `resource`, el gate emite sólo requestedScopes ∩ allowedScopes. Si la
 * lista no trae `openid`, una app que inicia sesión con el gate se queda sin
 * id_token y /oauth2/userinfo responde 400 → `unable_to_get_user_info`.
 * Lista vacía = sin recorte, no avisa.
 */
export const ResourceScopesWarning = ({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (value: string) => void;
}) => {
  const scopes = parseAllowedScopes(value);
  if (scopes.length === 0 || scopes.includes("openid")) return null;

  const missing = OIDC_SCOPES.filter((s) => !scopes.includes(s));

  return (
    <Alert>
      <TriangleAlertIcon />
      <AlertTitle>Falta el scope openid</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-2">
        <span>
          Los tokens para este resource sólo llevan los scopes de esta lista.
          Sin <code className="font-mono">openid</code>, las apps que inician
          sesión con el gate no reciben id_token y fallan con{" "}
          <code className="font-mono">unable_to_get_user_info</code>. Si el
          resource sólo lo usan APIs (client_credentials), ignora este aviso.
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...missing, ...scopes].join(", "))}
        >
          Añadir {missing.join(", ")}
        </Button>
      </AlertDescription>
    </Alert>
  );
};
