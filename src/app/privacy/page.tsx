import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Clock3, Database, Layers3, Network, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
    title: "Política de privacidad | VEYLORIQ",
    description: "Información sobre el tratamiento, conservación y protección de datos personales en VEYLORIQ.",
};

export default function PrivacyPage() {
    const legalName = process.env.OPERATOR_LEGAL_NAME;
    const taxId = process.env.OPERATOR_TAX_ID;
    const address = process.env.OPERATOR_ADDRESS;
    const configured = Boolean(legalName && taxId && address);

    return (
        <div className="min-h-screen bg-background">
            <header className="border-b">
                <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
                    <Link href="/" className="flex items-center gap-2 font-semibold">
                        <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <Layers3 className="size-4" />
                        </span>
                        VEYLORIQ
                    </Link>

                    <Link href="/" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
                        <ArrowLeft className="size-4" />
                        Volver
                    </Link>
                </div>
            </header>

            <main className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6 sm:py-14">
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <ShieldCheck className="size-4" />
                        Privacidad
                    </div>

                    <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                        Política de privacidad
                    </h1>

                    <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                        Esta política explica qué información trata VEYLORIQ, para qué se utiliza, durante cuánto tiempo se conserva y cómo puedes ejercer tus derechos.
                    </p>
                </div>

                {!configured ? (
                    <Alert variant="destructive">
                        <AlertTitle>Información legal incompleta</AlertTitle>
                        <AlertDescription>
                            Esta página no debe publicarse hasta configurar OPERATOR_LEGAL_NAME, OPERATOR_TAX_ID y OPERATOR_ADDRESS.
                        </AlertDescription>
                    </Alert>
                ) : (
                    <>
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <ShieldCheck className="size-4" />
                                    Responsable del tratamiento
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm leading-6 text-muted-foreground">
                                <p>
                                    El responsable del tratamiento de los datos es{" "}
                                    <span className="font-medium text-foreground">{legalName}</span>,
                                    identificado con{" "}
                                    <span className="font-medium text-foreground">{taxId}</span> y
                                    con domicilio en{" "}
                                    <span className="font-medium text-foreground">{address}</span>.
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Database className="size-4" />
                                    Datos tratados y finalidad
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
                                <p>
                                    VEYLORIQ puede tratar información de identidad, contacto, autenticación, seguridad y operación empresarial necesaria para prestar el servicio.
                                </p>
                                <p>
                                    Estos datos se utilizan para gestionar cuentas, proteger el acceso, procesar operaciones autorizadas, mantener la seguridad de la plataforma, prestar funcionalidades contratadas y cumplir las obligaciones aplicables.
                                </p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Clock3 className="size-4" />
                                    Conservación y derechos
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm leading-6 text-muted-foreground">
                                <p>
                                    Los datos se conservarán durante la relación contractual y, posteriormente, durante los plazos necesarios para atender obligaciones legales, contractuales o de seguridad.
                                </p>
                                <p>
                                    Puedes solicitar el acceso, rectificación, actualización, eliminación u oposición al tratamiento de tus datos mediante nuestros canales de contacto.
                                </p>

                                <Link href="/contact" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-2")}>
                                    Contactar
                                </Link>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Network className="size-4" />
                                    Proveedores y servicios externos
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="text-sm leading-6 text-muted-foreground">
                                <p>
                                    La infraestructura de VEYLORIQ puede apoyarse en proveedores tecnológicos para alojamiento, bases de datos, almacenamiento, mensajería, procesamiento de pagos e inferencia de inteligencia artificial.
                                </p>
                                <p className="mt-3">
                                    Entre estos servicios pueden encontrarse PostgreSQL/Neon, Redis, Brevo, Cloudinary, Mercado Pago y el proveedor de inferencia configurado. Cada proveedor recibe únicamente la información necesaria para prestar la función correspondiente.
                                </p>
                            </CardContent>
                        </Card>

                        <Separator />

                        <p className="text-xs leading-5 text-muted-foreground">
                            Esta política puede actualizarse cuando cambien las funcionalidades de VEYLORIQ, sus proveedores o las obligaciones aplicables.
                        </p>
                    </>
                )}
            </main>
        </div>
    );
}