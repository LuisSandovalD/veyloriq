"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useAsyncLoad } from "@/shared/use-async-load";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { RoleDialog } from "./role-dialog";
import { RolesTable } from "./roles-table";

type Row = Record<string, unknown>;
type Data = { roles: Row[]; permissions: Row[] };

async function parse(response: Response) {
  const value = await response.json();
  if (!response.ok) throw new Error(value.error?.message ?? "No se pudo completar.");
  return value;
}

export function RolesPanel() {
  const [data, setData] = useState<Data>({ roles: [], permissions: [] });
  const [editing, setEditing] = useState<Row>();
  const [deleting, setDeleting] = useState<Row>();
  const [error, setError] = useState<string>();
  const [deletingBusy, setDeletingBusy] = useState(false);

  async function load() {
    try {
      setError(undefined);
      setData(await parse(await fetch("/api/roles", { cache: "no-store" })));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Error inesperado.");
    }
  }

  useAsyncLoad(load);

  async function save(payload: Row) {
    try {
      setError(undefined);
      await parse(await fetch("/api/roles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }));
      setEditing(undefined);
      await load();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Error inesperado.";
      setError(message);
      throw reason instanceof Error ? reason : new Error(message);
    }
  }

  async function remove() {
    if (!deleting) return;

    try {
      setDeletingBusy(true);
      setError(undefined);
      await parse(await fetch("/api/roles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "delete", roleId: deleting.id }),
      }));
      setDeleting(undefined);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Error inesperado.");
    } finally {
      setDeletingBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Roles y permisos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Delegación con jerarquía y revocación inmediata de sesiones.
          </p>
        </div>

        <Button onClick={() => setEditing({})}>
          <Plus className="size-4" />
          Nuevo rol
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <RolesTable
        roles={data.roles}
        onEdit={setEditing}
        onDelete={setDeleting}
      />

      <RoleDialog
        key={editing ? String(editing.id ?? "new") : "closed"}
        open={Boolean(editing)}
        role={editing}
        permissions={data.permissions}
        onOpenChange={(open) => !open && setEditing(undefined)}
        onSubmit={save}
      />

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && !deletingBusy && setDeleting(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar rol</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Deseas eliminar el rol <strong>{String(deleting?.name ?? "")}</strong>? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingBusy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={deletingBusy} onClick={(event) => {
              event.preventDefault();
              void remove();
            }}>
              {deletingBusy ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}