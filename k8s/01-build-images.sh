#!/bin/bash

# Point to Minikube's Docker daemon
eval $(minikube docker-env)

# Build images
echo "Building tinyolly-ui..."
docker build -t tinyolly-ui:latest \
  -f ../docker/dockerfiles/Dockerfile.tinyolly-ui \
  ../docker/apps/tinyolly-ui/

echo "Building tinyolly-otlp-receiver..."
docker build -t tinyolly-otlp-receiver:latest \
  -f ../docker/dockerfiles/Dockerfile.tinyolly-otlp-receiver \
  ../docker/apps/tinyolly-otlp-receiver/

echo "Images built successfully in Minikube environment."
