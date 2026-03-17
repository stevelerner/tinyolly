#!/bin/bash
set +e  # Don't exit on errors

echo "Starting TinyOlly Core (No Demo App)"
echo "=================================================="
echo ""
echo "Starting observability stack:"
echo "  - OpenTelemetry Collector (listening on 4317/4318)"
echo "  - TinyOlly OTLP Receiver"
echo "  - SQLite (embedded DB)"
echo "  - TinyOlly Frontend (web UI)"
echo ""

echo "Starting services..."
echo ""

# Pull latest images from Docker Hub
echo "Pulling latest TinyOlly images from Docker Hub..."
docker-compose -f docker-compose-tinyolly-core.yml pull
if [ $? -ne 0 ]; then
    echo "✗ Failed to pull images from Docker Hub"
    echo "  Note: For local builds, use docker-compose-tinyolly-core-local.yml"
    exit 1
fi
echo "✓ Images pulled successfully"
echo ""

# This prevents stale remote configs from persisting across restarts
echo "Clearing cached collector config..."
docker volume rm tinyolly-otel-supervisor-data 2>/dev/null || true

# Clear SQLite data from previous runs
# This removes stale traces, metrics, and logs for a clean start
echo "Clearing SQLite data volume..."
docker volume rm tinyolly-db-data 2>/dev/null || true

# Use docker-compose with TinyOlly Core config
# --force-recreate ensures config file changes are picked up
docker-compose -f docker-compose-tinyolly-core.yml up -d --force-recreate --remove-orphans 2>&1
EXIT_CODE=$?

if [ $EXIT_CODE -ne 0 ]; then
    echo ""
    echo "✗ Failed to start core services (exit code: $EXIT_CODE)"
    echo "Check the error messages above for details"
    exit 1
fi

echo ""
echo "Services started!"
echo ""
echo "--------------------------------------"
echo "TinyOlly UI:    http://localhost:5005"
echo "--------------------------------------"
echo "OTLP Endpoint:  localhost:4317 (gRPC) or http://localhost:4318 (HTTP)"
echo ""
echo "Next steps:"
echo "  1. Instrument your app to send OTLP to localhost:4317"
echo "  2. Open TinyOlly UI: open http://localhost:5005"
echo "  3. Stop services:    ./02-stop-core.sh"
echo ""
