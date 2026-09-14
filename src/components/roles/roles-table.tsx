"use client";

import { Pencil, ShieldCheck, Trash2 } from "lucide-react";
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

export function RolesTable({
    roles,
    onEdit,
    onDelete,
}: {
    roles: Row[];
    onEdit: (role: Row) => void;
    onDelete: (role: Row) => void;
}) {
    return (
        <div className="overflow-hidden rounded-lg border border-border">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Rol</TableHead>
                            <TableHead>Rango</TableHead>
                            <TableHead>Permisos</TableHead>
                            <TableHead>Uso</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {roles.map((role) => {
                            const counts = (role._count ?? {}) as Row;
                            const grants = (role.permissions ?? []) as Array<{ permission: { key: string } }>;

                            return (
                                <TableRow key={String(role.id)}>
                                    <TableCell>
                                        <div className="flex items-center gap-2 font-medium">
                                            <ShieldCheck className="size-4 text-muted-foreground" />
                                            {String(role.name)}
                                            {Boolean(role.isSystem) && <Badge variant="secondary">Sistema</Badge>}
                                        </div>
                                    </TableCell>

                                    <TableCell>{String(role.rank)}</TableCell>
                                    <TableCell>{grants.length}</TableCell>
                                    <TableCell>{String(counts.memberships ?? 0)} miembros</TableCell>

                                    <TableCell>
                                        {!role.isSystem && (
                                            <div className="flex justify-end gap-1">
                                                <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(role)}>
                                                    <Pencil className="size-4" />
                                                    Editar
                                                </Button>

                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive"
                                                    onClick={() => onDelete(role)}
                                                >
                                                    <Trash2 className="size-4" />
                                                    <span className="sr-only">Eliminar rol</span>
                                                </Button>
                                            </div>
                                        )}
                                    </TableCell>
                                </TableRow>
                            );
                        })}

                        {!roles.length && (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    Aún no hay roles. Crea uno para delegar responsabilidades.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}