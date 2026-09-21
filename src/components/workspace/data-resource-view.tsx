"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { metadata } from "./workspace-metadata";
import { PageHead } from "./page-head";
import { ErrorState } from "./empty-state";
import { Loading } from "./loading";
import { ResourceTable } from "./resource-table";
import { ResourceDialog } from "./resource-dialog";
import type { ApiResponse, Resource, Row } from "./workspace-types";

export async function fetchView(
  resource: Resource,
  q = "",
  page = 1,
): Promise<ApiResponse> {
  const response = await fetch(
    `/api/workspace?resource=${resource}&q=${encodeURIComponent(q)}&page=${page}`,
    { cache: "no-store" },
  );
  const body = await response.json();
  if (!response.ok)
    throw new Error(body.error?.message ?? "No se pudieron cargar los datos.");
  return body;
}

export async function fetchContacts(): Promise<ApiResponse> {
  const response = await fetch("/api/crm?view=contacts", { cache: "no-store" });
  const value = await response.json();
  if (!response.ok)
    throw new Error(
      value.error?.message ?? "No se pudieron cargar los contactos.",
    );
  return {
    data: value.data,
    context: {
      organizationName: "",
      displayName: "",
      role: "",
      permissions: [],
    },
  };
}

function options(response?: ApiResponse) {
  return ((response?.data ?? []) as Row[]).map((row) => ({
    value: String(row.id),
    label: String(row.name ?? row.sku ?? row.id),
  }));
}

