# Pedidator

PWA offline-first y multiempresa para gestionar pedidos y tickets pendientes de paradas pequeñas.
Sirve para dos cosas: preparar los encargos del día y entregarlos sabiendo quién viene, a qué hora y a por qué. Los precios son secundarios.
Frontend: Vite + React + TS + Tailwind + shadcn/ui + Dexie + i18next (ca/es).
Backend: PocketBase v0.40.6 (pb_hooks en JS), compilado desde el módulo Go de `pb/`.

## Documentos (léelos en este orden)
1. `docs/ROADMAP.md` — qué paso toca y qué archivos puede tocar cada paso.
2. `docs/SPEC.md` — especificación completa. Lee las secciones que cite tu paso.
3. `docs/POCKETBASE.md` — API de PocketBase **verificada**. Si tu memoria de PocketBase dice otra cosa, manda este documento. `pocketbase.io` no es accesible desde el entorno cloud.
4. `docs/design/` — sistema de estilos (empieza por `ABOUT.md`). Léelo antes de hacer cualquier pantalla: colores, tamaños táctiles, tipografía y componentes salen de ahí, no se inventan.

## Comandos
Los crea la fase 0 (y la fase 2 los de PocketBase). Si un comando aún no existe, es que su paso no se ha hecho.
- `npm run dev` — frontend (`VITE_MODE=demo` o apuntando a PocketBase local)
- `npm run check` — lint + typecheck + tests unitarios. **Debe pasar antes de cada commit.**
- `npm test` — Vitest unitario (sin servidor)
- `npm run build:shared` — empaqueta `shared/` a `pb/pb_hooks/lib/shared.js`
- `npm run pb:build` — compila PocketBase a `.bin/pocketbase` (necesita Go; no usa Docker)
- `npm run pb` — PocketBase local con hooks y migraciones
- `npm run test:integration` — Vitest contra un PocketBase real (binario local)
- `npm run e2e` — Playwright
- `npm run build` — build de producción

## Reglas de arquitectura (no negociables)
1. La UI SOLO lee/escribe en Dexie a través de `src/data/repo/*`. Nunca llames a PocketBase desde componentes. El SDK `pocketbase` solo se importa en `src/sync/**` y `src/auth/**`; `dexie` solo en `src/data/**` (lo impone ESLint). Única excepción: las pantallas que solo funcionan con conexión (historial, ajustes, usuarios, plataforma) llaman a funciones de `src/sync/api/*`, nunca al SDK.
2. Toda escritura al servidor pasa por rutas propias de `pb_hooks` (`POST /api/sync/push`, `/api/sync/upload/...`, `/api/admin/...`, `/api/account`). Las reglas de escritura de TODAS las colecciones son `null`, incluidas `users` y `companies`.
3. `version`, `updatedBy`, `nameKey` y `change_log` los escribe SOLO el servidor.
4. Multiempresa: todo registro de negocio lleva `company`. El aislamiento se impone en el servidor (reglas API + hook). Nunca confíes en el filtro del cliente.
5. Toda regla de lectura y toda ruta propia comprueba `active = true` del usuario.
6. Una base Dexie por empresa (`pedidator-{companyId}`).
7. IDs generados en cliente: 15 chars [a-z0-9] (`src/lib/id.ts`).
8. Borrado = `deleted: true`. Nunca borrado físico de colecciones sincronizables.
9. Dinero en céntimos enteros; peso en gramos enteros. Nunca floats para guardar dinero ni peso. "Preparado" y los totales de un pedido no se guardan: se calculan a partir de sus artículos.
10. La lógica compartida vive en `shared/` (TypeScript puro, sin dependencias de navegador, Node ni PocketBase): pesos, progreso del día, importes, `nameKey`, color de marca, permisos, decisiones de sincronización, resumen diario. La usan la UI y, empaquetada, los pb_hooks. Los hooks son adaptadores finos.
11. Fechas: almacenar UTC, mostrar en Europe/Madrid. En los hooks, zona horaria con `new Timezone("Europe/Madrid")` (no hay `Intl`).
12. No usar `navigator.onLine` como fuente de verdad de conectividad.
13. Ningún texto de UI fuera de `src/i18n/{ca,es}/*.json` (un archivo por pantalla; las claves deben existir en los dos idiomas).

## Convenciones
- Código, nombres, valores de enumerados y commits en inglés; UI en catalán y castellano.
- Componentes en `src/components`, pantallas en `src/pages`, sync en `src/sync`, hooks PB en `pb/pb_hooks`, migraciones en `pb/pb_migrations`, código compartido en `shared/`.
- Cambios de esquema SIEMPRE vía migración nueva (no se editan migraciones ya fusionadas).
- Cualquier cambio en `src/sync`, `shared/sync`, `pb/pb_hooks` o reglas API requiere añadir/actualizar tests de escenario y de aislamiento.
- Enter nunca envía formularios; guardar solo con botón explícito.
- No se añaden dependencias que no estén en el paso del roadmap.
- PocketBase no se actualiza de versión salvo en un paso explícito.

## Trabajo por pasos
Trabaja **un paso del roadmap cada vez** y toca solo los archivos de ese paso. Si necesitas cambiar un contrato (tipos de `shared/`, esquema, formato de la subida) que tu paso no menciona, **para y avisa**: no lo cambies por tu cuenta.
Al terminar un paso: `npm run check` en verde (y `npm run test:integration` si tocaste servidor o sync), marca el paso en `docs/ROADMAP.md`, añade una línea a `CHANGELOG.md` y di qué criterios has verificado tú y cuáles requieren prueba manual. No marques como verificado nada que no hayas ejecutado.
