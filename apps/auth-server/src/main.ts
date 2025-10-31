// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

import type { AuthServerConfig } from './config/config.interface.js';

import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));

  const configService = app.get(ConfigService<AuthServerConfig, true>);
  const logger = app.get(Logger);

  // Enable CORS
  app.enableCors({
    origin: configService.get('frontend.origin', { infer: true }),
    credentials: true,
  });

  // Enable cookie parser for OAuth state verification
  app.use(cookieParser());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('kzero Auth Server API')
    .setDescription(`kzero Authentication Service REST API`)
    .setVersion('1.0.0')
    .setContact('kzero Team', 'https://github.com/kzero-xyz', 'dev@kzero.xyz')
    .setLicense('GNU General Public License v3.0', 'https://www.gnu.org/licenses/gpl-3.0.html')
    .addServer('http://localhost:3000', 'Local Development')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api-docs', app, document, {
    customSiteTitle: 'kzero Auth API Documentation',
  });

  const port = configService.get('port', { infer: true });
  const host = configService.get('host', { infer: true });

  await app.listen(port, host);
  logger.log(`🚀 Auth Server is running on http://${host}:${port}`, 'Bootstrap');
  logger.log(`📚 API Documentation available at http://${host}:${port}/api-docs`, 'Bootstrap');
}

bootstrap();
