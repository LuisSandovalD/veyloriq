import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function FinalCta() {
    return <section className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
        <Card className="overflow-hidden border-primary/20 bg-primary text-primary-foreground">
            <CardContent className="relative flex flex-col gap-8 p-8 sm:p-10 lg:flex-row lg:items-center lg:justify-between lg:p-14">
                <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-primary-foreground/10 blur-3xl" />
                <div className="relative max-w-2xl">
                    <div className="flex items-center gap-2 text-sm text-primary-foreground/70"><Sparkles className="size-4" />Empieza con VEYLORIQ</div>
                    <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Convierte tus operaciones en un sistema conectado.</h2>
                    <p className="mt-4 max-w-xl text-sm leading-6 text-primary-foreground/70">Crea tu organización, centraliza tus procesos y obtén una visión completa del negocio desde el primer día.</p>
                </div>
                <Link href="/register" className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "relative shrink-0 gap-2")}>Crear cuenta<ArrowRight className="size-4" /></Link>
            </CardContent>
        </Card>
    </section>;
}