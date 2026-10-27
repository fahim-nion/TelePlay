#!/usr/bin/env bash
# ==============================================================================
# TelePlay — Android Termux Scheduled Health-Check Runner
# ==============================================================================
# Executes a bounded batch health check run via the admin API.
# Designed for execution via cron or termux-job-scheduler.
# Default parameters:
#   batchSize: 30 channels
#   concurrency: 3 probes
#   timeoutMs: 6000 ms
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "${PROJECT_ROOT}"

LOG_FILE="logs/cron-healthcheck.log"
mkdir -p logs

PORT=3000
ADMIN_TOKEN=""

if [ -f .env ]; then
  PORT=$(grep -E '^PORT=' .env | cut -d'=' -f2- | tr -d ' "\r' || echo "3000")
  ADMIN_TOKEN=$(grep -E '^ADMIN_TOKEN=' .env | cut -d'=' -f2- | tr -d ' "\r' || echo "")
fi
PORT="${PORT:-3000}"

DATE_STR=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

if [ -z "${ADMIN_TOKEN}" ]; then
  echo "[${DATE_STR}] ERROR: ADMIN_TOKEN is missing in .env" >> "${LOG_FILE}"
  exit 1
fi

BATCH_SIZE="${1:-50}"
CONCURRENCY="${2:-5}"
PAYLOAD="{\"batchSize\": ${BATCH_SIZE}, \"concurrency\": ${CONCURRENCY}, \"timeoutMs\": 6000}"

echo -e "\nTriggering health check on ${BATCH_SIZE} streams (concurrency: ${CONCURRENCY})..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "http://127.0.0.1:${PORT}/api/admin/health-check/run" \
  -H "x-admin-token: ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "${PAYLOAD}" 2>> "${LOG_FILE}" || true)

HTTP_CODE=$(echo "${RESPONSE}" | tail -n1)
BODY=$(echo "${RESPONSE}" | sed '$d')

echo "[${DATE_STR}] HTTP ${HTTP_CODE} - ${BODY}" >> "${LOG_FILE}"
echo "Result: HTTP ${HTTP_CODE} - ${BODY}"
curl -s "http://127.0.0.1:${PORT}/api/stats"
echo ""

