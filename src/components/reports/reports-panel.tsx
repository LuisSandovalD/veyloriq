"use client";

import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ReportFilters, type ReportType } from "./report-filters";
import { ReportExportActions } from "./report-export-actions";

function currentMonthStart() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function today() {
    return new Date().toISOString().slice(0, 10);
}

export function ReportsPanel() {
    const [report, setReport] = useState<ReportType>("sales");
    const [from, setFrom] = useState(currentMonthStart);
    const [to, setTo] = useState(today);
    const [message, setMessage] = useState<string>();
    const [error, setError] = useState(false);

    function handleMessage(value?: string, isError = false) {
        setMessage(value);
        setError(isError);
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Reportes</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Genera reportes con filtros procesados en servidor y exportaciones privadas.
                </p>
            </div>

            {message && (
                <Alert variant={error ? "destructive" : "default"}>
                    <AlertDescription>{message}</AlertDescription>
                </Alert>
            )}

            <ReportFilters
                report={report}
                from={from}
                to={to}
                onReportChange={setReport}
                onFromChange={setFrom}
                onToChange={setTo}
            />

            <ReportExportActions
                report={report}
                from={from}
                to={to}
                onMessage={handleMessage}
            />
        </div>
    );
}