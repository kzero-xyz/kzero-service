// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetProofDto {
  @ApiProperty({
    description: 'Ephemeral public key in hexadecimal format (must start with 0x)',
    example: '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    type: String,
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  ephemeral_public_key!: string;
}

export class CreateProofDto {
  @ApiProperty({
    description: 'Ephemeral public key in hexadecimal format (must start with 0x)',
    example: '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    type: String,
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  ephemeral_public_key!: string;
}
