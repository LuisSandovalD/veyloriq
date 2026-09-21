# Seed demostrativo de VEYLORIQ

Esta carpeta contiene un seed modular e idempotente para presentar la plataforma con datos históricos relacionados.

## Ejecución

```bash
npm run db:deploy
npm run db:seed
```

En desarrollo se usa la contraseña común `VeyloriqDemo2026!`. Puede cambiarse antes de ejecutar el seed:

```bash
DEMO_SEED_PASSWORD="OtraClaveSegura2026!" npm run db:seed
```

En producción, `DEMO_SEED_PASSWORD` es obligatoria. Cada nueva ejecución actualiza la contraseña de los cuatro usuarios principales y repone los datos de demostración sin duplicarlos.

## Usuarios principales

| Usuario | Correo | Rol |
|---|---|---|
| Luis Enrique Sandoval Carbonel | `2301080307@undc.edu.pe` | `OWNER` y `PLATFORM_SUPERUSER` |
| Erick Paul Zamudio Sapacayo | `2301010375@undc.edu.pe` | `ADMIN` |
| Juan Joseph Ramos Chumpitaz | `2301050259@undc.edu.pe` | `SALES` |
| Josue Alberto Huaman Tacsa | `2301010136@undc.edu.pe` | `WAREHOUSE` |

Luis debe configurar MFA desde `/platform/setup` antes de entrar a `/platform`.

## Contenido por módulo

- `catalog.ts`: permisos, planes, características y límites.
- `identity.ts`: organización, usuarios, roles, membresías, invitación y suscripción.
- `crm.ts`: clientes, contactos, leads, oportunidades y actividades.
- `inventory.ts`: categorías, productos, proveedores, almacenes, stock y kardex.
- `commerce.ts`: compras, recepciones, devoluciones, cotizaciones, pedidos y despachos.
- `finance.ts`: cuentas, categorías, obligaciones, pagos, movimientos y conciliación.
- `collaboration.ts`: tareas, comentarios, notificaciones, automatizaciones, IA y procesamiento asíncrono.
- `platform.ts`: facturación SaaS, consumo, webhook, incidente, soporte y auditoría.
- `verify.ts`: comprobaciones finales y resumen de cantidades.

## Enlaces de demostración

La cotización `COT-0003` tiene un portal público activo con el token:

```text
veyloriq-demo-cotizacion-token-0003
```

La ruta local completa es:

```text
http://localhost:3000/q/veyloriq-demo-cotizacion-token-0003
```

No se crean documentos falsos en Cloudinary. El módulo documental debe demostrarse subiendo un archivo real, para evitar enlaces rotos o jobs de escaneo inválidos.

