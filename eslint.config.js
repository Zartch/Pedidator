import js from '@eslint/js'
import globals from 'globals'
import i18next from 'eslint-plugin-i18next'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// Flat config: the last block that matches a file replaces the rule options of
// earlier blocks. Each zone below is therefore one block, and the zone file
// lists are disjoint, so every file gets exactly one set of import restrictions.
const PB_MSG = 'pocketbase solo se importa en src/sync/** y src/auth/**.'
const DEXIE_MSG = 'dexie solo se importa en src/data/**.'

const restrictedImports = (entries) => [
  'error',
  {
    paths: entries.flatMap(({ names, message }) =>
      names.map((name) => ({ name, message })),
    ),
    patterns: entries.flatMap(({ groups, message }) =>
      groups ? [{ group: groups, message }] : [],
    ),
  },
]

const PB = { names: ['pocketbase'], groups: ['pocketbase/*'], message: PB_MSG }
const DEXIE = {
  names: ['dexie', 'dexie-react-hooks'],
  groups: ['dexie/*', 'dexie-react-hooks/*'],
  message: DEXIE_MSG,
}

const SYNC_AUTH = ['src/sync/**', 'src/auth/**']
const DATA = ['src/data/**']

export default defineConfig([
  globalIgnores([
    'dist',
    'node_modules',
    'coverage',
    'playwright-report',
    'test-results',
    'pb/pb_data',
    '.claude',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  {
    // Visible UI text lives in src/i18n/{ca,es}/*.json, never inline in JSX.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/*.test.{ts,tsx}'],
    plugins: { i18next },
    rules: {
      'i18next/no-literal-string': ['error', { mode: 'jsx-text-only' }],
    },
  },
  // Architecture zones (CLAUDE.md, reglas 1 y 10). One block per zone; the
  // file lists are disjoint so no block overrides another.
  {
    // Everywhere else: neither PocketBase nor Dexie.
    files: ['**/*.{ts,tsx}'],
    ignores: [...SYNC_AUTH, ...DATA, 'shared/**'],
    rules: {
      'no-restricted-imports': restrictedImports([PB, DEXIE]),
    },
  },
  {
    // src/sync and src/auth may use PocketBase, not Dexie.
    files: SYNC_AUTH,
    rules: {
      'no-restricted-imports': restrictedImports([DEXIE]),
    },
  },
  {
    // src/data may use Dexie, not PocketBase.
    files: DATA,
    rules: {
      'no-restricted-imports': restrictedImports([PB]),
    },
  },
  {
    // shared/: pure TypeScript. No src/, no Node, no React, no Dexie, no PocketBase.
    files: ['shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': restrictedImports([
        PB,
        DEXIE,
        {
          names: ['react', 'react-dom'],
          groups: ['react/*', 'react-dom/*'],
          message: 'shared/ no puede importar React.',
        },
        {
          names: [],
          groups: ['node:*'],
          message: 'shared/ no puede importar módulos de Node.',
        },
        {
          names: [],
          groups: ['**/src/**', '**/src', '@/*'],
          message: 'shared/ no puede importar de src/.',
        },
      ]),
    },
  },
])
