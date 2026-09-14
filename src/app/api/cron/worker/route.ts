import { NextResponse } from "next/server";
import { runWorkerOnce } from "@/worker";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: Request): boolean {
  // Vercel Cron envía esta cabecera y no puede ser falsificada por usuarios externos.
  if (request.headers.get("x-vercel-cron") === "1") return true;
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) return false;
  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${expected}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request))
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const startedAt = Date.now();
    const { worked } = await runWorkerOnce(25);
    return NextResponse.json({
      status: "ok",
      worked,
      durationMs: Date.now() - startedAt,
      time: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "cron.worker.failed",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    );
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
