#!/usr/bin/env node
// Compiles the Compact contract on any OS.
//
// The Compact compiler ships Linux and macOS binaries only. On Windows this delegates to
// WSL (scripts/compact-wsl.sh), which installs the pinned compiler inside the distro on
// first run. Everywhere else it calls `compact` from PATH.
//
// The version is pinned to match CI (.github/workflows/ci.yaml). Override with
// COMPACT_VERSION if you are deliberately testing a newer compiler.

import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const version = process.env.COMPACT_VERSION ?? '0.31.0';

const run = (cmd, args, options = {}) => {
  const result = spawnSync(cmd, args, { stdio: 'inherit', cwd: root, ...options });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  process.exit(result.status ?? 1);
};

/**
 * Picks the WSL distro to compile in. Docker Desktop registers its own distros (often as
 * the default) and they have no bash, so they are skipped. COMPACT_WSL_DISTRO overrides.
 */
const pickWslDistro = () => {
  if (process.env.COMPACT_WSL_DISTRO) return process.env.COMPACT_WSL_DISTRO;
  const listed = spawnSync('wsl', ['-l', '-q']);
  if (listed.error || listed.status !== 0) {
    console.error('WSL is not available. Install it with "wsl --install -d Ubuntu", then retry.');
    process.exit(1);
  }
  // `wsl -l` writes UTF-16LE on Windows.
  const distros = listed.stdout
    .toString('utf16le')
    .split(/\r?\n/)
    .map((d) => d.replace(/\0/g, '').trim())
    .filter((d) => d && !d.toLowerCase().startsWith('docker-desktop'));
  if (distros.length === 0) {
    console.error('No usable WSL distro found. Install one with "wsl --install -d Ubuntu", then retry.');
    process.exit(1);
  }
  return distros.find((d) => /ubuntu|debian/i.test(d)) ?? distros[0];
};

if (process.platform === 'win32') {
  const distro = pickWslDistro();
  console.log(`Compiling with Compact ${version} inside WSL (${distro})…`);
  run('wsl', ['-d', distro, '--', 'bash', 'scripts/compact-wsl.sh'], {
    env: { ...process.env, COMPACT_VERSION: version, WSLENV: 'COMPACT_VERSION/u' },
  });
} else {
  run('compact', ['compile', 'src/private-polling.compact', 'src/managed/private-polling'], {
    cwd: resolve(root, 'contract'),
  });
}
