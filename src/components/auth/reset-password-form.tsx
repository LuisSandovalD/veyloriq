"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, LockKeyhole, Mail } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm({ token }: { token?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(undefined);
    setError(false);

    try {
      const response = await fetch("/api/auth/security", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          token
            ? { action: "confirm_reset", token, newPassword: password }
            : { action: "request_reset", email },
        ),
      });

      const result = await response.json() as {
        message?: string;
        error?: { message?: string };
      };

      if (!response.ok) {
        setError(true);
        setMessage(result.error?.message ?? "No se pudo completar.");
        return;
      }

      if (token) {
        router.push("/login");
        router.refresh();
        return;
      }

      setMessage(result.message ?? "Revisa tu correo para continuar.");
    } catch {
      setError(true);
      setMessage("No se pudo conectar con el servidor.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor={token ? "newPassword" : "resetEmail"}>
          {token ? "Nueva contraseña" : "Correo de la cuenta"}
        </Label>

        <div className="relative">
          {token ? (
            <LockKeyhole className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          ) : (
            <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          )}

          <Input
            id={token ? "newPassword" : "resetEmail"}
            type={token ? "password" : "email"}
            value={token ? password : email}
            onChange={(event) => token ? setPassword(event.target.value) : setEmail(event.target.value)}
            autoComplete={token ? "new-password" : "email"}
            placeholder={token ? "Ingresa tu nueva contraseña" : "correo@empresa.com"}
            className="pl-9"
            minLength={token ? 12 : undefined}
            required
          />
        </div>
      </div>

      {message && (
        <Alert variant={error ? "destructive" : "default"}>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Procesando…
          </>
        ) : token ? (
          <>
            Cambiar contraseña
            <ArrowRight className="size-4" />
          </>
        ) : (
          <>
            Enviar instrucciones
            <ArrowRight className="size-4" />
          </>
        )}
      </Button>
    </form>
  );
}