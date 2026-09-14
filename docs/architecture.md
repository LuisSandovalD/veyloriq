# Arquitectura y límites

La web usa Next.js con Route Handlers como adaptadores HTTP. `src/modules` contiene dominio, aplicación e infraestructura; `src/shared` concentra base de datos, resultados, entorno, HTTP y controles transversales. PostgreSQL es la fuente de verdad. Redis solo coordina límites distribuidos. El worker consume outbox y jobs persistentes.

## Contextos

- **Identidad global:** usuario, sesiones, MFA y tokens.
- **Tenant:** organización, membresía, rol y datos operativos. Toda consulta sensible incluye `organizationId`.
- **Plataforma:** métricas SaaS, planes, suscripciones, integraciones, incidentes y soporte. No hereda acceso a datos empresariales.
- **Portal público:** cotizaciones mediante token aleatorio con hash, vencimiento y revocación.

## Consistencia

Cotizaciones conservan snapshots y versiones. Pedidos reservan stock con versión optimista; el despacho consume reserva y físico. Recepciones actualizan inventario y costo promedio ponderado. Cobros y pagos son distintos de ventas y compras. Correcciones financieras generan reversiones en lugar de editar movimientos confirmados.

Las mutaciones de flujo usan nivel `SERIALIZABLE`, claves de idempotencia y eventos de auditoría/outbox. Los consumidores reintentan con backoff y reclaman trabajos mediante actualización condicional.

## Integraciones

- Brevo: aceptación del API y entrega son estados distintos; el webhook usa bearer token configurado.
- Mercado Pago: checkout crea un cambio pendiente; solo la conciliación aplica el plan o estado.
- Cloudinary: assets `authenticated`, URLs de cinco minutos y eliminación por job.
- IA: recibe únicamente contexto filtrado por tenant y permisos; toda escritura soportada requiere confirmación explícita.
