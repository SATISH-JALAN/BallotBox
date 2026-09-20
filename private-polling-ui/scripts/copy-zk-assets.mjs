// Copies the compiled circuit keys and ZKIR next to the built app. The browser fetches
// them from the site origin to build proofs, so a deploy without them cannot vote.
import { cpSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const uiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const managed = resolve(uiRoot, '../contract/src/managed/private-polling');

if (!existsSync(resolve(managed, 'keys'))) {
  console.error(`Compiled contract not found at ${managed}. Run "npm run compact" at the repo root first.`);
  process.exit(1);
}
for (const dir of ['keys', 'zkir']) {
  cpSync(resolve(managed, dir), resolve(uiRoot, 'dist', dir), { recursive: true });
}
console.log('Copied circuit keys and zkir into dist/');
