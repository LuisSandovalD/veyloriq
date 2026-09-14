"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Settings2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Row = Record<string, unknown>;

export function PlatformPlans({
    data,
    action,
}: {
    data: Row[];
    action: (payload: Row) => Promise<void>;
}) {
    const [editing, setEditing] = useState<Row>();
    const [active, setActive] = useState(false);
    const [error, setError] = useState<string>();
    const [saving, setSaving] = useState(false);

    function edit(plan: Row) {
        setError(undefined);
        setActive(Boolean(plan.active));
        setEditing(plan);
    }

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!editing) return;

        const currentPlan = editing;
        const form = new FormData(event.currentTarget);
        let limits: Row;

        try {
            limits = JSON.parse(String(form.get("limits")));
        } catch {
            setError("Los límites deben contener JSON válido.");
            return;
        }

        try {
            setSaving(true);
            setError(undefined);

            await action({
                action: "plan.update",
                planId: currentPlan.id,
                name: form.get("name"),
                monthlyPrice: Number(form.get("monthlyPrice")),
                annualPrice: Number(form.get("annualPrice")),
                currency: form.get("currency"),
                active,
                limits,
                features: String(form.get("features"))
                    .split(",")
                    .map((value) => value.trim())
                    .filter(Boolean),
            });

            setEditing(undefined);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Error inesperado.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {data.map((plan) => {
                    const features = Array.isArray(plan.features)
                        ? plan.features.map(String)
                        : [];

                    return (
                        <Card key={String(plan.id)}>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <Badge variant="outline">{String(plan.code)}</Badge>
                                    <Badge variant={plan.active ? "default" : "secondary"}>
                                        {plan.active ? "Activo" : "Inactivo"}
                                    </Badge>
                                </div>
                                <CardTitle>{String(plan.name)}</CardTitle>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                <p className="text-2xl font-semibold">
                                    {String(plan.currency)} {String(plan.monthlyPrice)}
                                    <span className="text-sm font-normal text-muted-foreground"> /mes</span>
                                </p>

                                <div className="space-y-1">
                                    {features.slice(0, 4).map((feature) => (
                                        <p key={feature} className="text-sm text-muted-foreground">
                                            {feature}
                                        </p>
                                    ))}
                                </div>

                                <Button variant="outline" size="sm" onClick={() => edit(plan)}>
                                    <Settings2 className="size-4" />
                                    Configurar
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <Dialog
                open={Boolean(editing)}
                onOpenChange={(open) => !open && !saving && setEditing(undefined)}
            >
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
                    {editing && (
                        <form onSubmit={submit} className="space-y-5">
                            <DialogHeader>
                                <DialogTitle>Configurar {String(editing.code)}</DialogTitle>
                                <DialogDescription>
                                    Precios, límites, funciones y disponibilidad comercial.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-2">
                                <Label htmlFor="plan-name">Nombre</Label>
                                <Input
                                    id="plan-name"
                                    name="name"
                                    defaultValue={String(editing.name ?? "")}
                                    required
                                />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="monthly-price">Precio mensual</Label>
                                    <Input
                                        id="monthly-price"
                                        name="monthlyPrice"
                                        type="number"
                                        step="0.01"
                                        defaultValue={String(editing.monthlyPrice ?? 0)}
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="annual-price">Precio anual</Label>
                                    <Input
                                        id="annual-price"
                                        name="annualPrice"
                                        type="number"
                                        step="0.01"
                                        defaultValue={String(editing.annualPrice ?? 0)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Moneda</Label>
                                <Select name="currency" defaultValue={String(editing.currency ?? "PEN")}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PEN">PEN</SelectItem>
                                        <SelectItem value="USD">USD</SelectItem>
                                        <SelectItem value="EUR">EUR</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="plan-limits">Límites JSON</Label>
                                <Textarea
                                    id="plan-limits"
                                    name="limits"
                                    rows={6}
                                    className="font-mono text-xs"
                                    defaultValue={JSON.stringify(editing.limits ?? {}, null, 2)}
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="plan-features">Funciones separadas por coma</Label>
                                <Textarea
                                    id="plan-features"
                                    name="features"
                                    rows={3}
                                    defaultValue={
                                        Array.isArray(editing.features)
                                            ? editing.features.join(", ")
                                            : ""
                                    }
                                />
                            </div>

                            <div className="flex items-center gap-3 rounded-lg border p-4">
                                <Checkbox
                                    id="plan-active"
                                    checked={active}
                                    onCheckedChange={(value) => setActive(Boolean(value))}
                                />
                                <Label htmlFor="plan-active" className="cursor-pointer">
                                    Plan visible y activo
                                </Label>
                            </div>

                            {error && (
                                <Alert variant="destructive">
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={saving}
                                    onClick={() => setEditing(undefined)}
                                >
                                    Cancelar
                                </Button>

                                <Button type="submit" disabled={saving}>
                                    {saving && <Loader2 className="size-4 animate-spin" />}
                                    {saving ? "Guardando…" : "Guardar"}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}