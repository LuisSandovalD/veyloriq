"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CircleAlert, Loader2, MailCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function VerifyForm({ token }: { token: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function verify() {
    if (!token || state === "loading") return;
    setState("loading"); setMessage("");
    try {
      const response = await fetch("/api/auth/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
      const body = await response.json() as { message?: string; error?: { message?: string } };
      if (!response.ok) { setMessage(body.error?.message ?? "El enlace no es válido o ya venció."); setState("error"); return }
      router.replace("/onboarding"); router.refresh();
    } catch { setMessage("No se pudo conectar con el servidor."); setState("error") }
  }

  return <Card className="w-full"><CardContent className="p-6 sm:p-8">
    <div className="flex flex-col items-center text-center">
      <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><MailCheck className="size-7" /></div>
      <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Verifica tu correo</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Confirma tu dirección de correo electrónico para activar tu cuenta y continuar con la configuración.</p>
    </div>
    <Button type="button" size="lg" className="group mt-7 w-full" disabled={!token || state === "loading"} onClick={() => void verify()}>
      {state === "loading" ? <><Loader2 className="animate-spin" />Verificando...</> : <>Verificar correo<ArrowRight className="transition-transform group-hover:translate-x-0.5" /></>}
    </Button>
    {state === "error" && <Alert variant="destructive" className="mt-4"><CircleAlert className="size-4" /><AlertTitle>No pudimos verificar tu correo</AlertTitle><AlertDescription>{message}</AlertDescription></Alert>}
  </CardContent></Card>;
}