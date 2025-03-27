// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

import { z } from 'zod';

export const LoggerConfigSchema = z.object({
  module: z.string(),
  level: z.enum(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']).default('info'),
  logPath: z.string().optional(),
  maxSize: z.string().default('50m'),
  maxFiles: z.string().default('14d'),
  format: z.enum(['json', 'text']).default('json'),
  console: z.boolean().default(true),
  customTransports: z.array(z.any()).default([]),
  metadata: z.record(z.any()).optional()
});

export type LoggerConfig = z.infer<typeof LoggerConfigSchema>;
