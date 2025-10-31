// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

import type { AuthServerConfig } from '../config/config.interface.js';

import { Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { randomBytes } from 'node:crypto';

import { generateNonce, type JWTPayload } from '@kzero/common';

import { PrismaService } from '../prisma/prisma.service.js';

interface OAuth2TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  id_token?: string;
  refresh_token?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AuthServerConfig, true>,
  ) {}

  /**
   * Generate and store a new nonce for zkLogin
   *
   * @param ephemeralPublicKey - The ephemeral public key in hexadecimal format
   * @returns The generated nonce data including authState for OAuth
   */
  async generateAndStoreNonce(ephemeralPublicKey: string) {
    this.logger.log(`Generating nonce for ephemeralPublicKey: ${ephemeralPublicKey}`);

    // Generate nonce using @kzero/common
    const { nonce, randomness, maxEpoch } = generateNonce(ephemeralPublicKey as `0x${string}`);

    // Generate random state for OAuth CSRF protection
    const authState = randomBytes(32).toString('base64url');

    // Store in database
    const storedNonce = await this.prisma.nonce.create({
      data: {
        ephemeralPublicKey,
        nonce,
        randomness,
        maxEpoch: BigInt(maxEpoch),
        authState,
      },
    });

    this.logger.log(`Nonce created with authState: ${authState}`);

    return {
      nonce: storedNonce.nonce,
      randomness: storedNonce.randomness,
      maxEpoch: Number(storedNonce.maxEpoch),
      authState: storedNonce.authState,
    };
  }

  /**
   * Find a nonce by its authState
   *
   * @param authState - The OAuth state parameter
   * @returns The nonce record or null if not found
   */
  async findNonceByAuthState(authState: string) {
    return this.prisma.nonce.findUnique({
      where: { authState },
    });
  }

  generateGoogleAuthUrl(state: string, nonce: string): string {
    const clientId = this.config.get('google.clientId', { infer: true });
    const redirectUri = this.config.get('google.redirectUri', { infer: true });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      nonce,
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeGoogleCode(code: string): Promise<OAuth2TokenResponse> {
    const clientId = this.config.get('google.clientId', { infer: true });
    const clientSecret = this.config.get('google.clientSecret', { infer: true });
    const redirectUri = this.config.get('google.redirectUri', { infer: true });

    const params = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    try {
      const response = await axios.post<OAuth2TokenResponse>('https://oauth2.googleapis.com/token', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      return response.data;
    } catch (error) {
      this.logger.error('Failed to exchange Google code', error);
      throw new UnprocessableEntityException('Failed to exchange authorization code');
    }
  }

  decodeJWT(idToken: string): JWTPayload {
    const parts = idToken.split('.');

    if (parts.length !== 3) {
      throw new UnprocessableEntityException('Invalid JWT format');
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

    return payload;
  }

  async upsertUser(
    sub: string,
    email: string | undefined,
    name: string | undefined,
    picture: string | undefined,
    provider: 'google',
    aud: string,
    tokenData: OAuth2TokenResponse,
  ) {
    const existingUser = await this.prisma.user.findFirst({
      where: { sub },
    });

    // Calculate token expiration time
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    if (existingUser) {
      return await this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          email: email || null,
          name,
          picture,
          tokenType: tokenData.token_type,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || null,
          idToken: tokenData.id_token || null,
          expiresIn: tokenData.expires_in,
          expiresAt,
          updatedAt: new Date(),
        },
      });
    } else {
      return await this.prisma.user.create({
        data: {
          sub,
          email: email || null,
          name: name || sub,
          picture,
          provider: provider === 'google' ? 'google' : 'google',
          tokenType: tokenData.token_type,
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token || null,
          idToken: tokenData.id_token || null,
          expiresIn: tokenData.expires_in,
          expiresAt,
        },
      });
    }
  }

  async generateSalt(jwt: string): Promise<string> {
    const saltServerUrl = this.config.get('salt.serverUrl', { infer: true });
    const nodeEnv = this.config.get('nodeEnv', { infer: true });

    // In production, salt server must be configured
    if (nodeEnv === 'production' && !saltServerUrl) {
      throw new Error('Salt server URL must be configured in production environment');
    }

    // If no salt server URL configured, only allowed in development
    if (!saltServerUrl) {
      if (nodeEnv !== 'development') {
        throw new Error('Salt server URL is required in non-development environments');
      }

      // Generate random salt in development
      const randomBytes = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const salt = Buffer.from(randomBytes).toString('base64');

      this.logger.warn('Using randomly generated salt in development mode');

      return salt;
    }

    try {
      const response = await axios.post(
        `${saltServerUrl}/get_salt`,
        {
          message: jwt,
          provider: 'google',
        },
        {
          headers: { 'Content-Type': 'application/json' },
        },
      );

      const { status, salt, error } = response.data;

      if (status === 'success' && salt) {
        return salt;
      }

      throw new Error(error || 'Unknown error from salt server');
    } catch (error) {
      this.logger.error('Failed to generate salt', error);
      throw error;
    }
  }
}
