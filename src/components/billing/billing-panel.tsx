"use client";

import { useState } from "react";
import { useAsyncLoad } from "@/shared/use-async-load";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BillingSubscriptionCard, type Subscription } from "./billing-subscription-card";
import { BillingPlans, type BillingCycle, type BillingPlan } from "./billing-plans";
import {
    BillingInsights,
    type BillingEvent,
    type BillingPendingChange,
    type BillingResourceValue,
    type BillingUsage,
} from "./billing-insights";

type BillingData = {
    subscription?: Subscription | null;
    plans: BillingPlan[];
    usage: BillingUsage[];
    resources: Record<string, BillingResourceValue>;
    pending: BillingPendingChange[];
    history: BillingEvent[];
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
        const message =
            error.error?.message ??
            `No se pudo completar la operación (${response.status}).`;

        throw new Error(
            error.error?.requestId
                ? `${message} Código de seguimiento: ${error.error.requestId}`
                : message,
        );
    }

    return value as T;
}

export function BillingPanel() {
    const [data, setData] = useState<BillingData>({
        subscription: null,
        plans: [],
        usage: [],
        resources: {},
        pending: [],
        history: [],
    });

    const [cycle, setCycle] = useState<BillingCycle>("MONTHLY");
    const [busy, setBusy] = useState<string>();
    const [error, setError] = useState<string>();

    async function load() {
        try {
            setError(undefined);

            const value = await parse<BillingData>(
                await fetch("/api/billing", {
                    cache: "no-store",
                }),
            );

            setData({
                subscription: value.subscription ?? null,
                plans: value.plans ?? [],
                usage: value.usage ?? [],
                resources: value.resources ?? {},
                pending: value.pending ?? [],
                history: value.history ?? [],
            });
        } catch (reason) {
            setError(
                reason instanceof Error
                    ? reason.message
                    : "No se pudo cargar la información de facturación.",
            );
        }
    }

    useAsyncLoad(load);

    async function checkout(planId: string) {
        try {
            setBusy(`checkout:${planId}`);
            setError(undefined);

            const value = await parse<{ checkoutUrl?: string }>(
                await fetch("/api/billing/checkout", {
                    method: "POST",
                    headers: {
                        "content-type": "application/json",
                    },
                    body: JSON.stringify({
                        planId,
                        cycle,
                        idempotencyKey: crypto.randomUUID(),
                    }),
                }),
            );

            if (!value.checkoutUrl) {
                throw new Error(
                    "El proveedor de pagos no devolvió una URL de checkout válida.",
                );
            }

            window.location.assign(value.checkoutUrl);
        } catch (reason) {
            setError(
                reason instanceof Error
                    ? reason.message
                    : "No se pudo iniciar el checkout.",
            );

            setBusy(undefined);
        }
    }

    async function subscriptionAction(
        action: "cancel" | "reactivate",
    ) {
        try {
            setBusy(action);
            setError(undefined);

            await parse<{ ok?: boolean }>(
                await fetch("/api/billing", {
                    method: "POST",
                    headers: {
                        "content-type": "application/json",
                    },
                    body: JSON.stringify({ action }),
                }),
            );

            await load();
        } catch (reason) {
            setError(
                reason instanceof Error
                    ? reason.message
                    : "No se pudo actualizar la suscripción.",
            );

            throw reason;
        } finally {
            setBusy(undefined);
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">
                    Plan y consumo
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Administra tu suscripción SaaS, consumo y facturación.
                </p>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <BillingSubscriptionCard
                subscription={data.subscription}
                busy={busy}
                onAction={subscriptionAction}
            />

            <BillingPlans
                plans={data.plans}
                cycle={cycle}
                busy={busy}
                onCycleChange={setCycle}
                onCheckout={checkout}
            />

            <BillingInsights
                pending={data.pending}
                resources={data.resources}
                usage={data.usage}
                history={data.history}
            />
        </div>
    );
}