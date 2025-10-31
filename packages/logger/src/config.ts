// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

import { z } from 'zod';

/**
 * Logger configuration schema for Pino
 */
export const LoggerConfigSchema = z.object({
  /** Module name for context identification */
  module: z.string(),
  /** Log level - Pino levels */
  level: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  /** Optional file path for file logging */
  logPath: z.string().optional(),
  /** Log format: json (default) or text (using pino-pretty) */
  format: z.enum(['json', 'text']).default('json'),
  /** Optional metadata to include in all logs */
  metadata: z.record(z.any()).optional(),
});

export type LoggerConfig = z.infer<typeof LoggerConfigSchema>;
