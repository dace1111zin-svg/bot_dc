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

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run Python with the unbuffered flag so that stdout/stderr logs print immediately on cloud dashboards
CMD ["python", "-u", "main.py"]
