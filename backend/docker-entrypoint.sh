#!/bin/sh
set -e

echo "Running database migrations..."
./node_modules/.bin/sequelize-cli db:migrate

echo "Starting application..."
exec "$@"
