# Copyright 2024-2025 kzero authors & contributors
# SPDX-License-Identifier: GNU General Public License v3.0

# Multi-stage Dockerfile for NestJS Proof Server
# Optimized with Turbo prune for minimal monorepo footprint

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

# Prune workspace to only include proof-server and its dependencies
# This creates /app/out with minimal files needed
RUN turbo prune @kzero/proof-server --docker

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
# Ignore scripts in Docker build to avoid husky/git hooks
RUN pnpm install --no-frozen-lockfile --ignore-scripts

# Generate Prisma Client
RUN pnpm --filter @kzero/database prisma:generate

# Build using Turbo (builds all dependencies automatically)
RUN pnpm turbo run build --filter=@kzero/proof-server

# Prune devDependencies for production
# Exclude optional deps to reduce size
RUN pnpm --filter @kzero/proof-server \
    --prod \
    --no-optional \
    deploy pruned

# ============================================
# Stage 3: Production Runtime
# ============================================
FROM node:20-alpine AS runner

# Install runtime dependencies (openssl for Prisma)
RUN apk add --no-cache dumb-init openssl

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy pruned production node_modules from builder
COPY --from=builder --chown=nodejs:nodejs /app/pruned/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/pruned/package.json ./package.json

# Copy all built artifacts
COPY --from=builder --chown=nodejs:nodejs /app/apps/proof-server/dist ./apps/proof-server/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/common/dist ./packages/common/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/database/dist ./packages/database/dist

# Copy Prisma generated client
COPY --from=builder --chown=nodejs:nodejs /app/packages/database/generated ./packages/database/generated

USER nodejs

EXPOSE 3001

# Proof server has WebSocket, health check based on process running
# Note: Add HTTP health endpoint if needed for better monitoring

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/proof-server/dist/main.js"]
