# TinyOlly Common

Shared Python package containing common utilities used across TinyOlly components.

## Components

- **storage.py**: Redis storage layer with ZSTD compression and msgpack serialization
  - Handles traces, spans, logs, and metrics storage
  - Implements TTL-based automatic cleanup
  - Provides async/await interface with connection pooling

## Installation

This package is installed locally in editable mode during Docker build:

```bash
pip install -e /app/tinyolly-common
```

## Usage

```python
from tinyolly_common import Storage

storage = Storage()
await storage.store_traces(otlp_data)
```
