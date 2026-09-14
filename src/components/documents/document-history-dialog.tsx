"use client";

import {
    FileClock,
    History,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type Row = Record<string, unknown>;

export function DocumentHistoryDialog({
    open,
    history,
    onOpenChange,
}: {
    open: boolean;
    history: Row[];
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <Dialog
            open={open}
            onOpenChange={onOpenChange}
        >
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <History className="size-5" />
                        Historial de versiones
                    </DialogTitle>

                    <DialogDescription>
                        Versiones registradas para este documento.
                    </DialogDescription>
                </DialogHeader>

                {!history.length ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-muted">
                            <FileClock className="size-5 text-muted-foreground" />
                        </div>

                        <p className="font-medium">
                            Sin versiones anteriores
                        </p>

                        <p className="mt-1 text-sm text-muted-foreground">
                            No hay historial adicional disponible.
                        </p>
                    </div>
                ) : (
                    <ScrollArea className="max-h-[420px]">
                        <div className="space-y-4 pr-4">
                            {history.map(
                                (item, index) => (
                                    <div
                                        key={String(item.id)}
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium">
                                                    v
                                                    {String(
                                                        item.version ??
                                                        "—",
                                                    )}{" "}
                                                    ·{" "}
                                                    {String(
                                                        item.name ?? "—",
                                                    )}
                                                </p>

                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {new Date(
                                                        String(
                                                            item.createdAt,
                                                        ),
                                                    ).toLocaleString(
                                                        "es-PE",
                                                    )}
                                                </p>
                                            </div>

                                            <Badge variant="outline">
                                                {String(
                                                    item.status ?? "—",
                                                )}
                                            </Badge>
                                        </div>

                                        {index <
                                            history.length - 1 && (
                                                <Separator className="mt-4" />
                                            )}
                                    </div>
                                ),
                            )}
                        </div>
                    </ScrollArea>
                )}

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                            onOpenChange(false)
                        }
                    >
                        Cerrar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}