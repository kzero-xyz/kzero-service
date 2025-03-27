// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

import stringify from 'safe-stable-stringify';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

import { type LoggerConfig, LoggerConfigSchema } from './config.js';

const { format, createLogger, transports } = winston;

const jsonStringify = stringify.configure({ bigint: true });

/**
 * Custom log format with timestamp and module name
 */
const createLogFormat = (formatType: 'json' | 'text') => {
  const baseFormat = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.splat()
  );

  return formatType === 'json'
    ? format.combine(baseFormat, format.json({ bigint: true }))
    : format.combine(
        baseFormat,
        format.colorize(),
        format.printf(({ timestamp, level, message, module, ...metadata }) => {
          let msg = `${timestamp} [${level}]`;

          if (module) {
            msg += ` [${module}]`;
          }

          msg += ` ${message}`;

          if (Object.keys(metadata).length > 0) {
            msg += ` ${jsonStringify(metadata)}`;
          }

          return msg;
        })
      );
};

/**
 * Create file transport with rotation
 */
const createFileTransport = (config: LoggerConfig, level?: string) => {
  if (!config.logPath) return null;

  return new DailyRotateFile({
    filename: `${level || 'combined'}-%DATE%.log`,
    dirname: config.logPath,
    datePattern: 'YYYY-MM-DD',
    maxSize: config.maxSize,
    maxFiles: config.maxFiles,
    level,
    format: createLogFormat(config.format)
  });
};

/**
 * Create a logger instance with advanced configuration
 * @param config - Logger configuration
 * @returns Winston logger instance
 */
export function createModuleLogger(config: Partial<LoggerConfig>): winston.Logger {
  const validatedConfig = LoggerConfigSchema.parse({
    ...config,
    metadata: {
      ...config.metadata,
      module: config.module
    }
  });

  const loggerTransports: winston.transport[] = [];

  // Add console transport if enabled
  if (validatedConfig.console) {
    loggerTransports.push(
      new transports.Console({
        format: createLogFormat(validatedConfig.format)
      })
    );
  }

  // Add file transports if log path is configured
  if (validatedConfig.logPath) {
    // Error log transport
    const errorTransport = createFileTransport(validatedConfig, 'error');

    if (errorTransport) loggerTransports.push(errorTransport);

    // Combined log transport
    const combinedTransport = createFileTransport(validatedConfig);

    if (combinedTransport) loggerTransports.push(combinedTransport);
  }

  // Add custom transports
  loggerTransports.push(...validatedConfig.customTransports);

  // Create logger instance
  const logger = createLogger({
    level: validatedConfig.level,
    format: createLogFormat(validatedConfig.format),
    defaultMeta: validatedConfig.metadata,
    transports: loggerTransports,
    exitOnError: false
  });

  // Add error handling
  logger.on('error', (error) => {
    console.error('Logger error:', error);
  });

  return logger;
}

/**
 * Create a simple logger instance with default configuration
 * @param module - Module name for the logger
 * @returns Winston logger instance
 */
export function createSimpleLogger(module: string): winston.Logger {
  return createModuleLogger({ module });
}
