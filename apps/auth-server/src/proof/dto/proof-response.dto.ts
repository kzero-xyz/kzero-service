// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

import { ApiProperty } from '@nestjs/swagger';

/**
 * Proof results data structure
 * Matches the format from tmp/auth-server for compatibility
 */
export class ProofResultsDto {
  @ApiProperty({
    description: 'Proof generation status',
    enum: ['waiting', 'generating', 'generated', 'failed'],
    example: 'generated',
  })
  status!: string;

  @ApiProperty({
    description: 'Public signals from ZK proof',
    type: [String],
    nullable: true,
    example: null,
  })
  public!: string[] | null;

  @ApiProperty({
    description: 'Maximum epoch from nonce',
    type: Number,
    example: 1234567890,
  })
  maxEpoch!: number;

  @ApiProperty({
    description: 'Key ID extracted from JWT header',
    type: String,
    example: 'key-123',
  })
  kid!: string;

  @ApiProperty({
    description: 'Formatted ZK proof as JSON string containing proof_points, iss_base64_details, and header',
    type: String,
    nullable: true,
    example: '{"proof_points":{"a":["..."],"b":[["..."]],"c":["..."]},"iss_base64_details":"...","header":"..."}',
  })
  proof!: string | null;

  @ApiProperty({
    description: 'Address seed derived from the proof',
    type: String,
    nullable: true,
    example: '12345678901234567890123456789012',
  })
  addressSeed!: string | null;

  @ApiProperty({
    description: 'OAuth provider',
    enum: ['google', 'twitter', 'github'],
    example: 'google',
  })
  provider!: string;

  @ApiProperty({
    description: 'User email address',
    type: String,
    nullable: true,
    example: 'user@example.com',
  })
  email!: string | null;

  @ApiProperty({
    description: 'User display name',
    type: String,
    example: 'John Doe',
  })
  name!: string;

  @ApiProperty({
    description: 'User avatar URL',
    type: String,
    nullable: true,
    example: 'https://example.com/avatar.jpg',
  })
  picture!: string | null;

  @ApiProperty({
    description: 'Timestamp when the proof was created',
    type: Date,
    example: '2025-01-01T00:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Timestamp when the proof was last updated',
    type: Date,
    example: '2025-01-01T00:00:00.000Z',
  })
  updatedAt!: Date;

  @ApiProperty({
    description: 'Expiration epoch (same as maxEpoch)',
    type: Number,
    example: 1234567890,
  })
  expiresAt!: number;
}

/**
 * Proof response wrapper
 * Wraps the results in a 'results' field to match tmp/auth-server format
 */
export class ProofResponseDto {
  @ApiProperty({
    description: 'Proof results data',
    type: ProofResultsDto,
  })
  results!: ProofResultsDto;
}
