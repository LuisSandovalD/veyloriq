"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, Download, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Setup = { setupToken: string; uri: string; recoveryCodes: string[] };

export function PlatformMfaSetup() {
    const router = useRouter();
    const [setup, setSetup] = useState<Setup>();
    const [error, setError] = useState<string>();
    const [busy, setBusy] = useState(false);
    const [copied, setCopied] = useState(false);

    async function start(event: FormEvent<HTMLFormElement>) {
        event.preventDefault(); setBusy(true); setError(undefined);
        try {
            const password = String(new FormData(event.currentTarget).get("password"));
            const response = await fetch("/api/auth/mfa", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "setup", password }) });
            const value = await response.json() as Setup & { error?: { message?: string } };
            if (!response.ok) throw new Error(value.error?.message ?? "No se pudo iniciar MFA.");
            setSetup(value);
        } catch (reason) { setError(reason instanceof Error ? reason.message : "Error inesperado.") }
        finally { setBusy(false) }
    }

    async function confirm(event: FormEvent<HTMLFormElement>) {
        event.preventDefault(); if (!setup) return;
        setBusy(true); setError(undefined);
        try {
            const code = String(new FormData(event.currentTarget).get("code")).replace(/\D/g, "").slice(0, 6);
            const response = await fetch("/api/auth/mfa", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "confirm", setupToken: setup.setupToken, code }) });
            const value = await response.json() as { error?: { message?: string } };
            if (!response.ok) throw new Error(value.error?.message ?? "Código incorrecto.");
            router.replace("/platform"); router.refresh();
        } catch (reason) { setError(reason instanceof Error ? reason.message : "Error inesperado.") }
        finally { setBusy(false) }
    }

    async function copyCodes() {
        if (!setup) return;
        await navigator.clipboard.writeText(setup.recoveryCodes.join("\n"));
        setCopied(true); setTimeout(() => setCopied(false), 1500);
    }

    function downloadCodes() {
        if (!setup) return;
        const text = `VEYLORIQ - Códigos de recuperación MFA\n\nGuarda este archivo en un lugar seguro.\nCada código puede utilizarse una sola vez.\n\n${setup.recoveryCodes.join("\n")}\n`;
        const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
        const link = document.createElement("a");
        link.href = url; link.download = "veyloriq-recovery-codes.txt"; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
    }

    return <Card className="w-full max-w-xl">
        <CardHeader>
            <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><ShieldCheck className="size-5" /></div>
            <CardTitle>Protege la cuenta de plataforma</CardTitle>
            <CardDescription>MFA es obligatorio antes de abrir la consola global.</CardDescription>
        </CardHeader>
        <CardContent>
            {!setup ?
                <form onSubmit={start} className="space-y-5">
                    <div className="space-y-2"><Label htmlFor="platform-password">Contraseña actual</Label><Input id="platform-password" name="password" type="password" autoComplete="current-password" required /></div>
                    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                    <Button type="submit" className="w-full" disabled={busy}>{busy ? <><Loader2 className="size-4 animate-spin" />Preparando…</> : <><KeyRound className="size-4" />Configurar autenticador</>}</Button>
                </form>
                :
                <form onSubmit={confirm} className="space-y-6">
                    <div className="flex flex-col items-center rounded-xl border bg-muted/20 p-6">
                        <div className="rounded-xl bg-white p-4"><QRCodeSVG value={setup.uri} size={200} level="M" /></div>
                        <p className="mt-4 text-center text-sm text-muted-foreground">Escanea este código con Google Authenticator, Microsoft Authenticator, Authy u otra aplicación compatible.</p>
                    </div>

                    <div className="space-y-3">
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                            <div><Label>Códigos de recuperación</Label><p className="mt-1 text-sm text-muted-foreground">Guárdalos ahora. Cada código funciona una sola vez.</p></div>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => void copyCodes()}>{copied ? <Check className="size-4" /> : <Copy className="size-4" />}{copied ? "Copiado" : "Copiar"}</Button>
                                <Button type="button" variant="outline" size="sm" onClick={downloadCodes}><Download className="size-4" />Descargar TXT</Button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/30 p-4 sm:grid-cols-3">{setup.recoveryCodes.map((code) => <code key={code} className="text-center text-xs font-medium">{code}</code>)}</div>
                    </div>

                    <div className="space-y-2"><Label htmlFor="platform-code">Código de 6 dígitos</Label><Input id="platform-code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="000000" className="text-center font-mono text-lg tracking-[.35em]" required /></div>
                    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
                    <Button type="submit" className="w-full" disabled={busy}>{busy ? <><Loader2 className="size-4 animate-spin" />Verificando…</> : <><ShieldCheck className="size-4" />Activar y entrar</>}</Button>
                </form>
            }
        </CardContent>
    </Card>;
}