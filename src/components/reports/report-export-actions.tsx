"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ReportType } from "./report-filters";

type ExportFormat = "csv" | "xlsx" | "pdf";

type AcceptedExport = {
    jobId: string;
};

type ExportProgress = {
    status: "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED";
    documentId?: string | null;
    lastError?: string | null;
};

type DocumentDownload = {
    url: string;
};

type ApiError = {
    error?: {
        message?: string;
        requestId?: string;
    };
};

async function parse<T>(response: Response): Promise<T> {
    const value = await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = value as ApiError;
        const message = error.error?.message ?? `No se pudo completar la operación (${response.status}).`;
        const requestId = error.error?.requestId;
        throw new Error(requestId ? `${message} Código: ${requestId}` : message);
    }

    return value as T;
}

function delay(ms: number) {
    return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
}

export function ReportExportActions({
    report,
    from,
    to,
    onMessage,
}: {
    report: ReportType;
    from: string;
    to: string;
    onMessage: (message?: string, error?: boolean) => void;
}) {
    const [busy, setBusy] = useState<ExportFormat>();

    function reportUrl(format: ExportFormat) {
        const params = new URLSearchParams({
            report,
            from,
            to,
            format,
        });

        return `/api/reports?${params.toString()}`;
    }

    async function waitForExport(jobId: string) {
        for (let attempt = 0; attempt < 120; attempt += 1) {
            await delay(2000);

            const progress = await parse<ExportProgress>(
                await fetch(`/api/reports?jobId=${encodeURIComponent(jobId)}`, {
                    cache: "no-store",
                }),
            );

            if (progress.status === "FAILED") {
                throw new Error(progress.lastError ?? "La exportación falló.");
            }

            if (progress.status === "SUCCEEDED") {
                if (!progress.documentId) {
                    throw new Error("La exportación terminó sin generar un documento.");
                }

                const download = await parse<DocumentDownload>(
                    await fetch(`/api/documents?download=${encodeURIComponent(progress.documentId)}`, {
                        cache: "no-store",
                    }),
                );

                window.open(download.url, "_blank", "noopener,noreferrer");
                return true;
            }
        }

        return false;
    }

    async function exportReport(format: ExportFormat) {
        if (!from || !to) {
            onMessage("Selecciona un rango de fechas válido.", true);
            return;
        }

        if (from > to) {
            onMessage("La fecha inicial no puede ser posterior a la fecha final.", true);
            return;
        }

        try {
            setBusy(format);
            onMessage("Preparando exportación…");

            const response = await fetch(reportUrl(format));

            if (response.status === 202) {
                const accepted = await parse<AcceptedExport>(response);

                if (!accepted.jobId) {
                    throw new Error("El servidor no devolvió el identificador de la exportación.");
                }

                onMessage("La exportación se está procesando. Puedes seguir trabajando.");

                const completed = await waitForExport(accepted.jobId);

                if (completed) {
                    onMessage("Exportación completada y guardada en Documentos.");
                } else {
                    onMessage("La exportación continúa procesándose y aparecerá en Documentos al finalizar.");
                }

                return;
            }

            if (!response.ok) {
                const value = await response.json().catch(() => ({})) as ApiError;
                const message = value.error?.message ?? "No se pudo exportar.";
                const requestId = value.error?.requestId;
                throw new Error(requestId ? `${message} Código: ${requestId}` : message);
            }

            const blob = await response.blob();
            downloadBlob(blob, `VEYLORIQ-${report}.${format}`);
            onMessage("Exportación completada.");
        } catch (reason) {
            onMessage(
                reason instanceof Error ? reason.message : "Error inesperado durante la exportación.",
                true,
            );
        } finally {
            setBusy(undefined);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Exportar reporte</CardTitle>
                <CardDescription>
                    Descarga el resultado en el formato que necesites.
                </CardDescription>
            </CardHeader>

            <CardContent>
                <div className="flex flex-wrap gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        disabled={Boolean(busy)}
                        onClick={() => void exportReport("csv")}
                    >
                        {busy === "csv" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
                        {busy === "csv" ? "Generando…" : "CSV"}
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        disabled={Boolean(busy)}
                        onClick={() => void exportReport("xlsx")}
                    >
                        {busy === "xlsx" ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}
                        {busy === "xlsx" ? "Generando…" : "XLSX"}
                    </Button>

                    <Button
                        type="button"
                        disabled={Boolean(busy)}
                        onClick={() => void exportReport("pdf")}
                    >
                        {busy === "pdf" ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
                        {busy === "pdf" ? "Generando…" : "PDF"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}