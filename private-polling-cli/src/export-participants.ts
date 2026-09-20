// Private Polling — participant export
//
// Lists every wallet that has checked in on a deployed contract, read straight from the
// public ledger. Needs no wallet and no private state, so anyone can run it and get the
// same list — which is the point: the user count is verifiable, not asserted.
//
//   npm run export-participants -- <contract-address> [output-dir]
//
// Writes <output-dir>/participants-<network>.json and .csv (default: ../deployments).
//
// What a participant entry is: the coin public key the wallet presented when it called
// `checkIn`. It is the first half of the wallet's shielded address and is shown here in
// both hex and Bech32m (`mn_shield-cpk_…`) form. The set is kept apart from every voting
// circuit, so this list says who used the product — never how anyone voted.

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { WebSocket } from 'ws';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { assertIsContractAddress, toHex } from '@midnight-ntwrk/midnight-js-utils';
import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { ShieldedCoinPublicKey } from '@midnight-ntwrk/wallet-sdk-address-format';
import { ledger } from '../../contract/src/managed/private-polling/contract/index.js';
import { PreprodRemoteConfig, currentDir } from './config.js';
import { createLogger } from './logger-utils.js';

// @ts-expect-error: WebSocket polyfill for the indexer subscription client
globalThis.WebSocket = WebSocket;

async function main(): Promise<void> {
  const address = process.argv[2];
  if (!address) {
    console.error('Usage: npm run export-participants -- <contract-address> [output-dir]');
    process.exitCode = 1;
    return;
  }
  assertIsContractAddress(address);
  const outputDir = path.resolve(process.argv[3] ?? path.resolve(currentDir, '..', '..', 'deployments'));

  const config = new PreprodRemoteConfig();
  const logger = await createLogger(config.logDir);
  const testEnv = config.getEnvironment(logger);
  // Read-only: only the indexer is needed, so skip the proof server and node health checks.
  const envConfiguration = testEnv.getEnvironmentConfiguration();

  try {
    const provider = indexerPublicDataProvider(envConfiguration.indexer, envConfiguration.indexerWS);
    const contractState = await provider.queryContractState(address);
    if (contractState === null) {
      console.error(`No contract found at ${address}`);
      process.exitCode = 1;
      return;
    }

    const networkId = getNetworkId();
    const participants = [...ledger(contractState.data.state).participants].map((key, index) => {
      const hex = toHex(key);
      return {
        index: index + 1,
        coinPublicKey: hex,
        bech32: ShieldedCoinPublicKey.codec.encode(networkId, ShieldedCoinPublicKey.fromHexString(hex)).asString(),
      };
    });

    const exportedAt = new Date().toISOString();
    await mkdir(outputDir, { recursive: true });
    const base = path.join(outputDir, `participants-${networkId}`);
    await writeFile(
      `${base}.json`,
      JSON.stringify(
        { networkId, contractAddress: address, exportedAt, count: participants.length, participants },
        null,
        2,
      ) + '\n',
    );
    await writeFile(
      `${base}.csv`,
      [
        'index,coin_public_key_hex,coin_public_key_bech32',
        ...participants.map((p) => `${p.index},${p.coinPublicKey},${p.bech32}`),
      ].join('\n') + '\n',
    );

    console.log(`\n${participants.length} participant wallet(s) checked in on ${address}`);
    console.log(`Written: ${path.relative(process.cwd(), base)}.json / .csv\n`);
  } finally {
    try {
      await testEnv.shutdown();
    } catch {
      // best-effort cleanup — the process is exiting regardless
    }
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
