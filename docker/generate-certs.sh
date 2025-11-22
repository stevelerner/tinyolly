#!/bin/bash
# Generate self-signed SSL certificates for TinyOlly

echo "Generating self-signed SSL certificates for TinyOlly..."

# Create certs directory if it doesn't exist
mkdir -p certs

# Generate private key and certificate
openssl req -x509 -newkey rsa:4096 -nodes \
  -out certs/cert.pem \
  -keyout certs/key.pem \
  -days 365 \
  -subj "/C=US/ST=Dev/L=Local/O=TinyOlly/OU=Dev/CN=localhost"

echo "✓ Certificates generated in certs/ directory"
echo "  - cert.pem (public certificate)"
echo "  - key.pem (private key)"
echo ""
echo "Note: These are self-signed certificates for development."
echo "Your browser will show a security warning - this is expected."

