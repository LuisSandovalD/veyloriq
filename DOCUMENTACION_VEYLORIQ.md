# VEYLORIQ: guía completa de la plataforma

## 1. ¿Qué es VEYLORIQ?

VEYLORIQ es una plataforma SaaS de gestión empresarial multiempresa (*multi-tenant*). Su objetivo es concentrar en un solo sistema la relación con clientes, ventas, compras, inventario, caja y bancos, documentos, tareas, automatizaciones, reportes y asistencia con inteligencia artificial.

La idea central es que los módulos no funcionan como herramientas aisladas. Una cotización puede convertirse en pedido; un pedido reserva y descuenta inventario; una compra recibida aumenta existencias y genera una cuenta por pagar; un cobro o pago afecta una cuenta financiera; y cada operación relevante deja auditoría.

VEYLORIQ diferencia dos ámbitos que no deben confundirse:

- **Operación de la organización:** ventas, compras, inventario, caja, documentos y demás datos del negocio.
- **Facturación del SaaS:** plan contratado, límites de uso, cobro de la suscripción y estado de la cuenta de VEYLORIQ.

## 2. Tipos de usuario

### Usuarios de una organización

Trabajan dentro de uno o más espacios empresariales. Cada membresía tiene un rol y un conjunto de permisos. Los roles predefinidos son:

- `OWNER`: control total, incluida la facturación y la transferencia de propiedad.
- `ADMIN`: administración general, excepto algunas acciones reservadas al propietario.
- `MANAGER`: gestión operativa sin control de roles, facturación ni auditoría completa.
- `SALES`: CRM, cotizaciones, ventas, tareas, reportes e IA.
- `FINANCE`: compras, ventas, finanzas, documentos, reportes e IA.
- `WAREHOUSE`: catálogo, compras, inventario, despachos y tareas.
- `SUPPORT`: CRM, cotizaciones, ventas y tareas.
- `VIEWER`: acceso de lectura a los principales módulos.

Además, la organización puede crear roles personalizados, asignarles permisos y establecer una jerarquía para impedir que alguien delegue un rol igual o superior al suyo.

### Operadores de plataforma

Administran el SaaS global, no el negocio diario de cada cliente. Existen los roles:

- `PLATFORM_SUPERUSER`
- `PLATFORM_ADMIN`
- `PLATFORM_SUPPORT`
- `PLATFORM_ANALYST`

El acceso a `/platform` exige MFA. Un operador no obtiene acceso libre a los datos empresariales: el soporte excepcional se concede mediante autorizaciones limitadas por organización, alcance, motivo y vencimiento.

## 3. Recorrido general de uso

1. El usuario se registra con nombre, correo, contraseña y datos básicos de su organización.
2. VEYLORIQ crea la organización, el usuario propietario, los roles del sistema y una suscripción gratuita.
3. Se envía un correo para verificar la cuenta.
4. El propietario completa el onboarding: identidad empresarial, moneda, localización, impuestos, primer almacén y primera cuenta de caja o banco.
5. Puede cargar clientes, productos, proveedores y miembros del equipo.
6. La operación continúa mediante CRM, cotizaciones, pedidos, compras, inventario y finanzas.
7. El dashboard, los reportes, las notificaciones, la auditoría y la IA usan los datos generados por esos flujos.

## 4. Funciones públicas y acceso

La parte pública incluye:

- Página de presentación del producto.
- Consulta de planes comerciales activos.
- Formulario de contacto.
- Registro e inicio de sesión.
- Verificación de correo.
- Recuperación y cambio de contraseña.
- Confirmación de cambio de correo.
- Aceptación de invitaciones a organizaciones.
- Portal público seguro para visualizar y responder cotizaciones.
- Páginas de términos y privacidad.

Las sesiones duran como máximo 14 días y también pueden vencer por inactividad según la configuración de la organización. El usuario puede revisar sus sesiones y revocar una sesión concreta o todas las demás.

## 5. Dashboard ejecutivo

