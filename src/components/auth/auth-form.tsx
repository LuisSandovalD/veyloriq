"use client";

import Link from "next/link";
import type { Route } from "next";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type FormValues = { email: string; password: string; displayName?: string; organizationName?: string };
type Message = { type: "success" | "error"; text: string };

const loginSchema = z.object({ email: z.string().trim().email("Ingresa un correo válido"), password: z.string().min(1, "Ingresa tu contraseña"), displayName: z.string().optional(), organizationName: z.string().optional() });
const registerSchema = z.object({ email: z.string().trim().email("Ingresa un correo válido").max(254), password: z.string().min(12, "Usa al menos 12 caracteres").max(128, "La contraseña es demasiado larga").regex(/[a-z]/, "Incluye una letra minúscula").regex(/[A-Z]/, "Incluye una letra mayúscula").regex(/\d/, "Incluye un número"), displayName: z.string().trim().min(2, "Ingresa tu nombre").max(100), organizationName: z.string().trim().min(2, "Ingresa el nombre de tu empresa").max(120) });

export function AuthForm({ mode, returnTo }: { mode: "login" | "register"; returnTo?: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<Message>();
  const [mfaChallenge, setMfaChallenge] = useState<string>();
  const [mfaCode, setMfaCode] = useState("");
  const [postMfaRedirect, setPostMfaRedirect] = useState("/app");
  const [mfaLoading, setMfaLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(mode === "register" ? registerSchema : loginSchema), defaultValues: { email: "", password: "", displayName: "", organizationName: "" } });
  const redirect = (fallback: string) => returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : fallback;

  const onSubmit = handleSubmit(async (values) => {
    setMessage(undefined);
    try {
      const payload = mode === "login" ? { email: values.email, password: values.password } : { email: values.email, password: values.password, displayName: values.displayName, organizationName: values.organizationName, currency: "PEN", timeZone: "America/Lima" };
      const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json() as { message?: string; error?: { message?: string }; mfaRequired?: boolean; challenge?: string; redirectTo?: string };
      if (!response.ok) return setMessage({ type: "error", text: body.error?.message ?? "No se pudo completar la operación." });
      if (body.mfaRequired && body.challenge) { setMfaChallenge(body.challenge); setPostMfaRedirect(body.redirectTo ?? "/app"); return }
      if (mode === "login") { router.replace(redirect(body.redirectTo ?? "/app") as Route); router.refresh(); return }
      setMessage({ type: "success", text: body.message ?? "Cuenta creada. Revisa tu correo para verificarla." });
    } catch { setMessage({ type: "error", text: "No se pudo conectar con el servidor." }) }
  });

  async function submitMfa(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!mfaChallenge || mfaCode.length !== 6) return;
    setMfaLoading(true); setMessage(undefined);
    try {
      const response = await fetch("/api/auth/mfa", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "challenge", challenge: mfaChallenge, code: mfaCode }) });
      const body = await response.json() as { error?: { message?: string } };
      if (!response.ok) return setMessage({ type: "error", text: body.error?.message ?? "No se pudo verificar el código." });
      router.replace(redirect(postMfaRedirect) as Route); router.refresh();
    } catch { setMessage({ type: "error", text: "No se pudo conectar con el servidor." }) }
    finally { setMfaLoading(false) }
  }

  if (mfaChallenge) return <form onSubmit={submitMfa} className="space-y-5">
    <Field>
      <FieldLabel htmlFor="mfa-code">Código de autenticación</FieldLabel>
      <Input id="mfa-code" value={mfaCode} onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus className="h-11 text-center text-lg tracking-[.4em]" />
      <FieldDescription>Ingresa el código de 6 dígitos de tu aplicación de autenticación.</FieldDescription>
    </Field>
    {message?.type === "error" && <Alert variant="destructive"><AlertDescription>{message.text}</AlertDescription></Alert>}
    <Button type="submit" size="lg" className="w-full" disabled={mfaLoading || mfaCode.length !== 6}>{mfaLoading ? <><Loader2 className="animate-spin" />Verificando…</> : <>Verificar<ArrowRight /></>}</Button>
  </form>;

  return <form onSubmit={onSubmit} noValidate className="space-y-5">
    {mode === "register" && <>
      <Field data-invalid={Boolean(errors.displayName)}>
        <FieldLabel htmlFor="displayName">Nombre</FieldLabel>
        <Input id="displayName" placeholder="Nombre completo" autoComplete="name" aria-invalid={Boolean(errors.displayName)} className="h-11" {...register("displayName")} />
        {errors.displayName && <FieldError>{errors.displayName.message}</FieldError>}
      </Field>
      <Field data-invalid={Boolean(errors.organizationName)}>
        <FieldLabel htmlFor="organizationName">Empresa</FieldLabel>
        <Input id="organizationName" placeholder="Nombre de tu empresa" autoComplete="organization" aria-invalid={Boolean(errors.organizationName)} className="h-11" {...register("organizationName")} />
        {errors.organizationName && <FieldError>{errors.organizationName.message}</FieldError>}
      </Field>
    </>}
    <Field data-invalid={Boolean(errors.email)}>
      <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
      <Input id="email" type="email" placeholder="nombre@empresa.com" autoComplete="email" aria-invalid={Boolean(errors.email)} className="h-11" {...register("email")} />
      {errors.email && <FieldError>{errors.email.message}</FieldError>}
    </Field>
    <Field data-invalid={Boolean(errors.password)}>
      <div className="flex items-center justify-between gap-3">
        <FieldLabel htmlFor="password">Contraseña</FieldLabel>
        {mode === "login" && <Link href="/reset-password" className="text-xs text-muted-foreground transition-colors hover:text-foreground">¿La olvidaste?</Link>}
      </div>
      <div className="relative">
        <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••••••" autoComplete={mode === "login" ? "current-password" : "new-password"} aria-invalid={Boolean(errors.password)} className="h-11 pr-11" {...register("password")} />
        <Button type="button" variant="ghost" size="icon-sm" onClick={() => setShowPassword((v) => !v)} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>{showPassword ? <EyeOff /> : <Eye />}</Button>
      </div>
      {errors.password ? <FieldError>{errors.password.message}</FieldError> : mode === "register" && <FieldDescription>Usa al menos 12 caracteres, una minúscula, una mayúscula y un número.</FieldDescription>}
    </Field>
    {message?.type === "error" && <Alert variant="destructive"><AlertDescription>{message.text}</AlertDescription></Alert>}
    {message?.type === "success" && <Alert><CheckCircle2 className="size-4" /><AlertDescription>{message.text}</AlertDescription></Alert>}
    <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>{isSubmitting ? <><Loader2 className="animate-spin" />Procesando…</> : <>{mode === "login" ? "Ingresar" : "Crear cuenta"}<ArrowRight /></>}</Button>
    <p className="text-center text-sm text-muted-foreground">{mode === "login" ? <>¿No tienes cuenta? <Link href="/register" className="font-medium text-foreground hover:underline">Crear cuenta</Link></> : <>¿Ya tienes cuenta? <Link href="/login" className="font-medium text-foreground hover:underline">Ingresar</Link></>}</p>
  </form>;
}