#!/bin/bash
# Activate virtual environment if it exists, then run mkdocs
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -d "$SCRIPT_DIR/.venv" ]; then
    source "$SCRIPT_DIR/.venv/bin/activate"
fi
python3 -m mkdocs gh-deploy