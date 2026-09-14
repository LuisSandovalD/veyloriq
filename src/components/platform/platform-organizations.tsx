"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

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

export function PlatformOrganizations({
    data,
    action,
}: {
    data: Organization[];
    action: (payload: Row) => Promise<void>;
}) {
    async function change(org: Organization) {
        const operation = org.status === "SUSPENDED" ? "reactivate" : "suspend";
        const reason = window.prompt(
            `Motivo para ${operation === "reactivate" ? "reactivar" : "suspender"} ${org.name}`,
        );

        if (!reason?.trim()) return;

        await action({
            action: operation,
            organizationId: org.id,
            reason: reason.trim(),
        });
    }

    return (
        <div className="overflow-hidden rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Organización</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Miembros</TableHead>
                        <TableHead>Productos</TableHead>
                        <TableHead>Pedidos</TableHead>
                        <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {data.map((org) => (
                        <TableRow key={org.id}>
                            <TableCell className="font-medium">{org.name}</TableCell>
                            <TableCell>
                                <Badge variant="outline">{org.status}</Badge>
                            </TableCell>
                            <TableCell>{org.subscription?.plan.name ?? "Sin plan"}</TableCell>
                            <TableCell>{org._count.memberships}</TableCell>
                            <TableCell>{org._count.products}</TableCell>
                            <TableCell>{org._count.orders}</TableCell>
                            <TableCell className="text-right">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => void change(org)}
                                >
                                    {org.status === "SUSPENDED" ? "Reactivar" : "Suspender"}
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}

                    {!data.length && (
                        <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                No hay organizaciones.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}