# ml-service/Dockerfile
# Railway auto-detects this and builds it

FROM python:3.11-slim

WORKDIR /app

# System deps needed by OpenCV
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Railway injects $PORT automatically
CMD uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}