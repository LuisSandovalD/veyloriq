import Link from "next/link";
import { ArrowRight, BarChart3, CheckCircle2, Layers3, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const bars = [36, 54, 42, 68, 58, 76, 64, 87, 74, 96];

export function HeroSection() {
    return <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-gradient-to-b from-primary/5 via-primary/[.02] to-transparent" />
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 py-20 lg:grid-cols-[1fr_.95fr] lg:py-28">
            <div className="max-w-2xl">
                <Badge variant="outline" className="rounded-full px-3 py-1.5">Plataforma empresarial todo en uno</Badge>
                <h1 className="mt-6 text-5xl font-semibold leading-[1.02] tracking-[-.055em] sm:text-6xl lg:text-7xl">Una sola visión para todo tu negocio.</h1>
                <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">VEYLORIQ conecta clientes, ventas, compras, inventario, finanzas, automatizaciones e inteligencia artificial dentro de una misma operación.</p>
                <div className="mt-8 flex flex-wrap gap-3">
                    <Link href="/register" className={cn(buttonVariants({ size: "lg" }), "gap-2")}>Empezar gratis<ArrowRight className="size-4" /></Link>
                    <a href="#producto" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>Explorar plataforma</a>
                </div>
                <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
                    {["Multi-tenant", "Auditoría integrada", "Control de acceso"].map((item) => <span key={item} className="flex items-center gap-2"><CheckCircle2 className="size-4 text-primary" />{item}</span>)}
                </div>
            </div>

            <Card className="overflow-hidden border-border/80 bg-card/95 shadow-2xl shadow-primary/5">
                <div className="flex h-12 items-center gap-1.5 border-b px-5">
                    <span className="size-2.5 rounded-full bg-muted-foreground/25" />
                    <span className="size-2.5 rounded-full bg-muted-foreground/25" />
                    <span className="size-2.5 rounded-full bg-muted-foreground/25" />
                    <span className="ml-auto text-xs text-muted-foreground">app.veyloriq.com</span>
                </div>
                <CardContent className="p-0">
                    <div className="grid min-h-[400px] grid-cols-[64px_1fr]">
                        <aside className="border-r bg-muted/30 p-4">
                            <div className="mb-7 grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground"><Layers3 className="size-4" /></div>
                            <div className="space-y-3">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="size-8 rounded-lg border bg-background" />)}</div>
                        </aside>
                        <div className="p-5 sm:p-6">
                            <div className="flex items-start justify-between gap-4">
                                <div><p className="text-xs font-medium uppercase tracking-[.16em] text-muted-foreground">Operación general</p><h3 className="mt-1 text-xl font-semibold">Vista ejecutiva</h3></div>
                                <Badge variant="secondary"><TrendingUp className="size-3.5" />Actualizado</Badge>
                            </div>
                            <div className="mt-6 grid grid-cols-3 gap-3">
                                {[["Ventas", "S/ 24.8K"], ["Cotizaciones", "18"], ["Tareas", "7"]].map(([label, value]) =>
                                    <div key={label} className="rounded-xl border bg-muted/20 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 font-semibold">{value}</p></div>
                                )}
                            </div>
                            <div className="mt-4 rounded-xl border p-5">
                                <div className="flex items-center justify-between">
                                    <div><p className="text-xs text-muted-foreground">Actividad operativa</p><p className="mt-1 text-sm font-semibold">Últimos movimientos</p></div>
                                    <BarChart3 className="size-4 text-muted-foreground" />
                                </div>
                                <div className="mt-7 flex h-36 items-end gap-2">{bars.map((height, index) => <div key={index} className="flex-1 rounded-t bg-primary/20 transition-colors hover:bg-primary/40" style={{ height: `${height}%` }} />)}</div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    </section>;
}