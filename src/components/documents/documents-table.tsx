"use client";

import { useState } from "react";
import {
    Archive,
    Eye,
    File,
    FileClock,
    History,
    Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type Row = Record<string, unknown>;

export function DocumentsTable({
    items,
    onPreview,
    onReplace,
    onVersions,
    onArchive,
}: {
    items: Row[];
    onPreview: (item: Row) => Promise<void>;
    onReplace: (item: Row) => void;
    onVersions: (item: Row) => Promise<void>;
    onArchive: (item: Row) => Promise<void>;
}) {
    const [archiving, setArchiving] =
        useState<Row>();
    const [busy, setBusy] = useState(false);

    async function confirmArchive() {
        if (!archiving) return;

        const current = archiving;

        try {
            setBusy(true);
            await onArchive(current);
            setArchiving(undefined);
        } finally {
            setBusy(false);
        }
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Archivos</CardTitle>
                    <CardDescription>
                        Documentos disponibles en el espacio activo.
                    </CardDescription>
                </CardHeader>

                <CardContent className="p-0">
                    {!items.length ? (
                        <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                            <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted">
                                <File className="size-5 text-muted-foreground" />
                            </div>

                            <p className="font-medium">
                                Aún no hay archivos
                            </p>

                            <p className="mt-1 text-sm text-muted-foreground">
                                Sube el primero para comenzar a versionar.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table className="min-w-[900px]">
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>
                                            Archivo
                                        </TableHead>
                                        <TableHead>
                                            Versión
                                        </TableHead>
                                        <TableHead>
                                            Estado
                                        </TableHead>
                                        <TableHead>
                                            Vínculo
                                        </TableHead>
                                        <TableHead>
                                            Tamaño
                                        </TableHead>
                                        <TableHead className="text-right">
                                            Acciones
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {items.map((item) => (
                                        <TableRow
                                            key={String(item.id)}
                                        >
                                            <TableCell className="font-medium">
                                                {String(
                                                    item.name ?? "—",
                                                )}
                                            </TableCell>

                                            <TableCell>
                                                v
                                                {String(
                                                    item.version ?? "—",
                                                )}
                                            </TableCell>

                                            <TableCell>
                                                <Badge variant="outline">
                                                    {String(
                                                        item.status ?? "—",
                                                    )}
                                                </Badge>
                                            </TableCell>

                                            <TableCell>
                                                {item.resourceType
                                                    ? `${String(
                                                        item.resourceType,
                                                    )} · ${String(
                                                        item.resourceId ??
                                                        "—",
                                                    )}`
                                                    : "—"}
                                            </TableCell>

                                            <TableCell className="whitespace-nowrap">
                                                {Math.ceil(
                                                    Number(item.size ?? 0) /
                                                    1024,
                                                )}{" "}
                                                KB
                                            </TableCell>

                                            <TableCell>
                                                <div className="flex justify-end gap-1">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={
                                                            item.status !==
                                                            "READY"
                                                        }
                                                        onClick={() =>
                                                            void onPreview(item)
                                                        }
                                                    >
                                                        <Eye className="size-4" />
                                                        Vista
                                                    </Button>

                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() =>
                                                            onReplace(item)
                                                        }
                                                    >
                                                        <FileClock className="size-4" />
                                                        Nueva versión
                                                    </Button>

                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            void onVersions(item)
                                                        }
                                                    >
                                                        <History className="size-4" />
                                                        Historial
                                                    </Button>

                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-destructive hover:text-destructive"
                                                        onClick={() =>
                                                            setArchiving(item)
                                                        }
                                                    >
                                                        <Archive className="size-4" />
                                                        Archivar
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <AlertDialog
                open={Boolean(archiving)}
                onOpenChange={(open) => {
                    if (!open && !busy) {
                        setArchiving(undefined);
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Archivar documento
                        </AlertDialogTitle>

                        <AlertDialogDescription>
                            El archivo se archivará y la eliminación física se procesará de forma controlada.
                            Esta acción no elimina inmediatamente el historial de versiones.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel
                            disabled={busy}
                        >
                            Cancelar
                        </AlertDialogCancel>

                        <AlertDialogAction
                            disabled={busy}
                            onClick={(event) => {
                                event.preventDefault();
                                void confirmArchive();
                            }}
                        >
                            {busy ? (
                                <>
                                    <Loader2 className="size-4 animate-spin" />
                                    Archivando…
                                </>
                            ) : (
                                <>
                                    <Archive className="size-4" />
                                    Archivar
                                </>
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}