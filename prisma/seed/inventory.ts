import { daysAgo, seedId } from "./helpers";
import type {
  CommerceContext,
  InventoryContext,
  SeedContext,
  SeedDatabase,
} from "./types";

export async function seedInventoryCatalog(
  db: SeedDatabase,
  context: SeedContext,
): Promise<InventoryContext> {
  const organizationId = context.organizationId;
  const categoryData = [
    { key: "equipment", name: "Equipos de cómputo" },
    { key: "accessories", name: "Accesorios" },
    { key: "services", name: "Servicios" },
  ] as const;
  const categories = {} as InventoryContext["categories"];
  for (const item of categoryData) {
    const saved = await db.category.upsert({
      where: {
        organizationId_name: { organizationId, name: item.name },
      },
      update: {},
      create: { organizationId, name: item.name },
    });
    categories[item.key] = saved.id;
  }

  const productData = [
    {
      key: "laptop",
      categoryId: categories.equipment,
      kind: "PRODUCT" as const,
      sku: "LAP-LEN-E14",
      barcode: "7750000000011",
      name: "Laptop Lenovo ThinkPad E14",
      description: "Laptop empresarial de 14 pulgadas, 16 GB RAM y SSD de 512 GB.",
      unit: "unidad",
      price: 2_890,
      cost: 2_200,
      taxRate: 18,
      minimumStock: 2,
      age: 170,
    },
    {
      key: "monitor",
      categoryId: categories.equipment,
      kind: "PRODUCT" as const,
      sku: "MON-LG-24",
      barcode: "7750000000028",
      name: "Monitor LG 24 pulgadas IPS",
      description: "Monitor Full HD para oficina con conexión HDMI.",
      unit: "unidad",
      price: 720,
      cost: 500,
      taxRate: 18,
      minimumStock: 4,
      age: 168,
    },
    {
      key: "keyboard",
      categoryId: categories.accessories,
      kind: "PRODUCT" as const,
      sku: "TEC-LOG-K120",
      barcode: "7750000000035",
      name: "Teclado Logitech K120",
      description: "Teclado USB de tamaño completo para oficina.",
      unit: "unidad",
      price: 95,
      cost: 65,
      taxRate: 18,
      minimumStock: 10,
      age: 162,
    },
    {
      key: "mouse",
      categoryId: categories.accessories,
      kind: "PRODUCT" as const,
      sku: "MOU-LOG-M170",
      barcode: "7750000000042",
      name: "Mouse inalámbrico Logitech M170",
      description: "Mouse inalámbrico compacto con receptor USB.",
      unit: "unidad",
      price: 70,
      cost: 45,
      taxRate: 18,
      minimumStock: 10,
      age: 160,
    },
    {
      key: "support",
      categoryId: categories.services,
      kind: "SERVICE" as const,
      sku: "SER-SOP-MES",
      barcode: null,
      name: "Soporte técnico mensual",
      description: "Bolsa mensual de soporte remoto y mantenimiento preventivo.",
      unit: "mes",
      price: 350,
      cost: 120,
      taxRate: 18,
      minimumStock: 0,
      age: 145,
    },
  ] as const;
  const products = {} as InventoryContext["products"];
  for (const item of productData) {
    const saved = await db.product.upsert({
      where: { organizationId_sku: { organizationId, sku: item.sku } },
      update: {
        categoryId: item.categoryId,
        kind: item.kind,
        barcode: item.barcode,
        name: item.name,
        description: item.description,
        unit: item.unit,
        price: item.price,
        cost: item.cost,
        taxRate: item.taxRate,
        minimumStock: item.minimumStock,
        active: true,
      },
      create: {
        organizationId,
        categoryId: item.categoryId,
        kind: item.kind,
        sku: item.sku,
        barcode: item.barcode,
        name: item.name,
        description: item.description,
        unit: item.unit,
        price: item.price,
        cost: item.cost,
        taxRate: item.taxRate,
        minimumStock: item.minimumStock,
        active: true,
        createdAt: daysAgo(item.age),
      },
    });
    products[item.key] = saved.id;
  }

  const supplierData = [
    {
      key: "tech",
      name: "Tecnología Mayorista Perú S.A.C.",
      taxId: "20604125879",
      email: "ventas.tecnologiamayorista@gmail.com",
      phone: "+51 960 240 118",
      address: "Av. Argentina 2150, Lima",
    },
    {
      key: "accessories",
      name: "Importaciones Accesorios del Sur E.I.R.L.",
      taxId: "20587412630",
      email: "pedidos.accesoriossur@gmail.com",
      phone: "+51 946 520 730",
      address: "Jr. Paruro 980, Lima",
    },
  ] as const;
  const suppliers = {} as InventoryContext["suppliers"];
  for (const item of supplierData) {
    const id = seedId(`supplier:${item.key}`);
    const saved = await db.supplier.upsert({
      where: { organizationId_id: { organizationId, id } },
      update: {
        name: item.name,
        taxId: item.taxId,
        email: item.email,
        phone: item.phone,
        address: item.address,
        active: true,
      },
      create: {
        id,
        organizationId,
        name: item.name,
        taxId: item.taxId,
        email: item.email,
        phone: item.phone,
        address: item.address,
      },
    });
    suppliers[item.key] = saved.id;
  }

  const warehouseData = [
    {
      key: "main",
      code: "ALM-01",
      name: "Almacén principal Cañete",
      address: "Av. Mariscal Benavides 1370, San Vicente de Cañete",
    },
    {
      key: "secondary",
      code: "ALM-02",
      name: "Almacén auxiliar Imperial",
      address: "Jr. 2 de Mayo 620, Imperial",
    },
  ] as const;
  const warehouses = {} as InventoryContext["warehouses"];
  for (const item of warehouseData) {
    const saved = await db.warehouse.upsert({
      where: { organizationId_code: { organizationId, code: item.code } },
      update: { name: item.name, address: item.address, active: true },
      create: {
        organizationId,
        code: item.code,
        name: item.name,
        address: item.address,
      },
    });
    warehouses[item.key] = saved.id;
  }

  return { categories, products, suppliers, warehouses };
}

