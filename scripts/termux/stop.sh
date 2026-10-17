#!/usr/bin/env bash
# ==============================================================================
# TelePlay — Android Termux Daemon Stop Script
# ==============================================================================
# 1. Reads PID from logs/teleplay.pid
# 2. Sends graceful SIGTERM and waits for shutdown
# 3. Releases Android wakelock to allow battery saving
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${PROJECT_ROOT}"

PID_FILE="logs/teleplay.pid"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

if [ ! -f "${PID_FILE}" ]; then
  echo -e "${YELLOW}TelePlay PID file (${PID_FILE}) not found. Server does not appear to be running.${NC}"
  # Ensure wake-lock is released anyway
  if command -v termux-wake-unlock >/dev/null 2>&1; then
    termux-wake-unlock
  fi
  exit 0
fi

PID=$(cat "${PID_FILE}")

if ! kill -0 "${PID}" 2>/dev/null; then
  echo -e "${YELLOW}Process ${PID} is not running. Cleaning up stale PID file.${NC}"
  rm -f "${PID_FILE}"
  if command -v termux-wake-unlock >/dev/null 2>&1; then
    termux-wake-unlock
  fi
  exit 0
fi

echo -e "${BLUE}Stopping TelePlay server (PID: ${PID})...${NC}"
kill -TERM "${PID}" 2>/dev/null || true

# Wait up to 10 seconds for graceful shutdown
STOPPED=false
for i in {1..10}; do
  if ! kill -0 "${PID}" 2>/dev/null; then
    STOPPED=true
    break
  fi
  sleep 1
done

if [ "${STOPPED}" = false ]; then
  echo -e "${YELLOW}Graceful shutdown timed out. Forcing termination...${NC}"
  kill -9 "${PID}" 2>/dev/null || true
fi

rm -f "${PID_FILE}"
echo -e "${GREEN}✓ TelePlay server stopped successfully.${NC}"

# Release Termux wake-lock
if command -v termux-wake-unlock >/dev/null 2>&1; then
  echo -e "${BLUE}Releasing Termux wake lock...${NC}"
  termux-wake-unlock
  echo -e "${GREEN}✓ Termux wake lock released.${NC}"
fi

