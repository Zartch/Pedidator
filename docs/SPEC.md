# Pedidator: especificación de la prueba de concepto

_Versión 3 · 21/11/2026 · Documento de partida para que Claude Code programe el proyecto por fases. El plan de ejecución paso a paso está en [ROADMAP.md](ROADMAP.md) y los detalles verificados de PocketBase en [POCKETBASE.md](POCKETBASE.md)._

**Cambios respecto a la versión 1:** multiempresa, pedidos con artículos (precio por unidad o por kilo y peso), interfaz en catalán y castellano, historial de cambios, pedidos entregados archivados y visibles a petición, y dominio pendiente de decidir.

**Cambios respecto a la versión 2** (revisión técnica, verificados con un spike contra PocketBase v0.40.6):
- Seguridad: reglas de `users` y `companies` cerradas y gestión por rutas propias; campo `active` para dar de baja; idempotencia de `opId` por usuario; fotos protegidas y endpoint de subida.
- PocketBase fijado a v0.40.6 y compilado desde su módulo Go (sin Docker para desarrollar ni para las pruebas).
- Código compartido (`shared/`) empaquetado para los hooks; la lógica de sincronización vive ahí como funciones puras.
- Zona horaria en el servidor con el `Timezone` nativo de PocketBase.
- Tabla de alias para los clientes duplicados creados sin conexión.
- Valores de estado en inglés, kilos pedidos en gramos enteros, sin `photoThumb` en el servidor.
- Detalles de sincronización: cursor, normalización de valores, borrado en cascada, cola por usuario.

---

## 1. Contexto y alcance

Plataforma para gestionar los **pedidos** y los **tickets pendientes de pago (deudas)** de paradas y comercios pequeños. El primer cliente es una carnicería, pero la plataforma es **multiempresa** desde el principio para poder ofrecerla a otras paradas. La usan varias personas desde varios dispositivos (iPad, iPhone y algún ordenador) y **tiene que funcionar sin conexión desde el primer día**, también para editar.

La versión anterior (hecha con herramientas de Google) no se reutiliza. Se empieza de cero.

### Dentro del alcance
- **Multiempresa**: cada usuario pertenece a una empresa y solo ve los datos de esa empresa. Los administradores de la plataforma ven todas.
- Pedidos con fecha y hora de recogida y **artículos** con precio por unidad o por kilo y peso. Cada artículo se marca como preparado.
- Calendario con los días que tienen pedidos y aviso de los días con pedidos importantes. Los pedidos entregados se archivan, pero se pueden mostrar.
- Progreso de los pedidos del día y recuento mensual de pedidos entregados.
- Tickets pendientes: cliente, importe, notas y foto, agrupados por cliente.
- Ficha de cliente opcional: se crea sola con el nombre si no existe.
- Multiusuario con login e **historial de cambios** (quién cambió qué y cuándo).
- **Modo sin conexión con edición**: cola de cambios pendientes y resolución de conflictos.
- Interfaz en **catalán y castellano**.
- Correo diario por empresa a una lista de destinatarios configurable.
- Copias de seguridad diarias en un almacenamiento externo.

### Fuera del alcance de la prueba de concepto
- App nativa en App Store o Play Store (será una PWA).
- Facturación, TPV y stock. Catálogo de productos con precios fijos (posible fase futura; de momento el nombre y el precio del artículo se escriben a mano, con sugerencias de lo usado antes).
- Alta de empresas por su cuenta (las crea el administrador de la plataforma).
- Notificaciones push.
- Sincronización en segundo plano con la app cerrada (Safari no lo permite).

---

## 2. Arquitectura y stack

| Pieza | Elección | Por qué |
|---|---|---|
| Frontend | **Vite + React + TypeScript + Tailwind + shadcn/ui** | App estática; encaja mejor con el modo sin conexión que una app con servidor (SSR). |
| PWA | `vite-plugin-pwa` (Workbox) | Instalación en la pantalla de inicio y caché de la app. |
| Base de datos en el dispositivo | **Dexie** (IndexedDB) + `useLiveQuery` | La interfaz lee siempre de aquí. |
| Idiomas | **i18next + react-i18next**; `date-fns` con locales `ca` y `es` | Catalán y castellano desde el primer día. |
| Backend | **PocketBase v0.40.6** (SQLite, login, archivos, tiempo real, panel de administración), compilado desde su módulo Go en `pb/` | Casi nada de código de servidor. La lógica propia va en `pb_hooks` (JavaScript). Versión fijada: el proyecto upstream se muda de GitHub y no se actualiza sin decidirlo. |
| Código compartido | `shared/` (TypeScript) empaquetado con esbuild a `pb/pb_hooks/lib/shared.js` | Importes, normalización de nombres, permisos y decisiones de sincronización: una sola implementación para la interfaz y el servidor, con pruebas unitarias. |
| Servir la app | La propia PocketBase, desde `pb_public` | Un solo contenedor, una URL y un volumen del que hacer copias. |
| Hosting | VPS en la UE + **Coolify** | Despliegue desde GitHub con cada push y HTTPS automático. |
| Demo | **GitHub Pages** (solo fase 1) | Probar la app con datos de mentira, solo en el dispositivo. |
| Correo | **Resend** (o un servicio similar) por API HTTP | Que no caiga en spam; algunos proveedores de VPS bloquean SMTP. |
| Copias de seguridad | Copias integradas de PocketBase → S3 externo | Externas al VPS. |
| Imágenes | `browser-image-compression` | Se comprimen en el dispositivo. |
| Pruebas | Vitest (unitarias; de integración contra un PocketBase real arrancado como binario local, **sin Docker**), Playwright (extremo a extremo) | |

