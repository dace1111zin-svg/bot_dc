# ── Stage 1: Build React Frontend ──
FROM node:20-slim AS frontend-builder
WORKDIR /build

# Copy dashboard package configuration files
COPY dashboard/package*.json ./
RUN npm install --legacy-peer-deps

# Copy dashboard source files
COPY dashboard/ ./

# Build the React production bundle (outputs to /build/dist)
RUN npm run build

# ── Stage 2: Python Runtime Server ──
FROM python:3.12-slim

# Install system dependencies (including audio/voice libraries for discord.py voice features)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libffi-dev \
    libnacl-dev \
    python3-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy Python dependencies and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all repository files
COPY . .

# Copy compiled React static assets from Stage 1 into the Python container
COPY --from=frontend-builder /build/dist ./dashboard/dist

# Run Python with the unbuffered flag so that stdout/stderr logs print immediately on cloud dashboards
CMD ["python", "-u", "main.py"]
