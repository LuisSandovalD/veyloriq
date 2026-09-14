"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

type Row = Record<string, unknown>;

export function OrganizationLocalization({
    data,
    settings,
}: {
    data: Row;
    settings: Row;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Localización y documentos</CardTitle>
            </CardHeader>

            <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                    <Label htmlFor="organization-timeZone">Zona horaria</Label>
                    <Input
                        id="organization-timeZone"
                        name="timeZone"
                        defaultValue={String(data.timeZone ?? "")}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label>Moneda base</Label>
                    <Select
                        name="currency"
                        defaultValue={String(data.currency ?? "PEN")}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="PEN">PEN · Sol peruano</SelectItem>
                            <SelectItem value="USD">USD · Dólar</SelectItem>
                            <SelectItem value="EUR">EUR · Euro</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Idioma</Label>
                    <Select
                        name="locale"
                        defaultValue={String(data.locale ?? "es-PE")}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="es-PE">Español (Perú)</SelectItem>
                            <SelectItem value="es-ES">Español</SelectItem>
                            <SelectItem value="en-US">English</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Formato de fecha</Label>
                    <Select
                        name="dateFormat"
                        defaultValue={String(settings.dateFormat ?? "DD/MM/YYYY")}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                            <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                            <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Inicio de semana</Label>
                    <Select
                        name="weekStartsOn"
                        defaultValue={String(settings.weekStartsOn ?? "MONDAY")}
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="MONDAY">Lunes</SelectItem>
                            <SelectItem value="SUNDAY">Domingo</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="organization-quotePrefix">
                        Prefijo de cotización
                    </Label>
                    <Input
                        id="organization-quotePrefix"
                        name="quotePrefix"
                        defaultValue={String(settings.quotePrefix ?? "COT")}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="organization-purchasePrefix">
                        Prefijo de compra
                    </Label>
                    <Input
                        id="organization-purchasePrefix"
                        name="purchasePrefix"
                        defaultValue={String(settings.purchasePrefix ?? "OC")}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="organization-orderPrefix">
                        Prefijo de pedido
                    </Label>
                    <Input
                        id="organization-orderPrefix"
                        name="orderPrefix"
                        defaultValue={String(settings.orderPrefix ?? "PED")}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="organization-taxName">
                        Nombre del impuesto
                    </Label>
                    <Input
                        id="organization-taxName"
                        name="taxName"
                        defaultValue={String(settings.taxName ?? "IGV")}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="organization-defaultTaxRate">
                        Impuesto predeterminado %
                    </Label>
                    <Input
                        id="organization-defaultTaxRate"
                        name="defaultTaxRate"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        defaultValue={String(settings.defaultTaxRate ?? 18)}
                        required
                    />
                </div>
            </CardContent>
        </Card>
    );
}