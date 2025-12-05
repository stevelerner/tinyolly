"""
Setup script for tinyolly-common package
"""
from setuptools import setup, find_packages

setup(
    name="tinyolly-common",
    version="0.1.0",
    description="Shared utilities for TinyOlly observability platform",
    packages=find_packages(),
    python_requires=">=3.9",
    install_requires=[
        "redis>=4.5.0",
        "zstandard>=0.21.0",
        "msgpack>=1.0.0",
        "orjson>=3.9.0",
        "async-lru>=2.0.0",
    ],
)
