"use client";

import { useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { useAsyncLoad } from "@/shared/use-async-load";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TaskCreateDialog } from "./task-create-dialog";
import { TaskDetailDialog } from "./task-detail-dialog";
import { TasksTable } from "./tasks-table";

type Row = Record<string, unknown>;
type TaskData = { data: Row[]; members: Row[]; pagination: { page: number; hasMore: boolean } };

async function parse(response: Response) {
  const value = await response.json();
  if (!response.ok) throw new Error(value.error?.message ?? "No se pudo completar la operación.");
  return value;
}

export function TasksPanel() {
  const [data, setData] = useState<TaskData>({ data: [], members: [], pagination: { page: 1, hasMore: false } });
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Row>();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string>();

  async function load(targetPage = page) {
    try {
      setError(undefined);
      setData(await parse(await fetch(`/api/tasks?page=${targetPage}&q=${encodeURIComponent(query)}`, { cache: "no-store" })));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Error inesperado.");
    }
  }

  async function open(taskId: string) {
    try {
      const value = await parse(await fetch(`/api/tasks?taskId=${taskId}`, { cache: "no-store" }));
      setSelected(value.task);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Error inesperado.");
    }
  }

  async function action(payload: Row) {
    try {
      setError(undefined);
      await parse(await fetch("/api/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }));
      await load();
      if (selected?.id) await open(String(selected.id));
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Error inesperado.";
      setError(message);
      throw reason instanceof Error ? reason : new Error(message);
    }
  }

  useAsyncLoad(load, page);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Tareas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Responsables, recursos asociados, comentarios e historial operativo.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={query}
          placeholder="Buscar tareas…"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setPage(1);
              void load(1);
            }
          }}
        />

        <Button variant="outline" size="icon" onClick={() => void load()} aria-label="Actualizar">
          <RefreshCw className="size-4" />
        </Button>

        <Button onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          Nueva tarea
        </Button>
      </div>

      <TasksTable
        tasks={data.data}
        onOpen={(task) => void open(String(task.id))}
        onComplete={(task) => void action({ action: "update", taskId: task.id, status: "DONE" })}
      />

      {(page > 1 || data.pagination.hasMore) && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((v) => Math.max(1, v - 1))}>
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">Página {page}</span>
          <Button variant="outline" size="sm" disabled={!data.pagination.hasMore} onClick={() => setPage((v) => v + 1)}>
            Siguiente
          </Button>
        </div>
      )}

      <TaskCreateDialog
        open={creating}
        members={data.members}
        onOpenChange={setCreating}
        onSubmit={async (payload) => {
          await action(payload);
          setCreating(false);
        }}
      />

      <TaskDetailDialog
        open={Boolean(selected)}
        task={selected}
        members={data.members}
        onOpenChange={(open) => !open && setSelected(undefined)}
        onSubmit={action}
      />
    </div>
  );
}