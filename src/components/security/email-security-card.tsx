"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Mail } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function EmailSecurityCard({
    email,
    request,
}: {
    email: string;
    request: <T>(payload: Record<string, unknown>) => Promise<T>;
}) {
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<string>();
    const [error, setError] = useState(false);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const values = Object.fromEntries(new FormData(form));
        try {
            setBusy(true);
            setError(false);
            setMessage(undefined);
            const value = await request<{ message?: string }>({
                action: "request_email_change",
                currentPassword: values.currentPassword,
                newEmail: values.newEmail,
            });
            form.reset();
            setMessage(value.message ?? "Revisa tu nuevo correo para confirmar el cambio.");
        } catch (reason) {
            setError(true);
            setMessage(reason instanceof Error ? reason.message : "No se pudo solicitar el cambio de correo.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Cambiar correo de acceso</CardTitle>
                <CardDescription>Correo actual: {email || "—"}. El cambio se aplica después de confirmar la nueva dirección.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {message && <Alert variant={error ? "destructive" : "default"}><AlertDescription>{message}</AlertDescription></Alert>}
                <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={submit}>
                    <Input name="newEmail" type="email" autoComplete="email" placeholder="Nuevo correo" required />
                    <Input name="currentPassword" type="password" autoComplete="current-password" placeholder="Contraseña actual" required />
                    <Button type="submit" disabled={busy}>
                        {busy ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                        {busy ? "Enviando…" : "Enviar confirmación"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}