### Regla de oro de la arquitectura

> **La interfaz solo lee y escribe en la base de datos local (Dexie).** Un motor de sincronización independiente sube la cola de cambios y trae los cambios del servidor. Ningún componente llama a PocketBase directamente para modificar datos.

```
[UI React] ⇄ [Repositorio local (Dexie)] ⇄ [Motor de sincronización] ⇄ [PocketBase API + realtime]
                     ↑ outbox / conflicts / meta
```

### Multiempresa: cómo se aísla
- **Todas** las colecciones de datos de negocio llevan un campo `company`.
- El aislamiento se aplica **en el servidor**, nunca solo en la interfaz:
  - Reglas de lectura de la API de PocketBase (`listRule` y `viewRule`): `@request.auth.active = true && (company = @request.auth.company || @request.auth.role = "platform_admin")`. El tiempo real respeta estas mismas reglas.
  - Reglas de escritura (`createRule`, `updateRule`, `deleteRule`): **`null` en todas las colecciones**, incluidas `users` y `companies`. Solo escriben los hooks.
  - El hook de subida comprueba que el `company` de cada operación sea el del usuario (o que el usuario sea administrador de la plataforma) y que las relaciones (cliente, pedido…) sean de la misma empresa.
- En el dispositivo, **una base de datos Dexie por empresa** (`pedidator-{companyId}`). Si un administrador de la plataforma cambia de empresa, cambia de base de datos local; los datos de empresas distintas nunca se mezclan. El `platform_admin` se suscribe al tiempo real con un filtro por la empresa activa y el motor descarta cualquier registro de otra empresa antes de escribir en Dexie.

---

## 3. Modelo de datos

Campos comunes en **todas** las colecciones sincronizables:

| Campo | Tipo | Notas |
|---|---|---|
| `id` | texto de 15 caracteres `[a-z0-9]` | **Lo genera el dispositivo** (formato compatible con PocketBase). Así se pueden crear registros sin conexión. |
| `company` | relación con `companies`, obligatoria | Lo comprueba el servidor. |
| `version` | entero | Lo gestiona **solo el servidor**: empieza en 1 y sube en cada escritura. |
| `updatedBy` | relación con `users` | Lo rellena el servidor con el usuario autenticado. |
| `deleted` | booleano | **Borrado lógico**, necesario para que la sincronización detecte los borrados. |
| `created`, `updated` | `autodate` (hay que declararlos en la migración) | Hora del servidor. `updated` sirve de cursor de sincronización. Índice por (`company`, `updated`). |

### `companies`
| Campo | Tipo | Notas |
|---|---|---|
| `name` | texto | Nombre de la parada. |
| `locale` | `ca` \| `es` | Idioma por defecto, también para el correo diario. |
| `emailRecipients` | JSON (lista de correos) | N destinatarios del correo diario. |
| `emailHour` | entero (0–23), por defecto 21 | |
| `active` | booleano | |
| `lastSummaryDate` | texto `AAAA-MM-DD`, solo servidor | Último día (hora de Madrid) con resumen enviado. |
| `summaryRetryAt` | fecha, solo servidor | Reintento pendiente del resumen. |

Editables por el administrador de la empresa y el de la plataforma **mediante rutas propias** (`PATCH /api/admin/companies/{id}`). Las crea solo el administrador de la plataforma (`POST /api/admin/companies`, que crea también su primer administrador).

### `users` (colección de autenticación)
| Campo | Tipo | Notas |
|---|---|---|
| `name`, `email`, `password` | | |
| `company` | relación con `companies` | Obligatoria salvo para `platform_admin`. |
| `role` | `staff` \| `company_admin` \| `platform_admin` | Ver la tabla de permisos. |
| `locale` | `ca` \| `es`, opcional | Si está vacío, se usa el de la empresa. |
| `active` | booleano | Dar de baja = `active: false`. Los usuarios no se borran (el historial los referencia). |

No hay registro público. Los superusuarios propios de PocketBase (`_superusers`) son solo para infraestructura y no se usan en la app.

**Reglas de `users`** (PocketBase trae por defecto registro público y edición del propio registro: hay que cerrarlo en la migración):
- Lectura: mismos criterios que el resto (compañeros de la misma empresa; el `platform_admin`, todos).
- Escritura REST: `null`. `authRule: active = true`. Token de 30 días.
- Toda la gestión pasa por rutas propias, que validan con una función pura compartida (`shared/permissions.ts`):
  - `POST /api/admin/users`, `PATCH /api/admin/users/{id}`: un `company_admin` solo gestiona usuarios de **su** empresa y solo puede asignar `staff` o `company_admin`; nadie cambia su propio `role` ni su propio `active`; `company` no se cambia nunca.
  - `PATCH /api/account`: cada usuario cambia su `name`, su `locale` y su contraseña (con la contraseña actual).
  - Al dar de baja o cambiar la contraseña se llama a `refreshTokenKey()`: todos sus tokens dejan de valer. Además, las reglas y las rutas comprueban `active` en cada petición.