export async function seedStockHistory(
  db: SeedDatabase,
  context: SeedContext,
  inventory: InventoryContext,
  commerce: CommerceContext,
): Promise<void> {
  const organizationId = context.organizationId;
  const stockData = [
    {
      productId: inventory.products.laptop,
      warehouseId: inventory.warehouses.main,
      physical: 3,
      reserved: 1,
    },
    {
      productId: inventory.products.monitor,
      warehouseId: inventory.warehouses.main,
      physical: 8,
      reserved: 0,
    },
    {
      productId: inventory.products.mouse,
      warehouseId: inventory.warehouses.main,
      physical: 18,
      reserved: 0,
    },
    {
      productId: inventory.products.keyboard,
      warehouseId: inventory.warehouses.main,
      physical: 12,
      reserved: 0,
    },
    {
      productId: inventory.products.keyboard,
      warehouseId: inventory.warehouses.secondary,
      physical: 3,
      reserved: 0,
    },
  ];
  for (const item of stockData) {
    await db.stock.upsert({
      where: {
        organizationId_productId_warehouseId: {
          organizationId,
          productId: item.productId,
          warehouseId: item.warehouseId,
        },
      },
      update: {
        physical: item.physical,
        reserved: item.reserved,
        version: 3,
      },
      create: {
        organizationId,
        productId: item.productId,
        warehouseId: item.warehouseId,
        physical: item.physical,
        reserved: item.reserved,
        version: 3,
      },
    });
  }

  const movements = [
    {
      key: "receipt-monitor",
      productId: inventory.products.monitor,
      warehouseId: inventory.warehouses.main,
      type: "RECEIPT" as const,
      quantity: 10,
      previous: 0,
      resulting: 10,
      reason: "Recepción REC-0001",
      referenceType: "GoodsReceipt",
      referenceId: seedId("receipt:one"),
      actorId: context.users.josue,
      age: 88,
    },
    {
      key: "receipt-mouse",
      productId: inventory.products.mouse,
      warehouseId: inventory.warehouses.main,
      type: "RECEIPT" as const,
      quantity: 20,
      previous: 0,
      resulting: 20,
      reason: "Recepción REC-0001",
      referenceType: "GoodsReceipt",
      referenceId: seedId("receipt:one"),
      actorId: context.users.josue,
      age: 88,
    },
    {
      key: "supplier-return-mouse",
      productId: inventory.products.mouse,
      warehouseId: inventory.warehouses.main,
      type: "SUPPLIER_RETURN" as const,
      quantity: -1,
      previous: 20,
      resulting: 19,
      reason: "Unidad con empaque dañado",
      referenceType: "SupplierReturn",
      referenceId: seedId("supplier-return:one"),
      actorId: context.users.josue,
      age: 84,
    },
    {
      key: "shipment-monitor",
      productId: inventory.products.monitor,
      warehouseId: inventory.warehouses.main,
      type: "SHIPMENT" as const,
      quantity: -2,
      previous: 10,
      resulting: 8,
      reason: "Despacho DES-0001",
      referenceType: "Shipment",
      referenceId: seedId("shipment:one"),
      actorId: context.users.josue,
      age: 46,
    },
    {
      key: "shipment-mouse",
      productId: inventory.products.mouse,
      warehouseId: inventory.warehouses.main,
      type: "SHIPMENT" as const,
      quantity: -2,
      previous: 19,
      resulting: 17,
      reason: "Despacho DES-0001",
      referenceType: "Shipment",
      referenceId: seedId("shipment:one"),
      actorId: context.users.josue,
      age: 46,
    },
    {
      key: "customer-return-mouse",
      productId: inventory.products.mouse,
      warehouseId: inventory.warehouses.main,
      type: "RETURN" as const,
      quantity: 1,
      previous: 17,
      resulting: 18,
      reason: "Devolución vendible DEV-0001",
      referenceType: "Return",
      referenceId: seedId("return:one"),
      actorId: context.users.josue,
      age: 40,
    },
    {
      key: "receipt-laptop",
      productId: inventory.products.laptop,
      warehouseId: inventory.warehouses.main,
      type: "RECEIPT" as const,
      quantity: 3,
      previous: 0,
      resulting: 3,
      reason: "Recepción parcial REC-0002",
      referenceType: "GoodsReceipt",
      referenceId: seedId("receipt:two"),
      actorId: context.users.josue,
      age: 20,
    },
    {
      key: "reservation-laptop",
      productId: inventory.products.laptop,
      warehouseId: inventory.warehouses.main,
      type: "RESERVATION" as const,
      quantity: 1,
      previous: 0,
      resulting: 1,
      reason: "Reserva PED-0002",
      referenceType: "Order",
      referenceId: commerce.orders.preparing,
      actorId: context.users.juan,
      age: 5,
    },
    {
      key: "adjustment-keyboard",
      productId: inventory.products.keyboard,
      warehouseId: inventory.warehouses.main,
      type: "ADJUSTMENT" as const,
      quantity: 15,
      previous: 0,
      resulting: 15,
      reason: "Conteo inicial de almacén",
      referenceType: "Adjustment",
      referenceId: seedId("adjustment:keyboard"),
      actorId: context.users.josue,
      age: 70,
    },
    {
      key: "transfer-keyboard-out",
      productId: inventory.products.keyboard,
      warehouseId: inventory.warehouses.main,
      type: "TRANSFER_OUT" as const,
      quantity: -3,
      previous: 15,
      resulting: 12,
      reason: "Abastecimiento de almacén auxiliar",
      referenceType: "Transfer",
      referenceId: seedId("transfer:keyboard"),
      actorId: context.users.josue,
      age: 12,
    },
    {
      key: "transfer-keyboard-in",
      productId: inventory.products.keyboard,
      warehouseId: inventory.warehouses.secondary,
      type: "TRANSFER_IN" as const,
      quantity: 3,
      previous: 0,
      resulting: 3,
      reason: "Abastecimiento de almacén auxiliar",
      referenceType: "Transfer",
      referenceId: seedId("transfer:keyboard"),
      actorId: context.users.josue,
      age: 12,
    },
  ];
  for (const item of movements) {
    const id = seedId(`stock-movement:${item.key}`);
    await db.stockMovement.upsert({
      where: { id },
      update: {
        quantity: item.quantity,
        previous: item.previous,
        resulting: item.resulting,
        reason: item.reason,
        referenceType: item.referenceType,
        referenceId: item.referenceId,
        actorId: item.actorId,
        createdAt: daysAgo(item.age),
      },
      create: {
        id,
        organizationId,
        productId: item.productId,
        warehouseId: item.warehouseId,
        type: item.type,
        quantity: item.quantity,
        previous: item.previous,
        resulting: item.resulting,
        reason: item.reason,
        referenceType: item.referenceType,
        referenceId: item.referenceId,
        actorId: item.actorId,
        correlationId: seedId(`stock-correlation:${item.key}`),
        createdAt: daysAgo(item.age),
      },
    });
  }
}

