// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { PrismaService } from '../prisma/prisma.service.js';
import { ProofWebsocketGateway } from '../proof-websocket/proof-websocket.gateway.js';

/**
 * Proof generation timeout (600 seconds)
 *
 * Typical generation: 10-30s. Adjust based on worker performance.
 */
const PROOF_TIMEOUT = 600000;

/**
 * Proof Task Scheduler Service
 *
 * Polls database every 10 seconds for pending proofs and assigns them to available workers.
 * Uses FIFO ordering, 60-second timeout, and in-memory Set to prevent duplicate assignments.
 */
@Injectable()
export class ProofTaskService {
  private readonly logger = new Logger(ProofTaskService.name);

  /**
   * Set of proof IDs currently being processed (prevents duplicate assignments)
   */
  private readonly processingProofs = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly websocketGateway: ProofWebsocketGateway,
  ) {}

  @Cron(CronExpression.EVERY_SECOND)
  async handleProofTasks() {
    try {
      // Find oldest pending proof (FIFO)
      const proof = await this.prisma.proof.findFirst({
        where: { status: 'waiting' },
        orderBy: { createdAt: 'asc' },
      });

      if (!proof) {
        return;
      }

      // Prevent duplicate processing
      if (this.processingProofs.has(proof.id)) {
        return;
      }

      // Get available worker
      const worker = this.websocketGateway.getAvailableWorker();

      if (!worker) {
        this.logger.debug('No available workers');

        return;
      }

      this.processingProofs.add(proof.id);

      // Update status and send to worker
      await this.prisma.proof.update({
        where: { id: proof.id },
        data: { status: 'generating' },
      });

      this.logger.log(`Assigned proof ${proof.id} to worker`);

      this.websocketGateway.sendTask(worker, proof);

      // Start timeout timer (mark as failed if not completed in 60s)
      setTimeout(async () => {
        try {
          const currentProof = await this.prisma.proof.findUnique({
            where: { id: proof.id },
          });

          if (currentProof && currentProof.status === 'generating') {
            this.logger.error(`Proof ${proof.id} generation timeout (60s exceeded)`);
            await this.prisma.proof.update({
              where: { id: proof.id },
              data: { status: 'failed' },
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
