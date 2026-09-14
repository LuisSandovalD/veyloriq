"use client";

import { useState, type FormEvent } from "react";
import { Building2, Loader2, Save } from "lucide-react";
import { useAsyncLoad } from "@/shared/use-async-load";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OrganizationIdentity } from "./organization-identity";
import { OrganizationLocalization } from "./organization-localization";
import { OrganizationSecurity } from "./organization-security";

type Row = Record<string, unknown>;

async function parse(response: Response) {
  const value = await response.json();
  if (!response.ok) throw new Error(value.error?.message ?? "No se pudo completar la operación.");
  return value;
}

export function OrganizationSettingsPanel() {
  const [data, setData] = useState<Row>();
  const [images, setImages] = useState<Row[]>([]);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setError(false);

      const [organization, documents] = await Promise.all([
        parse(await fetch("/api/organization", { cache: "no-store" })),
        parse(await fetch("/api/documents?status=READY", { cache: "no-store" })),
      ]);

      setData(organization.data);
      setImages(
        (documents.data as Row[]).filter((document) =>
          String(document.mimeType).startsWith("image/"),
        ),
      );
    } catch (reason) {
      setError(true);
      setMessage(reason instanceof Error ? reason.message : "Error inesperado.");
    }
  }

  useAsyncLoad(load);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(false);
    setMessage(undefined);

    const values = Object.fromEntries(new FormData(event.currentTarget));

    try {
      await parse(
        await fetch("/api/organization", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: values.name,
            legalName: values.legalName || null,
            taxId: values.taxId || null,
            address: values.address || null,
            contactEmail: values.contactEmail || null,
            contactPhone: values.contactPhone || null,
            logoDocumentId:
              values.logoDocumentId === "__none__"
                ? null
                : values.logoDocumentId || null,
            currency: values.currency,
            locale: values.locale,
            timeZone: values.timeZone,
            settings: {
              quotePrefix: values.quotePrefix,
              purchasePrefix: values.purchasePrefix,
              orderPrefix: values.orderPrefix,
              taxName: values.taxName,
              defaultTaxRate: Number(values.defaultTaxRate),
              dateFormat: values.dateFormat,
              weekStartsOn: values.weekStartsOn,
              sessionTimeoutMinutes: Number(values.sessionTimeoutMinutes),
              requireMfaForAdmins: values.requireMfaForAdmins === "on",
              opportunityStages: String(values.opportunityStages)
                .split(",")
                .map((stage) =>
                  stage.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_"),
                )
                .filter(Boolean),
            },
          }),
        }),
      );

      setMessage("Configuración guardada correctamente.");
      await load();
    } catch (reason) {
      setError(true);
      setMessage(reason instanceof Error ? reason.message : "Error inesperado.");
    } finally {
      setSaving(false);
    }
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Organización</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Identidad, contactos, documentos, localización y política de acceso.
          </p>
        </div>

        <Card>
          <CardContent className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Cargando configuración…
          </CardContent>
        </Card>

        {message && (
          <Alert variant="destructive">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  const settings = (data.settings ?? {}) as Row;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Building2 className="size-5" />
        </div>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Organización</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Identidad, contactos, documentos, localización y política de acceso.
          </p>
        </div>
      </div>

      {message && (
        <Alert variant={error ? "destructive" : "default"}>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={save} className="space-y-6">
        <OrganizationIdentity data={data} images={images} />
        <OrganizationLocalization data={data} settings={settings} />
        <OrganizationSecurity settings={settings} />

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Guardando…
              </>
            ) : (
              <>
                <Save className="size-4" />
                Guardar cambios
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}