# Matriz de aceptación

Por instrucción del propietario, no se ejecutan nuevas pruebas hasta autorización expresa. Por ello los componentes construidos después de esa indicación se marcan **Implementado sin verificar**.

| Requisito | Implementación | Prueba | Evidencia | Estado |
|---|---|---|---|---|
| Identidad, sesiones y MFA | Argon2id, tokens con hash, TOTP cifrado, recuperación, cambio confirmado de correo y revocación de sesiones | Pendiente por indicación | `src/modules/identity`, `src/app/api/auth`, `/verify-email-change` | Implementado sin verificar |
| Multi-tenancy y RBAC | Contexto por membresía, cookie de organización, permisos backend y jerarquía de roles | Pendiente | `auth.ts`, APIs `organizations` y `roles` | Implementado sin verificar |
| Onboarding | Reanudable; organización, almacén y cuenta inicial transaccionales | Pendiente | `/onboarding`, `/api/onboarding` | Implementado sin verificar |
| CRM | Clientes, contactos, leads, oportunidades, actividades, conversión e historial | Pendiente | `/api/crm`, `crm-panel.tsx` | Implementado sin verificar |
| Catálogo y compras | Productos/servicios, categorías e imágenes, proveedores, OC, recepciones parciales y devoluciones a proveedor | Pendiente | `/api/catalog`, `/api/workspace`, `/api/commands` | Implementado sin verificar |
| Inventario | Stock, reservas, transferencias, ajustes, alertas, kardex y costo promedio | Pendiente | `/api/inventory`, `inventory-panel.tsx` | Implementado sin verificar |
| Cotizaciones | Cálculos, numeración, versiones, PDF, envío y portal seguro | Pendiente | `/api/quotes`, `/q/[token]` | Implementado sin verificar |
| Pedidos y devoluciones | Manual/desde cotización, reserva, preparación, despacho parcial, cierre, devolución | Pendiente | `/api/commands` | Implementado sin verificar |
| Finanzas operativas | Cuentas, categorías, obligaciones, pagos parciales, transferencias, reversiones, conciliación y flujo | Pendiente | `/api/finance`, `finance-panel.tsx` | Implementado sin verificar |
| Documentos | Privados, cuota, vínculos, versiones, cuarentena, vista y borrado controlado | Pendiente | `/api/documents`, worker | Implementado sin verificar |
| Correo y notificaciones | Outbox, Brevo, webhook de entrega, reintentos, preferencias y bandeja interna | Pendiente | worker, `/api/webhooks/brevo`, `/api/notifications` | Implementado sin verificar |
| Suscripciones | Planes configurables, checkout, conciliación, gracia, cancelación y uso | Pendiente | `/api/billing`, webhook Mercado Pago, worker | Implementado sin verificar |
| Automatizaciones e IA | Condiciones evaluadas, señales programadas deduplicadas, acciones limitadas, ejecución de prueba persistida e IA con confirmación | Pendiente | worker, `/api/commands`, `/api/ai` | Implementado sin verificar |
| Tareas colaborativas | Responsable validado en tenant, recurso asociado, comentarios e historial persistente | Pendiente | `/api/tasks`, `tasks-panel.tsx`, migración `task_collaboration` | Implementado sin verificar |
| Plataforma | Organizaciones, planes, usuarios, salud, jobs, incidentes y grants de soporte | Pendiente | `/platform`, `/api/platform` | Implementado sin verificar |
| Reportes y búsqueda | Definiciones, filtros tenant, CSV/XLSX/PDF, jobs grandes con descarga privada/caducidad y búsqueda por permiso | Pendiente | `/api/reports`, worker, `/api/search` | Implementado sin verificar |
| Tablas operativas | Búsqueda con tenant scope y paginación navegable en las vistas generales | Pendiente | `/api/workspace`, `workspace.tsx` | Implementado sin verificar |
| Arranque local | Next dev, carga de entorno en seed/worker y fallback local de rate limit cuando Redis no está configurado | Inspección de ejecución, sin suite de pruebas | `next.config.ts`, `rate-limit.ts`, puntos de entrada | Implementado sin verificar |
| CI/CD y recuperación | Contenedores, workflow, health checks y procedimientos | No ejecutada | `Dockerfile`, `.github/workflows/ci.yml`, `docs/operations.md` | Implementado sin verificar |
