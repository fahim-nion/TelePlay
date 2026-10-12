# TelePlay

TelePlay is a public IPTV channel discovery directory, timestamped technical health checker, browser player, and playlist export platform.

It is designed to run its resource-bounded metadata and health-check backend on an Android phone using **Termux**, while the frontend can be deployed independently as a static web application.

---

## Key Features

1. **Channel Discovery:** Browse and search channels by name, category, country, language, and technical health status.
2. **Timestamped Health Checks:** Transparent status verification (`working`, `intermittent`, `unreachable`, `unsupported`, `stale`) with last-checked timestamps. Never fabricates playback guarantees.
3. **In-Browser Player:** Native HLS and `hls.js` player with volume, fullscreen, channel details, and external player fallbacks.
4. **Direct Stream Links:** Copy individual channel URLs or download custom and filtered M3U playlists.
5. **Client-to-Source Streaming:** TelePlay connects browsers directly to broadcasters and **never proxies video streams**, preserving phone bandwidth and legal safety.
6. **Mobile Resource Consciousness:** Bounded CPU, memory, and mobile-data usage tailored for Android Termux.

---

## Architecture Overview

```
[ Approved Public Sources ]
          │ (SafeFetcher: Bounded GET, SSRF Protection, DNS/Redirect check)
          ▼
   [ M3U Parser ]
          │ (Normalization & Deduplication)
          ▼
   [ SQLite Catalogue ] (Embedded via node:sqlite — zero native C++ compile)
          │
    ┌─────┴───────────────────────┐
    ▼                             ▼
[ Bounded Health Checker ]   [ Fastify REST API & M3U Exporter ]
(Checkpoints, Concurrency: 5)     │ (Port 3000)
                                  ▼
                     [ React + Vite Frontend ]
                     (Browser direct HLS playback)
```

- **Backend:** Node.js (v22+ LTS or v24) + TypeScript + Fastify.
- **Database:** SQLite via Node.js built-in `node:sqlite` (`DatabaseSync`), requiring zero `node-gyp` native build steps on Termux's Bionic libc.
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS + Lucide React.

---

## Termux Deployment Guide

### 1. Prerequisites in Termux
Inside the Termux terminal on Android:

```bash
# Update package repositories
pkg update && pkg upgrade -y

# Install Node.js (Node 22+ recommended for built-in node:sqlite) and Git
pkg install nodejs-lts git -y
```

### 2. Clone & Setup

```bash
git clone <repository-url> TelePlay
cd TelePlay

# Copy environment template
cp .env.example .env

# Install dependencies
npm run install:all
```

### 3. Running the Backend

```bash
# Development mode
npm run dev:backend

# Production mode
npm run build:backend
npm run start:backend
```

### 4. Background Execution & Android Doze
- Android may suspend Termux processes when the screen turns off. To prevent interruptions during scheduled jobs:
  ```bash
  # Acquire Termux wakelock
  termux-wake-lock
  ```
- All ingestion and health check jobs use **persistent transactional SQLite checkpoints**, allowing seamless recovery if Android terminates the process.

### 5. Remote Access (Optional)
Because Android phones sit behind mobile carrier NAT (CGNAT):
- **Local WiFi:** Access the API directly via your local IP (e.g., `http://192.168.1.X:3000`).
- **Public Access:** Run a lightweight reverse tunnel such as **Cloudflare Tunnel (`cloudflared`)** or **Tailscale** to expose the backend without port forwarding.

---

## Local Development (Desktop / Linux)

```bash
# Install all dependencies (root, backend, frontend)
npm run install:all

# Run backend development server
npm run dev:backend

# Run frontend development server
npm run dev:frontend

# Run all test suites
npm test
```

---

## Security & Ethics Baseline

1. **SSRF Protection:** All outgoing source fetches and health-check probes strictly validate DNS resolution, blocking private IP ranges (`10.*`, `172.16-31.*`, `192.168.*`, `127.*`, `169.254.*`, `::1`) and cloud metadata endpoints.
2. **Source Provenance:** Channel records retain source attribution.
3. **No Circumvention:** TelePlay does not bypass DRM, paywalls, geo-restrictions, or authentication mechanisms.
4. **Takedown & Broken Link Handling:** TelePlay provides a reporting mechanism for broken or inappropriate links and allows administrators to disable disputed feeds pending review.

