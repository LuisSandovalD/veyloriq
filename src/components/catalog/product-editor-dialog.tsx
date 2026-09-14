"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Row = Record<string, unknown>;

async function parse(response: Response) {
    const value = await response.json();
    if (!response.ok) throw new Error(value.error?.message ?? "No se pudo completar.");
    return value;
}

export function ProductEditorDialog({
    product,
    categories,
    images,
    onClose,
    onSaved,
}: {
    product: Row;
    categories: Row[];
    images: Row[];
    onClose: () => void;
    onSaved: () => Promise<void>;
}) {
    const [error, setError] = useState<string>();
    const [saving, setSaving] = useState(false);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setError(undefined);

        const form = new FormData(event.currentTarget);
        const categoryId = form.get("categoryId");
        const imageDocumentId = form.get("imageDocumentId");

        try {
            await parse(await fetch("/api/catalog", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    action: "product.update",
                    productId: product.id,
                    name: form.get("name"),
                    sku: form.get("sku"),
                    barcode: form.get("barcode") || undefined,
                    description: form.get("description") || undefined,
                    unit: form.get("unit"),
                    categoryId: categoryId === "__none__" ? undefined : categoryId || undefined,
                    imageDocumentId: imageDocumentId === "__none__" ? undefined : imageDocumentId || undefined,
                    kind: form.get("kind"),
                    price: form.get("price"),
                    cost: form.get("cost"),
                    taxRate: form.get("taxRate"),
                    minimumStock: form.get("minimumStock"),
                }),
            }));

            await onSaved();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Error inesperado.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <form onSubmit={submit} className="space-y-5">
                    <DialogHeader>
                        <DialogTitle>Editar producto</DialogTitle>
                        <DialogDescription>Los cambios futuros no alteran documentos históricos.</DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="product-name">Nombre</Label>
                            <Input id="product-name" name="name" defaultValue={String(product.name ?? "")} required />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="product-sku">SKU</Label>
                            <Input id="product-sku" name="sku" defaultValue={String(product.sku ?? "")} required />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="product-barcode">Código de barras</Label>
                            <Input id="product-barcode" name="barcode" defaultValue={String(product.barcode ?? "")} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="product-unit">Unidad</Label>
                            <Input id="product-unit" name="unit" defaultValue={String(product.unit ?? "")} required />
                        </div>

                        <div className="space-y-2">
                            <Label>Tipo</Label>
                            <Select name="kind" defaultValue={String(product.kind ?? "PRODUCT")}>
                                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PRODUCT">Producto</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Categoría</Label>
                            <Select name="categoryId" defaultValue={product.categoryId ? String(product.categoryId) : "__none__"}>
                                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">Sin categoría</SelectItem>
                                    {categories.map((category) => (
                                        <SelectItem key={String(category.id)} value={String(category.id)}>
                                            {String(category.name)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Imagen privada</Label>
                            <Select name="imageDocumentId" defaultValue={product.imageDocumentId ? String(product.imageDocumentId) : "__none__"}>
                                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">Sin imagen</SelectItem>
                                    {images.map((image) => (
                                        <SelectItem key={String(image.id)} value={String(image.id)}>
                                            {String(image.name)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="product-price">Precio</Label>
                            <Input id="product-price" name="price" type="number" step="0.01" defaultValue={String(product.price ?? "")} required />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="product-cost">Costo</Label>
                            <Input id="product-cost" name="cost" type="number" step="0.01" defaultValue={String(product.cost ?? "")} required />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="product-taxRate">Impuesto %</Label>
                            <Input id="product-taxRate" name="taxRate" type="number" step="0.01" defaultValue={String(product.taxRate ?? "")} required />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="product-minimumStock">Stock mínimo</Label>
                            <Input id="product-minimumStock" name="minimumStock" type="number" step="0.01" defaultValue={String(product.minimumStock ?? "")} required />
                        </div>

                        <div className="space-y-2 sm:col-span-2">
                            <Label htmlFor="product-description">Descripción</Label>
                            <Textarea id="product-description" name="description" rows={4} defaultValue={String(product.description ?? "")} />
                        </div>
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" disabled={saving} onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? (
                                <><Loader2 className="size-4 animate-spin" />Guardando…</>
                            ) : (
                                <><Save className="size-4" />Guardar cambios</>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}