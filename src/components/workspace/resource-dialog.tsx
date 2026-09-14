"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Field, Resource, Row } from "./workspace-types";

function automationFormValues(automation: Row): Record<string, string> {
  const conditions = automation.conditions && typeof automation.conditions === "object" ? automation.conditions as Row : {};
  const actions = Array.isArray(automation.actions) ? automation.actions as Row[] : [];
  const action = actions[0] ?? {};
  return {
    name: String(automation.name ?? ""),
    trigger: String(automation.trigger ?? ""),
    action: String(action.type ?? ""),
    conditionField: String(conditions.field ?? ""),
    conditionOperator: String(conditions.operator ?? "equals"),
    conditionValue: String(conditions.value ?? ""),
    actionTitle: String(action.title ?? action.subject ?? ""),
    actionBody: String(action.description ?? action.body ?? ""),
    actionEmail: String(action.to ?? ""),
    targetResource: String(action.resource ?? ""),
    targetField: String(action.field ?? ""),
    targetValue: String(action.value ?? ""),
    active: String(Boolean(automation.active)),
    maxDepth: String(automation.maxDepth ?? 3),
  };
}

const requiredFields = ["name", "title", "sku", "customerId", "supplierId", "productId", "quantity"];

export function ResourceDialog({
  resource,
  fields,
  initial,
  onClose,
}: {
  resource: Resource;
  fields: Field[];
  initial?: Row;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const [error, setError] = useState<string>();

  const {
    register,
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<Record<string, string>>({
    defaultValues: resource === "automations" && initial ? automationFormValues(initial) : undefined,
  });

  const submit = handleSubmit(async (values) => {
    try {
      setError(undefined);
      let data: Row = { ...values };

      for (const field of fields.filter((item) => item.type === "number")) {
        data[field.key] = Number(values[field.key] || 0);
      }

      if (resource === "quotes") {
        data = {
          customerId: values.customerId,
          contactId: values.contactId || undefined,
          validUntil: new Date(`${values.validUntil}T23:59:59`).toISOString(),
          terms: values.terms,
          items: [{
            productId: values.productId,
            quantity: Number(values.quantity),
            discountRate: Number(values.discountRate || 0),
          }],
        };
      }

      if (resource === "purchases") {
        data = {
          supplierId: values.supplierId,
          expectedAt: values.expectedAt ? new Date(`${values.expectedAt}T12:00:00`).toISOString() : undefined,
          items: [{
            productId: values.productId,
            quantity: Number(values.quantity),
            unitCost: Number(values.unitCost),
          }],
        };
      }

      if (resource === "orders") {
        data = {
          customerId: values.customerId,
          warehouseId: values.warehouseId,
          items: [{
            productId: values.productId,
            quantity: Number(values.quantity),
            unitPrice: values.unitPrice ? Number(values.unitPrice) : undefined,
          }],
        };
      }

      if (resource === "tasks" && values.dueAt) {
        data.dueAt = new Date(`${values.dueAt}T12:00:00`).toISOString();
      }

      if (resource === "automations") {
        data.active = values.active === "true";
        data.maxDepth = Number(values.maxDepth || 3);
      }

      const editingAutomation = resource === "automations" && Boolean(initial);

      const response = await fetch(editingAutomation ? "/api/commands" : "/api/workspace", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          editingAutomation
            ? {
              command: "automation.update",
              idempotencyKey: crypto.randomUUID(),
              data: { ...data, id: initial?.id },
            }
            : { resource, data },
        ),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message = body.error?.message ?? "No se pudo guardar.";
        const requestId = body.error?.requestId;
        throw new Error(requestId ? `${message} Código: ${requestId}` : message);
      }

      await client.invalidateQueries({ queryKey: ["resource", resource] });
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo guardar el registro.");
    }
  });

  return (
    <Dialog open onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={submit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>{initial ? "Editar automatización" : "Nuevo registro"}</DialogTitle>
            <DialogDescription>Completa la información requerida. Los datos se validarán nuevamente en el servidor.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            {fields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>
                  {field.label}
                  {requiredFields.includes(field.key) && <span className="ml-1 text-destructive">*</span>}
                </Label>

                {field.type === "select" ? (
                  <Controller
                    name={field.key}
                    control={control}
                    rules={{ required: "Selecciona una opción." }}
                    render={({ field: formField, fieldState }) => (
                      <>
                        <Select
                          value={formField.value || "__none__"}
                          onValueChange={(value) => {
                            if (value) formField.onChange(value === "__none__" ? "" : value);
                          }}
                        >
                          <SelectTrigger id={field.key} className="w-full" aria-invalid={fieldState.invalid}>
                            <SelectValue placeholder="Seleccionar" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Seleccionar</SelectItem>
                            {field.options?.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {fieldState.error && <p className="text-xs text-destructive">{fieldState.error.message}</p>}
                      </>
                    )}
                  />
                ) : (
                  <Input
                    id={field.key}
                    type={field.type ?? "text"}
                    step={field.type === "number" ? "0.01" : undefined}
                    {...register(field.key, {
                      required: requiredFields.includes(field.key) ? "Este campo es obligatorio." : false,
                    })}
                  />
                )}
              </div>
            ))}
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {isSubmitting ? "Guardando…" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}