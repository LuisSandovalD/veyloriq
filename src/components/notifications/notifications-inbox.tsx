"use client";

import { Bell, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type Row = Record<string, unknown>;

export function NotificationsInbox({
    items,
    loading,
    onRead,
}: {
    items: Row[];
    loading: boolean;
    onRead: (id: string) => Promise<void>;
}) {
    if (loading) {
        return (
            <Card>
                <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Cargando notificaciones…
                </CardContent>
            </Card>
        );
    }

    if (!items.length) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted">
                        <Bell className="size-5 text-muted-foreground" />
                    </div>

                    <p className="font-medium">No hay notificaciones</p>

                    <p className="mt-1 text-sm text-muted-foreground">
                        Las alertas del espacio aparecerán aquí.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="overflow-hidden py-0">
            <CardContent className="p-0">
                {items.map((item) => {
                    const unread = !item.readAt;

                    return (
                        <button
                            key={String(item.id)}
                            type="button"
                            onClick={() => void onRead(String(item.id))}
                            className={`block w-full border-b px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-muted/50 ${unread ? "bg-muted/40" : "bg-background"
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                <div
                                    className={`mt-1.5 size-2 shrink-0 rounded-full ${unread ? "bg-primary" : "bg-muted-foreground/25"
                                        }`}
                                />

                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-foreground">
                                        {String(item.title ?? "Notificación")}
                                    </p>

                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {String(item.body ?? "")}
                                    </p>

                                    <p className="mt-2 text-xs text-muted-foreground">
                                        {new Date(
                                            String(item.createdAt),
                                        ).toLocaleString("es-PE")}

                                        {item.resourceType
                                            ? ` · ${String(item.resourceType)}`
                                            : ""}
                                    </p>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </CardContent>
        </Card>
    );
}