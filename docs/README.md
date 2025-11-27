# MkDocs Documentation

This directory contains the MkDocs Material documentation for TinyOlly.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

## Development

Serve the documentation locally with live reload:
```bash
mkdocs serve
```

The documentation will be available at `http://127.0.0.1:8000`

## Build

Build static HTML files:
```bash
mkdocs build
```

The output will be in the `site/` directory.

## Deploy

Deploy to GitHub Pages:
```bash
mkdocs gh-deploy
```

Or deploy to any static hosting service by uploading the contents of the `site/` directory.

