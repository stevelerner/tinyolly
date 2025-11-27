# REST API & OpenAPI

TinyOlly provides a comprehensive REST API for programmatic access to all telemetry data in **OpenTelemetry-native format**.

## Interactive API Documentation

Access the auto-generated OpenAPI documentation:  
- **Swagger UI**: `http://localhost:5005/docs` - Interactive API explorer  
- **ReDoc**: `http://localhost:5005/redoc` - Alternative documentation  
- **OpenAPI Spec**: `http://localhost:5005/openapi.json` - Machine-readable schema  

All APIs return **OpenTelemetry-native JSON** with:  
- **Resources**: `service.name`, `host.name`, etc.  
- **Attributes**: Metric labels and span attributes  
- **Full Context**: Trace/span IDs, timestamps, status codes  

## API Endpoints

The REST API provides endpoints for:

- **Traces**: Retrieve trace data with full span information
- **Logs**: Access log entries with trace correlation
- **Metrics**: Query metrics with labels and time-series data
- **Stats**: Get cardinality and system statistics
- **Services**: List all services and their metadata

All endpoints return data in standard OpenTelemetry format, ensuring compatibility with OpenTelemetry tooling and standards.

