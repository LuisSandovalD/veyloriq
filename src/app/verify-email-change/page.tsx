import { AuthLayout } from "@/components/auth/auth-layout";
import { EmailChangeConfirmForm } from "@/components/auth/email-change-confirm-form";

export default async function VerifyEmailChangePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  return (
    <AuthLayout
      title="Confirma tu nuevo correo"
      lead="Después de confirmar se cerrarán tus sesiones para que vuelvas a ingresar de forma segura."
    >
      <EmailChangeConfirmForm token={token} />
    </AuthLayout>
  );
}
