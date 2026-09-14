"use client";

import { Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OnboardingValues } from "./onboarding-form";

export function OnboardingOrganizationStep({
    values,
    onChange,
}: {
    values: OnboardingValues;
    onChange: <K extends keyof OnboardingValues>(
        key: K,
        value: OnboardingValues[K],
    ) => void;
}) {
    return (
        <div className="space-y-5">
            <div>
                <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="size-5" />
                </div>

                <h1 className="text-xl font-semibold tracking-tight">
                    Datos de tu organización
                </h1>

                <p className="mt-1 text-sm text-muted-foreground">
                    Podrás modificarlos después desde Configuración.
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="name">Nombre comercial</Label>
                <Input
                    id="name"
                    value={values.name}
                    onChange={(event) => onChange("name", event.target.value)}
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="legalName">Razón social</Label>
                <Input
                    id="legalName"
                    value={values.legalName}
                    onChange={(event) => onChange("legalName", event.target.value)}
                />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="taxId">RUC o identificación fiscal</Label>
                    <Input
                        id="taxId"
                        value={values.taxId}
                        onChange={(event) => onChange("taxId", event.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="address">Dirección</Label>
                    <Input
                        id="address"
                        value={values.address}
                        onChange={(event) => onChange("address", event.target.value)}
                    />
                </div>
            </div>
        </div>
    );
}