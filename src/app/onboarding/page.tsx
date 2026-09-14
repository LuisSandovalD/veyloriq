import { redirect } from "next/navigation";
import { Layers3 } from "lucide-react";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { getAuthContext } from "@/modules/identity/application/auth";
import { getDb } from "@/shared/database";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const context = await getAuthContext();
  if (!context.ok) redirect("/login");
  if (context.value.onboardingStep >= 4) redirect("/app");
  const organization = await getDb().organization.findUniqueOrThrow({ where: { id: context.value.organizationId }, select: { name: true, legalName: true, taxId: true, address: true, currency: true, locale: true, timeZone: true } });
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}><div style={{ width: "min(680px, 100%)" }}><div className="brand" style={{ marginBottom: 20 }}><span className="brand-mark"><Layers3 size={18} /></span>VEYLORIQ</div><OnboardingForm organization={organization} /></div></main>;
}
