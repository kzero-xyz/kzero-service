// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';

import { validate } from './config/env.validation.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ProofTaskModule } from './proof-task/proof-task.module.js';
import { ProofWebsocketModule } from './proof-websocket/proof-websocket.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL || 'info',
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  translateTime: 'yyyy-mm-dd HH:MM:ss',
                  singleLine: false,
                },
              }
            : undefined,
        autoLogging: false,
      },
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    ProofWebsocketModule,
    ProofTaskModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
