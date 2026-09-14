"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { ScrollArea } from "@/components/ui/scroll-area";

type Row = Record<string, unknown>;

export function RoleDialog({
    open,
    role,
    permissions,
    onOpenChange,
    onSubmit,
}: {
    open: boolean;
    role?: Row;
    permissions: Row[];
    onOpenChange: (open: boolean) => void;
    onSubmit: (payload: Row) => Promise<void>;
}) {
    const initialPermissions = ((role?.permissions ?? []) as Array<{ permission: { key: string } }>).map(
        (item) => item.permission.key,
    );

    const [selectedPermissions, setSelectedPermissions] = useState<string[]>(initialPermissions);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string>();

    if (!role) return null;

    const currentRole = role;

    async function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setError(undefined);

        const form = new FormData(event.currentTarget);

        try {
            await onSubmit({
                action: currentRole.id ? "update" : "create",
                roleId: currentRole.id,
                name: form.get("name"),
                rank: Number(form.get("rank")),
                permissions: selectedPermissions,
            });
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Error inesperado.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={(value) => !saving && onOpenChange(value)}>
            <DialogContent className="sm:max-w-xl">
                <form onSubmit={save} className="space-y-5">
                    <DialogHeader>
                        <DialogTitle>{currentRole.id ? "Editar rol" : "Nuevo rol"}</DialogTitle>
                        <DialogDescription>
                            Define la jerarquía y los permisos disponibles para este rol.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="role-name">Nombre</Label>
                            <Input
                                id="role-name"
                                name="name"
                                defaultValue={String(currentRole.name ?? "")}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="role-rank">Rango</Label>
                            <Input
                                id="role-rank"
                                name="rank"
                                type="number"
                                min="1"
                                max="99"
                                defaultValue={String(currentRole.rank ?? 40)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Permisos</Label>

                        <ScrollArea className="h-72 rounded-md border">
                            <div className="space-y-1 p-3">
                                {permissions.map((permission) => {
                                    const key = String(permission.key);
                                    const checked = selectedPermissions.includes(key);

                                    return (
                                        <label
                                            key={String(permission.id)}
                                            htmlFor={`permission-${String(permission.id)}`}
                                            className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted"
                                        >
                                            <Checkbox
                                                id={`permission-${String(permission.id)}`}
                                                checked={checked}
                                                onCheckedChange={(value) => {
                                                    setSelectedPermissions((current) =>
                                                        value
                                                            ? current.includes(key)
                                                                ? current
                                                                : [...current, key]
                                                            : current.filter((item) => item !== key),
                                                    );
                                                }}
                                            />

                                            <span className="break-all text-muted-foreground">{key}</span>
                                        </label>
                                    );
                                })}

                                {!permissions.length && (
                                    <p className="py-6 text-center text-sm text-muted-foreground">
                                        No hay permisos disponibles.
                                    </p>
                                )}
                            </div>
                        </ScrollArea>
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
                            onClick={() => onOpenChange(false)}
                        >
                            Cancelar
                        </Button>

                        <Button type="submit" disabled={saving}>
                            {saving ? (
                                <>
                                    <Loader2 className="size-4 animate-spin" />
                                    Guardando…
                                </>
                            ) : (
                                <>
                                    <Save className="size-4" />
                                    Guardar
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}