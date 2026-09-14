"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  Layers3,
  Loader2,
  RefreshCw,
  Users,
} from "lucide-react";
import { useAsyncLoad } from "@/shared/use-async-load";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlatformOrganizations } from "./platform-organizations";
import { PlatformPlans } from "./platform-plans";
import { PlatformUsers } from "./platform-users";
import { PlatformBilling } from "./platform-billing";
import { PlatformHealth } from "./platform-health";
import { PlatformIncidents } from "./platform-incidents";
import { PlatformSupport } from "./platform-support";
import { PlatformAudit } from "./platform-audit";

type Row = Record<string, unknown>;

type Organization = {
  id: string;
  name: string;
  status: string;
  currency: string;
  createdAt: string;
  _count: {
    memberships: number;
    products: number;
    orders: number;
  };
  subscription?: {
    status: string;
    plan: { name: string };
  };
};

type Main = {
  metrics: {
    organizations: number;
    users: number;
    pendingJobs: number;
    webhookFailures: number;
    failedOutbox: number;
  };
  organizations: Organization[];
  failedJobs: Row[];
  failedOutbox: Row[];
  operator: {
    name: string;
    role: string;
  };
};

type Operations = {
  plans: Row[];
  platformUsers: Row[];
  usage: Row[];
  billingEvents: Row[];
  audit: Row[];
  incidents: Row[];
  grants: Row[];
  services: Record<string, Row>;
};

async function parse(response: Response) {
  const value = await response.json();
  if (!response.ok) throw new Error(value.error?.message ?? "No se pudo completar.");
  return value;
}

export function PlatformDashboard() {
  const [main, setMain] = useState<Main>();
  const [ops, setOps] = useState<Operations>();
  const [tab, setTab] = useState("organizations");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setBusy(true);
      setError(undefined);

      const [mainResponse, operationsResponse] = await Promise.all([
        fetch("/api/platform", { cache: "no-store" }),
        fetch("/api/platform/operations", { cache: "no-store" }),
      ]);

      setMain(await parse(mainResponse));
      setOps(await parse(operationsResponse));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Error inesperado.");
    } finally {
      setBusy(false);
    }
  }

  useAsyncLoad(load);

  async function action(payload: Row) {
    try {
      setError(undefined);

      const endpoint = ["suspend", "reactivate", "retry_job", "retry_outbox"].includes(
        String(payload.action),
      )
        ? "/api/platform"
        : "/api/platform/operations";

      await parse(
        await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        }),
      );

      await load();
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Error inesperado.";
      setError(message);
      throw reason instanceof Error ? reason : new Error(message);
    }
  }

  if (error && !main) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-lg">
          <AlertTriangle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </main>
    );
  }

  if (!main || !ops) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Cargando plataforma…
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/90 px-4 backdrop-blur-xl sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 font-semibold">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Layers3 className="size-4" />
          </span>
          VEYLORIQ Platform
        </Link>

        <span className="text-sm text-muted-foreground">
          {main.operator.name} · {main.operator.role}
        </span>
      </header>

      <main className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Administración global</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Operación de plataforma separada, sin acceso implícito a datos empresariales.
            </p>
          </div>

          <Button variant="outline" disabled={busy} onClick={() => void load()}>
            <RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="p-5">
              <Building2 className="size-5 text-muted-foreground" />
              <p className="mt-4 text-3xl font-semibold">{main.metrics.organizations}</p>
              <p className="text-sm text-muted-foreground">Organizaciones</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <Users className="size-5 text-muted-foreground" />
              <p className="mt-4 text-3xl font-semibold">{main.metrics.users}</p>
              <p className="text-sm text-muted-foreground">Identidades</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <RefreshCw className="size-5 text-muted-foreground" />
              <p className="mt-4 text-3xl font-semibold">{main.metrics.pendingJobs}</p>
              <p className="text-sm text-muted-foreground">Jobs pendientes</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <AlertTriangle className="size-5 text-muted-foreground" />
              <p className="mt-4 text-3xl font-semibold">{main.metrics.webhookFailures}</p>
              <p className="text-sm text-muted-foreground">Webhooks por revisar</p>
            </CardContent>
          </Card>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs value={tab} onValueChange={(value) => value && setTab(value)}>
          <div className="overflow-x-auto">
            <TabsList className="w-max">
              <TabsTrigger value="organizations">Organizaciones</TabsTrigger>
              <TabsTrigger value="plans">Planes</TabsTrigger>
              <TabsTrigger value="users">Usuarios</TabsTrigger>
              <TabsTrigger value="billing">Cobros y uso</TabsTrigger>
              <TabsTrigger value="health">Integraciones</TabsTrigger>
              <TabsTrigger value="incidents">Incidentes</TabsTrigger>
              <TabsTrigger value="support">Soporte</TabsTrigger>
              <TabsTrigger value="audit">Auditoría</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="organizations" className="mt-6">
            <PlatformOrganizations data={main.organizations} action={action} />
          </TabsContent>

          <TabsContent value="plans" className="mt-6">
            <PlatformPlans data={ops.plans} action={action} />
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <PlatformUsers data={ops.platformUsers} action={action} />
          </TabsContent>

          <TabsContent value="billing" className="mt-6">
            <PlatformBilling
              billingEvents={ops.billingEvents}
              usage={ops.usage}
            />
          </TabsContent>

          <TabsContent value="health" className="mt-6">
            <PlatformHealth
              services={ops.services}
              jobs={main.failedJobs}
              outbox={main.failedOutbox}
              action={action}
            />
          </TabsContent>

          <TabsContent value="incidents" className="mt-6">
            <PlatformIncidents
              data={ops.incidents}
              organizations={main.organizations}
              action={action}
            />
          </TabsContent>

          <TabsContent value="support" className="mt-6">
            <PlatformSupport
              data={ops.grants}
              organizations={main.organizations}
              action={action}
            />
          </TabsContent>

          <TabsContent value="audit" className="mt-6">
            <PlatformAudit data={ops.audit} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}