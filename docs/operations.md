# Operación, despliegue y recuperación

## Despliegue en Vercel (recomendado)

1. Provee PostgreSQL (Neon/Supabase/RDS) y Redis (Upstash). Consigue las URLs.
2. En el proyecto de Vercel, configura estas variables de entorno (Production y
   Preview según aplique):
   - `DATABASE_URL` (con `?sslmode=require` si el proveedor lo exige)
   - `APP_URL` = URL pública del despliegue (ej. `https://VEYLORIQ.vercel.app`)
   - `SESSION_PEPPER` (32+ caracteres aleatorios)
   - `TOTP_ENCRYPTION_KEY` (clave de 32 bytes en base64)
   - `REDIS_URL` (**obligatoria en producción**: el rate limiting distribuido
     falla cerrado sin ella)
   - `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`,
     `BREVO_WEBHOOK_TOKEN`
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - `CLAMAV_SCAN_URL`, `CLAMAV_SCAN_TOKEN`
   - `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`,
     `BILLING_GRACE_DAYS`
   - `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`
   - `CRON_SECRET` (opcional; protege el disparo manual de `/api/cron/worker`.
     Los Cron Jobs de Vercel no lo necesitan: envían `x-vercel-cron: 1`)
3. Conecta el repo en Vercel. El `vercel.json` ya define:
   - `buildCommand: npm run vercel-build` (genera Prisma, aplica
     `prisma migrate deploy` y compila Next.js)
   - Un Cron cada 5 minutos (`*/5 * * * *`) a `/api/cron/worker`, que ejecuta
     una pasada acotada del worker (outbox, jobs, triggers programados) y
     actualiza el heartbeat. **No necesitas un proceso worker separado.**
4. Tras el primer despliegue, ejecuta el seed una sola vez para crear planes y
   permisos: `npm run db:seed` con `DATABASE_URL` apuntando a producción y
   (opcional) `PLATFORM_BOOTSTRAP_EMAIL` + `PLATFORM_BOOTSTRAP_PASSWORD`
   (16+ caracteres) para el superusuario inicial. Luego elimina esas variables.
5. Verifica `/api/health?mode=live` (debe dar 200) y
   `/api/health?mode=ready` (200 cuando DB + Redis + worker-heartbeat estén OK;
   el heartbeat tarda hasta ~5 min tras el primer cron).

> Nota: los Cron Jobs con intervalo menor a 1 día requieren plan Pro en Vercel.
> En plan Hobby, cambia el `schedule` de `vercel.json` a `0 * * * *`
> (cada hora) o mayor, y sube el umbral del heartbeat en
> `src/app/api/health/route.ts` (actualmente 10 min) por encima de tu
> intervalo.

## Despliegue Docker/self-host

Construye las imágenes separadas `runtime` y `worker` del `Dockerfile`. Antes de promover una versión, aplica `npm run db:deploy` como job único. La web expone `/api/health?mode=live` para liveness y `/api/health?mode=ready` para readiness. No envíes tráfico si readiness devuelve 503.

Los secretos se inyectan en runtime. Nunca uses `.env.example` como entorno real. Configura HTTPS en el ingress y conserva `X-Request-Id`. El worker debe tener una sola fuente horaria fiable y acceso a PostgreSQL, Brevo, Mercado Pago, Cloudinary y el escáner.

## Contrato del escáner

`CLAMAV_SCAN_URL` recibe `POST application/octet-stream`, opcionalmente con `Authorization: Bearer $CLAMAV_SCAN_TOKEN`, y responde JSON `{ "clean": true }` o `{ "clean": false, "threat": "nombre" }`. Un fallo técnico reintenta; un resultado no limpio elimina el objeto, descuenta cuota y conserva auditoría.

## Respaldo

- PostgreSQL: respaldo diario cifrado, PITR si el proveedor lo soporta, retención mínima definida por el operador.
- Cloudinary: versionado/backup del proveedor o exportación independiente según contrato.
- RPO y RTO no se inventan: el operador debe definirlos y registrar una restauración verificada en un entorno aislado.

Procedimiento: congelar escrituras, restaurar base, restaurar/verificar objetos, ejecutar migraciones compatibles, conciliar documentos y suscripciones, comprobar readiness y recién entonces habilitar tráfico.

## Rollback e incidentes

Revierte primero la aplicación a una imagen compatible con la migración ya aplicada. No reviertas una migración destructiva sin respaldo comprobado. Registra el incidente en `/platform`, severidad, organización afectada, cronología y resolución. Suspender un tenant bloquea su acceso efectivo; reactivar exige motivo y auditoría.

## Credenciales

Si un secreto aparece en historial o salida, rótalo en el proveedor, invalida el anterior y revisa logs. El bootstrap de plataforma se ejecuta con variables efímeras y luego se eliminan. La primera sesión obliga a enrolar MFA antes de abrir `/platform`.
