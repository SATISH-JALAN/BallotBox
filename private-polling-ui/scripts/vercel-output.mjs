// Packages dist/ as a Vercel Build Output API v3 directory (.vercel/output), so CI can
// deploy with `vercel deploy --prebuilt` without Vercel re-running the build.
//
// Vercel cannot build this app itself: the build needs the Compact compiler to produce the
// circuit keys. Routing and headers therefore live here rather than in vercel.json.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const uiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(uiRoot, 'dist');
const output = resolve(uiRoot, '.vercel/output');

if (!existsSync(resolve(dist, 'index.html')) || !existsSync(resolve(dist, 'keys'))) {
  console.error('dist/ is missing or has no circuit keys. Run "npm run build" first.');
  process.exit(1);
}

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
cpSync(dist, resolve(output, 'static'), { recursive: true });

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
};

writeFileSync(
  resolve(output, 'config.json'),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: '/assets/(.*)', headers: { 'Cache-Control': 'public, max-age=31536000, immutable' }, continue: true },
        {
          src: '/(keys|zkir)/(.*)',
          headers: { 'Cache-Control': 'public, max-age=3600, must-revalidate', 'Content-Type': 'application/octet-stream' },
          continue: true,
        },
        { src: '/(.*)', headers: securityHeaders, continue: true },
        { handle: 'filesystem' },
        // Single-page app: unknown paths (e.g. /?poll=… deep links) serve the app shell.
        { src: '/(.*)', dest: '/index.html' },
      ],
    },
    null,
    2,
  ),
);

console.log('Wrote .vercel/output (static + config.json)');