El resumen del espacio de trabajo muestra el pulso de la organización:

- Número de clientes activos.
- Número de productos activos.
- Importe y cantidad de cotizaciones en pipeline (`SENT`, `VIEWED` o `ACCEPTED`).
- Importe y cantidad de pedidos no cancelados.
- Tareas abiertas o en progreso.
- Estado reciente del stock.
- Actividad reciente obtenida de la auditoría.

Toda la información está filtrada por la organización activa y por los permisos del usuario.

## 6. CRM 360

El CRM centraliza cinco tipos de información:

- **Clientes:** razón o nombre comercial, identificación fiscal, correo, teléfono y estado de archivo.
- **Contactos:** personas vinculadas a un cliente, con cargo y datos de contacto.
- **Leads:** prospectos con empresa, origen, estado y responsable.
- **Oportunidades:** negocio esperado, etapa, importe, moneda, probabilidad, responsable y fecha estimada de cierre.
- **Actividades:** llamadas, correos, reuniones, notas y seguimientos vinculados a clientes, leads u oportunidades.

Permite:

- Buscar y paginar la información del CRM.
- Crear contactos, oportunidades y actividades.
- Asignar leads y oportunidades a miembros activos del equipo.
- Mover oportunidades por un pipeline configurable.
- Archivar leads.
- Convertir un lead en cliente y, opcionalmente, crear una oportunidad.
- Consultar el historial comercial relacionado.

Las etapas del pipeline se configuran por organización y deben incluir al menos `WON` y `LOST`.

## 7. Catálogo de productos y servicios

El catálogo admite:

- Productos inventariables.
- Servicios no inventariables.
- SKU y código de barras.
- Nombre y descripción.
- Unidad de medida.
- Categoría.
- Precio, costo e impuesto.
- Stock mínimo.
- Imágenes privadas asociadas.
- Archivado y restauración sin eliminar el historial.

Las categorías pueden crearse y renombrarse. La plataforma respeta los límites de productos definidos por el plan.

## 8. Proveedores y compras

El módulo de compras gestiona proveedores y órdenes de compra completas.

### Flujo de una compra

1. Se crea una orden en borrador con proveedor, productos, cantidades, costos y fecha esperada.
2. La orden se aprueba.
3. Puede marcarse como enviada al proveedor.
4. Se registran recepciones totales o parciales en un almacén.
5. Cada recepción actualiza el stock y el costo promedio ponderado del producto.
6. La recepción genera o actualiza la obligación por pagar correspondiente.
7. Si corresponde, se registra una devolución al proveedor y se descuenta el inventario.

Estados contemplados: `DRAFT`, `APPROVED`, `SENT`, `PARTIALLY_RECEIVED`, `RECEIVED` y `CANCELLED`.

Una compra con mercancía ya recibida no puede cancelarse como si nunca hubiera ocurrido; debe conservarse la trazabilidad del movimiento.

## 9. Inventario y almacenes

VEYLORIQ controla stock por producto y almacén, separando:

- Existencia física.
- Cantidad reservada.
- Cantidad disponible, calculada como físico menos reservado.

El módulo permite:

- Crear y mantener múltiples almacenes.
- Consultar existencias por producto o almacén.
- Revisar el kardex de movimientos.
- Detectar stock bajo comparando disponibilidad con el mínimo del producto.
- Transferir unidades entre almacenes.
- Hacer ajustes de inventario con motivo obligatorio.
- Reservar stock al confirmar pedidos.
- Liberar reservas al cancelar pedidos.
- Descontar físico y reserva durante el despacho.
- Reingresar unidades vendibles devueltas por clientes.
- Registrar recepciones y devoluciones de proveedor.

Los movimientos posibles incluyen recepción, devolución a proveedor, reserva, liberación, despacho, devolución de cliente, transferencia de entrada o salida, ajuste y conteo.

## 10. Cotizaciones

Las cotizaciones incluyen:

