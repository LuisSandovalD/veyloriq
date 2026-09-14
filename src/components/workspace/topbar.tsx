"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Loader2, LogOut, Menu, Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function Topbar({
  organizationName,
  onOpenNotifications,
  onOpenMenu,
}: {
  organizationName?: string;
  onOpenNotifications: () => void;
  onOpenMenu: () => void;
}) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  function toggleTheme() {
    const current = theme ?? "system";
    setTheme(current === "system" ? "light" : current === "light" ? "dark" : "system");
  }

  async function logout() {
    if (loggingOut) return;

    try {
      setLoggingOut(true);
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b bg-background/90 px-4 backdrop-blur-xl sm:h-16 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 lg:hidden"
          onClick={onOpenMenu}
          aria-label="Abrir menú"
          aria-controls="mobile-sidebar"
        >
          <Menu className="size-5" />
        </Button>

        <p className="truncate text-sm font-semibold text-foreground">
          {organizationName ?? "VEYLORIQ"}
        </p>

        <p className="hidden text-xs text-muted-foreground sm:block">
          Espacio de trabajo
        </p>
      </div>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={!mounted}
          onClick={toggleTheme}
          aria-label="Cambiar tema"
        >
          {!mounted || theme === "system" ? (
            <Monitor className="size-4" />
          ) : theme === "light" ? (
            <Moon className="size-4" />
          ) : (
            <Sun className="size-4" />
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onOpenNotifications}
          aria-label="Abrir notificaciones"
        >
          <Bell className="size-4" />
        </Button>

        <Separator orientation="vertical" className="mx-1 hidden h-5 sm:block" />

        <Button
          type="button"
          variant="ghost"
          disabled={loggingOut}
          onClick={() => void logout()}
          className="px-2.5 text-muted-foreground hover:text-foreground"
        >
          {loggingOut ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LogOut className="size-4" />
          )}
          <span className="hidden sm:inline">
            {loggingOut ? "Saliendo…" : "Salir"}
          </span>
        </Button>
      </div>
    </header>
  );
}