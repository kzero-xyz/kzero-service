// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

import { z } from 'zod';

export const ProofServerConfigSchema = z.object({
  port: z.coerce.number().int().min(1).max(65535).default(3001),

  host: z.string().min(1).default('0.0.0.0'),

  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),

  logLevel: z.enum(['error', 'warn', 'info', 'debug', 'verbose']).default('info'),

  database: z.object({
    url: z.string().min(1),
  }),
});

export type ProofServerConfig = z.infer<typeof ProofServerConfigSchema>;

export function validate(config: Record<string, unknown>) {
  const mappedConfig = {
    port: config.PORT,
    host: config.HOST,
    nodeEnv: config.NODE_ENV,
    logLevel: config.LOG_LEVEL,
    database: {
      url: config.DATABASE_URL,
    },
  };

  return ProofServerConfigSchema.parse(mappedConfig);
}
