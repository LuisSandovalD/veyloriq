import type { Column, Field, View } from "./workspace-types";

export const metadata: Record<
  View,
  {
    title: string;
    description: string;
    columns?: Column[];
    fields?: Field[];
  }
> = {
  dashboard: {
    title: "Resumen",
    description: "Pulso operativo de tu organización.",
  },
  customers: {
    title: "Clientes",
    description: "Cuentas, contactos e historial comercial.",
    columns: [
      { key: "name", label: "Cliente" },
      { key: "taxId", label: "Documento" },
      { key: "email", label: "Correo" },
      { key: "createdAt", label: "Alta" },
    ],
    fields: [
      { key: "name", label: "Nombre" },
      { key: "taxId", label: "RUC / documento" },
      { key: "email", label: "Correo", type: "email" },
      { key: "phone", label: "Teléfono" },
    ],
  },
  leads: {
    title: "Leads",
    description: "Prospectos y seguimiento del pipeline.",
    columns: [
      { key: "name", label: "Lead" },
      { key: "company", label: "Empresa" },
      { key: "status", label: "Estado" },
      { key: "source", label: "Origen" },
    ],
    fields: [
      { key: "name", label: "Nombre" },
      { key: "company", label: "Empresa" },
      { key: "email", label: "Correo", type: "email" },
      { key: "phone", label: "Teléfono" },
      { key: "source", label: "Origen" },
    ],
  },
  products: {
    title: "Productos",
    description: "Catálogo de productos y servicios.",
    columns: [
      { key: "sku", label: "SKU" },
      { key: "name", label: "Producto" },
      { key: "kind", label: "Tipo" },
      { key: "price", label: "Precio" },
      { key: "minimumStock", label: "Mínimo" },
    ],
    fields: [
      { key: "sku", label: "SKU" },
      { key: "barcode", label: "Código de barras" },
      { key: "name", label: "Nombre" },
      { key: "description", label: "Descripción" },
      { key: "unit", label: "Unidad de medida" },
      {
        key: "kind",
        label: "Tipo",
        type: "select",
        options: [
          { value: "PRODUCT", label: "Producto" },
          { value: "SERVICE", label: "Servicio" },
        ],
      },
      { key: "price", label: "Precio", type: "number" },
      { key: "cost", label: "Costo", type: "number" },
      { key: "taxRate", label: "Impuesto %", type: "number" },
      { key: "minimumStock", label: "Stock mínimo", type: "number" },
    ],
  },
  suppliers: {
    title: "Proveedores",
    description: "Información comercial y órdenes de compra.",
    columns: [
      { key: "name", label: "Proveedor" },
      { key: "taxId", label: "Documento" },
      { key: "email", label: "Correo" },
      { key: "phone", label: "Teléfono" },
    ],
    fields: [
      { key: "name", label: "Nombre" },
      { key: "taxId", label: "RUC / documento" },
      { key: "email", label: "Correo", type: "email" },
      { key: "phone", label: "Teléfono" },
    ],
  },
  warehouses: {
    title: "Almacenes",
    description: "Ubicaciones y disponibilidad.",
    columns: [
      { key: "code", label: "Código" },
      { key: "name", label: "Almacén" },
      { key: "address", label: "Dirección" },
      { key: "active", label: "Estado" },
    ],
    fields: [
      { key: "code", label: "Código" },
      { key: "name", label: "Nombre" },
      { key: "address", label: "Dirección" },
    ],
  },
  stock: {
    title: "Inventario",
    description: "Físico, reservado, disponible y kardex.",
    columns: [
      { key: "product", label: "Producto" },
      { key: "warehouse", label: "Almacén" },
      { key: "physical", label: "Físico" },
      { key: "reserved", label: "Reservado" },
      { key: "available", label: "Disponible" },
    ],
  },
  quotes: {
    title: "Cotizaciones",
    description: "Propuestas versionadas y conversión a pedido.",
    columns: [
      { key: "number", label: "Número" },
      { key: "customer", label: "Cliente" },
      { key: "status", label: "Estado" },
      { key: "validUntil", label: "Vigencia" },
      { key: "total", label: "Total" },
    ],
    fields: [
      { key: "customerId", label: "Cliente", type: "select" },
      { key: "contactId", label: "Contacto (opcional)", type: "select" },
      { key: "productId", label: "Producto", type: "select" },
      { key: "quantity", label: "Cantidad", type: "number" },
      { key: "discountRate", label: "Descuento %", type: "number" },
      { key: "validUntil", label: "Válida hasta", type: "date" },
      { key: "terms", label: "Condiciones" },
    ],
  },
  purchases: {
    title: "Compras",
    description: "Orden, recepción y cuenta por pagar.",
    columns: [
      { key: "number", label: "Número" },
      { key: "supplier", label: "Proveedor" },
      { key: "status", label: "Estado" },
      { key: "total", label: "Total" },
      { key: "expectedAt", label: "Entrega" },
    ],
    fields: [
      { key: "supplierId", label: "Proveedor", type: "select" },
      { key: "productId", label: "Producto", type: "select" },
      { key: "quantity", label: "Cantidad", type: "number" },
      { key: "unitCost", label: "Costo unitario", type: "number" },
      { key: "expectedAt", label: "Entrega esperada", type: "date" },
    ],
  },
  orders: {
    title: "Ventas y despachos",
    description: "Reservas, preparación y entrega.",
    columns: [
      { key: "number", label: "Pedido" },
      { key: "customer", label: "Cliente" },
      { key: "status", label: "Estado" },
      { key: "total", label: "Total" },
      { key: "createdAt", label: "Creado" },
    ],
    fields: [
      { key: "customerId", label: "Cliente", type: "select" },
      { key: "warehouseId", label: "Almacén", type: "select" },
      { key: "productId", label: "Producto", type: "select" },
      { key: "quantity", label: "Cantidad", type: "number" },
      { key: "unitPrice", label: "Precio (opcional)", type: "number" },
    ],
  },
  accounts: {
    title: "Caja y bancos",
    description: "Saldos y movimientos trazables.",
    columns: [
      { key: "name", label: "Cuenta" },
      { key: "type", label: "Tipo" },
      { key: "currency", label: "Moneda" },
      { key: "balance", label: "Saldo" },
    ],
    fields: [
      { key: "name", label: "Nombre" },
      {
        key: "type",
        label: "Tipo",
        type: "select",
        options: [
          { value: "CASH", label: "Caja" },
          { value: "BANK", label: "Banco" },
        ],
      },
      {
        key: "currency",
        label: "Moneda",
        type: "select",
        options: [
          { value: "PEN", label: "PEN" },
          { value: "USD", label: "USD" },
          { value: "EUR", label: "EUR" },
        ],
      },
      { key: "openingBalance", label: "Saldo inicial", type: "number" },
    ],
  },
  obligations: {
    title: "Obligaciones",
    description: "Cuentas por cobrar y pagar.",
    columns: [
      { key: "kind", label: "Tipo" },
      { key: "counterparty", label: "Contraparte" },
      { key: "amount", label: "Importe" },
      { key: "paidAmount", label: "Pagado" },
      { key: "status", label: "Estado" },
      { key: "dueAt", label: "Vence" },
    ],
  },
  tasks: {
    title: "Tareas",
    description: "Trabajo pendiente, prioridad y vencimiento.",
    columns: [
      { key: "title", label: "Tarea" },
      { key: "priority", label: "Prioridad" },
      { key: "status", label: "Estado" },
      { key: "dueAt", label: "Vence" },
    ],
    fields: [
      { key: "title", label: "Título" },
      { key: "description", label: "Descripción" },
      {
        key: "priority",
        label: "Prioridad",
        type: "select",
        options: [
          { value: "LOW", label: "Baja" },
          { value: "MEDIUM", label: "Media" },
          { value: "HIGH", label: "Alta" },
          { value: "URGENT", label: "Urgente" },
        ],
      },
      { key: "dueAt", label: "Vencimiento", type: "date" },
    ],
  },
  automations: {
    title: "Automatizaciones",
    description: "Disparadores, acciones y ejecuciones.",
    columns: [
      { key: "name", label: "Regla" },
      { key: "trigger", label: "Disparador" },
      { key: "active", label: "Estado" },
      { key: "version", label: "Versión" },
    ],
    fields: [
      { key: "name", label: "Nombre" },
      {
        key: "trigger",
        label: "Disparador",
        type: "select",
        options: [
          { value: "lead.created", label: "Lead creado" },
          { value: "quote.sent", label: "Cotización enviada" },
          { value: "quote.accepted", label: "Cotización aceptada" },
          { value: "quote.expiring", label: "Cotización próxima a vencer" },
          { value: "order.confirmed", label: "Pedido confirmado" },
          { value: "stock.low", label: "Stock bajo" },
          { value: "obligation.overdue", label: "Obligación vencida" },
        ],
      },
      {
        key: "action",
        label: "Acción",
        type: "select",
        options: [
          { value: "task.create", label: "Crear tarea" },
          { value: "notification.send", label: "Enviar notificación" },
          { value: "email.send", label: "Enviar correo" },
          { value: "field.update", label: "Actualizar campo" },
        ],
      },
      { key: "conditionField", label: "Campo de condición (opcional)" },
      {
        key: "conditionOperator",
        label: "Operador",
        type: "select",
        options: [
          { value: "equals", label: "Igual a" },
          { value: "not_equals", label: "Distinto de" },
          { value: "contains", label: "Contiene" },
          { value: "greater_than", label: "Mayor que" },
          { value: "less_than", label: "Menor que" },
        ],
      },
      { key: "conditionValue", label: "Valor de condición" },
      { key: "actionTitle", label: "Título o asunto de la acción" },
      { key: "actionBody", label: "Contenido de la acción" },
      { key: "actionEmail", label: "Correo autorizado", type: "email" },
      {
        key: "targetResource",
        label: "Recurso a actualizar",
        type: "select",
        options: [
          { value: "task", label: "Tarea" },
          { value: "lead", label: "Lead" },
          { value: "opportunity", label: "Oportunidad" },
        ],
      },
      { key: "targetField", label: "Campo permitido" },
      { key: "targetValue", label: "Nuevo valor" },
      {
        key: "active",
        label: "Activar",
        type: "select",
        options: [
          { value: "true", label: "Sí" },
          { value: "false", label: "No" },
        ],
      },
      {
        key: "maxDepth",
        label: "Profundidad máxima",
        type: "number",
      },
    ],
  },
  audit: {
    title: "Auditoría",
    description: "Quién hizo qué, cuándo y con qué resultado.",
    columns: [
      { key: "createdAt", label: "Fecha" },
      { key: "action", label: "Acción" },
      { key: "resourceType", label: "Recurso" },
      { key: "outcome", label: "Resultado" },
      { key: "correlationId", label: "Correlación" },
    ],
  },
  ai: {
    title: "Asistente VEYLORIQ",
    description:
      "Respuestas basadas en datos autorizados; las escrituras requieren confirmación.",
  },
  crm: {
    title: "CRM 360",
    description: "Contactos, oportunidades, actividades y conversiones.",
  },
  inventory_control: {
    title: "Control de inventario",
    description: "Transferencias, ajustes, alertas y kardex.",
  },
  finance_control: {
    title: "Finanzas operativas",
    description: "Caja, bancos, cobros, pagos y transferencias.",
  },
  roles: {
    title: "Roles y permisos",
    description: "Jerarquía, delegación y permisos del tenant.",
  },
  notifications: {
    title: "Notificaciones",
    description: "Alertas internas y recursos asociados.",
  },
  catalog: {
    title: "Catálogo avanzado",
    description: "Categorías, imágenes, unidades y archivado.",
  },
  fulfillment: {
    title: "Despachos y devoluciones",
    description: "Preparación, entregas parciales, cancelaciones y retornos.",
  },
  documents: {
    title: "Documentos",
    description: "Archivos privados, versionados y sujetos a cuota.",
  },
  reports: {
    title: "Reportes",
    description: "Indicadores y exportaciones con filtros de servidor.",
  },
  team: {
    title: "Equipo y permisos",
    description: "Miembros, roles e invitaciones del espacio.",
  },
  security: {
    title: "Seguridad",
    description: "MFA, contraseña y sesiones activas.",
  },
  billing: {
    title: "Plan y consumo",
    description: "Suscripción, facturación y límites del SaaS.",
  },
  organization: {
    title: "Organización",
    description: "Identidad y preferencias del espacio de trabajo.",
  },
};
