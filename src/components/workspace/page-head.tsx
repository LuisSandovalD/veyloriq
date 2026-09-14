import type { ReactNode } from "react";
import { metadata } from "./workspace-metadata";
import type { View } from "./workspace-types";

export function PageHead({
  view,
  action,
}: {
  view: View;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {metadata[view].title}
        </h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          {metadata[view].description}
        </p>
      </div>
      {action}
    </div>
  );
}
