import { describe, expect, it } from 'vitest';
import {
  createCircuitContext,
  createConstructorContext,
  sampleContractAddress,
  type CircuitContext,
} from '@midnight-ntwrk/compact-runtime';
import { Contract, ledger, pureCircuits } from '../../../contract/src/managed/private-polling/contract/index.js';
import {
  createPrivatePollingPrivateState,
  witnesses,
  type PrivatePollingPrivateState,
} from '../../../contract/src/witnesses.js';
import { decryptTally } from '../tally.js';

/**
 * End-to-end check of the off-chain decryption the UI and CLI rely on to publish results:
 * run a real poll through the compiled contract, recover the counts with `decryptTally`
 * from public ledger data only, and confirm the contract accepts them.
 */

type Ctx = CircuitContext<PrivatePollingPrivateState>;
const contract = new Contract(witnesses);
const COIN = '0'.repeat(64);
const key = (byte: number) => new Uint8Array(32).fill(byte);
const ORGANIZER = key(1);

const as = (ctx: Ctx, secret: Uint8Array, choice?: number): Ctx => ({
  ...ctx,
  currentPrivateState: createPrivatePollingPrivateState(secret, choice),
});
const state = (ctx: Ctx) => ledger(ctx.currentQueryContext.state);

const runPoll = (ballots: number[], trustees: Uint8Array[] = [ORGANIZER]): Ctx => {
  const deployed = contract.initialState(createConstructorContext(createPrivatePollingPrivateState(ORGANIZER), COIN));
  let ctx: Ctx = createCircuitContext(
    sampleContractAddress(),
    COIN,
    deployed.currentContractState,
    deployed.currentPrivateState,
  );
  ctx = contract.impureCircuits.createPoll(ctx, 'Q', 0n, 0n, true).context;
  for (const t of trustees) ctx = contract.impureCircuits.registerTrustee(as(ctx, t)).context;
  const voters = ballots.map((_, i) => key(100 + i));
  for (const v of voters) ctx = contract.impureCircuits.selfEnroll(as(ctx, v), pureCircuits.voterCommitment(v)).context;
  ctx = contract.impureCircuits.openVoting(as(ctx, ORGANIZER)).context;
  ballots.forEach((choice, i) => {
    ctx = contract.impureCircuits.castVote(as(ctx, voters[i], choice)).context;
  });
  ctx = contract.impureCircuits.closeVoting(as(ctx, ORGANIZER)).context;
  for (const t of trustees) ctx = contract.impureCircuits.submitDecryptionShare(as(ctx, t)).context;
  return ctx;
};

describe('decryptTally', () => {
  it('recovers the exact counts from public data, and the contract accepts them', () => {
    const ctx = runPoll([0, 0, 1, 2, 0, 1, 0]);
    const s = state(ctx);
    const tally = decryptTally(s.encTallyC2, s.combinedShares, s.ballotCount);
    expect(tally).toEqual({ yes: 4n, no: 2n, abstain: 1n });

    const published = contract.impureCircuits.publishTally(as(ctx, key(200)), tally!.yes, tally!.no, tally!.abstain);
    expect(state(published.context).tallied).toBe(true);
  });

  it('works with several trustees', () => {
    const ctx = runPoll([1, 1, 2], [key(31), key(32)]);
    const s = state(ctx);
    expect(decryptTally(s.encTallyC2, s.combinedShares, s.ballotCount)).toEqual({ yes: 0n, no: 2n, abstain: 1n });
  });

  it('handles an empty poll', () => {
    const ctx = runPoll([]);
    const s = state(ctx);
    expect(decryptTally(s.encTallyC2, s.combinedShares, s.ballotCount)).toEqual({ yes: 0n, no: 0n, abstain: 0n });
  });

  it('returns null when the shares are incomplete rather than guessing', () => {
    const ctx = runPoll([0, 1], [key(31), key(32)]);
    const s = state(ctx);
    // Pretend one trustee has not contributed: use the poll's ciphertext with no shares.
    const emptyShares = state(runPoll([])).combinedShares;
    expect(decryptTally(s.encTallyC2, emptyShares, s.ballotCount)).toBeNull();
  });

  it('decrypts a 70-voter poll quickly enough for the browser', () => {
    const ballots = Array.from({ length: 70 }, (_, i) => i % 3);
    const ctx = runPoll(ballots);
    const s = state(ctx);
    const started = Date.now();
    expect(decryptTally(s.encTallyC2, s.combinedShares, s.ballotCount)).toEqual({ yes: 24n, no: 23n, abstain: 23n });
    expect(Date.now() - started).toBeLessThan(30_000);
  });
});
