"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export function EmailChangeConfirmForm({
  token,
}: {
  token: string;
}) {
  const router = useRouter();

  const [state, setState] = useState<
    "idle" | "loading" | "error"
  >("idle");

  async function confirm() {
    if (!token || state === "loading") return;

    try {
      setState("loading");

      const response = await fetch("/api/auth/security", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          action: "confirm_email_change",
          token,
        }),
      });

      if (!response.ok) {
        setState("error");
        return;
      }

      router.push("/login?emailChanged=1");
      router.refresh();
    } catch {
      setState("error");
    }
  }

  return (
    <div className="space-y-4">
      <Button
        type="button"
        className="w-full"
        disabled={!token || state === "loading"}
        onClick={() => void confirm()}
      >
        {state === "loading" ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Confirmando…
          </>
        ) : (
          <>
            <CheckCircle2 className="size-4" />
            Confirmar nuevo correo
          </>
        )}
      </Button>

      {state === "error" && (
        <Alert variant="destructive">
          <AlertDescription>
            El enlace no es válido, ya fue utilizado o venció.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}