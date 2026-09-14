"use client";

import { useRef, useState } from "react";
import { useAsyncLoad } from "@/shared/use-async-load";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DocumentUploadForm } from "./document-upload-form";
import { DocumentsTable } from "./documents-table";
import { DocumentHistoryDialog } from "./document-history-dialog";

type Row = Record<string, unknown>;

async function parse(response: Response) {
  const value = await response.json();

  if (!response.ok) {
    throw new Error(
      value.error?.message ?? "No se pudo completar.",
    );
  }

  return value;
}

export function DocumentsManagerPanel() {
  const [items, setItems] = useState<Row[]>([]);
  const [history, setHistory] = useState<Row[] | null>(null);
  const [replaces, setReplaces] = useState<Row>();
  const [error, setError] = useState<string>();

  const uploadAreaRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      setError(undefined);

      const value = await parse(
        await fetch("/api/documents", {
          cache: "no-store",
        }),
      );

      setItems(value.data ?? []);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Error inesperado.",
      );
    }
  }

  useAsyncLoad(load);

  async function upload(data: FormData) {
    try {
      setError(undefined);

      if (replaces?.id) {
        data.set(
          "replacesId",
          String(replaces.id),
        );
      }

      await parse(
        await fetch("/api/documents", {
          method: "POST",
          body: data,
        }),
      );

      setReplaces(undefined);
      await load();
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : "No se pudo subir el archivo.";

      setError(message);
      throw reason instanceof Error
        ? reason
        : new Error(message);
    }
  }

  async function preview(item: Row) {
    try {
      setError(undefined);

      const value = await parse(
        await fetch(
          `/api/documents?preview=${encodeURIComponent(
            String(item.id),
          )}`,
        ),
      );

      window.open(
        value.url,
        "_blank",
        "noopener,noreferrer",
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No se pudo abrir el archivo.",
      );
    }
  }

  async function versions(item: Row) {
    try {
      setError(undefined);

      const value = await parse(
        await fetch(
          `/api/documents?history=${encodeURIComponent(
            String(item.logicalKey),
          )}`,
          {
            cache: "no-store",
          },
        ),
      );

      setHistory(value.data ?? []);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "No se pudo obtener el historial.",
      );
    }
  }

  async function archive(item: Row) {
    try {
      setError(undefined);

      await parse(
        await fetch("/api/documents", {
          method: "DELETE",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            documentId: item.id,
          }),
        }),
      );

      await load();
    } catch (reason) {
      const message =
        reason instanceof Error
          ? reason.message
          : "No se pudo archivar el documento.";

      setError(message);
      throw reason instanceof Error
        ? reason
        : new Error(message);
    }
  }

  function replace(item: Row) {
    setReplaces(item);

    requestAnimationFrame(() => {
      uploadAreaRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Documentos
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          Archivos privados, vinculados, versionados y sujetos a inspección y cuota.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      <div ref={uploadAreaRef}>
        <DocumentUploadForm
          replaces={replaces}
          onCancelReplace={() =>
            setReplaces(undefined)
          }
          onUpload={upload}
        />
      </div>

      <DocumentsTable
        items={items}
        onPreview={preview}
        onReplace={replace}
        onVersions={versions}
        onArchive={archive}
      />

      <DocumentHistoryDialog
        open={history !== null}
        history={history ?? []}
        onOpenChange={(open) => {
          if (!open) {
            setHistory(null);
          }
        }}
      />
    </div>
  );
}