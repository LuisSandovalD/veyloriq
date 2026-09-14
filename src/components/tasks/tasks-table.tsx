"use client";

import { CheckCircle2, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Row = Record<string, unknown>;

export function TasksTable({
    tasks,
    onOpen,
    onComplete,
}: {
    tasks: Row[];
    onOpen: (task: Row) => void;
    onComplete: (task: Row) => void;
}) {
    return (
        <div className="overflow-hidden rounded-lg border border-border">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tarea</TableHead>
                            <TableHead>Responsable</TableHead>
                            <TableHead>Prioridad</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Vence</TableHead>
                            <TableHead>Comentarios</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {tasks.map((task) => (
                            <TableRow key={String(task.id)}>
                                <TableCell>
                                    <p className="font-medium text-foreground">{String(task.title)}</p>
                                    {Boolean(task.resourceType) && (
                                        <p className="text-xs text-muted-foreground">
                                            {String(task.resourceType)} · {String(task.resourceId)}
                                        </p>
                                    )}
                                </TableCell>

                                <TableCell>{String((task.assignee as Row | undefined)?.displayName ?? "Sin asignar")}</TableCell>
                                <TableCell><Badge variant="outline">{String(task.priority)}</Badge></TableCell>
                                <TableCell><Badge variant={task.status === "DONE" ? "secondary" : "default"}>{String(task.status)}</Badge></TableCell>
                                <TableCell>{task.dueAt ? new Date(String(task.dueAt)).toLocaleDateString("es-PE") : "—"}</TableCell>
                                <TableCell>{String((task._count as Row | undefined)?.comments ?? 0)}</TableCell>

                                <TableCell>
                                    <div className="flex justify-end gap-1">
                                        <Button variant="ghost" size="sm" onClick={() => onOpen(task)}>
                                            <MessageSquare className="size-4" />
                                            Abrir
                                        </Button>

                                        {["OPEN", "IN_PROGRESS"].includes(String(task.status)) && (
                                            <Button variant="ghost" size="sm" onClick={() => onComplete(task)}>
                                                <CheckCircle2 className="size-4" />
                                                Completar
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}

                        {!tasks.length && (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                    Aún no hay tareas.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}