- Numeración consecutiva configurable.
- Cliente y contacto.
- Moneda.
- Líneas con producto o servicio, cantidad, precio, descuento e impuesto.
- Subtotal, descuento, impuestos y total.
- Fecha de vigencia y condiciones.
- Versiones y snapshots para conservar qué se envió.
- Generación de PDF.
- Envío por correo.
- Duplicación de una cotización existente.
- Conversión a pedido.

Estados: `DRAFT`, `SENT`, `VIEWED`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `CONVERTED` y `CANCELLED`.

### Portal de cotización

Al enviar una cotización se genera un acceso público mediante un token aleatorio almacenado como hash. El enlace puede vencer o revocarse. El portal registra la visualización y permite aceptar o rechazar dentro de las reglas de vigencia.

Solo una cotización aceptada puede convertirse en pedido. Al cancelarla se revocan sus enlaces públicos activos.

## 11. Pedidos, despachos y devoluciones

Los pedidos pueden crearse manualmente o a partir de una cotización aceptada.

### Flujo de venta

1. El pedido se crea en `DRAFT`.
2. Al confirmarlo se valida y reserva el stock de los productos físicos.
3. Pasa a preparación.
4. Se realizan uno o varios despachos parciales.
5. Cada despacho descuenta la reserva y la existencia física.
6. Cuando todo fue enviado, el pedido queda `SHIPPED` y luego puede cerrarse como `COMPLETED`.
7. La operación genera una cuenta por cobrar para el cliente.

Estados: `DRAFT`, `CONFIRMED`, `PREPARING`, `PARTIALLY_SHIPPED`, `SHIPPED`, `COMPLETED` y `CANCELLED`.

Las devoluciones de cliente pueden clasificarse como:

- `SELLABLE`: vuelve al stock disponible.
- `DAMAGED`: queda registrada como dañada y no se reincorpora como vendible.
- `QUARANTINE`: queda pendiente de decisión operativa.

Las cancelaciones liberan las reservas pendientes sin borrar los movimientos ya ocurridos.

## 12. Finanzas operativas

Este módulo gestiona el dinero operativo del negocio; no pretende reemplazar una contabilidad fiscal.

Incluye:

- Cuentas de caja y banco por moneda.
- Saldos y movimientos trazables.
- Categorías de ingreso, egreso o ambas.
- Ingresos y egresos manuales con motivo.
- Transferencias entre cuentas de la misma moneda.
- Cuentas por cobrar y por pagar.
- Cobros y pagos totales o parciales.
- Aplicación de pagos a obligaciones.
- Conciliaciones contra saldo de extracto.
- Reversiones de movimientos.

Ventas, cobros, compras y pagos son conceptos separados. Crear una venta no significa haber cobrado, y crear una compra no significa haber pagado.

Los movimientos confirmados no se editan silenciosamente: las correcciones se realizan mediante reversiones que dejan el historial original. Las operaciones financieras usan claves de idempotencia para evitar duplicados por reintentos.

## 13. Documentos

El gestor documental permite:

- Subir PDF, JPEG, PNG, CSV, DOCX y XLSX.
- Limitar cada archivo a 10 MB.
- Guardar archivos como recursos privados en Cloudinary.
- Vincularlos a clientes, cotizaciones, pedidos, compras o tareas.
- Crear nuevas versiones y consultar el historial.
- Previsualizar o descargar mediante enlaces privados de cinco minutos.
- Archivar y eliminar de forma asíncrona.
- Controlar la cuota de almacenamiento del plan.

Los archivos Office se guardan inicialmente en cuarentena y pasan por un escáner HTTP compatible con ClamAV. Solo se vuelven disponibles si el resultado es limpio; si son rechazados, se elimina el objeto y se corrige el consumo de almacenamiento.

## 14. Tareas colaborativas

Las tareas incluyen:

- Título y descripción.
- Responsable perteneciente a la organización.
- Prioridad `LOW`, `MEDIUM`, `HIGH` o `URGENT`.
- Fecha de vencimiento.
- Estado `OPEN`, `IN_PROGRESS`, `DONE` o `CANCELLED`.
- Recurso empresarial relacionado.
- Comentarios.
- Historial de creación y cambios.

