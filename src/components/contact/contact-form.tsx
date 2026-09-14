"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Send } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ContactForm() {
    const [message, setMessage] = useState<string>();
    const [success, setSuccess] = useState(false);
    const [busy, setBusy] = useState(false);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const form = event.currentTarget;

        try {
            setBusy(true);
            setMessage(undefined);
            setSuccess(false);

            const data = new FormData(form);

            const response = await fetch("/api/public/contact", {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify(Object.fromEntries(data)),
            });

            const body = await response.json();

            if (!response.ok) {
                throw new Error(
                    body.error?.message ?? "No se pudo enviar el mensaje.",
                );
            }

            setSuccess(true);
            setMessage(
                "Recibimos tu mensaje. Te responderemos por correo.",
            );

            form.reset();
        } catch (reason) {
            setSuccess(false);
            setMessage(
                reason instanceof Error
                    ? reason.message
                    : "No se pudo conectar con el servidor.",
            );
        } finally {
            setBusy(false);
        }
    }

    return (
        <form onSubmit={submit} className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="contact-name">Nombre</Label>

                    <Input
                        id="contact-name"
                        name="name"
                        placeholder="Tu nombre"
                        autoComplete="name"
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="contact-email">
                        Correo electrónico
                    </Label>

                    <Input
                        id="contact-email"
                        name="email"
                        type="email"
                        placeholder="nombre@empresa.com"
                        autoComplete="email"
                        required
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="contact-company">
                    Empresa
                    <span className="ml-1 font-normal text-muted-foreground">
                        · Opcional
                    </span>
                </Label>

                <Input
                    id="contact-company"
                    name="company"
                    placeholder="Nombre de tu empresa"
                    autoComplete="organization"
                />
            </div>

            <div
                className="absolute -left-[9999px]"
                aria-hidden="true"
            >
                <Label htmlFor="contact-website">
                    Sitio web
                </Label>

                <Input
                    id="contact-website"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="contact-message">
                    ¿Cómo podemos ayudarte?
                </Label>

                <Textarea
                    id="contact-message"
                    name="message"
                    placeholder="Cuéntanos brevemente qué necesitas..."
                    rows={5}
                    minLength={10}
                    className="min-h-32 resize-y"
                    required
                />
            </div>

            {message && (
                <Alert variant={success ? "default" : "destructive"}>
                    <AlertDescription>
                        {message}
                    </AlertDescription>
                </Alert>
            )}

            <Button
                type="submit"
                disabled={busy}
            >
                {busy ? (
                    <>
                        <Loader2 className="size-4 animate-spin" />
                        Enviando…
                    </>
                ) : (
                    <>
                        Enviar mensaje
                        <Send className="size-4" />
                    </>
                )}
            </Button>
        </form>
    );
}