// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

import { z } from 'zod';

export const AuthServerConfigSchema = z.object({
  port: z.coerce.number().int().min(1).max(65535).default(3000),

  host: z.string().min(1).default('0.0.0.0'),

  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),

  logLevel: z.enum(['error', 'warn', 'info', 'debug', 'verbose']).default('info'),

  database: z.object({
    url: z.string().min(1),
  }),

  google: z.object({
    clientId: z.string().min(1),
    clientSecret: z.string().min(1),
    redirectUri: z.string().url(),
    certUrl: z.string().url().default('https://www.googleapis.com/oauth2/v3/certs'),
  }),

  frontend: z.object({
    origin: z.string().url(),
  }),

  salt: z.object({
    serverUrl: z.string().url().optional(),
  }),
});

export type AuthServerConfig = z.infer<typeof AuthServerConfigSchema>;

export function validate(config: Record<string, unknown>) {
  const mappedConfig = {
    port: config.PORT,
    host: config.HOST,
    nodeEnv: config.NODE_ENV,
    logLevel: config.LOG_LEVEL,
    database: {
      url: config.DATABASE_URL,
    },
    google: {
      clientId: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET,
      redirectUri: config.GOOGLE_REDIRECT_URI,
      certUrl: config.GOOGLE_CERT_URL,
    },
    frontend: {
      origin: config.FRONTEND_ORIGIN,
    },
    salt: {
      serverUrl: config.SALT_SERVER_URL,
    },
  };

  return AuthServerConfigSchema.parse(mappedConfig);
}
