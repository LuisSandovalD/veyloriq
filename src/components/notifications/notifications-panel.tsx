"use client";

import { useState } from "react";
import { CheckCheck, Loader2 } from "lucide-react";
import { useAsyncLoad } from "@/shared/use-async-load";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NotificationsInbox } from "./notifications-inbox";
import { NotificationPreferences } from "./notification-preferences";

type Row = Record<string, unknown>;

async function parse(response: Response) {
  const value = await response.json();

  if (!response.ok) {
    throw new Error(value.error?.message ?? "No se pudo completar.");
  }

  return value;
}

export function NotificationsPanel() {
  const [items, setItems] = useState<Row[]>([]);
  const [unread, setUnread] = useState(0);
  const [preferences, setPreferences] = useState<Row[]>([]);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [readingAll, setReadingAll] = useState(false);
  const [updatingPreference, setUpdatingPreference] = useState<string>();

  async function load() {
    try {
      setError(undefined);

      const value = await parse(
        await fetch("/api/notifications", {
          cache: "no-store",
        }),
      );

      setItems(value.data ?? []);
      setUnread(value.unread ?? 0);
      setPreferences(value.preferences ?? []);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Error inesperado.",
      );
    } finally {
      setLoading(false);
    }
  }

  useAsyncLoad(load);

  async function read(id?: string) {
    try {
      if (!id) setReadingAll(true);

      setError(undefined);

      await parse(
        await fetch("/api/notifications", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify(
            id
              ? {
                action: "read",
                id,
              }
              : {
                action: "read_all",
              },
          ),
        }),
      );

      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Error inesperado.",
      );
    } finally {
      if (!id) setReadingAll(false);
    }
  }

  async function updatePreference(
    type: string,
    channel: "IN_APP" | "EMAIL",
    enabled: boolean,
  ) {
    const key = `${type}-${channel}`;

    try {
      setUpdatingPreference(key);
      setError(undefined);

      await parse(
        await fetch("/api/notifications", {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            action: "preference",
            type,
            channel,
            enabled,
          }),
        }),
      );

      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Error inesperado.",
      );
    } finally {
      setUpdatingPreference(undefined);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Notificaciones
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Alertas del espacio activo y recursos asociados.
          </p>
        </div>

        {unread > 0 && (
          <Button
            variant="outline"
            disabled={readingAll}
            onClick={() => void read()}
          >
            {readingAll ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCheck className="size-4" />
            )}

            {readingAll ? "Marcando…" : "Marcar todas como leídas"}
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Bandeja</h2>

        <Badge variant={unread > 0 ? "default" : "secondary"}>
          {unread} sin leer
        </Badge>
      </div>

      <NotificationsInbox
        items={items}
        loading={loading}
        onRead={read}
      />

      <NotificationPreferences
        preferences={preferences}
        updatingPreference={updatingPreference}
        onUpdate={updatePreference}
      />
    </div>
  );
}