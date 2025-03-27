// Copyright 2024-2025 kzero authors & contributors
// SPDX-License-Identifier: GNU General Public License v3.0

import { WebSocket } from 'ws';

import { loggers } from './utils/logger.js';

const logger = loggers.proofWorker;

/**
 * WebSocket client with automatic reconnection and heartbeat mechanism
 * Extends the native WebSocket class to add robust connection management
 */
export class WebSocketClient extends WebSocket {
  // Connection management properties
  private reconnectTimer?: NodeJS.Timeout;
  private pingTimer?: NodeJS.Timeout;
  private pongTimer?: NodeJS.Timeout;
  private reconnectAttempts: number = 0;

  // Configuration constants
  private static readonly RECONNECT_INTERVAL = 5000; // 5 seconds
  private static readonly PING_INTERVAL = 30000; // 30 seconds
  private static readonly PONG_TIMEOUT = 5000; // 5 seconds timeout for pong response

  private isPongReceived: boolean = false;

  /**
   * Creates a new WebSocket client with automatic reconnection
   * @param url - WebSocket server URL to connect to
   */
  constructor(url: string) {
    super(url);
    this.initialize();
  }

  /**
   * Initializes event listeners for the WebSocket connection
   */
  private initialize(): void {
    this.on('open', this.handleOpen.bind(this));
    this.on('close', this.handleClose.bind(this));
    this.on('error', this.handleError.bind(this));
    this.on('pong', this.handlePong.bind(this));
  }

  /**
   * Handles successful connection establishment
   * Resets reconnection attempts and starts heartbeat mechanism
   */
  private handleOpen(): void {
    logger.info('WebSocket connection established');
    this.reconnectAttempts = 0;
    this.startPingInterval();
  }

  /**
   * Handles connection closure
   * Cleans up timers and attempts to reconnect
   */
  private handleClose(): void {
    logger.info('WebSocket connection closed');
    this.clearTimers();
    this.attemptReconnect();
  }

  /**
   * Handles WebSocket errors
   * @param error - The error that occurred
   */
  private handleError(error: Error): void {
    logger.error('WebSocket error:', error);
    this.clearTimers();
    this.terminate();
    this.attemptReconnect();
  }

  /**
   * Handles pong responses from the server
   * Resets the pong timeout timer
   */
  private handlePong(): void {
    logger.info('Received pong from server');
    this.isPongReceived = true;

    if (this.pongTimer) {
      clearTimeout(this.pongTimer);
      this.pongTimer = undefined;
    }
  }

  /**
   * Starts the heartbeat mechanism by sending periodic pings
   */
  private startPingInterval(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
    }

    this.pingTimer = setInterval(() => {
      if (this.readyState === WebSocket.OPEN) {
        this.isPongReceived = false;
        logger.info('Sending ping to server');
        this.ping();

        this.pongTimer = setTimeout(() => {
          if (!this.isPongReceived) {
            logger.error('Server did not respond with pong, closing connection');
            this.terminate();
            this.attemptReconnect();
          }
        }, WebSocketClient.PONG_TIMEOUT);
      }
    }, WebSocketClient.PING_INTERVAL);
  }

  /**
   * Cleans up all timers to prevent memory leaks
   */
  private clearTimers(): void {
    [this.pingTimer, this.pongTimer, this.reconnectTimer].forEach((timer) => {
      if (timer) {
        clearTimeout(timer);
      }
    });
    this.pingTimer = this.pongTimer = this.reconnectTimer = undefined;
  }

  /**
   * Attempts to reconnect to the WebSocket server
   * Implements exponential backoff with maximum attempts
   */
  private attemptReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const backoffDelay = WebSocketClient.RECONNECT_INTERVAL * Math.pow(2, this.reconnectAttempts);

    this.reconnectTimer = setTimeout(() => {
      logger.info(`Attempting to reconnect... (attempt ${this.reconnectAttempts + 1})`);
      this.reconnectAttempts++;
      this.connect();
    }, backoffDelay);
  }

  /**
   * Initiates a new WebSocket connection
   * Resets reconnection attempts counter
   */
  public connect(): void {
    try {
      if (this.readyState === WebSocket.CLOSED) {
        logger.info('Creating new connection after disconnect');
      }

      this.reconnectAttempts = 0;
    } catch (error) {
      logger.error('Failed to create WebSocket connection:', error);
      this.attemptReconnect();
    }
  }

  /**
   * Closes the WebSocket connection and cleans up resources
   */
  public override close(): void {
    this.clearTimers();
    super.close();
  }
}
