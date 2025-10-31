// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class InitiateOAuthDto {
  @ApiProperty({
    description: 'Ephemeral public key in hexadecimal format (must start with 0x)',
    example: '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    type: String,
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  @Length(66, 66) // 0x + 64 hex characters
  ephemeral_public_key!: string;
}

/**
 * OAuth callback query parameters
 *
 * Note: This DTO only validates required parameters (state, code).
 * Additional OAuth parameters (scope, authuser, prompt, etc.) are allowed
 * but not validated, as they may vary across OAuth providers and versions.
 */
export class OAuthCallbackDto {
  @ApiProperty({
    description: 'OAuth state parameter for CSRF protection verification',
    example: 'abc123xyz789randomstate',
    type: String,
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  state!: string;

  @ApiProperty({
    description: 'OAuth authorization code obtained from authorization server',
    example: '4/0AY0e-g7XXXXXXXXXXXXXXXXXXX',
    type: String,
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  code!: string;
}
