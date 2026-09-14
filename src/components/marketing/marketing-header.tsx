import Link from "next/link";
import { ArrowRight, Layers3 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MarketingHeader() {
    return <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
            <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
                <span className="grid size-9 place-items-center rounded-xl border bg-card shadow-sm"><Layers3 className="size-4" /></span>
                VEYLORIQ
            </Link>
            <nav className="hidden items-center gap-7 md:flex">
                <a href="#producto" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Producto</a>
                <a href="#planes" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Planes</a>
                <Link href="/login" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Ingresar</Link>
                <Link href="/register" className={cn(buttonVariants({ size: "sm" }), "gap-2")}>Crear cuenta<ArrowRight className="size-4" /></Link>
            </nav>
            <Link href="/register" className={cn(buttonVariants({ size: "sm" }), "md:hidden")}>Empezar</Link>
        </div>
    </header>;
}