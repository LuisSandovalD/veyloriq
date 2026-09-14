import { BarChart3, Boxes, FileText, ShieldCheck, Sparkles, Users, Workflow } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
    { icon: Users, title: "CRM conectado", text: "Leads, clientes, contactos y oportunidades comparten un historial comercial consistente." },
    { icon: FileText, title: "Ventas sin recapturas", text: "Cotizaciones, pedidos, despachos, cobros y documentos avanzan dentro del mismo flujo." },
    { icon: Boxes, title: "Inventario trazable", text: "Controla existencias, reservas, almacenes y movimientos con información actualizada." },
    { icon: BarChart3, title: "Información accionable", text: "Analiza métricas construidas directamente desde tus operaciones y movimientos reales." },
    { icon: Workflow, title: "Automatizaciones", text: "Reduce trabajo repetitivo mediante reglas, eventos y acciones controladas por organización." },
    { icon: ShieldCheck, title: "Seguridad por diseño", text: "Aislamiento multi-tenant, permisos, sesiones seguras, MFA y auditoría de operaciones." },
    { icon: Sparkles, title: "IA empresarial", text: "Consulta información autorizada y ejecuta acciones sensibles únicamente con confirmación." }
];

export function ProductSection() {
    return <section id="producto" className="border-y bg-muted/20">
        <div className="mx-auto max-w-7xl px-6 py-20 lg:py-24">
            <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[.2em] text-muted-foreground">Producto</p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">Todo conectado. Sin perder el control.</h2>
                <p className="mt-4 text-muted-foreground">Los módulos de VEYLORIQ comparten contexto, organización, permisos, auditoría y datos para que cada operación continúe donde terminó la anterior.</p>
            </div>
            <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {features.map(({ icon: Icon, title, text }) => <Card key={title} className="group transition-colors hover:bg-muted/40">
                    <CardContent className="p-6">
                        <span className="grid size-10 place-items-center rounded-xl border bg-background transition-colors group-hover:bg-primary group-hover:text-primary-foreground"><Icon className="size-4" /></span>
                        <h3 className="mt-5 font-semibold">{title}</h3>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
                    </CardContent>
                </Card>)}
            </div>
        </div>
    </section>;
}