import { AuthLayout } from "@/components/auth/auth-layout";
import { VerifyForm } from "@/components/auth/verify-form";

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
    const { token = "" } = await searchParams;
    return (
        <AuthLayout title="Verifica tu correo" lead="Confirma que esta dirección te pertenece para activar tu sesión.">
            <VerifyForm token={token} />
        </AuthLayout>
    );
}