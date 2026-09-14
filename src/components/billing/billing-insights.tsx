import { Clock3, Gauge, History, Layers3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

type PlanRef = {
    id?: string;
    name?: string | null;
    code?: string | null;
};

export type BillingPendingChange = {
    id: string;
    status?: string | null;
    plan?: PlanRef | null;
};

export type BillingUsage = {
    id: string;
    metric?: string | null;
    value?: string | number | null;
    period?: string | null;
};

export type BillingEvent = {
    id: string;
    occurredAt?: string | null;
    type?: string | null;
    status?: string | null;
};

export type BillingResourceValue =
    | string
    | number
    | boolean
    | null;

export function BillingInsights({
    pending,
    resources,
    usage,
    history,
}: {
    pending: BillingPendingChange[];
    resources: Record<
        string,
        BillingResourceValue
    >;
    usage: BillingUsage[];
    history: BillingEvent[];
}) {
    const resourceEntries =
        Object.entries(resources);

    return (
        <div className="space-y-6">
            {pending.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock3 className="size-5" />
                            Cambios pendientes
                        </CardTitle>

                        <CardDescription>
                            Cambios de plan o suscripción que todavía
                            están siendo procesados.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-2">
                        {pending.map((item) => (
                            <div
                                key={item.id}
                                className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
                            >
                                <div>
                                    <p className="font-medium">
                                        {item.plan?.name ??
                                            "Cambio de suscripción"}
                                    </p>

                                    {item.plan?.code && (
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            {item.plan.code}
                                        </p>
                                    )}
                                </div>

                                <Badge variant="secondary">
                                    {item.status ?? "PENDING"}
                                </Badge>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Layers3 className="size-5" />
                        Recursos activos
                    </CardTitle>

                    <CardDescription>
                        Recursos actualmente registrados para tu
                        organización.
                    </CardDescription>
                </CardHeader>

                <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {resourceEntries.map(
                        ([metric, value]) => (
                            <div
                                key={metric}
                                className="rounded-lg border bg-muted/40 p-4"
                            >
                                <p className="text-xs text-muted-foreground">
                                    {metric}
                                </p>

                                <p className="mt-1 text-xl font-semibold">
                                    {value === null
                                        ? "—"
                                        : typeof value === "boolean"
                                            ? value
                                                ? "Sí"
                                                : "No"
                                            : String(value)}
                                </p>
                            </div>
                        ),
                    )}

                    {!resourceEntries.length && (
                        <p className="text-sm text-muted-foreground">
                            Sin recursos registrados.
                        </p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Gauge className="size-5" />
                        Consumo medido
                    </CardTitle>

                    <CardDescription>
                        Uso registrado durante los períodos de
                        facturación.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {usage.length ? (
                        <div className="divide-y">
                            {usage.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <span className="text-sm">
                                        {item.metric ?? "—"}
                                    </span>

                                    <span className="text-sm font-medium">
                                        {item.value ?? "—"}

                                        <span className="ml-1 font-normal text-muted-foreground">
                                            ({item.period ?? "—"})
                                        </span>
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            Sin consumo registrado en el período.
                        </p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="size-5" />
                        Historial de facturación
                    </CardTitle>

                    <CardDescription>
                        Eventos recientes relacionados con la
                        suscripción.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {history.length ? (
                        <div className="divide-y">
                            {history.map((event) => (
                                <div
                                    key={event.id}
                                    className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <span className="text-sm">
                                        {event.occurredAt
                                            ? new Date(
                                                event.occurredAt,
                                            ).toLocaleString("es-PE")
                                            : "—"}
                                    </span>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm text-muted-foreground">
                                            {event.type ?? "—"}
                                        </span>

                                        {event.status && (
                                            <Badge variant="outline">
                                                {event.status}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">
                            Sin eventos de facturación.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}