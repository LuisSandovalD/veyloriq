"use client";

import { useState } from "react";
import { useAsyncLoad } from "@/shared/use-async-load";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MfaSecurityCard } from "./mfa-security-card";
import { EmailSecurityCard } from "./email-security-card";
import { PasswordSecurityCard } from "./password-security-card";
import { SessionsSecurityCard } from "./sessions-security-card";

export type SecurityUser = {
    email: string;
    mfaEnabled: boolean;
};

export type SecuritySession = {
    id: string;
    userAgent: string | null;
    lastSeenAt: string;
};

export type MfaSetup = {
    setupToken: string;
    uri: string;
    recoveryCodes: string[];
};

type SecurityData = {
    user?: SecurityUser;
    sessions: SecuritySession[];
};

type ApiError = {
    error?: {
        message?: string;
        requestId?: string;
    };
};

async function parse<T>(response: Response): Promise<T> {
    const value = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = value as ApiError;
        const message = error.error?.message ?? `No se pudo completar la operación (${response.status}).`;
        const requestId = error.error?.requestId;
        throw new Error(requestId ? `${message} Código: ${requestId}` : message);
    }
    return value as T;
}

export function SecurityPanel() {
    const [data, setData] = useState<SecurityData>({ sessions: [] });
    const [error, setError] = useState<string>();

    async function load() {
        try {
            setError(undefined);
            const value = await parse<SecurityData>(await fetch("/api/auth/security", { cache: "no-store" }));
            setData({ user: value.user, sessions: value.sessions ?? [] });
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Error inesperado.");
        }
    }

    useAsyncLoad(load);

    async function mfaRequest<T>(payload: Record<string, unknown>): Promise<T> {
        return parse<T>(await fetch("/api/auth/mfa", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
        }));
    }

    async function securityRequest<T>(payload: Record<string, unknown>): Promise<T> {
        return parse<T>(await fetch("/api/auth/security", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
        }));
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Seguridad</h1>
                <p className="mt-1 text-sm text-muted-foreground">MFA, contraseña, correo de acceso y sesiones revocables.</p>
            </div>

            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

            <MfaSecurityCard mfaEnabled={data.user?.mfaEnabled ?? false} request={mfaRequest} onChanged={load} />
            <EmailSecurityCard email={data.user?.email ?? ""} request={securityRequest} />
            <PasswordSecurityCard request={securityRequest} />
            <SessionsSecurityCard sessions={data.sessions} request={securityRequest} onChanged={load} />
        </div>
    );
}