// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

export type { AuthServerConfig } from './env.validation.js';

import type { AuthServerConfig } from './env.validation.js';

/**
 * Type-safe config keys for use with ConfigService.get()
 */
export type ConfigKey = keyof AuthServerConfig;
