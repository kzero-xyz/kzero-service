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

## 🌟 Project Intro

Kzero is a Substrate-based framework that facilitates transaction initiation on the blockchain using a zkLogin mechanism, enabling users to access Web3 applications without private keys. By leveraging zkSNARKs and OpenID providers, Kzero ensures seamless onboarding, on-demand key management, and high-security assurance. Any Substrate-based blockchain can easily integrate Kzero to improve user experience and adoption.

This repository serves as a Zero-Knowledge Proof (ZKP) generation worker for KZero services. You can use it to implement the entire process of generating a ZKP through JWT authentication.

## 📌 Workflow
![workflow](./assets/kzero-workflow.png)
> To learn more about the workflow and tech detail of the KZero project, please refer to [here](https://github.com/w3f/Grants-Program/blob/master/applications/KZero.md?plain=1#L65).


## 📖 Repo Intro
Kzero generates user on-chain accounts through OAuth2 providers. Users log in via their social accounts and obtain a JSON Web Token (JWT). This token is then combined with some user-defined data and sent to a service that generates a Zero-Knowledge Proof (ZKP). This is where Kzero ZK Circuit comes to work. The ZKP verifies that the user is the legitimate account owner without revealing their identity or any private information on-chain. Once authenticated, the user can perform transactions via their kzero account, just like a regular Polkadot account.

![repo-pipeline](./assets/pipeline.png)
This repo pipeline involves:
1. Witness Generation:
The witness is computed rapidly, benefiting from native execution speeds.
2. Proof Generation Using GPU rapidsnark:
The use of a GPU significantly reduces proof generation time, as demonstrated by our benchmarks.


## 📦 Packages

- [@kzero/common](./packages/common) - Common utilities and cryptographic functions
- [@kzero/database](./packages/database) - Shared database layer with Prisma ORM
- [@kzero/logger](./packages/logger) - Structured logging system
- [@kzero/proof-worker](./packages/proof-worker) - Zero-knowledge proof generation worker with JWT
- [@kzero/dev](./packages/dev) - Development utilities and configurations

## 🚀 Applications

- [@kzero/auth-server](./apps/auth-server) - OAuth2 authentication server with zkLogin support (NestJS + Express)
- [@kzero/proof-server](./apps/proof-server) - WebSocket proof generation task server (NestJS + WebSocket)

## 🛠️ Technology Stack
- Node.js (>=20)
- TypeScript
- pnpm (v10.17.1)
- NestJS (Backend framework)
- Prisma (ORM)
- PostgreSQL (Database)
- Turbo (Monorepo tooling)
- ESLint
- Husky (Git hooks)
- Commitizen (Conventional commits)

## 🚀 Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 10.17.1

### Installation
```bash
pnpm install
```

### Start development mode
```bash
# Compile all packages in watch mode
pnpm dev

# Start individual services
pnpm dev:auth    # Auth server only (port 3000)
pnpm dev:proof   # Proof server only (port 3001)
```

### Development Scripts
- `pnpm dev` - Compile all packages in watch mode (common, logger, database, proof-worker)
- `pnpm dev:auth` - Start auth server only
- `pnpm dev:proof` - Start proof server only
- `pnpm build` - Build all packages and apps
- `pnpm check-types` - Run TypeScript type checking
- `pnpm lint` - Run ESLint
- `pnpm commit` - Create a conventional commit
- `pnpm db:migrate` - Run Prisma migrations
- `pnpm db:studio` - Open Prisma Studio (database GUI)


## 😄 Using the Proof Worker CLI

This repository serves as a Zero-Knowledge Proof (ZKP) generation worker for KZero services. It is designed to efficiently generate ZKPs, leveraging cryptographic techniques to ensure privacy and data integrity. The worker facilitates seamless integration with KZero’s authentication flow, enabling the generation of ZKPs based on JWT authentication.

### Configuration

#### Environment Variables

- `CACHE_DIR` - Directory for caching (default: '.cache')
- `ZKEY_PATH` - Path to zkey file (default: 'zkLogin-main.zkey')
- `WITNESS_BIN_PATH` - Path to witness binary
- `PROVER_BIN_PATH` - Path to prover binary
- `LOG_LEVEL` - Logging level (default: 'info')
- `LOG_PATH` - Path to log file (optional)

#### Binary Tools Setup

1. Download the zkLogin binary tools (witness and prover)
2. Set the environment variables:
   ```bash
   export WITNESS_BIN_PATH=/path/to/zkLogin
   export PROVER_BIN_PATH=/path/to/prover
   export ZKEY_PATH=/path/to/zkeyfile
   ```

### Usage
The proof worker provides the capability to generate Zero-Knowledge Proofs (ZKPs) from JWTs and related data.

#### 🔥🔥🔥 Generate Proof

To Generate a zero-knowledge proof from JWT and related data:

```bash
npx @kzero/proof-worker gen-proof [options]
```

##### Options
- `-j, --jwt <string>` - JWT token to generate proof for (required)
- `-s, --salt <string>` - Salt value for proof generation (optional)
- `-e, --epoch <string>` - Epoch value for proof generation (required)
- `-k, --key <string>` - Ephemeral public key for proof generation (required)
- `-r, --randomness <string>` - Randomness value for proof generation (required)
- `-c, --cert-url <string>` - URL to fetch JWT certificates from (required)

##### Example
This example uses a JWT for testing purposes. If you want to test with your own Google account, please obtain the corresponding JWT through KZero.


```bash
npx @kzero/proof-worker gen-proof \
  --jwt "eyJhbGciOiJSUzI1NiIsImtpZCI6ImM3ZTA0NDY1NjQ5ZmZhNjA2NTU3NjUwYzdlNjVmMGE4N2FlMDBmZTgiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmdvb2dsZS5jb20iLCJhenAiOiI1NjA2MjkzNjU1MTctbXQ5ajlhcmZsY2dpMzVpOGhwb3B0cjY2cWdvMWxtZm0uYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJhdWQiOiI1NjA2MjkzNjU1MTctbXQ5ajlhcmZsY2dpMzVpOGhwb3B0cjY2cWdvMWxtZm0uYXBwcy5nb29nbGV1c2VyY29udGVudC5jb20iLCJzdWIiOiIxMTExNDA0NjE1MzAyNDYxNjQ1MjYiLCJub25jZSI6InRWRURLbE1rSmtLaC1zYjMweU01ZDdIeXNRZyIsIm5iZiI6MTc0MzU5NDEzNywiaWF0IjoxNzQzNTk0NDM3LCJleHAiOjE3NDM1OTgwMzcsImp0aSI6IjAxNmQxNDk1YjJmM2MxMWVkZjU4NmIzMWIxODEzZjMxMjQ1NDk4YjEifQ.Yu-bk__ZkWYhl--xDrn_9tUWBYXvxhOGyM4UT8TnsTzK1P7nJitMwdw1aUycjhq73QnW8Uo93CznidzzJkbdgDhpWJkJR5Okfjmv0Tttztr4FfpGj-fpcXtt-MlOAkscVC1QJn4q6QMVxK9wHxZtc4W1aBRQ0nKihLynh_LT7KeAZdond25qa4ExdvHZhgoQE2sb3C9g6XmFVNgudgrW9uglhGZ0ANa6SvFUN3vIKwCHpLlN-4hsNOdTkT4ZHQaN0X0woiNE8E52F2HKN4ZtdjIxBtPYJu7Q0WYv4xmTfMy91XyczlQC1UF4VY3DpHL8m9fyP0Re2TCNGAMx5J4EQA" \
  --epoch "1" \
  --key "0xfafd1d9e25a87e9652976a7bb06c2e4777c2e539d90f3ee7b6b12b9a45118a88" \
  --randomness "29229108527107981601948220068988" \
  --cert-url "https://www.googleapis.com/oauth2/v3/certs"
```
Upon successful execution, you will see the following output.

```json
2025-04-02 12:35:09 [info] [GenerateProof] Generating witness...
2025-04-02 12:35:09 [info] [GenerateProof] Generating proof...
2025-04-02 12:35:17 [info] [GenerateProof] Proof generation completed
2025-04-02 12:35:17 [info] [GenerateProof] View proof: .cache/21797023810714368266541174046699843715453488322175928041755462465644045791324/proof.json
2025-04-02 12:35:17 [info] [GenerateProof] View publicSignals: .cache/21797023810714368266541174046699843715453488322175928041755462465644045791324/public.json
```

This indicates that the KZero circuit has been successfully executed and a ZKP has been generated for you. The output includes `proof.json` and `public.json`, which will assist in verifying the ZKP on-chain.


### Troubleshooting
Common issues and solutions:
1. **Binary not found**
   - Ensure the binary paths are correctly set in environment variables
   - Check if the binaries have execute permissions
2. **Certificate fetch failed**
   - Verify the cert-url is accessible
   - Check network connectivity
3. **Cache directory issues**
   - Ensure the cache directory is writable
   - Check disk space availability


## 📄 License
GNU General Public License v3.0

## 📖 Reference
- kzero-circuit: https://github.com/kzero-xyz/kzero-circuit
- kzero-circuit-spec: https://github.com/kzero-xyz/kzero-grant-docs/blob/main/kzero-circuit-spec.md
- A Comparative Analysis of Witness and Proof Generation Approaches for Kzero: https://github.com/kzero-xyz/kzero-grant-docs/blob/main/kzero-zkp-approaches-analysis.md
- Guide to Generating Witness and Proof for Kzero Circuit Using Kzero ZKP Witness & ZKP Service: https://github.com/kzero-xyz/kzero-grant-docs/blob/main/kzero-zkp-service-guide.md
