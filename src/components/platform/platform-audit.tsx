"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type Row = Record<string, unknown>;

export function PlatformAudit({ data }: { data: Row[] }) {
    return (
        <div className="overflow-hidden rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Acción</TableHead>
                        <TableHead>Operador</TableHead>
                        <TableHead>Recurso</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Correlación</TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {data.map((row, index) => (
                        <TableRow key={String(row.id ?? index)}>
                            <TableCell>
                                {row.createdAt
                                    ? new Date(String(row.createdAt)).toLocaleString("es-PE")
                                    : "—"}
                            </TableCell>
                            <TableCell>{String(row.action ?? "—")}</TableCell>
                            <TableCell>{String(row.actorId ?? "—")}</TableCell>
                            <TableCell>{String(row.resourceType ?? "—")}</TableCell>
                            <TableCell className="max-w-xs truncate">
                                {String(row.reason ?? "—")}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                                {String(row.correlationId ?? "—")}
                            </TableCell>
                        </TableRow>
                    ))}

                    {!data.length && (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                No hay eventos de auditoría.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}