#### Permisos
| Acción | `staff` | `company_admin` | `platform_admin` |
|---|---|---|---|
| Ver y editar pedidos, tickets y clientes de su empresa | ✔ | ✔ | ✔ (cualquier empresa) |
| Ver el historial de cambios | ✔ | ✔ | ✔ |
| Ajustes de la empresa (correo, idioma) | ✗ | ✔ | ✔ |
| Gestionar usuarios de la empresa | ✗ | ✔ | ✔ |
| Crear empresas y cambiar de empresa | ✗ | ✗ | ✔ |

### `customers`
| Campo | Tipo | Notas |
|---|---|---|
| `name` | texto, obligatorio | |
| `nameKey` | texto, índice único por (`company`, `nameKey`) entre los no borrados | Nombre normalizado: minúsculas, sin acentos y sin espacios sobrantes. |
| `phone`, `notes` | texto, opcional | |
| `mergedInto` | relación con `customers`, opcional | Para fusionar duplicados (fase 5). |

> El índice único no puede impedir que se creen duplicados sin conexión. Si al subir choca con el índice, el servidor **no da error**: devuelve el cliente existente y el dispositivo reasigna sus pedidos y tickets a ese cliente (ver 4.3).

### `orders`
| Campo | Tipo | Notas |
|---|---|---|
| `customer` | relación con `customers`, obligatoria | Se crea al vuelo si el nombre no existe. |
| `pickupAt` | fecha y hora | Fecha y hora de recogida. Se guarda en UTC y se muestra en Europe/Madrid. |
| `status` | `pending` \| `ready` \| `delivered` \| `cancelled` | Valores en inglés; las etiquetas (pendiente, preparado, entregado, cancelado) salen de las traducciones. `delivered` y `cancelled` = **archivado**. |
| `deliveredAt` | fecha, opcional | Se rellena al pasar a `delivered`. |
| `important` | booleano | Lo resalta en el calendario. |
| `notes` | texto largo | |

Los totales del pedido **no se guardan**: se calculan a partir de los artículos. Así no hay conflictos de "total" desactualizado.

Borrar un pedido borra (lógicamente) sus artículos **en la misma transacción** del servidor, cada uno con su entrada en el historial. El dispositivo hace lo mismo en local al momento.

### `order_items` (artículos del pedido)
Sustituyen a las "tareas" de la versión 1: cada artículo se prepara y se marca.

| Campo | Tipo | Notas |
|---|---|---|
| `order` | relación con `orders` | |
| `name` | texto | Por ejemplo, "Entrecot de ternera". Con sugerencias de los nombres ya usados en la empresa. |
| `pricing` | `unit` \| `kg` | Precio por unidad o por kilo. |
| `unitPriceCents` | entero | Precio por unidad o por kilo, en céntimos, IVA incluido. |
| `quantity` | entero ≥ 1, por defecto 1 | Solo `unit`: número de unidades. |
| `orderedGrams` | entero, opcional | Solo `kg`: peso **pedido** (estimación), en gramos. Se introduce en kilos con coma (`1,5`) y se guarda `1500`. |
| `weightGrams` | entero, opcional | Solo `kg`: peso **real** pesado al preparar, en gramos. |
| `done` | booleano | Preparado. |
| `position` | número | Orden dentro del pedido. |
| `notes` | texto, opcional | Por ejemplo, "fileteado fino". |

**Cálculo del importe de la línea** (una sola función compartida por la interfaz y el servidor, con pruebas):
- `unit`: `quantity × unitPriceCents`.
- `kg` con peso real: `Math.round(weightGrams × unitPriceCents / 1000)`.
- `kg` sin peso real: estimación `Math.round(orderedGrams × unitPriceCents / 1000)`, mostrada como **"≈"**. Sin `orderedGrams`: 0 y "≈".
- Todas las entradas son enteros no negativos: no hay aritmética con decimales. El medio céntimo redondea hacia arriba.
- Total del pedido = suma de líneas. Si alguna línea es estimada, el total también se marca con "≈".

### `tickets` (deudas)
| Campo | Tipo | Notas |
|---|---|---|
| `customer` | relación con `customers` | |
| `amountCents` | entero | Importe en céntimos. |
| `notes` | texto largo | |
| `photo` | archivo **protegido** (`protected: true`, `thumbs: ["300x0"]`, máx. 5 MB, JPEG/PNG) | Comprimida en el dispositivo (máx. ~1600 px, JPEG ~0,7). Solo se descarga con un token de archivo, que respeta la regla de lectura por empresa. La miniatura de ~300 px para ver sin conexión se guarda en `blobs` en el dispositivo: la genera el dispositivo que hace la foto y los demás la bajan con `?thumb=300x0`. |
| `paid` | booleano | |
| `paidAt` | fecha, opcional | |

