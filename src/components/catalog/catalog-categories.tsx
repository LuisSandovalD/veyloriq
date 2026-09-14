"use client";

import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Row = Record<string, unknown>;

export function CatalogCategories({
    categories,
    onRename,
}: {
    categories: Row[];
    onRename: (category: Row) => void | Promise<void>;
}) {
    if (!categories.length) {
        return <p className="text-sm text-muted-foreground">No hay categorías registradas.</p>;
    }

    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categories.map((category) => (
                <Card key={String(category.id)} className="gap-0 py-0">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-foreground">{String(category.name)}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {String((category._count as Row | undefined)?.products ?? 0)} productos
                                </p>
                            </div>

                            <Button type="button" variant="ghost" size="sm" onClick={() => void onRename(category)}>
                                <Pencil className="size-4" />
                                Renombrar
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}