La lista admite búsqueda y paginación. La creación, actualización, finalización y comentarios generan trazabilidad; las tareas también pueden ser creadas por automatizaciones o por el asistente de IA.

## 15. Notificaciones y correo

VEYLORIQ tiene dos canales:

- Bandeja interna por usuario.
- Correo transaccional mediante Brevo.

Cada usuario puede activar o desactivar preferencias por tipo de notificación y canal. También puede marcar una notificación o todas como leídas.

El sistema envía, entre otros, correos de:

- Verificación de cuenta.
- Restablecimiento de contraseña.
- Cambio de correo.
- Invitación a una organización.
- Cotización.
- Automatización.
- Formulario público de contacto.

La aceptación del mensaje por Brevo y su entrega final se registran como estados distintos. Los webhooks actualizan el resultado real de entrega.

## 16. Automatizaciones

Las automatizaciones ejecutan acciones cuando ocurre un evento de negocio.

### Disparadores disponibles

- Lead creado.
- Cotización enviada.
- Cotización aceptada.
- Cotización próxima a vencer.
- Pedido confirmado.
- Stock bajo.
- Obligación vencida.

### Acciones disponibles

- Crear una tarea.
- Crear una notificación interna.
- Enviar un correo a un destinatario autorizado.
- Actualizar un campo permitido de una tarea, lead u oportunidad.

Las reglas admiten condiciones con los operadores igual, distinto, contiene, mayor que y menor que. Cada cambio genera una nueva versión de la automatización. También se puede activar, desactivar y ejecutar una prueba persistida.

Para evitar bucles o ejecuciones repetidas existen profundidad máxima, deduplicación por evento y un límite de entre una y diez acciones por regla.

## 17. Asistente con inteligencia artificial

El asistente permite preguntar en lenguaje natural por:

- Ventas y pedidos.
- Cotizaciones.
- Clientes y actividad comercial.
- Inventario y stock bajo.
- Resumen reciente de la operación.

Conserva conversaciones por usuario y organización. El contexto enviado al proveedor de IA está filtrado por tenant y permisos; no recibe acceso general a toda la base de datos.

Actualmente puede proponer dos escrituras controladas:

- Crear una tarea.
- Crear un borrador de cotización a partir de un cliente y producto existentes.

Estas acciones nunca se ejecutan solo por la respuesta del modelo: la interfaz presenta una confirmación explícita, vuelve a comprobar permisos y suscripción, registra la ejecución y evita repetir una confirmación ya procesada.

## 18. Reportes y exportaciones

Los reportes aceptan filtros de fechas interpretados en la zona horaria de la organización. Se pueden consultar como JSON y exportar a CSV, XLSX o PDF.

Reportes disponibles:

- Ventas.
- Cotizaciones.
- Inventario.
- Compras.
- Flujo de caja.
- Cobros.
- Gastos.
- Cuentas por cobrar.
- Cuentas por pagar.
- Clientes.
- Oportunidades.
- Productos.
- Valoración de inventario.
- Suscripción del SaaS.
- Consumo del plan.

Las exportaciones de hasta 5.000 filas se generan en la solicitud. Las más grandes se envían a un job asíncrono; el worker crea un documento privado y temporal para descargarlo. Las celdas se protegen contra fórmulas inyectadas al abrir CSV o Excel.

## 19. Búsqueda global y tablas operativas

Las vistas generales ofrecen búsqueda y paginación con filtros aplicados en el servidor. La búsqueda global consulta únicamente recursos que el usuario puede ver y mantiene el filtro de organización.

## 20. Equipo, invitaciones, roles y permisos

La administración de equipo permite:

- Invitar por correo con un rol concreto.
- Aceptar una invitación con una cuenta existente.
- Crear una cuenta nueva desde una invitación.
- Reenviar o revocar invitaciones pendientes.
- Cambiar el rol de un miembro.
- Retirar miembros y revocar sus sesiones.
- Transferir la propiedad de la organización verificando la contraseña del propietario.
- Ver si cada integrante usa MFA.

