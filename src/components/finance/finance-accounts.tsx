"use client";

import { WalletCards } from "lucide-react";
import {
    Card,
    CardContent,
} from "@/components/ui/card";

type Row = Record<string, unknown>;

export function FinanceAccounts({
    accounts,
}: {
    accounts: Row[];
}) {
    const money = (
        value: unknown,
        currency = "PEN",
    ) =>
        new Intl.NumberFormat("es-PE", {
            style: "currency",
            currency,
        }).format(Number(value ?? 0));

    if (!accounts.length) {
        return (
            <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                    No hay cuentas financieras configuradas.
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {accounts.map((account) => (
                <Card key={String(account.id)}>
                    <CardContent className="p-5">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <WalletCards className="size-5" />
                        </div>

                        <p className="mt-4 text-2xl font-semibold tracking-tight">
                            {money(
                                account.balance,
                                String(account.currency ?? "PEN"),
                            )}
                        </p>

                        <p className="mt-1 text-sm text-muted-foreground">
                            {String(account.name ?? "Cuenta")} ·{" "}
                            {String(account.type ?? "—")}
                        </p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}