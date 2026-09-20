// BallotBox — end-to-end run against a local Midnight network
//
// Starts a throwaway node + indexer + proof server in Docker (compose.yml), then drives a
// complete poll through real transactions: proofs from the proof server, balancing and
// submission through a funded genesis wallet, state read back from the indexer.
//
//   npm run e2e:standalone      (from private-polling-cli/, Docker running)
//
// One wallet pays every fee. The organizer and each voter get their own private state —
// their own secret key — which is what makes them distinct participants to the contract.
//
// Exits non-zero on the first failed expectation.

import { execSync } from 'node:child_process';
import { WebSocket } from 'ws';
import { firstValueFrom, filter, timeout } from 'rxjs';
import { type Logger } from 'pino';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { inMemoryPrivateStateProvider, type EnvironmentConfiguration } from '@midnight-ntwrk/testkit-js';
import { unshieldedToken } from '@midnight-ntwrk/midnight-js-protocol/ledger';
import {
  PrivatePollingAPI,
  VoteChoice,
  type PrivatePollingCircuitKeys,
  type PrivatePollingDerivedState,
  type PrivatePollingProviders,
  type PrivateStateId,
} from '../../api/src/index.js';
import { type PrivatePollingPrivateState } from '../../contract/src/witnesses.js';
import { PollState } from '../../contract/src/managed/private-polling/contract/index.js';
import { StandaloneConfig } from './config.js';
import { createLogger } from './logger-utils.js';
import { MidnightWalletProvider } from './midnight-wallet-provider.js';
import { syncWallet, waitForUnshieldedFunds } from './wallet-utils.js';

// @ts-expect-error: WebSocket polyfill for the indexer subscription client
globalThis.WebSocket = WebSocket;

const GENESIS_SEED = '0000000000000000000000000000000000000000000000000000000000000001';

let step = 0;
const results: { step: string; seconds: number }[] = [];

const expect = (condition: boolean, message: string): void => {
  if (!condition) throw new Error(`EXPECTATION FAILED: ${message}`);
};

const timed = async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
  step++;
  const started = Date.now();
  console.log(`\n[${step}] ${label}…`);
  const value = await fn();
  const seconds = Math.round((Date.now() - started) / 100) / 10;
  results.push({ step: label, seconds });
  console.log(`[${step}] ✓ ${label} (${seconds}s)`);
  return value;
};

const expectRejected = async (label: string, fn: () => Promise<unknown>, pattern: RegExp): Promise<void> =>
  timed(label, async () => {
    try {
      await fn();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      expect(pattern.test(message), `${label}: rejected, but with an unexpected error: ${message}`);
      console.log(`    rejected as expected: ${message.split('\n')[0].slice(0, 140)}`);
      return;
    }
    throw new Error(`EXPECTATION FAILED: ${label} was accepted`);
  });

/** Waits until the derived state stream satisfies `predicate` (the indexer lags the node). */
const waitForState = (
  api: PrivatePollingAPI,
  predicate: (s: PrivatePollingDerivedState) => boolean,
  description: string,
): Promise<PrivatePollingDerivedState> =>
  firstValueFrom(
    api.state$.pipe(
      filter(predicate),
      timeout({ first: 120_000, with: () => Promise.reject(new Error(`Timed out waiting for: ${description}`)) }),
    ),
  );