Las invitaciones duran siete días y sus tokens se almacenan con hash. El total de miembros e invitaciones pendientes respeta el límite de usuarios del plan.

Los permisos disponibles cubren dashboard, organización, miembros, roles, CRM, catálogo, compras, inventario, cotizaciones, ventas, finanzas, documentos, tareas, automatizaciones, reportes, IA, auditoría y facturación.

## 21. Configuración de la organización

La organización puede configurar:

- Nombre comercial y razón social.
- Identificación fiscal.
- Dirección, correo y teléfono.
- Logotipo obtenido del gestor documental.
- Moneda: PEN, USD o EUR.
- Idioma/región: `es-PE`, `es-ES` o `en-US`.
- Zona horaria.
- Prefijos de cotización, compra y pedido.
- Nombre y porcentaje de impuesto por defecto.
- Formato de fecha.
- Primer día de la semana.
- Tiempo de inactividad permitido para una sesión.
- MFA obligatorio para propietarios y administradores.
- Etapas del pipeline de oportunidades.

## 22. Seguridad de la cuenta

Las medidas implementadas incluyen:

- Contraseñas con Argon2id.
- Contraseñas nuevas de al menos 12 caracteres, con mayúscula, minúscula y número.
- Tokens aleatorios almacenados como hash.
- Cookies de sesión `HTTP-only`, `SameSite=Lax` y `Secure` en producción.
- MFA TOTP con secreto cifrado mediante AES-256-GCM.
- Códigos de recuperación almacenados como hash.
- Cambio de correo confirmado mediante enlace temporal.
- Restablecimiento de contraseña mediante token temporal.
- Revisión y revocación de sesiones.
- Validación de mismo origen en mutaciones sensibles.
- Rate limiting con Redis en entornos distribuidos y memoria local en desarrollo.
- Validación de entradas con Zod.
- Autorización real en backend; ocultar una opción en pantalla no concede ni revoca permisos.

## 23. Auditoría y trazabilidad

Las operaciones relevantes generan eventos con:

- Organización.
- Actor y, cuando aplica, actor efectivo.
- Acción.
- Tipo e identificador de recurso.
- Resultado.
- Cambios o motivo.
- Identificador de correlación.
- Fecha.

El identificador de correlación también se devuelve como `x-request-id`, lo que permite seguir una operación desde la petición HTTP hasta jobs y eventos asíncronos.

Las transiciones críticas usan transacciones de base de datos, aislamiento serializable cuando corresponde, bloqueo transaccional, claves de idempotencia y control de versión optimista.

## 24. Planes, suscripción y límites

El código actual incluye cuatro planes base. Sus precios y condiciones son configurables desde la administración global.

| Plan | Usuarios | Productos | Clientes | Almacenes | Automatizaciones | Almacenamiento | Correos/mes | IA |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Free | 2 | 100 | 100 | 1 | 3 | 100 MB | 100 | 10 solicitudes |
| Starter | 5 | 1.000 | 1.000 | 3 | 10 | 1 GB | 2.000 | 250 solicitudes |
| Business | 20 | 10.000 | 10.000 | 10 | 50 | 10 GB | 10.000 | 2.000 solicitudes |
| Enterprise | 100 | 100.000 | 100.000 | 50 | 250 | 50 GB | 50.000 | 10.000 solicitudes |

También existe un límite de solicitudes API por plan. Los contadores registran consumo y reservas para evitar superar una cuota mediante operaciones simultáneas.

El área de facturación permite:

- Ver plan, estado y ciclo actual.
- Comparar planes activos.
- Consultar consumo y límites.
- Revisar cambios de plan pendientes e historial de cobros.
- Iniciar checkout mensual o anual con Mercado Pago.
- Solicitar cancelación o reactivación.

