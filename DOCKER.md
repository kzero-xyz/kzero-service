# Docker Deployment Guide

This document describes how to deploy kzero-service using Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose v2.0+
- Downloaded zkLogin.zkey file (588MB)

## Quick Start

### 1. Prepare Assets

Download the ZK proof assets for the proof-worker (can run before `pnpm install`):

```bash
# From project root (no dependencies required)
pnpm setup:proof-worker
```

This will download `zkLogin.zkey` (588MB) to `apps/proof-worker/assets/`.

### 2. Configure Environment

Copy the example environment files and configure them:

```bash
cp apps/auth-server/.env.example apps/auth-server/.env
cp apps/proof-server/.env.example apps/proof-server/.env
cp apps/proof-worker/.env.example apps/proof-worker/.env
```

Edit the `.env` files with your production values.


#### Important Configuration Steps

Edit `apps/auth-server/.env` and make the following critical configurations:

1. **Set Google Client ID**: Replace the placeholder Google OAuth Client ID with your actual Client ID obtained from Google Cloud Console:
   ```env
    GOOGLE_CLIENT_ID=your-google-client-id
    GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

2. **Set Frontend Origin**: Configure `FRONTEND_ORIGIN` to match the port where kzero-wallet will run. It's recommended to set this to port `5176`:
   ```env
   FRONTEND_ORIGIN=http://localhost:5176
   ```

> **⚠️ Important**: The `FRONTEND_ORIGIN` must match the port where the wallet will run (5176), otherwise CORS errors will occur during authentication.

3. **Comment Out**: If you are running locally, make sure to keep the following line in `apps/auth-server/.env` commented out:
    ```env
    # SALT_SERVER_URL=
    ```
> Do not set any value for `SALT_SERVER_URL` unless you intend to connect to a remote Salt Server.

### 3. Run Database Migration

Before starting the services, run database migrations:

```bash
docker compose run --rm migrate
```

### 4. Start Services

Start all services in detached mode:

```bash
docker compose up -d
```

Or start specific services:

```bash
docker compose up -d auth-server
docker compose up -d proof-server proof-worker
```

### 5. Verify Health

Check service health:

```bash
# Check auth-server health
curl http://localhost:3000/health

# View logs
docker compose logs -f auth-server
docker compose logs -f proof-server
docker compose logs -f proof-worker
```

## Architecture

### Services

| Service | Description | Ports | Dependencies |
|---------|-------------|-------|--------------|
| `postgres` | PostgreSQL 15 database | 5432 | - |
| `migrate` | Database migration runner | - | postgres |
| `auth-server` | OAuth2 + zkLogin auth service | 3000 | postgres |
| `proof-server` | WebSocket proof task scheduler | 3001 | postgres |
| `proof-worker` | ZK proof generation worker | - | proof-server |

### Network

All services run on a custom bridge network `kzero-network` (172.29.0.0/16).

### Volumes

- `postgres_data`: PostgreSQL data (fallback if `POSTGRES_DATA_PATH` not set)
- `apps/proof-worker/assets`: zkLogin.zkey mounted read-only

## Environment Variables

### Docker Compose Variables

Set these in a `.env` file at the project root or export them:

```bash
# Database
POSTGRES_DB=kzero_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-secure-password
POSTGRES_PORT=5432
POSTGRES_DATA_PATH=./data/postgres  # Optional: custom data path

# Services
AUTH_SERVER_PORT=3000
PROOF_SERVER_PORT=3001
PROOF_WORKER_ASSETS_PATH=./apps/proof-worker/assets
```

### Application Variables

Each service has its own `.env` file:

- `apps/auth-server/.env` - OAuth credentials, SALT_SERVER_URL, etc.
- `apps/proof-server/.env` - Proof server configuration
- `apps/proof-worker/.env` - Worker configuration

**Note**: `DATABASE_URL` is automatically set by docker-compose to use container networking.

## Common Operations

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f auth-server
docker compose logs -f proof-server

# Last 100 lines
docker compose logs --tail=100 auth-server
```

### Restart Services

```bash
# Restart all
docker compose restart

# Restart specific service
docker compose restart auth-server
```

### Stop Services

```bash
# Stop all
docker compose down

# Stop and remove volumes (⚠️ deletes data)
docker compose down -v
```

### Scale Proof Workers

```bash
# Run 3 proof workers
docker compose up -d --scale proof-worker=3
```

### Execute Commands Inside Container

```bash
# Open shell in auth-server
docker compose exec auth-server sh

# Run Prisma Studio (requires port mapping)
docker compose exec auth-server pnpm db:studio
```

