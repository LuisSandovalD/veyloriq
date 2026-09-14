# VEYLORIQ SaaS

VEYLORIQ es un SaaS multi-tenant para CRM, catálogo, compras, inventario, cotizaciones, pedidos, finanzas operativas, documentos, automatizaciones y asistencia con IA. Las finanzas del tenant están separadas de la facturación de la suscripción VEYLORIQ.

## Requisitos

- Node.js 24 o superior.
- PostgreSQL 15 o superior.
- Redis para rate limiting distribuido en entornos compartidos. En desarrollo local, `REDIS_URL` puede quedar vacío y se usa una ventana en memoria no apta para despliegues con varias instancias.
- Credenciales de Brevo, Cloudinary y Mercado Pago para sus flujos reales.
- Un servicio de escaneo compatible con el contrato HTTP descrito en `docs/operations.md` para documentos Office.

## Configuración local

1. Copia `.env.example` a `.env` y reemplaza todos los secretos.
2. Instala con `npm ci`.
3. Genera el cliente con `npm run db:generate`.
4. Aplica migraciones con `npm run db:deploy`.
5. Ejecuta el bootstrap idempotente con `npm run db:seed`. Las credenciales de plataforma son opcionales; si se proporcionan, ambas deben estar presentes y la contraseña debe tener al menos 16 caracteres.
6. Inicia web con `npm run dev` y el worker con `npm run worker` en otro proceso.

No se incluyen usuarios demo, contraseñas conocidas ni precios comerciales ficticios. `STARTER`, `BUSINESS` y `ENTERPRISE` permanecen inactivos hasta que plataforma configure valores reales.

## Límites de seguridad

- El tenant activo se resuelve desde una cookie HTTP-only y se vuelve a validar contra la membresía en cada request.
- Los permisos se evalúan en backend; ocultar controles en UI no constituye autorización.
- Los tokens se almacenan con hash; los secretos TOTP usan AES-256-GCM.
- Las operaciones sensibles usan transacciones, idempotencia, auditoría y outbox.
- Los archivos son privados, se descargan con enlaces breves y Office queda en cuarentena hasta ser inspeccionado.
- El acceso de soporte requiere grant explícito, alcance, motivo, vencimiento y auditoría.

Consulta [arquitectura](docs/architecture.md), [operación](docs/operations.md) y [matriz de alcance](docs/acceptance-matrix.md).
