import { redirect } from "next/navigation";
import { getPlatformContext } from "@/modules/identity/application/auth";
import { PlatformDashboard } from "@/components/platform/platform-dashboard";

export const dynamic = "force-dynamic";
export default async function PlatformPage() { const context = await getPlatformContext(); if (!context.ok && context.error.code === "UNAUTHENTICATED") redirect("/login"); return <PlatformDashboard /> }
