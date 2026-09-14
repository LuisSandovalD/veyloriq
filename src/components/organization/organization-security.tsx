"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Row = Record<string, unknown>;

export function OrganizationSecurity({
    settings,
}: {
    settings: Row;
}) {
    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Política de acceso</CardTitle>
                </CardHeader>

                <CardContent className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="organization-sessionTimeoutMinutes">
                            Duración de sesión (minutos)
                        </Label>
                        <Input
                            id="organization-sessionTimeoutMinutes"
                            name="sessionTimeoutMinutes"
                            type="number"
                            min="1"
                            defaultValue={String(
                                settings.sessionTimeoutMinutes ?? 10080,
                            )}
                            required
                        />
                    </div>

                    <div className="flex items-center gap-3 rounded-lg border p-4">
                        <Checkbox
                            id="organization-requireMfaForAdmins"
                            name="requireMfaForAdmins"
                            defaultChecked={Boolean(settings.requireMfaForAdmins)}
                        />
                        <Label
                            htmlFor="organization-requireMfaForAdmins"
                            className="cursor-pointer"
                        >
                            Exigir MFA a administradores
                        </Label>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Pipeline comercial</CardTitle>
                </CardHeader>

                <CardContent>
                    <div className="space-y-2">
                        <Label htmlFor="organization-opportunityStages">
                            Etapas separadas por comas
                        </Label>
                        <Input
                            id="organization-opportunityStages"
                            name="opportunityStages"
                            defaultValue={
                                Array.isArray(settings.opportunityStages)
                                    ? settings.opportunityStages.join(", ")
                                    : "PROSPECTING, QUALIFICATION, PROPOSAL, NEGOTIATION, WON, LOST"
                            }
                            required
                        />
                        <p className="text-xs text-muted-foreground">
                            Incluye WON y LOST para mantener correctamente el cierre de oportunidades.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </>
    );
}