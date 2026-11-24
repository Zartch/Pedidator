# Changelog

## Unreleased

- F0-1: scaffold del proyecto (Vite + React + TS, Tailwind v4, base de shadcn/ui, ESLint, Prettier, Vitest) con los tokens de `docs/design` en `src/styles/tokens.css`.
- F0-2: i18next (ca/es) con un namespace por pantalla, `resolveLocale`, test de paridad de claves y regla ESLint contra texto literal en JSX.
- F0-3: PWA (`vite-plugin-pwa`: manifiesto, iconos, precache y `navigateFallback`), `base` desde `VITE_BASE` y Playwright con test de humo sin conexión (`npm run e2e`).
- F0-4: CI en GitHub Actions (check, build y e2e de humo) y reglas ESLint de zonas de importación (`pocketbase`, `dexie`, `shared/`).
- F1-1: dominio compartido en `shared/` (tipos, pesos, progreso y días de Madrid, importes, dinero, `nameKey`, `deriveBrand`) y `newId`.
- F1-2: base local Dexie por empresa, `mutate` como único punto de escritura con fusión de la outbox, repositorios y consultas reactivas (`src/data`).
- F1-3: estructura de la app: rutas, AppShell con navegación móvil/tablet, `BrandTheme`, selector de idioma, modo demo, `SafeForm`, `AppDialog`, `Badge` y `Button`.
