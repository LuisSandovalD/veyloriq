"use client";

import { useState } from "react";
import { Loader2, Plus, RefreshCw, Search } from "lucide-react";
import { useAsyncLoad } from "@/shared/use-async-load";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { CrmTable } from "./crm-table";
import { CrmCreateDialog } from "./crm-create-dialog";
import { OpportunityMoveDialog } from "./opportunity-move-dialog";

type Entity =
  | "customers"
  | "contacts"
  | "leads"
  | "opportunities"
  | "activities";

type Row = Record<string, unknown>;

type References = {
  customers: Row[];
  leads: Row[];
  opportunities: Row[];
  members: Row[];
};

const labels: Record<Entity, string> = {
  customers: "Clientes",
  contacts: "Contactos",
  leads: "Leads",
  opportunities: "Oportunidades",
  activities: "Actividad",
};

async function parse(response: Response) {
  const value = await response.json();

  if (!response.ok) {
    throw new Error(
      value.error?.message ??
      "No se pudo completar la operación.",
    );
  }

  return value;
}

export function CrmPanel() {
  const [entity, setEntity] =
    useState<Entity>("opportunities");

  const [rows, setRows] = useState<Row[]>([]);
  const [stages, setStages] = useState<string[]>([]);

  const [references, setReferences] =
    useState<References>({
      customers: [],
      leads: [],
      opportunities: [],
      members: [],
    });

  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const [createOpen, setCreateOpen] =
    useState(false);

  const [moving, setMoving] = useState<Row>();

  async function load() {
    try {
      setLoading(true);
      setError(undefined);

      const value = await parse(
        await fetch(
          `/api/crm?entity=${entity}&q=${encodeURIComponent(q)}`,
          {
            cache: "no-store",
          },
        ),
      );

      setRows(value.data ?? []);
      setStages(value.stages ?? []);

      setReferences(
        value.references ?? {
          customers: [],
          leads: [],
          opportunities: [],
          members: [],
        },
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Error inesperado.",
      );
    } finally {
      setLoading(false);
    }
  }

  useAsyncLoad(load, entity);

  async function mutate(payload: Row) {
    try {
      setError(undefined);

      await parse(
        await fetch("/api/crm", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(payload),
        }),
      );

      await load();
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : "Error inesperado.";

      setError(message);

      throw reason instanceof Error
        ? reason
        : new Error(message);
    }
  }

  async function rowAction(row: Row) {
    if (entity === "leads") {
      await mutate({
        action: "lead.convert",
        leadId: row.id,
        createOpportunity: true,
        value: 0,
      });

      return;
    }

    if (entity === "opportunities") {
      setMoving(row);
    }
  }

  async function assign(
    row: Row,
    ownerId: string | null,
  ) {
    await mutate(
      entity === "leads"
        ? {
          action: "lead.assign",
          leadId: row.id,
          ownerId,
        }
        : {
          action: "opportunity.assign",
          opportunityId: row.id,
          ownerId,
        },
    );
  }

  const canCreate = [
    "contacts",
    "opportunities",
    "activities",
  ].includes(entity);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            CRM completo
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Relaciones, pipeline e historial conectados.
          </p>
        </div>

        {canCreate && (
          <Button
            type="button"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-4" />
            Nuevo
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      <Tabs
        value={entity}
        onValueChange={(value) => {
          if (
            value === "customers" ||
            value === "contacts" ||
            value === "leads" ||
            value === "opportunities" ||
            value === "activities"
          ) {
            setEntity(value);
          }
        }}
      >
        <div className="overflow-x-auto">
          <TabsList className="w-max">
            {(Object.keys(labels) as Entity[]).map(
              (item) => (
                <TabsTrigger
                  key={item}
                  value={item}
                >
                  {labels[item]}
                </TabsTrigger>
              ),
            )}
          </TabsList>
        </div>
      </Tabs>

      <div className="flex gap-2">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

          <Input
            value={q}
            onChange={(event) =>
              setQ(event.target.value)
            }
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void load();
              }
            }}
            placeholder="Buscar en esta vista…"
            className="pl-9"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={loading}
          onClick={() => void load()}
          aria-label="Actualizar"
        >
          <RefreshCw
            className={`size-4 ${loading ? "animate-spin" : ""
              }`}
          />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Cargando CRM…
        </div>
      ) : (
        <CrmTable
          entity={entity}
          rows={rows}
          references={references}
          onAction={rowAction}
          onAssign={assign}
        />
      )}

      <CrmCreateDialog
        open={createOpen}
        entity={entity}
        stages={stages}
        references={references}
        onOpenChange={setCreateOpen}
        onSubmit={mutate}
      />

      <OpportunityMoveDialog
        open={Boolean(moving)}
        opportunity={moving}
        stages={stages}
        onOpenChange={(open) => {
          if (!open) setMoving(undefined);
        }}
        onSubmit={async (
          opportunity,
          stage,
          probability,
        ) => {
          await mutate({
            action: "opportunity.move",
            opportunityId: opportunity.id,
            stage,
            probability,
          });
        }}
      />
    </div>
  );
}