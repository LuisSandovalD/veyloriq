"use client";

import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Inbox, RefreshCw, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RowAction } from "./row-action";
import type { Column, Resource, Row } from "./workspace-types";

export function nested(row: Row, key: string, child: string) {
  const value = row[key];
  return value && typeof value === "object" ? String((value as Row)[child] ?? "—") : "—";
}

export function currency(value: unknown) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

export function dateValue(value: unknown) {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.valueOf()) ? "—" : new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(date);
}

function cell(row: Row, key: string): ReactNode {
  if (key === "product") return nested(row, "product", "name");
  if (key === "warehouse") return nested(row, "warehouse", "name");
  if (key === "customer") return nested(row, "customer", "name");
  if (key === "supplier") return nested(row, "supplier", "name");
  if (key === "available") return Number(row.physical ?? 0) - Number(row.reserved ?? 0);

  const value = row[key];

  if (["status", "kind", "priority", "outcome"].includes(key)) {
    return <Badge variant="outline">{String(value ?? "—")}</Badge>;
  }

  if (key === "active") {
    const active = value === true || value === "true";
    return <Badge variant={active ? "default" : "secondary"}>{active ? "Activo" : "Pausado"}</Badge>;
  }

  if (key.endsWith("At") || key === "validUntil") return dateValue(value);
  if (["price", "total", "amount", "paidAmount", "balance"].includes(key)) return currency(value);
  return value == null || value === "" ? "—" : String(value);
}

export function ResourceTable({
  resource,
  columns,
  rows,
  search,
  onSearch,
  page,
  hasMore,
  onPageChange,
  onRefresh,
  onRowCommand,
  onRowTest,
  onRowEdit,
}: {
  resource: Resource;
  columns?: Column[];
  rows: Row[];
  search: string;
  onSearch: (value: string) => void;
  page: number;
  hasMore: boolean;
  onPageChange: (next: number) => void;
  onRefresh: () => void;
  onRowCommand: (row: Row) => void;
  onRowTest: (row: Row) => void;
  onRowEdit: (row: Row) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Buscar…"
            className="pl-9"
          />
        </div>

        <Button type="button" variant="outline" size="icon" onClick={onRefresh} aria-label="Actualizar">
          <RefreshCw className="size-4" />
        </Button>
      </div>

      <Card className="overflow-hidden py-0">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns?.map((column) => (
                    <TableHead key={column.key}>{column.label}</TableHead>
                  ))}
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {rows.length ? (
                  rows.map((row) => (
                    <TableRow key={String(row.id)}>
                      {columns?.map((column) => (
                        <TableCell key={column.key}>{cell(row, column.key)}</TableCell>
                      ))}

                      <TableCell className="text-right">
                        <RowAction
                          resource={resource}
                          row={row}
                          onClick={() => onRowCommand(row)}
                          onTest={() => onRowTest(row)}
                          onEdit={() => onRowEdit(row)}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={(columns?.length ?? 0) + 1} className="h-40">
                      <div className="flex flex-col items-center justify-center text-center">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
                          <Inbox className="size-5 text-muted-foreground" />
                        </div>
                        <p className="mt-3 text-sm font-medium">No hay registros</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {search ? "No se encontraron resultados para tu búsqueda." : "Los nuevos registros aparecerán aquí."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {(page > 1 || hasMore) && (
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(Math.max(1, page - 1))}
          >
            <ChevronLeft className="size-4" />
            Anterior
          </Button>

          <Badge variant="secondary">Página {page}</Badge>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasMore}
            onClick={() => onPageChange(page + 1)}
          >
            Siguiente
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}