"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Row = Record<string, unknown>;

export function TaskCreateDialog({
    open,
    members,
    onOpenChange,
    onSubmit,
}: {
    open: boolean;
    members: Row[];
    onOpenChange: (open: boolean) => void;
    onSubmit: (payload: Row) => Promise<void>;
}) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string>();

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setBusy(true);
        setError(undefined);

        const values = Object.fromEntries(new FormData(event.currentTarget));

        try {
            await onSubmit({
                action: "create",
                title: values.title,
                description: values.description || undefined,
                assigneeId: values.assigneeId === "__none__" ? null : values.assigneeId || null,
                priority: values.priority,
                dueAt: values.dueAt ? new Date(`${values.dueAt}T12:00:00`).toISOString() : null,
                resourceType: values.resourceType || null,
                resourceId: values.resourceId || null,
            });
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Error inesperado.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={(value) => !busy && onOpenChange(value)}>
            <DialogContent className="sm:max-w-xl">
                <form onSubmit={submit} className="space-y-5">
                    <DialogHeader>
                        <DialogTitle>Nueva tarea</DialogTitle>
                        <DialogDescription>Crea una tarea y asigna responsable, prioridad y vencimiento.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <Label htmlFor="task-title">Título</Label>
                        <Input id="task-title" name="title" maxLength={160} required />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="task-description">Descripción</Label>
                        <Textarea id="task-description" name="description" rows={3} />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Responsable</Label>
                            <Select name="assigneeId" defaultValue="__none__">
                                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">Sin asignar</SelectItem>
                                    {members.map((member) => (
                                        <SelectItem key={String(member.id)} value={String(member.id)}>
                                            {String(member.displayName)} · {String(member.email)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Prioridad</Label>
                            <Select name="priority" defaultValue="MEDIUM">
                                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="LOW">Baja</SelectItem>
                                    <SelectItem value="MEDIUM">Media</SelectItem>
                                    <SelectItem value="HIGH">Alta</SelectItem>
                                    <SelectItem value="URGENT">Urgente</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="task-dueAt">Vencimiento</Label>
                            <Input id="task-dueAt" name="dueAt" type="date" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="task-resourceType">Tipo de recurso</Label>
                            <Input id="task-resourceType" name="resourceType" maxLength={80} />
                        </div>

                        <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="task-resourceId">ID del recurso</Label>
                            <Input id="task-resourceId" name="resourceId" maxLength={120} />
                        </div>
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={busy}>
                            {busy ? <><Loader2 className="size-4 animate-spin" />Guardando…</> : <><Plus className="size-4" />Crear tarea</>}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}