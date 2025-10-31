// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

import pino from 'pino';

import { type LoggerConfig, LoggerConfigSchema } from './config.js';

/**
 * Create Pino transport configuration
 * @param format - Log format (json or text)
 * @returns Pino transport options
 */
function createTransport(format: 'json' | 'text'): pino.TransportSingleOptions | undefined {
  if (format === 'text') {
    return {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'yyyy-mm-dd HH:MM:ss',
        ignore: 'pid,hostname',
        singleLine: false,
      },
    };
  }

  return undefined;
}

/**
 * Create a logger instance with advanced configuration
 *
 * @param config - Logger configuration
 * @returns Pino logger instance
 *
 * @example
 * ```typescript
 * const logger = createModuleLogger({
 *   module: 'MyModule',
 *   level: 'debug',
 *   format: 'text',
 *   logPath: '/var/log/app',
 * });
 *
 * logger.info('Hello world');
 * logger.error({ err: error }, 'Failed to process');
 * ```
 */
export function createModuleLogger(config: Partial<LoggerConfig>): pino.Logger {
  const validatedConfig = LoggerConfigSchema.parse(config);

  // Base logger options
  const loggerOptions: pino.LoggerOptions = {
    level: validatedConfig.level,
    // Add module name to all log entries
    base: {
      module: validatedConfig.module,
      ...validatedConfig.metadata,
    },
    // Pino natively supports BigInt
    serializers: {
      err: pino.stdSerializers.err,
    },
  };

  // Configure transport for text format (pino-pretty)
  const transport = createTransport(validatedConfig.format);

  if (transport) {
    loggerOptions.transport = transport;
  }

  // Create destination stream for file logging
  let destination: pino.DestinationStream | undefined;

  if (validatedConfig.logPath) {
    destination = pino.destination({
      dest: `${validatedConfig.logPath}/${validatedConfig.module}.log`,
      sync: false, // Asynchronous writing for better performance
      mkdir: true, // Create directory if it doesn't exist
    });
  }

  // Create logger instance
  const logger = pino(loggerOptions, destination);

  return logger;
}

/**
 * Create a simple logger instance with default configuration
 *
 * @param module - Module name for the logger
 * @returns Pino logger instance
 *
 * @example
 * ```typescript
 * const logger = createSimpleLogger('AuthService');
 * logger.info('User authenticated');
 * ```
 */
export function createSimpleLogger(module: string): pino.Logger {
  return createModuleLogger({ module });
}
