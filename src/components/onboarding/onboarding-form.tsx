"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { OnboardingOrganizationStep } from "./onboarding-organization-step";
import { OnboardingOperationStep } from "./onboarding-operation-step";
import { OnboardingFinanceStep } from "./onboarding-finance-step";

type InitialOrganization = {
  name: string;
  legalName: string | null;
  taxId: string | null;
  address: string | null;
  currency: string;
  locale: string;
  timeZone: string;
};

export type OnboardingValues = {
  name: string;
  legalName: string;
  taxId: string;
  address: string;
  currency: string;
  locale: string;
  timeZone: string;
  quotePrefix: string;
  taxName: string;
  defaultTaxRate: string;
  warehouseName: string;
  warehouseCode: string;
  accountName: string;
  accountType: string;
  openingBalance: string;
};

export function OnboardingForm({
  organization,
}: {
  organization: InitialOrganization;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const [values, setValues] = useState<OnboardingValues>({
    name: organization.name,
    legalName: organization.legalName ?? "",
    taxId: organization.taxId ?? "",
    address: organization.address ?? "",
    currency: organization.currency || "PEN",
    locale: organization.locale || "es-PE",
    timeZone: organization.timeZone,
    quotePrefix: "COT",
    taxName: "IGV",
    defaultTaxRate: "18",
    warehouseName: "Almacén principal",
    warehouseCode: "PRINCIPAL",
    accountName: "Caja principal",
    accountType: "CASH",
    openingBalance: "0",
  });

  function update<K extends keyof OnboardingValues>(
    key: K,
    value: OnboardingValues[K],
  ) {
    setValues((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (step < 3) {
      setError(undefined);
      setStep((current) => current + 1);
      return;
    }

    try {
      setBusy(true);
      setError(undefined);

      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error?.message ?? "No se pudo terminar la configuración.",
        );
      }

      router.push("/app");
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Error inesperado.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardContent className="p-6 sm:p-8">
        <form onSubmit={submit} className="space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Paso {step} de 3</span>
              <span>{Math.round((step / 3) * 100)}%</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className={`h-1.5 rounded-full ${item <= step ? "bg-primary" : "bg-muted"
                    }`}
                />
              ))}
            </div>
          </div>

          {step === 1 && (
            <OnboardingOrganizationStep
              values={values}
              onChange={update}
            />
          )}

          {step === 2 && (
            <OnboardingOperationStep
              values={values}
              onChange={update}
            />
          )}

          {step === 3 && (
            <OnboardingFinanceStep
              values={values}
              onChange={update}
            />
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between border-t pt-5">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setError(undefined);
                  setStep((current) => current - 1);
                }}
              >
                <ArrowLeft className="size-4" />
                Atrás
              </Button>
            ) : (
              <div />
            )}

            <Button type="submit" disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Configurando…
                </>
              ) : step < 3 ? (
                <>
                  Continuar
                  <ArrowRight className="size-4" />
                </>
              ) : (
                <>
                  Entrar a VEYLORIQ
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}