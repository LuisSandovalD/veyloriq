"use client";

import { useState, type FormEvent } from "react";
import { Crown, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TeamMember } from "./team-panel";

export function TransferOwnershipDialog({
    member,
    open,
    onOpenChange,
    onTransfer,
}: {
    member?: TeamMember;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onTransfer: (member: TeamMember, password: string) => Promise<void>;
}) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string>();

    if (!member) return null;
    const currentMember = member;

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const password = String(new FormData(event.currentTarget).get("password") ?? "");
        try {
            setBusy(true);
            setError(undefined);
            await onTransfer(currentMember, password);
            onOpenChange(false);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "No se pudo transferir la propiedad.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={(value) => !busy && onOpenChange(value)}>
            <DialogContent className="sm:max-w-md">
                <form onSubmit={submit} className="space-y-5">
                    <DialogHeader>
                        <DialogTitle>Transferir propiedad</DialogTitle>
                        <DialogDescription>
                            {currentMember.user.displayName} pasará a ser propietario de la organización. Confirma la operación con tu contraseña actual.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <Label htmlFor="ownership-password">Contraseña actual</Label>
                        <Input id="ownership-password" name="password" type="password" autoComplete="current-password" required autoFocus />
                    </div>

                    {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

                    <DialogFooter>
                        <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>Cancelar</Button>
                        <Button type="submit" disabled={busy}>
                            {busy ? <Loader2 className="size-4 animate-spin" /> : <Crown className="size-4" />}
                            {busy ? "Transfiriendo…" : "Transferir propiedad"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}