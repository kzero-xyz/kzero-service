# KZero Service

<div align="center">

![KZero service](./assets/logo.svg)

[![License](https://img.shields.io/badge/License-GNU%20General%20Public%20License%20v3.0-green.svg)](https://opensource.org/license/gpl-3-0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-orange)](https://www.typescriptlang.org/)
[![Turbo](https://img.shields.io/badge/Turbo-latest-purple)](https://turbo.build/)
[![GitHub Stars](https://img.shields.io/github/stars/kzero-xyz/kzero-service.svg?color=yellow)](https://github.com/kzero-xyz/kzero-service/stargazers)

A monorepo containing the core services and libraries for the KZero project.

[Website](https://kzero.xyz) · [Report Bug](https://github.com/kzero-xyz/kzero-service/issues) · [Request Feature](https://github.com/kzero-xyz/kzero-service/issues)

</div>

## 🌟 Features

- Modular architecture using monorepo structure
- TypeScript-first development
- Proof generation capabilities
- Standardized logging system
- Common utilities and cryptographic functions

## 📦 Packages

- [@kzero/common](./packages/common) - Common utilities and cryptographic functions
- [@kzero/logger](./packages/logger) - Structured logging system
- [@kzero/proof-worker](./packages/proof-worker) - Zero-knowledge proof generation worker with JWT
- [@kzero/dev](./packages/dev) - Development utilities and configurations

## 🛠️ Technology Stack

- Node.js (>=20)
- TypeScript
- Yarn (v4.7.0)
- Turbo (Monorepo tooling)
- ESLint
- Husky (Git hooks)
- Commitizen (Conventional commits)

## 🚀 Getting Started

### Prerequisites

- Node.js >= 20
- Yarn >= 4.7.0

### Installation

```bash
yarn install
```

### Development

```bash
# Start development mode
yarn dev

# Type checking
yarn check-types

# Build all packages
yarn build

# Clean build artifacts
yarn clean

# Lint code
yarn lint
```

## Using the Proof Worker CLI

For detailed instructions on generating zero-knowledge proofs with our CLI tool, please refer to the [Proof Worker Documentation](./packages/proof-worker/README.md). The documentation provides comprehensive guidance on configuration, command options, and troubleshooting.

## 📜 Scripts

- `yarn dev` - Start development mode
- `yarn build` - Build all packages
- `yarn check-types` - Run TypeScript type checking
- `yarn clean` - Clean build artifacts
- `yarn lint` - Run ESLint
- `yarn commit` - Create a conventional commit

## 📄 License

GNU General Public License v3.0