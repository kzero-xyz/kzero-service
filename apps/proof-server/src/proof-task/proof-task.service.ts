// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

import type { ZKLoginInput } from '@kzero/common';

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PrismaService } from '../prisma/prisma.service.js';
import { ProofWebsocketGateway } from '../proof-websocket/proof-websocket.gateway.js';

const PROOF_TIMEOUT = 15000;

@Injectable()
export class ProofTaskService {
  private readonly logger = new Logger(ProofTaskService.name);
  private readonly processingProofs = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly websocketGateway: ProofWebsocketGateway,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async handleProofTasks() {
    try {
      const proof = await this.prisma.proof.findFirst({
        where: { status: 'WAITING' },
        orderBy: { createdAt: 'asc' },
      });

      if (!proof) {
        return;
      }

      if (this.processingProofs.has(proof.id)) {
        return;
      }

      const worker = this.websocketGateway.getAvailableWorker();

      if (!worker) {
        this.logger.debug('No available workers');

        return;
      }

      this.processingProofs.add(proof.id);

      await this.prisma.proof.update({
        where: { id: proof.id },
        data: { status: 'PROCESSING' },
      });

      this.logger.log(`Assigned proof ${proof.id} to worker`);

      this.websocketGateway.sendTask(worker, proof.id, proof.zkInput as unknown as ZKLoginInput, proof.salt);

      setTimeout(async () => {
        try {
          const currentProof = await this.prisma.proof.findUnique({
            where: { id: proof.id },
          });

          if (currentProof && currentProof.status === 'PROCESSING') {
            this.logger.error(`Proof ${proof.id} generation timeout`);
            await this.prisma.proof.update({
              where: { id: proof.id },
              data: { status: 'FAILED' },
            });
          }
        } catch (error) {
          this.logger.error(`Failed to check proof timeout for ${proof.id}:`, error);
        } finally {
          this.processingProofs.delete(proof.id);
        }
      }, PROOF_TIMEOUT);
    } catch (error) {
      this.logger.error('Error processing proof tasks:', error);
    }
  }
}