export function DataResourceView({ resource }: { resource: Resource }) {
  const config = metadata[resource];
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState(false);
  const [editing, setEditing] = useState<Row>();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["resource", resource, q, page],
    queryFn: () => fetchView(resource, q, page),
  });
  const customers = useQuery({
    queryKey: ["resource", "customers", "options"],
    queryFn: () => fetchView("customers"),
    enabled: ["quotes", "orders"].includes(resource),
  });
  const contacts = useQuery({
    queryKey: ["crm", "contacts", "options"],
    queryFn: fetchContacts,
    enabled: resource === "quotes",
  });
  const suppliers = useQuery({
    queryKey: ["resource", "suppliers", "options"],
    queryFn: () => fetchView("suppliers"),
    enabled: resource === "purchases",
  });
  const products = useQuery({
    queryKey: ["resource", "products", "options"],
    queryFn: () => fetchView("products"),
    enabled: ["quotes", "purchases", "orders"].includes(resource),
  });
  const warehouses = useQuery({
    queryKey: ["resource", "warehouses", "options"],
    queryFn: () => fetchView("warehouses"),
    enabled: ["quotes", "purchases", "orders"].includes(resource),
  });
  const rows = (query.data?.data ?? []) as Row[];
  const dynamicFields = (config.fields ?? []).map((field) =>
    field.key === "customerId"
      ? { ...field, options: options(customers.data) }
      : field.key === "contactId"
        ? { ...field, options: options(contacts.data) }
        : field.key === "supplierId"
          ? { ...field, options: options(suppliers.data) }
          : field.key === "productId"
            ? { ...field, options: options(products.data) }
            : field.key === "warehouseId"
              ? { ...field, options: options(warehouses.data) }
              : field,
  );
  async function command(row: Row, requested?: "automation.test") {
    let name: string | undefined = requested;
    const status = String(row.status ?? "");
    if (resource === "quotes" && status === "DRAFT") {
      const response = await fetch(`/api/quotes/${String(row.id)}/send`, {
        method: "POST",
      });
      const body = await response.json();
      if (!response.ok) {
        alert(body.error?.message ?? "No se pudo enviar.");
        return;
      }
      await Promise.all([
        client.invalidateQueries({ queryKey: ["resource", resource] }),
        client.invalidateQueries({ queryKey: ["resource", "dashboard"] }),
      ]);
      return;
    }
    if (resource === "quotes")
      name =
        status === "SENT"
          ? "quote.accept"
          : status === "ACCEPTED"
            ? "quote.convert"
            : ["REJECTED", "EXPIRED", "CONVERTED", "CANCELLED"].includes(status)
              ? "quote.duplicate"
              : undefined;
    if (resource === "purchases")
      name =
        status === "DRAFT"
          ? "purchase.approve"
          : status === "APPROVED"
            ? "purchase.send"
            : ["SENT", "PARTIALLY_RECEIVED"].includes(status)
              ? "purchase.receive"
              : status === "RECEIVED"
                ? "purchase.return"
                : undefined;
    if (resource === "orders")
      name =
        status === "DRAFT"
          ? "order.confirm"
          : status === "CONFIRMED"
            ? "order.prepare"
            : ["PREPARING", "PARTIALLY_SHIPPED"].includes(status)
              ? "order.ship"
              : status === "SHIPPED"
                ? "order.complete"
                : undefined;
    if (resource === "tasks" && ["OPEN", "IN_PROGRESS"].includes(status))
      name = "task.complete";
    if (resource === "automations" && !name) name = "automation.toggle";
    if (!name) return;
    if (
      ["order.ship", "purchase.receive", "purchase.return"].includes(name) &&
      !window.confirm("Esta operación modifica existencias. ¿Continuar?")
    )
      return;
    const warehouse = ((warehouses.data?.data ?? []) as Row[])[0];
    let data: Row = { id: row.id };
    if (name === "quote.convert")
      data = { id: row.id, warehouseId: warehouse?.id };
    if (name === "purchase.receive")
      data = {
        id: row.id,
        warehouseId: warehouse?.id,
        lines: ((row.lines ?? []) as Row[])
          .map((line) => ({
            lineId: line.id,
            quantity: Number(line.quantity) - Number(line.received),
          }))
          .filter((line: Row) => Number(line.quantity) > 0),
      };
    if (name === "purchase.return") {
      const reason = window.prompt("Motivo de la devolución al proveedor:");
      if (!reason) return;
      const returnedByLine = new Map<string, number>();
      for (const supplierReturn of (row.supplierReturns ?? []) as Row[]) {
        for (const line of (supplierReturn.lines ?? []) as Row[]) {
          const lineId = String(line.purchaseLineId);
          returnedByLine.set(
            lineId,
            (returnedByLine.get(lineId) ?? 0) + Number(line.quantity),
          );
        }
      }
      data = {
        id: row.id,
        warehouseId: warehouse?.id,
        reason,
        lines: ((row.lines ?? []) as Row[])
          .map((line) => ({
            lineId: line.id,
            quantity:
              Number(line.received) -
              (returnedByLine.get(String(line.id)) ?? 0),
          }))
          .filter((line: Row) => Number(line.quantity) > 0),
      };
    }
    if (name === "automation.toggle")
      data = { id: row.id, active: !row.active };
    const response = await fetch("/api/commands", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        command: name,
        idempotencyKey: crypto.randomUUID(),
        data,
      }),
    });
    const body = await response.json();
    if (!response.ok) {
      alert(body.error?.message ?? "No se pudo completar.");
      return;
    }
    await Promise.all([
      client.invalidateQueries({ queryKey: ["resource", resource] }),
      client.invalidateQueries({ queryKey: ["resource", "dashboard"] }),
      client.invalidateQueries({ queryKey: ["resource", "stock"] }),
    ]);
  }

  if (query.isLoading) return <Loading />;
  if (query.error)
    return <ErrorState message={query.error.message} retry={query.refetch} />;
  return (
    <>
      <PageHead
        view={resource}
        action={
          config.fields ? (
            <button
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:pointer-events-none disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              onClick={() => {
                setEditing(undefined);
                setDialog(true);
              }}
            >
              <Plus size={16} /> Nuevo
            </button>
          ) : undefined
        }
      />
      <ResourceTable
        resource={resource}
        columns={config.columns}
        rows={rows}
        search={q}
        onSearch={(value) => {
          setQ(value);
          setPage(1);
        }}
        page={page}
        hasMore={query.data?.pagination?.hasMore ?? false}
        onPageChange={setPage}
        onRefresh={() => query.refetch()}
        onRowCommand={(row) => command(row)}
        onRowTest={(row) => command(row, "automation.test")}
        onRowEdit={(row) => {
          setEditing(row);
          setDialog(true);
        }}
      />
      {dialog && (
        <ResourceDialog
          resource={resource}
          fields={dynamicFields}
          initial={editing}
          onClose={() => {
            setDialog(false);
            setEditing(undefined);
          }}
        />
      )}
    </>
  );
}
