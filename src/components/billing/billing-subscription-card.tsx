"use client";

import { useState } from "react";
import {
    Loader2,
    RotateCcw,
    XCircle,
} from "lucide-react";
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
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

type PlanRef = {
    id?: string;
    name?: string | null;
    code?: string | null;
};

export type Subscription = {
    id?: string;
    status?: string | null;
    providerId?: string | null;
    cancelAtPeriodEnd?: boolean | null;
    plan?: PlanRef | null;
};

export function BillingSubscriptionCard({
    subscription,
    busy,
    onAction,
}: {
    subscription?: Subscription | null;
    busy?: string;
    onAction: (
        action: "cancel" | "reactivate",
    ) => Promise<void>;
}) {
    const [cancelOpen, setCancelOpen] = useState(false);

    async function cancel() {
        try {
            await onAction("cancel");
            setCancelOpen(false);
        } catch { }
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Suscripción actual</CardTitle>
                    <CardDescription>
                        Estado y plan contratado actualmente.
                    </CardDescription>
                </CardHeader>

                <CardContent className="flex flex-wrap items-center gap-2">
                    <Badge
                        variant={subscription ? "default" : "secondary"}
                    >
                        {subscription?.status ?? "SIN SUSCRIPCIÓN"}
                    </Badge>

                    {subscription?.plan?.name && (
                        <span className="text-sm text-muted-foreground">
                            {subscription.plan.name}
                        </span>
                    )}

                    {subscription?.cancelAtPeriodEnd && (
                        <Badge variant="outline">
                            Finaliza al terminar el período
                        </Badge>
                    )}
                </CardContent>

                {subscription?.providerId && (
                    <CardFooter>
                        {subscription.cancelAtPeriodEnd ? (
                            <Button
                                type="button"
                                variant="outline"
                                disabled={Boolean(busy)}
                                onClick={() => void onAction("reactivate")}
                            >
                                {busy === "reactivate" ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <RotateCcw className="size-4" />
                                )}

                                {busy === "reactivate"
                                    ? "Reactivando…"
                                    : "Reactivar renovación"}
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                variant="outline"
                                disabled={Boolean(busy)}
                                onClick={() => setCancelOpen(true)}
                            >
                                <XCircle className="size-4" />
                                Cancelar renovación
                            </Button>
                        )}
                    </CardFooter>
                )}
            </Card>

            <AlertDialog
                open={cancelOpen}
                onOpenChange={(open) => {
                    if (!busy) setCancelOpen(open);
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Cancelar renovación
                        </AlertDialogTitle>

                        <AlertDialogDescription>
                            Se solicitará la cancelación de la renovación al
                            proveedor de pagos. Tu suscripción permanecerá activa
                            hasta finalizar el período que ya tienes contratado.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel
                            disabled={Boolean(busy)}
                        >
                            Volver
                        </AlertDialogCancel>

                        <AlertDialogAction
                            disabled={Boolean(busy)}
                            onClick={(event) => {
                                event.preventDefault();
                                void cancel();
                            }}
                        >
                            {busy === "cancel" ? (
                                <>
                                    <Loader2 className="size-4 animate-spin" />
                                    Cancelando…
                                </>
                            ) : (
                                "Confirmar cancelación"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}