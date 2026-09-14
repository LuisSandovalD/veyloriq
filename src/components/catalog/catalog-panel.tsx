"use client";

import { useState, type FormEvent } from "react";
import { FolderPlus } from "lucide-react";
import { useAsyncLoad } from "@/shared/use-async-load";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CatalogCategories } from "./catalog-categories";
import { CatalogTable } from "./catalog-table";
import { ProductEditorDialog } from "./product-editor-dialog";

type Row = Record<string, unknown>;
type Data = { categories: Row[]; products: Row[]; images: Row[] };

async function parse(response: Response) {
  const value = await response.json();
  if (!response.ok) throw new Error(value.error?.message ?? "No se pudo completar.");
  return value;
}

export function CatalogPanel() {
  const [data, setData] = useState<Data>({ categories: [], products: [], images: [] });
  const [error, setError] = useState<string>();
  const [archived, setArchived] = useState(false);
  const [editing, setEditing] = useState<Row>();

  async function load() {
    try {
      setError(undefined);
      setData(await parse(await fetch(`/api/catalog?archived=${archived}`, { cache: "no-store" })));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Error inesperado.");
    }
  }

  useAsyncLoad(load, archived);

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = String(new FormData(form).get("name") ?? "").trim();
    if (!name) return;

    try {
      await parse(await fetch("/api/catalog", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "category.create", name }),
      }));
      form.reset();
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Error inesperado.");
    }
  }

  async function renameCategory(category: Row) {
    const name = window.prompt("Nuevo nombre de la categoría:", String(category.name));
    if (!name?.trim() || name.trim() === String(category.name)) return;

    try {
      await parse(await fetch("/api/catalog", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "category.rename", categoryId: category.id, name: name.trim() }),
      }));
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Error inesperado.");
    }
  }

  async function setProductActive(product: Row, active: boolean) {
    const action = active ? "restaurar" : "archivar";
    if (!window.confirm(`¿Deseas ${action} ${String(product.name)}? El historial conservará sus snapshots.`)) return;

    try {
      await parse(await fetch("/api/catalog", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: active ? "product.restore" : "product.archive",
          productId: product.id,
        }),
      }));
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Error inesperado.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Catálogo avanzado</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Categorías, unidades, códigos, imágenes y archivado sin romper el historial.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Switch id="show-archived" checked={archived} onCheckedChange={setArchived} />
        <Label htmlFor="show-archived">Mostrar archivados</Label>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={createCategory}>
            <div className="flex-1 space-y-2">
              <Label htmlFor="category-name">Nueva categoría</Label>
              <Input id="category-name" name="name" placeholder="Nombre de la categoría" required />
            </div>
            <Button type="submit">
              <FolderPlus className="size-4" />
              Crear
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <CatalogCategories categories={data.categories} onRename={renameCategory} />

      <CatalogTable
        products={data.products}
        onEdit={setEditing}
        onChangeActive={setProductActive}
      />

      {editing && (
        <ProductEditorDialog
          product={editing}
          categories={data.categories}
          images={data.images}
          onClose={() => setEditing(undefined)}
          onSaved={async () => {
            setEditing(undefined);
            await load();
          }}
        />
      )}
    </div>
  );
}