# @kzero/database

Shared database layer with Prisma ORM for the kzero monorepo.

## Features

- **Prisma ORM**: Type-safe database access
- **PostgreSQL**: Production-ready relational database
- **Shared Models**: User, Nonce, and Proof entities
- **Development Seeds**: Sample data for local development

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Generate Prisma Client:
```bash
pnpm prisma:generate
```

4. Run migrations:
```bash
pnpm prisma:migrate:dev
```

## Usage

Import the Prisma Client in your application:

```typescript
import { prisma } from '@kzero/database';

// Query users
const users = await prisma.user.findMany();

// Create a new user
const user = await prisma.user.create({
  data: {
    email: 'user@example.com',
    aud: 'google',
    sub: 'google-user-id',
  },
});
```

## Models

### User
Stores OAuth user information (Google/GitHub authentication).

### Nonce
Stores ephemeral keys and nonces for zkLogin authentication.

### Proof
Stores ZK proof generation requests and results.

## Scripts

- `pnpm build`: Build the package
- `pnpm dev`: Build in watch mode
- `pnpm prisma:generate`: Generate Prisma Client
- `pnpm prisma:migrate:dev`: Create and apply migrations (dev)
- `pnpm prisma:migrate:deploy`: Apply migrations (production)
- `pnpm prisma:studio`: Open Prisma Studio (database GUI)

## Development

When you make changes to `prisma/schema.prisma`, run:

```bash
pnpm prisma:generate
pnpm prisma:migrate:dev --name your_migration_name
```

## Production

For production deployments:

1. Set `DATABASE_URL` environment variable
2. Run migrations: `pnpm prisma:migrate:deploy`
3. Generate client: `pnpm prisma:generate`
