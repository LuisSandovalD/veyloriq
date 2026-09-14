import { redirect } from "next/navigation";
import { Workspace } from "@/components/workspace/workspace";
import { getAuthContext } from "@/modules/identity/application/auth";

export const dynamic = "force-dynamic";

export default async function AppPage() {
  const context = await getAuthContext();
  if (!context.ok && context.error.code === "UNAUTHENTICATED") redirect("/login");
  if (context.ok && context.value.onboardingStep < 4) redirect("/onboarding");
  return <Workspace/>;
}
