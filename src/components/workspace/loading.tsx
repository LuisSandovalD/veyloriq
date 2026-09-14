import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function Loading({
  title = "Cargando información",
  description = "Estamos preparando los datos, esto puede tardar unos segundos.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <Card aria-busy="true" aria-live="polite">
      <CardContent className="flex min-h-[220px] flex-col items-center justify-center px-6 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>

        <p className="mt-4 text-sm font-semibold">{title}</p>
        <p className="mt-1.5 max-w-sm text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  );
}