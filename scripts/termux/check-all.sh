#!/usr/bin/env bash
# ==============================================================================
# TelePlay — Full Catalogue Stream Health Verifier & Crawler
# ==============================================================================
# Crawls through your entire IPTV channel catalogue in one automated run,
# testing which streams are live and working vs broken/unreachable.
#
# Usage:
#   bash scripts/termux/check-all.sh          # Checks ALL channels in catalogue at once
#   bash scripts/termux/check-all.sh crawl    # Refreshes all playlists, THEN checks all channels
#   bash scripts/termux/check-all.sh 50 10    # Custom: 10 rounds of 50 streams
#
# Safe to interrupt: Press Ctrl + C anytime. All progress is saved immediately in SQLite.
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
CYAN='\033[0;36m'
BOLD='\033[1m'
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

# Ensure backend server is running
if ! curl -s "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1; then
  echo -e "${YELLOW}! Backend server is not running on port ${PORT}. Starting it now...${NC}"
  bash "${SCRIPT_DIR}/start.sh"
  sleep 2
fi

ARG1="${1:-}"
ARG2="${2:-}"

# 1. Handle optional playlist crawl / refresh first
DO_CRAWL=false
if [ "${ARG1}" = "crawl" ] || [ "${ARG1}" = "--crawl" ] || [ "${ARG2}" = "crawl" ] || [ "${ARG2}" = "--crawl" ]; then
  DO_CRAWL=true
fi

if [ "${DO_CRAWL}" = true ]; then
  echo -e "${CYAN}==============================================${NC}"
  echo -e "${CYAN}     TelePlay Source Playlist Refresh        ${NC}"
  echo -e "${CYAN}==============================================${NC}"
  
  echo -e "${BLUE}[1/4] Refreshing Free-TV Curated Global...${NC}"
  curl -s -X POST "http://127.0.0.1:${PORT}/api/admin/sources/free-tv/refresh" -H "x-admin-token: ${ADMIN_TOKEN}" >/dev/null || true
  
  echo -e "${BLUE}[2/4] Refreshing iptv-org Bangladesh (BD)...${NC}"
  curl -s -X POST "http://127.0.0.1:${PORT}/api/admin/sources/iptv-org-bd/refresh" -H "x-admin-token: ${ADMIN_TOKEN}" >/dev/null || true
  
  echo -e "${BLUE}[3/4] Refreshing iptv-org News...${NC}"
  curl -s -X POST "http://127.0.0.1:${PORT}/api/admin/sources/iptv-org-news/refresh" -H "x-admin-token: ${ADMIN_TOKEN}" >/dev/null || true

  echo -e "${BLUE}[4/4] Refreshing iptv-org Sports...${NC}"
  curl -s -X POST "http://127.0.0.1:${PORT}/api/admin/sources/iptv-org-sports/refresh" -H "x-admin-token: ${ADMIN_TOKEN}" >/dev/null || true

  echo -e "${YELLOW}Waiting for background ingestion parser (6 seconds)...${NC}"
  sleep 6
  echo -e "${GREEN}✓ Ingestion refreshed.${NC}\n"
fi

# 2. Configure batch parameters
BATCH_SIZE=100
CONCURRENCY=8
TIMEOUT_MS=4000
MAX_ROUNDS=99999
RUN_ALL=true

# Check if user specified custom numeric parameters
if [[ "${ARG1}" =~ ^[0-9]+$ ]]; then
  BATCH_SIZE="${ARG1}"
  RUN_ALL=false
  if [[ "${ARG2}" =~ ^[0-9]+$ ]]; then
    MAX_ROUNDS="${ARG2}"
  else
    MAX_ROUNDS=10
  fi
fi

# Fetch initial catalogue statistics
STATS=$(curl -s "http://127.0.0.1:${PORT}/api/stats" || echo "{}")
TOTAL_STREAMS=$(echo "${STATS}" | grep -o '"totalStreams":[0-9]*' | cut -d':' -f2 || echo "0")
TOTAL_CHANNELS=$(echo "${STATS}" | grep -o '"totalChannels":[0-9]*' | cut -d':' -f2 || echo "0")
INITIAL_UNCHECKED=$(echo "${STATS}" | grep -o '"uncheckedCount":[0-9]*' | cut -d':' -f2 || echo "0")

echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE}     TelePlay Full Catalogue Health Verifier  ${NC}"
echo -e "${BLUE}==============================================${NC}"
echo -e "Total Catalogue: ${BOLD}${TOTAL_STREAMS} streams${NC} across ${BOLD}${TOTAL_CHANNELS} channels${NC}"
echo -e "Initial Unchecked: ${YELLOW}${INITIAL_UNCHECKED}${NC}"
echo -e "Probing Budget: ${CYAN}Batch: ${BATCH_SIZE} | Concurrency: ${CONCURRENCY} | Timeout: ${TIMEOUT_MS}ms${NC}"

if [ "${RUN_ALL}" = true ]; then
  echo -e "Mode: ${GREEN}${BOLD}Full Catalogue Scan (runs until all streams are checked)${NC}"
else
  echo -e "Mode: ${YELLOW}Bounded Run (max ${MAX_ROUNDS} rounds of ${BATCH_SIZE})${NC}"
fi

echo -e "Press ${YELLOW}Ctrl + C${NC} anytime to stop safely. Results are saved in SQLite.\n"

TOTAL_CHECKED_THIS_RUN=0
ROUND=1

