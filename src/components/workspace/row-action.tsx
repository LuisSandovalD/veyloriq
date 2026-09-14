"use client";

import { Check, FlaskConical, Pause, Pencil, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Resource, Row } from "./workspace-types";

export function RowAction({
  resource,
  row,
  onClick,
  onTest,
  onEdit,
}: {
  resource: Resource;
  row: Row;
  onClick: () => void;
  onTest: () => void;
  onEdit: () => void;
}) {
  const status = String(row.status ?? "");
  let label = "";
  let icon = <Check className="size-3.5" />;

  if (resource === "quotes") {
    if (status === "DRAFT") label = "Enviar";
    else if (status === "SENT") label = "Aceptar";
    else if (status === "ACCEPTED") label = "Convertir";
    else if (["REJECTED", "EXPIRED", "CONVERTED", "CANCELLED"].includes(status)) {
      label = "Duplicar";
      icon = <RotateCcw className="size-3.5" />;
    }
  }

  if (resource === "purchases") {
    if (status === "DRAFT") label = "Aprobar";
    else if (status === "APPROVED") label = "Enviar";
    else if (["SENT", "PARTIALLY_RECEIVED"].includes(status)) label = "Recibir";
    else if (status === "RECEIVED") {
      label = "Devolver recibido";
      icon = <RotateCcw className="size-3.5" />;
    }
  }

  if (resource === "orders") {
    if (status === "DRAFT") label = "Confirmar";
    else if (status === "CONFIRMED") label = "Preparar";
    else if (["PREPARING", "PARTIALLY_SHIPPED"].includes(status)) label = "Despachar";
    else if (status === "SHIPPED") label = "Completar";
  }

  if (resource === "tasks" && ["OPEN", "IN_PROGRESS"].includes(status)) {
    label = "Completar";
  }

  if (resource === "automations") {
    return (
      <TooltipProvider>
        <div className="flex items-center justify-end gap-1">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant={row.active ? "outline" : "default"}
                  size="sm"
                  onClick={onClick}
                >
                  {row.active ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                  {row.active ? "Pausar" : "Activar"}
                </Button>
              }
            />
            <TooltipContent>
              {row.active ? "Pausar automatización" : "Activar automatización"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={onTest}
                  aria-label="Probar automatización"
                >
                  <FlaskConical className="size-4" />
                </Button>
              }
            />
            <TooltipContent>Probar</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={onEdit}
                  aria-label="Editar automatización"
                >
                  <Pencil className="size-4" />
                </Button>
              }
            />
            <TooltipContent>Editar</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    );
  }

  return label ? (
    <Button type="button" variant="outline" size="sm" onClick={onClick}>
      {icon}
      {label}
    </Button>
  ) : (
    <span className="text-sm text-muted-foreground">—</span>
  );
}