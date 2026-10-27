#!/usr/bin/env bash
# ==============================================================================
# TelePlay — Continuous Stream Health Verifier
# ==============================================================================
# Iterates through your channel catalogue in bounded batches, testing which
# streams are live and working vs broken/unreachable.
#
# Safe for mobile: uses low concurrency (3-5 simultaneous probes) and 5s timeouts.
# Safe to interrupt: resumes from checkpoint where it left off anytime.
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
  echo -e "${RED}✗ Error: ADMIN_TOKEN is missing in .env${NC}"
  exit 1
fi

BATCH_SIZE="${1:-30}"
MAX_ROUNDS="${2:-10}"

echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE}     TelePlay Stream Health Verifier         ${NC}"
echo -e "${BLUE}==============================================${NC}"
echo -e "Testing in batches of ${BATCH_SIZE} streams (max ${MAX_ROUNDS} rounds)."
echo -e "Press ${YELLOW}Ctrl + C${NC} anytime to stop. Results are saved immediately.\n"

ROUND=1
while [ "${ROUND}" -le "${MAX_ROUNDS}" ]; do
  echo -e "${BLUE}[Round ${ROUND}/${MAX_ROUNDS}] Probing ${BATCH_SIZE} streams...${NC}"

  PAYLOAD="{\"batchSize\": ${BATCH_SIZE}, \"concurrency\": 4, \"timeoutMs\": 5000}"
  RESP=$(curl -s -X POST "http://127.0.0.1:${PORT}/api/admin/health-check/run" \
    -H "x-admin-token: ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "${PAYLOAD}" || true)

  echo "Job status: ${RESP}"

  # Give the worker a moment to process the batch
  sleep 6

  # Show updated stats
  STATS=$(curl -s "http://127.0.0.1:${PORT}/api/stats" || echo "{}")
  WORKING=$(echo "${STATS}" | grep -o '"workingCount":[0-9]*' | cut -d':' -f2 || echo "0")
  UNREACHABLE=$(echo "${STATS}" | grep -o '"unreachableCount":[0-9]*' | cut -d':' -f2 || echo "0")
  UNCHECKED=$(echo "${STATS}" | grep -o '"uncheckedCount":[0-9]*' | cut -d':' -f2 || echo "0")

  echo -e "Live Status: ${GREEN}Working: ${WORKING}${NC} | ${RED}Unreachable: ${UNREACHABLE}${NC} | ${YELLOW}Unchecked: ${UNCHECKED}${NC}\n"

  if [ "${UNCHECKED}" = "0" ]; then
    echo -e "${GREEN}✓ All channels in catalogue have been checked!${NC}"
    break
  fi

  ROUND=$((ROUND + 1))
done

echo -e "${GREEN}==============================================${NC}"
echo -e "${GREEN}✓ Health checking round completed!${NC}"
echo -e "Open your website and tap ${BLUE}'Working Only'${NC} to view all verified live streams."
echo -e "${GREEN}==============================================${NC}\n"
