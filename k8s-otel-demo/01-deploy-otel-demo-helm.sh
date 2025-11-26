#!/bin/bash
set -e

# Add OpenTelemetry Helm repository
helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts

helm repo update

# Deploy OpenTelemetry Demo configured for TinyOlly
helm upgrade --install my-otel-demo open-telemetry/opentelemetry-demo \
  --set opentelemetry-collector.enabled=false \
  --set jaeger.enabled=false \
  --set grafana.enabled=false \
  --set prometheus.enabled=false \
  --set opensearch.enabled=false \
  --set opentelemetry-collector.config.exporters.otlphttp/tinyolly.endpoint="http://otel-collector.default.svc.cluster.local:4318" \