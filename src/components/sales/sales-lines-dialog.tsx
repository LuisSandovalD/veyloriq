"use client";

import { useState, type FormEvent } from "react";
import { Loader2, RotateCcw, Truck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Row = Record<string, unknown>;

export function SalesLinesDialog({
    open,
    order,
    kind,
    onOpenChange,
    onSubmit,
}: {
    open: boolean;
    order?: Row;
    kind?: "ship" | "return";
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: Row) => Promise<void>;
}) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string>();

    if (!order || !kind) return null;

    const currentOrder = order;
    const currentKind = kind;
    const lines = (currentOrder.lines ?? []) as Row[];

    async function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setError(undefined);

        const form = new FormData(event.currentTarget);
        const selectedLines = lines
            .map((line) => ({
                lineId: line.id,
                quantity: Number(form.get(String(line.id)) ?? 0),
            }))
            .filter((item) => item.quantity > 0);

        if (!selectedLines.length) {
            setError("Selecciona al menos una cantidad.");
            setSaving(false);
            return;
        }

        const data: Row = { id: currentOrder.id, lines: selectedLines };

        if (currentKind === "return") {
            data.disposition = form.get("disposition");
            data.reason = form.get("reason");
        }

        try {
            await onSubmit(data);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Error inesperado.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={(value) => !saving && onOpenChange(value)}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
                <form onSubmit={save} className="space-y-5">
                    <DialogHeader>
                        <DialogTitle>
                            {currentKind === "ship" ? "Registrar despacho parcial" : "Registrar devolución"}
                        </DialogTitle>
                        <DialogDescription>
                            {currentKind === "ship"
                                ? "Indica las cantidades que serán despachadas."
                                : "Indica las cantidades devueltas y su disposición."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {lines.map((line) => {
                            const max =
                                currentKind === "ship"
                                    ? Number(line.reserved ?? 0) - Number(line.shipped ?? 0)
                                    : Number(line.shipped ?? 0) - Number(line.returned ?? 0);

                            if (max <= 0) return null;

                            return (
                                <div key={String(line.id)} className="space-y-2">
                                    <Label htmlFor={`line-${String(line.id)}`}>
                                        {String(line.description)} · máximo {max}
                                    </Label>
                                    <Input
                                        id={`line-${String(line.id)}`}
                                        name={String(line.id)}
                                        type="number"
                                        min="0"
                                        max={max}
                                        step="0.0001"
                                        defaultValue={max}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {currentKind === "return" && (
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <Label>Disposición</Label>
                                <Select name="disposition" defaultValue="SELLABLE">
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SELLABLE">Reingreso vendible</SelectItem>
                                        <SelectItem value="DAMAGED">Dañado</SelectItem>
                                        <SelectItem value="QUARANTINE">Cuarentena</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="return-reason">Motivo</Label>
                                <Input id="return-reason" name="reason" minLength={5} required />
                            </div>
                        </div>
                    )}

                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>

                        <Button type="submit" disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="size-4 animate-spin" />
                                    Procesando…
                                </>
                            ) : currentKind === "ship" ? (
                                <>
                                    <Truck className="size-4" />
                                    Confirmar despacho
                                </>
                            ) : (
                                <>
                                    <RotateCcw className="size-4" />
                                    Confirmar devolución
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}