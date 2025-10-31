// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

import { Module } from '@nestjs/common';

import { ProofWebsocketModule } from '../proof-websocket/proof-websocket.module.js';
import { ProofTaskService } from './proof-task.service.js';

@Module({
  imports: [ProofWebsocketModule],
  providers: [ProofTaskService],
})
export class ProofTaskModule {}