### Database Operations

```bash
# Run migrations
docker compose run --rm migrate

# Check migration status
docker compose run --rm migrate pnpm exec prisma migrate status

# Reset database (⚠️ destructive)
docker compose run --rm migrate pnpm exec prisma migrate reset
```

## Build Process

The Dockerfiles use a 3-stage build optimized for monorepos:

1. **Pruner**: Uses `turbo prune` to extract minimal dependencies
2. **Builder**: Installs deps, generates Prisma Client, builds TypeScript
3. **Runner**: Production image with only runtime dependencies

### Build Optimizations

- Uses `@kzero/source` custom condition for development-time TypeScript resolution
- Prunes devDependencies with `pnpm deploy`
- Multi-stage builds reduce final image size
- Non-root user for security
- Health checks for monitoring

### Rebuild Images

```bash
# Rebuild all
docker compose build

# Rebuild specific service
docker compose build auth-server

# Force rebuild without cache
docker compose build --no-cache auth-server
```

## Health Checks

### Auth Server

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "uptime": 123.456
}
```

### PostgreSQL

Built-in health check using `pg_isready`:
```bash
docker compose ps postgres
```

## Resource Limits

Default resource limits (can be adjusted in `docker-compose.yml`):

| Service | CPU Limit | Memory Limit | CPU Reserve | Memory Reserve |
|---------|-----------|--------------|-------------|----------------|
| auth-server | 1.5 | 2G | 1.0 | 1536M |
| proof-server | 1.5 | 2G | 1.0 | 1536M |
| proof-worker | 2.0 | 3G | 1.5 | 2G |

## Troubleshooting

### Worker Can't Find zkLogin.zkey

**Problem**: `ENOENT: no such file or directory, open '/app/apps/proof-worker/assets/zkLogin.zkey'`

**Solution**:
```bash
# Download assets locally
pnpm setup:proof-worker

# Verify file exists
ls -lh apps/proof-worker/assets/zkLogin.zkey

# Restart worker
docker compose restart proof-worker
```

### Migration Fails

**Problem**: Migration fails with connection error

**Solution**:
```bash
# Check postgres is healthy
docker compose ps postgres

# View postgres logs
docker compose logs postgres

# Wait for postgres to be ready, then retry
docker compose run --rm migrate
```

### Permission Denied Errors

**Problem**: Permission errors when mounting volumes

**Solution**:
```bash
# Fix ownership (macOS/Linux)
sudo chown -R $(id -u):$(id -g) apps/proof-worker/assets
sudo chown -R $(id -u):$(id -g) data/postgres
```

### Out of Memory

**Problem**: Worker or server crashes with OOM

**Solution**: Increase memory limits in `docker-compose.yml`:
```yaml
deploy:
  resources:
    limits:
      memory: 4G  # Increase from 2G/3G
```

## Production Deployment

### Security Checklist

- [ ] Change default PostgreSQL password
- [ ] Use secrets management (Docker Secrets, Kubernetes Secrets)
- [ ] Enable TLS/SSL for database connections
- [ ] Configure firewall rules (only expose necessary ports)
- [ ] Regular security updates (`docker compose pull`)
- [ ] Enable log rotation (already configured)
- [ ] Use non-root users (already configured)

### Performance Tuning

1. **Database**: Consider external managed PostgreSQL (RDS, Cloud SQL)
2. **Workers**: Scale horizontally based on proof demand
3. **Caching**: Add Redis if needed (not included by default)
4. **Monitoring**: Integrate Prometheus + Grafana
5. **Load Balancing**: Use nginx/traefik for multiple server instances

### Backup Strategy

```bash
# Backup PostgreSQL
docker compose exec -T postgres pg_dump -U postgres kzero_db > backup.sql

# Restore
docker compose exec -T postgres psql -U postgres kzero_db < backup.sql
```

## CI/CD Integration

### Build in CI

```bash
# Build images
docker compose build

# Tag for registry
docker tag kzero-service-auth-server:latest your-registry/kzero-auth-server:v1.0.0

# Push to registry
docker push your-registry/kzero-auth-server:v1.0.0
```

### GitHub Actions Example

```yaml
name: Docker Build
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build images
        run: docker compose build
      - name: Run migrations
        run: docker compose run --rm migrate
      - name: Start services
        run: docker compose up -d
      - name: Health check
        run: |
          sleep 10
          curl -f http://localhost:3000/health
```

## License

GNU General Public License v3.0
