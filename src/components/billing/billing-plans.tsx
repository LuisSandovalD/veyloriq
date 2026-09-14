"use client";

import {
    CreditCard,
    Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export type BillingCycle = "MONTHLY" | "ANNUAL";

export type BillingPlan = {
    id: string;
    code: string;
    name: string;
    currency: string;
    monthlyPrice: string | number;
    annualPrice: string | number;
};

function formatPrice(
    value: string | number,
    currency: string,
) {
    const number = Number(value);

    return new Intl.NumberFormat("es-PE", {
        style: "currency",
        currency: currency || "PEN",
    }).format(Number.isFinite(number) ? number : 0);
}

export function BillingPlans({
    plans,
    cycle,
    busy,
    onCycleChange,
    onCheckout,
}: {
    plans: BillingPlan[];
    cycle: BillingCycle;
    busy?: string;
    onCycleChange: (cycle: BillingCycle) => void;
    onCheckout: (planId: string) => Promise<void>;
}) {
    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Planes disponibles</CardTitle>
                    <CardDescription>
                        Selecciona la periodicidad antes de contratar o cambiar
                        de plan.
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <div className="max-w-xs space-y-2">
                        <Label>Periodicidad</Label>

                        <Select
                            value={cycle}
                            disabled={Boolean(busy)}
                            onValueChange={(value) => {
                                if (
                                    value === "MONTHLY" ||
                                    value === "ANNUAL"
                                ) {
                                    onCycleChange(value);
                                }
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>

                            <SelectContent>
                                <SelectItem value="MONTHLY">
                                    Mensual
                                </SelectItem>
                                <SelectItem value="ANNUAL">
                                    Anual
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {plans.map((plan) => {
                    const price =
                        cycle === "ANNUAL"
                            ? plan.annualPrice
                            : plan.monthlyPrice;

                    const checkoutBusy =
                        busy === `checkout:${plan.id}`;

                    return (
                        <Card
                            key={plan.id}
                            className="flex flex-col"
                        >
                            <CardHeader>
                                <Badge
                                    variant="outline"
                                    className="w-fit"
                                >
                                    {plan.code}
                                </Badge>

                                <CardTitle>{plan.name}</CardTitle>

                                <CardDescription>
                                    Facturación{" "}
                                    {cycle === "ANNUAL"
                                        ? "anual"
                                        : "mensual"}
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="flex-1">
                                <div className="text-3xl font-semibold tracking-tight">
                                    {formatPrice(
                                        price,
                                        plan.currency,
                                    )}

                                    <span className="ml-1 text-sm font-normal text-muted-foreground">
                                        /{" "}
                                        {cycle === "ANNUAL"
                                            ? "año"
                                            : "mes"}
                                    </span>
                                </div>
                            </CardContent>

                            {plan.code !== "FREE" && (
                                <CardFooter>
                                    <Button
                                        type="button"
                                        className="w-full"
                                        disabled={Boolean(busy)}
                                        onClick={() =>
                                            void onCheckout(plan.id)
                                        }
                                    >
                                        {checkoutBusy ? (
                                            <Loader2 className="size-4 animate-spin" />
                                        ) : (
                                            <CreditCard className="size-4" />
                                        )}

                                        {checkoutBusy
                                            ? "Preparando pago…"
                                            : "Elegir plan"}
                                    </Button>
                                </CardFooter>
                            )}
                        </Card>
                    );
                })}

                {!plans.length && (
                    <Card className="md:col-span-2 xl:col-span-3">
                        <CardContent className="py-10 text-center text-sm text-muted-foreground">
                            No hay planes disponibles.
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}