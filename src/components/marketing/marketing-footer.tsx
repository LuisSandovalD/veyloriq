import Link from "next/link";
import { Layers3 } from "lucide-react";

export function MarketingFooter() {
    return <footer className="border-t">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 sm:grid-cols-2 sm:items-end">
            <div>
                <Link href="/" className="flex w-fit items-center gap-2.5 font-semibold"><span className="grid size-8 place-items-center rounded-lg border bg-card"><Layers3 className="size-4" /></span>VEYLORIQ</Link>
                <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">Gestión empresarial conectada para organizaciones que necesitan crecer con contexto, control y trazabilidad.</p>
            </div>
            <div className="sm:text-right">
                <div className="flex gap-5 sm:justify-end">
                    <Link href="/privacy" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Privacidad</Link>
                    <Link href="/terms" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Términos</Link>
                    <Link href="/contact" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Contacto</Link>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">© {new Date().getFullYear()} VEYLORIQ. Todos los derechos reservados.</p>
            </div>
        </div>
    </footer>;
}