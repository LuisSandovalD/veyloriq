import { daysAgo, daysFromNow, seedId, tokenHash } from "./helpers";
import type {
  CommerceContext,
  CrmContext,
  InventoryContext,
  SeedContext,
  SeedDatabase,
} from "./types";

export const DEMO_QUOTE_TOKEN = "veyloriq-demo-cotizacion-token-0003";

export async function seedCommerce(
  db: SeedDatabase,
  context: SeedContext,
  crm: CrmContext,
  inventory: InventoryContext,
): Promise<CommerceContext> {
  const organizationId = context.organizationId;

  const purchases = {
    received: seedId("purchase:received"),
    partial: seedId("purchase:partial"),
  };
  await db.purchaseOrder.upsert({
    where: { organizationId_number: { organizationId, number: "OC-0001" } },
    update: {
      supplierId: inventory.suppliers.accessories,
      status: "RECEIVED",
      currency: "PEN",
      total: 5_900,
      expectedAt: daysAgo(90),
    },
    create: {
      id: purchases.received,
      organizationId,
      supplierId: inventory.suppliers.accessories,
      number: "OC-0001",
      status: "RECEIVED",
      currency: "PEN",
      total: 5_900,
      expectedAt: daysAgo(90),
      createdAt: daysAgo(96),
    },
  });
  await db.purchaseOrder.upsert({
    where: { organizationId_number: { organizationId, number: "OC-0002" } },
    update: {
      supplierId: inventory.suppliers.tech,
      status: "PARTIALLY_RECEIVED",
      currency: "PEN",
      total: 11_000,
      expectedAt: daysFromNow(8),
    },
    create: {
      id: purchases.partial,
      organizationId,
      supplierId: inventory.suppliers.tech,
      number: "OC-0002",
      status: "PARTIALLY_RECEIVED",
      currency: "PEN",
      total: 11_000,
      expectedAt: daysFromNow(8),
      createdAt: daysAgo(27),
    },
  });

  const purchaseLines = {
    monitor: seedId("purchase-line:monitor"),
    mouse: seedId("purchase-line:mouse"),
    laptop: seedId("purchase-line:laptop"),
  };
  const purchaseLineData = [
    {
      id: purchaseLines.monitor,
      purchaseId: purchases.received,
      productId: inventory.products.monitor,
      description: "Monitor LG 24 pulgadas IPS",
      quantity: 10,
      received: 10,
      unitCost: 500,
    },
    {
      id: purchaseLines.mouse,
      purchaseId: purchases.received,
      productId: inventory.products.mouse,
      description: "Mouse inalámbrico Logitech M170",
      quantity: 20,
      received: 20,
      unitCost: 45,
    },
    {
      id: purchaseLines.laptop,
      purchaseId: purchases.partial,
      productId: inventory.products.laptop,
      description: "Laptop Lenovo ThinkPad E14",
      quantity: 5,
      received: 3,
      unitCost: 2_200,
    },
  ];
  for (const item of purchaseLineData) {
    await db.purchaseLine.upsert({
      where: { organizationId_id: { organizationId, id: item.id } },
      update: {
        purchaseId: item.purchaseId,
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        received: item.received,
        unitCost: item.unitCost,
      },
      create: { organizationId, ...item },
    });
  }

  const receiptOne = seedId("receipt:one");
  const receiptTwo = seedId("receipt:two");
  await db.goodsReceipt.upsert({
    where: { organizationId_number: { organizationId, number: "REC-0001" } },
    update: {
      purchaseId: purchases.received,
      warehouseId: inventory.warehouses.main,
      receivedAt: daysAgo(88),
      actorId: context.users.josue,
    },
    create: {
      id: receiptOne,
      organizationId,
      purchaseId: purchases.received,
      warehouseId: inventory.warehouses.main,
      number: "REC-0001",
      receivedAt: daysAgo(88),
      actorId: context.users.josue,
    },
  });
  await db.goodsReceipt.upsert({
    where: { organizationId_number: { organizationId, number: "REC-0002" } },
    update: {
      purchaseId: purchases.partial,
      warehouseId: inventory.warehouses.main,
      receivedAt: daysAgo(20),
      actorId: context.users.josue,
    },
    create: {
      id: receiptTwo,
      organizationId,
      purchaseId: purchases.partial,
      warehouseId: inventory.warehouses.main,
      number: "REC-0002",
      receivedAt: daysAgo(20),
      actorId: context.users.josue,
    },
  });
  for (const item of [
    {
      key: "monitor",
      receiptId: receiptOne,
      purchaseLineId: purchaseLines.monitor,
      quantity: 10,
    },
    {
      key: "mouse",
      receiptId: receiptOne,
      purchaseLineId: purchaseLines.mouse,
      quantity: 20,
    },
    {
      key: "laptop",
      receiptId: receiptTwo,
      purchaseLineId: purchaseLines.laptop,
      quantity: 3,
    },
  ]) {
    const id = seedId(`receipt-line:${item.key}`);
    await db.receiptLine.upsert({
      where: { id },
      update: {
        receiptId: item.receiptId,
        purchaseLineId: item.purchaseLineId,
        quantity: item.quantity,
      },
      create: {
        id,
        organizationId,
        receiptId: item.receiptId,
        purchaseLineId: item.purchaseLineId,
        quantity: item.quantity,
      },
    });
  }

  const supplierReturnId = seedId("supplier-return:one");
  await db.supplierReturn.upsert({
    where: {
      organizationId_number: { organizationId, number: "DVP-0001" },
    },
    update: {
      purchaseId: purchases.received,
      warehouseId: inventory.warehouses.main,
      reason: "Unidad con empaque dañado",
      returnedAt: daysAgo(84),
      actorId: context.users.josue,
    },
    create: {
      id: supplierReturnId,
      organizationId,
      purchaseId: purchases.received,
      warehouseId: inventory.warehouses.main,
      number: "DVP-0001",
      reason: "Unidad con empaque dañado",
      returnedAt: daysAgo(84),
      actorId: context.users.josue,
    },
  });
  await db.supplierReturnLine.upsert({
    where: {
      organizationId_supplierReturnId_purchaseLineId: {
        organizationId,
        supplierReturnId,
        purchaseLineId: purchaseLines.mouse,
      },
    },
    update: { quantity: 1, unitCost: 45 },
    create: {
      id: seedId("supplier-return-line:mouse"),
      organizationId,
      supplierReturnId,
      purchaseLineId: purchaseLines.mouse,
      quantity: 1,
      unitCost: 45,
    },
  });

  const quotes = {
    completed: seedId("quote:completed"),
    preparing: seedId("quote:preparing"),
    viewed: seedId("quote:viewed"),
    draft: seedId("quote:draft"),
  };
  const quoteData = [
    {
      id: quotes.completed,
      number: "COT-0001",
      customerId: crm.customers.acme,
      contactId: crm.contacts.acme,
      ownerId: context.users.juan,
      status: "CONVERTED" as const,
      validUntil: daysAgo(45),
      subtotal: 1_580,
      discountTotal: 0,
      taxTotal: 284.4,
      total: 1_864.4,
      terms: "Pago contra entrega.",
      notes: "Entrega coordinada con el área de compras.",
      acceptedAt: daysAgo(50),
      convertedAt: daysAgo(49),
      age: 61,
    },
    {
      id: quotes.preparing,
      number: "COT-0002",
      customerId: crm.customers.constructora,
      contactId: null,
      ownerId: context.users.erick,
      status: "CONVERTED" as const,
      validUntil: daysFromNow(9),
      subtotal: 3_240,
      discountTotal: 0,
      taxTotal: 583.2,
      total: 3_823.2,
      terms: "50 % de adelanto y saldo contra entrega.",
      notes: "Incluye soporte durante el primer mes.",
      acceptedAt: daysAgo(7),
      convertedAt: daysAgo(6),
      age: 15,
    },
    {
      id: quotes.viewed,
      number: "COT-0003",
      customerId: crm.customers.panaderia,
      contactId: crm.contacts.panaderia,
      ownerId: context.users.juan,
      status: "VIEWED" as const,
      validUntil: daysFromNow(12),
      subtotal: 950,
      discountTotal: 95,
      taxTotal: 153.9,
      total: 1_008.9,
      terms: "Vigencia de 15 días.",
      notes: "Descuento comercial del 10 %.",
      acceptedAt: null,
      convertedAt: null,
      age: 4,
    },
    {
      id: quotes.draft,
      number: "COT-0004",
      customerId: crm.customers.restaurante,
      contactId: null,
      ownerId: context.users.juan,
      status: "DRAFT" as const,
      validUntil: daysFromNow(20),
      subtotal: 2_880,
      discountTotal: 0,
      taxTotal: 518.4,
      total: 3_398.4,
      terms: "Sujeto a disponibilidad de stock.",
      notes: "Borrador pendiente de revisión comercial.",
      acceptedAt: null,
      convertedAt: null,
      age: 1,
    },
  ];
  for (const item of quoteData) {
    await db.quote.upsert({
      where: { organizationId_number: { organizationId, number: item.number } },
      update: {
        customerId: item.customerId,
        contactId: item.contactId,
        ownerId: item.ownerId,
        status: item.status,
        currency: "PEN",
        validUntil: item.validUntil,
        subtotal: item.subtotal,
        discountTotal: item.discountTotal,
        taxTotal: item.taxTotal,
        total: item.total,
        terms: item.terms,
        notes: item.notes,
        acceptedAt: item.acceptedAt,
        convertedAt: item.convertedAt,
      },
      create: {
        id: item.id,
        organizationId,
        customerId: item.customerId,
        contactId: item.contactId,
        ownerId: item.ownerId,
        number: item.number,
        status: item.status,
        currency: "PEN",
        validUntil: item.validUntil,
        subtotal: item.subtotal,
        discountTotal: item.discountTotal,
        taxTotal: item.taxTotal,
        total: item.total,
        terms: item.terms,
        notes: item.notes,
        acceptedAt: item.acceptedAt,
        convertedAt: item.convertedAt,
        createdAt: daysAgo(item.age),
      },
    });
  }

  const quoteLines = [
    {
      key: "q1-monitor",
      quoteId: quotes.completed,
      productId: inventory.products.monitor,
      sku: "MON-LG-24",
      description: "Monitor LG 24 pulgadas IPS",
      quantity: 2,
      unitPrice: 720,
      discountRate: 0,
      taxRate: 18,
      lineTotal: 1_699.2,
    },
    {
      key: "q1-mouse",
      quoteId: quotes.completed,
      productId: inventory.products.mouse,
      sku: "MOU-LOG-M170",
      description: "Mouse inalámbrico Logitech M170",
      quantity: 2,
      unitPrice: 70,
      discountRate: 0,
      taxRate: 18,
      lineTotal: 165.2,
    },
    {
      key: "q2-laptop",
      quoteId: quotes.preparing,
      productId: inventory.products.laptop,
      sku: "LAP-LEN-E14",
      description: "Laptop Lenovo ThinkPad E14",
      quantity: 1,
      unitPrice: 2_890,
      discountRate: 0,
      taxRate: 18,
      lineTotal: 3_410.2,
    },
    {
      key: "q2-support",
      quoteId: quotes.preparing,
      productId: inventory.products.support,
      sku: "SER-SOP-MES",
      description: "Soporte técnico mensual",
      quantity: 1,
      unitPrice: 350,
      discountRate: 0,
      taxRate: 18,
      lineTotal: 413,
    },
    {
      key: "q3-keyboard",
      quoteId: quotes.viewed,
      productId: inventory.products.keyboard,
      sku: "TEC-LOG-K120",
      description: "Teclado Logitech K120",
      quantity: 10,
      unitPrice: 95,
      discountRate: 10,
      taxRate: 18,
      lineTotal: 1_008.9,
    },
    {
      key: "q4-monitor",
      quoteId: quotes.draft,
      productId: inventory.products.monitor,
      sku: "MON-LG-24",
      description: "Monitor LG 24 pulgadas IPS",
      quantity: 4,
      unitPrice: 720,
      discountRate: 0,
      taxRate: 18,
      lineTotal: 3_398.4,
    },
  ];
  for (const item of quoteLines) {
    const id = seedId(`quote-line:${item.key}`);
    await db.quoteLine.upsert({
      where: { id },
      update: {
        quoteId: item.quoteId,
        productId: item.productId,
        skuSnapshot: item.sku,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountRate: item.discountRate,
        taxRate: item.taxRate,
        lineTotal: item.lineTotal,
      },
      create: {
        id,
        organizationId,
        quoteId: item.quoteId,
        productId: item.productId,
        skuSnapshot: item.sku,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountRate: item.discountRate,
        taxRate: item.taxRate,
        lineTotal: item.lineTotal,
      },
    });
  }

  for (const quote of quoteData.filter((item) => item.status !== "DRAFT")) {
    await db.quoteVersion.upsert({
      where: {
        organizationId_quoteId_version: {
          organizationId,
          quoteId: quote.id,
          version: 1,
        },
      },
      update: {},
      create: {
        id: seedId(`quote-version:${quote.id}:1`),
        organizationId,
        quoteId: quote.id,
        version: 1,
        snapshot: {
          number: quote.number,
          status: "SENT",
          currency: "PEN",
          subtotal: quote.subtotal,
          discountTotal: quote.discountTotal,
          taxTotal: quote.taxTotal,
          total: quote.total,
          terms: quote.terms,
        },
        createdBy: quote.ownerId,
        createdAt: daysAgo(Math.max(2, quote.age - 1)),
      },
    });
  }
  await db.quoteAccessToken.upsert({
    where: { tokenHash: tokenHash(DEMO_QUOTE_TOKEN) },
    update: {
      organizationId,
      quoteId: quotes.viewed,
      expiresAt: daysFromNow(12),
      revokedAt: null,
      respondedAt: null,
    },
    create: {
      id: seedId("quote-token:viewed"),
      organizationId,
      quoteId: quotes.viewed,
      tokenHash: tokenHash(DEMO_QUOTE_TOKEN),
      expiresAt: daysFromNow(12),
      createdAt: daysAgo(4),
    },
  });

  const orders = {
    completed: seedId("order:completed"),
    preparing: seedId("order:preparing"),
    draft: seedId("order:draft"),
  };
  const orderData = [
    {
      id: orders.completed,
      number: "PED-0001",
      customerId: crm.customers.acme,
      quoteId: quotes.completed,
      status: "COMPLETED" as const,
      total: 1_864.4,
      age: 49,
    },
    {
      id: orders.preparing,
      number: "PED-0002",
      customerId: crm.customers.constructora,
      quoteId: quotes.preparing,
      status: "PREPARING" as const,
      total: 3_823.2,
      age: 6,
    },
    {
      id: orders.draft,
      number: "PED-0003",
      customerId: crm.customers.restaurante,
      quoteId: null,
      status: "DRAFT" as const,
      total: 560.5,
      age: 1,
    },
  ];
  for (const item of orderData) {
    await db.order.upsert({
      where: { organizationId_number: { organizationId, number: item.number } },
      update: {
        customerId: item.customerId,
        quoteId: item.quoteId,
        warehouseId: inventory.warehouses.main,
        status: item.status,
        currency: "PEN",
        total: item.total,
      },
      create: {
        id: item.id,
        organizationId,
        customerId: item.customerId,
        quoteId: item.quoteId,
        warehouseId: inventory.warehouses.main,
        number: item.number,
        status: item.status,
        currency: "PEN",
        total: item.total,
        createdAt: daysAgo(item.age),
      },
    });
  }

  const orderLines = [
    {
      key: "o1-monitor",
      orderId: orders.completed,
      productId: inventory.products.monitor,
      description: "Monitor LG 24 pulgadas IPS",
      quantity: 2,
      reserved: 0,
      shipped: 2,
      returned: 0,
      unitPrice: 720,
      lineTotal: 1_699.2,
    },
    {
      key: "o1-mouse",
      orderId: orders.completed,
      productId: inventory.products.mouse,
      description: "Mouse inalámbrico Logitech M170",
      quantity: 2,
      reserved: 0,
      shipped: 2,
      returned: 1,
      unitPrice: 70,
      lineTotal: 165.2,
    },
    {
      key: "o2-laptop",
      orderId: orders.preparing,
      productId: inventory.products.laptop,
      description: "Laptop Lenovo ThinkPad E14",
      quantity: 1,
      reserved: 1,
      shipped: 0,
      returned: 0,
      unitPrice: 2_890,
      lineTotal: 3_410.2,
    },
    {
      key: "o2-support",
      orderId: orders.preparing,
      productId: inventory.products.support,
      description: "Soporte técnico mensual",
      quantity: 1,
      reserved: 1,
      shipped: 0,
      returned: 0,
      unitPrice: 350,
      lineTotal: 413,
    },
    {
      key: "o3-keyboard",
      orderId: orders.draft,
      productId: inventory.products.keyboard,
      description: "Teclado Logitech K120",
      quantity: 5,
      reserved: 0,
      shipped: 0,
      returned: 0,
      unitPrice: 95,
      lineTotal: 560.5,
    },
  ];
  const orderLineIds = new Map<string, string>();
  for (const item of orderLines) {
    const id = seedId(`order-line:${item.key}`);
    orderLineIds.set(item.key, id);
    await db.orderLine.upsert({
      where: { organizationId_id: { organizationId, id } },
      update: {
        orderId: item.orderId,
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        reserved: item.reserved,
        shipped: item.shipped,
        returned: item.returned,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      },
      create: {
        id,
        organizationId,
        orderId: item.orderId,
        productId: item.productId,
        description: item.description,
        quantity: item.quantity,
        reserved: item.reserved,
        shipped: item.shipped,
        returned: item.returned,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      },
    });
  }

  const shipmentId = seedId("shipment:one");
  await db.shipment.upsert({
    where: { organizationId_number: { organizationId, number: "DES-0001" } },
    update: {
      orderId: orders.completed,
      shippedAt: daysAgo(46),
      actorId: context.users.josue,
    },
    create: {
      id: shipmentId,
      organizationId,
      orderId: orders.completed,
      number: "DES-0001",
      shippedAt: daysAgo(46),
      actorId: context.users.josue,
    },
  });
  for (const key of ["o1-monitor", "o1-mouse"] as const) {
    const orderLineId = orderLineIds.get(key);
    if (!orderLineId) throw new Error(`Falta la línea ${key}.`);
    const id = seedId(`shipment-line:${key}`);
    await db.shipmentLine.upsert({
      where: { id },
      update: { shipmentId, orderLineId, quantity: 2 },
      create: { id, organizationId, shipmentId, orderLineId, quantity: 2 },
    });
  }

  const returnId = seedId("return:one");
  await db.return.upsert({
    where: { organizationId_number: { organizationId, number: "DEV-0001" } },
    update: {
      orderId: orders.completed,
      disposition: "SELLABLE",
      reason: "El cliente solicitó cambiar una unidad no utilizada.",
      receivedAt: daysAgo(40),
    },
    create: {
      id: returnId,
      organizationId,
      orderId: orders.completed,
      number: "DEV-0001",
      disposition: "SELLABLE",
      reason: "El cliente solicitó cambiar una unidad no utilizada.",
      receivedAt: daysAgo(40),
    },
  });
  const returnedOrderLine = orderLineIds.get("o1-mouse");
  if (!returnedOrderLine) throw new Error("Falta la línea devuelta.");
  await db.returnLine.upsert({
    where: { id: seedId("return-line:mouse") },
    update: { returnId, orderLineId: returnedOrderLine, quantity: 1 },
    create: {
      id: seedId("return-line:mouse"),
      organizationId,
      returnId,
      orderLineId: returnedOrderLine,
      quantity: 1,
    },
  });

  const sequences = {
    QUOTE: 4,
    PURCHASE: 2,
    ORDER: 3,
    RECEIPT: 2,
    SUPPLIER_RETURN: 1,
    SHIPMENT: 1,
    RETURN: 1,
  };
  for (const [kind, value] of Object.entries(sequences)) {
    await db.documentSequence.upsert({
      where: { organizationId_kind: { organizationId, kind } },
      update: { value },
      create: { organizationId, kind, value },
    });
  }

  return { purchases, purchaseLines, quotes, orders };
}
