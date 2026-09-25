#!/usr/bin/env node
/**
 * Rewrites USERS.md and LAUNCH_USERS.md from the participant export, so the published
 * user lists are transcribed from chain state rather than typed by hand.
 *
 *   npm run export-participants -- <address>   # reads the chain
 *   npm run sync-users                         # rewrites the tables below
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NETWORK = process.env.NETWORK_ID ?? 'preprod';
const EXPORT = path.join(ROOT, 'deployments', `participants-${NETWORK}.json`);

const TARGETS = [
  { file: 'USERS.md', title: `Preprod Users — Level 5`, target: 50 },
  { file: 'LAUNCH_USERS.md', title: `Level 6 Users — Preprod`, target: 70 },
];

const rows = (participants) =>
  participants.length === 0
    ? '| — | _no wallets have checked in yet_ | — |'
    : participants
        .map((p, i) => `| ${i + 1} | \`${p.bech32 ?? p.hex}\` | ${(p.checkedInAt ?? '').slice(0, 10) || '—'} |`)
        .join('\n');

const main = async () => {
  let data;
  try {
    data = JSON.parse(await readFile(EXPORT, 'utf-8'));
  } catch {
    console.error(`No export at ${path.relative(ROOT, EXPORT)}. Run: npm run export-participants -- <address>`);
    process.exitCode = 1;
    return;
  }

  const participants = data.participants ?? [];
  for (const { file, title, target } of TARGETS) {
    const body = `# ${title}

Target: ${target} verified wallet addresses. **Current count: ${participants.length} / ${target}.**

Every row below is a wallet that pressed **Count me as a tester** in the app, which writes
it to the contract's participant set. This file is generated — it is never edited by hand:

\`\`\`bash
npm run export-participants -- ${data.contractAddress}
npm run sync-users
\`\`\`

Anyone can run those two commands and get the same list from public chain state, so the
count does not have to be taken on trust.

| Network | Contract | Exported |
|---|---|---|
| ${data.networkId} | \`${data.contractAddress}\` | ${(data.exportedAt ?? '').slice(0, 19).replace('T', ' ')} UTC |

| # | Wallet (ShieldedCoinPublicKey) | Date Added |
|----|----------------|------------|
${rows(participants)}

Hex forms of the same keys are in
[\`deployments/participants-${NETWORK}.json\`](./deployments/participants-${NETWORK}.json) and
[\`.csv\`](./deployments/participants-${NETWORK}.csv).
`;
    // Keep the hand-collected tester section (feedback form), which chain state can't regenerate.
    const existing = await readFile(path.join(ROOT, file), 'utf-8').catch(() => '');
    const marker = existing.indexOf('<!-- testers:start');
    const kept = marker === -1 ? '' : `\n${existing.slice(marker)}`;
    await writeFile(path.join(ROOT, file), body + kept);
    console.log(`${file}: ${participants.length} / ${target}`);
  }
};

await main();
