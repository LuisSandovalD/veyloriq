import type { ReactNode } from "react";

export function PanelHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
    return (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            </div>
            {action}
        </div>
    );
}