Un checkout no cambia el plan inmediatamente. Primero crea un cambio pendiente; el webhook y el job de conciliación confirman el estado real en Mercado Pago antes de aplicarlo. Si la suscripción está impaga, cancelada, incompleta o fuera del período de gracia, el sistema mantiene la consulta pero bloquea las mutaciones operativas, excepto las necesarias para gestionar la facturación.

## 25. Administración global de la plataforma

El panel `/platform` ofrece:

- Organizaciones, estado, plan y conteos principales.
- Suspensión y reactivación de organizaciones con motivo auditado.
- Edición de planes, precios, características y límites.
- Gestión de roles de operadores de plataforma.
- Eventos de facturación y consumo agregado.
- Estado de base de datos, worker e integraciones configuradas.
- Jobs y eventos outbox fallidos, con reintento manual.
- Apertura y resolución de incidentes por severidad.
- Grants temporales de soporte con alcances explícitos.
- Auditoría de acciones de plataforma.

Los alcances de soporte disponibles están limitados a metadatos de organización, lectura de facturación, lectura de jobs y lectura de integraciones.

## 26. Procesamiento asíncrono

El worker procesa trabajos persistentes y eventos de outbox. Sus responsabilidades incluyen:

- Enviar correos y registrar su entrega.
- Ejecutar automatizaciones.
- Detectar cotizaciones próximas a vencer, stock bajo y obligaciones vencidas.
- Medir umbrales de consumo.
- Conciliar suscripciones con Mercado Pago.
- Cancelar la suscripción reemplazada después de un cambio confirmado.
- Escanear documentos Office.
- Eliminar archivos privados.
- Generar reportes grandes.
- Reintentar con espera creciente y marcar estados terminales.
- Actualizar un heartbeat de servicio.

Los trabajos se reclaman mediante actualizaciones condicionales para reducir el riesgo de procesamiento simultáneo. Tanto jobs como eventos tienen número de intentos, bloqueo, error final y estado persistente.

## 27. Integraciones externas

- **PostgreSQL:** fuente de verdad para usuarios, organizaciones y toda la operación.
- **Redis:** rate limiting distribuido.
- **Brevo:** correo transaccional y eventos de entrega.
- **Cloudinary:** almacenamiento privado de documentos e imágenes.
- **Servicio compatible con ClamAV:** inspección de archivos Office en cuarentena.
- **Mercado Pago:** checkout y administración de la suscripción SaaS.
- **Proveedor de IA compatible con una API de chat:** respuestas del asistente usando `AI_BASE_URL`, `AI_API_KEY` y `AI_MODEL`.

## 28. Arquitectura técnica

La aplicación usa:

- Next.js 16 con App Router y Route Handlers.
- React 19 y TypeScript.
- PostgreSQL con Prisma 7.
- TanStack Query para estado asíncrono del frontend.
- Tailwind CSS y componentes de interfaz reutilizables.
- Zod para validación.
- Vitest para pruebas unitarias y Playwright para pruebas E2E.

La organización del código es:

- `src/app`: páginas y adaptadores HTTP.
- `src/components`: interfaz por módulo.
- `src/modules`: dominio, aplicación e infraestructura.
- `src/shared`: base de datos, entorno, HTTP, resultados, fechas y rate limiting.
- `prisma`: esquema, migraciones y datos iniciales.
- `src/worker.ts`: procesamiento asíncrono.

PostgreSQL es la fuente de verdad. Redis no reemplaza datos de negocio; únicamente coordina límites distribuidos.

## 29. Mapa de API

