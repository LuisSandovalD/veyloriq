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

export function OrganizationIdentity({
    data,
    images,
}: {
    data: Row;
    images: Row[];
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Identidad empresarial</CardTitle>
            </CardHeader>

            <CardContent className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="organization-name">Nombre</Label>
                    <Input
                        id="organization-name"
                        name="name"
                        defaultValue={String(data.name ?? "")}
                        required
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="organization-legalName">Razón social</Label>
                    <Input
                        id="organization-legalName"
                        name="legalName"
                        defaultValue={String(data.legalName ?? "")}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="organization-taxId">Identificación fiscal</Label>
                    <Input
                        id="organization-taxId"
                        name="taxId"
                        defaultValue={String(data.taxId ?? "")}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="organization-contactEmail">Correo de contacto</Label>
                    <Input
                        id="organization-contactEmail"
                        name="contactEmail"
                        type="email"
                        defaultValue={String(data.contactEmail ?? "")}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="organization-contactPhone">Teléfono</Label>
                    <Input
                        id="organization-contactPhone"
                        name="contactPhone"
                        defaultValue={String(data.contactPhone ?? "")}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="organization-address">Dirección</Label>
                    <Input
                        id="organization-address"
                        name="address"
                        defaultValue={String(data.address ?? "")}
                    />
                </div>

                <div className="space-y-2 sm:col-span-2">
                    <Label>Logotipo</Label>
                    <Select
                        name="logoDocumentId"
                        defaultValue={
                            data.logoDocumentId
                                ? String(data.logoDocumentId)
                                : "__none__"
                        }
                    >
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Selecciona un logotipo" />
                        </SelectTrigger>

                        <SelectContent>
                            <SelectItem value="__none__">Sin logotipo</SelectItem>

                            {images.map((image) => (
                                <SelectItem
                                    key={String(image.id)}
                                    value={String(image.id)}
                                >
                                    {String(image.name)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardContent>
        </Card>
    );
}