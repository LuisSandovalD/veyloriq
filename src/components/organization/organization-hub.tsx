"use client";

import { useEffect, useState } from "react";
import { Building2, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OrganizationSettingsPanel } from "./organization-settings-panel";

type Membership = {
  organizationId: string;
  organization: {
    name: string;
    slug: string;
    status: string;
    onboardingStep: number;
  };
  role: { name: string };
};

export function OrganizationHub() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [active, setActive] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();

    void fetch("/api/organizations", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const value = await response.json();
        if (!response.ok) throw new Error(value.error?.message ?? "No se pudieron cargar los espacios.");
        setMemberships(value.data ?? []);
        setActive(value.activeOrganizationId ?? "");
      })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : "Error inesperado.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  async function change(organizationId: string) {
    if (!organizationId || organizationId === active) return;

    try {
      setBusy(true);
      setError(undefined);

      const response = await fetch("/api/organizations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });

      const value = await response.json();
      if (!response.ok) throw new Error(value.error?.message ?? "No se pudo cambiar de organización.");

      window.location.assign(value.organizationId ? "/app" : "/login");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Error inesperado.");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Espacio activo</CardTitle>
            <CardDescription>
              Solo verás datos y permisos de la organización seleccionada.
            </CardDescription>
          </div>

          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="size-5" />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Organización</Label>

            <Select
              value={active}
              disabled={busy || loading || !memberships.length}
              onValueChange={(value) => {
                if (value !== null) void change(value);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={loading ? "Cargando organizaciones…" : "Selecciona una organización"} />
              </SelectTrigger>

              <SelectContent>
                {memberships.map((membership) => (
                  <SelectItem
                    key={membership.organizationId}
                    value={membership.organizationId}
                  >
                    {membership.organization.name} · {membership.role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {busy && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Cambiando organización…
            </div>
          )}

          {!loading && !memberships.length && (
            <p className="text-sm text-muted-foreground">
              No tienes organizaciones disponibles.
            </p>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <OrganizationSettingsPanel />
    </div>
  );
}