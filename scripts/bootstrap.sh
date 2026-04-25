#!/bin/bash
set -e

echo "=== AI Dev Platform - Local Bootstrap ==="

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "Node.js is required."; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Docker is required."; exit 1; }

# Install dependencies
echo "Installing dependencies..."
npm install

# Copy env file
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example. Please fill in your API keys."
fi

# Start infrastructure
echo "Starting Docker services..."
docker-compose up -d redis db

# Wait for Postgres
echo "Waiting for Postgres..."
sleep 3

# Generate Prisma client
echo "Generating Prisma client..."
cd packages/database
npx prisma generate
npx prisma db push
cd ../..

# Seed database
echo "Seeding database..."
cd packages/database
npx ts-node src/seed.ts
cd ../..

echo ""
echo "=== Bootstrap complete ==="
echo "Run 'docker-compose up' to start all services."
echo "Dashboard: http://localhost:5173"
echo "API: http://localhost:3000"
echo "Metrics: http://localhost:9090/metrics"
