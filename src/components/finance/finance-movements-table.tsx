"use client";

import { useState } from "react";
import {
    Loader2,
    RotateCcw,
    WalletCards,
} from "lucide-react";
import {
    Alert,
    AlertDescription,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

type Row = Record<string, unknown>;

export function FinanceMovementsTable({
    movements,
    onReverse,
}: {
    movements: Row[];
    onReverse: (
        movement: Row,
        reason: string,
    ) => Promise<void>;
}) {
    const [selected, setSelected] =
        useState<Row>();

    const [reason, setReason] =
        useState("");

    const [busy, setBusy] =
        useState(false);

    const [error, setError] =
        useState<string>();

    const money = (
        value: unknown,
        currency = "PEN",
    ) =>
        new Intl.NumberFormat("es-PE", {
            style: "currency",
            currency,
        }).format(Number(value ?? 0));

    function open(row: Row) {
        setSelected(row);
        setReason("");
        setError(undefined);
    }

    function close() {
        if (busy) return;

        setSelected(undefined);
        setReason("");
        setError(undefined);
    }

    async function confirmReverse() {
        if (!selected) return;

        if (reason.trim().length < 3) {
            setError(
                "Ingresa el motivo de la reversión.",
            );
            return;
        }

        try {
            setBusy(true);
            setError(undefined);

            await onReverse(
                selected,
                reason.trim(),
            );

            close();
            setSelected(undefined);
        } catch (reason) {
            setError(
                reason instanceof Error
                    ? reason.message
                    : "No se pudo revertir el movimiento.",
            );
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>
                        Movimientos confirmados
                    </CardTitle>

                    <CardDescription>
                        Las correcciones se realizan mediante
                        reversión para conservar la trazabilidad.
                    </CardDescription>
                </CardHeader>

                <CardContent className="p-0">
                    {!movements.length ? (
                        <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                            <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted">
                                <WalletCards className="size-5 text-muted-foreground" />
                            </div>

                            <p className="font-medium">
                                Sin movimientos registrados
                            </p>

                            <p className="mt-1 text-sm text-muted-foreground">
                                Los movimientos financieros aparecerán
                                aquí.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table className="min-w-[760px]">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>
                                            Fecha
                                        </TableHead>
                                        <TableHead>
                                            Cuenta
                                        </TableHead>
                                        <TableHead>
                                            Tipo
                                        </TableHead>
                                        <TableHead>
                                            Importe
                                        </TableHead>
                                        <TableHead>
                                            Saldo
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Acción
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {movements.map((row) => {
                                        const account =
                                            row.account as
                                            | Row
                                            | undefined;

                                        const currency =
                                            String(
                                                account?.currency ??
                                                "PEN",
                                            );

                                        return (
                                            <TableRow
                                                key={String(row.id)}
                                            >
                                                <TableCell className="whitespace-nowrap">
                                                    {new Date(
                                                        String(
                                                            row.createdAt,
                                                        ),
                                                    ).toLocaleString(
                                                        "es-PE",
                                                    )}
                                                </TableCell>

                                                <TableCell className="font-medium">
                                                    {String(
                                                        account?.name ??
                                                        "—",
                                                    )}
                                                </TableCell>

                                                <TableCell>
                                                    <Badge variant="outline">
                                                        {String(
                                                            row.type ??
                                                            "—",
                                                        )}
                                                    </Badge>
                                                </TableCell>

                                                <TableCell>
                                                    {money(
                                                        row.amount,
                                                        currency,
                                                    )}
                                                </TableCell>

                                                <TableCell>
                                                    {money(
                                                        row.resulting,
                                                        currency,
                                                    )}
                                                </TableCell>

                                                <TableCell className="text-right">
                                                    {row.reversedById ? (
                                                        <Badge variant="secondary">
                                                            Revertido
                                                        </Badge>
                                                    ) : (
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() =>
                                                                open(row)
                                                            }
                                                        >
                                                            <RotateCcw className="size-4" />
                                                            Revertir
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog
                open={Boolean(selected)}
                onOpenChange={(open) => {
                    if (!open) close();
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            Revertir movimiento
                        </DialogTitle>

                        <DialogDescription>
                            La reversión quedará registrada y el
                            movimiento original conservará su
                            trazabilidad.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <Label htmlFor="reverse-reason">
                            Motivo de la reversión
                        </Label>

                        <Textarea
                            id="reverse-reason"
                            value={reason}
                            onChange={(event) =>
                                setReason(
                                    event.target.value,
                                )
                            }
                            rows={4}
                            minLength={3}
                            placeholder="Explica por qué debe revertirse este movimiento"
                            disabled={busy}
                            required
                        />
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>
                                {error}
                            </AlertDescription>
                        </Alert>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={busy}
                            onClick={close}
                        >
                            Cancelar
                        </Button>

                        <Button
                            type="button"
                            variant="destructive"
                            disabled={busy}
                            onClick={() =>
                                void confirmReverse()
                            }
                        >
                            {busy ? (
                                <>
                                    <Loader2 className="size-4 animate-spin" />
                                    Revirtiendo…
                                </>
                            ) : (
                                <>
                                    <RotateCcw className="size-4" />
                                    Confirmar reversión
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}