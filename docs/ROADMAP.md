# Pedidator: roadmap de ejecución por pasos

_Versión 1 · 21/11/2026 · Acompaña a [SPEC.md](SPEC.md) v3 y a [POCKETBASE.md](POCKETBASE.md)._

Cada paso está pensado para lanzarlo con **un subagente de un modelo pequeño o medio**: tiene un objetivo cerrado, una lista de archivos, lo que no debe tocar y una comprobación automática. Las decisiones difíciles ya están tomadas en la SPEC; el subagente ejecuta, no diseña.

## 1. Cómo se usa

### Niveles de modelo
| Nivel | Modelo | Para qué |
|---|---|---|
| `haiku` | Haiku | Trabajo mecánico con patrón claro: scaffolding, pantallas sencillas, configuración, documentación. |
| `sonnet` | Sonnet | Lógica con casos límite: repositorios, sincronización, hooks, pantallas con mucho estado, tests de escenario. |
| **Puerta** | Sesión principal (el modelo más capaz) + persona | Revisión entre bloques. No se delega. |

Si un paso falla dos veces con su nivel, se relanza una vez con el nivel siguiente. Si vuelve a fallar, el paso está mal definido: se corrige aquí antes de insistir.

### Plantilla del prompt de cada subagente
```
Trabajas en el repositorio Pedidator. Ejecuta SOLO el paso <ID> de docs/ROADMAP.md.

1. Lee CLAUDE.md y el paso <ID> de docs/ROADMAP.md. Lee de docs/SPEC.md solo las secciones que cita el paso.
   Si el paso toca pb/ o tests de integración, lee docs/POCKETBASE.md entero antes de escribir código.
2. Toca únicamente los archivos listados en "Archivos". Si necesitas cambiar otro archivo o un contrato
   (tipos de shared/, esquema, formato de /api/sync/push), PARA y explícalo en tu informe.
3. No añadas dependencias que el paso no nombre. Todo texto de interfaz va en src/i18n, en ca y en es.
4. Ejecuta los comandos de "Hecho cuando" y pega su salida final. Si algo falla y no lo arreglas, dilo.
5. Haz un commit: "<tipo>(<ID>): <resumen en inglés>". No hagas push ni abras PR.
6. Informe final: archivos cambiados, comandos ejecutados y resultado, criterios verificados,
   criterios NO verificados, dudas o supuestos que has tomado.
```

### Reglas del orquestador
- Un paso = un subagente = un commit. No se mezclan pasos.
- El orquestador **vuelve a ejecutar** los comandos de "Hecho cuando" y lee el diff antes de marcar el paso. El informe del subagente no es prueba.
- Los pasos de una misma fila de "En paralelo" se pueden lanzar a la vez, cada uno en su worktree. Fuera de esas filas, en orden.
- Al cerrar cada paso: marcar la casilla de la sección 2 y añadir la línea al `CHANGELOG.md`.
- En las **puertas** se para: revisión de código, de seguridad donde se indique, y las pruebas manuales. No se empieza el bloque siguiente con una puerta abierta.
- Los contratos (sección 3) solo los cambia el orquestador, con un commit propio.

### Entorno (comprobado en la sesión cloud)
- Node 22 y Go están instalados. `go build` baja solo el toolchain 1.27.3 y el módulo de PocketBase por el proxy de Go (≈30 s la primera vez).
- No hay Docker en marcha y **no hace falta** hasta el despliegue.
- Chromium y Playwright ya están instalados: no ejecutar `playwright install`. Lanzar los e2e con `--trace off`.
- `pocketbase.io` no es accesible: la referencia es `docs/POCKETBASE.md` y el `types.d.ts` del módulo.

## 2. Estado

| Bloque | Pasos |
|---|---|
| Fase 0 | ☐ F0-1 · ☐ F0-2 · ☐ F0-3 · ☐ F0-4 · ☐ **Puerta G0** |
| Fase 1 | ☐ F1-1 · ☐ F1-2 · ☐ F1-3 · ☐ F1-4 · ☐ F1-5 · ☐ F1-6 · ☐ F1-7 · ☐ F1-8 · ☐ F1-9 · ☐ F1-10 · ☐ **Puerta G1** |
| Fase 2 servidor | ☐ F2-1 · ☐ F2-2 · ☐ F2-3 · ☐ F2-4 · ☐ F2-5 · ☐ F2-6 · ☐ F2-7 · ☐ **Puerta G2** |
| Fase 2 cliente | ☐ F2-8 · ☐ F2-9 · ☐ F2-10 · ☐ F2-11 · ☐ F2-12 · ☐ F2-13 · ☐ F2-14 · ☐ F2-15 · ☐ **Puerta G3** |
| Fase 3 | ☐ F3-1 · ☐ F3-2 · ☐ F3-3 · ☐ F3-4 · ☐ F3-5 · ☐ F3-6 · ☐ F3-7 · ☐ **Puerta G4** |
| Fase 4 | ☐ F4-1 · ☐ F4-2 · ☐ F4-3 · ☐ F4-4 · ☐ **Puerta G5** |
| Fase 5 | ☐ F5-1 · ☐ F5-2 · ☐ **Puerta G6** |

En paralelo (el resto, en orden):

| Después de | Se pueden lanzar a la vez |
|---|---|
| F0-1 | F0-2, F0-3 |
| F1-3 | F1-4, F1-6, F1-7, F1-8 (F1-5 después de F1-4) |
| G1 | F2-1, F2-3 |
| F2-5 | F2-6, F2-14 |
| F2-10 | F2-11, F2-12, F2-13 |
| F3-3 | F3-4, F3-5, F3-6 |
| F4-1 | F4-2, F4-4 |

## 3. Contratos (no se cambian dentro de un paso)

