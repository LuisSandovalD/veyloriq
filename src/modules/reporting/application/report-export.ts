import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { getDb } from "@/shared/database";
import { dateInTimeZone } from "@/shared/time-zone";

export type ReportName =
  | "sales"
  | "quotes"
  | "inventory"
  | "purchases"
  | "cashflow"
  | "collections"
  | "expenses"
  | "receivables"
  | "payables"
  | "customers"
  | "opportunities"
  | "products"
  | "valuation"
  | "subscriptions"
  | "usage";
export type ReportFormat = "json" | "csv" | "xlsx" | "pdf";
type Row = Record<string, unknown>;

export async function loadReport(
  organizationId: string,
  report: ReportName,
  from: Date,
  to: Date,
  take?: number,
): Promise<{ rows: Row[]; definition: string }> {
  const db = getDb();
  switch (report) {
    case "sales": {
      const data = await db.order.findMany({
        where: {
          organizationId,
          createdAt: { gte: from, lte: to },
          status: { not: "CANCELLED" },
        },
        include: {
          customer: { select: { name: true } },
          lines: {
            select: {
              quantity: true,
              returned: true,
              lineTotal: true,
            },
          },
          _count: { select: { returns: true } },
        },
        take,
        orderBy: { createdAt: "desc" },
      });
      return {
        rows: data.map((item) => {
          const returnedValue = item.lines.reduce(
            (sum, line) =>
              sum +
              (Number(line.returned) / Number(line.quantity)) *
              Number(line.lineTotal),
            0,
          );
          return {
            fecha: item.createdAt.toISOString(),
            pedido: item.number,
            cliente: item.customer.name,
            estado: item.status,
            moneda: item.currency,
            total_bruto: item.total.toString(),
            devoluciones: returnedValue.toFixed(4),
            total_neto: (Number(item.total) - returnedValue).toFixed(4),
            cantidad_devoluciones: item._count.returns,
          };
        }),
        definition:
          "Pedidos no cancelados creados en el período; el neto descuenta proporcionalmente las líneas devueltas y conserva la moneda de cada pedido.",
      };
    }
    case "quotes": {
      const data = await db.quote.findMany({
        where: { organizationId, createdAt: { gte: from, lte: to } },
        include: {
          customer: { select: { name: true } },
          _count: { select: { orders: true } },
        },
        take,
        orderBy: { createdAt: "desc" },
      });
      return {
        rows: data.map((item) => ({
          fecha: item.createdAt.toISOString(),
          cotizacion: item.number,
          cliente: item.customer.name,
          estado: item.status,
          moneda: item.currency,
          total: item.total.toString(),
          vigencia: item.validUntil.toISOString(),
          convertida: item._count.orders > 0 ? "SI" : "NO",
          convertida_el: item.convertedAt?.toISOString() ?? "",
        })),
        definition:
          "Cotizaciones creadas en el período, incluyendo todos sus estados.",
      };
    }
    case "inventory": {
      const data = await db.stock.findMany({
        where: { organizationId },
        include: { product: true, warehouse: true },
        take,
        orderBy: { updatedAt: "desc" },
      });
      return {
        rows: data.map((item) => ({
          sku: item.product.sku,
          producto: item.product.name,
          almacen: item.warehouse.name,
          fisico: item.physical.toString(),
          reservado: item.reserved.toString(),
          disponible: Number(item.physical) - Number(item.reserved),
          costo: item.product.cost.toString(),
          valoracion: (
            Number(item.physical) * Number(item.product.cost)
          ).toFixed(4),
        })),
        definition:
          "Existencia física actual menos reservas; valoración por costo vigente de catálogo.",
      };
    }
    case "purchases": {
      const data = await db.purchaseOrder.findMany({
        where: { organizationId, createdAt: { gte: from, lte: to } },
        include: { supplier: { select: { name: true } } },
        take,
        orderBy: { createdAt: "desc" },
      });
      return {
        rows: data.map((item) => ({
          fecha: item.createdAt.toISOString(),
          orden: item.number,
          proveedor: item.supplier.name,
          estado: item.status,
          moneda: item.currency,
          total: item.total.toString(),
        })),
        definition:
          "Órdenes de compra creadas en el período; una orden no implica pago ni recepción.",
      };
    }
    case "cashflow": {
      const data = await db.cashMovement.findMany({
        where: { organizationId, createdAt: { gte: from, lte: to } },
        include: { account: { select: { name: true, currency: true } } },
        take,
        orderBy: { createdAt: "desc" },
      });
      return {
        rows: data.map((item) => ({
          fecha: item.createdAt.toISOString(),
          cuenta: item.account.name,
          tipo: item.type,
          moneda: item.account.currency,
          importe: item.amount.toString(),
          saldo: item.resulting.toString(),
          referencia: `${item.referenceType}:${item.referenceId}`,
        })),
        definition:
          "Movimientos confirmados de caja y banco en el período, por moneda; no constituye contabilidad fiscal.",
      };
    }
    case "collections": {
      const data = await db.payment.findMany({
        where: {
          organizationId,
          direction: "IN",
          status: "CONFIRMED",
          paidAt: { gte: from, lte: to },
        },
        include: { account: { select: { name: true } } },
        take,
        orderBy: { paidAt: "desc" },
      });
      return {
        rows: data.map((item) => ({
          fecha: item.paidAt.toISOString(),
          cuenta: item.account.name,
          moneda: item.currency,
          importe: item.amount.toString(),
          estado: item.status,
        })),
        definition:
          "Cobros confirmados aplicados a cuentas por cobrar durante el periodo; no equivale a ventas devengadas.",
      };
    }
    case "expenses": {
      const data = await db.cashMovement.findMany({
        where: {
          organizationId,
          amount: { lt: 0 },
          createdAt: { gte: from, lte: to },
          type: { notIn: ["TRANSFER_OUT"] },
        },
        include: {
          account: { select: { name: true, currency: true } },
          category: { select: { name: true } },
        },
        take,
        orderBy: { createdAt: "desc" },
      });
      return {
        rows: data.map((item) => ({
          fecha: item.createdAt.toISOString(),
          cuenta: item.account.name,
          categoria: item.category?.name ?? "Sin categoria",
          tipo: item.type,
          moneda: item.account.currency,
          importe: Math.abs(Number(item.amount)).toFixed(4),
          referencia: `${item.referenceType}:${item.referenceId}`,
        })),
        definition:
          "Salidas de dinero no correspondientes a transferencias internas durante el periodo; incluye pagos y egresos manuales.",
      };
    }
    case "receivables":
    case "payables": {
      const kind = report === "receivables" ? "RECEIVABLE" : "PAYABLE";
      const data = await db.obligation.findMany({
        where: {
          organizationId,
          kind,
          status: { in: ["OPEN", "PARTIALLY_PAID", "OVERDUE"] },
        },
        take,
        orderBy: { dueAt: "asc" },
      });
      return {
        rows: data.map((item) => ({
          vence: item.dueAt.toISOString(),
          contraparte: item.counterparty,
          estado: item.status,
          moneda: item.currency,
          importe: item.amount.toString(),
          pagado: item.paidAmount.toString(),
          pendiente: (Number(item.amount) - Number(item.paidAmount)).toFixed(4),
        })),
        definition: `Obligaciones ${kind === "RECEIVABLE" ? "por cobrar" : "por pagar"} abiertas, parciales o vencidas al ejecutar el reporte.`,
      };
    }
    case "customers": {
      const data = await db.customer.findMany({
        where: { organizationId, createdAt: { gte: from, lte: to } },
        include: {
          _count: {
            select: {
              contacts: true,
              opportunities: true,
              quotes: true,
              orders: true,
            },
          },
        },
        take,
        orderBy: { createdAt: "desc" },
      });
      return {
        rows: data.map((item) => ({
          alta: item.createdAt.toISOString(),
          cliente: item.name,
          identificacion_fiscal: item.taxId ?? "",
          correo: item.email ?? "",
          telefono: item.phone ?? "",
          contactos: item._count.contacts,
          oportunidades: item._count.opportunities,
          cotizaciones: item._count.quotes,
          pedidos: item._count.orders,
          estado: item.archivedAt ? "ARCHIVADO" : "ACTIVO",
        })),
        definition:
          "Clientes creados en el periodo con conteos de relaciones comerciales actuales.",
      };
    }
    case "opportunities": {
      const data = await db.opportunity.findMany({
        where: { organizationId, createdAt: { gte: from, lte: to } },
        include: { customer: { select: { name: true } } },
        take,
        orderBy: { createdAt: "desc" },
      });
      return {
        rows: data.map((item) => ({
          alta: item.createdAt.toISOString(),
          oportunidad: item.title,
          cliente: item.customer?.name ?? "",
          etapa: item.stage,
          moneda: item.currency,
          valor: item.value.toString(),
          probabilidad: item.probability,
          cierre_esperado: item.expectedClose?.toISOString() ?? "",
        })),
        definition:
          "Oportunidades creadas en el periodo; el valor ponderado se obtiene aplicando la probabilidad registrada.",
      };
    }
    case "products": {
      const data = await db.product.findMany({
        where: { organizationId, createdAt: { gte: from, lte: to } },
        include: { category: { select: { name: true } } },
        take,
        orderBy: { createdAt: "desc" },
      });
      return {
        rows: data.map((item) => ({
          alta: item.createdAt.toISOString(),
          sku: item.sku,
          producto: item.name,
          categoria: item.category?.name ?? "",
          tipo: item.kind,
          unidad: item.unit,
          precio: item.price.toString(),
          costo: item.cost.toString(),
          impuesto: item.taxRate.toString(),
          stock_minimo: item.minimumStock.toString(),
          estado: item.active ? "ACTIVO" : "INACTIVO",
        })),
        definition: "Productos y servicios dados de alta durante el periodo.",
      };
    }
    case "valuation": {
      const data = await db.stock.findMany({
        where: { organizationId },
        include: { product: true, warehouse: true },
        take,
        orderBy: [{ warehouse: { name: "asc" } }, { product: { name: "asc" } }],
      });
      return {
        rows: data.map((item) => ({
          sku: item.product.sku,
          producto: item.product.name,
          almacen: item.warehouse.name,
          existencia_fisica: item.physical.toString(),
          costo_unitario: item.product.cost.toString(),
          valor: (Number(item.physical) * Number(item.product.cost)).toFixed(4),
        })),
        definition:
          "Valoracion del inventario fisico actual por el costo vigente del producto; las fechas solo identifican el corte solicitado.",
      };
    }
    case "subscriptions": {
      const [subscription, events] = await Promise.all([
        db.subscription.findUnique({
          where: { organizationId },
          include: { plan: { select: { code: true, name: true } } },
        }),
        db.billingEvent.findMany({
          where: { organizationId, occurredAt: { gte: from, lte: to } },
          take,
          orderBy: { occurredAt: "desc" },
        }),
      ]);
      const currentSubscriptionRow = subscription
        ? [
          {
            fecha: "",
            plan_actual: subscription.plan.name,
            codigo_plan: subscription.plan.code,
            estado_suscripcion: subscription.status,
            evento: "ESTADO_ACTUAL",
            estado_evento: subscription.status,
            importe: "",
            fin_periodo_actual:
              subscription.currentPeriodEnd?.toISOString() ?? "",
          },
        ]
        : [];
      return {
        rows: events.length
          ? events.map((item) => ({
            fecha: item.occurredAt.toISOString(),
            plan_actual: subscription?.plan.name ?? "Sin plan",
            codigo_plan: subscription?.plan.code ?? "",
            estado_suscripcion:
              subscription?.status ?? "SIN_SUSCRIPCION",
            evento: item.type,
            estado_evento: item.status,
            moneda: item.currency ?? "",
            importe: item.amount?.toString() ?? "",
            fin_periodo_actual:
              subscription?.currentPeriodEnd?.toISOString() ?? "",
          }))
          : currentSubscriptionRow,
        definition:
          "Eventos de facturacion SaaS de la organizacion en el periodo, junto con el estado actual de su suscripcion.",
      };
    }
    case "usage": {
      const data = await db.usageCounter.findMany({
        where: { organizationId },
        take,
        orderBy: { updatedAt: "desc" },
      });
      return {
        rows: data.map((item) => ({
          metrica: item.metric,
          periodo: item.period,
          consumo: item.value.toString(),
          reservado: item.reserved.toString(),
          actualizado: item.updatedAt.toISOString(),
        })),
        definition:
          "Contadores de recursos y consumo acumulado, incluyendo reservas en curso.",
      };
    }
  }
}

function safeCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

export async function encodeReport(
  rows: Row[],
  format: Exclude<ReportFormat, "json">,
  title: string,
  definition: string,
  from: Date,
  to: Date,
  timeZone = "UTC",
): Promise<{ bytes: Buffer; mimeType: string; extension: string }> {
  const headers = Object.keys(rows[0] ?? {});
  if (format === "csv") {
    const cell = (value: unknown) => `"${safeCell(value).replace(/"/g, '""')}"`;
    const content = `\uFEFF${headers.map(cell).join(",")}\r\n${rows.map((row) => headers.map((key) => cell(row[key])).join(",")).join("\r\n")}`;
    return {
      bytes: Buffer.from(content, "utf8"),
      mimeType: "text/csv",
      extension: "csv",
    };
  }
  if (format === "xlsx") {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "VEYLORIQ";
    const sheet = workbook.addWorksheet("Reporte", {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    sheet.columns = headers.map((key) => ({
      header: key.toUpperCase(),
      key,
      width: Math.min(40, Math.max(14, key.length + 4)),
    }));
    rows.forEach((row) =>
      sheet.addRow(
        Object.fromEntries(headers.map((key) => [key, safeCell(row[key])])),
      ),
    );
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0E7C66" },
    };
    return {
      bytes: Buffer.from(await workbook.xlsx.writeBuffer()),
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      extension: "xlsx",
    };
  }
  const bytes = await new Promise<Buffer>((resolve, reject) => {
    const document = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 36,
      bufferPages: true,
      info: { Title: `VEYLORIQ - ${title}`, Author: "VEYLORIQ" },
    });
    const chunks: Buffer[] = [];
    document.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    document.on("error", reject);
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.fontSize(20).fillColor("#0e7c66").text(`VEYLORIQ · ${title}`);
    document
      .fontSize(9)
      .fillColor("#60706d")
      .text(
        `${dateInTimeZone(from, timeZone)} — ${dateInTimeZone(to, timeZone)} · ${timeZone} · ${definition}`,
      );
    const shown = headers.slice(0, 8);
    const width = (document.page.width - 72) / Math.max(shown.length, 1);
    let y = document.y + 12;
    const drawHeader = () => {
      document.rect(36, y, document.page.width - 72, 22).fill("#0e7c66");
      shown.forEach((key, index) =>
        document
          .fillColor("white")
          .fontSize(7)
          .text(key.toUpperCase(), 40 + index * width, y + 7, {
            width: width - 8,
            ellipsis: true,
          }),
      );
      y += 22;
    };
    drawHeader();
    rows.forEach((row) => {
      if (y > document.page.height - 48) {
        document.addPage();
        y = 36;
        drawHeader();
      }
      shown.forEach((key, index) =>
        document
          .fillColor("#12211f")
          .fontSize(7)
          .text(String(row[key] ?? ""), 40 + index * width, y + 6, {
            width: width - 8,
            height: 18,
            ellipsis: true,
          }),
      );
      y += 24;
    });
    document.end();
  });
  return { bytes, mimeType: "application/pdf", extension: "pdf" };
}