const makeProviders = (
  env: EnvironmentConfiguration,
  wallet: MidnightWalletProvider,
  zkConfigPath: string,
): PrivatePollingProviders => {
  const zkConfigProvider = new NodeZkConfigProvider<PrivatePollingCircuitKeys>(zkConfigPath);
  return {
    // A separate store per participant: each one is a different secret key.
    privateStateProvider: inMemoryPrivateStateProvider<PrivateStateId, PrivatePollingPrivateState>(),
    publicDataProvider: indexerPublicDataProvider(env.indexer, env.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(env.proofServer, zkConfigProvider),
    walletProvider: wallet,
    midnightProvider: wallet,
  };
};

const runPoll = async (env: EnvironmentConfiguration, wallet: MidnightWalletProvider, logger: Logger) => {
  const zkPath = new StandaloneConfig().zkConfigPath;

  // ── Organizer deploys and starts an open-enrollment poll ────────────────────────────
  const organizer = await timed('Organizer deploys the contract', async () => {
    try {
      return await PrivatePollingAPI.deploy(makeProviders(env, wallet, zkPath), logger);
    } catch (e) {
      // One retry for a fee-proof race on a young chain; anything else is a real failure.
      if (!/submission/i.test(String(e))) throw e;
      console.log('    submission rejected (fee proof race) — retrying once in 20s');
      await new Promise((r) => setTimeout(r, 20_000));
      return PrivatePollingAPI.deploy(makeProviders(env, wallet, zkPath), logger);
    }
  });
  const address = organizer.deployedContractAddress;
  console.log(`    contract: ${address}`);

  let s = await waitForState(organizer, () => true, 'initial state');
  expect(s.isAdmin && s.pollState === PollState.CLOSED, 'deployer is admin of a CLOSED contract');

  const created = await timed('Organizer creates an open-enrollment poll', () =>
    organizer.createPoll('Should BallotBox ship v1?', {
      deadline: new Date(Date.now() + 2 * 3_600_000),
      quorum: 2,
      openEnrollment: true,
    }),
  );
  expect(/^[0-9a-f]+$/i.test(created.txHash) && created.blockHeight > 0, 'createPoll returns a tx receipt');
  s = await waitForState(organizer, (x) => x.pollState === PollState.REGISTRATION, 'REGISTRATION');
  expect(s.openEnrollment && s.isOwner, 'poll is open-enrollment and owned by the organizer');

  const voter1 = await timed('Voter 1 joins the contract', () =>
    PrivatePollingAPI.join(makeProviders(env, wallet, zkPath), address, logger),
  );

  await timed('Organizer registers as trustee', () => organizer.registerTrustee());
  await timed('Voter 1 self-enrols during REGISTRATION', () => voter1.selfEnroll());
  s = await waitForState(voter1, (x) => x.isEligible, 'voter 1 eligible');
  expect(s.enrolledCount === 1n, 'roll has one voter');

  await expectRejected('The same commitment cannot enrol twice', () => voter1.selfEnroll(), /already enrolled/i);

  await timed('Organizer opens voting', () => organizer.openVoting());
  await waitForState(voter1, (x) => x.pollState === PollState.OPEN, 'OPEN');

  await timed('Voter 1 casts an encrypted Yes', () => voter1.castVote(VoteChoice.Yes));
  s = await waitForState(voter1, (x) => x.hasVoted, 'voter 1 ballot recorded');
  expect(s.ballotCount === 1n && !s.tallied && s.finalYes === 0n, 'one ballot, nothing readable yet');

  // ── A late joiner enrols while voting is open; the historic roll keeps proofs valid ──
  const voter2 = await timed('Voter 2 joins the contract', () =>
    PrivatePollingAPI.join(makeProviders(env, wallet, zkPath), address, logger),
  );
  await timed('Voter 2 self-enrols while voting is OPEN', () => voter2.selfEnroll());
  await waitForState(voter2, (x) => x.isEligible, 'voter 2 eligible');
  await timed('Voter 2 casts an encrypted No', () => voter2.castVote(VoteChoice.No));

  // ── Re-voting replaces, never adds ──────────────────────────────────────────────────
  await timed('Voter 1 re-votes: Yes → No', () => voter1.castVote(VoteChoice.No));
  s = await waitForState(organizer, (x) => x.ballotCount === 2n, 'two distinct ballots');

  const stranger = await timed('An unenrolled wallet key joins', () =>
    PrivatePollingAPI.join(makeProviders(env, wallet, zkPath), address, logger),
  );
  await expectRejected(
    'An unenrolled key cannot vote',
    () => stranger.castVote(VoteChoice.Yes),
    /eligible|path|failed assert|assert/i,
  );

  // ── Opt-in participant check-in ─────────────────────────────────────────────────────
  await timed('Wallet checks in as a tester', () => voter1.checkIn());
  s = await waitForState(voter1, (x) => x.participantCount === 1n, 'one participant');
  expect(s.hasCheckedIn, 'hasCheckedIn is derived from the wallet coin public key');
  await expectRejected('The same wallet cannot check in twice', () => voter2.checkIn(), /already checked in/i);

  // ── Close, decrypt, publish ─────────────────────────────────────────────────────────
  await expectRejected('A voter cannot close early', () => voter2.closeVoting(), /creator|deadline/i);
  await timed('Organizer closes voting', () => organizer.closeVoting());
  await waitForState(organizer, (x) => x.pollState === PollState.TALLYING, 'TALLYING');

  await expectRejected(
    'Nobody can publish before every trustee has a share in',
    () => stranger.publishTally(),
    /trustees have submitted|not every trustee/i,
  );
  await timed('Trustee submits a decryption share', () => organizer.submitDecryptionShare());
  await waitForState(organizer, (x) => x.pollState === PollState.TALLYING && x.shareCount === 1n, 'all shares in');

  const tally = await timed('A non-organizer publishes the verified result', () => stranger.publishTally());
  expect(
    tally.yes === 0n && tally.no === 2n && tally.abstain === 0n,
    `decrypted 0/2/0, got ${tally.yes}/${tally.no}/${tally.abstain}`,
  );

  s = await waitForState(organizer, (x) => x.tallied, 'tallied');
  expect(s.pollState === PollState.CLOSED, 'poll CLOSED after publishing');
  expect(s.finalYes === 0n && s.finalNo === 2n && s.finalAbstain === 0n, 'on-chain result is 0 Yes / 2 No / 0 Abstain');
  expect(s.quorumMet, 'quorum of 2 met');

  // ── Next poll: fresh identity, participant list carries over ────────────────────────
  // The contract is CLOSED here, so only the admin rule can stop another wallet's key.
  await expectRejected(
    'A non-admin cannot start a poll on a closed contract (squatting blocked)',
    () => voter1.createPoll('Hijack', {}),
    /only the contract admin/i,
  );
  await timed('Admin starts a second poll on the same contract', () =>
    organizer.createPoll('Second poll', { openEnrollment: false }),
  );
  // Match on the question: the state stream can replay earlier ledger states, and poll 1
  // also passed through REGISTRATION.
  const isPoll2 = (x: PrivatePollingDerivedState) =>
    x.pollState === PollState.REGISTRATION && x.pollQuestion === 'Second poll';
  s = await waitForState(organizer, isPoll2, 'poll 2');
  expect(s.ballotCount === 0n && s.enrolledCount === 0n && !s.openEnrollment, 'second poll starts clean');
  expect(s.participantCount === 1n, 'participant list survives a new poll');
  const v1 = await waitForState(voter1, isPoll2, 'voter 1 sees poll 2');
  expect(!v1.isEligible && !v1.hasVoted, 'poll 1 enrolment and ballot do not carry into poll 2');

  await expectRejected(
    'Self-enrolment is refused on an invite-only poll',
    () => voter1.selfEnroll(),
    /only accepts voters enrolled by the organizer/i,
  );

  return address;
};

async function main(): Promise<void> {
  const config = new StandaloneConfig();
  const logger = await createLogger(config.logDir);
  const testEnv = config.getEnvironment(logger);
  let wallet: MidnightWalletProvider | undefined;
  const started = Date.now();

  try {
    const env = await timed('Start local node, indexer and proof server (Docker)', () => testEnv.start());
    wallet = await timed('Build and sync the funded genesis wallet', async () => {
      const w = await MidnightWalletProvider.build(logger, env, GENESIS_SEED);
      await w.start();
      const unshielded = await waitForUnshieldedFunds(logger, w.wallet, env, unshieldedToken());
      console.log(`    tNIGHT: ${unshielded.balances[unshieldedToken().raw] ?? 0n}`);
      await syncWallet(logger, w.wallet);
      // A freshly started chain needs a few blocks before DUST spends prove against a
      // settled state; submitting straight away is rejected as InvalidDustSpendProof.
      await firstValueFrom(
        w.wallet.state().pipe(
          filter((st) => st.dust.balance(new Date()) > 0n),
          timeout({ first: 180_000 }),
        ),
      );
      await new Promise((r) => setTimeout(r, 20_000));
      await syncWallet(logger, w.wallet);
      return w;
    });

    const address = await runPoll(env, wallet, logger);

    console.log(
      `\n${'='.repeat(64)}\nEND-TO-END PASSED — ${results.length} steps in ${Math.round((Date.now() - started) / 1000)}s`,
    );
    console.log(`Contract: ${address}\n${'='.repeat(64)}`);
    for (const r of results) console.log(`  ${String(r.seconds).padStart(6)}s  ${r.step}`);
  } catch (e) {
    console.error(`\nEND-TO-END FAILED at step ${step}:`, e instanceof Error ? (e.stack ?? e.message) : e);
    process.exitCode = 1;
    // The SDK drops the proof server's error body; the container's own log says what it rejected.
    try {
      const names = execSync('docker ps --format "{{.Names}}"').toString().split(/\r?\n/);
      for (const name of names.filter((n) => /^(proof-server|node)_/.test(n))) {
        console.error(`\n--- docker logs ${name} (tail) ---`);
        console.error(execSync(`docker logs --tail 40 ${name} 2>&1`).toString());
      }
    } catch {
      // diagnostics only
    }
  } finally {
    try {
      await wallet?.stop();
    } catch {
      // best effort
    }
    try {
      await testEnv.shutdown();
    } catch {
      // best effort
    }
    process.exit(process.exitCode ?? 0);
  }
}

await main();
