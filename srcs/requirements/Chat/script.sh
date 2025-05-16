#!/bin/bash

# Exit on error
set -e

source /chat/venv/bin/activate

# Function to wait for postgres
wait_for_postgres() {
    echo "Waiting for PostgreSQL to start..."
    while ! nc -z db 5432; do
        echo "PostgreSQL is unavailable - sleeping"
        sleep 1
    done
    echo "PostgreSQL is up and running!"
}

# Function to setup django
setup_django() {
    echo "Running database migrations..."
    python3 manage.py migrate

    echo "Collecting static files..."
    python3 manage.py collectstatic --noinput
}

# Main execution
echo "Starting setup process..."

# Wait for dependencies
wait_for_postgres

# Setup Django
setup_django

# Start Daphne
echo "Starting Daphne server..."
exec daphne -b 0.0.0.0 -p 8000 ft_transcendence.asgi:application
