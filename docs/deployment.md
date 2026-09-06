# 🚀 XActions Deployment & Production Guide

This guide covers deployment strategies for self-hosting **XActions** (REST API, Bull Job Queue, and Redis) on local machines, VPS servers, and cloud container platforms.

---

## 🐳 Option 1: Docker & Docker Compose (Recommended)

Docker is the most reliable way to run XActions because it bundles system Chromium, Python, and all necessary font/graphics dependencies.

### Prerequisites
- Docker Engine >= 24.0
- Docker Compose >= 2.20

### 1. Configure Environment
Copy `.env.example` to `.env` and fill in your secrets:
```bash
cp .env.example .env
```

### 2. Start Services
Run the containers in detached mode:
```bash
npm run docker:up
# or manually
docker compose up -d --build
```

This launches 3 synchronized containers:
- **`xactions-api`**: Express REST server on `http://localhost:3001`
- **`xactions-worker`**: Bull queue async background scraper worker
- **`xactions-redis`**: Redis instance on port `6379` with persistent volume

### 3. Check Logs & Health
```bash
# View real-time logs
docker compose logs -f

# Check container status
docker compose ps
```

### 4. Stop Services
```bash
npm run docker:down
```

---

## 🖥️ Option 2: Bare-Metal VPS with PM2

If running directly on Ubuntu/Debian without Docker:

### 1. Install System Dependencies (Chromium & Python)
```bash
sudo apt-get update && sudo apt-get install -y \
  chromium-browser \
  python3 \
  python3-pip \
  redis-server
```

### 2. Install Node.js & Dependencies
```bash
# Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone & Install
git clone https://github.com/nirholas/xactions.git
cd xactions
npm ci --omit=dev
npx prisma db push
```

### 3. Manage with PM2
```bash
npm install -g pm2

# Start API server and Worker
pm2 start api/server.js --name "xactions-api"
pm2 start api/services/jobQueue.js --name "xactions-worker"

# Save PM2 process list
pm2 save
pm2 startup
```

---

## ☁️ Option 3: Cloud Platforms (Railway / Render / Fly.io)

### Railway
1. Connect your GitHub repository to Railway.
2. Add a **Redis** service from the Railway marketplace.
3. In your XActions service settings:
   - Set environment variables (`REDIS_URL=${{Redis.REDIS_URL}}`, `JWT_SECRET`, etc.).
   - Railway will automatically detect the root `Dockerfile`.

### Render
1. Create a **Web Service** pointing to your repository.
2. Select **Docker** environment.
3. Add a **Redis** instance and link `REDIS_URL`.

---

## 🔒 Security Best Practices for Production

1. **Keep `.env` Secure:** Never commit `.env` or session cookies to public version control.
2. **Reverse Proxy:** Put Cloudflare, Nginx, or Caddy in front of port `3001` with TLS/HTTPS enabled.
3. **Rate Limiting:** Ensure `express-rate-limit` is enabled to prevent abuse.
4. **Cookie Rotation:** Periodically refresh your X/Twitter `auth_token` cookies.
