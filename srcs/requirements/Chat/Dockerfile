FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV DJANGO_SETTINGS_MODULE=ft_transcendence.settings
ENV ALLOWED_HOSTS=localhost,127.0.0.1

# Set work directory
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV DJANGO_SETTINGS_MODULE=ft_transcendence.settings
ENV ALLOWED_HOSTS=localhost,127.0.0.1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    netcat-traditional \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /chat

COPY ./Chat/ .
COPY script.sh /script.sh

RUN chmod +x /script.sh
RUN mkdir -p /chat/media/profile_pictures
RUN chmod -R 755 /chat/media


RUN python3 -m venv venv && \
    ./venv/bin/pip install --upgrade pip && \
    ./venv/bin/pip install psycopg2-binary && \
    ./venv/bin/pip install -r requirements.txt && \
    ./venv/bin/pip install daphne channels-redis

CMD ["/script.sh"]
