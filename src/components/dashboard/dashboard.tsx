"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { PageHead } from "../workspace/page-head";
import { Empty, ErrorState } from "../workspace/empty-state";
import { Loading } from "../workspace/loading";
import { currency, dateValue, nested } from "../workspace/resource-table";
import { fetchView } from "../workspace/data-resource-view";
import type { Row } from "../workspace/workspace-types";

function Metric({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        {value}
      </div>
      <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{note}</div>
    </div>
  );
}

export function Dashboard() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["resource", "dashboard", ""],
    queryFn: () => fetchView("dashboard"),
  });
  if (isLoading) return <Loading />;
  if (error) return <ErrorState message={error.message} retry={refetch} />;
  const payload = data?.data as {
    metrics: Record<string, unknown>;
    stock: Row[];
    recent: Row[];
  };
  const m = payload.metrics;
  const chart = [
    { name: "Cotizaciones", value: Number(m.quotePipeline ?? 0) },
    { name: "Pedidos", value: Number(m.sales ?? 0) },
  ];
  return (
    <>
      <PageHead view="dashboard" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Clientes activos"
          value={String(m.customers ?? 0)}
          note="Registros no archivados"
        />
        <Metric
          label="Pipeline cotizado"
          value={currency(m.quotePipeline)}
          note={`${m.quoteCount ?? 0} cotizaciones vigentes`}
        />
        <Metric
          label="Ventas registradas"
          value={currency(m.sales)}
          note={`${m.orderCount ?? 0} pedidos no cancelados`}
        />
        <Metric
          label="Tareas abiertas"
          value={String(m.openTasks ?? 0)}
          note="Abiertas o en curso"
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Comparativo comercial
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-zinc-400">
              Datos operativos
            </span>
          </div>
          <div
            style={{ height: 240 }}
            className="[--chart-grid:#e4e4e7] [--chart-line:#52525b] [--chart-tooltip-bg:#ffffff] [--chart-tooltip-border:#e4e4e7] [--chart-tooltip-text:#27272a] dark:[--chart-grid:#27272a] dark:[--chart-line:#a1a1aa] dark:[--chart-tooltip-bg:#18181b] dark:[--chart-tooltip-border:#3f3f46] dark:[--chart-tooltip-text:#d4d4d8]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart}>
                <defs>
                  <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--chart-line)"
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--chart-line)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--chart-line)", fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--chart-tooltip-bg)",
                    border: "1px solid var(--chart-tooltip-border)",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                  itemStyle={{ color: "var(--chart-tooltip-text)" }}
                  labelStyle={{
                    color: "var(--chart-tooltip-text)",
                    fontWeight: 600,
                  }}
                  cursor={{ stroke: "var(--chart-grid)" }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--chart-line)"
                  fill="url(#fill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Actividad reciente
            </h2>
          </div>
          {payload.recent.length ? (
            payload.recent.map((item) => (
              <div
                key={String(item.id)}
                className="border-b border-zinc-100 py-2.5 text-xs last:border-b-0 dark:border-zinc-800"
              >
                <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {String(item.action)}
                </strong>
                <div className="text-zinc-500 dark:text-zinc-400">
                  {dateValue(item.createdAt)} · {String(item.outcome)}
                </div>
              </div>
            ))
          ) : (
            <Empty compact />
          )}
        </section>
      </div>
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Inventario actualizado
          </h2>
        </div>
        {payload.stock.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="border-b border-zinc-200 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                    Producto
                  </th>
                  <th className="border-b border-zinc-200 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                    Almacén
                  </th>
                  <th className="border-b border-zinc-200 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                    Físico
                  </th>
                  <th className="border-b border-zinc-200 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                    Reservado
                  </th>
                  <th className="border-b border-zinc-200 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                    Disponible
                  </th>
                </tr>
              </thead>
              <tbody>
                {payload.stock.map((row) => (
                  <tr key={String(row.id)}>
                    <td className="border-b border-zinc-100 px-4 py-3 text-zinc-800 dark:border-zinc-800 dark:text-zinc-300">
                      {nested(row, "product", "name")}
                    </td>
                    <td className="border-b border-zinc-100 px-4 py-3 text-zinc-800 dark:border-zinc-800 dark:text-zinc-300">
                      {nested(row, "warehouse", "name")}
                    </td>
                    <td className="border-b border-zinc-100 px-4 py-3 text-zinc-800 dark:border-zinc-800 dark:text-zinc-300">
                      {String(row.physical)}
                    </td>
                    <td className="border-b border-zinc-100 px-4 py-3 text-zinc-800 dark:border-zinc-800 dark:text-zinc-300">
                      {String(row.reserved)}
                    </td>
                    <td className="border-b border-zinc-100 px-4 py-3 text-zinc-800 dark:border-zinc-800 dark:text-zinc-300">
                      {Number(row.physical) - Number(row.reserved)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty compact />
        )}
      </section>
    </>
  );
}
