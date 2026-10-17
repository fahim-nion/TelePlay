#!/usr/bin/env bash
# ==============================================================================
# TelePlay — Android Termux Daemon Start Script
# ==============================================================================
# 1. Acquires Android wakelock to prevent CPU sleep
# 2. Checks if TelePlay is already running
# 3. Starts the backend server in the background
# 4. Redirects logs to logs/teleplay.log and saves PID to logs/teleplay.pid
# 5. Performs a health check ping to confirm readiness
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${PROJECT_ROOT}"

PID_FILE="logs/teleplay.pid"
LOG_FILE="logs/teleplay.log"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

mkdir -p logs data backups

# 1. Check if already running
if [ -f "${PID_FILE}" ]; then
  PID=$(cat "${PID_FILE}")
  if kill -0 "${PID}" 2>/dev/null; then
    echo -e "${YELLOW}TelePlay is already running (PID: ${PID}).${NC}"
    echo -e "To view logs: tail -f ${LOG_FILE}"
    echo -e "To stop: ./scripts/termux/stop.sh"
    exit 0
  else
    rm -f "${PID_FILE}"
  fi
fi

# 2. Acquire Termux wake lock if on Android
if command -v termux-wake-lock >/dev/null 2>&1; then
  echo -e "${BLUE}Acquiring Termux wake lock...${NC}"
  termux-wake-lock
fi

# 3. Read environment configuration
PORT=3000
HOST="0.0.0.0"
if [ -f .env ]; then
  PORT=$(grep -E '^PORT=' .env | cut -d'=' -f2- | tr -d ' "\r' || echo "3000")
  HOST=$(grep -E '^HOST=' .env | cut -d'=' -f2- | tr -d ' "\r' || echo "0.0.0.0")
fi
PORT="${PORT:-3000}"
HOST="${HOST:-0.0.0.0}"

# 4. Verify compiled backend exists
if [ ! -f "backend/dist/server.js" ]; then
  echo -e "${YELLOW}Compiled server not found. Building backend...${NC}"
  npm run build:backend
fi

# 5. Start server in background
echo -e "${BLUE}Starting TelePlay backend on ${HOST}:${PORT}...${NC}"
export NODE_ENV=production
nohup node backend/dist/server.js >> "${LOG_FILE}" 2>&1 &
SERVER_PID=$!
echo "${SERVER_PID}" > "${PID_FILE}"

# 6. Verify startup
echo -n "Waiting for server to become ready"
READY=false
for i in {1..15}; do
  if kill -0 "${SERVER_PID}" 2>/dev/null; then
    if curl -s "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1; then
      READY=true
      break
    fi
  else
    break
  fi
  echo -n "."
  sleep 1
done
echo ""

if [ "${READY}" = true ]; then
  echo -e "${GREEN}✓ TelePlay backend started successfully! (PID: ${SERVER_PID})${NC}"
  echo -e "  API URL: ${BLUE}http://127.0.0.1:${PORT}/api/health${NC}"
  echo -e "  Logs:    ${BLUE}${LOG_FILE}${NC}"
  echo -e "  PID:     ${BLUE}${PID_FILE}${NC}"
else
  if kill -0 "${SERVER_PID}" 2>/dev/null; then
    echo -e "${YELLOW}! Process is running (PID: ${SERVER_PID}), but health check did not respond yet.${NC}"
    echo -e "Check logs: tail -n 20 ${LOG_FILE}"
  else
    echo -e "${RED}✗ Failed to start TelePlay backend. Check logs below:${NC}"
    tail -n 20 "${LOG_FILE}" 2>/dev/null || true
    rm -f "${PID_FILE}"
    exit 1
  fi
fi

