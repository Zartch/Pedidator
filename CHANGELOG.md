# Changelog

## Unreleased

- F0-1: scaffold del proyecto (Vite + React + TS, Tailwind v4, base de shadcn/ui, ESLint, Prettier, Vitest) con los tokens de `docs/design` en `src/styles/tokens.css`.
- F0-2: i18next (ca/es) con un namespace por pantalla, `resolveLocale`, test de paridad de claves y regla ESLint contra texto literal en JSX.
- F0-3: PWA (`vite-plugin-pwa`: manifiesto, iconos, precache y `navigateFallback`), `base` desde `VITE_BASE` y Playwright con test de humo sin conexión (`npm run e2e`).
- F0-4: CI en GitHub Actions (check, build y e2e de humo) y reglas ESLint de zonas de importación (`pocketbase`, `dexie`, `shared/`).
- F1-1: dominio compartido en `shared/` (tipos, pesos, progreso y días de Madrid, importes, dinero, `nameKey`, `deriveBrand`) y `newId`.
- F1-2: base local Dexie por empresa, `mutate` como único punto de escritura con fusión de la outbox, repositorios y consultas reactivas (`src/data`).
- F1-3: estructura de la app: rutas, AppShell con navegación móvil/tablet, `BrandTheme`, selector de idioma, modo demo, `SafeForm`, `AppDialog`, `Badge` y `Button`.
- F1-6: archivo de encargos entregados y cancelados con búsqueda por cliente y rango de fechas.
- F1-8: lista de clientes con búsqueda y ficha con teléfono y notas editables, sus encargos y sus tickets.
- F1-7: tickets pendientes agrupados por cliente con totales, alta con foto comprimida y miniatura en `blobs`, visor y marcar pagado.
- F1-4: espacio de trabajo del día: calendario (semana/mes) con marcas, progreso, próxima recogida, "Preparar hoy para mañana", tarjetas con artículos marcables y entregados plegados; `src/lib/dates.ts`.
- F1-5: formulario de encargo: cliente con sugerencias, artículos por unidades o peso (`WeightField` g/kg), preparar el día anterior, precio opcional plegado y total estimado.
- F1-9: datos de ejemplo y borrado en modo demo, `navigator.storage.persist()`, aviso de instalación en Safari de iOS y workflow de GitHub Pages.
- F1-10: pruebas de extremo a extremo de la demo (encargos, preparar la víspera, entregar, tickets, idioma y recarga sin conexión).
- G1: correcciones del code review de la fase 1 (entregados siempre visibles y recuperables, diálogos, ticket con foto atómico, validación del formulario de encargo, limpieza de fotos, "no encontrado") y base de GitHub Pages según el nombre del repositorio.
- F1-11: catálogo de productos (colección `products`, pantalla Productos en el menú, sugerencias del encargo desde el catálogo con precio opcional propuesto, alta automática al guardar un encargo y relleno desde los artículos existentes).
- F1-12: "Entregar" siempre pide confirmación y permite "Entregar y dejar a deber", que entrega el encargo y crea un ticket pendiente con el importe (prellenado con el total si hay precios) en una sola transacción.
- F1-13: pestaña "Pagados" en Tickets con búsqueda por cliente, rango de fechas de pago, total filtrado, miniatura y "Volver a pendiente".
- F1-14: ficha del cliente con lo pendiente de entrada, "Ver entregados"/"Ver pagados" con los 5 últimos y "Explorar" al Archivo y a Pagados filtrados por cliente; filtros del Archivo y de Pagados en la URL; miniatura de ticket común (`TicketThumb`).
- F1-15: en móvil, botón "Ver mes"/"Ver semana" que despliega el calendario del mes entero en el espacio de trabajo del día, recordado en el dispositivo.
- F1-16: calendario que se arrastra sin cambiar el día elegido: semana en horizontal (encaje por semanas) y mes en vertical (encaje por meses, también en tablet); "Ver mes" abre el mes de la semana que se ve; marcas por rango (`queryRangeMarks`).
- G1 (revisión de código de la fase 1): guardar un encargo solo envía los campos cambiados de cada artículo (ya no desmarca lo marcado en otra pestaña); "hoy" cambia a medianoche de Madrid y al volver a la app (`useTodayMadrid`); aviso cuando falla una acción de un toque; la ficha del cliente no mezcla datos del cliente anterior; unidades "€", "€/kg", "g" y "kg" en i18n.
