"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

type Row = Record<string, unknown>;

export function PlatformUsers({
    data,
    action,
}: {
    data: Row[];
    action: (payload: Row) => Promise<void>;
}) {
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("PLATFORM_ANALYST");

    async function save() {
        if (!email.trim()) return;

        const reason = window.prompt("Motivo del cambio de acceso");
        if (!reason?.trim()) return;

        await action({
            action: "platform_user.role",
            email: email.trim(),
            role,
            reason: reason.trim(),
        });

        setEmail("");
    }

    return (
        <div className="space-y-5">
            <Card>
                <CardContent className="flex flex-col gap-3 p-5 md:flex-row">
                    <Input
                        type="email"
                        value={email}
                        placeholder="usuario@dominio.com"
                        onChange={(event) => setEmail(event.target.value)}
                    />

                    <Select
                        value={role}
                        onValueChange={(value) => value && setRole(value)}
                    >
                        <SelectTrigger className="w-full md:w-[240px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="PLATFORM_ANALYST">PLATFORM_ANALYST</SelectItem>
                            <SelectItem value="PLATFORM_SUPPORT">PLATFORM_SUPPORT</SelectItem>
                            <SelectItem value="PLATFORM_ADMIN">PLATFORM_ADMIN</SelectItem>
                            <SelectItem value="PLATFORM_SUPERUSER">PLATFORM_SUPERUSER</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button onClick={() => void save()}>
                        <UserPlus className="size-4" />
                        Asignar acceso
                    </Button>
                </CardContent>
            </Card>

            <div className="overflow-hidden rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Correo</TableHead>
                            <TableHead>Rol</TableHead>
                            <TableHead>MFA</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {data.map((row, index) => (
                            <TableRow key={String(row.id ?? index)}>
                                <TableCell>{String(row.displayName ?? "—")}</TableCell>
                                <TableCell>{String(row.email ?? "—")}</TableCell>
                                <TableCell>{String(row.platformRole ?? "—")}</TableCell>
                                <TableCell>{row.mfaEnabled ? "Activo" : "Inactivo"}</TableCell>
                            </TableRow>
                        ))}

                        {!data.length && (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                    No hay usuarios de plataforma.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}