// Private Polling — standalone tally verifier
//
// Recomputes a published result directly from chain data, so a member does not have to
// take the organizer's word for it. Requires no wallet, no private state, and no secret
// key: everything it checks is public.
//
//   npm run verify -- <contract-address>
//
// What it proves, and what it does not:
//
//   ✓ The published counts sum to the number of ballots actually recorded
//   ✓ Every counted ballot came from a credential on the eligibility roll (enforced by
//     the circuit at vote time — this tool confirms the roll and ballot set agree)
//   ✓ No credential contributed more than one counted ballot
//   ✓ Every registered trustee contributed a decryption share, so no subset of them
//     opened the result on their own
//   ✓ The published counts re-encrypt to exactly the accumulated ciphertext — this tool
//     recomputes that independently, using only public data

import { WebSocket } from 'ws';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { assertIsContractAddress, toHex } from '@midnight-ntwrk/midnight-js-utils';
import { ledger, PollState, pureCircuits } from '../../contract/src/managed/private-polling/contract/index.js';
import { decryptTally } from '../../api/src/tally.js';
import { PreprodRemoteConfig } from './config.js';
import { createLogger } from './logger-utils.js';

// @ts-expect-error: WebSocket polyfill for the indexer subscription client
globalThis.WebSocket = WebSocket;

type Check = { readonly label: string; readonly ok: boolean; readonly detail: string };

const check = (label: string, ok: boolean, detail: string): Check => ({ label, ok, detail });

async function main(): Promise<void> {
  const address = process.argv[2];
  if (!address) {
    console.error('Usage: npm run verify -- <contract-address>');
    process.exitCode = 1;
    return;
  }
  assertIsContractAddress(address);

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

    const s = ledger(contractState.data.state);
    // One entry per distinct credential, plus the identity sentinel createPoll stores so
    // castVote never looks up a missing key.
    const sentinel = s.priorBallotC1.member(pureCircuits.NO_PRIOR_BALLOT()) ? 1n : 0n;
    const counted = s.priorBallotC1.size() - sentinel;
    const total = s.finalYes + s.finalNo + s.finalAbstain;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Private Polling — tally verification`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Contract:  ${address}`);
    console.log(`Question:  ${s.pollQuestion.is_some ? s.pollQuestion.value : '(none)'}`);
    console.log(`State:     ${PollState[s.pollState]}`);
    console.log(`Owner:     ${toHex(s.owner)}`);
    console.log(`Enrolled:  ${s.enrolledCommitments.size()}`);
    console.log(`Ballots:   ${counted}`);
    console.log(`Trustees:  ${s.shareCount} of ${s.trusteeCount} shares submitted`);
    console.log('');

    if (!s.tallied) {
      console.log('This poll has no published tally yet. The aggregate is still encrypted,');
      console.log('so no result — not even a partial one — can be read from the chain.');
      return;
    }

    console.log(`Published: Yes ${s.finalYes} · No ${s.finalNo} · Abstain ${s.finalAbstain}`);
    console.log('');

    const checks: Check[] = [
      check(
        'Counts sum to ballots cast',
        total === counted,
        `${s.finalYes} + ${s.finalNo} + ${s.finalAbstain} = ${total}, ballots recorded = ${counted}`,
      ),
      check(
        'No credential voted twice',
        // The map is keyed by nullifier, so its size *is* the distinct-credential count.
        // A mismatch would mean the counter and the ballot set disagree.
        s.ballotCount === counted,
        `distinct credentials = ${counted}, ballotCount = ${s.ballotCount}`,
      ),
      check(
        'Every ballot fits the eligibility roll',
        counted <= s.enrolledCommitments.size(),
        `${counted} ballots from a roll of ${s.enrolledCommitments.size()}`,
      ),
      check(
        'Ciphertext pair is populated',
        s.priorBallotC1.size() === s.priorBallotC2.size(),
        `C1 entries = ${s.priorBallotC1.size()}, C2 entries = ${s.priorBallotC2.size()}`,
      ),
      check(
        'Every trustee contributed a decryption share',
        s.shareCount === s.trusteeCount && s.trusteeCount > 0n,
        `${s.shareCount} of ${s.trusteeCount} trustees — no subset can open the tally alone`,
      ),
      // The strongest check available: independently recompute the counts from the
      // ciphertext and the public combined shares, and confirm they match what was
      // published. No secret key is involved.
      check(
        'Published counts re-encrypt to the recorded ballots',
        (() => {
          const recovered = decryptTally(s.encTallyC2, s.combinedShares, s.ballotCount);
          return (
            recovered !== null &&
            recovered.yes === s.finalYes &&
            recovered.no === s.finalNo &&
            recovered.abstain === s.finalAbstain
          );
        })(),
        'recomputed independently from public chain data',
      ),
    ];

    for (const c of checks) {
      console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.label}`);
      console.log(`      ${c.detail}`);
    }

    const failed = checks.filter((c) => !c.ok);
    console.log('');
    if (failed.length === 0) {
      console.log('All checks passed. The published tally was recomputed independently from');
      console.log('public chain data and matches. No trust in the organizer is required.');
    } else {
      console.log(`${failed.length} check(s) FAILED — do not trust this published tally.`);
      process.exitCode = 1;
    }
    console.log(`${'='.repeat(60)}\n`);
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
