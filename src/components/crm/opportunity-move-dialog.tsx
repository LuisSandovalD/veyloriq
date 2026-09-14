"use client";

import {
    useEffect,
    useState,
    type FormEvent,
} from "react";
import {
    ArrowRight,
    Loader2,
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

type Row = Record<string, unknown>;

export function OpportunityMoveDialog({
    open,
    opportunity,
    stages,
    onOpenChange,
    onSubmit,
}: {
    open: boolean;
    opportunity?: Row;
    stages: string[];
    onOpenChange: (open: boolean) => void;
    onSubmit: (
        opportunity: Row,
        stage: string,
        probability: number,
    ) => Promise<void>;
}) {
    const [stage, setStage] =
        useState("");

    const [probability, setProbability] =
        useState("0");

    const [busy, setBusy] =
        useState(false);

    const [error, setError] =
        useState<string>();

    useEffect(() => {
        if (!opportunity) return;

        const nextStage = String(
                opportunity.stage ??
                stages[0] ??
                "",
            );
        const nextProbability = String(
                opportunity.probability ?? 0,
            );
        queueMicrotask(() => {
            setStage((current) => (current === nextStage ? current : nextStage));
            setProbability((current) =>
                (current === nextProbability ? current : nextProbability),
            );
            setError(undefined);
        });
    }, [opportunity, stages]);

    if (!opportunity) return null;

    const currentOpportunity =
        opportunity;

    async function submit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        const numericProbability =
            Number(probability);

        if (!stage) {
            setError(
                "Selecciona una etapa.",
            );
            return;
        }

        if (
            !Number.isFinite(
                numericProbability,
            ) ||
            numericProbability < 0 ||
            numericProbability > 100
        ) {
            setError(
                "La probabilidad debe estar entre 0 y 100.",
            );
            return;
        }

        try {
            setBusy(true);
            setError(undefined);

            await onSubmit(
                currentOpportunity,
                stage,
                numericProbability,
            );

            onOpenChange(false);
        } catch (reason) {
            setError(
                reason instanceof Error
                    ? reason.message
                    : "No se pudo mover la oportunidad.",
            );
        } finally {
            setBusy(false);
        }
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(value) => {
                if (!busy) {
                    onOpenChange(value);
                }
            }}
        >
            <DialogContent className="sm:max-w-md">
                <form
                    onSubmit={submit}
                    className="space-y-5"
                >
                    <DialogHeader>
                        <DialogTitle>
                            Mover oportunidad
                        </DialogTitle>

                        <DialogDescription>
                            Cambia la etapa y actualiza la probabilidad de cierre de{" "}
                            <strong>
                                {String(
                                    currentOpportunity.title ??
                                    "esta oportunidad",
                                )}
                            </strong>
                            .
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <Label>
                            Nueva etapa
                        </Label>

                        <Select
                            value={stage}
                            onValueChange={(value) => {
                                if (value) {
                                    setStage(value);
                                }
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecciona una etapa" />
                            </SelectTrigger>

                            <SelectContent>
                                {stages.map(
                                    (item) => (
                                        <SelectItem
                                            key={item}
                                            value={item}
                                        >
                                            {item}
                                        </SelectItem>
                                    ),
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="opportunity-probability">
                            Probabilidad %
                        </Label>

                        <Input
                            id="opportunity-probability"
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={probability}
                            onChange={(event) =>
                                setProbability(
                                    event.target.value,
                                )
                            }
                            required
                        />
                    </div>

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
                                    Moviendo…
                                </>
                            ) : (
                                <>
                                    Mover oportunidad
                                    <ArrowRight className="size-4" />
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}