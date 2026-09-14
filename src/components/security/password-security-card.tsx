"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function PasswordSecurityCard({
    request,
}: {
    request: <T>(payload: Record<string, unknown>) => Promise<T>;
}) {
    const router = useRouter();
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<string>();
    const [error, setError] = useState(false);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const values = Object.fromEntries(new FormData(form));

        if (values.newPassword !== values.confirmPassword) {
            setError(true);
            setMessage("Las contraseñas nuevas no coinciden.");
            return;
        }

        try {
            setBusy(true);
            setError(false);
            setMessage(undefined);
            const value = await request<{ reloginRequired?: boolean }>({
                action: "change_password",
                currentPassword: values.currentPassword,
                newPassword: values.newPassword,
            });
            form.reset();

            if (value.reloginRequired) {
                router.push("/login");
                router.refresh();
                return;
            }

            setMessage("Contraseña actualizada correctamente.");
        } catch (reason) {
            setError(true);
            setMessage(reason instanceof Error ? reason.message : "No se pudo cambiar la contraseña.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Cambiar contraseña</CardTitle>
                <CardDescription>Al actualizarla se cerrarán las demás sesiones activas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {message && <Alert variant={error ? "destructive" : "default"}><AlertDescription>{message}</AlertDescription></Alert>}
                <form className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]" onSubmit={submit}>
                    <Input name="currentPassword" type="password" autoComplete="current-password" placeholder="Contraseña actual" required />
                    <Input name="newPassword" type="password" autoComplete="new-password" placeholder="Nueva contraseña" minLength={12} required />
                    <Input name="confirmPassword" type="password" autoComplete="new-password" placeholder="Repite la contraseña" minLength={12} required />
                    <Button type="submit" disabled={busy}>
                        {busy ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
                        {busy ? "Actualizando…" : "Actualizar"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}