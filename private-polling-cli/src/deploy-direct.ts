// Private Polling CLI — Direct Non-interactive Preprod Deployment
//
// Configuration comes from the environment (or private-polling-cli/.env, see .env.example):
//
//   MIDNIGHT_WALLET_SEED     required  hex seed of a funded Preprod wallet
//   PRIVATE_STATE_PASSWORD   optional  encrypts the local LevelDB private state
//   DEMO_POLL_QUESTION       optional  if set, also starts a public poll on the new contract:
//                                      open enrollment, deployer as sole trustee, voting open
//   DEMO_POLL_DAYS           optional  voting window for that poll (default 14)
//   DUST_WAIT_MINUTES        optional  how long to wait for the dust wallet (default 15). A new
//                                      wallet syncs the whole dust history first: hours on Preprod
//
// Outputs:
//   deployments/<network>.json               public record — safe to commit
//   private-polling-cli/.secrets/<addr>.json organizer secret key — NEVER commit; import it
//                                            into the web UI to manage the poll from a browser

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import axios from 'axios';
import { WebSocket } from 'ws';
import { createLogger } from './logger-utils.js';
import { PreprodRemoteConfig } from './config.js';
import { MidnightWalletProvider } from './midnight-wallet-provider.js';
import { unshieldedToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { createVerifierKey } from '@midnight-ntwrk/midnight-js-types';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import {
  PrivatePollingAPI,
  type PrivatePollingProviders,
  type PrivateStateId,
  type PrivatePollingCircuitKeys,
} from '../../api/src/index.js';
import { PrivatePollingPrivateState } from '../../contract/src/witnesses.js';
import { getUnshieldedSeed } from './generate-dust.js';
import { createKeystore } from '@midnight-ntwrk/wallet-sdk-unshielded-wallet';
import { getNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import * as rx from 'rxjs';
import { type FacadeState } from '@midnight-ntwrk/wallet-sdk-facade';
import { UnshieldedAddress } from '@midnight-ntwrk/wallet-sdk-address-format';
import { toHex } from '@midnight-ntwrk/midnight-js-utils';
import { privatePollingPrivateStateKey } from '../../api/src/index.js';
import { currentDir } from './config.js';

// @ts-expect-error: WebSocket polyfill
globalThis.WebSocket = WebSocket;

axios.interceptors.request.use((config) => {
  if (config.timeout && config.timeout <= 2000) config.timeout = 30_000;
  return config;
});

/**
 * The wallet seed controls real (testnet) funds and the right to deploy under this
 * identity, so it is never written into source. A seed committed to a public repository
 * has to be treated as compromised.
 */
const readSeed = (): string => {
  const seed = process.env.MIDNIGHT_WALLET_SEED?.trim().replace(/^0x/i, '');
  if (!seed || !/^[0-9a-fA-F]{64}$/.test(seed)) {
    throw new Error(
      'MIDNIGHT_WALLET_SEED is not set (or is not 64 hex characters). ' +
        'Copy private-polling-cli/.env.example to .env and fill it in.',
    );
  }
  return seed;
};

const SEED = readSeed();
const PRIVATE_STATE_PASSWORD = process.env.PRIVATE_STATE_PASSWORD ?? 'Polling-Local-Dev-Only!';
const DEMO_POLL_QUESTION = process.env.DEMO_POLL_QUESTION?.trim();
const DEMO_POLL_DAYS = Number(process.env.DEMO_POLL_DAYS ?? '14');
const DUST_WAIT_MINUTES = Number(process.env.DUST_WAIT_MINUTES ?? '15');
const CLI_ROOT = path.resolve(currentDir, '..');
const REPO_ROOT = path.resolve(CLI_ROOT, '..');

const withTimeout = <T>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
  Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`Timeout after ${ms / 1000}s: ${label}`)), ms)),
  ]);

