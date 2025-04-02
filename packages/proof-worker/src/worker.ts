// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

import type { SuiProofFields, ZKLoginInput } from '@kzero/common';

import { generateProof } from './generateProof.js';
import { WebSocketClient } from './WebSocketClient.js';

/**
 * Message types for WebSocket communication
 */
interface WebSocketMessage {
  task: 'generateProof';
  proofId: string;
  payload: {
    inputs: ZKLoginInput;
    fields: SuiProofFields;
  };
}

/**
 * Starts the proof generation worker
 * Establishes WebSocket connection and handles proof generation requests
 */
export function startWorker(): void {
  const wsUrl = process.env.PROOF_SERVER_WS_URL;

  if (!wsUrl) {
    throw new Error('PROOF_SERVER_WS_URL environment variable is not set');
  }

  const ws = new WebSocketClient(wsUrl);

  ws.on('message', async (message: Buffer) => {
    const data = JSON.parse(message.toString('utf-8')) as WebSocketMessage;

    if (data.task === 'generateProof') {
      const result = await generateProof(data.payload.inputs, data.payload.fields);

      ws.send(
        JSON.stringify({
          task: 'generateProof',
          proofId: data.proofId,
          results: result
        })
      );
    }
  });
}
