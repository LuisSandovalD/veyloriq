import { AuthForm } from "@/components/auth/auth-form";
import { AuthLayout } from "@/components/auth/auth-layout";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const { returnTo } = await searchParams;
  const safeReturn = returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : undefined;
  return <AuthLayout title="Bienvenido de vuelta" lead="Ingresa para continuar con tu operación."><AuthForm mode="login" returnTo={safeReturn} /></AuthLayout>;
}
