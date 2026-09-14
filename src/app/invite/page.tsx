import { AuthLayout } from "@/components/auth/auth-layout";
import { InviteForm } from "@/components/invitations/invite-form";

export default async function InvitePage({
    searchParams,
}: {
    searchParams: Promise<{ token?: string }>;
}) {
    const { token = "" } = await searchParams;
    return (
        <AuthLayout
            title="Únete al equipo"
            lead="La invitación es personal, expira y solo puede utilizarse una vez."
        >
            <InviteForm token={token} />
        </AuthLayout>
    );
}
