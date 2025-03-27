// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

import {
  poseidon1,
  poseidon2,
  poseidon3,
  poseidon4,
  poseidon5,
  poseidon6,
  poseidon7,
  poseidon8,
  poseidon9,
  poseidon10,
  poseidon11,
  poseidon12,
  poseidon13,
  poseidon14,
  poseidon15,
  poseidon16
} from 'poseidon-lite';

/**
 * Collection of Poseidon hash functions for different input lengths
 *
 * Each function in this array is optimized for a specific number of inputs:
 * - poseidon1: handles 1 input
 * - poseidon2: handles 2 inputs
 * - ...
 * - poseidon16: handles 16 inputs
 *
 * These functions are used for efficient cryptographic hashing in zero-knowledge proofs
 */
const poseidonHashFunctions = [
  poseidon1,
  poseidon2,
  poseidon3,
  poseidon4,
  poseidon5,
  poseidon6,
  poseidon7,
  poseidon8,
  poseidon9,
  poseidon10,
  poseidon11,
  poseidon12,
  poseidon13,
  poseidon14,
  poseidon15,
  poseidon16
];

/**
 * Computes a Poseidon hash of the input array
 *
 * The Poseidon hash function is designed specifically for zero-knowledge proofs,
 * providing efficient hashing of field elements while maintaining security properties.
 *
 * @param inputs - Array of values to hash (can be numbers, bigints, or strings)
 * @returns The computed hash as a bigint
 * @throws {Error} If input length is greater than 32 elements
 *
 * @example
 * // Hash 3 inputs
 * const hash = poseidonHash([1, 2, 3]);
 *
 * // Hash 20 inputs (will use recursive hashing)
 * const largeHash = poseidonHash(Array(20).fill(1));
 */
export function poseidonHash(inputs: (number | bigint | string)[]): bigint {
  // Try to use a direct hash function if available
  const hashFunction = poseidonHashFunctions[inputs.length - 1];

  if (hashFunction) {
    return hashFunction(inputs);
  }

  // For inputs longer than 16 elements, use recursive hashing
  if (inputs.length <= 32) {
    const midPoint = Math.floor(inputs.length / 2);
    const hash1 = poseidonHash(inputs.slice(0, midPoint));
    const hash2 = poseidonHash(inputs.slice(midPoint));

    return poseidonHash([hash1, hash2]);
  }

  throw new Error(`Yet to implement: Unable to hash a vector of length ${inputs.length}`);
}
