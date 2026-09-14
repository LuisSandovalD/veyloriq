"use client";

import { useState } from "react";
import { useAsyncLoad } from "@/shared/use-async-load";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InventoryAlerts } from "./inventory-alerts";
import { InventoryMovementForm } from "./inventory-movement-form";
import { InventoryMovementsTable } from "./inventory-movements-table";

type Row = Record<string, unknown>;

type InventoryData = {
  stock: Row[];
  movements: Row[];
  products: Row[];
  warehouses: Row[];
  alerts: Row[];
};

async function parse(response: Response) {
  const value = await response.json();

  if (!response.ok) {
    throw new Error(value.error?.message ?? "No se pudo completar.");
  }

  return value;
}

export function InventoryPanel() {
  const [data, setData] = useState<InventoryData>({
    stock: [],
    movements: [],
    products: [],
    warehouses: [],
    alerts: [],
  });

  const [error, setError] = useState<string>();

  async function load() {
    try {
      setError(undefined);

      const value = await parse(
        await fetch("/api/inventory", {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Control de inventario
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Disponibilidad, alertas, transferencias, ajustes y kardex.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {data.alerts.length > 0 && (
        <InventoryAlerts alerts={data.alerts} />
      )}

      <InventoryMovementForm
        products={data.products}
        warehouses={data.warehouses}
        onCompleted={load}
      />

      <InventoryMovementsTable movements={data.movements} />
    </div>
  );
}