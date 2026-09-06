# ==============================================================================
# XActions Dockerfile (Production Image with Headless Browser & Python Support)
# ==============================================================================

FROM node:20-bookworm-slim AS base

# Install system dependencies for Chromium / Puppeteer and Python solver
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    chromium \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    ca-certificates \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Set Puppeteer executable path to system chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production

WORKDIR /app

# Copy package manifests and install Node.js dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Setup Python virtual environment and install solver dependencies
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY solver/requirements.txt ./solver/
RUN pip install --no-cache-dir -r ./solver/requirements.txt

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy project source code
COPY . .

# Set permissions
RUN chmod +x ./src/cli/index.js ./src/mcp/server.js

# Expose API and Dashboard ports
EXPOSE 3001 3000

# Default command: launch production API server
CMD ["npm", "start"]
