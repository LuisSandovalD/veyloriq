import { daysAgo, daysFromNow, seedId } from "./helpers";
import type {
  CommerceContext,
  FinanceContext,
  SeedContext,
  SeedDatabase,
} from "./types";

export async function seedFinance(
  db: SeedDatabase,
  context: SeedContext,
  commerce: CommerceContext,
): Promise<FinanceContext> {
  const organizationId = context.organizationId;
  const bank = await db.financialAccount.upsert({
    where: {
      organizationId_name_currency: {
        organizationId,
        name: "Banco principal",
        currency: "PEN",
      },
    },
    update: { type: "BANK", balance: 11_964.4, active: true },
    create: {
      organizationId,
      name: "Banco principal",
      type: "BANK",
      currency: "PEN",
      balance: 11_964.4,
    },
  });
  const cash = await db.financialAccount.upsert({
    where: {
      organizationId_name_currency: {
        organizationId,
        name: "Caja chica",
        currency: "PEN",
      },
    },
    update: { type: "CASH", balance: 2_350, active: true },
    create: {
      organizationId,
      name: "Caja chica",
      type: "CASH",
      currency: "PEN",
      balance: 2_350,
    },
  });
  const accounts = { bank: bank.id, cash: cash.id };

  const categoryData = [
    { key: "sales", name: "Ventas", direction: "IN" },
    { key: "purchases", name: "Compras", direction: "OUT" },
    { key: "expenses", name: "Gastos operativos", direction: "OUT" },
  ] as const;
  const categories = new Map<string, string>();
  for (const item of categoryData) {
    const saved = await db.financialCategory.upsert({
      where: {
        organizationId_name_direction: {
          organizationId,
          name: item.name,
          direction: item.direction,
        },
      },
      update: { active: true },
      create: { organizationId, name: item.name, direction: item.direction },
    });
    categories.set(item.key, saved.id);
  }

  const obligations = {
    completedSale: seedId("obligation:sale-completed"),
    preparingSale: seedId("obligation:sale-preparing"),
    receivedPurchase: seedId("obligation:purchase-received"),
    partialPurchase: seedId("obligation:purchase-partial"),
  };
  const obligationData = [
    {
      id: obligations.completedSale,
      kind: "RECEIVABLE" as const,
      referenceType: "Order",
      referenceId: commerce.orders.completed,
      counterparty: "Distribuidora ACME Cañete",
      amount: 1_864.4,
      paidAmount: 1_864.4,
      dueAt: daysAgo(42),
      status: "PAID" as const,
    },
    {
      id: obligations.preparingSale,
      kind: "RECEIVABLE" as const,
      referenceType: "Order",
      referenceId: commerce.orders.preparing,
      counterparty: "Constructora Valle Sur S.A.C.",
      amount: 3_823.2,
      paidAmount: 1_500,
      dueAt: daysFromNow(10),
      status: "PARTIALLY_PAID" as const,
    },
    {
      id: obligations.receivedPurchase,
      kind: "PAYABLE" as const,
      referenceType: "PurchaseOrder",
      referenceId: commerce.purchases.received,
      counterparty: "Importaciones Accesorios del Sur E.I.R.L.",
      amount: 5_900,
      paidAmount: 5_900,
      dueAt: daysAgo(72),
      status: "PAID" as const,
    },
    {
      id: obligations.partialPurchase,
      kind: "PAYABLE" as const,
      referenceType: "PurchaseOrder",
      referenceId: commerce.purchases.partial,
      counterparty: "Tecnología Mayorista Perú S.A.C.",
      amount: 6_600,
      paidAmount: 0,
      dueAt: daysFromNow(14),
      status: "OPEN" as const,
    },
  ];
  for (const item of obligationData) {
    await db.obligation.upsert({
      where: {
        organizationId_referenceType_referenceId_kind: {
          organizationId,
          referenceType: item.referenceType,
          referenceId: item.referenceId,
          kind: item.kind,
        },
      },
      update: {
        counterparty: item.counterparty,
        currency: "PEN",
        amount: item.amount,
        paidAmount: item.paidAmount,
        dueAt: item.dueAt,
        status: item.status,
      },
      create: {
        id: item.id,
        organizationId,
        kind: item.kind,
        referenceType: item.referenceType,
        referenceId: item.referenceId,
        counterparty: item.counterparty,
        currency: "PEN",
        amount: item.amount,
        paidAmount: item.paidAmount,
        dueAt: item.dueAt,
        status: item.status,
      },
    });
  }

  const paymentData = [
    {
      key: "sale-completed",
      accountId: accounts.bank,
      direction: "IN",
      amount: 1_864.4,
      obligationId: obligations.completedSale,
      paidAt: daysAgo(44),
    },
    {
      key: "sale-preparing",
      accountId: accounts.bank,
      direction: "IN",
      amount: 1_500,
      obligationId: obligations.preparingSale,
      paidAt: daysAgo(5),
    },
    {
      key: "purchase-received",
      accountId: accounts.bank,
      direction: "OUT",
      amount: 5_900,
      obligationId: obligations.receivedPurchase,
      paidAt: daysAgo(75),
    },
  ];
  for (const item of paymentData) {
    const idempotencyKey = `demo-payment-${item.key}`;
    const payment = await db.payment.upsert({
      where: {
        organizationId_idempotencyKey: { organizationId, idempotencyKey },
      },
      update: {
        accountId: item.accountId,
        direction: item.direction,
        currency: "PEN",
        amount: item.amount,
        status: "CONFIRMED",
        paidAt: item.paidAt,
      },
      create: {
        id: seedId(`payment:${item.key}`),
        organizationId,
        accountId: item.accountId,
        direction: item.direction,
        currency: "PEN",
        amount: item.amount,
        status: "CONFIRMED",
        paidAt: item.paidAt,
        idempotencyKey,
      },
    });
    await db.paymentAllocation.upsert({
      where: {
        organizationId_paymentId_obligationId: {
          organizationId,
          paymentId: payment.id,
          obligationId: item.obligationId,
        },
      },
      update: { amount: item.amount },
      create: {
        id: seedId(`payment-allocation:${item.key}`),
        organizationId,
        paymentId: payment.id,
        obligationId: item.obligationId,
        amount: item.amount,
      },
    });
  }

  const cashMovements = [
    {
      key: "bank-opening",
      accountId: accounts.bank,
      categoryId: null,
      type: "OPENING_BALANCE",
      amount: 15_000,
      previous: 0,
      resulting: 15_000,
      referenceType: "ONBOARDING",
      referenceId: organizationId,
      age: 190,
    },
    {
      key: "cash-opening",
      accountId: accounts.cash,
      categoryId: null,
      type: "OPENING_BALANCE",
      amount: 2_000,
      previous: 0,
      resulting: 2_000,
      referenceType: "ACCOUNT",
      referenceId: accounts.cash,
      age: 185,
    },
    {
      key: "purchase-payment",
      accountId: accounts.bank,
      categoryId: categories.get("purchases") ?? null,
      type: "PAYMENT_OUT",
      amount: -5_900,
      previous: 15_000,
      resulting: 9_100,
      referenceType: "Payment",
      referenceId: seedId("payment:purchase-received"),
      age: 75,
    },
    {
      key: "sale-collection",
      accountId: accounts.bank,
      categoryId: categories.get("sales") ?? null,
      type: "PAYMENT_IN",
      amount: 1_864.4,
      previous: 9_100,
      resulting: 10_964.4,
      referenceType: "Payment",
      referenceId: seedId("payment:sale-completed"),
      age: 44,
    },
    {
      key: "sale-advance",
      accountId: accounts.bank,
      categoryId: categories.get("sales") ?? null,
      type: "PAYMENT_IN",
      amount: 1_500,
      previous: 10_964.4,
      resulting: 12_464.4,
      referenceType: "Payment",
      referenceId: seedId("payment:sale-preparing"),
      age: 5,
    },
    {
      key: "transfer-out",
      accountId: accounts.bank,
      categoryId: null,
      type: "TRANSFER_OUT",
      amount: -500,
      previous: 12_464.4,
      resulting: 11_964.4,
      referenceType: "Transfer",
      referenceId: seedId("finance-transfer:one"),
      age: 3,
    },
    {
      key: "transfer-in",
      accountId: accounts.cash,
      categoryId: null,
      type: "TRANSFER_IN",
      amount: 500,
      previous: 2_000,
      resulting: 2_500,
      referenceType: "Transfer",
      referenceId: seedId("finance-transfer:one"),
      age: 3,
    },
    {
      key: "office-expense",
      accountId: accounts.cash,
      categoryId: categories.get("expenses") ?? null,
      type: "MANUAL_OUT",
      amount: -150,
      previous: 2_500,
      resulting: 2_350,
      referenceType: "ManualMovement",
      referenceId: seedId("manual-expense:office"),
      age: 2,
    },
  ];
  for (const item of cashMovements) {
    const id = seedId(`cash-movement:${item.key}`);
    await db.cashMovement.upsert({
      where: { id },
      update: {
        accountId: item.accountId,
        categoryId: item.categoryId,
        type: item.type,
        amount: item.amount,
        previous: item.previous,
        resulting: item.resulting,
        referenceType: item.referenceType,
        referenceId: item.referenceId,
        createdAt: daysAgo(item.age),
      },
      create: {
        id,
        organizationId,
        accountId: item.accountId,
        categoryId: item.categoryId,
        type: item.type,
        amount: item.amount,
        previous: item.previous,
        resulting: item.resulting,
        referenceType: item.referenceType,
        referenceId: item.referenceId,
        createdAt: daysAgo(item.age),
      },
    });
  }

  const reconciliationId = seedId("reconciliation:bank-current");
  await db.accountReconciliation.upsert({
    where: { id: reconciliationId },
    update: {
      accountId: accounts.bank,
      statementBalance: 11_960,
      bookBalance: 11_964.4,
      difference: -4.4,
      notes: "Diferencia pendiente por comisión bancaria.",
      actorId: context.users.erick,
      reconciledAt: daysAgo(1),
    },
    create: {
      id: reconciliationId,
      organizationId,
      accountId: accounts.bank,
      statementBalance: 11_960,
      bookBalance: 11_964.4,
      difference: -4.4,
      notes: "Diferencia pendiente por comisión bancaria.",
      actorId: context.users.erick,
      reconciledAt: daysAgo(1),
    },
  });

  return { accounts, obligations };
}
