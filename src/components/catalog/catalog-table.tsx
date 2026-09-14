"use client";

import { Archive, Image as ImageIcon, Pencil, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Row = Record<string, unknown>;

export function CatalogTable({
    products,
    onEdit,
    onChangeActive,
}: {
    products: Row[];
    onEdit: (product: Row) => void;
    onChangeActive: (product: Row, active: boolean) => void | Promise<void>;
}) {
    return (
        <Card className="overflow-hidden py-0">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>SKU</TableHead>
                            <TableHead>Producto</TableHead>
                            <TableHead>Categoría</TableHead>
                            <TableHead>Unidad</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Imagen</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {products.map((product) => (
                            <TableRow key={String(product.id)}>
                                <TableCell className="font-mono text-xs">{String(product.sku)}</TableCell>
                                <TableCell className="font-medium">{String(product.name)}</TableCell>
                                <TableCell>{String((product.category as Row | undefined)?.name ?? "—")}</TableCell>
                                <TableCell>{String(product.unit)}</TableCell>
                                <TableCell><Badge variant="outline">{String(product.kind)}</Badge></TableCell>
                                <TableCell>{product.imageDocumentId ? <ImageIcon className="size-4 text-muted-foreground" /> : "—"}</TableCell>
                                <TableCell>
                                    <Badge variant={product.active ? "default" : "secondary"}>
                                        {product.active ? "Activo" : "Archivado"}
                                    </Badge>
                                </TableCell>

                                <TableCell>
                                    <div className="flex justify-end gap-1">
                                        <Button type="button" variant="ghost" size="sm" onClick={() => onEdit(product)}>
                                            <Pencil className="size-4" />
                                            Editar
                                        </Button>

                                        {product.active ? (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive hover:text-destructive"
                                                onClick={() => void onChangeActive(product, false)}
                                            >
                                                <Archive className="size-4" />
                                                Archivar
                                            </Button>
                                        ) : (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => void onChangeActive(product, true)}
                                            >
                                                <RotateCcw className="size-4" />
                                                Restaurar
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}

                        {!products.length && (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                    No hay productos para mostrar.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </Card>
    );
}