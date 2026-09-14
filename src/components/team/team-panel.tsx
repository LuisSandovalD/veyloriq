"use client";

import { useState } from "react";
import { useAsyncLoad } from "@/shared/use-async-load";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TeamInviteForm } from "./team-invite-form";
import { TeamMembersTable } from "./team-members-table";
import { TeamInvitations } from "./team-invitations";

export type TeamRole = { id: string; name: string };
export type TeamUser = { id: string; displayName: string; email: string; mfaEnabled: boolean };
export type TeamMember = { id: string; user: TeamUser; role: TeamRole };
export type TeamInvitation = { id: string; email: string; expiresAt: string };
type TeamData = { members: TeamMember[]; invitations: TeamInvitation[]; roles: TeamRole[] };
type ApiError = { error?: { message?: string; requestId?: string } };

async function parse<T>(response: Response): Promise<T> {
    const value = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = value as ApiError;
        const message = error.error?.message ?? `No se pudo completar la operación (${response.status}).`;
        throw new Error(error.error?.requestId ? `${message} Código: ${error.error.requestId}` : message);
    }
    return value as T;
}

export function TeamPanel() {
    const [data, setData] = useState<TeamData>({ members: [], invitations: [], roles: [] });
    const [error, setError] = useState<string>();

    async function load() {
        try {
            setError(undefined);
            const value = await parse<TeamData>(await fetch("/api/members", { cache: "no-store" }));
            setData({ members: value.members ?? [], invitations: value.invitations ?? [], roles: value.roles ?? [] });
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Error inesperado.");
        }
    }

    useAsyncLoad(load);

    async function mutate(payload: Record<string, unknown>) {
        await parse(await fetch("/api/members", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
        }));
        await load();
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Equipo y permisos</h1>
                <p className="mt-1 text-sm text-muted-foreground">Miembros, roles, invitaciones y transferencia segura de propiedad.</p>
            </div>

            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

            <TeamInviteForm roles={data.roles} onInvite={mutate} />
            <TeamMembersTable members={data.members} roles={data.roles} onAction={mutate} />
            <TeamInvitations invitations={data.invitations} onAction={mutate} />
        </div>
    );
}