### `change_log` (historial de cambios, solo lo escribe el servidor)
| Campo | Tipo | Notas |
|---|---|---|
| `company` | relación | |
| `collection`, `recordId` | texto | Registro afectado. |
| `orderId` | texto, opcional | Para los cambios de `order_items`: así el historial del pedido incluye sus artículos. |
| `version` | entero | Versión resultante. |
| `user` | relación con `users` | Quién. |
| `at` | fecha | Cuándo (hora del servidor). |
| `kind` | `create` \| `update` \| `delete` | |
| `diff` | JSON | `{ campo: [anterior, nuevo] }`. |
| `merged` | booleano | Se aplicó con fusión automática. |
| `forced` | booleano | Se aplicó con "Sobrescribir". |
| `overwrote` | relación con `users`, opcional | Si fue forzado: a quién se sobrescribió. |
| `opId`, `deviceId` | texto | Trazabilidad. |

Lo escribe el hook de subida **dentro de la misma transacción** que el cambio. Lo pueden leer los usuarios de la empresa y no lo puede modificar nadie.

### `sync_ops` (solo servidor)
`opId`, `user`, `processedAt`, `result` (JSON). Índice único por (**`user`, `opId`**). Hace que la subida sea **idempotente**. El resultado guardado solo se devuelve al mismo usuario que hizo la operación.

### `customer_aliases` (solo servidor)
`company`, `aliasId` (único), `customer` (relación). Cuando un `create` de cliente se fusiona con uno existente (mismo `nameKey`), se guarda `aliasId = id del duplicado → customer = id existente`. El hook de subida traduce por esta tabla cualquier referencia a un cliente antes de validarla, así las operaciones del mismo lote o de lotes posteriores que aún apuntan al id duplicado funcionan.

### Tablas solo locales (Dexie, una base de datos por empresa)
- `outbox`: operaciones pendientes de subir.
- `conflicts`: conflictos pendientes de resolver.
- `blobs`: fotos pendientes de subir y miniaturas en caché.
- `meta`: `lastSyncAt`, `cursor` por colección, usuario actual e id del dispositivo.

---

## 4. Protocolo de sincronización

### 4.1 Bajada (servidor → dispositivo)
1. Al arrancar, al volver la conexión y cada 60 s como respaldo: `GET` de cada colección con `filter=company = X && updated >= cursor`, orden `updated,id`, **incluyendo los registros borrados**, paginado. Usar `>=` hace que se repita algún registro: guardar es idempotente (se ignora si la `version` local es igual o mayor).
2. Mientras hay conexión: suscripción en tiempo real a todas las colecciones (el servidor ya filtra por empresa).
3. Cada registro recibido se guarda en Dexie **salvo que** tenga cambios pendientes en la outbox. En ese caso se guarda como "versión del servidor" para detectar el conflicto al subir.
4. Se actualiza `cursor` con el **`updated` más alto recibido** (nunca con el reloj del dispositivo) y `lastSyncAt`.
5. **El `change_log` no se sincroniza**: se consulta con conexión cuando se abre el historial.

### 4.2 Outbox (cambios locales)
Cada modificación desde la interfaz:
1. Se aplica al momento en Dexie (actualización optimista).
2. Añade o fusiona una entrada en la outbox:

```ts
type OutboxOp = {
  opId: string;            // uuid
  company: string;
  collection: string;
  recordId: string;
  kind: 'create' | 'update' | 'delete';
  baseVersion: number | null;          // versión sobre la que se editó (null en create)
  patch: Record<string, unknown>;      // solo campos cambiados
  baseValues: Record<string, unknown>; // valor original de esos campos (para la fusión por campos)
  force?: boolean;
  createdAt: string;
  deviceId: string;
  userId: string;             // quién hizo el cambio en este dispositivo
};
```

- Varias ediciones del mismo registro **se fusionan** en una sola operación, conservando el `baseVersion` y los `baseValues` originales.
- Las fotos se guardan en `blobs` y se suben **después** de que se acepte la operación del registro, con `POST /api/sync/upload/{colección}/{id}` (multipart, campo `photo`). La ruta comprueba usuario activo y empresa, sube `version`, escribe el historial y devuelve el registro. Repetir la subida es inofensivo (sustituye la foto).
- Los valores se **normalizan** antes de guardarlos en `patch` y `baseValues` y antes de compararlos en el servidor (función compartida): fechas en ISO UTC con milisegundos, cadenas sin espacios sobrantes, vacío = `""`/`null` según el campo.

### 4.3 Subida (dispositivo → servidor)
Endpoint propio en `pb_hooks`: `POST /api/sync/push`, con las operaciones por orden de creación. **Cada operación se procesa en su propia transacción** (cambio + `change_log` + `sync_ops`):

