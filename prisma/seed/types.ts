import type { getDb } from "../../src/shared/database";

export type SeedDatabase = ReturnType<typeof getDb>;

export type PlanIds = {
  free: string;
  starter: string;
  business: string;
  enterprise: string;
};

export type SeedContext = {
  organizationId: string;
  planIds: PlanIds;
  users: {
    luis: string;
    erick: string;
    juan: string;
    josue: string;
  };
  roles: Record<string, string>;
};

export type CrmContext = {
  customers: {
    acme: string;
    panaderia: string;
    constructora: string;
    restaurante: string;
  };
  contacts: {
    acme: string;
    panaderia: string;
  };
  leads: {
    newLead: string;
    qualified: string;
    converted: string;
  };
  opportunities: {
    negotiation: string;
    won: string;
    prospecting: string;
  };
};

export type InventoryContext = {
  categories: {
    equipment: string;
    accessories: string;
    services: string;
  };
  products: {
    laptop: string;
    monitor: string;
    keyboard: string;
    mouse: string;
    support: string;
  };
  suppliers: {
    tech: string;
    accessories: string;
  };
  warehouses: {
    main: string;
    secondary: string;
  };
};

export type CommerceContext = {
  purchases: {
    received: string;
    partial: string;
  };
  purchaseLines: {
    monitor: string;
    mouse: string;
    laptop: string;
  };
  quotes: {
    completed: string;
    preparing: string;
    viewed: string;
    draft: string;
  };
  orders: {
    completed: string;
    preparing: string;
    draft: string;
  };
};

export type FinanceContext = {
  accounts: {
    bank: string;
    cash: string;
  };
  obligations: {
    completedSale: string;
    preparingSale: string;
    receivedPurchase: string;
    partialPurchase: string;
  };
};

