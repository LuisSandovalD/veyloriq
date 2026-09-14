"use client";

import {
    useState,
    type FormEvent,
} from "react";
import {
    Loader2,
    Plus,
} from "lucide-react";
import {
    Alert,
    AlertDescription,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Entity =
    | "customers"
    | "contacts"
    | "leads"
    | "opportunities"
    | "activities";

type Row = Record<string, unknown>;

type References = {
    customers: Row[];
    leads: Row[];
    opportunities: Row[];
    members: Row[];
};

export function CrmCreateDialog({
    open,
    entity,
    stages,
    references,
    onOpenChange,
    onSubmit,
}: {
    open: boolean;
    entity: Entity;
    stages: string[];
    references: References;
    onOpenChange: (open: boolean) => void;
    onSubmit: (payload: Row) => Promise<void>;
}) {
    const [busy, setBusy] = useState(false);
    const [error, setError] =
        useState<string>();

    async function submit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        const form = event.currentTarget;

        const values = Object.fromEntries(
            new FormData(form),
        ) as Record<string, string>;

        try {
            setBusy(true);
            setError(undefined);

            if (entity === "contacts") {
                if (
                    !values.customerId ||
                    values.customerId === "__none__"
                ) {
                    throw new Error(
                        "Selecciona un cliente.",
                    );
                }

                await onSubmit({
                    action: "contact.create",
                    name: values.name,
                    email: values.email || undefined,
                    phone: values.phone || undefined,
                    title: values.title || undefined,
                    customerId: values.customerId,
                });
            }

            if (entity === "opportunities") {
                if (
                    !values.stage ||
                    values.stage === "__none__"
                ) {
                    throw new Error(
                        "Selecciona una etapa.",
                    );
                }

                await onSubmit({
                    action: "opportunity.create",
                    title: values.title,
                    customerId:
                        values.customerId &&
                            values.customerId !== "__none__"
                            ? values.customerId
                            : undefined,
                    stage: values.stage,
                    value: Number(values.value),
                    currency: values.currency,
                    probability: Number(
                        values.probability,
                    ),
                    expectedClose:
                        values.expectedClose
                            ? new Date(
                                `${values.expectedClose}T12:00:00`,
                            ).toISOString()
                            : undefined,
                });
            }

            if (entity === "activities") {
                if (
                    !values.resourceRef ||
                    values.resourceRef === "__none__"
                ) {
                    throw new Error(
                        "Selecciona un recurso.",
                    );
                }

                const [
                    resourceType,
                    resourceId,
                ] = values.resourceRef.split(":");

                if (
                    !resourceType ||
                    !resourceId
                ) {
                    throw new Error(
                        "El recurso seleccionado no es válido.",
                    );
                }

                await onSubmit({
                    action: "activity.create",
                    type: values.type,
                    subject:
                        values.subject || undefined,
                    body:
                        values.body || undefined,
                    resourceType,
                    resourceId,
                });
            }

            form.reset();
            onOpenChange(false);
        } catch (reason) {
            setError(
                reason instanceof Error
                    ? reason.message
                    : "No se pudo guardar el registro.",
            );
        } finally {
            setBusy(false);
        }
    }

    const validEntity = [
        "contacts",
        "opportunities",
        "activities",
    ].includes(entity);

    if (!validEntity) return null;

    return (
        <Dialog
            open={open}
            onOpenChange={(value) => {
                if (!busy) {
                    setError(undefined);
                    onOpenChange(value);
                }
            }}
        >
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
                <form
                    onSubmit={submit}
                    className="space-y-5"
                >
                    <DialogHeader>
                        <DialogTitle>
                            Nuevo registro de CRM
                        </DialogTitle>

                        <DialogDescription>
                            {entity === "contacts" &&
                                "Registra un nuevo contacto asociado a un cliente."}

                            {entity ===
                                "opportunities" &&
                                "Registra una nueva oportunidad comercial."}

                            {entity === "activities" &&
                                "Registra una actividad dentro del historial del CRM."}
                        </DialogDescription>
                    </DialogHeader>

                    {entity === "contacts" && (
                        <>
                            <div className="space-y-2">
                                <Label htmlFor="crm-contact-name">
                                    Nombre
                                </Label>

                                <Input
                                    id="crm-contact-name"
                                    name="name"
                                    required
                                />
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="crm-contact-email">
                                        Correo
                                    </Label>

                                    <Input
                                        id="crm-contact-email"
                                        name="email"
                                        type="email"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="crm-contact-phone">
                                        Teléfono
                                    </Label>

                                    <Input
                                        id="crm-contact-phone"
                                        name="phone"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="crm-contact-title">
                                    Cargo
                                </Label>

                                <Input
                                    id="crm-contact-title"
                                    name="title"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>
                                    Cliente
                                </Label>

                                <Select
                                    name="customerId"
                                    defaultValue="__none__"
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>

                                    <SelectContent>
                                        <SelectItem value="__none__">
                                            Seleccionar cliente
                                        </SelectItem>

                                        {references.customers.map(
                                            (customer) => (
                                                <SelectItem
                                                    key={String(
                                                        customer.id,
                                                    )}
                                                    value={String(
                                                        customer.id,
                                                    )}
                                                >
                                                    {String(
                                                        customer.name,
                                                    )}
                                                </SelectItem>
                                            ),
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </>
                    )}

                    {entity ===
                        "opportunities" && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="crm-opportunity-title">
                                        Oportunidad
                                    </Label>

                                    <Input
                                        id="crm-opportunity-title"
                                        name="title"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>
                                        Cliente
                                    </Label>

                                    <Select
                                        name="customerId"
                                        defaultValue="__none__"
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>

                                        <SelectContent>
                                            <SelectItem value="__none__">
                                                Sin cliente
                                            </SelectItem>

                                            {references.customers.map(
                                                (customer) => (
                                                    <SelectItem
                                                        key={String(
                                                            customer.id,
                                                        )}
                                                        value={String(
                                                            customer.id,
                                                        )}
                                                    >
                                                        {String(
                                                            customer.name,
                                                        )}
                                                    </SelectItem>
                                                ),
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Etapa</Label>

                                        <Select
                                            name="stage"
                                            defaultValue={
                                                stages[0] ??
                                                "__none__"
                                            }
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>

                                            <SelectContent>
                                                {!stages.length && (
                                                    <SelectItem value="__none__">
                                                        Sin etapas disponibles
                                                    </SelectItem>
                                                )}

                                                {stages.map(
                                                    (stage) => (
                                                        <SelectItem
                                                            key={stage}
                                                            value={stage}
                                                        >
                                                            {stage}
                                                        </SelectItem>
                                                    ),
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>
                                            Moneda
                                        </Label>

                                        <Select
                                            name="currency"
                                            defaultValue="PEN"
                                        >
                                            <SelectTrigger className="w-full">
                                                <SelectValue />
                                            </SelectTrigger>

                                            <SelectContent>
                                                <SelectItem value="PEN">
                                                    PEN · Sol peruano
                                                </SelectItem>
                                                <SelectItem value="USD">
                                                    USD · Dólar
                                                </SelectItem>
                                                <SelectItem value="EUR">
                                                    EUR · Euro
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label htmlFor="crm-opportunity-value">
                                            Valor
                                        </Label>

                                        <Input
                                            id="crm-opportunity-value"
                                            name="value"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="crm-opportunity-probability">
                                            Probabilidad %
                                        </Label>

                                        <Input
                                            id="crm-opportunity-probability"
                                            name="probability"
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="1"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="crm-expected-close">
                                        Cierre esperado
                                    </Label>

                                    <Input
                                        id="crm-expected-close"
                                        name="expectedClose"
                                        type="date"
                                    />
                                </div>
                            </>
                        )}

                    {entity === "activities" && (
                        <>
                            <div className="space-y-2">
                                <Label>
                                    Tipo
                                </Label>

                                <Select
                                    name="type"
                                    defaultValue="CALL"
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>

                                    <SelectContent>
                                        <SelectItem value="CALL">
                                            Llamada
                                        </SelectItem>
                                        <SelectItem value="EMAIL">
                                            Correo
                                        </SelectItem>
                                        <SelectItem value="MEETING">
                                            Reunión
                                        </SelectItem>
                                        <SelectItem value="NOTE">
                                            Nota
                                        </SelectItem>
                                        <SelectItem value="FOLLOW_UP">
                                            Seguimiento
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="crm-activity-subject">
                                    Asunto
                                </Label>

                                <Input
                                    id="crm-activity-subject"
                                    name="subject"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="crm-activity-body">
                                    Detalle
                                </Label>

                                <Textarea
                                    id="crm-activity-body"
                                    name="body"
                                    rows={4}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>
                                    Recurso
                                </Label>

                                <Select
                                    name="resourceRef"
                                    defaultValue="__none__"
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue />
                                    </SelectTrigger>

                                    <SelectContent>
                                        <SelectItem value="__none__">
                                            Seleccionar recurso
                                        </SelectItem>

                                        {references.customers.map(
                                            (customer) => (
                                                <SelectItem
                                                    key={`customer-${String(customer.id)}`}
                                                    value={`Customer:${String(customer.id)}`}
                                                >
                                                    Cliente ·{" "}
                                                    {String(
                                                        customer.name,
                                                    )}
                                                </SelectItem>
                                            ),
                                        )}

                                        {references.leads.map(
                                            (lead) => (
                                                <SelectItem
                                                    key={`lead-${String(lead.id)}`}
                                                    value={`Lead:${String(lead.id)}`}
                                                >
                                                    Lead ·{" "}
                                                    {String(
                                                        lead.name,
                                                    )}
                                                </SelectItem>
                                            ),
                                        )}

                                        {references.opportunities.map(
                                            (opportunity) => (
                                                <SelectItem
                                                    key={`opportunity-${String(opportunity.id)}`}
                                                    value={`Opportunity:${String(opportunity.id)}`}
                                                >
                                                    Oportunidad ·{" "}
                                                    {String(
                                                        opportunity.title,
                                                    )}
                                                </SelectItem>
                                            ),
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </>
                    )}

                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>
                                {error}
                            </AlertDescription>
                        </Alert>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={busy}
                            onClick={() =>
                                onOpenChange(false)
                            }
                        >
                            Cancelar
                        </Button>

                        <Button
                            type="submit"
                            disabled={busy}
                        >
                            {busy ? (
                                <>
                                    <Loader2 className="size-4 animate-spin" />
                                    Guardando…
                                </>
                            ) : (
                                <>
                                    <Plus className="size-4" />
                                    Guardar
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}