Estructura de carpetas:
```
shared/            TypeScript puro compartido (UI + hooks). Sin imports de src/, Node ni navegador.
  types.ts  pricing.ts  format.ts  nameKey.ts  permissions.ts  index.ts
  sync/     schema.ts  normalize.ts  decide.ts  diff.ts
  summary/  model.ts  render.ts  csv.ts
src/
  lib/id.ts
  i18n/{ca,es}/<pantalla>.json     un archivo por pantalla, para no pisarse entre pasos
  data/       db.ts  mutate.ts  session.ts  repo/*.ts  hooks.ts      (único sitio que importa dexie)
  sync/       engine.ts  pull.ts  push.ts  transport.ts  connectivity.ts  api/*.ts   (único sitio, con auth/, que importa pocketbase)
  auth/       session.ts
  components/ pages/
pb/
  go.mod  main.go
  pb_migrations/*.js
  pb_hooks/*.pb.js   pb_hooks/lib/shared.js (generado, en .gitignore)
tests/integration/   Vitest contra PocketBase real
e2e/                 Playwright
```

Firmas que fija F1-1 y que usan todos los demás:
```ts
// shared/types.ts — campos comunes de SPEC §3 + los de cada colección
type Base = { id: string; company: string; version: number; updatedBy: string; deleted: boolean; created: string; updated: string }
type OrderStatus = 'pending' | 'ready' | 'delivered' | 'cancelled'
type Customer, Order, OrderItem, Ticket      // = Base & campos de SPEC §3
type CollectionName = 'customers' | 'orders' | 'order_items' | 'tickets'

// shared/pricing.ts
lineCents(item: Pick<OrderItem,'pricing'|'unitPriceCents'|'quantity'|'orderedGrams'|'weightGrams'>): { cents: number; estimated: boolean }
orderTotal(items: OrderItem[]): { cents: number; estimated: boolean }     // ignora deleted

// shared/format.ts
parseMoney(input: string): number | null     // "12,50" | "12.5" | "12" -> 1250 ; inválido -> null
parseKg(input: string): number | null        // "1,250" -> 1250 gramos
formatMoney(cents: number, locale: 'ca'|'es'): string    // "12,50 €"
formatKg(grams: number): string              // "1,250"

// shared/nameKey.ts
nameKey(name: string): string                // minúsculas, sin acentos, espacios colapsados

// src/lib/id.ts
newId(): string                              // 15 chars [a-z0-9], crypto.getRandomValues
```

Formato de la subida (lo fijan F2-3 y F2-4): `OutboxOp` de SPEC §4.2 y la respuesta de SPEC §4.3.

---

## 4. Fase 0: base del proyecto

