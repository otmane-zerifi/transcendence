#!/bin/bash
export DJANGO_SETTINGS_MODULE=ft_transcendence.settings


source /backend/venv/bin/activate


echo "Waiting for PostgreSQL..."
while ! nc -z db 5432; do
  sleep 0.1
done
echo "PostgreSQL started"


echo "Waiting for Redis..."
while ! nc -z redis 6379; do
  sleep 0.1
done
echo "Redis started"


echo "Applying database migrations..."
python3 manage.py makemigrations
python manage.py migrate


echo "Starting Daphne server..."
exec daphne -b 0.0.0.0 -p 8080 ft_transcendence.asgi:application