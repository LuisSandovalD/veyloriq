import { mailEnv } from "@/shared/env";

export async function sendTransactionalEmail(input: { to: string; name?: string; subject: string; html: string; outboxEventId?: string }) {
  const env = mailEnv();
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    signal: AbortSignal.timeout(15_000),
    headers: { "api-key": env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { email: env.BREVO_SENDER_EMAIL, name: env.BREVO_SENDER_NAME },
      to: [{ email: input.to, ...(input.name ? { name: input.name } : {}) }],
      subject: input.subject,
      htmlContent: input.html,
      ...(input.outboxEventId ? { headers: { "X-Mailin-custom": `outbox:${input.outboxEventId}` }, tags: ["VEYLORIQ-transactional"] } : {})
    })
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Brevo rejected the request (${response.status}): ${text.slice(0, 500)}`);
  const data = JSON.parse(text) as { messageId?: string };
  if (!data.messageId) throw new Error("Brevo did not return a messageId");
  return { messageId: data.messageId };
}