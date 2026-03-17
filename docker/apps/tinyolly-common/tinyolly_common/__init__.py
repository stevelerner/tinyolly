"""
TinyOlly Common Package
Shared utilities and storage layer used by all TinyOlly components.
"""

__version__ = "0.1.0"

import os

from .storage import Storage as RedisStorage
from .storage_sqlite import StorageSQLite

_backend = os.getenv("STORAGE_BACKEND", "sqlite").strip().lower()
Storage = StorageSQLite if _backend == "sqlite" else RedisStorage

__all__ = ["Storage", "StorageSQLite", "RedisStorage"]
