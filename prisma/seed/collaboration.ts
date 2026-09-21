import { daysAgo, daysFromNow, seedId } from "./helpers";
import type {
  CommerceContext,
  CrmContext,
  FinanceContext,
  InventoryContext,
  SeedContext,
  SeedDatabase,
} from "./types";

export async function seedCollaboration(
  db: SeedDatabase,
  context: SeedContext,
  crm: CrmContext,
  inventory: InventoryContext,
  commerce: CommerceContext,
  finance: FinanceContext,
): Promise<void> {
  const organizationId = context.organizationId;
  const tasks = [
    {
      key: "delivery",
      title: "Confirmar entrega de pedido PED-0001",
      description: "Validar conformidad del cliente y archivar la guía de entrega.",
      assigneeId: context.users.josue,
      createdById: context.users.juan,
      status: "DONE" as const,
      priority: "HIGH",
      dueAt: daysAgo(43),
      resourceType: "Order",
      resourceId: commerce.orders.completed,
      age: 48,
    },
    {
      key: "proposal",
      title: "Ajustar propuesta para Constructora Valle Sur",
      description: "Incluir cronograma de soporte y condiciones de instalación.",
      assigneeId: context.users.erick,
      createdById: context.users.luis,
      status: "IN_PROGRESS" as const,
      priority: "HIGH",
      dueAt: daysFromNow(4),
      resourceType: "Opportunity",
      resourceId: crm.opportunities.negotiation,
      age: 8,
    },
    {
      key: "quote-followup",
      title: "Dar seguimiento a cotización COT-0003",
      description: "Contactar al cliente después de que revisó la propuesta.",
      assigneeId: context.users.juan,
      createdById: context.users.erick,
      status: "OPEN" as const,
      priority: "MEDIUM",
      dueAt: daysFromNow(2),
      resourceType: "Quote",
      resourceId: commerce.quotes.viewed,
      age: 3,
    },
    {
      key: "payable",
      title: "Programar pago parcial a proveedor",
      description: "Coordinar el pago de la recepción parcial de laptops.",
      assigneeId: context.users.erick,
      createdById: context.users.luis,
      status: "OPEN" as const,
      priority: "URGENT",
      dueAt: daysFromNow(6),
      resourceType: "Obligation",
      resourceId: finance.obligations.partialPurchase,
      age: 2,
    },
  ];
  for (const item of tasks) {
    const id = seedId(`task:${item.key}`);
    await db.task.upsert({
      where: { organizationId_id: { organizationId, id } },
      update: {
        title: item.title,
        description: item.description,
        assigneeId: item.assigneeId,
        createdById: item.createdById,
        status: item.status,
        priority: item.priority,
        dueAt: item.dueAt,
        resourceType: item.resourceType,
        resourceId: item.resourceId,
      },
      create: {
        id,
        organizationId,
        title: item.title,
        description: item.description,
        assigneeId: item.assigneeId,
        createdById: item.createdById,
        status: item.status,
        priority: item.priority,
        dueAt: item.dueAt,
        resourceType: item.resourceType,
        resourceId: item.resourceId,
        createdAt: daysAgo(item.age),
      },
    });
    await db.taskEvent.upsert({
      where: { id: seedId(`task-event:${item.key}:created`) },
      update: {},
      create: {
        id: seedId(`task-event:${item.key}:created`),
        organizationId,
        taskId: id,
        actorId: item.createdById,
        action: "CREATED",
        changes: { priority: item.priority, assigneeId: item.assigneeId },
        createdAt: daysAgo(item.age),
      },
    });
  }

  const completedTaskId = seedId("task:delivery");
  await db.taskComment.upsert({
    where: { id: seedId("task-comment:delivery") },
    update: {
      body: "Entrega confirmada por la señora María Torres. Sin observaciones.",
    },
    create: {
      id: seedId("task-comment:delivery"),
      organizationId,
      taskId: completedTaskId,
      authorId: context.users.josue,
      body: "Entrega confirmada por la señora María Torres. Sin observaciones.",
      createdAt: daysAgo(42),
    },
  });
  await db.taskEvent.upsert({
    where: { id: seedId("task-event:delivery:done") },
    update: {},
    create: {
      id: seedId("task-event:delivery:done"),
      organizationId,
      taskId: completedTaskId,
      actorId: context.users.josue,
      action: "UPDATED",
      changes: { status: "DONE" },
      createdAt: daysAgo(42),
    },
  });

  const automations = [
    {
      key: "stock-low",
      name: "Avisar cuando el stock esté bajo",
      trigger: "stock.low",
      conditions: [{ field: "available", operator: "less_than", value: 3 }],
      actions: [
        {
          type: "notification.send",
          title: "Stock bajo detectado",
          body: "Revisa el producto y prepara una reposición.",
        },
        {
          type: "task.create",
          title: "Reponer producto con stock bajo",
          body: "Tarea creada automáticamente por control de inventario.",
        },
      ],
      active: true,
      age: 60,
    },
    {
      key: "quote-followup",
      name: "Seguimiento de cotizaciones por vencer",
      trigger: "quote.expiring",
      conditions: [],
      actions: [
        {
          type: "task.create",
          title: "Contactar cliente antes del vencimiento",
          body: "Revisar la cotización y registrar el resultado del contacto.",
        },
      ],
      active: true,
      age: 35,
    },
  ];
  for (const item of automations) {
    const id = seedId(`automation:${item.key}`);
    const snapshot = {
      name: item.name,
      trigger: item.trigger,
      conditions: item.conditions,
      actions: item.actions,
      active: item.active,
      maxDepth: 3,
    };
    await db.automation.upsert({
      where: { organizationId_id: { organizationId, id } },
      update: {
        name: item.name,
        trigger: item.trigger,
        conditions: item.conditions,
        actions: item.actions,
        version: 1,
        active: item.active,
        maxDepth: 3,
      },
      create: {
        id,
        organizationId,
        name: item.name,
        trigger: item.trigger,
        conditions: item.conditions,
        actions: item.actions,
        version: 1,
        active: item.active,
        maxDepth: 3,
        createdAt: daysAgo(item.age),
      },
    });
    await db.automationVersion.upsert({
      where: {
        organizationId_automationId_version: {
          organizationId,
          automationId: id,
          version: 1,
        },
      },
      update: { snapshot },
      create: {
        id: seedId(`automation-version:${item.key}:1`),
        organizationId,
        automationId: id,
        version: 1,
        snapshot,
        createdBy: context.users.luis,
        createdAt: daysAgo(item.age),
      },
    });
  }
  await db.automationRun.upsert({
    where: {
      organizationId_automationId_eventId: {
        organizationId,
        automationId: seedId("automation:stock-low"),
        eventId: seedId("automation-event:laptop-low"),
      },
    },
    update: {
      status: "SUCCEEDED",
      result: { actionsExecuted: 2 },
      completedAt: daysAgo(4),
    },
    create: {
      id: seedId("automation-run:laptop-low"),
      organizationId,
      automationId: seedId("automation:stock-low"),
      eventId: seedId("automation-event:laptop-low"),
      status: "SUCCEEDED",
      depth: 0,
      result: { actionsExecuted: 2 },
      createdAt: daysAgo(4),
      completedAt: daysAgo(4),
    },
  });

  const notifications = [
    {
      key: "quote-viewed",
      userId: context.users.juan,
      type: "QUOTE_VIEWED",
      title: "Cotización COT-0003 visualizada",
      body: "Panadería Sol de Mala revisó la cotización.",
      resourceType: "Quote",
      resourceId: commerce.quotes.viewed,
      readAt: null,
      age: 2,
    },
    {
      key: "stock-low",
      userId: context.users.josue,
      type: "STOCK_LOW",
      title: "Stock bajo de laptops",
      body: "Solo quedan 2 unidades disponibles en el almacén principal.",
      resourceType: "Product",
      resourceId: inventory.products.laptop,
      readAt: null,
      age: 4,
    },
    {
      key: "payment-received",
      userId: context.users.erick,
      type: "PAYMENT_CONFIRMED",
      title: "Adelanto recibido",
      body: "Se registró un adelanto de S/ 1,500.00 para PED-0002.",
      resourceType: "Order",
      resourceId: commerce.orders.preparing,
      readAt: daysAgo(4),
      age: 5,
    },
  ];
  for (const item of notifications) {
    const id = seedId(`notification:${item.key}`);
    await db.notification.upsert({
      where: { id },
      update: {
        userId: item.userId,
        type: item.type,
        title: item.title,
        body: item.body,
        resourceType: item.resourceType,
        resourceId: item.resourceId,
        readAt: item.readAt,
      },
      create: {
        id,
        organizationId,
        userId: item.userId,
        type: item.type,
        title: item.title,
        body: item.body,
        resourceType: item.resourceType,
        resourceId: item.resourceId,
        readAt: item.readAt,
        createdAt: daysAgo(item.age),
      },
    });
  }
  for (const userId of Object.values(context.users)) {
    for (const channel of ["IN_APP", "EMAIL"] as const) {
      await db.notificationPreference.upsert({
        where: {
          organizationId_userId_type_channel: {
            organizationId,
            userId,
            type: "STOCK_LOW",
            channel,
          },
        },
        update: { enabled: true },
        create: {
          id: seedId(`notification-preference:${userId}:${channel}`),
          organizationId,
          userId,
          type: "STOCK_LOW",
          channel,
          enabled: true,
        },
      });
    }
  }

  const conversationId = seedId("ai-conversation:operations-summary");
  await db.aIConversation.upsert({
    where: { id: conversationId },
    update: { title: "Resumen de la operación" },
    create: {
      id: conversationId,
      organizationId,
      userId: context.users.luis,
      title: "Resumen de la operación",
      createdAt: daysAgo(7),
    },
  });
  const messages = [
    {
      key: "user",
      role: "user",
      content: "Resume las ventas y el inventario reciente.",
      age: 7,
    },
    {
      key: "assistant",
      role: "assistant",
      content:
        "Hay un pedido completado, otro en preparación y una alerta de stock bajo para laptops. La cotización COT-0003 fue visualizada y requiere seguimiento.",
      age: 7,
    },
  ];
  for (const item of messages) {
    const id = seedId(`ai-message:${item.key}`);
    await db.aIMessage.upsert({
      where: { id },
      update: { role: item.role, content: item.content },
      create: {
        id,
        conversationId,
        role: item.role,
        content: item.content,
        references: {
          orders: [commerce.orders.completed, commerce.orders.preparing],
          product: inventory.products.laptop,
        },
        createdAt: daysAgo(item.age),
      },
    });
  }
  await db.aIToolRun.upsert({
    where: { id: seedId("ai-tool-run:context") },
    update: { status: "SUCCEEDED" },
    create: {
      id: seedId("ai-tool-run:context"),
      conversationId,
      tool: "business.read_context",
      arguments: { sections: ["sales", "inventory"] },
      result: { orders: 2, lowStockProducts: 1 },
      status: "SUCCEEDED",
      confirmedAt: daysAgo(7),
      createdAt: daysAgo(7),
    },
  });

  const outboxId = seedId("outbox:quote-email-delivered");
  await db.outboxEvent.upsert({
    where: { id: outboxId },
    update: {
      processedAt: daysAgo(3),
      attempts: 1,
      failedAt: null,
      lastError: null,
    },
    create: {
      id: outboxId,
      deduplicationKey: "demo-email-quote-cot-0003",
      organizationId,
      topic: "email.quote",
      aggregateType: "Quote",
      aggregateId: commerce.quotes.viewed,
      payload: {
        email: "panaderiasoldemala@gmail.com",
        quoteNumber: "COT-0003",
      },
      correlationId: seedId("correlation:quote-email"),
      availableAt: daysAgo(4),
      processedAt: daysAgo(3),
      attempts: 1,
    },
  });
  await db.emailDelivery.upsert({
    where: { outboxEventId: outboxId },
    update: {
      recipient: "panaderiasoldemala@gmail.com",
      subject: "Cotización COT-0003",
      status: "DELIVERED",
      lastEvent: "delivered",
      acceptedAt: daysAgo(4),
      deliveredAt: daysAgo(3),
    },
    create: {
      id: seedId("email-delivery:quote-cot-0003"),
      organizationId,
      outboxEventId: outboxId,
      recipient: "panaderiasoldemala@gmail.com",
      subject: "Cotización COT-0003",
      providerMessageId: "demo-brevo-message-cot-0003",
      status: "DELIVERED",
      lastEvent: "delivered",
      providerPayload: { source: "demo-seed" },
      acceptedAt: daysAgo(4),
      deliveredAt: daysAgo(3),
      createdAt: daysAgo(4),
    },
  });

  await db.job.upsert({
    where: { id: seedId("job:report-export") },
    update: { status: "SUCCEEDED", attempts: 1, lastError: null },
    create: {
      id: seedId("job:report-export"),
      organizationId,
      type: "report.export",
      payload: { report: "sales", format: "xlsx", demo: true },
      status: "SUCCEEDED",
      runAt: daysAgo(11),
      attempts: 1,
      correlationId: seedId("correlation:report-export"),
      createdAt: daysAgo(11),
    },
  });

  await db.idempotencyKey.upsert({
    where: {
      organizationId_actorId_operation_key: {
        organizationId,
        actorId: context.users.erick,
        operation: "payment.apply",
        key: "demo-payment-sale-preparing",
      },
    },
    update: { statusCode: 200 },
    create: {
      id: seedId("idempotency:payment-sale-preparing"),
      organizationId,
      actorId: context.users.erick,
      operation: "payment.apply",
      key: "demo-payment-sale-preparing",
      requestHash: seedId("request-hash:payment-sale-preparing"),
      response: { obligationId: finance.obligations.preparingSale },
      statusCode: 200,
      expiresAt: daysFromNow(30),
      createdAt: daysAgo(5),
    },
  });
}

