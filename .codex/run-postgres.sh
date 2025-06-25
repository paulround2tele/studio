#!/usr/bin/env bash
set -euo pipefail

sudo service postgresql start

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ -f "$REPO_ROOT/.codex/test.env" ]; then
  echo "PostgreSQL service started with configuration:";
  cat "$REPO_ROOT/.codex/test.env"
fi
