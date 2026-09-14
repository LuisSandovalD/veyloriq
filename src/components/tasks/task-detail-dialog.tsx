"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Send } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Row = Record<string, unknown>;

export function TaskDetailDialog({
    open,
    task,
    members,
    onOpenChange,
    onSubmit,
}: {
    open: boolean;
    task?: Row;
    members: Row[];
    onOpenChange: (open: boolean) => void;
    onSubmit: (payload: Row) => Promise<void>;
}) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string>();

    if (!task) return null;

    const currentTask = task;
    const comments = (currentTask.comments ?? []) as Row[];
    const events = (currentTask.events ?? []) as Row[];

    async function update(payload: Row) {
        try {
            setBusy(true);
            setError(undefined);
            await onSubmit({ action: "update", taskId: currentTask.id, ...payload });
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Error inesperado.");
        } finally {
            setBusy(false);
        }
    }

    async function comment(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const body = new FormData(form).get("body");

        try {
            setBusy(true);
            setError(undefined);
            await onSubmit({ action: "comment", taskId: currentTask.id, body });
            form.reset();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Error inesperado.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={(value) => !busy && onOpenChange(value)}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <div className="space-y-6">
                    <DialogHeader>
                        <DialogTitle>{String(currentTask.title)}</DialogTitle>
                        <DialogDescription>{String(currentTask.description ?? "Sin descripción")}</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Estado</Label>
                            <Select
                                value={String(currentTask.status)}
                                disabled={busy}
                                onValueChange={(value) => value && void update({ status: value })}
                            >
                                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="OPEN">Abierta</SelectItem>
                                    <SelectItem value="IN_PROGRESS">En progreso</SelectItem>
                                    <SelectItem value="DONE">Completada</SelectItem>
                                    <SelectItem value="CANCELLED">Cancelada</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Responsable</Label>
                            <Select
                                value={currentTask.assigneeId ? String(currentTask.assigneeId) : "__none__"}
                                disabled={busy}
                                onValueChange={(value) => value && void update({ assigneeId: value === "__none__" ? null : value })}
                            >
                                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">Sin asignar</SelectItem>
                                    {members.map((member) => (
                                        <SelectItem key={String(member.id)} value={String(member.id)}>
                                            {String(member.displayName)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-foreground">Comentarios</h3>

                        {!comments.length && (
                            <p className="text-sm text-muted-foreground">Aún no hay comentarios.</p>
                        )}

                        {comments.map((comment) => (
                            <div key={String(comment.id)} className="rounded-lg border border-border p-3">
                                <p className="text-sm font-medium text-foreground">
                                    {String((comment.author as Row | undefined)?.displayName ?? "Usuario")}
                                </p>
                                <p className="mt-1 text-sm text-foreground">{String(comment.body)}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {new Date(String(comment.createdAt)).toLocaleString("es-PE")}
                                </p>
                            </div>
                        ))}

                        <form onSubmit={comment} className="flex gap-2">
                            <Input name="body" maxLength={2000} placeholder="Escribe un comentario…" required />
                            <Button type="submit" disabled={busy}>
                                {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                                <span className="hidden sm:inline">Comentar</span>
                            </Button>
                        </form>
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-foreground">Historial</h3>

                        {!events.length && (
                            <p className="text-sm text-muted-foreground">Aún no hay movimientos registrados.</p>
                        )}

                        <div className="divide-y divide-border">
                            {events.map((item) => (
                                <div key={String(item.id)} className="py-3 text-sm">
                                    <span className="font-medium text-foreground">{String(item.action)}</span>
                                    <span className="text-muted-foreground">
                                        {" "}· {String((item.actor as Row | undefined)?.displayName ?? "Usuario")}
                                    </span>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {new Date(String(item.createdAt)).toLocaleString("es-PE")}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
                            Cerrar
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}