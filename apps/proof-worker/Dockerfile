# Copyright 2024-2025 kzero authors & contributors
# SPDX-License-Identifier: GNU General Public License v3.0

# Multi-stage Dockerfile for Proof Worker
# Optimized with Turbo prune for minimal monorepo footprint
# Note: zkLogin.zkey (588MB) must be mounted externally

# ============================================
# Stage 1: Pruner - Extract workspace subset
# ============================================
FROM node:20-alpine AS pruner

# Setup pnpm and turbo
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && \
    corepack prepare pnpm@10.17.1 --activate && \
    pnpm config set store-dir /root/.pnpm-store && \
    pnpm add -g turbo@2.5.8

WORKDIR /app

# Copy entire monorepo
COPY . .

# Prune workspace to only include proof-worker and its dependencies
# This creates /app/out with minimal files needed
RUN turbo prune @kzero/proof-worker --docker

# ============================================
# Stage 2: Builder - Build application
# ============================================
FROM node:20-alpine AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable && \
    corepack prepare pnpm@10.17.1 --activate

WORKDIR /app

# Copy source code from pruned output FIRST
# This is critical because TypeScript uses customConditions "@kzero/source"
# which references source files during dependency resolution
COPY --from=pruner /app/out/full/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# Install ALL dependencies (including devDependencies)
# Ignore scripts in Docker build to avoid husky/git hooks and asset download
RUN pnpm install --no-frozen-lockfile --ignore-scripts

# Build using Turbo (builds all dependencies automatically)
RUN pnpm turbo run build --filter=@kzero/proof-worker

# Prune devDependencies for production
# Exclude optional deps to reduce size
RUN pnpm --filter @kzero/proof-worker \
    --prod \
    --no-optional \
    deploy pruned

# ============================================
# Stage 3: Production Runtime
# ============================================
FROM node:20-alpine AS runner

# Install runtime dependencies
RUN apk add --no-cache dumb-init

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy pruned production node_modules from builder
COPY --from=builder --chown=nodejs:nodejs /app/pruned/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/pruned/package.json ./package.json

# Copy all built artifacts
COPY --from=builder --chown=nodejs:nodejs /app/apps/proof-worker/dist ./apps/proof-worker/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/common/dist ./packages/common/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/logger/dist ./packages/logger/dist

# Create assets and cache directories with proper permissions
RUN mkdir -p /app/apps/proof-worker/assets && \
    mkdir -p /app/apps/proof-worker/.cache && \
    chown -R nodejs:nodejs /app/apps/proof-worker

USER nodejs

# Set working directory for cache resolution
WORKDIR /app/apps/proof-worker

# Proof worker doesn't expose HTTP port, it's a background service
# Health check is based on process running and WebSocket connectivity

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js", "start"]
