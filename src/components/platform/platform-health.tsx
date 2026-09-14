"use client";

import { HeartPulse, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type Row = Record<string, unknown>;

export function PlatformHealth({
    services,
    jobs,
    outbox,
    action,
}: {
    services: Record<string, Row>;
    jobs: Row[];
    outbox: Row[];
    action: (payload: Row) => Promise<void>;
}) {
    async function retry(payload: Row) {
        const reason = window.prompt("Motivo del reprocesamiento");
        if (!reason?.trim()) return;
        await action({ ...payload, reason: reason.trim() });
    }

    return (
        <div className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Object.entries(services).map(([key, value]) => (
                    <Card key={key}>
                        <CardHeader>
                            <HeartPulse className="size-5 text-muted-foreground" />
                            <CardTitle className="text-base">{key}</CardTitle>
                        </CardHeader>

                        <CardContent className="space-y-3">
                            <Badge variant="outline">{String(value.status ?? "OBSERVADO")}</Badge>
                            <p className="text-sm text-muted-foreground">
                                {value.lastHeartbeat
                                    ? `Último heartbeat: ${new Date(String(value.lastHeartbeat)).toLocaleString("es-PE")}`
                                    : "El estado no se declara saludable sin comprobación activa."}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {jobs.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-lg font-semibold">Trabajos fallidos</h2>

                    <div className="overflow-hidden rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Error</TableHead>
                                    <TableHead className="text-right">Acción</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {jobs.map((job) => (
                                    <TableRow key={String(job.id)}>
                                        <TableCell>{String(job.type)}</TableCell>
                                        <TableCell><Badge variant="outline">{String(job.status)}</Badge></TableCell>
                                        <TableCell className="max-w-md truncate">
                                            {String(job.lastError ?? "—")}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    void retry({ action: "retry_job", jobId: job.id })
                                                }
                                            >
                                                <RotateCcw className="size-4" />
                                                Reintentar
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            {outbox.length > 0 && (
                <div className="space-y-3">
                    <h2 className="text-lg font-semibold">Eventos externos fallidos</h2>

                    <div className="overflow-hidden rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tópico</TableHead>
                                    <TableHead>Intentos</TableHead>
                                    <TableHead>Error</TableHead>
                                    <TableHead className="text-right">Acción</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {outbox.map((event) => (
                                    <TableRow key={String(event.id)}>
                                        <TableCell>{String(event.topic)}</TableCell>
                                        <TableCell>{String(event.attempts)}</TableCell>
                                        <TableCell className="max-w-md truncate">
                                            {String(event.lastError ?? "—")}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    void retry({
                                                        action: "retry_outbox",
                                                        outboxEventId: event.id,
                                                    })
                                                }
                                            >
                                                <RotateCcw className="size-4" />
                                                Reintentar
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}
        </div>
    );
}