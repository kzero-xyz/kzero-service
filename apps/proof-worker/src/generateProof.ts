// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

import type { Groth16Proof, SuiProofFields, ZKLoginInput } from '@kzero/common';

import { mkdirp, readJson, writeJson } from 'fs-extra/esm';
import { exec } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { groth16, wtns } from 'snarkjs';

import { loggers } from './utils/logger.js';

const execAsync = promisify(exec);

const logger = loggers.generateProof;

/**
 * Proof generation mode
 */
type ProofMode = 'wasm' | 'binary';

/**
 * Validates and returns the proof mode from environment variable
 */
function getProofMode(): ProofMode {
  const mode = process.env.PROOF_MODE || 'wasm';

  if (mode !== 'wasm' && mode !== 'binary') {
    throw new Error(`Invalid PROOF_MODE: ${mode}. Must be 'wasm' or 'binary'`);
  }

  return mode;
}

// Configuration constants
const CONFIG = {
  baseCacheDir: process.env.CACHE_DIR || '.cache',
  zkeyPath: process.env.ZKEY_PATH || 'assets/zkLogin.zkey',
  witnessBinPath: resolve(process.cwd(), process.env.WITNESS_BIN_PATH || 'zkLogin'),
  proverBinPath: resolve(process.cwd(), process.env.PROVER_BIN_PATH || 'prover'),
  proofMode: getProofMode(),
} as const;

/**
 * Represents the result of proof generation
 */
interface ProofResult {
  proof: Groth16Proof;
  public: string[];
}

/**
 * Generates witness using WASM method
 */
async function generateWitnessWasm(inputs: ZKLoginInput, witnessPath: string): Promise<void> {
  const wasmPath = new URL('../assets/zkLogin.wasm', import.meta.url).pathname;

  await wtns.calculate(inputs, wasmPath, witnessPath);
}

/**
 * Generates witness using binary executable method
 */
async function generateWitnessBinary(inputPath: string, witnessPath: string): Promise<void> {
  await execAsync(`${CONFIG.witnessBinPath} ${inputPath} ${witnessPath}`, {
    cwd: process.cwd(),
  });
}

/**
 * Generates proof using WASM method
 */
async function generateProofWasm(witnessPath: string): Promise<{ proof: Groth16Proof; publicSignals: string[] }> {
  const { proof, publicSignals } = await groth16.prove(CONFIG.zkeyPath, witnessPath);

  return { proof, publicSignals };
}

/**
 * Generates proof using binary executable method
 */
async function generateProofBinary(
  witnessPath: string,
  proofPath: string,
  publicPath: string,
): Promise<{ proof: Groth16Proof; publicSignals: string[] }> {
  await execAsync(`${CONFIG.proverBinPath} ${CONFIG.zkeyPath} ${witnessPath} ${proofPath} ${publicPath}`);

  const [proof, publicSignals] = await Promise.all([readJson(proofPath), readJson(publicPath)]);

  return { proof, publicSignals };
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
    public: `${cacheDir}/public.json`,
  };
  const start = performance.now();

  try {
    logger.info(`Using ${CONFIG.proofMode} mode for proof generation`);

    // Prepare directory and input file
    await mkdirp(cacheDir);
    await writeJson(paths.input, inputs);

    // Generate witness
    logger.info('Generating witness...');

    if (CONFIG.proofMode === 'wasm') {
      await generateWitnessWasm(inputs, paths.witness);
    } else {
      await generateWitnessBinary(paths.input, paths.witness);
    }

    // Generate proof
    logger.info('Generating proof...');
    let proof: Groth16Proof;
    let publicSignals: string[];

    if (CONFIG.proofMode === 'wasm') {
      ({ proof, publicSignals } = await generateProofWasm(paths.witness));
    } else {
      ({ proof, publicSignals } = await generateProofBinary(paths.witness, paths.proof, paths.public));
    }

    const end = performance.now();

    logger.info(`Proof generation completed in ${end - start}ms using ${CONFIG.proofMode} mode`);
    logger.info(`View proof: ${paths.proof}`);
    logger.info(`View publicSignals: ${paths.public}`);

    return { proof, public: publicSignals };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error(`Failed to generate proof: ${errorMessage}`);
    throw new Error(`Failed to generate proof: ${errorMessage}`);
  }
}
