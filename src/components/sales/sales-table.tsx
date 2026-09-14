"use client";

import { PackageCheck, RotateCcw, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Row = Record<string, unknown>;

export function SalesTable({
    orders,
    onProgress,
    onCancel,
    onReturn,
}: {
    orders: Row[];
    onProgress: (order: Row) => void;
    onCancel: (order: Row) => void;
    onReturn: (order: Row) => void;
}) {
    return (
        <div className="overflow-hidden rounded-lg border border-border">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Pedido</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Despachos</TableHead>
                            <TableHead>Devoluciones</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {orders.map((order) => {
                            const status = String(order.status);
                            const progressable = ["DRAFT", "CONFIRMED", "PREPARING", "PARTIALLY_SHIPPED", "SHIPPED"].includes(status);
                            const cancellable = ["DRAFT", "CONFIRMED", "PREPARING", "PARTIALLY_SHIPPED"].includes(status);
                            const returnable = ["SHIPPED", "COMPLETED"].includes(status);

                            return (
                                <TableRow key={String(order.id)}>
                                    <TableCell className="font-medium">{String(order.number)}</TableCell>
                                    <TableCell>{String((order.customer as Row | undefined)?.name ?? "—")}</TableCell>
                                    <TableCell><Badge variant="outline">{status}</Badge></TableCell>
                                    <TableCell>{String(order.currency)} {String(order.total)}</TableCell>
                                    <TableCell>{(order.shipments as Row[] | undefined)?.length ?? 0}</TableCell>
                                    <TableCell>{(order.returns as Row[] | undefined)?.length ?? 0}</TableCell>

                                    <TableCell>
                                        <div className="flex flex-wrap justify-end gap-1">
                                            {progressable && (
                                                <Button type="button" variant="outline" size="sm" onClick={() => onProgress(order)}>
                                                    <PackageCheck className="size-4" />
                                                    {status === "DRAFT"
                                                        ? "Confirmar"
                                                        : status === "CONFIRMED"
                                                            ? "Preparar"
                                                            : ["PREPARING", "PARTIALLY_SHIPPED"].includes(status)
                                                                ? "Despachar"
                                                                : "Completar"}
                                                </Button>
                                            )}

                                            {cancellable && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-destructive hover:text-destructive"
                                                    onClick={() => onCancel(order)}
                                                >
                                                    <XCircle className="size-4" />
                                                    Cancelar
                                                </Button>
                                            )}

                                            {returnable && (
                                                <Button type="button" variant="ghost" size="sm" onClick={() => onReturn(order)}>
                                                    <RotateCcw className="size-4" />
                                                    Devolver
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}

                        {!orders.length && (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                    Aún no hay pedidos.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}