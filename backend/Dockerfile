FROM python:3.12-slim

WORKDIR /app

# Copy and install dependencies first to maximise layer-cache reuse
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run as a non-root user — required by some cloud runtimes and a security best practice
RUN adduser --disabled-password --gecos "" appuser
USER appuser

# Leapcell and Alibaba Cloud SAE both default to port 8080
EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]