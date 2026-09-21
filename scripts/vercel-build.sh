#!/usr/bin/env bash
# Vercel build: install the Compact compiler, compile the contract, then build only what
# the web app needs (contract bindings → api → ui). The CLI is not deployed, so it is skipped.
#
# Compiling here is safe because Compact key generation is deterministic: the keys this
# produces are byte-identical to the ones the live Preprod contract was deployed with, so
# proofs made by the hosted app still verify. The compiler is a static musl binary and
# runs on Vercel's Amazon Linux 2023 image; the contract compiles in about a minute.

set -euo pipefail

COMPACT_VERSION="${COMPACT_VERSION:-0.31.0}"
export COMPACT_VERSION
export PATH="$HOME/.local/bin:$PATH"

# The installer unpacks a .tar.xz and `compact update` unpacks a zip.
missing=()
for tool in tar xz unzip; do
  command -v "$tool" >/dev/null 2>&1 || missing+=("$tool")
done
if [ "${#missing[@]}" -gt 0 ]; then
  echo "Installing build tools: ${missing[*]}"
  dnf install -y -q "${missing[@]}"
fi

if [ "$(compact compile --version 2>/dev/null || true)" != "$COMPACT_VERSION" ]; then
  if ! command -v compact >/dev/null 2>&1; then
    echo "Installing the Compact toolchain"
    curl --proto '=https' --tlsv1.2 -LsSf \
      https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh
  fi
  compact update "$COMPACT_VERSION"
fi

echo "Compiling the contract with Compact $(compact compile --version)"
node scripts/compact.mjs

npm run build -w @midnight-ntwrk/private-polling-contract
npm run build -w @midnight-ntwrk/private-polling-api
npm run build -w @midnight-ntwrk/private-polling-ui
