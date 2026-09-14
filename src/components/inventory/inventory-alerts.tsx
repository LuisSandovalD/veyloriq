"use client";

import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

type Row = Record<string, unknown>;

export function InventoryAlerts({
    alerts,
}: {
    alerts: Row[];
}) {
    const child = (
        row: Row,
        key: string,
        name: string,
    ) =>
        row[key] && typeof row[key] === "object"
            ? String((row[key] as Row)[name] ?? "—")
            : "—";

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="size-5 text-destructive" />
                        Alertas de stock
                    </CardTitle>

                    <CardDescription>
                        Productos por debajo del stock mínimo.
                    </CardDescription>
                </div>

                <Badge variant="destructive">
                    {alerts.length}
                </Badge>
            </CardHeader>

            <CardContent>
                <div className="space-y-3">
                    {alerts.slice(0, 6).map((item) => {
                        const available =
                            Number(item.physical ?? 0) -
                            Number(item.reserved ?? 0);

                        return (
                            <div
                                key={String(item.id)}
                                className="flex flex-col gap-1 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div>
                                    <p className="text-sm font-medium">
                                        {child(item, "product", "name")}
                                    </p>

                                    <p className="text-xs text-muted-foreground">
                                        {child(item, "warehouse", "name")}
                                    </p>
                                </div>

                                <Badge variant="outline">
                                    Disponible: {available}
                                </Badge>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}