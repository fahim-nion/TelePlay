#!/usr/bin/env bash
# ==============================================================================
# TelePlay — Android Termux Source Ingestion & Crawl Script
# ==============================================================================
# Triggers background ingestion of approved public feeds (Free-TV and iptv-org),
# downloads playlists safely, deduplicates streams, and populates the catalogue.
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

echo -e "${BLUE}==============================================${NC}"
echo -e "${BLUE}     TelePlay Ingestion & Link Crawl         ${NC}"
echo -e "${BLUE}==============================================${NC}"

# 1. Trigger Free-TV ingestion
echo -e "\n${BLUE}[1/2] Ingesting Free-TV Curated Global feed...${NC}"
RESP1=$(curl -s -w "\n%{http_code}" -X POST "http://127.0.0.1:${PORT}/api/admin/sources/free-tv/refresh" \
  -H "x-admin-token: ${ADMIN_TOKEN}" || true)
CODE1=$(echo "${RESP1}" | tail -n1)
BODY1=$(echo "${RESP1}" | sed '$d')
echo "Result: HTTP ${CODE1} - ${BODY1}"

# 2. Trigger iptv-org News ingestion
echo -e "\n${BLUE}[2/2] Ingesting iptv-org News feed...${NC}"
RESP2=$(curl -s -w "\n%{http_code}" -X POST "http://127.0.0.1:${PORT}/api/admin/sources/iptv-org-news/refresh" \
  -H "x-admin-token: ${ADMIN_TOKEN}" || true)
CODE2=$(echo "${RESP2}" | tail -n1)
BODY2=$(echo "${RESP2}" | sed '$d')
echo "Result: HTTP ${CODE2} - ${BODY2}"

echo -e "\n${YELLOW}Jobs are parsing and inserting channels in the background...${NC}"
echo -n "Waiting for processing"
for i in {1..8}; do
  echo -n "."
  sleep 1
done
echo ""

echo -e "\n${GREEN}✓ Current Catalogue Statistics:${NC}"
curl -s "http://127.0.0.1:${PORT}/api/stats"
echo ""

echo -e "\n${BLUE}To run a health check batch on these new channels:${NC}"
echo -e "  ${GREEN}bash scripts/termux/cron-healthcheck.sh${NC}\n"

