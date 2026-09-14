"use client";

import { useState } from "react";
import { Loader2, LogOut, MonitorSmartphone } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { SecuritySession } from "./security-panel";

export function SessionsSecurityCard({
    sessions,
    request,
    onChanged,
}: {
    sessions: SecuritySession[];
    request: <T>(payload: Record<string, unknown>) => Promise<T>;
    onChanged: () => Promise<void>;
}) {
    const [busy, setBusy] = useState<string>();
    const [error, setError] = useState<string>();

    async function action(payload: Record<string, unknown>, key: string) {
        try {
            setBusy(key);
            setError(undefined);
            await request<{ ok?: boolean }>(payload);
            await onChanged();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "No se pudo revocar la sesión.");
        } finally {
            setBusy(undefined);
        }
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                    <CardTitle>Sesiones activas</CardTitle>
                    <CardDescription>Administra los dispositivos que actualmente tienen acceso a tu cuenta.</CardDescription>
                </div>

                <Button type="button" variant="outline" size="sm" disabled={Boolean(busy) || !sessions.length} onClick={() => void action({ action: "revoke_others" }, "all")}>
                    {busy === "all" ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
                    Cerrar las demás
                </Button>
            </CardHeader>

            <CardContent className="space-y-4">
                {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

                {sessions.length ? (
                    <div className="divide-y">
                        {sessions.map((session) => {
                            const sessionBusy = busy === session.id;
                            return (
                                <div key={session.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex min-w-0 items-start gap-3">
                                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                                            <MonitorSmartphone className="size-4 text-muted-foreground" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium">{session.userAgent || "Dispositivo desconocido"}</p>
                                            <p className="mt-1 text-xs text-muted-foreground">
                                                Última actividad {session.lastSeenAt ? new Date(session.lastSeenAt).toLocaleString("es-PE") : "desconocida"}
                                            </p>
                                        </div>
                                    </div>

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        disabled={Boolean(busy)}
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => void action({ action: "revoke_session", sessionId: session.id }, session.id)}
                                    >
                                        {sessionBusy && <Loader2 className="size-4 animate-spin" />}
                                        {sessionBusy ? "Revocando…" : "Revocar"}
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="py-8 text-center">
                        <MonitorSmartphone className="mx-auto size-8 text-muted-foreground" />
                        <p className="mt-3 text-sm font-medium">No hay sesiones activas</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}