function encodeVerifierKey(raw: Uint8Array): Uint8Array {
  const header = Buffer.from('midnight:verifier-key[v6]:', 'utf-8');
  const keyBuf = Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength);
  if (keyBuf.subarray(0, header.length).equals(header)) return raw;
  const len = keyBuf.length;
  const scaleLen = len < 64 ? Buffer.from([len << 2]) : Buffer.from([((len << 2) | 1) & 0xff, ((len << 2) | 1) >> 8]);
  return new Uint8Array(Buffer.concat([header, scaleLen, keyBuf]));
}

class TaggedNodeZkConfigProvider extends NodeZkConfigProvider<PrivatePollingCircuitKeys> {
  override async getVerifierKey(circuitId: PrivatePollingCircuitKeys) {
    const key = await super.getVerifierKey(circuitId);
    return createVerifierKey(encodeVerifierKey(key));
  }
}

/** Wait for a wallet state observable, with a quiet periodic log instead of per-emission spam */
function waitForCondition<T>(
  obs: rx.Observable<T>,
  predicate: (v: T) => boolean,
  logFn: (v: T) => void,
  logIntervalMs: number,
  timeoutMs: number,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let lastLog = 0;
    const timer = setTimeout(() => {
      sub.unsubscribe();
      reject(new Error(`Timeout after ${timeoutMs / 1000}s`));
    }, timeoutMs);

    const sub = obs.subscribe({
      next: (v) => {
        if (predicate(v)) {
          clearTimeout(timer);
          sub.unsubscribe();
          resolve(v);
          return;
        }
        const now = Date.now();
        if (now - lastLog >= logIntervalMs) {
          logFn(v);
          lastLog = now;
        }
      },
      error: (e: unknown) => {
        clearTimeout(timer);
        reject(e instanceof Error ? e : new Error(String(e)));
      },
    });
  });
}

