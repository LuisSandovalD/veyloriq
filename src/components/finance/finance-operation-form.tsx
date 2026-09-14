"use client";

import {
    useState,
    type FormEvent,
} from "react";
import {
    ArrowRightLeft,
    Loader2,
    Plus,
    ReceiptText,
    Scale,
    Wallet,
} from "lucide-react";
import {
    Alert,
    AlertDescription,
} from "@/components/ui/alert";
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
import {
    Tabs,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";

type Row = Record<string, unknown>;

type Mode =
    | "payment"
    | "movement"
    | "transfer"
    | "category"
    | "reconciliation";

async function parse(response: Response) {
    const value = await response.json();

    if (!response.ok) {
        throw new Error(
            value.error?.message ?? "No se pudo completar.",
        );
    }

    return value;
}

export function FinanceOperationForm({
    accounts,
    obligations,
    categories,
    onCompleted,
}: {
    accounts: Row[];
    obligations: Row[];
    categories: Row[];
    onCompleted: () => Promise<void>;
}) {
    const [mode, setMode] =
        useState<Mode>("payment");

    const [obligationId, setObligationId] =
        useState("__none__");

    const [paymentAccountId, setPaymentAccountId] =
        useState("__none__");

    const [movementAccountId, setMovementAccountId] =
        useState("__none__");

    const [movementDirection, setMovementDirection] =
        useState("IN");

    const [categoryId, setCategoryId] =
        useState("__none__");

    const [fromAccountId, setFromAccountId] =
        useState("__none__");

    const [toAccountId, setToAccountId] =
        useState("__none__");

    const [categoryDirection, setCategoryDirection] =
        useState("IN");

    const [
        reconciliationAccountId,
        setReconciliationAccountId,
    ] = useState("__none__");

    const [error, setError] = useState<string>();
    const [busy, setBusy] = useState(false);

    const money = (
        value: unknown,
        currency = "PEN",
    ) =>
        new Intl.NumberFormat("es-PE", {
            style: "currency",
            currency,
        }).format(Number(value ?? 0));

    function clearSelections() {
        setObligationId("__none__");
        setPaymentAccountId("__none__");
        setMovementAccountId("__none__");
        setMovementDirection("IN");
        setCategoryId("__none__");
        setFromAccountId("__none__");
        setToAccountId("__none__");
        setCategoryDirection("IN");
        setReconciliationAccountId("__none__");
    }

    async function submit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        const form = event.currentTarget;
        const values = Object.fromEntries(
            new FormData(form),
        );

        let endpoint = "/api/finance";
        let payload: Row;

        try {
            setBusy(true);
            setError(undefined);

            if (mode === "payment") {
                if (obligationId === "__none__") {
                    throw new Error(
                        "Selecciona una obligación.",
                    );
                }

                if (paymentAccountId === "__none__") {
                    throw new Error(
                        "Selecciona una cuenta.",
                    );
                }

                endpoint = "/api/commands";

                payload = {
                    command: "payment.apply",
                    idempotencyKey:
                        crypto.randomUUID(),
                    data: {
                        obligationId,
                        accountId: paymentAccountId,
                        amount: Number(values.amount),
                    },
                };
            } else if (mode === "movement") {
                if (
                    movementAccountId === "__none__"
                ) {
                    throw new Error(
                        "Selecciona una cuenta.",
                    );
                }

                const selectedCategory =
                    categories.find(
                        (item) =>
                            String(item.id) === categoryId,
                    );

                payload = {
                    action: "movement.create",
                    idempotencyKey:
                        crypto.randomUUID(),
                    accountId: movementAccountId,
                    direction: movementDirection,
                    categoryId:
                        categoryId === "__none__"
                            ? undefined
                            : categoryId,
                    category:
                        selectedCategory?.name ??
                        values.category ??
                        "General",
                    amount: Number(values.amount),
                    reason: values.reason,
                };
            } else if (mode === "transfer") {
                if (
                    fromAccountId === "__none__" ||
                    toAccountId === "__none__"
                ) {
                    throw new Error(
                        "Selecciona las cuentas de origen y destino.",
                    );
                }

                if (
                    fromAccountId === toAccountId
                ) {
                    throw new Error(
                        "La cuenta de origen y destino deben ser diferentes.",
                    );
                }

                payload = {
                    action: "transfer.create",
                    idempotencyKey:
                        crypto.randomUUID(),
                    fromAccountId,
                    toAccountId,
                    amount: Number(values.amount),
                    reason: values.reason,
                };
            } else if (mode === "category") {
                payload = {
                    action: "category.create",
                    idempotencyKey:
                        crypto.randomUUID(),
                    name: values.name,
                    direction: categoryDirection,
                    reason:
                        "Creación de categoría financiera",
                };
            } else {
                if (
                    reconciliationAccountId ===
                    "__none__"
                ) {
                    throw new Error(
                        "Selecciona una cuenta.",
                    );
                }

                payload = {
                    action: "reconciliation.create",
                    idempotencyKey:
                        crypto.randomUUID(),
                    accountId:
                        reconciliationAccountId,
                    statementBalance: Number(
                        values.statementBalance,
                    ),
                    reason: values.reason,
                };
            }

            await parse(
                await fetch(endpoint, {
                    method: "POST",
                    headers: {
                        "content-type":
                            "application/json",
                    },
                    body: JSON.stringify(payload),
                }),
            );

            form.reset();
            clearSelections();

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
                <CardTitle>
                    Registrar operación
                </CardTitle>

                <CardDescription>
                    Pagos, movimientos, transferencias,
                    categorías y conciliaciones.
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
                <Tabs
                    value={mode}
                    onValueChange={(value) => {
                        if (
                            value === "payment" ||
                            value === "movement" ||
                            value === "transfer" ||
                            value === "category" ||
                            value === "reconciliation"
                        ) {
                            setMode(value);
                            setError(undefined);
                        }
                    }}
                >
                    <div className="overflow-x-auto">
                        <TabsList className="w-max">
                            <TabsTrigger value="payment">
                                <ReceiptText className="size-4" />
                                Aplicar pago
                            </TabsTrigger>

                            <TabsTrigger value="movement">
                                <Wallet className="size-4" />
                                Ingreso / egreso
                            </TabsTrigger>

                            <TabsTrigger value="transfer">
                                <ArrowRightLeft className="size-4" />
                                Transferir
                            </TabsTrigger>

                            <TabsTrigger value="category">
                                <Plus className="size-4" />
                                Categorías
                            </TabsTrigger>

                            <TabsTrigger value="reconciliation">
                                <Scale className="size-4" />
                                Conciliar
                            </TabsTrigger>
                        </TabsList>
                    </div>
                </Tabs>

                <form
                    onSubmit={submit}
                    className="space-y-5"
                >
                    {mode === "payment" && (
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Obligación</Label>

                                <Select
                                    value={obligationId}
                                    onValueChange={(value) =>
                                        value &&
                                        setObligationId(value)
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Seleccionar obligación" />
                                    </SelectTrigger>

                                    <SelectContent>
                                        <SelectItem value="__none__">
                                            Seleccionar
                                        </SelectItem>

                                        {obligations
                                            .filter(
                                                (item) =>
                                                    ![
                                                        "PAID",
                                                        "CANCELLED",
                                                    ].includes(
                                                        String(item.status),
                                                    ),
                                            )
                                            .map((row) => (
                                                <SelectItem
                                                    key={String(row.id)}
                                                    value={String(row.id)}
                                                >
                                                    {String(
                                                        row.counterparty,
                                                    )}{" "}
                                                    ·{" "}
                                                    {money(
                                                        Number(
                                                            row.amount ?? 0,
                                                        ) -
                                                        Number(
                                                            row.paidAmount ??
                                                            0,
                                                        ),
                                                        String(
                                                            row.currency ??
                                                            "PEN",
                                                        ),
                                                    )}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Cuenta</Label>

                                <Select
                                    value={paymentAccountId}
                                    onValueChange={(value) =>
                                        value &&
                                        setPaymentAccountId(
                                            value,
                                        )
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Seleccionar cuenta" />
                                    </SelectTrigger>

                                    <SelectContent>
                                        <SelectItem value="__none__">
                                            Seleccionar
                                        </SelectItem>

                                        {accounts.map((row) => (
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
                        </div>
                    )}

                    {mode === "movement" && (
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="space-y-2">
                                <Label>Cuenta</Label>

                                <Select
                                    value={movementAccountId}
                                    onValueChange={(value) =>
                                        value &&
                                        setMovementAccountId(
                                            value,
                                        )
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>

                                    <SelectContent>
                                        <SelectItem value="__none__">
                                            Seleccionar
                                        </SelectItem>

                                        {accounts.map((row) => (
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
                                <Label>Dirección</Label>

                                <Select
                                    value={movementDirection}
                                    onValueChange={(value) => {
                                        if (
                                            value === "IN" ||
                                            value === "OUT"
                                        ) {
                                            setMovementDirection(
                                                value,
                                            );
                                        }
                                    }}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>

                                    <SelectContent>
                                        <SelectItem value="IN">
                                            Ingreso
                                        </SelectItem>
                                        <SelectItem value="OUT">
                                            Egreso
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {categories.length ? (
                                <div className="space-y-2">
                                    <Label>Categoría</Label>

                                    <Select
                                        value={categoryId}
                                        onValueChange={(value) =>
                                            value &&
                                            setCategoryId(value)
                                        }
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>

                                        <SelectContent>
                                            <SelectItem value="__none__">
                                                General
                                            </SelectItem>

                                            {categories.map(
                                                (row) => (
                                                    <SelectItem
                                                        key={String(
                                                            row.id,
                                                        )}
                                                        value={String(
                                                            row.id,
                                                        )}
                                                    >
                                                        {String(
                                                            row.name,
                                                        )}
                                                    </SelectItem>
                                                ),
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label htmlFor="finance-category">
                                        Categoría
                                    </Label>

                                    <Input
                                        id="finance-category"
                                        name="category"
                                        required
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {mode === "transfer" && (
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Cuenta origen</Label>

                                <Select
                                    value={fromAccountId}
                                    onValueChange={(value) =>
                                        value &&
                                        setFromAccountId(value)
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>

                                    <SelectContent>
                                        <SelectItem value="__none__">
                                            Seleccionar
                                        </SelectItem>

                                        {accounts.map((row) => (
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
                                <Label>Cuenta destino</Label>

                                <Select
                                    value={toAccountId}
                                    onValueChange={(value) =>
                                        value &&
                                        setToAccountId(value)
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>

                                    <SelectContent>
                                        <SelectItem value="__none__">
                                            Seleccionar
                                        </SelectItem>

                                        {accounts.map((row) => (
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
                        </div>
                    )}

                    {mode === "category" && (
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="finance-category-name">
                                    Nombre
                                </Label>

                                <Input
                                    id="finance-category-name"
                                    name="name"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Dirección</Label>

                                <Select
                                    value={categoryDirection}
                                    onValueChange={(value) => {
                                        if (
                                            value === "IN" ||
                                            value === "OUT" ||
                                            value === "BOTH"
                                        ) {
                                            setCategoryDirection(
                                                value,
                                            );
                                        }
                                    }}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>

                                    <SelectContent>
                                        <SelectItem value="IN">
                                            Ingreso
                                        </SelectItem>
                                        <SelectItem value="OUT">
                                            Egreso
                                        </SelectItem>
                                        <SelectItem value="BOTH">
                                            Ambos
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {mode === "reconciliation" && (
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Cuenta</Label>

                                <Select
                                    value={
                                        reconciliationAccountId
                                    }
                                    onValueChange={(value) =>
                                        value &&
                                        setReconciliationAccountId(
                                            value,
                                        )
                                    }
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>

                                    <SelectContent>
                                        <SelectItem value="__none__">
                                            Seleccionar
                                        </SelectItem>

                                        {accounts.map((row) => (
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
                                <Label htmlFor="statementBalance">
                                    Saldo del extracto
                                </Label>

                                <Input
                                    id="statementBalance"
                                    name="statementBalance"
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {[
                        "payment",
                        "movement",
                        "transfer",
                    ].includes(mode) && (
                            <div className="space-y-2">
                                <Label htmlFor="finance-amount">
                                    Importe
                                </Label>

                                <Input
                                    id="finance-amount"
                                    name="amount"
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    required
                                />
                            </div>
                        )}

                    {![
                        "payment",
                        "category",
                    ].includes(mode) && (
                            <div className="space-y-2">
                                <Label htmlFor="finance-reason">
                                    Motivo
                                </Label>

                                <Input
                                    id="finance-reason"
                                    name="reason"
                                    minLength={3}
                                    required
                                />
                            </div>
                        )}

                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>
                                {error}
                            </AlertDescription>
                        </Alert>
                    )}

                    <Button
                        type="submit"
                        disabled={busy}
                    >
                        {busy ? (
                            <>
                                <Loader2 className="size-4 animate-spin" />
                                Procesando…
                            </>
                        ) : (
                            "Confirmar operación"
                        )}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}