"use client";

import { useState } from "react";
import { useAsyncLoad } from "@/shared/use-async-load";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FinanceAccounts } from "./finance-accounts";
import { FinanceOperationForm } from "./finance-operation-form";
import { FinanceMovementsTable } from "./finance-movements-table";

type Row = Record<string, unknown>;

type FinanceData = {
  accounts: Row[];
  obligations: Row[];
  payments: Row[];
  movements: Row[];
  categories: Row[];
  reconciliations: Row[];
};

async function parse(response: Response) {
  const value = await response.json();

  if (!response.ok) {
    throw new Error(
      value.error?.message ?? "No se pudo completar.",
    );
  }

  return value;
}

export function FinancePanel() {
  const [data, setData] = useState<FinanceData>({
    accounts: [],
    obligations: [],
    payments: [],
    movements: [],
    categories: [],
    reconciliations: [],
  });

  const [error, setError] = useState<string>();

  async function load() {
    try {
      setError(undefined);

      const value = await parse(
        await fetch("/api/finance", {
          cache: "no-store",
        }),
      );

      setData(value);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Error inesperado.",
      );
    }
  }

  useAsyncLoad(load);

  async function reverse(
    movement: Row,
    reason: string,
  ) {
    const response = await fetch("/api/finance", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        action: "movement.reverse",
        movementId: movement.id,
        reason,
        idempotencyKey: crypto.randomUUID(),
      }),
    });

    await parse(response);
    await load();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Finanzas operativas
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Caja, bancos, obligaciones, pagos y movimientos
          trazables. No sustituye contabilidad fiscal.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      <FinanceAccounts accounts={data.accounts} />

      <FinanceOperationForm
        accounts={data.accounts}
        obligations={data.obligations}
        categories={data.categories}
        onCompleted={load}
      />

      <FinanceMovementsTable
        movements={data.movements}
        onReverse={reverse}
      />
    </div>
  );
}