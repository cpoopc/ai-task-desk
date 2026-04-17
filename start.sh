#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "Starting backend..."
cd backend && uv run uvicorn mission_control.main:app --port 8000 &
BACKEND_PID=$!

echo "Waiting for backend to be ready..."
until curl -s http://localhost:8000/api/health > /dev/null 2>&1; do
    sleep 0.5
done
echo "Backend is ready!"

echo "Starting frontend..."
cd "$(dirname "$0")/frontend" && pnpm dev

wait