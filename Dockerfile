# PRODUCTION DOCKERFILE FOR RAILWAY (BACKEND)
FROM python:3.11-slim-bullseye

# 1. Install system-level dependencies for dlib and face_recognition
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    libopenblas-dev \
    liblapack-dev \
    libx11-dev \
    libgtk-3-dev \
    python3-dev \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# 2. Set working directory
WORKDIR /app

# 3. Copy requirements first for better caching
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Copy backend source code
COPY backend/ .

# 5. Create static folders to ensure they exist
RUN mkdir -p static/uploads static/student_photos

# 6. Set environment variables
ENV PORT=5000
ENV PYTHONUNBUFFERED=1

# 7. Start the application using Gunicorn
# Timeout is high because face recognition can take several seconds
CMD gunicorn --bind 0.0.0.0:$PORT app:app --timeout 120 --workers 2
