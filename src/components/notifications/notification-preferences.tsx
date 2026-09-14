"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

type Row = Record<string, unknown>;

const preferenceTypes = [
    ["OPERATIONS", "Operaciones"],
    ["STOCK", "Inventario"],
    ["FINANCE", "Finanzas"],
    ["BILLING", "Suscripción"],
] as const;

export function NotificationPreferences({
    preferences,
    updatingPreference,
    onUpdate,
}: {
    preferences: Row[];
    updatingPreference?: string;
    onUpdate: (
        type: string,
        channel: "IN_APP" | "EMAIL",
        enabled: boolean,
    ) => Promise<void>;
}) {
    function enabled(type: string, channel: string) {
        return (
            preferences.find(
                (item) =>
                    item.type === type &&
                    item.channel === channel,
            )?.enabled !== false
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Preferencias</CardTitle>
            </CardHeader>

            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tipo</TableHead>
                                <TableHead className="text-center">
                                    En VEYLORIQ
                                </TableHead>
                                <TableHead className="text-center">
                                    Correo
                                </TableHead>
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {preferenceTypes.map(([type, label]) => {
                                const inAppKey = `${type}-IN_APP`;
                                const emailKey = `${type}-EMAIL`;

                                return (
                                    <TableRow key={type}>
                                        <TableCell className="font-medium">
                                            {label}
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex justify-center">
                                                <Checkbox
                                                    checked={enabled(type, "IN_APP")}
                                                    disabled={
                                                        updatingPreference === inAppKey
                                                    }
                                                    onCheckedChange={(value) =>
                                                        void onUpdate(
                                                            type,
                                                            "IN_APP",
                                                            value === true,
                                                        )
                                                    }
                                                    aria-label={`Notificaciones en VEYLORIQ para ${label}`}
                                                />
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex justify-center">
                                                <Checkbox
                                                    checked={enabled(type, "EMAIL")}
                                                    disabled={
                                                        updatingPreference === emailKey
                                                    }
                                                    onCheckedChange={(value) =>
                                                        void onUpdate(
                                                            type,
                                                            "EMAIL",
                                                            value === true,
                                                        )
                                                    }
                                                    aria-label={`Notificaciones por correo para ${label}`}
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}