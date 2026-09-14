"use client";

import { CalendarDays, FileBarChart } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const REPORTS = [
    ["sales", "Ventas"],
    ["quotes", "Cotizaciones"],
    ["inventory", "Inventario"],
    ["purchases", "Compras"],
    ["collections", "Cobros"],
    ["expenses", "Gastos y egresos"],
    ["cashflow", "Flujo de caja"],
    ["receivables", "Por cobrar"],
    ["payables", "Por pagar"],
    ["customers", "Clientes"],
    ["opportunities", "Oportunidades"],
    ["products", "Productos"],
    ["valuation", "Valoración de inventario"],
    ["subscriptions", "Suscripciones SaaS"],
    ["usage", "Consumo"],
] as const;

export type ReportType = (typeof REPORTS)[number][0];

export function ReportFilters({
    report,
    from,
    to,
    onReportChange,
    onFromChange,
    onToChange,
}: {
    report: ReportType;
    from: string;
    to: string;
    onReportChange: (value: ReportType) => void;
    onFromChange: (value: string) => void;
    onToChange: (value: string) => void;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileBarChart className="size-5" />
                    Configuración del reporte
                </CardTitle>
                <CardDescription>
                    Selecciona el tipo de reporte y el período que deseas consultar.
                </CardDescription>
            </CardHeader>

            <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                        <Label>Reporte</Label>
                        <Select
                            value={report}
                            onValueChange={(value) => {
                                if (REPORTS.some(([item]) => item === value)) {
                                    onReportChange(value as ReportType);
                                }
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecciona un reporte" />
                            </SelectTrigger>
                            <SelectContent>
                                {REPORTS.map(([value, label]) => (
                                    <SelectItem key={value} value={value}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="report-from">Desde</Label>
                        <div className="relative">
                            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="report-from"
                                type="date"
                                value={from}
                                max={to || undefined}
                                onChange={(event) => onFromChange(event.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="report-to">Hasta</Label>
                        <div className="relative">
                            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                id="report-to"
                                type="date"
                                value={to}
                                min={from || undefined}
                                onChange={(event) => onToChange(event.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}