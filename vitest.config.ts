// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    workspace: ['packages/*'],
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
      enabled: true
    }
  }
});
