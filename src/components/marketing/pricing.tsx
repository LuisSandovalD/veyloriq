"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Plan = { id: string; code: string; name: string; currency: string; monthlyPrice: string | number; features: unknown };

export function Pricing() {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/public/plans", { signal, cache: "no-store" });
      const body = await response.json() as { data?: Plan[]; error?: { message?: string } };
      if (!response.ok) throw new Error(body.error?.message ?? "No se pudieron cargar los planes.");
      setPlans(Array.isArray(body.data) ? body.data : []);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setPlans([]); setError(true);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => void load(controller.signal), 0);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [load]);

  if (plans === null) return <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4" aria-busy="true">
    {[1, 2, 3, 4].map((item) => <Card key={item}>
      <CardHeader className="space-y-3"><Skeleton className="h-4 w-20" /><Skeleton className="h-6 w-32" /><Skeleton className="h-9 w-40" /></CardHeader>
      <CardContent className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /><Skeleton className="h-4 w-3/5" /></CardContent>
    </Card>)}
  </div>;

  if (error) return <Alert className="mx-auto max-w-xl">
    <AlertDescription className="flex items-center justify-between gap-4">
      <span>No pudimos cargar los planes en este momento.</span>
      <button type="button" onClick={() => { setPlans(null); setError(false); void load() }} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "shrink-0")}><RefreshCw className="size-4" />Reintentar</button>
    </AlertDescription>
  </Alert>;

  if (!plans.length) return <Card className="mx-auto max-w-xl">
    <CardHeader><CardTitle>Planes en configuración</CardTitle><CardDescription>Los planes comerciales estarán disponibles próximamente.</CardDescription></CardHeader>
  </Card>;

  return <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
    {plans.map((plan) => {
      const features = Array.isArray(plan.features) ? plan.features.map(String).filter(Boolean) : [];
      const featured = plan.code === "BUSINESS";
      const amount = Number(plan.monthlyPrice);
      const price = new Intl.NumberFormat("es-PE", { style: "currency", currency: plan.currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number.isFinite(amount) ? amount : 0);

      return <Card key={plan.id} className={cn("relative flex h-full flex-col transition-shadow hover:shadow-md", featured && "border-primary ring-1 ring-primary")}>
        {featured && <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Recomendado</Badge>}
        <CardHeader>
          <Badge variant="secondary" className="mb-2 w-fit">{plan.code}</Badge>
          <CardTitle className="text-xl">{plan.name}</CardTitle>
          <div className="flex items-end gap-1 pt-2"><span className="text-3xl font-semibold tracking-tight">{price}</span><span className="pb-1 text-sm text-muted-foreground">/mes</span></div>
          <CardDescription>{amount === 0 ? "Empieza sin costo y escala cuando lo necesites." : "Funciones y límites pensados para acompañar el crecimiento de tu organización."}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col">
          <Link href="/register" className={cn(buttonVariants({ variant: featured ? "default" : "outline" }), "w-full gap-2")}>Comenzar<ArrowRight className="size-4" /></Link>
          <div className="mt-6 space-y-3">
            {features.length ? features.slice(0, 6).map((feature) => <div key={feature} className="flex items-start gap-2 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-primary" /><span className="text-muted-foreground">{feature}</span></div>) : <p className="text-sm text-muted-foreground">Las funcionalidades de este plan se publicarán próximamente.</p>}
          </div>
        </CardContent>
      </Card>;
    })}
  </div>;
}
