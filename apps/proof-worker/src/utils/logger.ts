// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

import { createModuleLogger, type Logger, type LoggerConfig } from '@kzero/logger';

/**
 * Predefined loggers for different modules
 */
export const loggers = {
  proofWorker: createModuleLogger({
    module: 'ProofWorker',
    logPath: process.env.LOG_PATH,
    level: process.env.LOG_LEVEL as LoggerConfig['level'],
    format: 'text',
  }) as Logger,
  generateProof: createModuleLogger({
    module: 'GenerateProof',
    logPath: process.env.LOG_PATH,
    level: process.env.LOG_LEVEL as LoggerConfig['level'],
    format: 'text',
  }) as Logger,
};
