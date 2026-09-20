#!/usr/bin/env bash
# Compiles the Compact contract on Windows via WSL (the compiler ships Linux/macOS only).
# Usage (from repo root, in PowerShell or Git Bash):  wsl bash scripts/compact-wsl.sh
set -euo pipefail
COMPACT_VERSION="${COMPACT_VERSION:-0.31.0}"
export PATH="$HOME/.local/bin:$PATH"
if ! command -v compact >/dev/null 2>&1; then
  curl --proto '=https' --tlsv1.2 -LsSf https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh
fi
compact update "$COMPACT_VERSION" >/dev/null
cd "$(dirname "$0")/../contract"
compact compile src/private-polling.compact ./src/managed/private-polling
