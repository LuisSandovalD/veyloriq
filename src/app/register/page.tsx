import { AuthForm } from "@/components/auth/auth-form";
import { AuthLayout } from "@/components/auth/auth-layout";

export default function RegisterPage() {
    return (
        <AuthLayout
            title="Crea tu espacio"
            lead="Configura tu organización y empieza a gestionar tus operaciones desde un solo lugar."
        >
            <AuthForm mode="register" />
        </AuthLayout>
    );
}