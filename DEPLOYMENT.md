# TelePlay — Deployment and Operations Guide

This guide covers complete deployment workflows for TelePlay:
1. Running the resource-bounded backend on **Android Termux**
2. Deploying the static React frontend to **Cloudflare Pages**, **Vercel**, or **Netlify**
3. Configuring secure remote backend access without opening router ports via **Cloudflare Tunnel** or **Tailscale**
4. Scheduled background health checks, backups, updates, and disaster recovery

---

## 1. Android Termux Backend Deployment

### Android Prerequisites
1. **Install Termux from F-Droid**: Do not install Termux from Google Play Store (the Play Store build is deprecated and unmaintained). Download from [F-Droid](https://f-droid.org/packages/com.termux/).
2. **Disable Battery Optimization**:
   - Go to Android Settings → Apps → Termux → Battery → Set to **Unrestricted** / **Don't optimize**.
   - This prevents Android's Doze mode from killing backend background tasks.

---

### Step-by-Step Installation on Termux

Open the Termux app and run:

```bash
# 1. Update Termux base system
pkg update -y && pkg upgrade -y

# 2. Install Node.js LTS (v22+ recommended), Git, and Termux API tools
pkg install -y nodejs-lts git termux-tools

# 3. Clone your TelePlay repository
git clone <YOUR_GIT_REPOSITORY_URL> TelePlay
cd TelePlay

# 4. Run the automated installer
./scripts/termux/install.sh
```

The installer will:
- Verify Node.js v22+ (for built-in `node:sqlite`)
- Create `data/`, `backups/`, and `logs/` directories
- Generate `.env` with a secure random `ADMIN_TOKEN`
- Install dependencies and build production bundles

---

### Managing the Server on Termux

#### Start Server (with Wake-Lock)
```bash
./scripts/termux/start.sh
```
*Acquires Android wake-lock (`termux-wake-lock`), starts the backend daemon in the background on port 3000, and verifies HTTP readiness.*

#### Check Status & Live Logs
```bash
# View live server logs
tail -f logs/teleplay.log

# Verify API health
curl -s http://127.0.0.1:3000/api/health
```

#### Stop Server (Releasing Wake-Lock)
```bash
./scripts/termux/stop.sh
```
*Sends graceful `SIGTERM`, waits for active requests to finish, and releases the wake-lock (`termux-wake-unlock`) to conserve device battery.*

---

## 2. Secure Remote Access (Connecting Frontend to Termux)

Because mobile carriers place mobile devices behind Carrier-Grade NAT (CGNAT), incoming public connections cannot reach your phone directly. Use one of the following secure options:

### Option A: Cloudflare Tunnel (`cloudflared`) — Recommended for Public Access

1. Install `cloudflared` on Termux (or a machine on your network):
   ```bash
   pkg install cloudflared -y
   ```
2. Log in to Cloudflare:
   ```bash
   cloudflared tunnel login
   ```
3. Create a tunnel (e.g. named `teleplay-phone`):
   ```bash
   cloudflared tunnel create teleplay-phone
   ```
4. Configure routing to your backend:
   ```yaml
   # ~/.cloudflared/config.yml
   tunnel: <TUNNEL_UUID>
   credentials-file: ~/.cloudflared/<TUNNEL_UUID>.json

   ingress:
     - hostname: api-teleplay.yourdomain.com
       service: http://127.0.0.1:3000
     - service: http_status:404
   ```
5. Run the tunnel:
   ```bash
   cloudflared tunnel run teleplay-phone
   ```

### Option B: Tailscale — Recommended for Personal Private Access
1. Install Tailscale from the Google Play Store or F-Droid on your Android device.
2. Sign in and enable Tailscale.
3. Your phone will receive a 100.x.y.z IP address accessible exclusively by your authorized devices on your Tailnet.

---

## 3. Static Frontend Deployment

The TelePlay frontend is a pure static React application located in `frontend/`. It communicates with your backend via REST API calls and connects browsers directly to broadcaster HLS video streams.

### Deploying to Cloudflare Pages (Recommended)
1. Fork or push your TelePlay repository to GitHub/GitLab.
2. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
3. Select the `TelePlay` repository.
4. Set Build configuration:
   - **Framework preset**: Vite
   - **Root directory**: `frontend`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. Under **Environment variables**, set:
   - `VITE_API_BASE_URL`: `https://api-teleplay.yourdomain.com` (your Cloudflare Tunnel endpoint)
6. Click **Save and Deploy**.

### Deploying to Vercel
1. Import repository on [Vercel](https://vercel.com).
2. Set Root Directory to `frontend`.
3. Set Framework to `Vite`.
4. Configure Environment Variable:
   - `VITE_API_BASE_URL`: `https://api-teleplay.yourdomain.com`
5. Click **Deploy**.

---

## 4. Maintenance, Backups & Scheduled Jobs

### Scheduled Health Checks
To periodically run bounded health checks (e.g. every 6 hours):
```bash
# Add to crond via `crontab -e`:
0 */6 * * * /data/data/com.termux/files/home/TelePlay/scripts/termux/cron-healthcheck.sh
```

### Database Backups
To create an atomic SQLite snapshot:
```bash
./scripts/termux/backup.sh
```
Backups are saved to `backups/teleplay-backup-YYYY-MM-DDTHH-mm-ss.db` using SQLite's non-locking `VACUUM INTO` mechanism.

### Restoring from Backup
```bash
# 1. Stop the server
./scripts/termux/stop.sh

# 2. Replace the database file
cp backups/teleplay-backup-<TIMESTAMP>.db data/teleplay.db

# 3. Restart the server
./scripts/termux/start.sh
```

### Updating to Latest Code
```bash
# 1. Pull latest git commits
git pull origin main

# 2. Recompile backend and frontend
npm run build:backend
npm run build:frontend

# 3. Restart server
./scripts/termux/stop.sh
./scripts/termux/start.sh
```

---

## 5. Honest Expectations & Device Limitations

- **Zero Video Proxying**: TelePlay never routes live video bytes through the phone. Clients stream directly from public broadcasters. The phone only handles channel metadata and lightweight technical probes.
- **Battery & Thermal Throttling**: Running continuous health checks on a phone causes battery drain and thermal throttling. TelePlay limits default health checks to small bounded batches (e.g. 25–30 channels) with concurrency capped at 3–5 simultaneous requests.
- **Intermittent Connectivity**: Mobile devices experience network handovers. If the phone goes offline, the static frontend displays a clean offline banner with cached favorites still accessible.