| Ruta | Responsabilidad principal |
|---|---|
| `/api/auth/*` | Registro, login, logout, verificación, MFA y seguridad de cuenta |
| `/api/onboarding` | Configuración inicial de organización, almacén y cuenta |
| `/api/workspace` | Lectura y altas rápidas de recursos generales |
| `/api/crm` | Contactos, oportunidades, actividades y conversión de leads |
| `/api/catalog` | Categorías, edición y archivado de productos |
| `/api/commands` | Transiciones de cotizaciones, compras, pedidos, inventario, pagos y automatizaciones |
| `/api/inventory` | Stock, alertas y kardex |
| `/api/finance` | Movimientos, transferencias, categorías, reversiones y conciliaciones |
| `/api/documents` | Archivos privados, versiones, descarga y borrado |
| `/api/tasks` | Tareas, responsables, comentarios e historial |
| `/api/notifications` | Bandeja y preferencias |
| `/api/reports` | Reportes y exportaciones |
| `/api/ai` | Conversaciones y acciones confirmadas del asistente |
| `/api/members` y `/api/roles` | Equipo, invitaciones, propiedad y permisos |
| `/api/organization` y `/api/organizations` | Configuración y selección de organización |
| `/api/billing/*` | Plan, consumo, checkout y suscripción |
| `/api/webhooks/*` | Eventos de Brevo y Mercado Pago |
| `/api/platform/*` | Administración global, soporte e incidencias |
| `/api/search` | Búsqueda global autorizada |
| `/api/health` | Liveness y readiness |
| `/api/cron/worker` | Ejecución acotada del worker desde cron |

## 30. Despliegue y operación

El proyecto requiere Node.js 24 y PostgreSQL. Para un entorno completo también necesita Redis y credenciales de las integraciones que se vayan a utilizar.

Comandos principales:

```bash
npm ci
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
npm run worker
```

Verificación completa:

```bash
npm run check
```

La aplicación puede desplegarse:

- En Vercel, donde el build genera Prisma, aplica migraciones y compila Next.js.
- Con Docker, usando una imagen separada para web y otra para worker.
- En infraestructura propia con PostgreSQL, Redis y un proceso de worker persistente.

Los endpoints de salud son:

- `/api/health?mode=live`: confirma que el proceso web responde.
- `/api/health?mode=ready`: comprueba base de datos y expone información de Redis, heartbeat del worker, jobs pendientes y servicios opcionales no configurados.

## 31. Estado actual y consideraciones importantes

- La matriz interna `docs/acceptance-matrix.md` marca los módulos como implementados, pero indica que gran parte de la suite no había sido ejecutada por una instrucción anterior. No debe interpretarse como certificación de producción.
- Varias funciones dependen de credenciales externas. Sin Brevo, Cloudinary, ClamAV, Mercado Pago o un proveedor de IA, el núcleo puede iniciar, pero los flujos asociados no estarán completos.
- El `seed` actual activa y asigna precios base a Starter, Business y Enterprise, mientras que el `README.md` aún afirma que permanecen inactivos hasta ser configurados. El comportamiento del código actual es el definido en `prisma/seed.ts`.
- `vercel.json` ejecuta actualmente el cron a las 05:00 una vez al día (`0 5 * * *`), aunque `docs/operations.md` todavía describe una frecuencia de cinco minutos. Esto afecta la rapidez de correos, automatizaciones, escaneos, conciliaciones y reportes asíncronos si no existe otro worker.
- El readiness actual solo devuelve error cuando PostgreSQL no está disponible. Redis y el heartbeat del worker se informan, pero no hacen fallar por sí solos la respuesta.
- El `healthcheck` del servicio web en `compose.yaml` consulta la URL pública de Veyloriq en lugar del contenedor local; conviene corregirlo antes de usar Compose como criterio real de salud local.

## 32. Resumen

VEYLORIQ implementa un flujo empresarial conectado de principio a fin:

```text
Lead -> Cliente/Oportunidad -> Cotización -> Pedido -> Reserva -> Despacho
                                                |                |
                                                |                -> Cuenta por cobrar -> Cobro
                                                |
Proveedor -> Orden de compra -> Recepción -> Inventario -> Cuenta por pagar -> Pago
```

Alrededor de esos flujos operan tareas, documentos, notificaciones, automatizaciones, reportes, IA, permisos, auditoría y límites de suscripción. El resultado es una plataforma en la que cada área comparte contexto sin perder el aislamiento entre organizaciones ni la trazabilidad de las operaciones.
