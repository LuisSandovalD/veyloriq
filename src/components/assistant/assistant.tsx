"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Bot, Check, Loader2, ShieldAlert, Sparkles, UserRound, X } from "lucide-react";
import { useAsyncLoad } from "@/shared/use-async-load";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { PageHead } from "../workspace/page-head";

type Message = { role: "user" | "assistant"; text: string };
type PendingAction = { title?: string; description?: string;[key: string]: unknown };
type Conversation = { id: string; messages?: { role?: string; content?: string }[] };
type HistoryResponse = { data?: Conversation[] };
type SendResponse = { conversationId?: string; answer?: string; requiresConfirmation?: PendingAction | null };
type ApiError = { error?: { message?: string; requestId?: string } };

async function parse<T>(response: Response): Promise<T> {
  const value = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = value as ApiError;
    const message = error.error?.message ?? `No se pudo completar la operación (${response.status}).`;
    throw new Error(error.error?.requestId ? `${message} Código: ${error.error.requestId}` : message);
  }
  return value as T;
}

export function Assistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [conversationId, setConversationId] = useState<string>();
  const [pending, setPending] = useState<PendingAction>();
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState<string>();
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadHistory() {
    try {
      setHistoryLoading(true);
      setError(undefined);
      const body = await parse<HistoryResponse>(await fetch("/api/ai", { cache: "no-store" }));
      const conversation = body.data?.[0];
      if (!conversation) return;
      setConversationId(conversation.id);
      setMessages((conversation.messages ?? []).filter((message) => message.role === "user" || message.role === "assistant").map((message) => ({
        role: message.role === "user" ? "user" : "assistant",
        text: String(message.content ?? ""),
      })));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo cargar la conversación.");
    } finally {
      setHistoryLoading(false);
    }
  }

  useAsyncLoad(loadHistory);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending, loading]);

  async function send(action?: PendingAction) {
    const text = prompt.trim();
    if ((!text && !action) || loading) return;

    try {
      setLoading(true);
      setError(undefined);

      if (!action) {
        setMessages((current) => [...current, { role: "user", text }]);
        setPrompt("");
      }

      const body = await parse<SendResponse>(await fetch("/api/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          prompt: action ? "Confirma la acción" : text,
          conversationId,
          confirmedAction: action ?? null,
        }),
      }));

      if (body.conversationId) setConversationId(body.conversationId);
      if (body.answer?.trim()) setMessages((current) => [...current, { role: "assistant", text: body.answer!.trim() }]);
      setPending(body.requiresConfirmation ?? undefined);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No pude procesar la solicitud.");
    } finally {
      setLoading(false);
    }
  }

  function cancelAction() {
    setPending(undefined);
    setMessages((current) => [...current, { role: "assistant", text: "La acción fue cancelada. No se realizó ningún cambio." }]);
  }

  const canSend = Boolean(prompt.trim()) && !loading;

  return (
    <>
      <PageHead view="ai" />

      <div className="space-y-6">
        {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

        <Card className="flex min-h-[620px] flex-col overflow-hidden">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Bot className="size-5" />
                </div>
                <div>
                  <CardTitle>Asistente VEYLORIQ</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">Consulta tu operación y ejecuta acciones de forma controlada.</p>
                </div>
              </div>
              <Badge variant="secondary"><Sparkles className="size-3" />IA</Badge>
            </div>
          </CardHeader>

          <CardContent className="min-h-0 flex-1 p-0">
            <ScrollArea className="h-[470px]">
              <div className="mx-auto max-w-4xl p-6">
                {historyLoading ? (
                  <div className="flex min-h-[380px] items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />Cargando conversación…
                  </div>
                ) : !messages.length ? (
                  <div className="flex min-h-[380px] items-center justify-center">
                    <div className="max-w-lg text-center">
                      <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border bg-muted">
                        <Sparkles className="size-6" />
                      </div>
                      <h2 className="mt-4 text-lg font-semibold">Consulta tu operación</h2>
                      <p className="mt-2 text-sm text-muted-foreground">Pregunta por ventas, inventario, pedidos, cotizaciones, clientes o actividad comercial.</p>
                      <div className="mt-5 flex flex-wrap justify-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setPrompt("¿Cómo están mis ventas este mes?")}>Ventas del mes</Button>
                        <Button variant="outline" size="sm" onClick={() => setPrompt("¿Qué productos tienen poco stock?")}>Stock bajo</Button>
                        <Button variant="outline" size="sm" onClick={() => setPrompt("Resume la actividad reciente de mi negocio")}>Resumen reciente</Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {messages.map((message, index) => (
                      <div key={`${message.role}-${index}`} className={`flex items-start gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                        <div className={`flex size-8 shrink-0 items-center justify-center rounded-full border ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          {message.role === "user" ? <UserRound className="size-4" /> : <Bot className="size-4" />}
                        </div>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === "user" ? "rounded-tr-sm bg-primary text-primary-foreground" : "rounded-tl-sm border bg-muted/40"}`}>
                          <p className="whitespace-pre-wrap break-words">{message.text}</p>
                        </div>
                      </div>
                    ))}

                    {loading && (
                      <div className="flex items-start gap-3">
                        <div className="flex size-8 items-center justify-center rounded-full border bg-muted"><Bot className="size-4" /></div>
                        <div className="rounded-2xl rounded-tl-sm border bg-muted/40 px-4 py-3">
                          <span className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Pensando…</span>
                        </div>
                      </div>
                    )}

                    <div ref={bottomRef} />
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>

          {pending && (
            <div className="border-t bg-muted/20 p-4">
              <div className="mx-auto max-w-4xl">
                <Alert>
                  <ShieldAlert className="size-4" />
                  <AlertTitle>Confirmación requerida</AlertTitle>
                  <AlertDescription>
                    {pending.description ? String(pending.description) : pending.title ? String(pending.title) : "El asistente necesita tu autorización antes de ejecutar esta acción."}
                  </AlertDescription>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" disabled={loading} onClick={() => void send(pending)}>
                      {loading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                      {loading ? "Ejecutando…" : "Confirmar acción"}
                    </Button>
                    <Button size="sm" variant="outline" disabled={loading} onClick={cancelAction}>
                      <X className="size-4" />Cancelar
                    </Button>
                  </div>
                </Alert>
              </div>
            </div>
          )}

          <CardFooter className="border-t p-4">
            <div className="mx-auto w-full max-w-4xl">
              <div className="relative">
                <Textarea
                  value={prompt}
                  disabled={loading}
                  rows={2}
                  placeholder="Pregunta sobre tu negocio…"
                  className="min-h-20 resize-none pr-14"
                  onChange={(event) => setPrompt(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      if (canSend) void send();
                    }
                  }}
                />
                <Button type="button" size="icon" disabled={!canSend} className="absolute bottom-3 right-3" onClick={() => void send()} aria-label="Enviar mensaje">
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
                </Button>
              </div>
              <p className="mt-2 text-center text-xs text-muted-foreground">Enter para enviar · Shift+Enter para nueva línea · Las acciones sensibles requieren confirmación.</p>
            </div>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}