// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

import type { PublicKey } from '@mysten/sui/cryptography';
import type { HexString } from '@polkadot/util/types';

import { Ed25519PublicKey } from '@mysten/sui.js/keypairs/ed25519';
import { generateNonce as generateNonceBase, generateRandomness } from '@mysten/sui/zklogin';
import { hexToU8a } from '@polkadot/util';

/**
 * Generates a cryptographic nonce for ZK-Login authentication
 *
 * This function creates a nonce using the ephemeral public key and a maximum epoch time.
 * The nonce is used in zero-knowledge proof generation for secure authentication.
 *
 * @param ephemeralPublicKey - The ephemeral public key in hexadecimal format
 * @param maxEpoch - The maximum epoch time in milliseconds (default: current time + 24 hours)
 * @returns {Object} An object containing:
 *   - nonce: The generated cryptographic nonce
 *   - randomness: Random value used in nonce generation for security
 *   - maxEpoch: The maximum epoch time for nonce validity
 */
export function generateNonce(
  ephemeralPublicKey: HexString,
  maxEpoch: number = Date.now() + 3600 * 24 * 1000,
): { nonce: string; randomness: string; maxEpoch: number } {
  // Convert hex string to Ed25519 public key
  const ephemeralPublicKeyEd25519 = new Ed25519PublicKey(hexToU8a(ephemeralPublicKey));

  // Generate random value for nonce creation
  const randomness = generateRandomness();

  // Create nonce using the ephemeral key, max epoch, and randomness
  const nonce = generateNonceBase(ephemeralPublicKeyEd25519 as unknown as PublicKey, maxEpoch, randomness);

  return { nonce, randomness, maxEpoch };
}
