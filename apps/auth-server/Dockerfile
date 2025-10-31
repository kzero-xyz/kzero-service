# Copyright 2024-2025 kzero authors & contributors
# SPDX-License-Identifier: GNU General Public License v3.0

# Multi-stage Dockerfile for NestJS Auth Server
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

# Prune workspace to only include auth-server and its dependencies
# This creates /app/out with minimal files needed
RUN turbo prune @kzero/auth-server --docker

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
RUN pnpm turbo run build --filter=@kzero/auth-server

# Prune devDependencies for production
# Exclude optional deps to reduce size
RUN pnpm --filter @kzero/auth-server \
    --prod \
    --no-optional \
    deploy pruned

# ============================================
# Stage 3: Production Runtime
# ============================================
FROM node:20-alpine AS runner

# Install runtime dependencies (openssl for Prisma, curl for healthcheck)
RUN apk add --no-cache dumb-init curl openssl

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

# Copy pruned production node_modules from builder
COPY --from=builder --chown=nodejs:nodejs /app/pruned/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/pruned/package.json ./package.json

# Copy all built artifacts
COPY --from=builder --chown=nodejs:nodejs /app/apps/auth-server/dist ./apps/auth-server/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/common/dist ./packages/common/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/database/dist ./packages/database/dist

# Copy Prisma generated client
COPY --from=builder --chown=nodejs:nodejs /app/packages/database/generated ./packages/database/generated

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "apps/auth-server/dist/main.js"]
