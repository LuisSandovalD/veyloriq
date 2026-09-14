"use client";

import { useState } from "react";
import { Crown, Loader2, UserMinus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TransferOwnershipDialog } from "./transfer-ownership-dialog";
import type { TeamMember, TeamRole } from "./team-panel";

export function TeamMembersTable({
    members,
    roles,
    onAction,
}: {
    members: TeamMember[];
    roles: TeamRole[];
    onAction: (payload: Record<string, unknown>) => Promise<void>;
}) {
    const [busy, setBusy] = useState<string>();
    const [error, setError] = useState<string>();
    const [transferMember, setTransferMember] = useState<TeamMember>();
    const [removeMember, setRemoveMember] = useState<TeamMember>();

    async function changeRole(member: TeamMember, roleId: string) {
        try {
            setBusy(`role:${member.user.id}`);
            setError(undefined);
            await onAction({ action: "change_role", userId: member.user.id, roleId });
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "No se pudo cambiar el rol.");
        } finally {
            setBusy(undefined);
        }
    }

    async function remove() {
        if (!removeMember) return;
        const current = removeMember;
        try {
            setBusy(`remove:${current.user.id}`);
            setError(undefined);
            await onAction({ action: "remove", userId: current.user.id });
            setRemoveMember(undefined);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "No se pudo retirar al miembro.");
        } finally {
            setBusy(undefined);
        }
    }

    return (
        <>
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <Table className="min-w-[800px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Persona</TableHead>
                                <TableHead>Correo</TableHead>
                                <TableHead>Rol</TableHead>
                                <TableHead>MFA</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {members.map((member) => {
                                const roleBusy = busy === `role:${member.user.id}`;
                                return (
                                    <TableRow key={member.id}>
                                        <TableCell className="font-medium">{member.user.displayName || "—"}</TableCell>
                                        <TableCell className="text-muted-foreground">{member.user.email}</TableCell>
                                        <TableCell>
                                            {member.role.name === "OWNER" ? (
                                                <Badge>OWNER</Badge>
                                            ) : (
                                                <Select value={member.role.id} disabled={Boolean(busy)} onValueChange={(value) => value && void changeRole(member, value)}>
                                                    <SelectTrigger className="w-40">
                                                        {roleBusy ? <Loader2 className="size-4 animate-spin" /> : <SelectValue />}
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {roles.filter((role) => role.name !== "OWNER").map((role) => <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        </TableCell>
                                        <TableCell><Badge variant={member.user.mfaEnabled ? "default" : "secondary"}>{member.user.mfaEnabled ? "Activo" : "No"}</Badge></TableCell>
                                        <TableCell>
                                            {member.role.name !== "OWNER" && (
                                                <div className="flex justify-end gap-1">
                                                    <Button type="button" variant="ghost" size="sm" disabled={Boolean(busy)} onClick={() => setTransferMember(member)}>
                                                        <Crown className="size-4" />Hacer propietario
                                                    </Button>
                                                    <Button type="button" variant="ghost" size="sm" disabled={Boolean(busy)} className="text-destructive hover:text-destructive" onClick={() => setRemoveMember(member)}>
                                                        <UserMinus className="size-4" />Retirar
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}

                            {!members.length && (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No hay miembros registrados.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            <TransferOwnershipDialog
                member={transferMember}
                open={Boolean(transferMember)}
                onOpenChange={(open) => !open && setTransferMember(undefined)}
                onTransfer={async (member, password) => {
                    await onAction({ action: "transfer_ownership", userId: member.user.id, password });
                }}
            />

            <AlertDialog open={Boolean(removeMember)} onOpenChange={(open) => !open && !busy && setRemoveMember(undefined)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Retirar miembro</AlertDialogTitle>
                        <AlertDialogDescription>
                            {removeMember?.user.displayName ?? "Este miembro"} perderá acceso a la organización y sus sesiones serán revocadas.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={Boolean(busy)}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            disabled={Boolean(busy)}
                            onClick={(event) => {
                                event.preventDefault();
                                void remove();
                            }}
                        >
                            {removeMember && busy === `remove:${removeMember.user.id}` ? <><Loader2 className="size-4 animate-spin" />Retirando…</> : "Retirar miembro"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}