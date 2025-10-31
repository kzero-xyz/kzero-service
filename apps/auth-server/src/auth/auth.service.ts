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

  /**
   * Generate Google OAuth authorization URL
   *
   * @param state - OAuth state parameter for CSRF protection
   * @param nonce - The nonce that binds the ephemeral key to the OAuth flow
   * @returns The complete Google authorization URL
   */
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

  /**
   * Exchange OAuth authorization code for tokens
   *
   * @param code - The authorization code received from Google's callback
   * @returns OAuth token response including access_token, refresh_token, and id_token
   * @throws UnprocessableEntityException if token exchange fails
   */
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

  /**
   * Decode JWT without signature verification
   *
   * Note: Does not verify signature. JWT came from Google's token endpoint over HTTPS,
   * so signature verification will happen later in the ZK circuit.
   *
   * @param idToken - The JWT id_token from Google
   * @returns The decoded JWT payload
   * @throws UnprocessableEntityException if JWT format is invalid
   */
  decodeJWT(idToken: string): JWTPayload {
    const parts = idToken.split('.');

    if (parts.length !== 3) {
      throw new UnprocessableEntityException('Invalid JWT format');
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

    return payload;
  }

  /**
   * Create or update user record
   *
   * Uses 'sub' as unique identifier. Updates tokens and profile if user exists,
   * creates new record otherwise.
   *
   * @param sub - OAuth subject (unique user identifier)
   * @param email - User's email address
   * @param name - User's display name
   * @param picture - User's profile picture URL
   * @param provider - OAuth provider (currently only 'google' supported)
   * @param aud - OAuth audience (client ID)
   * @param tokenData - Complete OAuth token response
   * @returns The created or updated user record
   */
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

    // Calculate token expiration time (current time + expires_in seconds)
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    if (existingUser) {
      // Update existing user: refresh tokens and profile
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
      // Create new user: first time login
      return await this.prisma.user.create({
        data: {
          sub,
          email: email || null,
          name: name || sub, // Fallback to sub if name not provided
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

  /**
   * Generate salt for zkLogin address derivation
   *
   * Environment-dependent behavior:
   * - Production: SALT_SERVER_URL required, calls external salt server
   * - Development: SALT_SERVER_URL optional, generates random salt if not configured
   *
   * @param jwt - The id_token JWT from OAuth provider
   * @returns Base64-encoded salt value
   * @throws Error if salt server not configured in production or returns error
   */
  async generateSalt(jwt: string): Promise<string> {
    const saltServerUrl = this.config.get('salt.serverUrl', { infer: true });
    const nodeEnv = this.config.get('nodeEnv', { infer: true });

    // Strict production requirement
    if (nodeEnv === 'production' && !saltServerUrl) {
      throw new Error('Salt server URL must be configured in production environment');
    }

    // Development fallback: random salt
    if (!saltServerUrl) {
      if (nodeEnv !== 'development') {
        throw new Error('Salt server URL is required in non-development environments');
      }

      // Generate cryptographically weak random salt (dev only!)
      const randomBytes = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const salt = Buffer.from(randomBytes).toString('base64');

      this.logger.warn('Using randomly generated salt in development mode');

      return salt;
    }

    // Production: call external salt server
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
