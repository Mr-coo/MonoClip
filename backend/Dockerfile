FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Install CPU-only torch first to avoid pulling the large CUDA build
RUN pip install --no-cache-dir torch --extra-index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir --no-build-isolation -r requirements.txt

COPY app/ ./app/
COPY alembic/ ./alembic/
COPY alembic.ini ./alembic.ini

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
