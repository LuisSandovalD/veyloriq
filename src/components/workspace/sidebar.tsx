"use client";

import { Layers3, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { groups } from "./workspace-groups";
import { metadata } from "./workspace-metadata";
import { canAccessView } from "./workspace-access";
import type { View } from "./workspace-types";

export function Sidebar({
  view,
  onSelect,
  organizationName,
  role,
  permissions,
  open,
  onOpenChange,
}: {
  view: View;
  onSelect: (view: View) => void;
  organizationName?: string;
  role?: string;
  permissions?: readonly string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigation = (
    <>
      <ScrollArea className="min-h-0 flex-1">
        <nav className="px-3 py-4" aria-label="Navegación">
          {groups.map((group) => {
            const items = group.items.filter(([key]) =>
              canAccessView(key, permissions),
            );
            if (!items.length) return null;
            return (
              <div key={group.label} className="mb-5 last:mb-0">
                <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[.14em] text-muted-foreground">
                  {group.label}
                </p>

                <div className="space-y-0.5">
                  {items.map(([key, Icon]) => {
                    const active = view === key;

                    return (
                      <Button
                        key={key}
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          onSelect(key);
                          onOpenChange(false);
                        }}
                        aria-current={active ? "page" : undefined}
                        className={`relative h-10 w-full justify-start gap-3 px-2.5 font-normal ${
                          active
                            ? "bg-accent font-medium text-accent-foreground hover:bg-accent"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {active && (
                          <span className="absolute left-0 h-5 w-0.5 rounded-full bg-primary" />
                        )}
                        <Icon
                          className={`size-4 ${active ? "text-foreground" : "text-muted-foreground"}`}
                          strokeWidth={1.8}
                        />
                        <span className="truncate">{metadata[key].title}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator />

      <div className="shrink-0 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="size-9">
            <AvatarFallback className="text-xs font-semibold">
              {(organizationName ?? "O").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {organizationName ?? "Organización"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {role ?? "Cargando…"}
            </p>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="left"
          className="flex w-[280px] max-w-[85vw] flex-col gap-0 p-0 lg:hidden"
        >
          <SheetTitle className="sr-only">Menú de navegación</SheetTitle>

          <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                <Layers3 className="size-4" />
              </span>
              <span className="text-sm font-semibold tracking-[.14em] text-foreground">
                VEYLORIQ
              </span>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              aria-label="Cerrar menú"
            >
              <X className="size-4" />
            </Button>
          </div>

          {navigation}
        </SheetContent>
      </Sheet>

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-background lg:flex">
        <div className="flex h-16 shrink-0 items-center gap-3 border-b px-5">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Layers3 className="size-4" />
          </span>
          <span className="text-sm font-semibold tracking-[.16em] text-foreground">
            VEYLORIQ
          </span>
        </div>

        {navigation}
      </aside>
    </>
  );
}
