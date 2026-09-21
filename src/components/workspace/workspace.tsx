"use client";

import { useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import {
  BillingPanel,
  ReportsPanel,
  SecurityPanel,
  TeamPanel,
} from "@/components/admin/admin-panels";
import { OrganizationHub } from "@/components/organization/organization-hub";
import { TasksPanel } from "@/components/tasks/tasks-panel";
import { CrmPanel } from "@/components/crm/crm-panel";
import { InventoryPanel } from "@/components/inventory/inventory-panel";
import { FinancePanel } from "@/components/finance/finance-panel";
import { RolesPanel } from "@/components/roles/roles-panel";
import { NotificationsPanel } from "@/components/notifications/notifications-panel";
import { DocumentsManagerPanel } from "@/components/documents/documents-manager-panel";
import { CatalogPanel } from "@/components/catalog/catalog-panel";
import { SalesPanel } from "@/components/sales/sales-panel";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { Dashboard } from "../dashboard/dashboard";
import { Assistant } from "../assistant/assistant";
import { DataResourceView, fetchView } from "./data-resource-view";
import type { View } from "./workspace-types";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 20_000, retry: 1, refetchOnWindowFocus: false },
  },
});

export function Workspace() {
  return (
    <QueryClientProvider client={queryClient}>
      <WorkspaceInner />
    </QueryClientProvider>
  );
}

function WorkspaceInner() {
  const [view, setView] = useState<View>("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const contextQuery = useQuery({
    queryKey: ["resource", "dashboard", ""],
    queryFn: () => fetchView("dashboard"),
    staleTime: 60_000,
  });
  const context = contextQuery.data?.context;
  return (
    <div className="flex min-h-screen bg-zinc-50 text-zinc-950 antialiased dark:bg-zinc-950 dark:text-zinc-100">
      <Sidebar
        view={view}
        onSelect={setView}
        organizationName={context?.organizationName}
        role={context?.role}
        permissions={context?.permissions}
        open={menuOpen}
        onOpenChange={setMenuOpen}
      />
      <main className="flex min-w-0 flex-1 flex-col">
        <Topbar
          organizationName={context?.organizationName}
          onOpenNotifications={() => setView("notifications")}
          onOpenMenu={() => setMenuOpen(true)}
        />
        <div className="w-full flex-1 space-y-4 p-4 sm:p-6 lg:space-y-5 lg:p-8">
          {view === "dashboard" ? (
            <Dashboard />
          ) : view === "ai" ? (
            <Assistant />
          ) : (
            <ResourceView resource={view} />
          )}
        </div>
      </main>
    </div>
  );
}

function ResourceView({
  resource,
}: {
  resource: Exclude<View, "dashboard" | "ai">;
}) {
  if (resource === "notifications") return <NotificationsPanel />;
  if (resource === "catalog") return <CatalogPanel />;
  if (resource === "fulfillment") return <SalesPanel />;
  if (resource === "crm") return <CrmPanel />;
  if (resource === "inventory_control") return <InventoryPanel />;
  if (resource === "finance_control") return <FinancePanel />;
  if (resource === "roles") return <RolesPanel />;
  if (resource === "documents") return <DocumentsManagerPanel />;
  if (resource === "reports") return <ReportsPanel />;
  if (resource === "team") return <TeamPanel />;
  if (resource === "security") return <SecurityPanel />;
  if (resource === "billing") return <BillingPanel />;
  if (resource === "organization") return <OrganizationHub />;
  if (resource === "tasks") return <TasksPanel />;
  return <DataResourceView resource={resource} />;
}
