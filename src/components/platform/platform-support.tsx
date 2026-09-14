"use client";

import { type FormEvent } from "react";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";

type Row = Record<string, unknown>;

type Organization = {
    id: string;
    name: string;
};

export function PlatformSupport({
    data,
    organizations,
    action,
}: {
    data: Row[];
    organizations: Organization[];
    action: (payload: Row) => Promise<void>;
}) {
    async function grant(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const form = event.currentTarget;
        const values = Object.fromEntries(new FormData(form));

        if (!values.organizationId) return;

        await action({
            action: "support.grant",
            organizationId: values.organizationId,
            reason: values.reason,
            durationMinutes: Number(values.durationMinutes),
            scopes: [
                "organization.metadata",
                "billing.read",
                "jobs.read",
                "integrations.read",
            ],
        });

        form.reset();
    }

    async function revoke(row: Row) {
        const reason = window.prompt("Motivo de revocación");
        if (!reason?.trim()) return;

        await action({
            action: "support.revoke",
            grantId: row.id,
            reason: reason.trim(),
        });
    }

    return (
        <div className="space-y-5">
            <Card>
                <CardHeader>
                    <CardTitle>Autorización excepcional de soporte</CardTitle>
                    <CardDescription>
                        Acceso limitado a metadatos operativos; nunca concede acceso automático a datos de negocio.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={grant} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label>Organización</Label>
                                <Select name="organizationId">
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Selecciona una organización" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {organizations.map((org) => (
                                            <SelectItem key={org.id} value={org.id}>
                                                {org.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="support-duration">Duración en minutos</Label>
                                <Input
                                    id="support-duration"
                                    name="durationMinutes"
                                    type="number"
                                    min="1"
                                    max="480"
                                    defaultValue="60"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="support-reason">Motivo detallado</Label>
                            <Textarea
                                id="support-reason"
                                name="reason"
                                rows={3}
                                required
                            />
                        </div>

                        <Button type="submit">
                            <ShieldCheck className="size-4" />
                            Autorizar
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <div className="overflow-hidden rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Organización</TableHead>
                            <TableHead>Operador</TableHead>
                            <TableHead>Vence</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Acción</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {data.map((row) => {
                            const expired = new Date(String(row.expiresAt)) < new Date();
                            const status = row.revokedAt
                                ? "Revocada"
                                : expired
                                    ? "Vencida"
                                    : "Vigente";

                            return (
                                <TableRow key={String(row.id)}>
                                    <TableCell>
                                        {String((row.organization as Row | undefined)?.name ?? "—")}
                                    </TableCell>
                                    <TableCell>
                                        {String((row.operator as Row | undefined)?.email ?? "—")}
                                    </TableCell>
                                    <TableCell>
                                        {new Date(String(row.expiresAt)).toLocaleString("es-PE")}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={status === "Vigente" ? "default" : "secondary"}>
                                            {status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {!row.revokedAt && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => void revoke(row)}
                                            >
                                                <ShieldOff className="size-4" />
                                                Revocar
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}

                        {!data.length && (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    No hay autorizaciones de soporte.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}