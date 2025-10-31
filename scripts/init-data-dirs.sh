#!/bin/bash

# Initialize data directories for Docker volumes with proper permissions
# Usage: ./scripts/init-data-dirs.sh [DATA_DIR]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DATA_DIR="${1:-./data}"
POSTGRES_DIR="${DATA_DIR}/postgres"
REDIS_DIR="${DATA_DIR}/redis"

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Docker Volume Initialization${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if directories already exist
if [ -d "${POSTGRES_DIR}" ] || [ -d "${REDIS_DIR}" ]; then
  echo -e "${YELLOW}⚠️  Warning: Data directories already exist${NC}"
  echo ""
  echo "Existing directories:"
  [ -d "${POSTGRES_DIR}" ] && echo "  - ${POSTGRES_DIR}"
  [ -d "${REDIS_DIR}" ] && echo "  - ${REDIS_DIR}"
  echo ""
  read -p "Do you want to continue? This will preserve existing data. (y/N): " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}✗ Aborted${NC}"
    exit 1
  fi
fi

echo "📁 Creating data directories..."
mkdir -p "${POSTGRES_DIR}"
mkdir -p "${REDIS_DIR}"
echo -e "${GREEN}✓${NC} Created: ${DATA_DIR}"

echo ""
echo "🔒 Setting permissions..."

# PostgreSQL requires 700 permissions
chmod 700 "${POSTGRES_DIR}"
echo -e "${GREEN}✓${NC} PostgreSQL: 700 (${POSTGRES_DIR})"

# Redis requires 700 permissions
chmod 700 "${REDIS_DIR}"
echo -e "${GREEN}✓${NC} Redis: 700 (${REDIS_DIR})"

echo ""
echo "📝 Creating .env file with data paths..."

# Check if .env exists
if [ -f ".env" ]; then
  echo -e "${YELLOW}⚠️  .env file already exists${NC}"
  read -p "Do you want to update it? (y/N): " -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Skipping .env update${NC}"
  else
    # Backup existing .env
    cp .env .env.backup
    echo -e "${GREEN}✓${NC} Backed up: .env -> .env.backup"

    # Update or add data paths
    if grep -q "POSTGRES_DATA_PATH=" .env; then
      sed -i.bak "s|POSTGRES_DATA_PATH=.*|POSTGRES_DATA_PATH=${DATA_DIR}/postgres|" .env
      sed -i.bak "s|REDIS_DATA_PATH=.*|REDIS_DATA_PATH=${DATA_DIR}/redis|" .env
      rm .env.bak 2>/dev/null || true
    else
      echo "" >> .env
      echo "# Data Persistence Paths" >> .env
      echo "POSTGRES_DATA_PATH=${DATA_DIR}/postgres" >> .env
      echo "REDIS_DATA_PATH=${DATA_DIR}/redis" >> .env
    fi
    echo -e "${GREEN}✓${NC} Updated: .env"
  fi
else
  # Create new .env from example
  if [ -f ".env.example" ]; then
    cp .env.example .env
    sed -i.bak "s|POSTGRES_DATA_PATH=|POSTGRES_DATA_PATH=${DATA_DIR}/postgres|" .env
    sed -i.bak "s|REDIS_DATA_PATH=|REDIS_DATA_PATH=${DATA_DIR}/redis|" .env
    rm .env.bak 2>/dev/null || true
    echo -e "${GREEN}✓${NC} Created: .env (from .env.example)"
  else
    echo -e "${RED}✗ .env.example not found${NC}"
    echo "Please create .env manually with:"
    echo "  POSTGRES_DATA_PATH=${DATA_DIR}/postgres"
    echo "  REDIS_DATA_PATH=${DATA_DIR}/redis"
  fi
fi

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Initialization complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Directory structure:"
echo "  ${DATA_DIR}/"
echo "    ├── postgres/ (PostgreSQL data)"
echo "    └── redis/    (Redis data)"
echo ""
echo "Next steps:"
echo "  1. Review your .env file"
echo "  2. Run: docker compose up -d"
echo ""