| Caso | Resultado |
|---|---|
| Usuario no autenticado, o `company` de la operación o de sus relaciones distinto al del usuario (y no es `platform_admin`) | **Rechazo** `403`. Nunca se aplica. |
| `opId` ya procesado **por el mismo usuario** | Devuelve el resultado guardado (idempotencia). |
| Usuario con `active = false` | **Rechazo** `403` de toda la petición. |
| Colección o campo que no está en la lista de permitidos (`shared/sync/schema.ts`) | **Rechazo** de la operación (`invalid`). Nunca se aplica. |
| `create` | Inserta con el `id` del cliente, `version=1` y `updatedBy=auth`. Si el id ya existe en la misma empresa con el mismo contenido → OK. Si existe con otro contenido o en otra empresa → rechazo `id_taken` **sin devolver ningún dato** del registro existente. |
| `create` de `customers` que choca con el `nameKey` de un cliente existente | OK con `{ mergedInto: idExistente }` y alta en `customer_aliases`. El dispositivo reasigna sus registros locales **y las operaciones pendientes de su outbox** a ese id y descarta el cliente duplicado. |
| `update`, `version` del servidor == `baseVersion` | Aplica el patch, `version++` → **OK**. |
| `update`, versión distinta, pero **para cada campo del patch** el valor del servidor == `baseValues[campo]` | Nadie tocó esos campos: **fusión automática**, aplica el patch, `version++` → **OK (fusionado)**. |
| `update`, versión distinta y algún campo en común con valor diferente | **CONFLICTO**: devuelve el registro actual, `updatedBy` (con nombre), `updated` y los campos en conflicto. No aplica nada. |
| `update` sobre un registro con `deleted=true` | **CONFLICTO** de tipo `deleted_on_server`. |
| `delete` con `version` igual a `baseVersion` | Pone `deleted=true` y `version++` → OK. En `orders`, también sus `order_items`. |
| `delete` con versión distinta | **CONFLICTO** de tipo `modified_on_server`. |
| `force: true` (el usuario eligió sobrescribir) | Aplica sin comprobar la versión, `version++` y en el `change_log` guarda `forced=true` y `overwrote` = el usuario anterior. |

El hook también debe:
- Rechazar cualquier intento del cliente de fijar `version`, `updatedBy` o cambiar `company` de un registro.
- Recalcular siempre `nameKey` a partir de `name` con la función compartida; el cliente no puede fijarlo.
- Las escrituras directas por la API REST estándar están bloqueadas con reglas `null`: **todas las escrituras pasan por `/api/sync/push`** (y por las rutas de subida de fotos y de administración).
- El hook es un **adaptador fino**: la decisión de cada caso de la tabla (`decideOp`), la lista de campos permitidos, la normalización y el cálculo del `diff` son funciones puras de `shared/sync/`, probadas con Vitest sin servidor.

Respuesta de la subida: `{ results: [{ opId, status, ... }] }` con `status` = `ok` \| `merged` \| `conflict` \| `forbidden` \| `invalid` \| `id_taken`; en `ok`/`merged`, la `version` y el `updated` resultantes; en `conflict`, `type` (`fields` \| `deleted_on_server` \| `modified_on_server`), el registro actual, `updatedByName` y los campos en conflicto.

### 4.4 Conflictos en la interfaz
- La operación en conflicto sale de la outbox y pasa a `conflicts`. Las operaciones siguientes **del mismo registro** esperan; las demás siguen.
- Aviso fijo arriba: **"⚠ 2 conflictos por resolver"** → pantalla de conflictos.
- Cada conflicto muestra:
  - _"Este pedido lo modificó **{nombre}** el {fecha y hora} desde otro dispositivo."_
  - Comparación por campos: **tu versión** frente a **la versión actual**.
  - Botones: **Descartar el mío** · **Sobrescribir** (se reenvía con `force: true`).
  - Si se borró en el servidor: **Descartar** · **Volver a crearlo con mis cambios**.
- El mismo flujo se usa cuando el conflicto ocurre con conexión.

### 4.5 Estado de conexión
- **No se usa `navigator.onLine` como fuente de verdad.** "Conectado" = conexión en tiempo real activa y última petición correcta.
- Barra de estado siempre visible:
  - 🟢 _Sincronizado · 14:32_
  - 🟡 _Sin conexión · última sincronización 14:32 · 3 cambios pendientes_
  - 🔴 _2 conflictos por resolver_

### 4.6 Login sin conexión
- Hay que haber iniciado sesión antes al menos una vez en ese dispositivo.
- Token con duración larga (30 días), que se renueva al volver la conexión. Si caduca estando sin conexión, se puede seguir trabajando y se pide el login antes de subir.
- Al cerrar sesión con cambios pendientes: aviso _"Hay 3 cambios sin subir. Si cierras sesión se perderán."_
- La outbox guarda quién hizo cada cambio (`userId`). Si en el dispositivo quedan cambios pendientes de **otro** usuario, no se suben con la sesión actual: el motor los retiene y la app avisa (_"Hay cambios pendientes de {nombre}. Tiene que iniciar sesión para subirlos o hay que descartarlos."_).

### 4.7 Persistencia en iOS
- Al arrancar se llama a `navigator.storage.persist()`.
- Si la app se abre en Safari sin estar instalada: aviso para instalarla en la pantalla de inicio, con instrucciones.

---

## 5. Pantallas y funcionalidad

Interfaz en **catalán y castellano**: selector de idioma en el perfil y, por defecto, el de la empresa. Todos los textos van en archivos de traducción, uno por pantalla e idioma (`src/i18n/ca/*.json`, `src/i18n/es/*.json`); ningún texto escrito directamente en los componentes. Primero móvil, con dos columnas en iPad horizontal y escritorio.

