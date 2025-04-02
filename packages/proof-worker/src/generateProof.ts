// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

import type { Groth16Proof, SuiProofFields, ZKLoginInput } from '@kzero/common';

import { mkdirp, readJson, writeJson } from 'fs-extra/esm';
import { exec } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

import { loggers } from './utils/logger.js';

const execAsync = promisify(exec);

const logger = loggers.generateProof;

// Configuration constants
const CONFIG = {
  baseCacheDir: process.env.CACHE_DIR || '.cache',
  zkeyPath: process.env.ZKEY_PATH || 'zkLogin-main.zkey',
  witnessBinPath: resolve(process.cwd(), process.env.WITNESS_BIN_PATH || 'zkLogin'),
  proverBinPath: resolve(process.cwd(), process.env.PROVER_BIN_PATH || 'prover')
} as const;

/**
 * Represents the result of proof generation
 */
interface ProofResult {
  proof: Groth16Proof;
  public: string[];
}

/**
 * Generates a zero-knowledge proof using zkLogin and prover executables
 * The process involves:
 * 1. Creating necessary directories and input files
 * 2. Generating a witness using zkLogin
 * 3. Generating the final proof using the prover
 *
 * @param inputs - Input data for proof generation
 * @param fields - Proof fields containing address seed for file organization
 * @returns Promise resolving to the generated proof and public data
 * @throws Error if any step of the proof generation process fails
 */
export async function generateProof(inputs: ZKLoginInput, fields: SuiProofFields): Promise<ProofResult> {
  const cacheDir = `${CONFIG.baseCacheDir}/${fields.address_seed}`;
  const paths = {
    input: `${cacheDir}/input.json`,
    witness: `${cacheDir}/witness.wtns`,
    proof: `${cacheDir}/proof.json`,
    public: `${cacheDir}/public.json`
  };
  const start = performance.now();

  try {
    // Prepare directory and input file
    await mkdirp(cacheDir);
    await writeJson(paths.input, inputs);

    // Generate witness
    logger.info('Generating witness...');
    await execAsync(`${CONFIG.witnessBinPath} ${paths.input} ${paths.witness}`, {
      cwd: process.cwd()
    });

    // Generate proof
    logger.info('Generating proof...');
    await execAsync(`${CONFIG.proverBinPath} ${CONFIG.zkeyPath} ${paths.witness} ${paths.proof} ${paths.public}`);

    // Read and parse results
    const [proof, publicSignals] = await Promise.all([readJson(paths.proof), readJson(paths.public)]);

    const end = performance.now();

    logger.info(`Proof generation completed in ${end - start}ms`);
    logger.info(`View proof: ${paths.proof}`);
    logger.info(`View publicSignals: ${paths.public}`);

    return { proof, public: publicSignals };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error(`Failed to generate proof: ${errorMessage}`);
    throw new Error(`Failed to generate proof: ${errorMessage}`);
  }
}
