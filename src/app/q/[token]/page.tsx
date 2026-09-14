import { QuotePortal } from "@/components/quotes/quote-portal";
export default async function QuotePortalPage({ params }: { params: Promise<{ token: string }> }) { const { token } = await params; return <QuotePortal token={token} /> }
