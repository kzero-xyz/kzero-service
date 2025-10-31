// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

import type {
  Groth16Proof,
  NonceEntity,
  ProofEntity,
  PublicSignals,
  SuiProofFields,
  UserEntity,
  ZKLoginInput,
} from './types/proof.types.js';

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createDecoder } from 'fast-jwt';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ProofService {
  private readonly logger = new Logger(ProofService.name);
  private readonly jwtDecoder = createDecoder();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Find proof by ephemeral public key
   * Matches tmp/auth-server query logic:
   * 1. Find nonce by ephemeralPublicKey
   * 2. Find proof by nonce string
   * 3. Extract sub from JWT and find user
   *
   * @param ephemeralPublicKey - Ephemeral public key (hex string)
   * @returns Proof with associated nonce and user data
   */
  async findProofByEphemeralKey(ephemeralPublicKey: string) {
    this.logger.log(`Finding proof by ephemeralPublicKey: ${ephemeralPublicKey}`);

    // Step 1: Find nonce by ephemeralPublicKey
    const nonce = await this.prisma.nonce.findUnique({
      where: {
        ephemeralPublicKey,
      },
    });

    if (!nonce) {
      throw new NotFoundException('Nonce not found for the given ephemeral public key');
    }

    // Step 2: Find proof by nonce string
    const proof = await this.prisma.proof.findUnique({
      where: {
        nonce: nonce.nonce,
      },
    });

    if (!proof) {
      throw new NotFoundException('Proof not found for the given nonce');
    }

    // Step 3: Extract sub from JWT payload
    const payload = this.jwtDecoder(proof.jwt);
    const sub = payload.sub as string;

    if (!sub) {
      throw new NotFoundException('Invalid JWT: missing sub claim');
    }

    // Step 4: Find user by sub
    const user = await this.prisma.user.findUnique({
      where: { sub },
      select: {
        id: true,
        sub: true,
        email: true,
        name: true,
        picture: true,
        provider: true,
        tokenType: true,
        accessToken: true,
        refreshToken: true,
        idToken: true,
        expiresIn: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found for the given sub');
    }

    // Return combined data with proper typing
    return {
      ...proof,
      inputs: proof.inputs as ZKLoginInput | null,
      fields: proof.fields as SuiProofFields | null,
      proof: proof.proof as Groth16Proof | null,
      public: proof.public as PublicSignals | null,
      status: proof.status as ProofEntity['status'],
      nonce: nonce as NonceEntity,
      user: user as UserEntity,
    };
  }
}
