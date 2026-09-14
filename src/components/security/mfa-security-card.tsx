"use client";

import { useState, type FormEvent } from "react";
import { Check, Copy, Download, Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MfaSetup } from "./security-panel";

export function MfaSecurityCard({
    mfaEnabled,
    request,
    onChanged,
}: {
    mfaEnabled: boolean;
    request: <T>(payload: Record<string, unknown>) => Promise<T>;
    onChanged: () => Promise<void>;
}) {
    const [setup, setSetup] = useState<MfaSetup>();
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<string>();
    const [error, setError] = useState(false);

    function status(message?: string, error = false) {
        setMessage(message);
        setError(error);
    }

    async function start(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(event.currentTarget));
        try {
            setBusy(true);
            status();
            const value = await request<MfaSetup>({ action: "setup", password: values.password });
            setSetup(value);
        } catch (reason) {
            status(reason instanceof Error ? reason.message : "No se pudo configurar MFA.", true);
        } finally {
            setBusy(false);
        }
    }

    async function confirm(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!setup) return;
        const code = String(new FormData(event.currentTarget).get("code") ?? "").trim();
        try {
            setBusy(true);
            status();
            await request<{ ok: boolean }>({ action: "confirm", setupToken: setup.setupToken, code });
            setSetup(undefined);
            status("MFA activado correctamente.");
            await onChanged();
        } catch (reason) {
            status(reason instanceof Error ? reason.message : "No se pudo confirmar MFA.", true);
        } finally {
            setBusy(false);
        }
    }

    async function disable(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(event.currentTarget));
        try {
            setBusy(true);
            status();
            await request<{ ok: boolean }>({
                action: "disable",
                password: values.password,
                code: values.code,
            });
            status("MFA desactivado correctamente.");
            await onChanged();
            event.currentTarget.reset();
        } catch (reason) {
            status(reason instanceof Error ? reason.message : "No se pudo desactivar MFA.", true);
        } finally {
            setBusy(false);
        }
    }

    async function copyRecoveryCodes() {
        if (!setup) return;
        try {
            await navigator.clipboard.writeText(setup.recoveryCodes.join("\n"));
            status("Códigos de recuperación copiados.");
        } catch {
            status("No se pudieron copiar los códigos.", true);
        }
    }

    function downloadRecoveryCodes() {
        if (!setup) return;
        const content = [
            "VEYLORIQ - Códigos de recuperación MFA",
            "",
            "Guarda estos códigos en un lugar seguro. Cada código puede utilizarse una sola vez.",
            "",
            ...setup.recoveryCodes,
        ].join("\n");
        const url = URL.createObjectURL(new Blob([content], { type: "text/plain;charset=utf-8" }));
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "VEYLORIQ-mfa-recovery-codes.txt";
        anchor.click();
        URL.revokeObjectURL(url);
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <CardTitle>Autenticación multifactor</CardTitle>
                        <CardDescription>Protege tu cuenta mediante códigos TOTP generados por una aplicación autenticadora.</CardDescription>
                    </div>
                    <Badge variant={mfaEnabled ? "default" : "secondary"}>{mfaEnabled ? "Activa" : "Inactiva"}</Badge>
                </div>
            </CardHeader>

            <CardContent className="space-y-5">
                {message && <Alert variant={error ? "destructive" : "default"}><AlertDescription>{message}</AlertDescription></Alert>}

                {!mfaEnabled && !setup && (
                    <form className="flex flex-col gap-3 sm:flex-row" onSubmit={start}>
                        <Input name="password" type="password" autoComplete="current-password" placeholder="Contraseña actual" required />
                        <Button type="submit" disabled={busy}>
                            {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                            {busy ? "Preparando…" : "Configurar MFA"}
                        </Button>
                    </form>
                )}

                {!mfaEnabled && setup && (
                    <div className="space-y-6">
                        <div className="space-y-3">
                            <div>
                                <h3 className="text-sm font-medium">1. Escanea el código QR</h3>
                                <p className="mt-1 text-sm text-muted-foreground">Usa Google Authenticator, Microsoft Authenticator, 1Password u otra aplicación compatible con TOTP.</p>
                            </div>

                            <div className="flex justify-center">
                                <div className="rounded-xl border bg-white p-5">
                                    <QRCodeSVG value={setup.uri} size={210} level="M" />
                                </div>
                            </div>

                            <details className="rounded-lg border p-3">
                                <summary className="cursor-pointer text-sm font-medium">Configuración manual</summary>
                                <p className="mt-2 break-all font-mono text-xs text-muted-foreground">{setup.uri}</p>
                            </details>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <h3 className="text-sm font-medium">2. Guarda tus códigos de recuperación</h3>
                                <p className="mt-1 text-sm text-muted-foreground">Solo se muestran durante esta configuración. Cada código debe usarse una sola vez.</p>
                            </div>

                            <div className="grid gap-2 rounded-lg border bg-muted/40 p-4 sm:grid-cols-2">
                                {setup.recoveryCodes.map((code) => <code key={code} className="font-mono text-sm">{code}</code>)}
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => void copyRecoveryCodes()}>
                                    <Copy className="size-4" />Copiar
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={downloadRecoveryCodes}>
                                    <Download className="size-4" />Descargar
                                </Button>
                            </div>
                        </div>

                        <form className="space-y-3" onSubmit={confirm}>
                            <div>
                                <h3 className="text-sm font-medium">3. Confirma la configuración</h3>
                                <p className="mt-1 text-sm text-muted-foreground">Introduce el código de 6 dígitos que aparece en tu autenticador.</p>
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <Input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} placeholder="000000" required />
                                <Button type="submit" disabled={busy}>
                                    {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                                    {busy ? "Confirmando…" : "Confirmar MFA"}
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                {mfaEnabled && (
                    <form className="space-y-4" onSubmit={disable}>
                        <div>
                            <h3 className="text-sm font-medium">Desactivar MFA</h3>
                            <p className="mt-1 text-sm text-muted-foreground">Requiere tu contraseña y un código TOTP o código de recuperación.</p>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="mfa-disable-password">Contraseña actual</Label>
                                <Input id="mfa-disable-password" name="password" type="password" autoComplete="current-password" required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="mfa-disable-code">Código MFA</Label>
                                <Input id="mfa-disable-code" name="code" autoComplete="one-time-code" placeholder="TOTP o código de recuperación" required />
                            </div>
                        </div>
                        <Button type="submit" variant="destructive" disabled={busy}>
                            {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldOff className="size-4" />}
                            {busy ? "Desactivando…" : "Desactivar MFA"}
                        </Button>
                    </form>
                )}
            </CardContent>
        </Card>
    );
}