#!/usr/bin/env bash
# ==============================================================================
# TelePlay — Android Termux Installation & Setup Script
# ==============================================================================
# Sets up the complete TelePlay runtime environment inside Android Termux:
# 1. Verifies Termux environment and package manager
# 2. Installs Node.js LTS and Git
# 3. Prepares directories (data, backups, logs)
# 4. Configures environment variables (.env) with secure admin token
# 5. Installs project dependencies and builds production bundles
# ==============================================================================

set -euo pipefail

# Text colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE}        TelePlay Termux Installer            ${NC}"
echo -e "${BLUE}==============================================${NC}"

# 1. Environment Detection
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${PROJECT_ROOT}"

echo -e "\n${BLUE}[1/5] Checking environment...${NC}"
IS_TERMUX=false
if [ -n "${PREFIX:-}" ] && [[ "${PREFIX}" == *"com.termux"* ]]; then
  IS_TERMUX=true
  echo -e "${GREEN}✓ Android Termux environment detected.${NC}"
else
  echo -e "${YELLOW}! Not running in Termux (Desktop / Linux mode). Skipping Termux pkg upgrades.${NC}"
fi

# 2. Package Management (Termux only)
if [ "${IS_TERMUX}" = true ]; then
  echo -e "\n${BLUE}[2/5] Updating packages and installing prerequisites...${NC}"
  pkg update -y
  pkg install -y nodejs-lts git
  # termux-tools provides termux-wake-lock
  pkg install -y termux-tools || true
else
  echo -e "\n${BLUE}[2/5] Skipping Termux package installation.${NC}"
fi

# Verify Node.js
if ! command -v node >/dev/null 2>&1; then
  echo -e "${RED}✗ Error: Node.js is not installed or not in PATH.${NC}"
  exit 1
fi

NODE_MAJOR=$(node -v | cut -d'.' -f1 | sed 's/v//')
echo -e "${GREEN}✓ Node.js $(node -v) detected.${NC}"
if [ "${NODE_MAJOR}" -lt 22 ]; then
  echo -e "${RED}✗ Warning: Node.js 22 or higher is recommended for native node:sqlite support.${NC}"
fi

# 3. Create Required Directories
echo -e "\n${BLUE}[3/5] Creating runtime directories...${NC}"
mkdir -p data backups logs

# 4. Environment Configuration
echo -e "\n${BLUE}[4/5] Configuring environment variables (.env)...${NC}"
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env from .env.example${NC}"
  else
    cat << 'EOF' > .env
PORT=3000
HOST=0.0.0.0
NODE_ENV=production
LOG_LEVEL=info
DATABASE_PATH=./data/teleplay.db
BACKUP_DIR=./backups
ADMIN_TOKEN=teleplay_admin_change_me_in_production
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
EOF
    echo -e "${GREEN}✓ Created default .env file${NC}"
  fi

  # Generate random admin token if openssl or node crypto is available
  if command -v node >/dev/null 2>&1; then
    NEW_TOKEN=$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")
    sed -i "s/ADMIN_TOKEN=.*/ADMIN_TOKEN=${NEW_TOKEN}/" .env || true
    echo -e "${GREEN}✓ Generated secure random ADMIN_TOKEN in .env${NC}"
  fi
else
  echo -e "${GREEN}✓ .env file already exists. Preserving existing configuration.${NC}"
fi

# 5. Install Dependencies and Build
echo -e "\n${BLUE}[5/5] Installing dependencies and building production assets...${NC}"
npm run install:all

echo -e "\n${BLUE}Compiling backend TypeScript...${NC}"
npm run build:backend

echo -e "\n${BLUE}Compiling frontend static bundle...${NC}"
npm run build:frontend

# Ensure operational scripts are executable
chmod +x scripts/termux/*.sh 2>/dev/null || true

echo -e "\n${GREEN}==============================================${NC}"
echo -e "${GREEN}✓ TelePlay installation completed successfully!${NC}"
echo -e "${GREEN}==============================================${NC}"
echo -e "\nTo start the TelePlay server in the background with wake-lock:"
echo -e "  ${BLUE}./scripts/termux/start.sh${NC}"
echo -e "\nTo monitor logs:"
echo -e "  ${BLUE}tail -f logs/teleplay.log${NC}"
echo -e "\nTo stop the server:"
echo -e "  ${BLUE}./scripts/termux/stop.sh${NC}\n"

