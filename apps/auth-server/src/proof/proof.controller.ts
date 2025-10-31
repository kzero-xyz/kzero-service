// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

import { Controller, Get, Logger, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { GetProofDto } from './dto/proof.dto.js';
import { ProofResponseDto } from './dto/proof-response.dto.js';
import { ProofService } from './proof.service.js';

@ApiTags('proof')
@Controller('proof')
export class ProofController {
  private readonly logger = new Logger(ProofController.name);

  constructor(private readonly proofService: ProofService) {}

  @Get()
  @ApiOperation({
    summary: 'Query ZK proof',
    description: `Query ZK proof information by ephemeral public key

**Query Flow**:
1. Find the nonce by ephemeral_public_key
2. Find proof by nonce string
3. Extract user info from JWT
4. Format proof data for Sui zkLogin required format
5. Return complete proof information (including user info)

**Status Values**:
- waiting: Proof in generation queue
- generating: Proof is being generated
- generated: Proof generation completed
- failed: Generation failed

**Use Case**: Frontend calls this endpoint to get generated ZK proof after OAuth callback`,
  })
  @ApiQuery({
    name: 'ephemeral_public_key',
    description: 'Ephemeral public key (hexadecimal format with 0x prefix)',
    example: '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully returns proof information',
    type: ProofResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Proof record not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed (ephemeral_public_key format error)',
  })
  async getProof(@Query() query: GetProofDto): Promise<ProofResponseDto> {
    const { ephemeral_public_key } = query;

    this.logger.log(`Getting proof for ephemeral key: ${ephemeral_public_key}`);

    const data = await this.proofService.findProofByEphemeralKey(ephemeral_public_key);

    // Extract kid from JWT header (matches tmp/auth-server logic)
    const kid = JSON.parse(Buffer.from(data.jwt.split('.')[0], 'base64').toString()).kid as string;

    // Format proof as JSON string (matches tmp/auth-server format)
    const formattedProof =
      data.proof && data.fields
        ? JSON.stringify({
            proof_points: {
              a: data.proof.pi_a,
              b: data.proof.pi_b,
              c: data.proof.pi_c,
            },
            iss_base64_details: data.fields.iss_base64_details,
            header: data.fields.header,
          })
        : null;

    // Return response matching tmp/auth-server format exactly
    return {
      results: {
        status: data.status,
        public: data.public,
        maxEpoch: Number(data.nonce.maxEpoch),
        kid,
        proof: formattedProof,
        addressSeed: data.fields ? data.fields.address_seed : null,
        provider: data.user.provider,
        email: data.user.email ? data.user.email : null,
        name: data.user.name,
        picture: data.user.picture ? data.user.picture : null,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        expiresAt: Number(data.nonce.maxEpoch),
      },
    };
  }
}
