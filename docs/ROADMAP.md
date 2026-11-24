# Pedidator: roadmap de ejecución por pasos

_Versión 2 · 21/11/2026 · Acompaña a [SPEC.md](SPEC.md) v4, a [POCKETBASE.md](POCKETBASE.md) y al sistema de estilos de [design/](design/README.md)._

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

### Prompt para arrancar una sesión de orquestación
```
Eres el orquestador del proyecto Pedidator. Lee CLAUDE.md y las secciones 1 a 3 de docs/ROADMAP.md.

Ejecuta el siguiente bloque sin terminar de la tabla "Estado" (sección 2), paso a paso:
1. Para cada paso, lanza UN subagente con el modelo que indica su título (haiku o sonnet) y la
   "Plantilla del prompt de cada subagente", cambiando <ID>. Los pasos de una misma fila de
   "En paralelo" puedes lanzarlos a la vez, cada uno en su worktree; el resto, en orden.
2. Cuando un subagente termine, NO te fíes de su informe: ejecuta tú los comandos de "Hecho cuando"
   y lee el diff. Si falla, devuélvele el error una vez; si vuelve a fallar, relánzalo con el modelo
   siguiente; si falla otra vez, para y dime qué paso está mal definido.
3. Con el paso verificado: marca su casilla en docs/ROADMAP.md, añade la línea al CHANGELOG.md,
   haz commit y push a la rama de trabajo de esta sesión.
4. No cambies contratos (sección 3 del roadmap), ni la SPEC, ni el sistema de estilos por tu cuenta:
   si un paso lo necesita, para y pregúntame.
5. Al llegar a la puerta del bloque, PARA. Dame: qué pasos se han hecho, qué criterios de aceptación
   has verificado tú ejecutándolos, cuáles requieren prueba manual mía, y abre un PR hacia main.
No empieces el bloque siguiente hasta que yo cierre la puerta.
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
| Fase 0 | ☑ F0-1 · ☑ F0-2 · ☑ F0-3 · ☑ F0-4 · ☑ **Puerta G0** |
| Fase 1 | ☑ F1-1 · ☑ F1-2 · ☑ F1-3 · ☐ F1-4 · ☐ F1-5 · ☑ F1-6 · ☐ F1-7 · ☐ F1-8 · ☐ F1-9 · ☐ F1-10 · ☐ **Puerta G1** |
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
  types.ts  weight.ts  progress.ts  pricing.ts  format.ts  nameKey.ts  theme.ts  permissions.ts  index.ts
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
type OrderStatus = 'pending' | 'delivered' | 'cancelled'      // "preparado" NO es un estado: se calcula
type Measure = 'unit' | 'weight'
type Customer, Order, OrderItem, Ticket      // = Base & campos de SPEC §3
type CollectionName = 'customers' | 'orders' | 'order_items' | 'tickets'

// shared/weight.ts
parseWeight(input: string, unit: 'g' | 'kg'): number | null   // gramos enteros. "750",'g' -> 750 ; "1,5",'kg' -> 1500 ; "750g" o "1,5 kg" mandan sobre unit
formatWeight(grams: number): string                           // 750 -> "750 g" ; 1000 -> "1 kg" ; 1500 -> "1,5 kg" ; 2480 -> "2,48 kg"
toInputValue(grams: number, unit: 'g' | 'kg'): string         // 1500,'kg' -> "1,5" ; 1500,'g' -> "1500"
displayUnit(grams: number): 'g' | 'kg'                        // < 1000 -> 'g'
formatQuantity(item: Pick<OrderItem,'measure'|'quantity'|'orderedGrams'>): string   // "6 u" | "1,5 kg" | "" (peso sin indicar)

// shared/progress.ts
isPrepared(items: OrderItem[]): boolean                       // ≥1 artículo no borrado y todos con done
orderProgress(items: OrderItem[]): { done: number; total: number; prepared: boolean }
dayProgress(orders: Order[], itemsByOrder: Map<string, OrderItem[]>): { total: number; prepared: number; delivered: number }
   // total = no cancelados ; prepared = preparados o entregados
madridDay(utcIso: string): string                             // "2026-12-17"
prepDay(pickupAtUtcIso: string): string                       // día natural anterior al de recogida, en Madrid
needsPrepAhead(items: OrderItem[]): boolean                   // algún artículo no borrado con prepDayBefore
isPrepLate(item: OrderItem, pickupAtUtcIso: string, todayMadrid: string): boolean  // prepDayBefore, sin done y ya es el día de recogida o posterior

// shared/pricing.ts — el precio es opcional
lineCents(item: Pick<OrderItem,'measure'|'unitPriceCents'|'quantity'|'orderedGrams'|'weightGrams'>): { cents: number; estimated: boolean } | null   // null = sin precio
orderTotal(items: OrderItem[]): { cents: number; estimated: boolean; unpriced: number } | null   // null = ninguna línea con precio ; ignora borrados

// shared/format.ts
parseMoney(input: string): number | null     // "12,50" | "12.5" | "12" -> 1250 ; inválido -> null
formatMoney(cents: number, locale: 'ca'|'es'): string    // "12,50 €"

// shared/nameKey.ts
nameKey(name: string): string                // minúsculas, sin acentos, espacios colapsados

// shared/theme.ts — copia tipada de docs/design/derive-brand.js
deriveBrand(hex: string): { brand: string; onBrand: string; brandStrong: string; brandSoft: string; adjusted: boolean; nearDanger: boolean } | null

// src/lib/id.ts
newId(): string                              // 15 chars [a-z0-9], crypto.getRandomValues
```

