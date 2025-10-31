// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

import type { Request, Response } from 'express';
import type { AuthServerConfig } from '../config/config.interface.js';

import {
  Controller,
  Get,
  Logger,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiCookieAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { type JWTPublicKeyData } from '@kzero/common';
import { Prisma } from '@kzero/database';

import { PrismaService } from '../prisma/prisma.service.js';
import { AuthUrlResponseDto } from './dto/auth-response.dto.js';
import { InitiateOAuthDto, OAuthCallbackDto } from './dto/login.dto.js';
import {
  getOAuthCookiePath,
  getOAuthStateCookieName,
  getOAuthStateCookieOptions,
  OAUTH_PROVIDERS,
} from './auth.constants.js';
import { AuthService } from './auth.service.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AuthServerConfig, true>,
  ) {}

  @Get('google')
  @ApiOperation({
    summary: 'Initiate Google OAuth authorization',
    description: `Start Google OAuth2.0 authorization flow

**Flow**:
1. Backend automatically generates nonce and stores it in database
2. Sets OAuth state cookie (CSRF protection)
3. Returns Google authorization URL
4. Frontend redirects user to the URL

**Note**: Frontend must use \`credentials: 'include'\` to receive cookie`,
  })
  @ApiQuery({
    name: 'ephemeral_public_key',
    description: 'Ephemeral public key (hexadecimal format with 0x prefix)',
    example: '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully returns OAuth authorization URL',
    type: AuthUrlResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed (ephemeral_public_key format error)',
  })
  @ApiCookieAuth('google-oauth-state')
  async initiateGoogleAuth(@Query() query: InitiateOAuthDto, @Res() res: Response) {
    const { ephemeral_public_key } = query;

    this.logger.log(`Initiating Google OAuth for ephemeralPublicKey: ${ephemeral_public_key}`);

    // Auto-generate nonce (replicating old Fastify logic)
    const { nonce, authState } = await this.authService.generateAndStoreNonce(ephemeral_public_key);

    // Set state cookie for CSRF protection (replicating Fastify @fastify/oauth2 behavior)
    const cookieName = getOAuthStateCookieName(OAUTH_PROVIDERS.GOOGLE);
    const cookieOptions = getOAuthStateCookieOptions(
      this.config.get('nodeEnv', { infer: true }) === 'production',
      OAUTH_PROVIDERS.GOOGLE,
    );

    res.cookie(cookieName, authState, cookieOptions);

    this.logger.log(`Generated authState: ${authState}, cookie set`);

    // Use authState as the OAuth state parameter
    const authUrl = this.authService.generateGoogleAuthUrl(authState, nonce);

    return res.json({ url: authUrl });
  }

  @Get('google/callback')
  @ApiOperation({
    summary: 'Google OAuth callback handler',
    description: `Handle Google OAuth redirect callback

**Internal Flow**:
1. Verify OAuth state (Cookie + Database dual verification)
2. Exchange authorization code for tokens
3. Parse JWT to get user information
4. Generate salt (call salt server or use random value)
5. Generate ZK proof input
6. Store proof to database
7. Redirect to frontend

**Note**: This endpoint is typically called automatically by Google, no manual request needed`,
  })
  @ApiQuery({ name: 'code', description: 'OAuth authorization code', required: true, example: '4/0AY0e-g7...' })
  @ApiQuery({ name: 'state', description: 'OAuth state parameter (for verification)', required: true })
  @ApiResponse({
    status: 302,
    description: 'Successfully processed callback, redirect to frontend',
  })
  @ApiResponse({
    status: 401,
    description: 'CSRF verification failed (state cookie mismatch or missing)',
  })
  @ApiResponse({
    status: 422,
    description: 'Invalid authorization code or JWT format error',
  })
  async handleGoogleCallback(
    @Query() query: OAuthCallbackDto & Record<string, unknown>,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const { state, code, scope, authuser, prompt } = query;

    this.logger.log(`Google callback - authState: ${state}`);

    // Log OAuth metadata for audit and debugging
    if (scope || authuser || prompt) {
      this.logger.debug(
        {
          scope: scope || 'default(openid email profile)',
          authuser: authuser || '0',
          prompt: prompt || 'default',
        },
        'OAuth callback metadata received',
      );
    }

    // Step 1: Verify cookie state (CSRF protection - replicating Fastify checkStateFunction)
    const cookieName = getOAuthStateCookieName(OAUTH_PROVIDERS.GOOGLE);
    const cookiePath = getOAuthCookiePath(OAUTH_PROVIDERS.GOOGLE);

    const stateCookie = req.cookies[cookieName];

    if (!stateCookie) {
      this.logger.error('Missing state cookie - possible CSRF attack');
      throw new UnauthorizedException('Missing state cookie');
    }

    if (state !== stateCookie) {
      this.logger.error(`State mismatch - URL: ${state}, Cookie: ${stateCookie}`);
      throw new UnauthorizedException('Invalid state parameter - CSRF detected');
    }

    this.logger.debug('State verification passed, clearing cookie');

    // Step 2: Clear cookie (one-time use)
    res.clearCookie(cookieName, { path: cookiePath });

    // Step 3: Verify nonce in database
    const nonce = await this.authService.findNonceByAuthState(state);

    if (!nonce) {
      throw new UnprocessableEntityException('Invalid state parameter - nonce not found');
    }

    const tokenData = await this.authService.exchangeGoogleCode(code);

    if (!tokenData.id_token) {
      throw new UnprocessableEntityException('No id_token in response');
    }

    const payload = this.authService.decodeJWT(tokenData.id_token);

    if (!payload.sub) {
      throw new UnprocessableEntityException('Invalid JWT: missing sub claim');
    }

    if (!payload.aud) {
      throw new UnprocessableEntityException('Invalid JWT: missing aud claim');
    }

    await this.authService.upsertUser(
      payload.sub,
      payload.email as string | undefined,
      payload.name as string | undefined,
      payload.picture as string | undefined,
      'google',
      payload.aud as string,
      tokenData,
    );

    try {
      this.logger.debug('Generating salt from salt server');
      const salt = await this.authService.generateSalt(tokenData.id_token);

      this.logger.debug(`Salt generated: ${salt}`);

      const certs = await fetch(this.config.get('google.certUrl', { infer: true }))
        .then((r) => r.json())
        .then((json) => (json as { keys: JWTPublicKeyData[] }).keys);

      const { generateZKInput } = await import('@kzero/common');

      const { fields, inputs } = await generateZKInput({
        jwt: tokenData.id_token,
        salt,
        epoch: nonce.maxEpoch.toString(),
        keyStr: nonce.ephemeralPublicKey as `0x${string}`,
        randomness: nonce.randomness,
        certs,
      });

      await this.prisma.proof.create({
        data: {
          nonce: nonce.nonce,
          jwt: tokenData.id_token,
          inputs: inputs as unknown as Prisma.InputJsonValue,
          fields: fields as unknown as Prisma.InputJsonValue,
          proof: Prisma.JsonNull,
          public: Prisma.JsonNull,
          status: 'waiting',
        },
      });
    } catch (error) {
      this.logger.error('Failed to create proof', error);

      await this.prisma.proof.create({
        data: {
          nonce: nonce.nonce,
          jwt: tokenData.id_token,
          inputs: {} as Prisma.InputJsonValue,
          fields: Prisma.JsonNull,
          proof: Prisma.JsonNull,
          public: Prisma.JsonNull,
          status: 'failed',
        },
      });
    }

    const frontendOrigin = this.config.get('frontend.origin', { infer: true });

    return res.redirect(`${frontendOrigin}?close=1`);
  }
}
