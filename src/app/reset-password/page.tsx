import { AuthLayout } from "@/components/auth/auth-layout";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return (
    <AuthLayout
      title={token ? "Crea una contraseña" : "Recupera tu acceso"}
      lead={token ? "Usa al menos 12 caracteres, una mayúscula y un número." : "Te enviaremos un enlace de un solo uso si la cuenta existe."}
    >
      <ResetPasswordForm token={token} />
    </AuthLayout>
  );
}