1. **Login.**
2. **Pedidos (inicio)**
   - Calendario mensual: los días con pedidos llevan un punto y los días con pedidos importantes, un color destacado.
   - Por defecto **solo pedidos activos** (`pending` y `ready`). Un interruptor **"Mostrar entregados"** añade los archivados al calendario y a la lista, en gris y tachados, y se recuerda en el dispositivo.
   - Lista de pedidos del día seleccionado, por hora de recogida: cliente, n.º de artículos preparados, total (≈ si es estimado). Se pueden marcar los artículos desde la propia lista.
   - Progreso del día ("5/8 pedidos preparados") y recuento de pedidos entregados en el mes.
   - Botón **Nuevo pedido**.
   - Vista **Archivo**: búsqueda de pedidos entregados y cancelados por cliente o fecha.
3. **Formulario de pedido** (crear y editar)
   - Cliente: campo con sugerencias (búsqueda por `nameKey`). Si no existe → "Crear cliente «X»".
   - Fecha y hora de recogida, importante, estado, notas.
   - **Artículos**: nombre (con sugerencias), por unidad o por kilo, precio, cantidad o kilos pedidos, peso real (al preparar), notas y preparado. Se pueden añadir, reordenar y borrar.
   - Peso: se introduce en kilos con coma (`1,250`) y se guarda en gramos.
   - Total en vivo, con "≈" si falta algún peso real.
   - **Botón "Historial"**: lista cronológica de cambios del pedido y sus artículos (_"Marta · 12/12 10:41 · Hora de recogida: 10:00 → 11:30"_). Las sobrescrituras se marcan (_"sobrescribió cambios de Jordi"_). Solo con conexión; sin conexión: _"El historial necesita conexión"_.
   - **Enter no envía el formulario.** Solo se guarda con el botón.
4. **Tickets pendientes**
   - Agrupados por cliente, con el total por cliente y el total general.
   - Nuevo ticket: cliente, importe (`inputMode="decimal"`, se acepta coma), notas y foto (cámara o galería).
   - Visor de foto a pantalla completa (sin conexión, la miniatura). Marcar como pagado. Historial (igual que en los pedidos).
   - Diálogos con desplazamiento (teclado del iPad). No se cierran al tocar fuera.
   - Mensaje centrado "No hay tickets pendientes" cuando no hay ninguno.
5. **Clientes**: lista, ficha (teléfono, notas, sus pedidos y tickets) y, en la fase 5, fusionar duplicados.
6. **Conflictos** (ver 4.4).
7. **Ajustes de la empresa** (`company_admin` y `platform_admin`): nombre, idioma, destinatarios y hora del correo, usuarios (alta, rol, baja). Botones de "Enviar resumen ahora" y "Exportar JSON".
8. **Administración de la plataforma** (`platform_admin`): lista de empresas, crear empresa y su primer administrador, y **cambiar de empresa** (cambia la base de datos local). El nombre de la empresa activa se ve siempre en la cabecera.

---

## 6. Correo diario y copias de seguridad

### Correo diario (uno por empresa)
- `cronAdd` en `pb_hooks`, cada 15 minutos (el cron va en UTC): calcula la hora de Madrid con `new Timezone("Europe/Madrid")` (el motor de los hooks no tiene `Intl`; el binario lleva las zonas horarias embebidas). Para cada empresa activa cuya `emailHour` sea la hora actual de Madrid y cuyo `lastSummaryDate` no sea hoy, envía su resumen y guarda `lastSummaryDate`.
- Envío mediante la API de Resend con `$http.send`. Clave en `RESEND_API_KEY`.
- **Dependencia del dominio**: Resend necesita un dominio verificado. Mientras no haya dominio, se puede probar con la dirección de pruebas de Resend (solo envía al correo del titular de la cuenta). El envío real a N destinatarios llega cuando haya dominio.
- Contenido, en el idioma de la empresa:
  - Asunto: `{empresa} · Resumen {fecha}`.
  - **Pedidos activos de hoy y de los próximos 7 días**, por día y hora: cliente, estado, artículos (✔/✗, cantidad o peso e importe) y total.
  - **Tickets pendientes** por cliente, con totales.
  - Pie: _"Este resumen refleja lo sincronizado con el servidor. Puede haber cambios pendientes en algún dispositivo sin conexión."_
  - **Adjuntos**: `export-{empresa}-{fecha}.json` (todas las colecciones de la empresa, sin fotos), `pedidos.csv`, `articulos.csv` y `tickets.csv`.
- Si el envío falla, se registra y se guarda `summaryRetryAt` = ahora + 15 min; la siguiente pasada del cron lo reintenta **una vez** (no hay `setTimeout` en los hooks).
- El contenido (modelo del resumen, HTML, CSV y JSON) lo generan funciones puras de `shared/summary/`, con pruebas unitarias. Los nombres de los CSV salen de las traducciones del idioma de la empresa.

### Copias de seguridad
- Copias integradas de PocketBase: **diarias**, en un **S3 externo**, conservando las últimas 30. Incluyen la base de datos y las fotos de todas las empresas.
- **Criterio obligatorio:** haber restaurado una copia en un entorno limpio.

---

## 7. Fases y criterios de aceptación

