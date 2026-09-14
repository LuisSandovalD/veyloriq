"use client";

import { useState } from "react";
import { useAsyncLoad } from "@/shared/use-async-load";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SalesLinesDialog } from "./sales-lines-dialog";
import { SalesTable } from "./sales-table";

type Row = Record<string, unknown>;

async function parse(response: Response) {
  const value = await response.json();
  if (!response.ok) throw new Error(value.error?.message ?? "No se pudo completar.");
  return value;
}

export function SalesPanel() {
  const [orders, setOrders] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Row>();
  const [dialog, setDialog] = useState<"ship" | "return">();
  const [error, setError] = useState<string>();

  async function load() {
    try {
      setError(undefined);
      const value = await parse(await fetch("/api/workspace?resource=orders", { cache: "no-store" }));
      setOrders(value.data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Error inesperado.");
    }
  }

  useAsyncLoad(load);

  async function command(command: string, data: Row) {
    try {
      setError(undefined);
      await parse(await fetch("/api/commands", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ command, idempotencyKey: crypto.randomUUID(), data }),
      }));

      setDialog(undefined);
      setSelected(undefined);
      await load();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Error inesperado.";
      setError(message);
      throw reason instanceof Error ? reason : new Error(message);
    }
  }

  async function progress(order: Row) {
    const status = String(order.status);

    if (status === "DRAFT") {
      await command("order.confirm", { id: order.id });
      return;
    }

    if (status === "CONFIRMED") {
      await command("order.prepare", { id: order.id });
      return;
    }

    if (["PREPARING", "PARTIALLY_SHIPPED"].includes(status)) {
      setSelected(order);
      setDialog("ship");
      return;
    }

    if (status === "SHIPPED") {
      await command("order.complete", { id: order.id });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Pedidos, despachos y devoluciones
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Estados comercial y logístico separados; cobros visibles en Finanzas.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <SalesTable
        orders={orders}
        onProgress={(order) => void progress(order)}
        onCancel={(order) => {
          if (window.confirm("Se liberarán las reservas pendientes. ¿Cancelar pedido?")) {
            void command("order.cancel", { id: order.id });
          }
        }}
        onReturn={(order) => {
          setSelected(order);
          setDialog("return");
        }}
      />

      <SalesLinesDialog
        open={Boolean(selected && dialog)}
        order={selected}
        kind={dialog}
        onOpenChange={(open) => {
          if (!open) {
            setDialog(undefined);
            setSelected(undefined);
          }
        }}
        onSubmit={(data) => command(dialog === "ship" ? "order.ship" : "order.return", data)}
      />
    </div>
  );
}