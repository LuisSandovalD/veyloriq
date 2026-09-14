import { NextResponse } from "next/server";
import { getDb } from "@/shared/database";

export async function GET() {
  try {
    const plans = await getDb().plan.findMany({ where: { active: true }, select: { id: true, code: true, name: true, currency: true, monthlyPrice: true, annualPrice: true, features: true, limits: true }, orderBy: { monthlyPrice: "asc" } });
    return NextResponse.json({ data: plans }, { headers: { "cache-control": "public, max-age=300, stale-while-revalidate=3600" } });
  } catch {
    return NextResponse.json({ error: "pricing_unavailable" }, { status: 503 });
  }
}
