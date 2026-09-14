import { Archive } from "lucide-react";

export function Empty({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-300 bg-white text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 ${
        compact ? "p-5" : "p-10"
      }`}
    >
      <Archive size={22} />
      <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
        Aún no hay registros
      </strong>
      <span className="text-xs">Crea el primero para comenzar.</span>
    </div>
  );
}

export function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry: () => unknown;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
      <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
        No pudimos cargar esta vista
      </strong>
      <p>{message}</p>
      <button
        className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        onClick={() => retry()}
      >
        Reintentar
      </button>
    </div>
  );
}