Pantallas: `docs/design/screens/` tiene la maqueta de cada pantalla (tabla en `docs/design/ABOUT.md`). Un paso de interfaz reproduce su maqueta: mismos bloques, mismo orden, mismos textos de ejemplo traducidos a ca y es.

Estilos: `docs/design/` es la copia en el repositorio del sistema de estilos (`README.md` con las reglas, `tokens.json`, `components.css` como referencia de cada componente y `derive-brand.js`). Los pasos de interfaz la leen y usan sus tokens; no inventan colores, tamaños ni tipografías.

Formato de la subida (lo fijan F2-3 y F2-4): `OutboxOp` de SPEC §4.2 y la respuesta de SPEC §4.3.

---

## 4. Fase 0: base del proyecto

### F0-1 · Scaffold · `haiku`
- **Objetivo:** proyecto Vite + React + TypeScript que compila, con Tailwind, shadcn/ui, ESLint, Prettier y Vitest.
- **Archivos:** `package.json`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `.prettierrc`, `.gitignore`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/App.test.tsx`, `src/styles/tokens.css`, `components.json`, `CHANGELOG.md`.
- **Tareas:**
  1. Plantilla `react-ts` de Vite en la raíz (sin borrar `docs/`, `CLAUDE.md`, `README.md`).
  2. Tailwind con `@tailwindcss/vite`; `npx shadcn@latest init`. Alias `@/` → `src/` y `@shared/` → `shared/`.
  3. Vitest con `jsdom` y Testing Library; un test que renderiza `App`.
  4. Scripts: `dev`, `build`, `preview`, `lint`, `typecheck`, `test` (`vitest run`), `check` (= lint + typecheck + test).
  5. `.gitignore`: `node_modules`, `dist`, `.bin`, `pb_data`, `pb/pb_hooks/lib`, `test-results`, `playwright-report`.
  6. Estilos base desde `docs/design/` (léelo entero): `src/styles/tokens.css` con todos los tokens de `tokens.json` como variables CSS (tema `neutral` en `:root`), las variables de shadcn/ui enlazadas a ellos según la tabla del README, y las fuentes empaquetadas (`@fontsource-variable/figtree`, `@fontsource-variable/bricolage-grotesque`).
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
- **Lee:** SPEC §3 (todas las tablas de colecciones; en `order_items`: "Pesos", "Progreso", "Preparar la víspera" y "Precio"), sección 3 de este documento, `docs/design/derive-brand.js`.
- **Archivos:** `shared/{types,weight,progress,pricing,format,nameKey,theme,index}.ts`, sus `*.test.ts`, `src/lib/id.ts` (+ test).
- **Tareas:** implementar exactamente las firmas de la sección 3. Tests por tabla de casos:
  - `parseWeight`: `750` g → 750; `1,5` y `1.5` kg → 1500; `0,75` kg → 750; `750g`, `750 g`, `1,5kg`, `1,5 KG` mandan sobre la unidad del selector; decimales en gramos → `null`; más de 3 decimales en kilos → `null`; vacío, cero, negativos y texto → `null`.
  - `formatWeight`: 5 → `5 g`; 999 → `999 g`; 1000 → `1 kg`; 1500 → `1,5 kg`; 1250 → `1,25 kg`; 2480 → `2,48 kg`; 12005 → `12,005 kg`.
  - `toInputValue` y `displayUnit`: ida y vuelta con `parseWeight` sin perder gramos.
  - `isPrepared` / `orderProgress`: sin artículos → no preparado; todos marcados → preparado; uno sin marcar → no; los borrados no cuentan.
  - `dayProgress`: los cancelados no cuentan en el total; los entregados cuentan como preparados.
  - `madridDay` / `prepDay`: recogida a las 00:30 de Madrid (día UTC anterior); recogida el lunes siguiente al cambio de hora de marzo y de octubre; recogida el 1 de enero → 31 de diciembre.
  - `isPrepLate`: la víspera no es tarde; el día de recogida sin marcar sí; marcado nunca.
  - `lineCents`: sin precio → `null`; unidad; peso con peso real; peso estimado (`estimated`); redondeo (`1999 c/kg × 1250 g = 2499`).
  - `orderTotal`: ninguna línea con precio → `null`; mezcla → suma de las que tienen y `unpriced`; ignora borrados.
  - `parseMoney`: coma y punto, espacios, vacío, negativos y texto → `null`; más de 2 decimales → `null`.
  - `nameKey`: `"  José   Pérez "` → `"jose perez"`; `ç`, `ñ`, `l·l` y mayúsculas.
  - `deriveBrand`: los cinco colores de ejemplo dan exactamente los valores de `brand`, `on-brand`, `brand-strong` y `brand-soft` de `docs/design/tokens.json`; hex inválido → `null`.
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
  4. Repositorios: funciones con nombre de negocio (`createOrder`, `setItemDone`, `deliverOrder`, `cancelOrder`, `markTicketPaid`, `getOrCreateCustomerByName` que busca por `nameKey`, `deleteOrder` que borra también sus artículos…). `hooks.ts`: consultas con `useLiveQuery`: pedidos de un día de Madrid con sus artículos; artículos con `prepDayBefore` de los pedidos activos del día siguiente (con cliente y hora); marcas de cada día de un mes (`hasOrders`, `important`, `prepAhead`); tickets pendientes agrupados; sugerencias de cliente y de artículo (el último uso de cada nombre devuelve también su `measure` y su `prepDayBefore`).
  5. Fechas en ISO UTC. Nada de borrado físico.
- **Hecho cuando:** `npm run check` pasa, con tests de cada regla de fusión de la outbox y de `getOrCreateCustomerByName`.

### F1-3 · Estructura de la app · `haiku`
- **Lee:** SPEC §5 (párrafo inicial y lista de pantallas), `docs/design/ABOUT.md`, `docs/design/README.md`, `docs/design/components.css` (bloques Button, Badge, AppShell, StatusBar) y, para la estructura, `docs/design/screens/Main.dc.html` y `DiaTablet.dc.html` (cabecera, barra de estado, navegación).
- **Dependencias nuevas:** `react-router-dom`, `date-fns`, `lucide-react`, componentes shadcn necesarios.
- **Archivos:** `src/App.tsx`, `src/routes.tsx`, `src/components/layout/*`, `src/components/form/SafeForm.tsx`, `src/components/ui/{AppDialog,Badge}.tsx`, `src/theme/BrandTheme.tsx` (+ test), `src/pages/*Page.tsx` (vacías con título), `src/i18n/{ca,es}/{common,day,orderForm,archive,tickets,customers}.json`.
- **Tareas:**
  1. Rutas: `/` día (hoy), `/day/:date`, `/orders/new`, `/orders/:id`, `/archive`, `/tickets`, `/customers`, `/customers/:id`. Una página vacía por ruta y su namespace de traducciones ya creado. En la interfaz se dice "encargo" (ca: "encàrrec").
  2. Layout según el componente AppShell del sistema de estilos: cabecera con el nombre de la empresa sobre `brand`, hueco para la barra de estado, navegación inferior en móvil y lateral desde 768px (Día, Tickets, Clientes), áreas seguras de iOS. Aviso "MODO DEMO" si `VITE_MODE=demo`. Selector de idioma ca/es (se guarda en el dispositivo).
  3. `BrandTheme`: recibe el color de la empresa, llama a `deriveBrand` y pone `--brand`, `--on-brand`, `--brand-strong` y `--brand-soft` en la raíz; sin color, deja el tema neutro. En modo demo, un selector con los cinco colores de ejemplo de `docs/design/tokens.json`.
  4. `SafeForm`: Enter no envía (excepto en `textarea`, donde hace salto de línea). `AppDialog`: no se cierra al tocar fuera y su contenido tiene scroll. `Badge`: variantes `ok`, `warn`, `danger`, `prep`, `brand` y neutra, siempre con icono y texto.
- **Hecho cuando:** `npm run check` pasa; test de `SafeForm` (Enter no dispara `onSubmit`) y de `BrandTheme` (pone y quita las cuatro variables).

### F1-4 · Espacio de trabajo del día · `sonnet`
- **Lee:** SPEC §5 punto 2 y §3 "Progreso" y "Preparar la víspera"; `docs/design/README.md` y los bloques DayWorkspace, OrderCard, ItemRow, Calendar y Progress de `docs/design/components.css`. **Maquetas:** `docs/design/screens/Main.dc.html` (móvil) y `DiaTablet.dc.html` (tablet).
- **Archivos:** `src/pages/DayPage.tsx`, `src/components/day/{DayHeader,DayProgress,NextPickup,PrepAheadList,DayOrderList,OrderCard,ItemCheckRow,MonthCalendar,WeekStrip,DeliveredGroup}.tsx`, `src/lib/dates.ts` (+ test), `src/i18n/{ca,es}/day.json`.
- **Tareas:**
  1. Día seleccionado en la URL (`/day/2026-12-17`; `/` = hoy en Madrid). Anterior, siguiente, "Hoy". Semana en móvil y mes en tablet, con las tres marcas por día: pedidos, importante, preparar la víspera (el día de recogida). Interruptor "Mostrar entregados" recordado en el dispositivo.
  2. Barra de progreso con `dayProgress`: "3 de 8 encargos preparados", y debajo por preparar / entregados.
  3. "Próxima recogida": el primer encargo sin entregar por hora (solo cuando el día es hoy).
  4. Lista por hora de recogida. Cada tarjeta: hora, cliente, estado calculado (por preparar / preparado / entregado) y **sus artículos con casilla, cantidad (`formatQuantity`) y notas, marcables ahí mismo**. Sin importes. Aviso "Había que prepararlo ayer" con `isPrepLate`. Botón "Entregar" (confirmación si no está preparado del todo). Tocar el nombre abre el formulario.
  5. Sección "Preparar hoy para mañana" con los artículos `prepDayBefore` de los encargos de mañana (cliente y hora); marcarlos usa el mismo `setItemDone`. No aparece si está vacía.
  6. Entregados al final, plegados, con su número. Recuento de entregados del mes. Botón "Nuevo encargo".
  7. Desde 1024px, dos columnas: a la izquierda calendario, progreso, próxima recogida y "Preparar hoy para mañana"; a la derecha, los encargos del día por hora con sus artículos.
  8. `dates.ts`: rango UTC de un día y de un mes de Madrid, día anterior y siguiente (con tests en cambio de hora de marzo y octubre).
- **No hagas:** guardar "preparado" en el pedido; mostrar precios o totales.
- **Hecho cuando:** `npm run check` pasa, con tests de: marcar el último artículo deja el encargo como preparado y sube el progreso; desmarcarlo lo revierte; un artículo `prepDayBefore` de mañana aparece hoy y marcarlo aquí lo deja marcado en su encargo; entregado se pliega y sigue contando.

### F1-5 · Formulario de encargo · `sonnet`
- **Lee:** SPEC §5 punto 3 (sin el historial) y §3 `order_items` entero; bloques Field, WeightField e ItemRow de `docs/design/components.css`. **Maquetas:** `docs/design/screens/Encargo.dc.html` (móvil) y `EncargoTablet.dc.html` (tablet).
- **Archivos:** `src/pages/OrderFormPage.tsx`, `src/components/orders/{CustomerPicker,ItemsEditor,ItemEditorRow,WeightField,PriceDisclosure,OrderTotal}.tsx`, `src/i18n/{ca,es}/orderForm.json`.
- **Tareas:**
  1. Crear y editar; cliente con sugerencias y "Crear cliente «X»"; fecha, hora, importante, notas. "Cancelar encargo" aparte, con confirmación. No se guarda sin al menos un artículo.
  2. Artículos: nombre con sugerencias (al elegir una, se proponen su `measure` y su `prepDayBefore`), selector unidades / peso, cantidad, notas, interruptor "Preparar el día anterior", preparado; añadir, reordenar con botones subir/bajar, borrar. Tras rellenar un artículo, el foco pasa al nombre del siguiente.
  3. `WeightField`: campo con `inputMode="decimal"` y selector g / kg. Usa `parseWeight`, `toInputValue` y `displayUnit`; al cambiar el selector convierte lo escrito; muestra debajo la equivalencia con `formatWeight` ("= 1,5 kg"); recuerda en el dispositivo la última unidad usada.
  4. `PriceDisclosure`: desplegable "Precio" cerrado por defecto, con precio (`parseMoney`) y peso real. `OrderTotal` solo aparece si `orderTotal` no es `null`, con "≈" si es estimado y el número de artículos sin precio.
  5. Guardar solo con el botón.
- **Hecho cuando:** `npm run check` pasa, con tests de: `WeightField` (escribir `1500` en g y cambiar a kg muestra `1,5` y guarda 1500; escribir `750g` con el selector en kg guarda 750); crear un encargo sin ningún precio no muestra total; al poner precio a un artículo por peso sin peso real aparece el total con "≈".

### F1-6 · Archivo · `haiku`
- **Lee:** SPEC §5 punto 2 ("Vista Archivo"); `docs/design/README.md` y el bloque OrderCard de `docs/design/components.css` (sin maqueta propia: usa la tarjeta compacta, como en `screens/Cliente.dc.html`).
- **Archivos:** `src/pages/ArchivePage.tsx`, `src/i18n/{ca,es}/archive.json`.
- **Tareas:** lista de pedidos `delivered` y `cancelled` con búsqueda por cliente (por `nameKey`) y rango de fechas; enlaza al formulario.
- **Hecho cuando:** `npm run check` pasa con un test de filtro.

### F1-7 · Tickets · `sonnet`
- **Lee:** SPEC §3 `tickets`, §5 punto 4 (sin historial); `docs/design/README.md`. **Maqueta:** `docs/design/screens/Tickets.dc.html` (el diálogo de nuevo ticket no tiene maqueta: campos del bloque Field dentro de `AppDialog`).
- **Dependencias nuevas:** `browser-image-compression`.
- **Archivos:** `src/pages/TicketsPage.tsx`, `src/components/tickets/{TicketGroup,TicketDialog,PhotoViewer}.tsx`, `src/lib/photo.ts`, `src/i18n/{ca,es}/tickets.json`.
- **Tareas:** agrupados por cliente con total por cliente y total general; mensaje centrado si no hay; alta (cliente, importe, notas, foto de cámara o galería); la foto se comprime (máx. 1600 px, JPEG 0,7) y se genera miniatura de 300 px; ambas van a `blobs`; visor a pantalla completa; marcar pagado (rellena `paidAt`).
- **Hecho cuando:** `npm run check` pasa con test de agrupación y totales.

### F1-8 · Clientes · `haiku`
- **Lee:** SPEC §5 punto 5; `docs/design/README.md`. **Maqueta:** `docs/design/screens/Cliente.dc.html` (la lista de clientes no tiene maqueta: buscador y tarjetas compactas).
- **Archivos:** `src/pages/{CustomersPage,CustomerPage}.tsx`, `src/i18n/{ca,es}/customers.json`.
- **Tareas:** lista con búsqueda; ficha con teléfono y notas editables y sus pedidos y tickets. Sin fusión (es de la fase 5).
- **Hecho cuando:** `npm run check` pasa.

### F1-9 · Datos de demo, instalación y GitHub Pages · `haiku`
- **Lee:** SPEC §4.7, §7 fase 1, §8 "GitHub Pages".
- **Archivos:** `src/demo/seed.ts`, `src/components/layout/{DemoBanner,InstallHint}.tsx`, `src/main.tsx`, `.github/workflows/pages.yml`, `src/i18n/{ca,es}/common.json`.
- **Tareas:** botones "Cargar datos de ejemplo" y "Borrar datos" en modo demo (encargos repartidos por el mes actual con **varios para hoy y para mañana**, algunos importantes, algunos con artículos de "preparar el día anterior", pesos por debajo y por encima del kilo, la mayoría sin precio, entregados y tickets); `navigator.storage.persist()` al arrancar; aviso de instalación en Safari de iOS cuando no está instalada; workflow que compila con `VITE_MODE=demo` y `VITE_BASE=/pedidator/` y publica en Pages.
- **Hecho cuando:** `npm run check` y `VITE_MODE=demo VITE_BASE=/pedidator/ npm run build` pasan.

### F1-10 · Pruebas de extremo a extremo de la demo · `sonnet`
- **Archivos:** `e2e/demo.spec.ts`.
- **Tareas:** en modo demo: crear un encargo para hoy con dos artículos (uno por peso escrito en gramos) y verlo en el día; marcar sus artículos y ver que pasa a preparado y sube la barra de progreso; crear un encargo para mañana con un artículo de "preparar el día anterior" y verlo hoy en "Preparar hoy para mañana" y el color en el calendario de mañana; entregar un encargo y ver que se pliega en "Entregados"; crear ticket y marcarlo pagado; cambiar de idioma; recargar sin conexión y comprobar que los datos siguen.
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
  1. `schema.ts`: por colección, campos que el cliente puede escribir (nunca `id`, `company`, `version`, `updatedBy`, `nameKey`, `created`, `updated`, `photo`; en `orders.status` solo `pending`, `delivered`, `cancelled`; en `order_items.measure` solo `unit`, `weight`), tipo de cada campo, obligatorios en `create`, y relaciones (`campo → colección`). `validateOp(op)` → `{ ok } | { ok: false, reason }` (colección desconocida, campo no permitido, tipo incorrecto, entero negativo, id con formato inválido).
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
  2. Rutas: `POST /api/admin/users`, `PATCH /api/admin/users/{id}` (nombre, rol, `active`, contraseña nueva), `PATCH /api/admin/companies/{id}` (nombre, idioma, color `#rrggbb` validado, destinatarios, hora), `POST /api/admin/companies` (empresa + primer `company_admin`), `PATCH /api/account` (nombre, idioma, contraseña con la actual).
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
- **Lee:** SPEC §4.6, §5 punto 1. **Maqueta:** `docs/design/screens/Login.dc.html`.
- **Archivos:** `src/auth/session.ts`, `src/sync/api/client.ts`, `src/pages/LoginPage.tsx`, `src/components/layout/*`, `src/data/session.ts`, `src/i18n/{ca,es}/auth.json`.
- **Tareas:** login con el SDK (solo dentro de `src/auth` y `src/sync`); al entrar se aplica el `brandColor` de la empresa con `BrandTheme`; la sesión guarda usuario, rol y empresa en el dispositivo para arrancar sin conexión; abre la base de la empresa; `authRefresh` al recuperar conexión; cerrar sesión con aviso si hay cambios pendientes; rutas protegidas por rol; modo demo intacto. Excepción a la regla 1: las pantallas que solo funcionan con conexión llaman a funciones de `src/sync/api/*`, nunca al SDK.
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
- **Lee:** SPEC §4.2, §4.3, §4.4. **Maqueta:** `docs/design/screens/Conflictos.dc.html`.
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
- **Lee:** SPEC §5 punto 7; bloque ThemeStudio de `docs/design/README.md` ("Tema por empresa"). **Maqueta:** `docs/design/screens/Ajustes.dc.html`.
- **Archivos:** `src/sync/api/admin.ts`, `src/pages/{SettingsPage,AccountPage}.tsx`, `src/i18n/{ca,es}/settings.json`.
- **Tareas:** formulario de empresa, con el **color de la empresa** (selector, vista previa con cabecera, botón y una tarjeta, y los avisos de `deriveBrand`); lista de usuarios con alta, rol y baja; perfil propio (nombre, idioma, contraseña). Solo visible para `company_admin` y `platform_admin`. Los botones "Enviar resumen ahora" y "Exportar JSON" quedan para F4-3.
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
- **Lee:** SPEC §4.4. **Maqueta:** `docs/design/screens/Conflictos.dc.html`.
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
- **Tareas:** `buildSummary(data, today, locale)` (pedidos activos de hoy + 7 días por día y hora de Madrid, con artículos, cantidades con `formatQuantity` y preparado o no; bloque "Para preparar antes de mañana" con los artículos `prepDayBefore` de mañana; tickets pendientes por cliente; importes solo donde haya precios); `renderHtml`, `renderText`; `toCsv` de pedidos, artículos y tickets (separador `;`, coma decimal, BOM); `exportJson`. Textos del correo en `shared/summary/i18n.ts` (ca y es), con test de paridad. Las fechas llegan ya convertidas a Madrid (la conversión la hace quien llama).
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
