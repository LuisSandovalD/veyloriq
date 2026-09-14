"use client";

import { Warehouse } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { OnboardingValues } from "./onboarding-form";

export function OnboardingOperationStep({
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
                    <Warehouse className="size-5" />
                </div>

                <h1 className="text-xl font-semibold tracking-tight">
                    Preferencias y operación
                </h1>

                <p className="mt-1 text-sm text-muted-foreground">
                    Configura los valores iniciales de tu organización.
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="onboarding-currency">Moneda</Label>

                    <Select
                        value={values.currency}
                        onValueChange={(value) => {
                            if (value !== null) onChange("currency", value);
                        }}
                    >
                        <SelectTrigger id="onboarding-currency" className="w-full">
                            <SelectValue />
                        </SelectTrigger>

                        <SelectContent>
                            <SelectItem value="PEN">PEN · Sol peruano</SelectItem>
                            <SelectItem value="USD">USD · Dólar</SelectItem>
                            <SelectItem value="EUR">EUR · Euro</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="onboarding-locale">Idioma</Label>

                    <Select
                        value={values.locale}
                        onValueChange={(value) => {
                            if (value !== null) onChange("locale", value);
                        }}
                    >
                        <SelectTrigger id="onboarding-locale" className="w-full">
                            <SelectValue />
                        </SelectTrigger>

                        <SelectContent>
                            <SelectItem value="es-PE">Español (Perú)</SelectItem>
                            <SelectItem value="es-ES">Español</SelectItem>
                            <SelectItem value="en-US">English</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="timeZone">Zona horaria</Label>
                <Input
                    id="timeZone"
                    value={values.timeZone}
                    onChange={(event) => onChange("timeZone", event.target.value)}
                    required
                />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                    <Label htmlFor="quotePrefix">Prefijo cotización</Label>
                    <Input
                        id="quotePrefix"
                        value={values.quotePrefix}
                        onChange={(event) => onChange("quotePrefix", event.target.value)}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="taxName">Impuesto</Label>
                    <Input
                        id="taxName"
                        value={values.taxName}
                        onChange={(event) => onChange("taxName", event.target.value)}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="defaultTaxRate">Tasa %</Label>
                    <Input
                        id="defaultTaxRate"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={values.defaultTaxRate}
                        onChange={(event) =>
                            onChange("defaultTaxRate", event.target.value)
                        }
                        required
                    />
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="warehouseName">Primer almacén</Label>
                    <Input
                        id="warehouseName"
                        value={values.warehouseName}
                        onChange={(event) =>
                            onChange("warehouseName", event.target.value)
                        }
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="warehouseCode">Código</Label>
                    <Input
                        id="warehouseCode"
                        value={values.warehouseCode}
                        onChange={(event) =>
                            onChange("warehouseCode", event.target.value)
                        }
                        required
                    />
                </div>
            </div>
        </div>
    );
}