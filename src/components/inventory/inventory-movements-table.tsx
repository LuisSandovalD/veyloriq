"use client";

import { Boxes } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type Row = Record<string, unknown>;

export function InventoryMovementsTable({
    movements,
}: {
    movements: Row[];
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
            <CardHeader>
                <CardTitle>Kardex reciente</CardTitle>
                <CardDescription>
                    Promedio ponderado como método de valoración.
                </CardDescription>
            </CardHeader>

            <CardContent className="p-0">
                {!movements.length ? (
                    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                        <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted">
                            <Boxes className="size-5 text-muted-foreground" />
                        </div>

                        <p className="font-medium">
                            Sin movimientos registrados
                        </p>

                        <p className="mt-1 text-sm text-muted-foreground">
                            Las transferencias y ajustes aparecerán aquí.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table className="min-w-[900px]">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Producto</TableHead>
                                    <TableHead>Almacén</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Cantidad</TableHead>
                                    <TableHead>Anterior</TableHead>
                                    <TableHead>Posterior</TableHead>
                                    <TableHead>Motivo</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {movements.map((row) => (
                                    <TableRow key={String(row.id)}>
                                        <TableCell className="whitespace-nowrap">
                                            {new Date(
                                                String(row.createdAt),
                                            ).toLocaleString("es-PE")}
                                        </TableCell>

                                        <TableCell className="font-medium">
                                            {child(row, "product", "name")}
                                        </TableCell>

                                        <TableCell>
                                            {child(
                                                row,
                                                "warehouse",
                                                "name",
                                            )}
                                        </TableCell>

                                        <TableCell>
                                            <Badge variant="outline">
                                                {String(row.type)}
                                            </Badge>
                                        </TableCell>

                                        <TableCell>
                                            {String(row.quantity)}
                                        </TableCell>

                                        <TableCell>
                                            {String(row.previous)}
                                        </TableCell>

                                        <TableCell>
                                            {String(row.resulting)}
                                        </TableCell>

                                        <TableCell className="max-w-xs">
                                            {String(row.reason ?? "—")}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}