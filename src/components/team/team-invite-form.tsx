"use client";

import { useState, type FormEvent } from "react";
import { Loader2, MailPlus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { TeamRole } from "./team-panel";

export function TeamInviteForm({
    roles,
    onInvite,
}: {
    roles: TeamRole[];
    onInvite: (payload: Record<string, unknown>) => Promise<void>;
}) {
    const [email, setEmail] = useState("");
    const [roleId, setRoleId] = useState("__none__");
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<string>();
    const [error, setError] = useState(false);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!email || roleId === "__none__") {
            setError(true);
            setMessage("Ingresa un correo y selecciona un rol.");
            return;
        }

        try {
            setBusy(true);
            setError(false);
            setMessage(undefined);
            await onInvite({ action: "invite", email: email.trim(), roleId });
            setEmail("");
            setRoleId("__none__");
            setMessage("Invitación enviada correctamente.");
        } catch (reason) {
            setError(true);
            setMessage(reason instanceof Error ? reason.message : "No se pudo enviar la invitación.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Invitar miembro</CardTitle>
                <CardDescription>Envía una invitación y asigna el rol inicial del nuevo miembro.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {message && <Alert variant={error ? "destructive" : "default"}><AlertDescription>{message}</AlertDescription></Alert>}
                <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_220px_auto]">
                    <Input type="email" autoComplete="email" placeholder="correo@empresa.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
                    <Select value={roleId} disabled={busy} onValueChange={(value) => value && setRoleId(value)}>
                        <SelectTrigger className="w-full"><SelectValue placeholder="Selecciona un rol" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__none__">Seleccionar rol</SelectItem>
                            {roles.filter((role) => role.name !== "OWNER").map((role) => <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button type="submit" disabled={busy || !email || roleId === "__none__"}>
                        {busy ? <Loader2 className="size-4 animate-spin" /> : <MailPlus className="size-4" />}
                        {busy ? "Enviando…" : "Invitar"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}