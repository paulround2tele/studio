#!/usr/bin/env bash
set -euo pipefail

# Determine repository root (directory containing this script's parent)
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$REPO_ROOT"

echo "Updating package lists and installing Node.js and Go..."
sudo apt-get update -y
sudo apt-get install -y nodejs npm golang-go

echo "Installing and configuring PostgreSQL for tests..."
"$(dirname "$0")/setup_db.sh"

echo "Running npm install..."
npm install

echo "Downloading Go modules..."
cd "$REPO_ROOT/backend"
go mod download

if [ -f Makefile ]; then
  echo "Building backend..."
  make build
fi

cd "$REPO_ROOT"
