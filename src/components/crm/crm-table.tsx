"use client";

import { ArrowRight, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

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

type Column = readonly [
    key: string,
    label: string,
];

const labels: Record<Entity, string> = {
    customers: "Clientes",
    contacts: "Contactos",
    leads: "Leads",
    opportunities: "Oportunidades",
    activities: "Actividad",
};

const columns: Record<
    Entity,
    readonly Column[]
> = {
    customers: [
        ["name", "Cliente"],
        ["email", "Correo"],
        ["contacts", "Contactos"],
        ["opportunities", "Oportunidades"],
    ],

    contacts: [
        ["name", "Contacto"],
        ["customer", "Cliente"],
        ["email", "Correo"],
        ["title", "Cargo"],
    ],

    leads: [
        ["name", "Lead"],
        ["company", "Empresa"],
        ["ownerId", "Responsable"],
        ["status", "Estado"],
        ["source", "Origen"],
    ],

    opportunities: [
        ["title", "Oportunidad"],
        ["customer", "Cliente"],
        ["ownerId", "Responsable"],
        ["stage", "Etapa"],
        ["value", "Valor"],
        ["probability", "Probabilidad"],
    ],

    activities: [
        ["occurredAt", "Fecha"],
        ["type", "Tipo"],
        ["subject", "Asunto"],
        ["resourceType", "Recurso"],
    ],
};

export function CrmTable({
    entity,
    rows,
    references,
    onAction,
    onAssign,
}: {
    entity: Entity;
    rows: Row[];
    references: References;
    onAction: (row: Row) => Promise<void>;
    onAssign: (
        row: Row,
        ownerId: string | null,
    ) => Promise<void>;
}) {
    function nested(
        row: Row,
        key: string,
        child: string,
    ) {
        return row[key] &&
            typeof row[key] === "object"
            ? String(
                (row[key] as Row)[child] ?? "—",
            )
            : "—";
    }

    function value(row: Row, key: string) {
        if (key === "customer") {
            return nested(
                row,
                "customer",
                "name",
            );
        }

        if (
            key === "contacts" ||
            key === "opportunities"
        ) {
            return Array.isArray(row[key])
                ? row[key].length
                : 0;
        }

        if (key === "value") {
            return new Intl.NumberFormat("es-PE", {
                style: "currency",
                currency: String(
                    row.currency ?? "PEN",
                ),
            }).format(Number(row[key] ?? 0));
        }

        if (key === "probability") {
            return `${row[key] ?? 0}%`;
        }

        if (
            key.endsWith("At") &&
            row[key]
        ) {
            return new Date(
                String(row[key]),
            ).toLocaleString("es-PE");
        }

        return String(row[key] ?? "—");
    }

    if (!rows.length) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted">
                        <Users className="size-5 text-muted-foreground" />
                    </div>

                    <p className="font-medium">
                        Aún no hay{" "}
                        {labels[entity].toLowerCase()}
                    </p>

                    <p className="mt-1 text-sm text-muted-foreground">
                        Los nuevos registros aparecerán aquí.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="overflow-hidden rounded-lg border">
            <div className="overflow-x-auto">
                <Table className="min-w-[850px]">
                    <TableHeader>
                        <TableRow>
                            {columns[entity].map(
                                ([, label]) => (
                                    <TableHead key={label}>
                                        {label}
                                    </TableHead>
                                ),
                            )}

                            {[
                                "leads",
                                "opportunities",
                            ].includes(entity) && (
                                    <TableHead className="text-right">
                                        Acción
                                    </TableHead>
                                )}
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {rows.map((row) => (
                            <TableRow
                                key={String(row.id)}
                            >
                                {columns[entity].map(
                                    ([key]) => (
                                        <TableCell key={key}>
                                            {key === "ownerId" ? (
                                                <Select
                                                    value={
                                                        row.ownerId
                                                            ? String(
                                                                row.ownerId,
                                                            )
                                                            : "__none__"
                                                    }
                                                    onValueChange={(
                                                        selected,
                                                    ) => {
                                                        if (!selected)
                                                            return;

                                                        void onAssign(
                                                            row,
                                                            selected ===
                                                                "__none__"
                                                                ? null
                                                                : selected,
                                                        );
                                                    }}
                                                >
                                                    <SelectTrigger className="w-[190px]">
                                                        <SelectValue />
                                                    </SelectTrigger>

                                                    <SelectContent>
                                                        <SelectItem value="__none__">
                                                            Sin asignar
                                                        </SelectItem>

                                                        {references.members.map(
                                                            (member) => (
                                                                <SelectItem
                                                                    key={String(
                                                                        member.id,
                                                                    )}
                                                                    value={String(
                                                                        member.id,
                                                                    )}
                                                                >
                                                                    {String(
                                                                        member.displayName ??
                                                                        "Sin nombre",
                                                                    )}
                                                                </SelectItem>
                                                            ),
                                                        )}
                                                    </SelectContent>
                                                </Select>
                                            ) : key === "status" ||
                                                key === "stage" ? (
                                                <Badge variant="outline">
                                                    {value(row, key)}
                                                </Badge>
                                            ) : (
                                                value(row, key)
                                            )}
                                        </TableCell>
                                    ),
                                )}

                                {[
                                    "leads",
                                    "opportunities",
                                ].includes(entity) && (
                                        <TableCell className="text-right">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    void onAction(row)
                                                }
                                            >
                                                {entity === "leads"
                                                    ? "Convertir"
                                                    : "Mover"}

                                                <ArrowRight className="size-4" />
                                            </Button>
                                        </TableCell>
                                    )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}