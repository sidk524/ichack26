FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py ./
COPY phone_client.py ./
COPY news_client.py ./
COPY sensor_client.py ./
COPY database/ ./database/

RUN mkdir -p /app/data

EXPOSE 8080

CMD ["python", "server.py"]
