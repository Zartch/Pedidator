# Pedidator

PWA offline-first y multiempresa para gestionar pedidos y tickets pendientes de paradas pequeñas.
Frontend: Vite + React + TS + Tailwind + shadcn/ui + Dexie + i18next (ca/es).
Backend: PocketBase (pb_hooks en JS).
Especificación completa: docs/SPEC.md — léela antes de empezar cualquier fase.

## Comandos
- `npm run dev` — frontend (VITE_MODE=demo o apuntando a PocketBase local)
- `npm run pb` — PocketBase local (docker compose up pocketbase)
- `npm test` — Vitest (unit + sync + permisos contra PocketBase en Docker)
- `npm run e2e` — Playwright
- `npm run build` — build producción

## Reglas de arquitectura (no negociables)
1. La UI SOLO lee/escribe en Dexie a través de `src/data/repo/*`. Nunca llames a PocketBase desde componentes.
2. Toda escritura al servidor pasa por `POST /api/sync/push`. Las reglas API bloquean escrituras REST directas.
3. `version`, `updatedBy` y `change_log` los escribe SOLO el servidor.
4. Multiempresa: todo registro de negocio lleva `company`. El aislamiento se impone en el servidor (reglas API + hook). Nunca confíes en el filtro del cliente.
5. Una base Dexie por empresa (`pedidator-{companyId}`).
6. IDs generados en cliente: 15 chars [a-z0-9] (`src/lib/id.ts`).
7. Borrado = `deleted: true`. Nunca borrado físico de colecciones sincronizables.
8. Dinero en céntimos enteros; peso en gramos enteros. Nunca floats para guardar dinero.
9. El cálculo de importes vive en un único módulo compartido (`shared/pricing.ts`) usado por la UI y por pb_hooks.
10. Fechas: almacenar UTC, mostrar en Europe/Madrid.
11. No usar `navigator.onLine` como fuente de verdad de conectividad.
12. Ningún texto de UI fuera de `src/i18n/{ca,es}.json`.

## Convenciones
- Código, nombres y commits en inglés; UI en catalán y castellano.
- Componentes en `src/components`, pantallas en `src/pages`, sync en `src/sync`, hooks PB en `pb/pb_hooks`, migraciones en `pb/pb_migrations`.
- Cambios de esquema SIEMPRE vía migración.
- Cualquier cambio en `src/sync`, `pb/pb_hooks` o reglas API requiere añadir/actualizar tests de escenario y de aislamiento.
- Enter nunca envía formularios; guardar solo con botón explícito.

## Trabajo por fases
Trabaja una fase cada vez (SPEC §7). Al terminar: tests en verde, actualizar CHANGELOG.md y listar qué criterios de aceptación se han verificado y cuáles requieren prueba manual.