# Trap Ctrl+C to print clean summary before exiting
cleanup() {
  echo -e "\n\n${YELLOW}Health check paused by user.${NC}"
  FINAL_STATS=$(curl -s "http://127.0.0.1:${PORT}/api/stats" || echo "{}")
  W=$(echo "${FINAL_STATS}" | grep -o '"workingCount":[0-9]*' | cut -d':' -f2 || echo "0")
  U=$(echo "${FINAL_STATS}" | grep -o '"unreachableCount":[0-9]*' | cut -d':' -f2 || echo "0")
  REM=$(echo "${FINAL_STATS}" | grep -o '"uncheckedCount":[0-9]*' | cut -d':' -f2 || echo "0")
  echo -e "${GREEN}✓ All progress is saved in SQLite!${NC}"
  echo -e "Current Status: ${GREEN}Working: ${W}${NC} | ${RED}Unreachable: ${U}${NC} | ${YELLOW}Unchecked: ${REM}${NC}"
  echo -e "Run this script again anytime to continue where you left off.\n"
  exit 0
}
trap cleanup INT

while [ "${ROUND}" -le "${MAX_ROUNDS}" ]; do
  START_TIME=$(date +%s)
  
  PAYLOAD="{\"batchSize\": ${BATCH_SIZE}, \"concurrency\": ${CONCURRENCY}, \"timeoutMs\": ${TIMEOUT_MS}}"
  RESP=$(curl -s -X POST "http://127.0.0.1:${PORT}/api/admin/health-check/run" \
    -H "x-admin-token: ${ADMIN_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "${PAYLOAD}" || true)

  END_TIME=$(date +%s)
  DURATION=$((END_TIME - START_TIME))

  CHECKED_IN_BATCH=$(echo "${RESP}" | grep -o '"totalChecked":[0-9]*' | cut -d':' -f2 || echo "0")
  BATCH_WORKING=$(echo "${RESP}" | grep -o '"workingCount":[0-9]*' | cut -d':' -f2 || echo "0")
  BATCH_DEAD=$(echo "${RESP}" | grep -o '"unreachableCount":[0-9]*' | cut -d':' -f2 || echo "0")

  if [ -z "${CHECKED_IN_BATCH}" ] || [ "${CHECKED_IN_BATCH}" = "0" ]; then
    CHECKED_IN_BATCH=${BATCH_SIZE}
  fi

  TOTAL_CHECKED_THIS_RUN=$((TOTAL_CHECKED_THIS_RUN + CHECKED_IN_BATCH))

  # Get live catalogue summary
  STATS=$(curl -s "http://127.0.0.1:${PORT}/api/stats" || echo "{}")
  WORKING=$(echo "${STATS}" | grep -o '"workingCount":[0-9]*' | cut -d':' -f2 || echo "0")
  UNREACHABLE=$(echo "${STATS}" | grep -o '"unreachableCount":[0-9]*' | cut -d':' -f2 || echo "0")
  UNCHECKED=$(echo "${STATS}" | grep -o '"uncheckedCount":[0-9]*' | cut -d':' -f2 || echo "0")

  # Calculate percentage
  PCT=0
  if [ "${TOTAL_STREAMS}" -gt 0 ]; then
    PCT=$((TOTAL_CHECKED_THIS_RUN * 100 / TOTAL_STREAMS))
    if [ "${PCT}" -gt 100 ]; then PCT=100; fi
  fi

  echo -e "${BLUE}[Round ${ROUND}]${NC} Probed ${BOLD}${CHECKED_IN_BATCH}${NC} streams (${DURATION}s) | Checked this run: ${CYAN}${TOTAL_CHECKED_THIS_RUN}/${TOTAL_STREAMS} (${PCT}%)${NC}"
  echo -e "          Batch: ${GREEN}+${BATCH_WORKING} working${NC}, ${RED}+${BATCH_DEAD} dead${NC} | Total: ${GREEN}${WORKING} working${NC}, ${RED}${UNREACHABLE} dead${NC}, ${YELLOW}${UNCHECKED} unchecked${NC}\n"

  # If running in full catalogue scan mode, stop when all streams are covered
  if [ "${RUN_ALL}" = true ]; then
    if [ "${UNCHECKED}" = "0" ] && [ "${TOTAL_CHECKED_THIS_RUN}" -ge "${TOTAL_STREAMS}" ]; then
      echo -e "${GREEN}${BOLD}✓ 100% of catalogue streams have been tested!${NC}"
      break
    elif [ "${TOTAL_STREAMS}" -gt 0 ] && [ "${TOTAL_CHECKED_THIS_RUN}" -ge "${TOTAL_STREAMS}" ]; then
      echo -e "${GREEN}${BOLD}✓ Complete pass over all ${TOTAL_STREAMS} streams finished!${NC}"
      break
    fi
  else
    if [ "${UNCHECKED}" = "0" ]; then
      echo -e "${GREEN}✓ All unchecked streams are now verified!${NC}"
      break
    fi
  fi

  ROUND=$((ROUND + 1))
  sleep 1
done

echo -e "${GREEN}==============================================${NC}"
echo -e "${GREEN}${BOLD}✓ Stream Health Verification Complete!        ${NC}"
echo -e "${GREEN}==============================================${NC}"
echo -e "Verified Live Streams: ${GREEN}${BOLD}${WORKING}${NC}"
echo -e "Unreachable/Offline:   ${RED}${UNREACHABLE}${NC}"
echo -e "Catalogue Channels:    ${CYAN}${TOTAL_CHANNELS}${NC}"
echo -e "\nIn your browser, tap ${BLUE}'Working Only'${NC} to view all verified live streams!"
echo -e "${GREEN}==============================================${NC}\n"
