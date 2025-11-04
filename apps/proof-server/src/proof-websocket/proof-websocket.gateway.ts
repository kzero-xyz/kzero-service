// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

import type { Server } from 'ws';
import type { Groth16Proof, PublicSignals } from '@kzero/common';
import type { Prisma, Proof } from '@kzero/database';

import { Logger } from '@nestjs/common';
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { WebSocket } from 'ws';

import { PrismaService } from '../prisma/prisma.service.js';

interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
  connectionTimer?: NodeJS.Timeout;
}

interface ProofResultMessage {
  task: 'generateProof';
  proofId: string;
  results: {
    proof: Groth16Proof;
    public: PublicSignals;
  };
}

const CONNECTION_TIMEOUT = 35000;

@WebSocketGateway({ path: '/ws' })
export class ProofWebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ProofWebsocketGateway.name);
  private readonly connectedWorkers = new Map<string, ExtendedWebSocket>();

  constructor(private readonly prisma: PrismaService) {}

  handleConnection(client: ExtendedWebSocket) {
    const workerId = this.generateWorkerId();

    this.connectedWorkers.set(workerId, client);

    client.isAlive = true;
    this.logger.log(`Worker ${workerId} connected. Total workers: ${this.connectedWorkers.size}`);

    client.on('ping', () => {
      client.isAlive = true;
      client.pong();

      if (client.connectionTimer) {
        clearTimeout(client.connectionTimer);
      }

      client.connectionTimer = setTimeout(() => {
        if (!client.isAlive) {
          this.logger.warn(`Worker ${workerId} connection timed out`);
          client.terminate();
        }
      }, CONNECTION_TIMEOUT);
    });

    client.connectionTimer = setTimeout(() => {
      if (!client.isAlive) {
        this.logger.warn(`Worker ${workerId} never sent initial ping`);
        client.terminate();
      }
    }, CONNECTION_TIMEOUT);

    client.on('message', async (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString('utf-8')) as ProofResultMessage;

        if (data.task === 'generateProof') {
          await this.handleProofResult(data.proofId, data.results);
        } else {
          this.logger.warn(`Unknown message type: ${data.task}`);
        }
      } catch (error) {
        this.logger.error('Failed to parse message:', error);
      }
    });
  }

  handleDisconnect(client: ExtendedWebSocket) {
    const workerId = this.findWorkerIdByClient(client);

    if (workerId) {
      this.connectedWorkers.delete(workerId);
      this.logger.log(`Worker ${workerId} disconnected. Total workers: ${this.connectedWorkers.size}`);
    }

    if (client.connectionTimer) {
      clearTimeout(client.connectionTimer);
    }
  }

  getAvailableWorker(): ExtendedWebSocket | null {
    for (const [, client] of this.connectedWorkers.entries()) {
      if (client.isAlive && client.readyState === WebSocket.OPEN) {
        return client;
      }
    }

    return null;
  }

  sendTask(worker: ExtendedWebSocket, proof: Proof) {
    const message = JSON.stringify({
      task: 'generateProof',
      proofId: proof.id,
      payload: { inputs: proof.inputs, fields: proof.fields },
    });

    worker.send(message);
    this.logger.log(`Sent proof task ${proof.id} to worker`);
  }

  private async handleProofResult(proofId: string, data: { proof: Groth16Proof; public: PublicSignals }) {
    try {
      await this.prisma.proof.update({
        where: { id: proofId },
        data: {
          status: 'generated',
          proof: data.proof as unknown as Prisma.InputJsonValue,
          public: data.public as unknown as Prisma.InputJsonValue,
        },
      });

      this.logger.log(`Proof ${proofId} completed successfully`);
    } catch (error) {
      this.logger.error(`Failed to update proof ${proofId}:`, error);

      try {
        await this.prisma.proof.update({
          where: { id: proofId },
          data: { status: 'failed' },
        });
      } catch (updateError) {
        this.logger.error(`Failed to mark proof ${proofId} as failed:`, updateError);
      }
    }
  }

  private generateWorkerId(): string {
    return `worker-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  private findWorkerIdByClient(client: ExtendedWebSocket): string | null {
    for (const [id, worker] of this.connectedWorkers.entries()) {
      if (worker === client) {
        return id;
      }
    }

    return null;
  }
}
