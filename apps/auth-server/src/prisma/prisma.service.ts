// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

import type { AuthServerConfig } from '../config/config.interface.js';

import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaClient } from '@kzero/database';

/**
 * PrismaService extends PrismaClient to provide direct access to all Prisma methods
 * including $transaction, $queryRaw, etc. Database configuration is managed by ConfigService.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(config: ConfigService<AuthServerConfig, true>) {
    super({
      datasources: {
        db: {
          url: config.get('database.url', { infer: true }),
        },
      },
      log: config.get('nodeEnv', { infer: true }) === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
