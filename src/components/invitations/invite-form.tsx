"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowRight,
    Loader2,
    LockKeyhole,
    UserRound,
    UserRoundPlus,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function InviteForm({ token }: { token: string }) {
    const router = useRouter();
    const [error, setError] = useState<string>();
    const [busy, setBusy] = useState(false);
    const [create, setCreate] = useState(false);

    async function request(payload: Record<string, unknown>) {
        try {
            setBusy(true);
            setError(undefined);

            const response = await fetch("/api/members", {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const body = await response.json();

            if (response.status === 401) {
                setCreate(true);
                return;
            }

            if (!response.ok) {
                throw new Error(
                    body.error?.message ?? "No se pudo aceptar la invitación.",
                );
            }

            router.push("/app");
            router.refresh();
        } catch (reason) {
            setError(
                reason instanceof Error
                    ? reason.message
                    : "No se pudo aceptar la invitación.",
            );
        } finally {
            setBusy(false);
        }
    }

    async function register(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const values = Object.fromEntries(
            new FormData(event.currentTarget),
        );

        await request({
            action: "accept_new",
            token,
            ...values,
        });
    }

    if (create) {
        return (
            <form onSubmit={register} className="space-y-5">
                <p className="text-sm text-muted-foreground">
                    No hay una sesión activa. Crea tu identidad global con el correo al
                    que se envió esta invitación.
                </p>

                <div className="space-y-2">
                    <Label htmlFor="invite-name">Tu nombre</Label>

                    <div className="relative">
                        <UserRound className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                        <Input
                            id="invite-name"
                            name="displayName"
                            autoComplete="name"
                            minLength={2}
                            className="pl-9"
                            placeholder="Tu nombre"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="invite-password">Contraseña</Label>

                    <div className="relative">
                        <LockKeyhole className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                        <Input
                            id="invite-password"
                            name="password"
                            type="password"
                            autoComplete="new-password"
                            minLength={12}
                            className="pl-9"
                            placeholder="Mínimo 12 caracteres"
                            required
                        />
                    </div>
                </div>

                {error && (
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? (
                        <>
                            <Loader2 className="size-4 animate-spin" />
                            Creando acceso…
                        </>
                    ) : (
                        <>
                            <UserRoundPlus className="size-4" />
                            Crear cuenta y unirme
                        </>
                    )}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                    ¿Ya tienes cuenta?{" "}
                    <Link
                        href={`/login?returnTo=${encodeURIComponent(
                            `/invite?token=${token}`,
                        )}`}
                        className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                        Inicia sesión
                    </Link>
                </p>
            </form>
        );
    }

    return (
        <div className="space-y-5">
            <Button
                type="button"
                className="w-full"
                disabled={busy || !token}
                onClick={() =>
                    void request({
                        action: "accept",
                        token,
                    })
                }
            >
                {busy ? (
                    <>
                        <Loader2 className="size-4 animate-spin" />
                        Aceptando…
                    </>
                ) : (
                    <>
                        Aceptar invitación
                        <ArrowRight className="size-4" />
                    </>
                )}
            </Button>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <p className="text-center text-sm text-muted-foreground">
                Usa la cuenta del mismo correo. Si aún no existe, podrás crearla aquí.
            </p>
        </div>
    );
}