### F0-1 · Scaffold · `haiku`
- **Objetivo:** proyecto Vite + React + TypeScript que compila, con Tailwind, shadcn/ui, ESLint, Prettier y Vitest.
- **Archivos:** `package.json`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `.prettierrc`, `.gitignore`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/App.test.tsx`, `components.json`, `CHANGELOG.md`.
- **Tareas:**
  1. Plantilla `react-ts` de Vite en la raíz (sin borrar `docs/`, `CLAUDE.md`, `README.md`).
  2. Tailwind con `@tailwindcss/vite`; `npx shadcn@latest init`. Alias `@/` → `src/` y `@shared/` → `shared/`.
  3. Vitest con `jsdom` y Testing Library; un test que renderiza `App`.
  4. Scripts: `dev`, `build`, `preview`, `lint`, `typecheck`, `test` (`vitest run`), `check` (= lint + typecheck + test).
  5. `.gitignore`: `node_modules`, `dist`, `.bin`, `pb_data`, `pb/pb_hooks/lib`, `test-results`, `playwright-report`.
- **Hecho cuando:** `npm run check && npm run build` terminan sin errores.

### F0-2 · Idiomas · `haiku`
- **Lee:** SPEC §5 (primer párrafo).
- **Archivos:** `src/i18n/index.ts`, `src/i18n/{ca,es}/common.json`, `src/i18n/parity.test.ts`, `src/i18n/resolveLocale.ts` (+ test), `eslint.config.js`, `src/App.tsx`.
- **Tareas:**
  1. `i18next` + `react-i18next`. Carga todos los `src/i18n/<idioma>/*.json` como namespaces (con `import.meta.glob`).
  2. `resolveLocale(userLocale, companyLocale, stored)`: el primero no vacío; por defecto `ca`.
  3. Test de paridad: para cada namespace, el conjunto de claves (anidadas) de `ca` y `es` es idéntico, y no hay valores vacíos.
  4. `eslint-plugin-i18next` con `no-literal-string` en JSX de `src/` (excepto tests).
- **Hecho cuando:** `npm run check` pasa; quitar una clave de `es/common.json` hace fallar el test de paridad (compruébalo y restáurala).

### F0-3 · PWA y Playwright · `haiku`
- **Archivos:** `vite.config.ts`, `public/icons/*`, `playwright.config.ts`, `e2e/smoke.spec.ts`, `package.json`.
- **Tareas:**
  1. `vite-plugin-pwa`: manifiesto (nombre "Pedidator", `display: standalone`, iconos 192/512 y maskable), precache de la app, `navigateFallback` a `index.html`. `base` desde `VITE_BASE` (por defecto `/`).
  2. Playwright con `webServer` = `npm run build && npm run preview`. Script `e2e`.
  3. `e2e/smoke.spec.ts`: la app carga; tras cargar, con `context.setOffline(true)` y recargar, sigue cargando.
- **Hecho cuando:** `npm run e2e -- --trace off` pasa.

### F0-4 · CI y reglas de arquitectura · `haiku`
- **Archivos:** `.github/workflows/ci.yml`, `eslint.config.js`.
- **Tareas:**
  1. CI en cada PR y en `main`: Node 22, `npm ci`, `npm run check`, `npm run build`, e2e smoke.
  2. `no-restricted-imports` por zonas: `pocketbase` solo en `src/sync/**` y `src/auth/**`; `dexie` y `dexie-react-hooks` solo en `src/data/**`; dentro de `shared/**` prohibido importar de `src/**`, `node:*`, `react`, `dexie`, `pocketbase`.
- **Hecho cuando:** `npm run check` pasa; un import de prueba de `dexie` en `src/App.tsx` hace fallar el lint (compruébalo y quítalo).

### Puerta G0
CI en verde en GitHub. Criterios de SPEC §7 fase 0 verificados.

---

## 5. Fase 1: demo solo local

### F1-1 · Dominio compartido · `sonnet`
- **Lee:** SPEC §3 (todas las tablas de colecciones y "Cálculo del importe"), sección 3 de este documento.
- **Archivos:** `shared/types.ts`, `shared/pricing.ts`, `shared/format.ts`, `shared/nameKey.ts`, `shared/index.ts`, sus `*.test.ts`, `src/lib/id.ts` (+ test).
- **Tareas:** implementar exactamente las firmas de la sección 3. Tests por tabla de casos:
  - `lineCents`: unidad (cantidad por defecto 1), kilo con peso real, kilo estimado, kilo sin ningún peso (0, estimado), redondeo (`1999 c/kg × 1250 g = 2499`; un caso que acabe en ,5 redondea hacia arriba).
  - `orderTotal`: suma, `estimated` si alguna línea lo es, ignora borrados.
  - `parseMoney` / `parseKg`: coma y punto, espacios, vacío, negativos y texto → `null`; más de 2 (dinero) o 3 (kilos) decimales → `null`.
  - `nameKey`: `"  José   Pérez "` → `"jose perez"`; `ç`, `ñ`, `l·l` y mayúsculas.
  - `newId`: longitud, juego de caracteres, 10 000 ids sin repetir.
- **No hagas:** nada de sync ni de Dexie.
- **Hecho cuando:** `npm run check` pasa.

### F1-2 · Base local y repositorios · `sonnet`
- **Lee:** SPEC §2 (regla de oro), §3 ("Tablas solo locales"), §4.2.
- **Dependencias nuevas:** `dexie`, `dexie-react-hooks`, `fake-indexeddb` (dev).
- **Archivos:** `src/data/db.ts`, `src/data/session.ts`, `src/data/mutate.ts`, `src/data/repo/{customers,orders,orderItems,tickets,blobs}.ts`, `src/data/hooks.ts`, tests junto a cada archivo.
- **Tareas:**
  1. `openCompanyDb(companyId)` → base `pedidator-{companyId}` con tablas `customers`, `orders`, `order_items`, `tickets`, `outbox`, `conflicts`, `blobs`, `meta`. Índices: `id`; `orders` por `pickupAt`, `status`, `customer`; `order_items` por `order`; `tickets` por `customer`, `paid`; `customers` por `nameKey`; `outbox` por `createdAt` y por `[collection+recordId]`.
  2. `session.ts`: contexto `{ companyId, userId, deviceId, syncEnabled }`. En demo: empresa `demo`, `syncEnabled: false`.
  3. `mutate.ts`: **único** punto de escritura. `create`, `update(patch)`, `softDelete`. Aplica el cambio en Dexie y, si `syncEnabled`, añade o fusiona la operación en `outbox` dentro de la misma transacción Dexie, según SPEC §4.2: update sobre update fusiona `patch` y conserva `baseVersion` y `baseValues` originales; update sobre create se integra en el create; delete sobre create aún no subido elimina ambos.
  4. Repositorios: funciones con nombre de negocio (`createOrder`, `setItemDone`, `markTicketPaid`, `getOrCreateCustomerByName` que busca por `nameKey`, `deleteOrder` que borra también sus artículos…). `hooks.ts`: consultas con `useLiveQuery` (pedidos de un día, de un mes, tickets pendientes agrupados, sugerencias de nombres de artículo y de cliente).
  5. Fechas en ISO UTC. Nada de borrado físico.
- **Hecho cuando:** `npm run check` pasa, con tests de cada regla de fusión de la outbox y de `getOrCreateCustomerByName`.

### F1-3 · Estructura de la app · `haiku`
- **Lee:** SPEC §5 (párrafo inicial y lista de pantallas).
- **Dependencias nuevas:** `react-router-dom`, `date-fns`, componentes shadcn necesarios.
- **Archivos:** `src/App.tsx`, `src/routes.tsx`, `src/components/layout/*`, `src/components/form/SafeForm.tsx`, `src/components/ui/AppDialog.tsx`, `src/pages/*Page.tsx` (vacías con título), `src/i18n/{ca,es}/{common,orders,orderForm,archive,tickets,customers}.json`.
- **Tareas:**
  1. Rutas: `/` pedidos, `/orders/new`, `/orders/:id`, `/archive`, `/tickets`, `/customers`, `/customers/:id`. Una página vacía por ruta y su namespace de traducciones ya creado.
  2. Layout: cabecera con el nombre de la empresa, hueco para la barra de estado, navegación inferior en móvil y lateral desde `md`. Aviso "MODO DEMO" si `VITE_MODE=demo`. Selector de idioma ca/es (se guarda en el dispositivo).
  3. `SafeForm`: Enter no envía (excepto en `textarea`, donde hace salto de línea). `AppDialog`: no se cierra al tocar fuera y su contenido tiene scroll.
- **Hecho cuando:** `npm run check` pasa; test de `SafeForm` (Enter no dispara `onSubmit`).

### F1-4 · Pedidos (inicio) · `sonnet`
- **Lee:** SPEC §5 punto 2.
- **Archivos:** `src/pages/OrdersPage.tsx`, `src/components/orders/{MonthCalendar,DayOrderList,OrderCard,DayProgress}.tsx`, `src/lib/dates.ts` (+ test), `src/i18n/{ca,es}/orders.json`.
- **Tareas:** calendario mensual (punto en días con pedidos, color en días con importantes); interruptor "Mostrar entregados" recordado en el dispositivo; lista del día por hora con cliente, artículos preparados `n/m` y total (≈ si estimado); marcar artículos desde la lista; progreso del día y recuento de entregados del mes; botón "Nuevo pedido". `dates.ts`: día de Madrid de una fecha UTC y rango UTC de un día y de un mes de Madrid (con tests en cambio de hora de marzo y octubre).
- **Hecho cuando:** `npm run check` pasa, con tests de `dates.ts` y de la lista (pedido archivado oculto y visible con el interruptor).

### F1-5 · Formulario de pedido · `sonnet`
- **Lee:** SPEC §5 punto 3 (sin el historial).
- **Archivos:** `src/pages/OrderFormPage.tsx`, `src/components/orders/{CustomerPicker,ItemsEditor,ItemRow,OrderTotal}.tsx`, `src/i18n/{ca,es}/orderForm.json`.
- **Tareas:** crear y editar; cliente con sugerencias y "Crear cliente «X»"; fecha, hora, importante, estado, notas; artículos (nombre con sugerencias, unidad/kilo, precio, cantidad o kilos pedidos, peso real, notas, preparado; añadir, reordenar con botones subir/bajar, borrar); total en vivo. Guardar solo con el botón; al pasar a `delivered` se rellena `deliveredAt`. Entradas de dinero y peso con `parseMoney`/`parseKg` y `inputMode="decimal"`.
- **Hecho cuando:** `npm run check` pasa, con test de crear un pedido con un artículo por kilo sin peso real (total con ≈) y de que el total cambia al poner el peso.

### F1-6 · Archivo · `haiku`
- **Lee:** SPEC §5 punto 2 ("Vista Archivo").
- **Archivos:** `src/pages/ArchivePage.tsx`, `src/i18n/{ca,es}/archive.json`.
- **Tareas:** lista de pedidos `delivered` y `cancelled` con búsqueda por cliente (por `nameKey`) y rango de fechas; enlaza al formulario.
- **Hecho cuando:** `npm run check` pasa con un test de filtro.

### F1-7 · Tickets · `sonnet`
- **Lee:** SPEC §3 `tickets`, §5 punto 4 (sin historial).
- **Dependencias nuevas:** `browser-image-compression`.
- **Archivos:** `src/pages/TicketsPage.tsx`, `src/components/tickets/{TicketGroup,TicketDialog,PhotoViewer}.tsx`, `src/lib/photo.ts`, `src/i18n/{ca,es}/tickets.json`.
- **Tareas:** agrupados por cliente con total por cliente y total general; mensaje centrado si no hay; alta (cliente, importe, notas, foto de cámara o galería); la foto se comprime (máx. 1600 px, JPEG 0,7) y se genera miniatura de 300 px; ambas van a `blobs`; visor a pantalla completa; marcar pagado (rellena `paidAt`).
- **Hecho cuando:** `npm run check` pasa con test de agrupación y totales.

### F1-8 · Clientes · `haiku`
- **Lee:** SPEC §5 punto 5.
- **Archivos:** `src/pages/{CustomersPage,CustomerPage}.tsx`, `src/i18n/{ca,es}/customers.json`.
- **Tareas:** lista con búsqueda; ficha con teléfono y notas editables y sus pedidos y tickets. Sin fusión (es de la fase 5).
- **Hecho cuando:** `npm run check` pasa.

### F1-9 · Datos de demo, instalación y GitHub Pages · `haiku`
- **Lee:** SPEC §4.7, §7 fase 1, §8 "GitHub Pages".
- **Archivos:** `src/demo/seed.ts`, `src/components/layout/{DemoBanner,InstallHint}.tsx`, `src/main.tsx`, `.github/workflows/pages.yml`, `src/i18n/{ca,es}/common.json`.
- **Tareas:** botones "Cargar datos de ejemplo" y "Borrar datos" en modo demo (pedidos repartidos por el mes actual, algunos importantes, entregados y tickets); `navigator.storage.persist()` al arrancar; aviso de instalación en Safari de iOS cuando no está instalada; workflow que compila con `VITE_MODE=demo` y `VITE_BASE=/pedidator/` y publica en Pages.
- **Hecho cuando:** `npm run check` y `VITE_MODE=demo VITE_BASE=/pedidator/ npm run build` pasan.

### F1-10 · Pruebas de extremo a extremo de la demo · `sonnet`
- **Archivos:** `e2e/demo.spec.ts`.
- **Tareas:** en modo demo: crear pedido con dos artículos (uno por kilo) y verlo en el calendario; marcar artículo; entregarlo y comprobar que desaparece y vuelve con "Mostrar entregados"; crear ticket y marcarlo pagado; cambiar de idioma; recargar sin conexión y comprobar que los datos siguen.
- **Hecho cuando:** `npm run e2e -- --trace off` pasa. Si un test descubre un fallo de la app, arréglalo solo si es de una línea; si no, descríbelo en el informe.

### Puerta G1
- Revisión de código de toda la fase (`/code-review`).
- **Manual:** instalar en un iPad desde Safari y usar en modo avión. El carnicero la usa unos días. **Se ajustan las pantallas antes de seguir** y se responde la pregunta abierta 1 de SPEC §10.

---

## 6. Fase 2: servidor

Todos los pasos de este bloque leen `docs/POCKETBASE.md` entero.

### F2-1 · PocketBase local y arnés de pruebas · `sonnet`
- **Archivos:** `pb/go.mod`, `pb/go.sum`, `pb/main.go`, `scripts/pb-build.mjs`, `scripts/build-shared.mjs`, `vitest.integration.config.ts`, `tests/integration/setup/{global,helpers}.ts`, `tests/integration/health.test.ts`, `pb/pb_hooks/health.pb.js`, `package.json`, `.github/workflows/ci.yml`.
- **Dependencias nuevas:** `esbuild`, `pocketbase` (SDK JS), `eventsource` (dev, para tiempo real en Node).
- **Tareas:**
  1. `pb/go.mod` y `pb/main.go` copiados de POCKETBASE.md §1; `go mod tidy`.
  2. Scripts: `pb:build` (compila a `.bin/pocketbase` solo si falta o cambió `pb/go.mod`/`main.go`), `build:shared` (esbuild de POCKETBASE.md §2), `pb` (build:shared + pb:build + `serve` con `--dir pb_data`), `test:integration`.
  3. `global.ts`: build:shared, pb:build, directorio temporal, `superuser upsert`, `serve` en puerto libre, espera a `/api/health`, mata el proceso al acabar.
  4. `helpers.ts`: `superuserToken()`, `createCompany()`, `createUser({company, role, active})`, `login()`, `push(token, ops)`, `api(token, method, path, body)`. Nombres únicos por llamada.
  5. `health.pb.js`: ruta `GET /api/internal/shared-check` que hace `require` del bundle y devuelve `nameKey("José")` (demuestra que el bundle carga). `health.test.ts` la comprueba.
  6. CI: `actions/setup-go` con caché y `npm run test:integration`.
- **Hecho cuando:** `npm run check && npm run test:integration` pasan.

### F2-2 · Migraciones y reglas · `sonnet`
- **Lee:** SPEC §2 "Multiempresa", §3 completo.
- **Archivos:** `pb/pb_migrations/1_companies_users.js`, `2_business.js`, `3_server_only.js`, `tests/integration/schema.test.ts`.
- **Tareas:**
  1. Todas las colecciones de SPEC §3 con sus campos, campos comunes y `autodate`. Reglas de lectura estándar de POCKETBASE.md §5; reglas de escritura `null` en **todas**. `companies`: lectura con `id = @request.auth.company`. `users`: ampliación de POCKETBASE.md §4.
  2. `change_log`: lectura por empresa. `sync_ops` y `customer_aliases`: todas las reglas `null`.
  3. Índices: único parcial de `customers`; (`company`, `updated`) en las cuatro colecciones sincronizables; `order_items(order)`; `change_log(company, recordId)` y `(company, orderId)`; único `sync_ops(user, opId)`; único `customer_aliases(aliasId)`.
  4. `tickets.photo` protegido con `thumbs: ["300x0"]`, 5 MB, JPEG/PNG.
- **Hecho cuando:** `npm run test:integration` pasa con tests de: registro público 403; un usuario no puede hacer `PATCH` de su `role` ni de su `company` (403); `POST` REST a cada colección sincronizable 403; login de usuario inactivo falla; un usuario lista solo los usuarios de su empresa.

### F2-3 · Núcleo de sincronización (funciones puras) · `sonnet`
- **Lee:** SPEC §4.2 y §4.3 completos.
- **Archivos:** `shared/sync/{schema,normalize,decide,diff,index}.ts` y sus tests, `shared/index.ts`.
- **Tareas:**
  1. `schema.ts`: por colección, campos que el cliente puede escribir (nunca `id`, `company`, `version`, `updatedBy`, `nameKey`, `created`, `updated`, `photo`), tipo de cada campo, obligatorios en `create`, y relaciones (`campo → colección`). `validateOp(op)` → `{ ok } | { ok: false, reason }` (colección desconocida, campo no permitido, tipo incorrecto, entero negativo, id con formato inválido).
  2. `normalize.ts`: `normalizeValue(fieldType, value)` (fechas a ISO UTC con milisegundos aceptando también el formato de PocketBase `2026-12-12 10:00:00.000Z`; textos recortados; `null`/`undefined` → vacío del tipo) y `valuesEqual`.
  3. `decide.ts`: `decideOp(server: ServerRecord | null, op: OutboxOp)` → una de: `create` · `noop_same_create` · `id_taken` · `apply` · `merge` · `conflict{type, fields}` · `soft_delete` · `force_apply`. Cubre **cada fila** de la tabla de SPEC §4.3 que no depende de base de datos (auth, empresa, idempotencia y `nameKey` van en el hook).
  4. `diff.ts`: `{ campo: [anterior, nuevo] }` solo de campos que cambian.
- **Hecho cuando:** `npm run check` pasa con un test por fila de la tabla de §4.3, y `force` sobre registro borrado, y fechas iguales en formatos distintos que no dan conflicto.

### F2-4 · Ruta de subida · `sonnet`
- **Lee:** SPEC §3 `change_log` y `sync_ops`, §4.3.
- **Archivos:** `pb/pb_hooks/sync.pb.js`, `tests/integration/push.test.ts`.
- **Tareas:** `POST /api/sync/push` como adaptador fino sobre `shared/sync`:
  1. `requireAuth("users")` + comprobar `active`. Máximo 200 operaciones por petición.
  2. Por operación, en su propia transacción: empresa (la del usuario; el `platform_admin` usa la de la operación, que debe existir) → `validateOp` → idempotencia por (`user`, `opId`) → cargar el registro → `decideOp` → aplicar → `change_log` → `sync_ops`.
  3. El servidor fija `version`, `updatedBy`, `company`; en `customers` recalcula `nameKey`.
  4. `change_log` con `diff`, `kind`, `merged`, `forced`, `overwrote`, `opId`, `deviceId`, y `orderId` en los cambios de `order_items`.
  5. Respuesta con el formato de SPEC §4.3. En `conflict`, `updatedByName`.
  6. Una operación rechazada o en conflicto no impide procesar las demás.
- **No hagas todavía:** fusión de clientes por `nameKey`, alias, comprobación de relaciones, borrado en cascada, fotos (son F2-5).
- **Hecho cuando:** `npm run test:integration` pasa con un test por fila de la tabla de §4.3 (salvo las de F2-5), repetición del mismo `opId`, y que el historial queda escrito.

### F2-5 · Relaciones, alias, cascada y fotos · `sonnet`
- **Lee:** SPEC §3 `customers` y `customer_aliases`, §4.2 (fotos), §4.3.
- **Archivos:** `pb/pb_hooks/sync.pb.js`, `pb/pb_hooks/upload.pb.js`, `tests/integration/{push-relations,upload}.test.ts`.
- **Tareas:**
  1. Antes de validar relaciones, traducir los ids de cliente por `customer_aliases`. Toda relación debe existir y ser de la misma empresa; si no, `forbidden`.
  2. `create` de `customers` con `nameKey` existente (no borrado) en la empresa → `ok` con `mergedInto` + alta del alias, sin crear registro.
  3. `delete` de un pedido: borrado lógico de sus artículos en la misma transacción, cada uno con su `change_log`.
  4. `POST /api/sync/upload/{collection}/{id}` (POCKETBASE.md §8): solo `tickets`/`photo`; usuario activo y misma empresa; `version++`, `change_log`, devuelve el registro.
- **Hecho cuando:** `npm run test:integration` pasa con tests de: lote con "crear cliente duplicado" + "crear pedido con el id duplicado" → el pedido queda apuntando al cliente existente; relación a un cliente de otra empresa → `forbidden`; cascada; subida correcta; subida a ticket de otra empresa 403; `PATCH` REST con archivo 403; foto sin token 404, con token de la empresa 200, con token de otra empresa 404.

### F2-6 · Rutas de administración · `sonnet`
- **Lee:** SPEC §3 `companies`, `users` (reglas y tabla de permisos).
- **Archivos:** `shared/permissions.ts` (+ test), `pb/pb_hooks/admin.pb.js`, `tests/integration/admin.test.ts`.
- **Tareas:**
  1. `permissions.ts` (puro): `canManageUser(actor, target, changes)`, `canEditCompany(actor, companyId)`, `canCreateCompany(actor)` según SPEC §3.
  2. Rutas: `POST /api/admin/users`, `PATCH /api/admin/users/{id}` (nombre, rol, `active`, contraseña nueva), `PATCH /api/admin/companies/{id}` (nombre, idioma, destinatarios, hora), `POST /api/admin/companies` (empresa + primer `company_admin`), `PATCH /api/account` (nombre, idioma, contraseña con la actual).
  3. Baja o cambio de contraseña → `refreshTokenKey()`.
  4. Validar correos de `emailRecipients` y `emailHour` 0–23.
- **Hecho cuando:** `npm run check && npm run test:integration` pasan con tests de: `staff` no puede nada de administración; `company_admin` no crea `platform_admin` ni usuarios de otra empresa ni edita otra empresa; nadie cambia su propio rol ni se da de baja; tras la baja, el token antiguo no lee ni hace push; `PATCH /api/account` con contraseña actual incorrecta falla.

### F2-7 · Batería de aislamiento · `sonnet`
- **Lee:** SPEC §7 fase 2 (criterios ✅). **No leas la implementación de los hooks antes de escribir los tests**: escríbelos desde la SPEC.
- **Archivos:** `tests/integration/isolation.test.ts`.
- **Tareas:** con empresas A y B y un usuario en cada una, comprobar que A no puede, sobre datos de B: listar ni ver ninguna colección (incluidas `users`, `companies`, `change_log`); recibir eventos de tiempo real; crear, modificar ni borrar por REST; crear, modificar, borrar ni relacionar por `/api/sync/push` (también con `company` de B en la operación y con ids de registros de B); subir ni descargar fotos; obtener el resultado de un `opId` de B. Y que un `platform_admin` sí puede leer y escribir en ambas.
- **Hecho cuando:** `npm run test:integration` pasa. Si un test falla por un fallo del servidor, **no lo ajustes para que pase**: déjalo fallando y descríbelo en el informe.

### Puerta G2 (seguridad)
- `/security-review` sobre `pb/` y `shared/`. Revisión manual de cada regla de las migraciones y de cada ruta: ¿comprueba `active`?, ¿comprueba empresa?, ¿devuelve algún dato de otra empresa en un error?
- Fallos de F2-7 resueltos. No se empieza el cliente con esta puerta abierta.

---

## 7. Fase 2: cliente

### F2-8 · Sesión y login · `sonnet`
- **Lee:** SPEC §4.6, §5 punto 1.
- **Archivos:** `src/auth/session.ts`, `src/sync/api/client.ts`, `src/pages/LoginPage.tsx`, `src/components/layout/*`, `src/data/session.ts`, `src/i18n/{ca,es}/auth.json`.
- **Tareas:** login con el SDK (solo dentro de `src/auth` y `src/sync`); la sesión guarda usuario, rol y empresa en el dispositivo para arrancar sin conexión; abre la base de la empresa; `authRefresh` al recuperar conexión; cerrar sesión con aviso si hay cambios pendientes; rutas protegidas por rol; modo demo intacto. Excepción a la regla 1: las pantallas que solo funcionan con conexión llaman a funciones de `src/sync/api/*`, nunca al SDK.
- **Hecho cuando:** `npm run check` pasa.

### F2-9 · Bajada, tiempo real y conectividad · `sonnet`
- **Lee:** SPEC §4.1, §4.5.
- **Archivos:** `src/sync/{transport,pull,connectivity,engine}.ts` y tests, `tests/integration/pull.test.ts`.
- **Tareas:**
  1. `SyncTransport` (interfaz): `list(collection, companyId, cursor, page)`, `subscribe(collection, companyId, cb)`, `push(ops)`, `upload(...)`. Implementación con PocketBase y una falsa en memoria para los tests unitarios. **El motor no importa React** y recibe la base y el transporte por parámetro (se reutiliza en Node en la fase 3).
  2. `pull.ts`: SPEC §4.1 punto por punto (cursor por colección en `meta`, `>=`, orden `updated,id`, paginado, idempotente por `version`, registros con cambios pendientes → se guardan aparte como versión del servidor).
  3. Tiempo real con filtro por empresa; descarta registros de otra empresa.
  4. `connectivity.ts`: máquina de estados `online | offline`; `online` = tiempo real conectado **y** última petición correcta. Sin `navigator.onLine`. Reintento con espera creciente y sondeo cada 60 s.
- **Hecho cuando:** `npm run check && npm run test:integration` pasan (bajada inicial, incremental, borrados, y un cambio hecho por otro usuario llega por tiempo real).

### F2-10 · Subida y conflictos (mínimo) · `sonnet`
- **Lee:** SPEC §4.2, §4.3, §4.4.
- **Archivos:** `src/sync/push.ts` y tests, `src/sync/engine.ts`, `src/pages/ConflictsPage.tsx`, `src/components/layout/ConflictBanner.tsx`, `src/i18n/{ca,es}/conflicts.json`, `tests/integration/push-client.test.ts`.
- **Tareas:**
  1. Vaciar la outbox en orden, por lotes de 50, solo operaciones del usuario actual. Tratar cada `status`: `ok`/`merged` → quitar de la outbox y actualizar `version`; `mergedInto` → reasignar registros locales y operaciones pendientes al id existente y eliminar el duplicado local; `conflict` → mover a `conflicts` y retener las operaciones posteriores del mismo registro; `forbidden`/`invalid`/`id_taken` → mover a `conflicts` como error no resoluble (solo "Descartar").
  2. Tras aceptar un registro con foto pendiente, subirla desde `blobs`.
  3. Activar `syncEnabled` fuera del modo demo.
  4. Pantalla de conflictos mínima: quién y cuándo, campos tuyo/actual, "Descartar el mío" y "Sobrescribir".
- **Hecho cuando:** `npm run check && npm run test:integration` pasan (crear, editar, fusión automática, conflicto con nombre del otro usuario, descartar, sobrescribir).

### F2-11 · Historial · `haiku`
- **Lee:** SPEC §3 `change_log`, §5 punto 3 ("Botón Historial").
- **Archivos:** `src/sync/api/history.ts`, `src/components/history/HistoryDialog.tsx`, `src/pages/OrderFormPage.tsx`, `src/components/tickets/TicketDialog.tsx`, `src/i18n/{ca,es}/history.json`.
- **Tareas:** consulta de `change_log` por `recordId` u `orderId`; lista cronológica con usuario, fecha y `campo: anterior → nuevo` con nombres de campo traducidos; marca de sobrescritura; sin conexión, el mensaje de la SPEC.
- **Hecho cuando:** `npm run check` pasa con test del formateo de una entrada.

### F2-12 · Ajustes de empresa y usuarios · `haiku`
- **Lee:** SPEC §5 punto 7.
- **Archivos:** `src/sync/api/admin.ts`, `src/pages/{SettingsPage,AccountPage}.tsx`, `src/i18n/{ca,es}/settings.json`.
- **Tareas:** formulario de empresa; lista de usuarios con alta, rol y baja; perfil propio (nombre, idioma, contraseña). Solo visible para `company_admin` y `platform_admin`. Los botones "Enviar resumen ahora" y "Exportar JSON" quedan para F4-3.
- **Hecho cuando:** `npm run check` pasa.

### F2-13 · Administración de la plataforma · `haiku`
- **Lee:** SPEC §5 punto 8.
- **Archivos:** `src/pages/PlatformPage.tsx`, `src/sync/api/admin.ts`, `src/auth/session.ts`, `src/i18n/{ca,es}/platform.json`.
- **Tareas:** lista de empresas, crear empresa con su primer administrador, cambiar de empresa activa (cierra el motor, abre la base de la otra empresa, lo vuelve a arrancar). No se cambia de empresa con cambios pendientes sin aviso.
- **Hecho cuando:** `npm run check` pasa.

### F2-14 · Imagen de producción · `haiku`
- **Lee:** SPEC §7 fase 2 (Dockerfile), §8.
- **Archivos:** `Dockerfile`, `.dockerignore`, `docs/DEPLOY.md`.
- **Tareas:** multietapa: (1) Node: `npm ci`, `npm run build`, `npm run build:shared`; (2) Go 1.27: `go build` de `pb/`; (3) imagen final mínima con el binario, `dist` como `pb_public`, `pb_hooks`, `pb_migrations`, certificados raíz, volumen `/pb_data`, `serve --http 0.0.0.0:8090`, `HEALTHCHECK` a `/api/health`. `DEPLOY.md`: alta en Coolify, variables de entorno, creación del primer superusuario y del primer `platform_admin`.
- **Hecho cuando:** el Dockerfile está escrito y revisado contra POCKETBASE.md §1. No hay Docker en el entorno cloud: **la construcción de la imagen queda como verificación manual** y hay que decirlo en el informe.

### F2-15 · Pruebas con dos dispositivos · `sonnet`
- **Lee:** SPEC §7 fase 2 (criterios ✅).
- **Archivos:** `tests/integration/two-clients.test.ts`, `tests/integration/setup/client.ts`.
- **Tareas:** `createTestClient(user)` = motor real + `fake-indexeddb` + transporte PocketBase. Tests: B ve un cambio de A en menos de 2 s; edición simultánea del mismo campo → conflicto con el nombre del otro; el historial tiene usuario, hora y valores.
- **Hecho cuando:** `npm run test:integration` pasa.

### Puerta G3
- `/code-review` del bloque. **Manual:** desplegar en Coolify con el dominio provisional, construir la imagen, probar con dos dispositivos reales.

---

## 8. Fase 3: sin conexión con edición

### F3-1 · Arnés de dos clientes con corte de red · `sonnet`
- **Archivos:** `tests/integration/setup/client.ts`, `tests/integration/offline-harness.test.ts`.
- **Tareas:** añadir a `createTestClient` `goOffline()`, `goOnline()`, `syncNow()` y `failNextPushAfterSend()` (la petición llega al servidor pero el cliente no recibe la respuesta). Test de humo de cada una.
- **Hecho cuando:** `npm run test:integration` pasa.

### F3-2 · Escenarios 1 a 5 · `sonnet`
- **Lee:** SPEC §7 fase 3 (escenarios), §4.4.
- **Archivos:** `tests/integration/scenarios-1-5.test.ts`, y solo si un escenario lo exige, `src/sync/*`.
- **Tareas:** un test por escenario, con el número en el nombre: fusión, conflicto, descartar, sobrescribir (`forced` y `overwrote` en el historial), `deleted_on_server` + "volver a crearlo".
- **Hecho cuando:** `npm run test:integration` pasa.

### F3-3 · Escenarios 6 a 10 · `sonnet`
- **Archivos:** `tests/integration/scenarios-6-10.test.ts`, y solo si hace falta, `src/sync/*`.
- **Tareas:** pedido con 3 artículos + ticket con foto creados sin conexión; corte a mitad de subida sin duplicados; artículos distintos sin conflicto; cliente "Pepe" duplicado → uno solo y los pedidos de ambos apuntan a él; 200 operaciones en orden (medir que ninguna tarea del motor bloquea más de 50 ms seguidos).
- **Hecho cuando:** `npm run test:integration` pasa.

### F3-4 · Barra de estado · `haiku`
- **Lee:** SPEC §4.5.
- **Archivos:** `src/components/layout/StatusBar.tsx` (+ test), `src/i18n/{ca,es}/common.json`.
- **Hecho cuando:** `npm run check` pasa con un test por cada uno de los tres estados.

### F3-5 · Pantalla de conflictos completa · `sonnet`
- **Lee:** SPEC §4.4.
- **Archivos:** `src/pages/ConflictsPage.tsx`, `src/components/conflicts/*`, `src/sync/push.ts`, `src/i18n/{ca,es}/conflicts.json`.
- **Tareas:** comparación por campos con nombres y valores formateados (dinero, peso, fechas, estados); caso borrado en el servidor con "Descartar" y "Volver a crearlo con mis cambios"; al resolver, se liberan las operaciones retenidas del registro.
- **Hecho cuando:** `npm run check && npm run test:integration` pasan.

### F3-6 · Sesión sin conexión · `haiku`
- **Lee:** SPEC §4.6.
- **Archivos:** `src/auth/session.ts`, `src/sync/engine.ts`, `src/components/layout/*`, `src/i18n/{ca,es}/auth.json`.
- **Tareas:** token caducado sin conexión → se sigue trabajando y se pide login antes de subir; aviso de cambios pendientes de otro usuario; aviso al cerrar sesión.
- **Hecho cuando:** `npm run check` pasa con tests de los tres casos.

### F3-7 · Extremo a extremo sin conexión · `sonnet`
- **Archivos:** `e2e/offline.spec.ts`, `playwright.config.ts`.
- **Tareas:** contra PocketBase local: login, cortar red, crear pedido y editar otro, ver "cambios pendientes", reconectar, ver "Sincronizado" y comprobar en el servidor.
- **Hecho cuando:** `npm run e2e -- --trace off` pasa.

### Puerta G4
- `/code-review` y repaso de seguridad de los cambios en `src/sync` y `pb/`. **Manual:** iPad real en modo avión, editando y reconectando.

---

## 9. Fase 4: correo, copias y dominio

### F4-1 · Resumen diario (funciones puras) · `sonnet`
- **Lee:** SPEC §6.
- **Archivos:** `shared/summary/{model,render,csv,i18n}.ts` y tests, `shared/index.ts`.
- **Tareas:** `buildSummary(data, today, locale)` (pedidos activos de hoy + 7 días por día y hora de Madrid; tickets pendientes por cliente; totales con ≈); `renderHtml`, `renderText`; `toCsv` de pedidos, artículos y tickets (separador `;`, coma decimal, BOM); `exportJson`. Textos del correo en `shared/summary/i18n.ts` (ca y es), con test de paridad. Las fechas llegan ya convertidas a Madrid (la conversión la hace quien llama).
- **Hecho cuando:** `npm run check` pasa.

### F4-2 · Cron y envío · `sonnet`
- **Lee:** SPEC §6, POCKETBASE.md §3 y §9.
- **Archivos:** `pb/pb_hooks/summary.pb.js`, `tests/integration/summary.test.ts`.
- **Tareas:** cron cada 15 min según SPEC §6; envío por Resend con adjuntos en base64; `MAIL_FROM` y `RESEND_API_KEY` de entorno; reintento único con `summaryRetryAt`; rutas `POST /api/admin/companies/{id}/summary/send` y `GET /api/admin/companies/{id}/export` (solo `company_admin` de esa empresa y `platform_admin`). Si `RESEND_API_URL` está definida se usa en lugar de la real (para el test, que levanta un servidor HTTP local y captura la petición).
- **Hecho cuando:** `npm run test:integration` pasa (contenido en el idioma de la empresa, adjuntos presentes, un `staff` recibe 403, no se envía dos veces el mismo día).

### F4-3 · Botones de resumen y exportación · `haiku`
- **Archivos:** `src/pages/SettingsPage.tsx`, `src/sync/api/admin.ts`, `src/i18n/{ca,es}/settings.json`.
- **Hecho cuando:** `npm run check` pasa.

### F4-4 · Copias de seguridad · `haiku`
- **Lee:** SPEC §6 "Copias de seguridad".
- **Archivos:** `pb/pb_migrations/4_backups.js`, `docs/RESTORE.md`.
- **Tareas:** migración que, si hay variables `S3_*`, configura las copias automáticas diarias a S3 conservando 30 (consultar `types.d.ts`: `app.settings().backups`); `RESTORE.md` con el procedimiento paso a paso de restauración en una instancia limpia.
- **Hecho cuando:** `npm run test:integration` sigue pasando sin variables `S3_*`. La copia y la restauración reales son verificación manual.

### Puerta G5 (manual)
Contratar el dominio y apuntarlo; verificar el dominio en Resend; correo recibido por 2 destinatarios a la hora configurada y fuera de spam; **restaurar una copia en una instancia limpia**.

---

## 10. Fase 5: pulido y uso real

### F5-1 · Fusión manual de clientes · `sonnet`
- **Lee:** SPEC §3 `customers` (`mergedInto`).
- **Archivos:** `pb/pb_hooks/admin.pb.js`, `tests/integration/merge-customers.test.ts`, `src/pages/CustomerPage.tsx`, `src/sync/api/admin.ts`.
- **Tareas:** `POST /api/admin/customers/{id}/merge-into/{targetId}`: en una transacción reasigna pedidos y tickets, marca el origen con `mergedInto` y `deleted`, añade el alias y escribe el historial. Interfaz en la ficha del cliente.
- **Hecho cuando:** `npm run check && npm run test:integration` pasan, incluido el caso entre empresas (403).

### F5-2 · Rendimiento · `sonnet`
- **Lee:** SPEC §7 fase 5.
- **Archivos:** `scripts/seed-perf.mjs`, `docs/PERF.md`.
- **Tareas:** sembrar 2.000 pedidos, 10.000 artículos y 500 tickets; medir la primera sincronización, la apertura del calendario y el tamaño de la base local; escribir los números y una recomendación sobre limitar los archivados a 90 días. **No implementar la limitación**: se decide en la puerta.
- **Hecho cuando:** `docs/PERF.md` tiene las mediciones y cómo repetirlas.

### Puerta G6 (manual)
Uso en paralelo una semana; segunda empresa de prueba en dispositivos reales; decisión sobre los archivados.
