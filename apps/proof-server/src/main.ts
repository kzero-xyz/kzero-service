// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

import type { ProofServerConfig } from './config/config.interface.js';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));

  app.useWebSocketAdapter(new WsAdapter(app));

  const configService = app.get(ConfigService<ProofServerConfig, true>);
  const logger = app.get(Logger);

  const port = configService.get('port', { infer: true });
  const host = configService.get('host', { infer: true });

  await app.listen(port, host);

  logger.log(`Proof Server is running on ws://${host}:${port}/ws`, 'Bootstrap');
}

bootstrap();
