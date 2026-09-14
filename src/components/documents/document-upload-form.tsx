"use client";

import {
    useState,
    type FormEvent,
} from "react";
import {
    FileUp,
    Loader2,
    RotateCcw,
    Upload,
} from "lucide-react";
import {
    Alert,
    AlertDescription,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type Row = Record<string, unknown>;

export function DocumentUploadForm({
    replaces,
    onCancelReplace,
    onUpload,
}: {
    replaces?: Row;
    onCancelReplace: () => void;
    onUpload: (data: FormData) => Promise<void>;
}) {
    const [busy, setBusy] = useState(false);
    const [error, setError] =
        useState<string>();

    async function submit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        const form = event.currentTarget;
        const data = new FormData(form);

        if (
            data.get("resourceType") ===
            "__none__"
        ) {
            data.delete("resourceType");
            data.delete("resourceId");
        }

        try {
            setBusy(true);
            setError(undefined);

            await onUpload(data);

            form.reset();
        } catch (reason) {
            setError(
                reason instanceof Error
                    ? reason.message
                    : "No se pudo subir el archivo.",
            );
        } finally {
            setBusy(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FileUp className="size-5" />
                    </div>

                    <div>
                        <CardTitle>
                            {replaces
                                ? "Subir nueva versión"
                                : "Subir documento"}
                        </CardTitle>

                        <CardDescription>
                            {replaces
                                ? `Reemplazará la versión ${String(
                                    replaces.version ?? "",
                                )} de ${String(
                                    replaces.name ?? "este archivo",
                                )}.`
                                : "Carga un archivo privado y vincúlalo opcionalmente a un recurso."}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent>
                <form
                    onSubmit={submit}
                    className="space-y-5"
                >
                    <div className="grid gap-4 lg:grid-cols-3">
                        <div className="space-y-2 lg:col-span-3">
                            <Label htmlFor="doc-file">
                                Archivo
                            </Label>

                            <Input
                                id="doc-file"
                                type="file"
                                name="file"
                                accept=".pdf,.jpg,.jpeg,.png,.csv,.docx,.xlsx"
                                required
                            />

                            <p className="text-xs text-muted-foreground">
                                PDF, imágenes, CSV, Word y Excel.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label>Vincular a</Label>

                            <Select
                                name="resourceType"
                                defaultValue="__none__"
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>

                                <SelectContent>
                                    <SelectItem value="__none__">
                                        Sin vínculo
                                    </SelectItem>
                                    <SelectItem value="Customer">
                                        Cliente
                                    </SelectItem>
                                    <SelectItem value="Quote">
                                        Cotización
                                    </SelectItem>
                                    <SelectItem value="Order">
                                        Pedido
                                    </SelectItem>
                                    <SelectItem value="PurchaseOrder">
                                        Orden de compra
                                    </SelectItem>
                                    <SelectItem value="Task">
                                        Tarea
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 lg:col-span-2">
                            <Label htmlFor="resourceId">
                                ID del recurso
                            </Label>

                            <Input
                                id="resourceId"
                                name="resourceId"
                                placeholder="ID opcional del recurso relacionado"
                            />
                        </div>
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>
                                {error}
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        {replaces && (
                            <Button
                                type="button"
                                variant="outline"
                                disabled={busy}
                                onClick={onCancelReplace}
                            >
                                <RotateCcw className="size-4" />
                                Cancelar nueva versión
                            </Button>
                        )}

                        <Button
                            type="submit"
                            disabled={busy}
                        >
                            {busy ? (
                                <>
                                    <Loader2 className="size-4 animate-spin" />
                                    Subiendo…
                                </>
                            ) : (
                                <>
                                    <Upload className="size-4" />
                                    {replaces
                                        ? "Subir nueva versión"
                                        : "Subir archivo"}
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}