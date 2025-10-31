// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

import { ApiProperty } from '@nestjs/swagger';

export class AuthUrlResponseDto {
  @ApiProperty({
    description: 'Google OAuth authorization URL for user to redirect to',
    example:
      'https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&response_type=code&scope=openid+email+profile&state=abc123...',
    type: String,
  })
  url!: string;
}
