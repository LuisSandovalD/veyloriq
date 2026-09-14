"use client";

import { Landmark } from "lucide-react";
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

export function OnboardingFinanceStep({
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
                    <Landmark className="size-5" />
                </div>

                <h1 className="text-xl font-semibold tracking-tight">
                    Cuenta financiera inicial
                </h1>

                <p className="mt-1 text-sm text-muted-foreground">
                    El saldo inicial quedará registrado como movimiento trazable.
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="accountName">Nombre de la cuenta</Label>
                <Input
                    id="accountName"
                    value={values.accountName}
                    onChange={(event) =>
                        onChange("accountName", event.target.value)
                    }
                    required
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="onboarding-account-type">Tipo</Label>

                <Select
                    value={values.accountType}
                    onValueChange={(value) => {
                        if (value !== null) onChange("accountType", value);
                    }}
                >
                    <SelectTrigger id="onboarding-account-type" className="w-full">
                        <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                        <SelectItem value="CASH">Caja</SelectItem>
                        <SelectItem value="BANK">Banco</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="openingBalance">Saldo inicial</Label>
                <Input
                    id="openingBalance"
                    type="number"
                    min="0"
                    step="0.01"
                    value={values.openingBalance}
                    onChange={(event) =>
                        onChange("openingBalance", event.target.value)
                    }
                    required
                />
            </div>
        </div>
    );
}