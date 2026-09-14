"use client";

import { useEffect, useState } from "react";
import { Check, FileText, Loader2, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Quote = {
    id: string;
    number: string;
    status: string;
    currency: string;
    validUntil: string;
    subtotal: string;
    discountTotal: string;
    taxTotal: string;
    total: string;
    terms?: string;
    notes?: string;
    organization: { name: string; legalName?: string; taxId?: string };
    customer: { name: string };
    lines: Array<{
        description: string;
        quantity: string;
        unitPrice: string;
        taxRate: string;
        lineTotal: string;
    }>;
};

export function QuotePortal({ token }: { token: string }) {
    const [quote, setQuote] = useState<Quote>();
    const [error, setError] = useState<string>();
    const [busy, setBusy] = useState(false);
    const [action, setAction] = useState<"accept" | "reject">();

    useEffect(() => {
        const controller = new AbortController();

        void (async () => {
            try {
                const response = await fetch(`/api/public/quote/${encodeURIComponent(token)}`, {
                    cache: "no-store",
                    signal: controller.signal,
                });
                const body = await response.json();
                if (!response.ok) throw new Error(body.error?.message ?? "No disponible");
                setQuote(body.quote);
            } catch (reason) {
                if (!controller.signal.aborted) {
                    setError(reason instanceof Error ? reason.message : "No disponible");
                }
            }
        })();

        return () => controller.abort();
    }, [token]);

    async function respond() {
        if (!action) return;

        try {
            setBusy(true);
            setError(undefined);

            const response = await fetch(`/api/public/quote/${encodeURIComponent(token)}`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ action }),
            });

            const body = await response.json();
            if (!response.ok) throw new Error(body.error?.message ?? "No se pudo responder.");

            setQuote((current) => current ? { ...current, status: body.status } : current);
            setAction(undefined);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Error inesperado.");
        } finally {
            setBusy(false);
        }
    }

    if (error && !quote) {
        return (
            <div className="mx-auto flex min-h-screen max-w-xl items-center px-4">
                <Alert variant="destructive">
                    <FileText className="size-4" />
                    <AlertTitle>Cotización no disponible</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }

    if (!quote) {
        return (
            <main className="mx-auto max-w-4xl px-4 py-12">
                <Card>
                    <CardContent className="space-y-5 p-6 sm:p-8">
                        <div className="flex items-center gap-3">
                            <Skeleton className="size-10 rounded-lg" />
                            <div className="space-y-2">
                                <Skeleton className="h-5 w-48" />
                                <Skeleton className="h-4 w-72" />
                            </div>
                        </div>
                        <Skeleton className="h-64 w-full" />
                    </CardContent>
                </Card>
            </main>
        );
    }

    const money = (value: string) =>
        new Intl.NumberFormat("es-PE", {
            style: "currency",
            currency: quote.currency,
        }).format(Number(value));

    return (
        <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:py-14">
            <Card>
                <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                            {quote.organization.name}
                        </p>
                        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                            Cotización {quote.number}
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Preparada para {quote.customer.name} · Válida hasta{" "}
                            {new Date(quote.validUntil).toLocaleDateString("es-PE")}
                        </p>
                    </div>

                    <Badge variant="outline">{quote.status}</Badge>
                </CardHeader>

                <CardContent className="space-y-6">
                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="overflow-hidden rounded-lg border">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Descripción</TableHead>
                                        <TableHead>Cantidad</TableHead>
                                        <TableHead>Precio</TableHead>
                                        <TableHead>IGV</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>

                                <TableBody>
                                    {quote.lines.map((line, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">{line.description}</TableCell>
                                            <TableCell>{line.quantity}</TableCell>
                                            <TableCell>{money(line.unitPrice)}</TableCell>
                                            <TableCell>{line.taxRate}%</TableCell>
                                            <TableCell className="text-right">{money(line.lineTotal)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    <div className="ml-auto w-full max-w-sm space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>{money(quote.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Descuentos</span>
                            <span>{money(quote.discountTotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Impuestos</span>
                            <span>{money(quote.taxTotal)}</span>
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between text-lg font-semibold">
                            <span>Total</span>
                            <span className="text-primary">{money(quote.total)}</span>
                        </div>
                    </div>

                    {(quote.terms || quote.notes) && (
                        <div className="rounded-lg border bg-muted/40 p-4">
                            <h2 className="text-sm font-semibold text-foreground">Condiciones</h2>
                            {quote.terms && <p className="mt-2 text-sm text-muted-foreground">{quote.terms}</p>}
                            {quote.notes && <p className="mt-2 text-sm text-muted-foreground">{quote.notes}</p>}
                        </div>
                    )}

                    {["SENT", "VIEWED"].includes(quote.status) && (
                        <div className="flex flex-col-reverse gap-2 border-t pt-5 sm:flex-row sm:justify-end">
                            <Button variant="outline" disabled={busy} onClick={() => setAction("reject")}>
                                <X className="size-4" />
                                Rechazar
                            </Button>

                            <Button disabled={busy} onClick={() => setAction("accept")}>
                                <Check className="size-4" />
                                Aceptar cotización
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={Boolean(action)} onOpenChange={(open) => !open && !busy && setAction(undefined)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {action === "accept" ? "Aceptar cotización" : "Rechazar cotización"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {action === "accept"
                                ? "¿Confirmas que aceptas esta cotización?"
                                : "¿Confirmas que rechazas esta cotización?"}
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction disabled={busy} onClick={(event) => {
                            event.preventDefault();
                            void respond();
                        }}>
                            {busy ? (
                                <>
                                    <Loader2 className="size-4 animate-spin" />
                                    Procesando…
                                </>
                            ) : action === "accept" ? "Aceptar" : "Rechazar"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </main>
    );
}