async function main() {
  const config = new PreprodRemoteConfig();
  const logger = await createLogger(config.logDir);
  const testEnv = config.getEnvironment(logger);
  let walletProvider: MidnightWalletProvider | undefined;

  try {
    // ── Step 1: Start environment ─────────────────────────────────────────
    logger.info('[1/5] Starting environment...');
    const envConfiguration = await withTimeout(testEnv.start(), 60_000, 'testEnv.start()');
    logger.info('[1/5] Environment ready.');

    // ── Step 2: Build wallet ──────────────────────────────────────────────
    logger.info('[2/5] Building wallet...');
    walletProvider = await withTimeout(
      MidnightWalletProvider.build(logger, envConfiguration, SEED),
      30_000,
      'wallet build',
    );
    await withTimeout(walletProvider.start(), 30_000, 'wallet start');
    logger.info('[2/5] Wallet started.');

    // ── Step 3: Wait for NIGHT balance ────────────────────────────────────
    logger.info('[3/5] Waiting for NIGHT balance...');
    const unshieldedState = await waitForCondition(
      walletProvider.wallet.state().pipe(rx.map((s: FacadeState) => s.unshielded)),
      (s) => {
        const hasAny = Object.values(s.balances || {}).some((b) => b > 0n);
        return hasAny || s.progress.isStrictlyComplete();
      },
      (s) => logger.info(`[3/5] Syncing wallet... balance: ${s.balances[unshieldedToken().raw] ?? 0n}`),
      5_000,
      45_000,
    );

    const addr = UnshieldedAddress.codec.encode(getNetworkId(), unshieldedState.address);
    const nightBalance = unshieldedState.balances[unshieldedToken().raw] ?? 0n;
    logger.info(`[3/5] Address: ${addr.toString()} | NIGHT: ${nightBalance}`);

    if (nightBalance === 0n) {
      throw new Error(
        `Wallet has 0 NIGHT. Fund ${addr.toString()} at https://faucet.preprod.midnight.network/ then re-run.`,
      );
    }

    // ── Step 4: Dust registration ─────────────────────────────────────────
    logger.info('[4/5] Registering UTXOs for dust generation...');
    let dustTxSubmitted = false;

    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        // Get fresh unshielded state
        const fresh = await withTimeout(
          rx.firstValueFrom(
            walletProvider.wallet.state().pipe(
              rx.map((s: FacadeState) => s.unshielded),
              rx.timeout(20_000),
            ),
          ),
          25_000,
          'fresh unshielded state',
        );

        const utxos = fresh.availableCoins.filter((c) => !c.meta.registeredForDustGeneration);

        if (utxos.length === 0) {
          logger.info('[4/5] UTXOs already registered. Waiting for dust to materialise on-chain...');
          dustTxSubmitted = true;
          break;
        }

        logger.info(`[4/5] Attempt ${attempt}/5: registering ${utxos.length} UTXO(s)...`);

        const dustState = await withTimeout(
          rx.firstValueFrom(
            walletProvider.wallet.state().pipe(
              rx.map((s: FacadeState) => s.dust),
              rx.timeout(20_000),
            ),
          ),
          25_000,
          'dust state',
        );

        const ks = createKeystore(getUnshieldedSeed(SEED), getNetworkId());
        const recipe = await withTimeout(
          walletProvider.wallet.registerNightUtxosForDustGeneration(
            utxos,
            ks.getPublicKey(),
            (p: Uint8Array) => ks.signData(p),
            dustState.address,
          ),
          45_000,
          'registerNightUtxosForDustGeneration()',
        );

        const tx = await withTimeout(walletProvider.wallet.finalizeRecipe(recipe), 20_000, 'finalizeRecipe()');
        const txId = await withTimeout(walletProvider.wallet.submitTransaction(tx), 45_000, 'submitTransaction()');
        logger.info(`[4/5] Dust registration tx: ${txId}`);
        dustTxSubmitted = true;
        break;
      } catch (e) {
        logger.warn(`[4/5] Attempt ${attempt}/5 failed: ${e instanceof Error ? e.message : String(e)}`);
        if (attempt < 5) {
          logger.info('[4/5] Retrying in 5s...');
          await new Promise((r) => setTimeout(r, 5_000));
        }
      }
    }

    if (!dustTxSubmitted) {
      throw new Error('Dust registration failed after 5 attempts. Try again later.');
    }

    // Wait for dust balance — log once every 10s
    // A new CLI wallet replays the network's whole dust history before it can see (and
    // spend) its own dust. On Preprod that is hours, so the limit is configurable and the
    // log shows sync progress rather than a bare zero balance.
    logger.info(`[4/5] Waiting for dust balance (up to ${DUST_WAIT_MINUTES} min)...`);
    const syncStart = { at: Date.now(), index: -1n };
    await waitForCondition(
      walletProvider.wallet.state(),
      (s: FacadeState) => s.dust.balance(new Date()) > 0n,
      (s: FacadeState) => {
        const { appliedIndex, highestRelevantWalletIndex } = s.dust.progress;
        if (syncStart.index < 0n) syncStart.index = appliedIndex;
        const rate = Number(appliedIndex - syncStart.index) / ((Date.now() - syncStart.at) / 1000);
        const remaining = Number(highestRelevantWalletIndex - appliedIndex);
        const eta = rate > 0 && remaining > 0 ? `, ~${Math.ceil(remaining / rate / 60)} min left` : '';
        logger.info(
          `[4/5] Dust wallet sync ${appliedIndex}/${highestRelevantWalletIndex}${eta} — balance ${s.dust.balance(new Date())}`,
        );
      },
      60_000,
      DUST_WAIT_MINUTES * 60_000,
    );
    logger.info('[4/5] Dust balance confirmed!');

    // ── Step 5: Deploy ────────────────────────────────────────────────────
    logger.info('[5/5] Deploying Private Polling contract (ZK proof generation — up to 5 min)...');
    const zkConfigProvider = new TaggedNodeZkConfigProvider(config.zkConfigPath);
    const providers: PrivatePollingProviders = {
      privateStateProvider: levelPrivateStateProvider<PrivateStateId, PrivatePollingPrivateState>({
        privateStateStoreName: config.privateStateStoreName,
        signingKeyStoreName: `${config.privateStateStoreName}-signing-keys`,
        privateStoragePasswordProvider: () => PRIVATE_STATE_PASSWORD,
        accountId: SEED,
      }),
      publicDataProvider: indexerPublicDataProvider(envConfiguration.indexer, envConfiguration.indexerWS),
      zkConfigProvider,
      proofProvider: httpClientProofProvider(envConfiguration.proofServer, zkConfigProvider),
      walletProvider,
      midnightProvider: walletProvider,
    };

    const api = await withTimeout(PrivatePollingAPI.deploy(providers, logger), 300_000, 'PrivatePollingAPI.deploy()');
    const contractAddress = api.deployedContractAddress;
    const networkId = getNetworkId();

    // The deployer's secret key is the contract admin. Save it before anything else can
    // fail: without it no further poll can ever be started on this contract.
    const privateState = await providers.privateStateProvider.get(privatePollingPrivateStateKey);
    if (privateState === null) throw new Error('Deployed, but the organizer private state was not persisted.');
    const secretsDir = path.join(CLI_ROOT, '.secrets');
    await mkdir(secretsDir, { recursive: true });
    const secretFile = path.join(secretsDir, `${contractAddress}.json`);
    await writeFile(
      secretFile,
      JSON.stringify(
        {
          format: 'ballotbox-key-backup/v1',
          networkId,
          contractAddress,
          secretKey: toHex(privateState.secretKey),
          warning: 'Organizer/admin key. Anyone holding it controls this contract. Never commit or share.',
        },
        null,
        2,
      ),
      { mode: 0o600 },
    );

    const record: Record<string, unknown> = {
      networkId,
      contractAddress,
      deployedAt: new Date().toISOString(),
      deployTxHash: api.deployedContract.deployTxData.public.txHash,
      deployBlockHeight: api.deployedContract.deployTxData.public.blockHeight,
    };

    if (DEMO_POLL_QUESTION) {
      logger.info(`[5/5] Starting demo poll: "${DEMO_POLL_QUESTION}"`);
      const deadline = new Date(Date.now() + DEMO_POLL_DAYS * 86_400_000);
      const created = await api.createPoll(DEMO_POLL_QUESTION, { deadline, openEnrollment: true });
      // The deployer acts as sole trustee so the demo can always be tallied. Documented as
      // a demo trade-off: a binding vote should register independent trustees instead.
      const trustee = await api.registerTrustee();
      const opened = await api.openVoting();
      record.demoPoll = {
        question: DEMO_POLL_QUESTION,
        votingDeadline: deadline.toISOString(),
        openEnrollment: true,
        txHashes: { createPoll: created.txHash, registerTrustee: trustee.txHash, openVoting: opened.txHash },
      };
    }

    const deploymentsDir = path.join(REPO_ROOT, 'deployments');
    await mkdir(deploymentsDir, { recursive: true });
    await writeFile(path.join(deploymentsDir, `${networkId}.json`), JSON.stringify(record, null, 2) + '\n');

    console.log(`\n${'='.repeat(52)}`);
    console.log(`DEPLOYMENT SUCCESSFUL!`);
    console.log(`Contract Address: ${contractAddress}`);
    console.log(`Public record:    deployments/${networkId}.json`);
    console.log(`Organizer key:    ${path.relative(REPO_ROOT, secretFile)}  (keep private!)`);
    console.log(`${'='.repeat(52)}\n`);
  } catch (err) {
    console.error('\n[ERROR]', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  } finally {
    if (walletProvider)
      try {
        await withTimeout(walletProvider.stop(), 10_000, 'stop');
      } catch {
        // best-effort cleanup — process is exiting regardless
      }
    try {
      await withTimeout(testEnv.shutdown(), 10_000, 'shutdown');
    } catch {
      // best-effort cleanup — process is exiting regardless
    }
    process.exit(process.exitCode ?? 0);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
