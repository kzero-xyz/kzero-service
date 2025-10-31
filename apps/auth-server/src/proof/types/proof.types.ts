// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

/**
 * Groth16 proof format
 * Matches tmp/auth-server Groth16Proof type
 */
export interface Groth16Proof {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
  protocol?: string;
  curve?: string;
}

/**
 * Public signals from ZK proof
 * Matches tmp/auth-server PublicSignals type
 */
export type PublicSignals = string[];

/**
 * Sui proof fields containing address seed and other Sui-specific data
 * Matches tmp/auth-server SuiProofFields type
 */
export interface SuiProofFields {
  address_seed: string;
  iss_base64_details: string;
  header: string;
}

/**
 * ZK Login input data structure
 * Matches tmp/auth-server ZKLoginInput type
 */
export interface ZKLoginInput {
  [key: string]: unknown;
}

/**
 * Proof entity from database
 */
export interface ProofEntity {
  id: string;
  nonce: string;
  jwt: string;
  inputs: ZKLoginInput | null;
  fields: SuiProofFields | null;
  proof: Groth16Proof | null;
  public: PublicSignals | null;
  status: 'waiting' | 'generating' | 'generated' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Nonce entity from database
 */
export interface NonceEntity {
  id: string;
  ephemeralPublicKey: string;
  nonce: string;
  maxEpoch: bigint;
  randomness: string;
  authState: string;
  createdAt: Date;
}

/**
 * User entity from database
 */
export interface UserEntity {
  id: string;
  sub: string;
  email: string | null;
  name: string;
  picture: string | null;
  provider: 'google' | 'twitter' | 'github';
  tokenType: string;
  accessToken: string;
  refreshToken: string | null;
  idToken: string | null;
  expiresIn: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}
