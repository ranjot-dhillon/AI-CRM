#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
python -m venv .venv 2>/dev/null || true
source .venv/bin/activate
pip install -r requirements.txt
python -m app.seed_data
uvicorn app.main:app --reload --port 8000
