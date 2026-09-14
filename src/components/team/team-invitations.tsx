"use client";

import { useState } from "react";
import { Loader2, RefreshCw, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { TeamInvitation } from "./team-panel";

export function TeamInvitations({
    invitations,
    onAction,
}: {
    invitations: TeamInvitation[];
    onAction: (payload: Record<string, unknown>) => Promise<void>;
}) {
    const [busy, setBusy] = useState<string>();
    const [error, setError] = useState<string>();

    if (!invitations.length) return null;

    async function action(invitation: TeamInvitation, type: "resend" | "revoke_invitation") {
        try {
            setBusy(`${type}:${invitation.id}`);
            setError(undefined);
            await onAction({ action: type, invitationId: invitation.id });
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "No se pudo procesar la invitación.");
        } finally {
            setBusy(undefined);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Invitaciones pendientes</CardTitle>
                <CardDescription>Invitaciones enviadas que todavía no han sido aceptadas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

                <div className="divide-y">
                    {invitations.map((invitation) => {
                        const resendBusy = busy === `resend:${invitation.id}`;
                        const revokeBusy = busy === `revoke_invitation:${invitation.id}`;
                        return (
                            <div key={invitation.id} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                                <div className="text-sm">
                                    <span className="font-medium">{invitation.email}</span>
                                    <span className="text-muted-foreground"> · vence {new Date(invitation.expiresAt).toLocaleDateString("es-PE")}</span>
                                </div>

                                <div className="flex gap-1">
                                    <Button type="button" variant="ghost" size="sm" disabled={Boolean(busy)} onClick={() => void action(invitation, "resend")}>
                                        {resendBusy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                                        {resendBusy ? "Reenviando…" : "Reenviar"}
                                    </Button>
                                    <Button type="button" variant="ghost" size="sm" disabled={Boolean(busy)} className="text-destructive hover:text-destructive" onClick={() => void action(invitation, "revoke_invitation")}>
                                        {revokeBusy ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
                                        {revokeBusy ? "Revocando…" : "Revocar"}
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}