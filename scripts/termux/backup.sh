#!/usr/bin/env bash
# ==============================================================================
# TelePlay — Android Termux Automated Backup Script
# ==============================================================================
# Triggers an atomic SQLite backup snapshot via the local admin API.
# Can be run manually or invoked periodically via cron.
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${PROJECT_ROOT}"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PORT=3000
ADMIN_TOKEN=""

if [ -f .env ]; then
  PORT=$(grep -E '^PORT=' .env | cut -d'=' -f2- | tr -d ' "\r' || echo "3000")
  ADMIN_TOKEN=$(grep -E '^ADMIN_TOKEN=' .env | cut -d'=' -f2- | tr -d ' "\r' || echo "")
fi
PORT="${PORT:-3000}"

if [ -z "${ADMIN_TOKEN}" ]; then
  echo -e "${RED}✗ Error: ADMIN_TOKEN is not configured in .env${NC}"
  exit 1
fi

echo -e "${BLUE}Triggering TelePlay atomic database backup...${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "http://127.0.0.1:${PORT}/api/admin/backup" \
  -H "x-admin-token: ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" || true)

HTTP_CODE=$(echo "${RESPONSE}" | tail -n1)
BODY=$(echo "${RESPONSE}" | sed '$d')

if [ "${HTTP_CODE}" = "201" ]; then
  echo -e "${GREEN}✓ Backup created successfully!${NC}"
  echo -e "Details: ${BODY}"
else
  echo -e "${RED}✗ Backup failed (HTTP ${HTTP_CODE}): ${BODY}${NC}"
  exit 1
fi

