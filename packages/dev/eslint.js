// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import headers from 'eslint-plugin-headers';
import importPlugin from 'eslint-plugin-import';
import prettier from 'eslint-plugin-prettier/recommended';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      '**/dist/*',
      '**/build/*',
      '**/.turbo',
      '**/coverage/*',
      '**/.next/*',
      '**/next-env.d.ts',
      'packages/database/generated',
    ],
  },
  {
    extends: [js.configs.recommended, prettier, ...tseslint.configs.recommended, importPlugin.flatConfigs.recommended],
    files: ['**/*.{js,jsx,mjs,cjs,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      react,
      'simple-import-sort': simpleImportSort,
      headers,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-hooks/exhaustive-deps': [
        'error',
        {
          additionalHooks: '(useAsyncFn|useDebounceFn)',
        },
      ],
      'import/no-deprecated': 'error',
      'import/no-unresolved': 'off',
      'import/no-cycle': [
        'error',
        { maxDepth: Infinity, ignoreExternal: true, allowUnsafeDynamicCyclicDependency: false },
      ],
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
        { blankLine: 'any', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] },
        { blankLine: 'always', prev: '*', next: 'block-like' },
        { blankLine: 'always', prev: 'block-like', next: '*' },
        { blankLine: 'always', prev: '*', next: 'function' },
        { blankLine: 'always', prev: 'function', next: '*' },
        { blankLine: 'always', prev: '*', next: 'try' },
        { blankLine: 'always', prev: 'try', next: '*' },
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'always', prev: '*', next: 'import' },
        { blankLine: 'always', prev: 'import', next: '*' },
        { blankLine: 'any', prev: 'import', next: 'import' },
      ],
      'simple-import-sort/imports': [
        2,
        {
          groups: [
            ['^\u0000'], // all side-effects (0 at start)
            ['\u0000$', '^@kzero.*\u0000$', '^\\..*\u0000$'], // types (0 at end)
            ['^[^/\\.]'], // non-kzero
            ['^@kzero'], // kzero
            ['^\\.\\.(?!/?$)', '^\\.\\./?$', '^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'], // local (. last)
          ],
        },
      ],
      'headers/header-format': [
        'error',
        {
          source: 'string',
          style: 'line',
          content:
            'Copyright {startYear}-{endYear} kzero authors & contributors\nSPDX-License-Identifier: GNU General Public License v3.0',
          trailingNewlines: 2,
          variables: {
            startYear: '2024',
            endYear: '2025',
          },
        },
      ],
    },
  },
);
