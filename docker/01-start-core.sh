#!/bin/bash
set +e  # Don't exit on errors

echo "Starting TinyOlly Core (No Demo App)"
echo "=================================================="
echo ""
echo "Starting observability stack:"
echo "  - OpenTelemetry Collector (listening on 4317/4318)"
echo "  - TinyOlly OTLP Receiver"
echo "  - Redis"
echo "  - TinyOlly Frontend (web UI)"
echo ""

# Check if SSL certificates exist, offer to generate
if [ ! -f "certs/cert.pem" ] || [ ! -f "certs/key.pem" ]; then
    echo "SSL certificates not found."
    echo "Generate self-signed certificates for HTTPS? (y/N)"
    read -t 5 -n 1 GENERATE_CERTS
    echo ""
    
    if [ "$GENERATE_CERTS" == "y" ] || [ "$GENERATE_CERTS" == "Y" ]; then
        echo "Generating SSL certificates..."
        chmod +x generate-certs.sh
        ./generate-certs.sh
        echo ""
    else
        echo "Skipping SSL certificate generation. TinyOlly will run on HTTP."
        echo ""
    fi
fi

echo "Starting services..."
echo ""

# Use docker-compose with TinyOlly Core config
docker-compose -f docker-compose-tinyolly-core.yml up -d --build 2>&1
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

# Check which protocol is being used
if [ -f "certs/cert.pem" ] && [ -f "certs/key.pem" ]; then
    echo "TinyOlly UI:    https://localhost:5005 (HTTPS enabled)"
    echo "                Note: Self-signed cert - browser will show warning"
else
    echo "TinyOlly UI:    http://localhost:5005"
fi

echo "OTLP Endpoint:  http://localhost:4317 (gRPC) or http://localhost:4318 (HTTP)"
echo ""
echo "Next steps:"
echo "  1. Instrument your app to send OTLP to localhost:4317"

if [ -f "certs/cert.pem" ]; then
    echo "  2. Open TinyOlly UI: open https://localhost:5005"
else
    echo "  2. Open TinyOlly UI: open http://localhost:5005"
fi

echo "  3. Stop services:    ./02-stop-core.sh"
echo ""
