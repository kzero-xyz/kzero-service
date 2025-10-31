// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

// Export Prisma Client instance and types
export { prisma } from './client.js';

// Export PrismaClient class for inheritance
export { PrismaClient, Prisma } from '../generated/client/index.js';

// Re-export Prisma model types for convenience
export type { User, Nonce, Proof } from '../generated/client/index.js';
