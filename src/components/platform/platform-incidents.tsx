"use client";

import { type FormEvent } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

export function PlatformIncidents({
    data,
    organizations,
    action,
}: {
    data: Row[];
    organizations: Organization[];
    action: (payload: Row) => Promise<void>;
}) {
    async function create(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const form = event.currentTarget;
        const values = Object.fromEntries(new FormData(form));
        const organizationId =
            values.organizationId === "__global__"
                ? undefined
                : values.organizationId || undefined;

        await action({
            action: "incident.open",
            title: values.title,
            description: values.description,
            severity: values.severity,
            organizationId,
        });

        form.reset();
    }

    async function resolve(row: Row) {
        const resolution = window.prompt("Resolución aplicada");
        if (!resolution?.trim()) return;

        await action({
            action: "incident.resolve",
            incidentId: row.id,
            resolution: resolution.trim(),
        });
    }

    return (
        <div className="space-y-5">
            <Card>
                <CardContent className="p-5">
                    <form onSubmit={create} className="space-y-4">
                        <div className="grid gap-4 lg:grid-cols-3">
                            <div className="space-y-2">
                                <Label htmlFor="incident-title">Título</Label>
                                <Input id="incident-title" name="title" required />
                            </div>

                            <div className="space-y-2">
                                <Label>Organización</Label>
                                <Select name="organizationId" defaultValue="__global__">
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__global__">Global</SelectItem>
                                        {organizations.map((org) => (
                                            <SelectItem key={org.id} value={org.id}>
                                                {org.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Severidad</Label>
                                <Select name="severity" defaultValue="MEDIUM">
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="LOW">Baja</SelectItem>
                                        <SelectItem value="MEDIUM">Media</SelectItem>
                                        <SelectItem value="HIGH">Alta</SelectItem>
                                        <SelectItem value="CRITICAL">Crítica</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="incident-description">Descripción</Label>
                            <Textarea
                                id="incident-description"
                                name="description"
                                rows={3}
                                required
                            />
                        </div>

                        <Button type="submit">
                            <AlertTriangle className="size-4" />
                            Abrir incidente
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <div className="overflow-hidden rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Título</TableHead>
                            <TableHead>Severidad</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Organización</TableHead>
                            <TableHead className="text-right">Acción</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {data.map((row) => (
                            <TableRow key={String(row.id)}>
                                <TableCell className="font-medium">{String(row.title)}</TableCell>
                                <TableCell>
                                    <Badge variant="outline">{String(row.severity)}</Badge>
                                </TableCell>
                                <TableCell>{String(row.status)}</TableCell>
                                <TableCell>
                                    {String((row.organization as Row | undefined)?.name ?? "Global")}
                                </TableCell>
                                <TableCell className="text-right">
                                    {row.status !== "RESOLVED" && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => void resolve(row)}
                                        >
                                            <CheckCircle2 className="size-4" />
                                            Resolver
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}

                        {!data.length && (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    No hay incidentes registrados.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}