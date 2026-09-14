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

export function PlatformBilling({
    billingEvents,
    usage,
}: {
    billingEvents: Row[];
    usage: Row[];
}) {
    const show = (value: unknown) =>
        value && typeof value === "object"
            ? JSON.stringify(value)
            : String(value ?? "—");

    return (
        <div className="space-y-8">
            <div className="space-y-3">
                <h2 className="text-lg font-semibold">Eventos de cobro</h2>

                <div className="overflow-hidden rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Importe</TableHead>
                                <TableHead>Moneda</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {billingEvents.map((row, index) => (
                                <TableRow key={String(row.id ?? index)}>
                                    <TableCell>{show(row.occurredAt)}</TableCell>
                                    <TableCell>{show(row.type)}</TableCell>
                                    <TableCell>{show(row.status)}</TableCell>
                                    <TableCell>{show(row.amount)}</TableCell>
                                    <TableCell>{show(row.currency)}</TableCell>
                                </TableRow>
                            ))}

                            {!billingEvents.length && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        No hay eventos de cobro.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <div className="space-y-3">
                <h2 className="text-lg font-semibold">Consumo agregado</h2>

                <div className="overflow-hidden rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Métrica</TableHead>
                                <TableHead>Total</TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {usage.map((row, index) => (
                                <TableRow key={String(row.id ?? index)}>
                                    <TableCell>{show(row.metric)}</TableCell>
                                    <TableCell>{show(row._sum)}</TableCell>
                                </TableRow>
                            ))}

                            {!usage.length && (
                                <TableRow>
                                    <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                                        No hay consumo registrado.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}