### Fase 0: Base del proyecto
- Repositorio con Vite + React + TS + Tailwind + shadcn, i18next (ca/es), ESLint/Prettier, Vitest y Playwright.
- `vite-plugin-pwa` con manifiesto e iconos.
- GitHub Actions: lint + pruebas en cada PR.
- ✅ `npm run build` y `npm test` pasan en CI.
- ✅ Un test falla si hay claves de traducción en `ca` que faltan en `es` o al revés.

### Fase 1: Demo solo local (GitHub Pages)
- Pantallas 2 a 5 de la sección 5 funcionando contra Dexie, sin servidor. Una sola empresa de demostración, sin login.
- Artículos con precio por unidad o por kilo, totales y "≈". Archivado y "Mostrar entregados".
- Selector de idioma ca/es.
- `VITE_MODE=demo`: datos de ejemplo cargables y aviso "MODO DEMO, los datos solo están en este dispositivo".
- Workflow de despliegue a GitHub Pages (`base` y alcance del service worker = `/<repo>/`).
- ✅ Pruebas unitarias del cálculo de importes (unidad, kilo con peso real, kilo estimado y redondeos).
- ✅ Se instala en un iPad desde Safari y funciona en **modo avión** tras la primera carga.
- ✅ El carnicero la usa unos días y da su opinión. **Se ajustan las pantallas antes de seguir.**

### Fase 2: Backend, multiempresa y sincronización con conexión
- PocketBase: migraciones con todas las colecciones, reglas de la API por empresa y rol, y hooks de `version`, `updatedBy`, `change_log` y bloqueo de escrituras directas.
- `POST /api/sync/push` con la tabla de casos de la sección 4.3.
- Motor de sincronización en el cliente: bajada, tiempo real y subida, de momento solo con conexión.
- Login, roles, ajustes de empresa, administración de la plataforma y cambio de empresa.
- Historial de pedidos y tickets.
- Dockerfile multietapa: compila el frontend y `shared` (Node), compila PocketBase desde `pb/` (Go), y la imagen final lleva el binario, `pb_public`, `pb_hooks` y `pb_migrations`; volumen `/pb_data`. Docker solo se usa para producción: en desarrollo y en las pruebas se usa el binario local.
- Despliegue en Coolify. **Sin dominio propio todavía**: se usa el dominio provisional que da Coolify (tipo `sslip.io`) solo para pruebas.
- ✅ **Pruebas de aislamiento** (automáticas, contra PocketBase real): un usuario de la empresa A no puede leer, recibir en tiempo real, crear, modificar ni relacionar registros de la empresa B, ni ver sus fotos, ni por la API ni por `/api/sync/push`. Un `platform_admin` sí puede.
- ✅ Un `staff` no puede cambiar los ajustes de la empresa ni gestionar usuarios. Nadie puede registrarse, ni cambiar su propio rol o empresa. Un `company_admin` no puede crear un `platform_admin` ni usuarios de otra empresa.
- ✅ Un usuario dado de baja deja de poder leer y escribir al instante, aunque conserve su token.
- ✅ Un usuario no puede obtener el resultado de un `opId` de otro usuario.
- ✅ Dos dispositivos de la misma empresa ven los cambios del otro en menos de 2 s.
- ✅ Una edición simultánea del mismo campo muestra el conflicto con el nombre del otro usuario.
- ✅ El historial muestra cada cambio con usuario, hora y valores anterior y nuevo.

### Fase 3: Modo sin conexión con edición y conflictos
- Outbox, fusión de operaciones, cola de fotos, pantalla de conflictos, barra de estado y fusión de clientes duplicados creados sin conexión.
- **Batería de pruebas automáticas** contra PocketBase real (binario local), con 2 clientes simulados (A y B):
  1. A sin conexión edita las notas y B, con conexión, edita la hora → se **fusiona** sin preguntar.
  2. A y B, sin conexión, editan el mismo campo → el segundo en subir tiene un **conflicto** con el nombre del primero.
  3. Descartar → A queda igual que el servidor.
  4. Sobrescribir → el servidor queda con lo de A, `version` sube y el historial marca `forced` y a quién sobrescribió.
  5. A edita sin conexión un pedido que B borró → conflicto `deleted_on_server`, y "volver a crearlo" funciona.
  6. A crea sin conexión un pedido con 3 artículos y una foto en un ticket → al reconectar todo llega y B lo ve.
  7. Se corta la conexión a mitad de la subida → al reintentar no se duplica nada.
  8. A marca el artículo 1 y B pesa el artículo 2 del mismo pedido → sin conflicto.
  9. A y B crean sin conexión el cliente "Pepe" → al subir queda un solo cliente y los pedidos de ambos apuntan a él.
  10. 200 operaciones en cola → se suben en orden y sin bloquear la interfaz.
- ✅ Todas las pruebas pasan en CI.
- ✅ Prueba manual en un iPad real en modo avión, editando y reconectando.

### Fase 4: Correo, copias de seguridad y dominio
- Contratar el dominio y apuntarlo al VPS. **El uso real empieza en este dominio** (ver sección 8).
- Verificar el dominio en Resend, cron del correo por empresa, exportación JSON/CSV y copias a S3.
- ✅ El correo llega a 2 destinatarios, a la hora configurada, en el idioma de la empresa, sin caer en spam.
- ✅ Se restaura una copia en una instancia limpia.

