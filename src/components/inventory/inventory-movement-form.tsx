"use client";

import { useState, type FormEvent } from "react";
import {
    ArrowRight,
    ClipboardCheck,
    Loader2,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Row = Record<string, unknown>;

async function parse(response: Response) {
    const value = await response.json();

    if (!response.ok) {
        throw new Error(
            value.error?.message ?? "No se pudo completar.",
        );
    }

    return value;
}

export function InventoryMovementForm({
    products,
    warehouses,
    onCompleted,
}: {
    products: Row[];
    warehouses: Row[];
    onCompleted: () => Promise<void>;
}) {
    const [mode, setMode] =
        useState<"transfer" | "adjust">("transfer");

    const [productId, setProductId] = useState("");
    const [fromWarehouseId, setFromWarehouseId] =
        useState("");
    const [toWarehouseId, setToWarehouseId] =
        useState("");
    const [warehouseId, setWarehouseId] =
        useState("");

    const [error, setError] = useState<string>();
    const [busy, setBusy] = useState(false);

    async function submit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        setBusy(true);
        setError(undefined);

        const form = event.currentTarget;
        const values = Object.fromEntries(
            new FormData(form),
        );

        const command =
            mode === "transfer"
                ? "inventory.transfer"
                : "inventory.adjust";

        const payload =
            mode === "transfer"
                ? {
                    productId,
                    fromWarehouseId,
                    toWarehouseId,
                    quantity: Number(values.quantity),
                    reason: values.reason,
                }
                : {
                    productId,
                    warehouseId,
                    physical: Number(values.physical),
                    reason: values.reason,
                };

        try {
            if (!productId) {
                throw new Error("Selecciona un producto.");
            }

            if (
                mode === "transfer" &&
                (!fromWarehouseId || !toWarehouseId)
            ) {
                throw new Error(
                    "Selecciona el almacén de origen y destino.",
                );
            }

            if (
                mode === "transfer" &&
                fromWarehouseId === toWarehouseId
            ) {
                throw new Error(
                    "El almacén de origen y destino deben ser diferentes.",
                );
            }

            if (mode === "adjust" && !warehouseId) {
                throw new Error("Selecciona un almacén.");
            }

            await parse(
                await fetch("/api/commands", {
                    method: "POST",
                    headers: {
                        "content-type": "application/json",
                    },
                    body: JSON.stringify({
                        command,
                        idempotencyKey: crypto.randomUUID(),
                        data: payload,
                    }),
                }),
            );

            form.reset();

            setProductId("");
            setFromWarehouseId("");
            setToWarehouseId("");
            setWarehouseId("");

            await onCompleted();
        } catch (reason) {
            setError(
                reason instanceof Error
                    ? reason.message
                    : "Error inesperado.",
            );
        } finally {
            setBusy(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Movimiento de inventario</CardTitle>
                <CardDescription>
                    Transfiere existencias entre almacenes o registra
                    ajustes físicos.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
                <Tabs
                    value={mode}
                    onValueChange={(value) => {
                        if (
                            value === "transfer" ||
                            value === "adjust"
                        ) {
                            setMode(value);
                            setError(undefined);
                        }
                    }}
                >
                    <TabsList>
                        <TabsTrigger value="transfer">
                            <ArrowRight className="size-4" />
                            Transferir
                        </TabsTrigger>

                        <TabsTrigger value="adjust">
                            <ClipboardCheck className="size-4" />
                            Ajustar / contar
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <form
                    onSubmit={submit}
                    className="space-y-5"
                >
                    <div
                        className={`grid gap-4 ${mode === "transfer"
                                ? "md:grid-cols-2 xl:grid-cols-4"
                                : "md:grid-cols-3"
                            }`}
                    >
                        <div className="space-y-2">
                            <Label>Producto</Label>

                            <Select
                                value={productId}
                                onValueChange={(value) =>
                                    value && setProductId(value)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Seleccionar producto" />
                                </SelectTrigger>

                                <SelectContent>
                                    {products.map((row) => (
                                        <SelectItem
                                            key={String(row.id)}
                                            value={String(row.id)}
                                        >
                                            {String(row.name)}
                                            {row.sku
                                                ? ` (${String(row.sku)})`
                                                : ""}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {mode === "transfer" ? (
                            <>
                                <div className="space-y-2">
                                    <Label>Desde</Label>

                                    <Select
                                        value={fromWarehouseId}
                                        onValueChange={(value) =>
                                            value &&
                                            setFromWarehouseId(value)
                                        }
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Almacén origen" />
                                        </SelectTrigger>

                                        <SelectContent>
                                            {warehouses.map((row) => (
                                                <SelectItem
                                                    key={String(row.id)}
                                                    value={String(row.id)}
                                                >
                                                    {String(row.name)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Hacia</Label>

                                    <Select
                                        value={toWarehouseId}
                                        onValueChange={(value) =>
                                            value &&
                                            setToWarehouseId(value)
                                        }
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Almacén destino" />
                                        </SelectTrigger>

                                        <SelectContent>
                                            {warehouses.map((row) => (
                                                <SelectItem
                                                    key={String(row.id)}
                                                    value={String(row.id)}
                                                >
                                                    {String(row.name)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="inventory-quantity">
                                        Cantidad
                                    </Label>

                                    <Input
                                        id="inventory-quantity"
                                        name="quantity"
                                        type="number"
                                        min="0.0001"
                                        step="0.0001"
                                        required
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="space-y-2">
                                    <Label>Almacén</Label>

                                    <Select
                                        value={warehouseId}
                                        onValueChange={(value) =>
                                            value &&
                                            setWarehouseId(value)
                                        }
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="Seleccionar almacén" />
                                        </SelectTrigger>

                                        <SelectContent>
                                            {warehouses.map((row) => (
                                                <SelectItem
                                                    key={String(row.id)}
                                                    value={String(row.id)}
                                                >
                                                    {String(row.name)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="inventory-physical">
                                        Existencia física contada
                                    </Label>

                                    <Input
                                        id="inventory-physical"
                                        name="physical"
                                        type="number"
                                        min="0.0001"
                                        step="0.0001"
                                        required
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="inventory-reason">
                            Motivo obligatorio
                        </Label>

                        <Input
                            id="inventory-reason"
                            name="reason"
                            minLength={8}
                            placeholder="Describe el motivo del movimiento"
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

                    <Button type="submit" disabled={busy}>
                        {busy ? (
                            <>
                                <Loader2 className="size-4 animate-spin" />
                                Procesando…
                            </>
                        ) : mode === "transfer" ? (
                            <>
                                <ArrowRight className="size-4" />
                                Registrar transferencia
                            </>
                        ) : (
                            <>
                                <ClipboardCheck className="size-4" />
                                Registrar ajuste
                            </>
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}