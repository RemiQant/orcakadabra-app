FROM python:3.12-slim

WORKDIR /app

# Create non-root user BEFORE copying files so we can chown in one layer
RUN adduser --disabled-password --gecos "" appuser

# Copy and install dependencies first to maximise layer-cache reuse
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app source — owned by appuser so the process never runs as root
COPY --chown=appuser:appuser . .

USER appuser

# Leapcell and Alibaba Cloud SAE both default to port 8080
EXPOSE 8080

# Health probe — SAE and Leapcell use this to decide if the container is ready
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
