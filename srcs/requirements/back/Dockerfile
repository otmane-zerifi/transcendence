FROM debian:bookworm


RUN apt-get update -y && apt-get upgrade -y && apt-get install -y \
    iputils-ping \
    python3 \
    python3-pip \
    python3.11-venv \
    netcat-traditional \
    postgresql \
    postgresql-contrib \
    libpq-dev \
    python3-dev \
    gcc \
    curl


ENV DJANGO_SETTINGS_MODULE=ft_transcendence.settings
ENV PYTHONUNBUFFERED=1


WORKDIR /backend


COPY ./backend/ .
COPY script.sh /script.sh

RUN chmod +x /script.sh
RUN mkdir -p /backend/media/profile_pictures
RUN chmod -R 755 /backend/media


RUN python3 -m venv venv && \
    ./venv/bin/pip install --upgrade pip && \
    ./venv/bin/pip install psycopg2-binary && \
    ./venv/bin/pip install -r requirements.txt && \
    ./venv/bin/pip install daphne channels-redis


EXPOSE 8080


ENTRYPOINT ["/script.sh"]