### Fase 5: Pulido y uso real
- Fusión manual de clientes duplicados.
- Uso **en paralelo** con el sistema actual durante al menos una semana antes de depender solo de la app.
- Revisión de rendimiento con unos 2.000 pedidos, 10.000 artículos y 500 tickets por empresa. Si la base local crece demasiado: sincronizar solo los archivados de los últimos 90 días y consultar los antiguos con conexión.
- Dar de alta una segunda empresa de prueba y verificar el aislamiento en dispositivos reales.

---

## 8. Despliegue

### VPS
- Proveedor en la UE (por ejemplo, Hetzner, en Alemania o Finlandia), **4 GB de RAM** como mínimo. Ubuntu LTS.
- Cortafuegos: abiertos solo los puertos 22, 80 y 443. El panel de Coolify, solo por HTTPS o por túnel SSH.
- Acceso SSH solo con clave y actualizaciones automáticas de seguridad.

### Coolify
- Recurso: **Dockerfile desde el repositorio de GitHub**, con despliegue automático en cada push a `main`.
- Volumen persistente en `/pb_data`.
- Variables de entorno: `RESEND_API_KEY`, `MAIL_FROM` y credenciales de S3.

### Dominio (pendiente de decidir)
- Hasta la fase 4 se trabaja con el dominio provisional de Coolify, **solo para pruebas**.
- ⚠ Los datos guardados en el dispositivo y la app instalada van ligados al dominio. Al cambiar de dominio hay que reinstalar la app y **se pierden los cambios sin subir**. Por eso: **no se empieza el uso real hasta tener el dominio definitivo.**
- Al ser multiempresa, conviene un dominio de plataforma (no el de la carnicería): por ejemplo, `app.<plataforma>.com`, con todas las empresas bajo la misma URL.

### GitHub Pages (solo demo)
- Workflow independiente que compila con `VITE_MODE=demo` y la `base` correspondiente.
- Repositorio público (o GitHub Pro). Nunca se suben datos reales ni secretos.

---

## 9. CLAUDE.md

Las instrucciones para Claude Code están en [`CLAUDE.md`](../CLAUDE.md), en la raíz del repositorio. Ya no se duplican aquí.

---

## 10. Riesgos y preguntas abiertas

### Riesgos
| Riesgo | Mitigación |
|---|---|
| **Navidad**: pico de encargos en diciembre | Fase 1 rápida para recoger su opinión. El uso real no empieza hasta tener el dominio definitivo, la fase 3 probada en iPad y una semana en paralelo. Con multiempresa y dominio pendiente, lo realista es **uso real en enero** y demo en diciembre. |
| **Una fuga de datos entre empresas** | Aislamiento en el servidor, pruebas automáticas de aislamiento obligatorias en CI y base local separada por empresa. |
| Cambios sin conexión que solo existen en un dispositivo | Aviso de cambios pendientes siempre a la vista, almacenamiento persistente, app instalada y aviso al cerrar sesión. |
| Cambio de dominio cuando ya se usa | No hay uso real hasta tener el dominio definitivo. |
| Clientes duplicados creados sin conexión | Fusión automática por `nameKey` al subir y fusión manual (fase 5). |
| El historial crece mucho | Revisar en la fase 5; se puede purgar o resumir lo que tenga más de 1 año. |
| Fallo del VPS | Correo diario con exportación y copia diaria externa con restauración probada. |
| Mantenimiento recae en una sola persona | Todo como código y despliegue automático. |
| **PocketBase** está en versión 0.x, lo mantiene una sola persona y en octubre de 2026 se mudó de GitHub a un servidor propio | Versión fijada (v0.40.6) y compilada desde el módulo Go, cuyo código queda verificado por `go.sum` y conservado en el proxy de Go. La lógica propia está en funciones puras de `shared/`, no atada a PocketBase. Los datos son SQLite y hay exportación JSON diaria: salir de PocketBase sería reescribir el adaptador, no los datos. Actualizar de versión es una tarea explícita, nunca automática. |

### Supuestos tomados (corregir si no son así)
1. Los **artículos sustituyen a las tareas**: cada artículo se marca como preparado.
2. Los precios se introducen con **IVA incluido** y se escriben a mano en cada pedido (sin catálogo).
3. En los artículos por kilo hay **kilos pedidos** (estimación) y **peso real** (al preparar); el importe usa el real si existe.
4. Roles: `staff`, `company_admin` y `platform_admin`.
5. "Archivado" = estado `delivered` o `cancelled`, sin campo aparte.
6. Las unidades son **enteras** (no hay "media unidad": eso se vende por kilo o se explica en las notas).
7. El pedido **no lleva marca de pagado** (pregunta abierta 1): las deudas se gestionan con los tickets. Si la respuesta es otra, se añade un campo con una migración.
8. Los usuarios no se borran, se dan de baja (`active: false`).

### Preguntas abiertas
1. ¿El pedido necesita marcar si está **pagado**, o eso se gestiona con los tickets?
2. ¿Hace falta un **catálogo de productos** con precio por empresa a corto plazo?
3. ¿Nombre de la plataforma y dominio? Hace falta para la fase 4.
